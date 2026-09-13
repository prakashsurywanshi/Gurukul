<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\StudyMaterial;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class StudyMaterialController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $classId = $request->query('class_id');
        $subjectId = $request->query('subject_id');

        $materials = StudyMaterial::query()
            ->where('organization_id', $organization->id)
            ->when($classId, fn ($query) => $query->where('class_id', $classId))
            ->when($subjectId, fn ($query) => $query->where('subject_id', $subjectId))
            ->with(['schoolClass:id,name,section', 'subject:id,name', 'uploader:id,name'])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (StudyMaterial $material) => [
                'id' => (string) $material->id,
                'title' => $material->title,
                'description' => $material->description,
                'class' => $material->schoolClass ? trim(($material->schoolClass->name ?? '').' '.($material->schoolClass->section ?? '')) : null,
                'subject' => $material->subject?->name,
                'url' => $material->url,
                'type' => $material->file ? ($material->file['mime'] ?? 'file') : ($material->url ? 'link' : 'note'),
                'attachmentUrl' => $material->file && isset($material->file['path'])
                    ? route('study-materials.download', $material->id)
                    : '',
                'uploaded_by' => $material->uploader?->name,
                'created_at' => optional($material->created_at)->format('Y-m-d'),
            ])
            ->all();

        return inertia('dashboard/StudyMaterials', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'materials' => $materials,
            'classes' => $this->classRecords($organization),
            'subjects' => $this->subjectRecords($organization),
            'selectedClassId' => $classId ? (string) $classId : null,
            'selectedSubjectId' => $subjectId ? (string) $subjectId : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'url' => ['nullable', 'url', 'max:500'],
            'file' => ['nullable', 'file', 'max:20480'],
        ]);

        $filePayload = null;
        $file = $request->file('file');
        if ($file) {
            $path = $file->store('study-materials/'.$organization->id.'/files', 'local');
            $filePayload = [
                'path' => $path,
                'name' => $file->getClientOriginalName(),
                'mime' => $file->getClientMimeType(),
                'size' => (int) $file->getSize(),
            ];
        }

        StudyMaterial::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $validated['class_id'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'file' => $filePayload,
            'url' => $validated['url'] ?? null,
            'uploaded_by' => $user->id,
        ]);

        return redirect()->route('study-materials')->with('success', 'Study material added successfully.');
    }

    public function update(Request $request, StudyMaterial $studyMaterial): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $studyMaterial->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'url' => ['nullable', 'url', 'max:500'],
        ]);

        $studyMaterial->update([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'class_id' => $validated['class_id'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
            'url' => $validated['url'] ?? null,
        ]);

        return redirect()->route('study-materials')->with('success', 'Study material updated successfully.');
    }

    public function destroy(StudyMaterial $studyMaterial): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $studyMaterial->organization_id === $organization->id, 403);

        if ($studyMaterial->file && isset($studyMaterial->file['path'])) {
            Storage::disk('local')->delete($studyMaterial->file['path']);
        }

        $studyMaterial->delete();

        return redirect()->route('study-materials')->with('success', 'Study material deleted successfully.');
    }

    public function download(StudyMaterial $studyMaterial): BinaryFileResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $studyMaterial->organization_id === $organization->id, 403);

        abort_unless($studyMaterial->file && isset($studyMaterial->file['path']), 404);

        return response()->download(
            Storage::disk('local')->path($studyMaterial->file['path']),
            $studyMaterial->file['name'] ?? basename($studyMaterial->file['path'])
        );
    }

    private function classRecords(Organization $organization): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => (string) $schoolClass->id,
                'label' => trim(($schoolClass->name ?? '').' '.($schoolClass->section ?? '')),
            ])
            ->values()
            ->all();
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