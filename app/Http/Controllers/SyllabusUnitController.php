<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\SyllabusUnit;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Throwable;

class SyllabusUnitController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $classId = $request->query('class_id');
        $subjectId = $request->query('subject_id');
        $term = $request->query('term');

        $units = SyllabusUnit::query()
            ->where('organization_id', $organization->id)
            ->when($classId, fn ($q) => $q->where('class_id', $classId))
            ->when($subjectId, fn ($q) => $q->where('subject_id', $subjectId))
            ->when($term, fn ($q) => $q->where('term', $term))
            ->with(['schoolClass:id,name', 'subject:id,name', 'updater:id,name'])
            ->orderByDesc('created_at')
            ->limit(300)
            ->get()
            ->map(fn (SyllabusUnit $unit) => [
                'id' => (string) $unit->id,
                'title' => $unit->title,
                'book' => $unit->book,
                'term' => (int) $unit->term,
                'topics' => $unit->topics,
                'coverage_percent' => (int) $unit->coverage_percent,
                'covered_at' => $unit->covered_at?->toIso8601String(),
                'class' => $unit->schoolClass?->name,
                'subject' => $unit->subject?->name,
                'updated_by' => $unit->updater?->name,
            ])
            ->all();

        $coveredPercent = count($units) > 0
            ? (int) round(collect($units)->avg('coverage_percent'))
            : 0;

        return inertia('dashboard/SyllabusCoverage', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'units' => $units,
            'classes' => $this->classRecords($organization),
            'subjects' => $this->subjectRecords($organization),
            'coveredPercent' => $coveredPercent,
            'selectedClassId' => $classId ? (string) $classId : null,
            'selectedSubjectId' => $subjectId ? (string) $subjectId : null,
            'selectedTerm' => $term ? (string) $term : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate($this->rules());

        SyllabusUnit::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $validated['class_id'],
            'subject_id' => $validated['subject_id'],
            'title' => $validated['title'],
            'book' => $validated['book'] ?? null,
            'term' => (int) ($validated['term'] ?? 1),
            'topics' => $validated['topics'] ?? null,
            'coverage_percent' => (int) ($validated['coverage_percent'] ?? 0),
            'covered_at' => (int) ($validated['coverage_percent'] ?? 0) >= 100 ? now() : null,
            'updated_by' => $user->id,
        ]);

        return redirect()->route('syllabus')->with('success', 'Syllabus unit added.');
    }

    public function update(Request $request, SyllabusUnit $syllabusUnit): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $syllabusUnit->organization_id === $organization->id, 403);

        $validated = $request->validate($this->rules());

        $syllabusUnit->update([
            'class_id' => $validated['class_id'],
            'subject_id' => $validated['subject_id'],
            'title' => $validated['title'],
            'book' => $validated['book'] ?? null,
            'term' => (int) ($validated['term'] ?? 1),
            'topics' => $validated['topics'] ?? null,
            'coverage_percent' => (int) ($validated['coverage_percent'] ?? 0),
            'covered_at' => (int) ($validated['coverage_percent'] ?? 0) >= 100
                ? ($syllabusUnit->covered_at ?? now())
                : null,
            'updated_by' => $user->id,
        ]);

        return redirect()->route('syllabus')->with('success', 'Syllabus unit updated.');
    }

    public function setCoverage(Request $request, SyllabusUnit $syllabusUnit): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $syllabusUnit->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'coverage_percent' => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        $coverage = (int) $validated['coverage_percent'];

        $syllabusUnit->update([
            'coverage_percent' => $coverage,
            'covered_at' => $coverage >= 100 ? ($syllabusUnit->covered_at ?? now()) : null,
            'updated_by' => $user->id,
        ]);

        return redirect()->route('syllabus')->with('success', 'Coverage updated.');
    }

    public function destroy(SyllabusUnit $syllabusUnit): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $syllabusUnit->organization_id === $organization->id, 403);

        $syllabusUnit->delete();

        return redirect()->route('syllabus')->with('success', 'Syllabus unit removed.');
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'class_id' => ['required', 'integer', 'exists:school_classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'book' => ['nullable', 'string', 'max:255'],
            'term' => ['nullable', 'integer', 'in:1,2'],
            'topics' => ['nullable', 'string', 'max:5000'],
            'coverage_percent' => ['nullable', 'integer', 'min:0', 'max:100'],
        ];
    }

    private function classRecords(Organization $organization): array
    {
        return SchoolClass::forCurrentSession($organization->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => (string) $schoolClass->id,
                'label' => $schoolClass->name,
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