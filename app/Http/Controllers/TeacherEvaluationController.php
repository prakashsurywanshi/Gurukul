<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\TeacherEvaluation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class TeacherEvaluationController extends Controller
{
    public const CRITERIA = [
        'Teaching Skills',
        'Subject Knowledge',
        'Classroom Management',
        'Communication',
        'Punctuality & Discipline',
        'Student Engagement',
    ];

    public const MAX_SCORE_PER_CRITERION = 5;

    private const PERIODS = ['Term 1', 'Term 2', 'Annual'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $status = $request->query('status');
        $period = $request->query('period');

        $evaluations = TeacherEvaluation::query()
            ->where('organization_id', $organization->id)
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($period, fn ($q) => $q->where('period', $period))
            ->with(['teacher:id,name', 'evaluator:id,name'])
            ->orderByDesc('created_at')
            ->limit(300)
            ->get()
            ->map(fn (TeacherEvaluation $evaluation) => [
                'id' => (string) $evaluation->id,
                'teacher' => $evaluation->teacher?->name ?? '—',
                'period' => $evaluation->period,
                'scores' => $evaluation->scores,
                'total_score' => (int) $evaluation->total_score,
                'max_score' => (int) $evaluation->max_score,
                'strengths' => $evaluation->strengths,
                'improvements' => $evaluation->improvements,
                'status' => $evaluation->status,
                'evaluator' => $evaluation->evaluator?->name,
                'created_at' => $evaluation->created_at?->toIso8601String(),
            ])
            ->all();

        $teachers = $this->teacherRecords($organization);

        $average = 0;
        if (count($evaluations) > 0) {
            $weights = array_sum(array_map(fn ($evaluation) => $evaluation['max_score'] > 0 ? ($evaluation['total_score'] / $evaluation['max_score']) : 0, $evaluations));
            $average = (int) round(($weights / count($evaluations)) * 100);
        }

        return inertia('dashboard/TeacherEvaluations', [
            'user' => $user,
            'organization' => ['id' => $organization->id, 'name' => $organization->name],
            'evaluations' => $evaluations,
            'teachers' => $teachers,
            'criteria' => self::CRITERIA,
            'averagePercent' => $average,
            'selectedStatus' => $status ? (string) $status : null,
            'selectedPeriod' => $period ? (string) $period : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        [$scores, $total, $max] = $this->validateScores($request);

        $validated = $request->validate([
            'teacher_id' => ['required', 'integer', 'exists:users,id'],
            'period' => ['required', Rule::in(self::PERIODS)],
            'strengths' => ['nullable', 'string', 'max:5000'],
            'improvements' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', Rule::in(['draft', 'submitted'])],
        ]);

        TeacherEvaluation::query()->create([
            'organization_id' => $organization->id,
            'teacher_id' => $validated['teacher_id'],
            'period' => $validated['period'],
            'scores' => $scores,
            'total_score' => $total,
            'max_score' => $max,
            'strengths' => $validated['strengths'] ?? null,
            'improvements' => $validated['improvements'] ?? null,
            'status' => $validated['status'] ?? 'submitted',
            'evaluated_by' => $user->id,
        ]);

        return redirect()->route('teacher-evaluations')->with('success', 'Evaluation saved.');
    }

    public function update(Request $request, TeacherEvaluation $teacherEvaluation): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $teacherEvaluation->organization_id === $organization->id, 403);

        [$scores, $total, $max] = $this->validateScores($request);

        $validated = $request->validate([
            'teacher_id' => ['required', 'integer', 'exists:users,id'],
            'period' => ['required', Rule::in(self::PERIODS)],
            'strengths' => ['nullable', 'string', 'max:5000'],
            'improvements' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', Rule::in(['draft', 'submitted'])],
        ]);

        $teacherEvaluation->update([
            'teacher_id' => $validated['teacher_id'],
            'period' => $validated['period'],
            'scores' => $scores,
            'total_score' => $total,
            'max_score' => $max,
            'strengths' => $validated['strengths'] ?? null,
            'improvements' => $validated['improvements'] ?? null,
            'status' => $validated['status'] ?? 'submitted',
            'evaluated_by' => $user->id,
        ]);

        return redirect()->route('teacher-evaluations')->with('success', 'Evaluation updated.');
    }

    public function destroy(TeacherEvaluation $teacherEvaluation): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $teacherEvaluation->organization_id === $organization->id, 403);

        $teacherEvaluation->delete();

        return redirect()->route('teacher-evaluations')->with('success', 'Evaluation removed.');
    }

    private function validateScores(Request $request): array
    {
        $scores = [];
        $total = 0;
        $max = 0;

        foreach (self::CRITERIA as $criterion) {
            $request->validate([
                "scores.{$criterion}" => ['required', 'integer', 'min:1', 'max:'.self::MAX_SCORE_PER_CRITERION],
            ]);
            $score = (int) $request->input("scores.{$criterion}");
            $scores[$criterion] = $score;
            $total += $score;
            $max += self::MAX_SCORE_PER_CRITERION;
        }

        return [$scores, $total, $max];
    }

    private function teacherRecords(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'teacher')
            ->orderBy('name')
            ->limit(500)
            ->get(['id', 'name'])
            ->map(fn (User $teacher) => [
                'id' => (string) $teacher->id,
                'label' => $teacher->name,
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