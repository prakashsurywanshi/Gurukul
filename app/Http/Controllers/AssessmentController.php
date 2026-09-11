<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class AssessmentController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'teacher'], true), 403);

        $search = trim((string) $request->query('search', ''));
        $status = trim((string) $request->query('status', ''));
        $tab = in_array($request->query('tab'), ['dashboard', 'assessments', 'analytics', 'student-report', 'rank-list', 'guide'], true)
            ? $request->query('tab')
            : 'dashboard';

        $assessments = Assessment::query()
            ->where('organization_id', $organization->id)
            ->with(['class:id,name', 'subject:id,name'])
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->when($status !== '', fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->limit(500)
            ->get();

        return inertia('dashboard/Assessment', [
            'user' => $user,
            'tab' => $tab,
            'classes' => SchoolClass::query()->where('organization_id', $organization->id)->orderBy('name')->get(['id', 'name'])->map(fn (SchoolClass $class) => ['id' => $class->id, 'name' => $class->name])->values()->all(),
            'subjects' => Subject::query()->where('organization_id', $organization->id)->orderBy('name')->get(['id', 'name'])->map(fn (Subject $subject) => ['id' => $subject->id, 'name' => $subject->name])->values()->all(),
            'assessments' => $assessments->map(fn (Assessment $assessment) => $this->payload($assessment))->values()->all(),
            'filters' => ['search' => $search, 'status' => $status],
            'stats' => [
                'active' => Assessment::query()->where('organization_id', $organization->id)->where('status', 'active')->count(),
                'completed' => Assessment::query()->where('organization_id', $organization->id)->where('status', 'completed')->count(),
                'totalWeightage' => (float) Assessment::query()->where('organization_id', $organization->id)->where('status', 'active')->sum('weightage'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $this->validatedPayload($request);

        $assessment = Assessment::create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'class_id' => $validated['class_id'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
            'term' => $validated['term'] ?? null,
            'assessment_type' => $validated['assessment_type'] ?? 'continuous',
            'weightage' => $validated['weightage'] ?? 0,
            'total_marks' => $validated['total_marks'] ?? 0,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'description' => $validated['description'] ?? null,
        ]);

        return back()->with('success', 'Assessment "'.$assessment->name.'" created.');
    }

    public function update(Request $request, Assessment $assessment): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $assessment->organization_id === $organization->id, 403);

        $validated = $this->validatedPayload($request);

        $assessment->update([
            'name' => $validated['name'],
            'class_id' => $validated['class_id'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
            'term' => $validated['term'] ?? null,
            'assessment_type' => $validated['assessment_type'] ?? $assessment->assessment_type,
            'weightage' => $validated['weightage'] ?? 0,
            'total_marks' => $validated['total_marks'] ?? 0,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'status' => $validated['status'] ?? $assessment->status,
            'description' => $validated['description'] ?? null,
        ]);

        return back()->with('success', 'Assessment "'.$assessment->name.'" updated.');
    }

    public function destroy(Request $request, Assessment $assessment): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $assessment->organization_id === $organization->id, 403);

        $name = $assessment->name;
        $assessment->delete();

        return back()->with('success', 'Assessment "'.$name.'" deleted.');
    }

    private function validatedPayload(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'term' => ['nullable', 'string', 'max:90'],
            'assessment_type' => ['required', Rule::in(['continuous', 'term'])],
            'weightage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'total_marks' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['required', Rule::in(['draft', 'active', 'completed'])],
            'description' => ['nullable', 'string'],
        ]);
    }

    private function payload(Assessment $assessment): array
    {
        return [
            'id' => $assessment->id,
            'name' => $assessment->name,
            'class' => $assessment->class?->name,
            'class_id' => $assessment->class_id,
            'subject' => $assessment->subject?->name,
            'subject_id' => $assessment->subject_id,
            'term' => $assessment->term,
            'assessment_type' => $assessment->assessment_type,
            'weightage' => number_format((float) $assessment->weightage, 2),
            'total_marks' => number_format((float) $assessment->total_marks, 2),
            'start_date' => optional($assessment->start_date)->toDateString(),
            'end_date' => optional($assessment->end_date)->toDateString(),
            'status' => $assessment->status,
            'description' => $assessment->description,
        ];
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