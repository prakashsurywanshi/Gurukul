<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\ExamSchedule;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use App\Services\GradingScaleService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ExamController extends Controller
{
    public function index() {
        $user = Auth::user();
        return inertia('dashboard/ExamManagement', $this->buildExamPageProps($user));
    }

    public function hallTicket()
    {
        $user = Auth::user();
        return inertia('dashboard/HallTicketManagement', $this->buildExamPageProps($user));
    }

    public function printMarksheet()
    {
        $user = Auth::user();
        return inertia('dashboard/PrintMarksheetManagement', $this->buildExamPageProps($user));
    }

    public function studentOfflineExams()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $user->role === 'student' ? $this->resolveStudentForUser($user, $organization) : null;

        abort_unless($organization && $student && $user->role === 'student', 403);

        return inertia('dashboard/StudentOfflineExams', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'logo' => $organization->logo,
            ],
            'studentRecord' => [
                'id' => (string) $student->id,
                'admission_no' => $student->admission_no,
                'roll_number' => $student->roll_number,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
            ],
            'examGroups' => $this->getStudentExamGroups($organization, $student),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization, 403);

        $academicYearId = $this->getActiveAcademicYearId($organization);

        if (!$academicYearId) {
            return redirect()->route('exams')->with('error', 'Create and activate an academic session first.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'publishStatus' => ['required', Rule::in(['draft', 'published'])],
            'className' => ['required', 'string', 'max:255'],
            'section' => ['required', 'string', 'max:255'],
        ]);

        $schoolClass = $this->findClass($organization, $validated['className'], $validated['section']);

        if (!$schoolClass) {
            return redirect()->route('exams')->with('error', 'Selected class and section do not exist.');
        }

        Exam::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'name' => $validated['name'],
            'exam_type' => 'general',
            'publish_status' => $validated['publishStatus'],
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'description' => $this->encodeExamMetadata($validated['className'], $validated['section']),
            'status' => 'scheduled',
        ]);

        return redirect()->route('exams')->with('success', 'Exam created successfully!');
    }

    public function update(Request $request, Exam $exam): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $exam->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'publishStatus' => ['required', Rule::in(['draft', 'published'])],
            'className' => ['required', 'string', 'max:255'],
            'section' => ['required', 'string', 'max:255'],
        ]);

        $schoolClass = $this->findClass($organization, $validated['className'], $validated['section']);

        if (!$schoolClass) {
            return redirect()->route('exams')->with('error', 'Selected class and section do not exist.');
        }

        $exam->update([
            'name' => $validated['name'],
            'publish_status' => $validated['publishStatus'],
            'description' => $this->encodeExamMetadata($validated['className'], $validated['section']),
        ]);

        ExamSchedule::query()->where('exam_id', $exam->id)->update([
            'class_id' => $schoolClass->id,
        ]);

        return redirect()->route('exams')->with('success', 'Exam updated successfully!');
    }

    public function saveSchedules(Request $request, Exam $exam): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $exam->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'subjects' => ['required', 'array', 'min:1'],
            'subjects.*.subject_id' => ['required', Rule::exists('subjects', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'subjects.*.exam_date' => ['required', 'date'],
            'subjects.*.start_time' => ['required', 'date_format:H:i'],
            'subjects.*.end_time' => ['required', 'date_format:H:i', 'after:subjects.*.start_time'],
            'subjects.*.room_number' => ['nullable', 'string', 'max:255'],
            'subjects.*.total_marks' => ['required', 'integer', 'min:1'],
            'subjects.*.passing_marks' => ['required', 'integer', 'min:1'],
        ]);

        $examMetadata = $this->decodeExamMetadata($exam);

        abort_unless($examMetadata['className'] && $examMetadata['section'], 422);

        $schoolClass = $this->findClass($organization, $examMetadata['className'], $examMetadata['section']);
        abort_unless($schoolClass, 422);

        DB::transaction(function () use ($validated, $exam, $schoolClass) {
            ExamSchedule::query()->where('exam_id', $exam->id)->delete();

            foreach ($validated['subjects'] as $subject) {
                ExamSchedule::query()->create([
                    'exam_id' => $exam->id,
                    'class_id' => $schoolClass->id,
                    'subject_id' => $subject['subject_id'],
                    'exam_date' => $subject['exam_date'],
                    'start_time' => $subject['start_time'],
                    'end_time' => $subject['end_time'],
                    'room_number' => $subject['room_number'] ?? null,
                    'max_marks' => $subject['total_marks'],
                    'passing_marks' => $subject['passing_marks'],
                ]);
            }

            $examDates = collect($validated['subjects'])->pluck('exam_date')->sort()->values();
            $exam->update([
                'start_date' => $examDates->first(),
                'end_date' => $examDates->last(),
            ]);
        });

        return redirect()->route('exams')->with('success', 'Subjects saved successfully!');
    }

    public function saveResults(Request $request, ExamSchedule $examSchedule): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $examSchedule->exam?->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'results' => ['required', 'array', 'min:1'],
            'results.*.student_id' => ['required', Rule::exists('students', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'results.*.marks_obtained' => ['required', 'numeric', 'min:0'],
        ]);

        foreach ($validated['results'] as $result) {
            $marksObtained = (float) $result['marks_obtained'];
            $totalMarks = (float) $examSchedule->max_marks;

            $grade = $this->resolveGrade($marksObtained, $totalMarks, $organization);

            ExamResult::query()->updateOrCreate(
                [
                    'exam_schedule_id' => $examSchedule->id,
                    'student_id' => $result['student_id'],
                ],
                [
                    'organization_id' => $organization->id,
                    'theory_marks' => $marksObtained,
                    'practical_marks' => null,
                    'total_marks' => $totalMarks,
                    'obtained_marks' => $marksObtained,
                    'grade' => $grade,
                    'is_absent' => false,
                    'remarks' => $examSchedule->subject?->localized('name') ? $examSchedule->subject->localized('name') . ' | Total: ' . $examSchedule->max_marks : null,
                    'entered_by' => $user->id,
                ]
            );
        }

        return redirect()->route('exams')->with('success', 'Marks saved successfully!');
    }

    public function destroy(Exam $exam): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $exam->organization_id === $organization->id, 403);

        $exam->delete();

        return redirect()->route('exams')->with('success', 'Exam deleted successfully!');
    }

    private function getExamGroups(Organization $organization): array
    {
        return Exam::query()
            ->where('organization_id', $organization->id)
            ->with([
                'schedules.subject:id,name,name_mr,name_hi',
                'schedules.results.student:id,first_name,last_name,class_id,roll_number',
                'schedules.schoolClass:id,name,section',
            ])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Exam $exam) {
                $examMetadata = $this->decodeExamMetadata($exam);

                return [
                    'groupId' => (string) $exam->id,
                    'name' => $exam->localized('name'),
                    'publishStatus' => $exam->publish_status ?? 'draft',
                    'className' => $examMetadata['className'],
                    'section' => $examMetadata['section'],
                    'studentIds' => [],
                    'createdAt' => optional($exam->created_at)->toDateTimeString(),
                    'exams' => $exam->schedules->map(function (ExamSchedule $schedule) {
                        return [
                            'id' => (string) $schedule->id,
                            'subject_id' => $schedule->subject_id,
                            'subject' => $schedule->subject?->localized('name') ?? 'Subject',
                            'class' => $schedule->schoolClass?->name,
                            'section' => $schedule->schoolClass?->section,
                            'exam_date' => optional($schedule->exam_date)->format('Y-m-d'),
                            'start_time' => $this->formatTimeForInput($schedule->start_time),
                            'end_time' => $this->formatTimeForInput($schedule->end_time),
                            'room_number' => $schedule->room_number,
                            'total_marks' => $schedule->max_marks,
                            'passing_marks' => $schedule->passing_marks,
                            'results' => $schedule->results->map(fn (ExamResult $result) => [
                                'student_id' => (string) $result->student_id,
                                'marks_obtained' => (float) $result->obtained_marks,
                                'grade' => $result->grade,
                            ])->values()->all(),
                        ];
                    })->values()->all(),
                ];
            })
            ->all();
    }

    private function buildExamPageProps(User $user): array
    {
        $organization = $this->resolveOrganizationForUser($user);

        return [
            'user' => $user,
            'organization' => $organization ? [
                'id' => $organization->id,
                'name' => $organization->name,
                'logo' => $organization->logo,
            ] : null,
            'students' => $organization ? $this->getStudents($organization) : [],
            'classOptions' => $organization ? $this->getClassOptions($organization) : [],
            'subjectOptions' => $organization ? $this->getSubjectOptions($organization) : [],
            'examGroups' => $organization ? $this->getExamGroups($organization) : [],
        ];
    }

    private function getStudentExamGroups(Organization $organization, Student $student): array
    {
        $className = $student->schoolClass?->name;
        $section = $student->schoolClass?->section;

        if (! $className || ! $section) {
            return [];
        }

        return Exam::query()
            ->where('organization_id', $organization->id)
            ->with([
                'schedules' => fn ($query) => $query
                    ->with([
                        'subject:id,name,name_mr,name_hi',
                        'results' => fn ($resultQuery) => $resultQuery->where('student_id', $student->id),
                        'schoolClass:id,name,section',
                    ])
                    ->orderBy('exam_date')
                    ->orderBy('start_time'),
            ])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Exam $exam) use ($className, $section, $student) {
                $examMetadata = $this->decodeExamMetadata($exam);

                if ($examMetadata['className'] !== $className || $examMetadata['section'] !== $section) {
                    return null;
                }

                $schedules = $exam->schedules->map(function (ExamSchedule $schedule) use ($student) {
                    $studentResult = $schedule->results->firstWhere('student_id', $student->id);
                    $hasResult = $studentResult !== null;
                    $obtainedMarks = $studentResult ? (float) $studentResult->obtained_marks : null;
                    $totalMarks = (float) $schedule->max_marks;
                    $passingMarks = (float) $schedule->passing_marks;

                    return [
                        'id' => (string) $schedule->id,
                        'subject' => $schedule->subject?->localized('name') ?? 'Subject',
                        'exam_date' => optional($schedule->exam_date)->format('Y-m-d'),
                        'start_time' => $this->formatTimeForInput($schedule->start_time),
                        'end_time' => $this->formatTimeForInput($schedule->end_time),
                        'room_number' => $schedule->room_number,
                        'total_marks' => $totalMarks,
                        'passing_marks' => $passingMarks,
                        'has_result' => $hasResult,
                        'marks_obtained' => $obtainedMarks,
                        'grade' => $studentResult?->grade,
                        'status' => ! $hasResult
                            ? 'pending'
                            : ($obtainedMarks >= $passingMarks ? 'passed' : 'failed'),
                    ];
                })->values();

                $publishedResultsCount = $schedules->where('has_result', true)->count();
                $totalObtained = $schedules->where('has_result', true)->sum('marks_obtained');
                $totalMaximum = $schedules->where('has_result', true)->sum('total_marks');

                return [
                    'groupId' => (string) $exam->id,
                    'name' => $exam->localized('name'),
                    'publishStatus' => $exam->publish_status ?? 'draft',
                    'className' => $examMetadata['className'],
                    'section' => $examMetadata['section'],
                    'startDate' => optional($exam->start_date)->format('Y-m-d'),
                    'endDate' => optional($exam->end_date)->format('Y-m-d'),
                    'subjectsCount' => $schedules->count(),
                    'publishedResultsCount' => $publishedResultsCount,
                    'resultPercentage' => $totalMaximum > 0 ? round(($totalObtained / $totalMaximum) * 100, 2) : null,
                    'schedules' => $schedules->all(),
                ];
            })
            ->filter()
            ->values()
            ->all();
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
                'first_name_mr' => $student->first_name_mr,
                'last_name_mr' => $student->last_name_mr,
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
                'roll_number' => $student->roll_number,
            ])
            ->all();
    }

    private function getClassOptions(Organization $organization): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => $schoolClass->id,
                'name' => $schoolClass->name,
                'section' => $schoolClass->section,
            ])
            ->all();
    }

    private function getSubjectOptions(Organization $organization): array
    {
        return Subject::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Subject $subject) => [
                'id' => $subject->id,
                'name' => $subject->localized('name'),
            ])
            ->all();
    }

    private function getActiveAcademicYearId(Organization $organization): ?int
    {
        return $organization->selectedAcademicYear()?->id;
    }

    private function findClass(Organization $organization, string $className, string $section): ?SchoolClass
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('name', $className)
            ->where('section', $section)
            ->where('status', 'active')
            ->first();
    }

    private function encodeExamMetadata(string $className, string $section): string
    {
        return json_encode([
            'class_name' => $className,
            'section' => $section,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
    }

    private function decodeExamMetadata(Exam $exam): array
    {
        $description = $exam->description;

        if (!is_string($description) || trim($description) === '') {
            return [
                'className' => null,
                'section' => null,
            ];
        }

        $decoded = json_decode($description, true);

        if (!is_array($decoded)) {
            return [
                'className' => null,
                'section' => null,
            ];
        }

        return [
            'className' => isset($decoded['class_name']) && is_string($decoded['class_name']) ? $decoded['class_name'] : null,
            'section' => isset($decoded['section']) && is_string($decoded['section']) ? $decoded['section'] : null,
        ];
    }

    private function formatTimeForInput(?string $value): string
    {
        if (!$value) {
            return '';
        }

        return Str::of($value)->substr(0, 5)->toString();
    }

    private function resolveGrade(float $marksObtained, float $totalMarks, ?Organization $organization = null): string
    {
        $percentage = $totalMarks > 0 ? ($marksObtained / $totalMarks) * 100 : 0;

        return GradingScaleService::gradeFor($percentage, $organization)['grade'] ?? 'F';
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

        $organization = Organization::query()->where('email', $user->email)->first();

        if (!$organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }

    private function resolveStudentForUser(User $user, ?Organization $organization): ?Student
    {
        if (! $organization) {
            return null;
        }

        return Student::query()
            ->where('organization_id', $organization->id)
            ->where(function ($query) use ($user) {
                $query
                    ->where('user_id', $user->id)
                    ->orWhere('email', $user->email);
            })
            ->with('schoolClass:id,name,section')
            ->first();
    }
}
