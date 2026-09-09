<?php

namespace App\Http\Controllers;

use App\Models\Ebook;
use App\Models\Organization;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class EbookLibraryController extends Controller
{
    private const TYPES = ['ebook', 'video', 'journal', 'audio'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $type = $request->query('type');
        $subjectId = $request->query('subject_id');

        $ebooks = Ebook::query()
            ->where('organization_id', $organization->id)
            ->when($type, fn ($query) => $query->where('type', $type))
            ->when($subjectId, fn ($query) => $query->where('subject_id', $subjectId))
            ->with(['subject:id,name', 'uploader:id,name'])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (Ebook $ebook) => [
                'id' => (string) $ebook->id,
                'title' => $ebook->title,
                'author' => $ebook->author,
                'isbn' => $ebook->isbn,
                'type' => $ebook->type,
                'description' => $ebook->description,
                'url' => $ebook->url,
                'thumbnail' => $ebook->thumbnail,
                'subject' => $ebook->subject?->name,
                'downloadUrl' => $ebook->file && isset($ebook->file['path'])
                    ? route('e-library.download', $ebook->id)
                    : '',
                'uploaded_by' => $ebook->uploader?->name,
            ])
            ->all();

        return inertia('dashboard/ELibrary', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'ebooks' => $ebooks,
            'subjects' => $this->subjectRecords($organization),
            'selectedType' => $type ? (string) $type : null,
            'selectedSubjectId' => $subjectId ? (string) $subjectId : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate($this->rules());

        $filePayload = null;
        $file = $request->file('file');
        if ($file) {
            $path = $file->store('e-library/'.$organization->id.'/files', 'local');
            $filePayload = [
                'path' => $path,
                'name' => $file->getClientOriginalName(),
                'mime' => $file->getClientMimeType(),
                'size' => (int) $file->getSize(),
            ];
        }

        $thumbnail = null;
        $cover = $request->file('thumbnail');
        if ($cover) {
            $thumbnail = $cover->store('e-library/'.$organization->id.'/covers', 'local');
        }

        Ebook::query()->create([
            'organization_id' => $organization->id,
            'title' => $validated['title'],
            'author' => $validated['author'] ?? null,
            'isbn' => $validated['isbn'] ?? null,
            'type' => $validated['type'],
            'category_id' => $validated['category_id'] ?? null,
            'description' => $validated['description'] ?? null,
            'file' => $filePayload,
            'url' => $validated['url'] ?? null,
            'thumbnail' => $thumbnail,
            'subject_id' => $validated['subject_id'] ?? null,
            'uploaded_by' => $user->id,
        ]);

        return redirect()->route('e-library')->with('success', 'Digital item added successfully.');
    }

    public function update(Request $request, Ebook $ebook): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $ebook->organization_id === $organization->id, 403);

        $validated = $request->validate($this->rules());

        $ebook->update([
            'title' => $validated['title'],
            'author' => $validated['author'] ?? null,
            'isbn' => $validated['isbn'] ?? null,
            'type' => $validated['type'],
            'category_id' => $validated['category_id'] ?? null,
            'description' => $validated['description'] ?? null,
            'url' => $validated['url'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
        ]);

        return redirect()->route('e-library')->with('success', 'Digital item updated successfully.');
    }

    public function destroy(Ebook $ebook): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $ebook->organization_id === $organization->id, 403);

        if ($ebook->file && isset($ebook->file['path'])) {
            Storage::disk('local')->delete($ebook->file['path']);
        }
        if ($ebook->thumbnail) {
            Storage::disk('local')->delete($ebook->thumbnail);
        }

        $ebook->delete();

        return redirect()->route('e-library')->with('success', 'Digital item deleted successfully.');
    }

    public function download(Ebook $ebook): BinaryFileResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $ebook->organization_id === $organization->id, 403);

        abort_unless($ebook->file && isset($ebook->file['path']), 404);

        return response()->download(
            Storage::disk('local')->path($ebook->file['path']),
            $ebook->file['name'] ?? basename($ebook->file['path'])
        );
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'author' => ['nullable', 'string', 'max:255'],
            'isbn' => ['nullable', 'string', 'max:64'],
            'type' => ['required', Rule::in(self::TYPES)],
            'category_id' => ['nullable', 'integer'],
            'description' => ['nullable', 'string', 'max:5000'],
            'url' => ['nullable', 'url', 'max:500'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'file' => ['nullable', 'file', 'max:51200'],
            'thumbnail' => ['nullable', 'image', 'max:5120'],
        ];
    }

    private function subjectRecords(Organization $organization): array
    {
        return Subject::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Subject $subject) => [
                'id' => (string) $subject->id,
                'label' => $subject->name,
            ])
            ->values()
            ->all();
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
        }

        if ($user->role !== 'admin') {
            return null;
        }

        try {
            $organization = Organization::query()->firstOrFail();
            $user->organization_id = $organization->id;
            $user->save();

            return $organization;
        } catch (Throwable) {
            return null;
        }
    }
}