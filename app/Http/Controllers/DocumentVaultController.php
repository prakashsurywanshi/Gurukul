<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class DocumentVaultController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $query = Document::query()
            ->where('organization_id', $organization->id)
            ->with('uploadedBy:id,name');

        $search = trim((string) $request->query('search'));
        $category = trim((string) $request->query('category'));

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('original_name', 'like', "%{$search}%");
            });
        }

        if ($category !== '') {
            $query->where('category', $category);
        }

        $documents = $query->orderByDesc('created_at')->get();

        return Inertia::render('dashboard/DocumentVault', [
            'user' => $user,
            'documents' => $documents->map(fn (Document $document) => $this->serialize($document)),
            'categories' => Document::query()
                ->where('organization_id', $organization->id)
                ->where('status', 'active')
                ->distinct()
                ->orderBy('category')
                ->pluck('category')
                ->values(),
            'filters' => [
                'search' => $search,
                'category' => $category,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'teacher', 'accountant'], true), 403);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:20480', 'mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx,csv,txt'],
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', 'in:active'],
        ]);

        $file = $validated['file'];

        try {
            $storagePath = $file->store('document-vault/org-'.$organization->id, 'local');

            Document::query()->create([
                'organization_id' => $organization->id,
                'uploaded_by_user_id' => $user->id,
                'category' => $validated['category'],
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'storage_path' => $storagePath,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size_bytes' => $file->getSize(),
                'status' => 'active',
            ]);

            return back()->with('success', 'Document uploaded successfully.');
        } catch (Throwable $exception) {
            if (isset($storagePath)) {
                Storage::disk('local')->delete($storagePath);
            }

            report($exception);

            return back()->with('error', 'The document could not be uploaded. Please try again.');
        }
    }

    public function download(Request $request, Document $document): BinaryFileResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $document->organization_id === $organization->id, 404);

        abort_unless(Storage::disk('local')->exists($document->storage_path), 404);

        return response()->download(
            Storage::disk('local')->path($document->storage_path),
            $document->original_name
        );
    }

    public function destroy(Request $request, Document $document): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $document->organization_id === $organization->id, 404);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'teacher'], true), 403);

        Storage::disk('local')->delete($document->storage_path);
        $document->delete();

        return back()->with('success', 'Document deleted successfully.');
    }

    private function serialize(Document $document): array
    {
        return [
            'id' => (string) $document->id,
            'title' => $document->title,
            'description' => $document->description,
            'category' => $document->category,
            'originalName' => $document->original_name,
            'mimeType' => $document->mime_type,
            'sizeBytes' => $document->size_bytes,
            'size' => $document->humanReadableSize(),
            'uploadedByName' => $document->uploadedBy?->name,
            'createdAt' => optional($document->created_at)->toISOString(),
        ];
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

        if (!$organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}