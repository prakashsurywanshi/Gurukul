<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Services\AppearanceService;
use App\Services\GradingScaleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Throwable;

class ReportCardController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $report = null;
        $selectedStudentId = $request->query('student');
        $selectedExamId = $request->query('exam');

        if ($selectedStudentId && $selectedExamId) {
            $report = $this->buildStudentReport($organization, (int) $selectedExamId, (int) $selectedStudentId);
        }

        return inertia('dashboard/ReportCard', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'address' => $organization->address,
                'logo' => $organization->logo,
            ],
            'students' => $this->getStudents($organization),
            'exams' => $this->getExams($organization),
            'gradeScale' => GradingScaleService::effectiveScale($organization),
            'appearance' => app(AppearanceService::class)->normalizeForOrganization($organization, 'report_card_appearance'),
            'selectedStudentId' => $selectedStudentId,
            'selectedExamId' => $selectedExamId,
            'report' => $report,
        ]);
    }

    public function saveAppearance(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'teacher'], true), 403);

        $service = app(AppearanceService::class);
        $normalized = $service->normalize($request->validate($service->rules()));

        $current = $organization->settings;
        $current['report_card_appearance'] = $normalized;

        $organization->update(['settings' => $current]);

        return back()->with('success', 'Report card appearance saved.');
    }

    public function saveGradeScale(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'teacher'], true), 403);

        $validated = $request->validate([
            'rows' => ['required', 'array', 'min:1', 'max:20'],
            'rows.*.grade' => ['required', 'string', 'max:10'],
            'rows.*.min' => ['required', 'numeric', 'min:0', 'max:100'],
            'rows.*.max' => ['required', 'numeric', 'min:0', 'max:100'],
            'rows.*.point' => ['required', 'numeric', 'min:0', 'max:10'],
            'rows.*.remark' => ['nullable', 'string', 'max:255'],
        ]);

        GradingScaleService::saveScale($organization, $validated['rows']);

        return redirect()->route('exams.report-card')->with('success', 'Grading scale saved successfully.');
    }

    private function buildStudentReport(Organization $organization, int $examId, int $studentId): ?array
    {
        $exam = Exam::query()
            ->where('organization_id', $organization->id)
            ->with([
                'schedules.subject:id,name,name_mr,name_hi',
                'schedules.results' => fn ($query) => $query->where('student_id', $studentId),
            ])
            ->find($examId);

        if (! $exam) {
            return null;
        }

        $student = Student::query()
            ->with('schoolClass:id,name,section')
            ->where('organization_id', $organization->id)
            ->find($studentId);

        if (! $student) {
            return null;
        }

        $gradeScale = GradingScaleService::effectiveScale($organization);

        $subjectRows = $exam->schedules
            ->filter(fn ($schedule) => $schedule->results->isNotEmpty())
            ->map(function ($schedule) use ($gradeScale) {
                /** @var ExamResult $result */
                $result = $schedule->results->first();
                $percentage = $schedule->max_marks > 0
                    ? (($result->obtained_marks / $schedule->max_marks) * 100)
                    : 0;
                $grade = GradingScaleService::gradeFor($percentage, null) ?? ['grade' => null, 'point' => null, 'remark' => null];

                return [
                    'subject' => $schedule->subject?->localized('name') ?? 'Subject',
                    'maxMarks' => (float) $schedule->max_marks,
                    'passingMarks' => (float) $schedule->passing_marks,
                    'obtainedMarks' => (float) $result->obtained_marks,
                    'percentage' => round($percentage, 2),
                    'grade' => $result->grade ?? $grade['grade'],
                    'gradePoint' => $grade['point'],
                    'isAbsent' => (bool) $result->is_absent,
                ];
            })
            ->values()
            ->all();

        if ($subjectRows === []) {
            return null;
        }

        $totalObtained = collect($subjectRows)->sum('obtainedMarks');
        $totalMax = collect($subjectRows)->sum('maxMarks');
        $totalPercentage = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 2) : 0;
        $overallGrade = GradingScaleService::gradeFor($totalPercentage, $organization) ?? ['grade' => null, 'point' => null, 'remark' => null];

        $failedSubjects = collect($subjectRows)
            ->filter(fn ($row) => ! $row['isAbsent'] && $row['obtainedMarks'] < $row['passingMarks'])
            ->pluck('subject')
            ->values()
            ->all();

        $promoted = count($failedSubjects) === 0
            && count($subjectRows) > 0
            && collect($subjectRows)->filter(fn ($row) => $row['isAbsent'])->isEmpty();

        $rank = $this->resolveRank($exam->id, $studentId);

        return [
            'student' => [
                'id' => (string) $student->id,
                'admission_no' => $student->admission_no,
                'roll_number' => $student->roll_number,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'first_name_mr' => $student->first_name_mr,
                'last_name_mr' => $student->last_name_mr,
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
            ],
            'exam' => [
                'id' => (string) $exam->id,
                'name' => $exam->localized('name'),
                'startDate' => optional($exam->start_date)->format('d M Y'),
                'endDate' => optional($exam->end_date)->format('d M Y'),
            ],
            'subjects' => $subjectRows,
            'totalObtained' => round($totalObtained, 2),
            'totalMax' => round($totalMax, 2),
            'percentage' => $totalPercentage,
            'overallGrade' => $overallGrade['grade'],
            'overallGradePoint' => $overallGrade['point'],
            'overallRemark' => $overallGrade['remark'],
            'result' => $promoted ? 'Pass' : 'Fail',
            'failedSubjects' => $failedSubjects,
            'rank' => $rank,
        ];
    }

    private function resolveRank(int $examId, int $studentId): ?int
    {
        $rankings = ExamResult::query()
            ->whereHas('examSchedule', fn ($query) => $query->where('exam_id', $examId))
            ->where('student_id', '!=', $studentId)
            ->where('is_absent', false)
            ->get()
            ->groupBy('student_id')
            ->map(fn ($results) => $results->sum('obtained_marks'))
            ->sortDesc()
            ->values()
            ->all();

        $ownTotal = ExamResult::query()
            ->whereHas('examSchedule', fn ($query) => $query->where('exam_id', $examId))
            ->where('student_id', $studentId)
            ->where('is_absent', false)
            ->sum('obtained_marks');

        return collect($rankings)->filter(fn ($total) => $total > $ownTotal)->count() + 1;
    }

    private function getStudents(Organization $organization): array
    {
        return Student::query()
            ->forCurrentSession($organization->id)
            ->with('schoolClass:id,name,section')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
                'roll_number' => $student->roll_number,
            ])
            ->all();
    }

    private function getExams(Organization $organization): array
    {
        return Exam::query()
            ->where('organization_id', $organization->id)
            ->withCount('schedules')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Exam $exam) {
                $metadata = $this->decodeExamMetadata($exam);

                return [
                    'id' => (string) $exam->id,
                    'name' => $exam->localized('name'),
                    'className' => $metadata['className'],
                    'section' => $metadata['section'],
                    'publishStatus' => $exam->publish_status ?? 'draft',
                    'subjectCount' => (int) $exam->schedules_count,
                ];
            })
            ->all();
    }

    private function decodeExamMetadata(Exam $exam): array
    {
        $decoded = json_decode((string) $exam->description, true);

        if (! is_array($decoded)) {
            return ['className' => null, 'section' => null];
        }

        return [
            'className' => isset($decoded['class_name']) && is_string($decoded['class_name']) ? $decoded['class_name'] : null,
            'section' => isset($decoded['section']) && is_string($decoded['section']) ? $decoded['section'] : null,
        ];
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'student') {
            $studentOrganizationId = Student::query()
                ->where(function ($query) use ($user) {
                    $query
                        ->where('user_id', $user->id)
                        ->orWhere('email', $user->email);
                })
                ->value('organization_id');

            if ($studentOrganizationId) {
                $user->forceFill(['organization_id' => $studentOrganizationId])->save();
                $user->organization_id = $studentOrganizationId;

                return Organization::query()->find($studentOrganizationId);
            }
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