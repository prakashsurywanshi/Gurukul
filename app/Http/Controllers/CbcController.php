<?php

namespace App\Http\Controllers;

use App\Models\CbcAssessment;
use App\Models\CbcCompetency;
use App\Models\CbcLearningOutcome;
use App\Models\CbcPathway;
use App\Models\CbcStrand;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class CbcController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'teacher'], true), 403);

        $tab = in_array($request->query('tab'), ['strands', 'outcomes', 'pathways', 'competencies', 'assessments', 'dashboard'], true)
            ? $request->query('tab')
            : 'strands';

        $strands = CbcStrand::query()
            ->where('organization_id', $organization->id)
            ->withCount('learningOutcomes')
            ->orderBy('name')
            ->get();

        $strandOptions = $strands->map(fn (CbcStrand $strand) => ['id' => $strand->id, 'name' => $strand->name])->values();

        $outcomes = CbcLearningOutcome::query()
            ->where('organization_id', $organization->id)
            ->with('strand:id,name')
            ->orderBy('name')
            ->get();

        $pathways = CbcPathway::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get();

        $competencies = CbcCompetency::query()
            ->where('organization_id', $organization->id)
            ->with('strand:id,name')
            ->orderBy('name')
            ->get();

        $assessments = CbcAssessment::query()
            ->where('organization_id', $organization->id)
            ->with('student:id,first_name,last_name')
            ->with('strand:id,name')
            ->with('learningOutcome:id,name')
            ->with('competency:id,name')
            ->with('assessor:id,name')
            ->latest('assessed_on')
            ->latest('id')
            ->take(200)
            ->get();

        $levels = ['emerging', 'developing', 'proficient', 'advanced'];
        $levelCounts = [];
        foreach ($levels as $level) {
            $levelCounts[$level] = $assessments->filter(fn (CbcAssessment $assessment) => $assessment->level === $level)->count();
        }

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'admission_no'])
            ->map(fn (Student $student) => [
                'id' => $student->id,
                'name' => $student->first_name.' '.$student->last_name,
                'admission_no' => $student->admission_no,
            ])
            ->values();

        return inertia('dashboard/Cbc', [
            'user' => $user,
            'tab' => $tab,
            'strands' => $strands->map(fn (CbcStrand $strand) => [
                'id' => $strand->id,
                'name' => $strand->name,
                'code' => $strand->code,
                'description' => $strand->description,
                'outcome_count' => $strand->learning_outcomes_count,
            ])->values()->all(),
            'outcomes' => $outcomes->map(fn (CbcLearningOutcome $outcome) => [
                'id' => $outcome->id,
                'name' => $outcome->name,
                'code' => $outcome->code,
                'description' => $outcome->description,
                'strand_id' => $outcome->cbc_strand_id,
                'strand' => $outcome->strand?->name,
            ])->values()->all(),
            'pathways' => $pathways->map(fn (CbcPathway $pathway) => [
                'id' => $pathway->id,
                'name' => $pathway->name,
                'code' => $pathway->code,
                'description' => $pathway->description,
            ])->values()->all(),
            'competencies' => $competencies->map(fn (CbcCompetency $competency) => [
                'id' => $competency->id,
                'name' => $competency->name,
                'code' => $competency->code,
                'description' => $competency->description,
                'strand_id' => $competency->cbc_strand_id,
                'strand' => $competency->strand?->name,
            ])->values()->all(),
            'assessments' => $assessments->map(fn (CbcAssessment $assessment) => [
                'id' => $assessment->id,
                'student_id' => $assessment->student_id,
                'student' => $assessment->student?->first_name.' '.$assessment->student?->last_name,
                'admission_no' => $assessment->student?->admission_no,
                'strand_id' => $assessment->cbc_strand_id,
                'strand' => $assessment->strand?->name,
                'outcome_id' => $assessment->cbc_learning_outcome_id,
                'outcome' => $assessment->learningOutcome?->name,
                'competency_id' => $assessment->cbc_competency_id,
                'competency' => $assessment->competency?->name,
                'level' => $assessment->level,
                'notes' => $assessment->notes,
                'assessed_by' => $assessment->assessor?->name,
                'assessed_on' => $assessment->assessed_on?->toDateString(),
            ])->values()->all(),
            'strandOptions' => $strandOptions->all(),
            'outcomeOptions' => $outcomes->map(fn (CbcLearningOutcome $outcome) => [
                'id' => $outcome->id,
                'name' => $outcome->name,
                'strand_id' => $outcome->cbc_strand_id,
            ])->values()->all(),
            'competencyOptions' => $competencies->map(fn (CbcCompetency $competency) => [
                'id' => $competency->id,
                'name' => $competency->name,
                'strand_id' => $competency->cbc_strand_id,
            ])->values()->all(),
            'students' => $students->all(),
            'summary' => [
                'competencies' => $competencies->count(),
                'assessments' => $assessments->count(),
                'studentsAssessed' => $assessments->pluck('student_id')->unique()->count(),
                'levels' => $levelCounts,
            ],
        ]);
    }

    public function storeStrand(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'code' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string'],
        ]);

        CbcStrand::create([...$validated, 'organization_id' => $organization->id]);

        return back()->with('success', 'Strand created.');
    }

    public function storeOutcome(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'cbc_strand_id' => ['required', 'integer', 'exists:cbc_strands,id'],
            'code' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string'],
        ]);

        $strand = CbcStrand::query()->where('organization_id', $organization->id)->findOrFail($validated['cbc_strand_id']);

        CbcLearningOutcome::create([...$validated, 'organization_id' => $organization->id]);

        return back()->with('success', 'Learning outcome added to "'.$strand->name.'".');
    }

    public function storePathway(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'code' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string'],
        ]);

        CbcPathway::create([...$validated, 'organization_id' => $organization->id]);

        return back()->with('success', 'Pathway created.');
    }

    public function destroyItem(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'type' => ['required', Rule::in(['strand', 'outcome', 'pathway', 'competency'])],
            'id' => ['required', 'integer'],
        ]);

        $model = match ($validated['type']) {
            'strand' => CbcStrand::class,
            'outcome' => CbcLearningOutcome::class,
            'pathway' => CbcPathway::class,
            'competency' => CbcCompetency::class,
        };

        $item = $model::query()->where('organization_id', $organization->id)->findOrFail($validated['id']);
        $item->delete();

        return back()->with('success', ucfirst($validated['type']).' deleted.');
    }

    public function storeCompetency(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'cbc_strand_id' => ['nullable', 'integer', 'exists:cbc_strands,id'],
            'code' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string'],
        ]);

        if (!empty($validated['cbc_strand_id'])) {
            CbcStrand::query()->where('organization_id', $organization->id)->findOrFail($validated['cbc_strand_id']);
        }

        CbcCompetency::create([...$validated, 'organization_id' => $organization->id]);

        return back()->with('success', 'Core competency created.');
    }

    public function storeAssessment(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'student_id' => ['required', 'integer'],
            'cbc_strand_id' => ['nullable', 'integer', 'exists:cbc_strands,id'],
            'cbc_learning_outcome_id' => ['nullable', 'integer', 'exists:cbc_learning_outcomes,id'],
            'cbc_competency_id' => ['nullable', 'integer', 'exists:cbc_competencies,id'],
            'level' => ['required', Rule::in(['emerging', 'developing', 'proficient', 'advanced'])],
            'notes' => ['nullable', 'string', 'max:2000'],
            'assessed_on' => ['required', 'date'],
        ]);

        Student::query()->where('organization_id', $organization->id)->findOrFail($validated['student_id']);

        CbcAssessment::create([...$validated, 'organization_id' => $organization->id, 'assessed_by' => $user->id]);

        return back()->with('success', 'Assessment recorded.');
    }

    public function destroyAssessment(Request $request, CbcAssessment $assessment): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless($assessment->organization_id === $organization->id, 404);

        $assessment->delete();

        return back()->with('success', 'Assessment deleted.');
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