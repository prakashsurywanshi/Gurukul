<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\ExamSchedule;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ExamApiController extends Controller
{
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $examGroups = $this->getExamGroups($organization);

        return response()->json([
            'success' => true,
            'data' => $examGroups,
            'students' => $this->getStudents($organization),
            'classOptions' => $this->getClassOptions($organization),
            'subjectOptions' => $this->getSubjectOptions($organization),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $academicYearId = $this->getActiveAcademicYearId($organization);
        abort_unless($academicYearId, 422, 'Create and activate an academic session first.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'publish_status' => ['required', Rule::in(['draft', 'published'])],
            'class_name' => ['required', 'string', 'max:255'],
            'section' => ['required', 'string', 'max:255'],
        ]);

        $schoolClass = $this->findClass($organization, $validated['class_name'], $validated['section']);
        abort_unless($schoolClass, 422, 'Selected class and section do not exist.');

        $exam = Exam::create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'name' => $validated['name'],
            'exam_type' => 'general',
            'publish_status' => $validated['publish_status'],
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'description' => $this->encodeExamMetadata($validated['class_name'], $validated['section']),
            'status' => 'scheduled',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Exam created successfully!',
            'data' => $this->serializeExamGroup($exam),
        ], 201);
    }

    public function update(Request $request, Exam $exam): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $exam->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'publish_status' => ['required', Rule::in(['draft', 'published'])],
            'class_name' => ['required', 'string', 'max:255'],
            'section' => ['required', 'string', 'max:255'],
        ]);

        $schoolClass = $this->findClass($organization, $validated['class_name'], $validated['section']);
        abort_unless($schoolClass, 422, 'Selected class and section do not exist.');

        $exam->update([
            'name' => $validated['name'],
            'publish_status' => $validated['publish_status'],
            'description' => $this->encodeExamMetadata($validated['class_name'], $validated['section']),
        ]);

        ExamSchedule::where('exam_id', $exam->id)->update(['class_id' => $schoolClass->id]);

        return response()->json([
            'success' => true,
            'message' => 'Exam updated successfully!',
            'data' => $this->serializeExamGroup($exam),
        ]);
    }

    public function saveSchedules(Request $request, Exam $exam): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $exam->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'subjects' => ['required', 'array', 'min:1'],
            'subjects.*.subject_id' => ['required', Rule::exists('subjects', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id))],
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
            ExamSchedule::where('exam_id', $exam->id)->delete();

            foreach ($validated['subjects'] as $subject) {
                ExamSchedule::create([
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

        return response()->json([
            'success' => true,
            'message' => 'Subjects saved successfully!',
            'data' => $this->serializeExamGroup($exam),
        ]);
    }

    public function saveResults(Request $request, ExamSchedule $examSchedule): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $examSchedule->exam?->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'results' => ['required', 'array', 'min:1'],
            'results.*.student_id' => ['required', Rule::exists('students', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id))],
            'results.*.marks_obtained' => ['required', 'numeric', 'min:0'],
        ]);

        foreach ($validated['results'] as $result) {
            $marksObtained = (float) $result['marks_obtained'];
            $totalMarks = (float) $examSchedule->max_marks;
            $grade = $this->resolveGrade($marksObtained, $totalMarks);

            ExamResult::updateOrCreate(
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

        return response()->json([
            'success' => true,
            'message' => 'Marks saved successfully!',
            'data' => $this->serializeExamGroup($examSchedule->exam),
        ]);
    }

    public function destroy(Exam $exam): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $exam->organization_id === $organization->id, 403);

        $exam->delete();

        return response()->json(['success' => true, 'message' => 'Exam deleted successfully!']);
    }

    public function hallTicketData(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $exams = Exam::where('organization_id', $organization->id)
            ->with(['schedules.schoolClass:id,name,section'])
            ->orderByDesc('created_at')
            ->get();

        $hallTickets = [];
        foreach ($exams as $exam) {
            $metadata = $this->decodeExamMetadata($exam);
            $students = Student::where('organization_id', $organization->id)
                ->whereHas('schoolClass', fn ($q) => $q->where('name', $metadata['className'])->where('section', $metadata['section']))
                ->with('schoolClass:id,name,section')
                ->get();

            foreach ($students as $student) {
                $hallTickets[] = [
                    'student_id' => (string) $student->id,
                    'student_name' => trim($student->first_name . ' ' . $student->last_name),
                    'admission_no' => $student->admission_no,
                    'roll_number' => $student->roll_number,
                    'class' => $student->schoolClass?->name,
                    'section' => $student->schoolClass?->section,
                    'exam_id' => (string) $exam->id,
                    'exam_name' => $exam->localized('name'),
                    'start_date' => $exam->start_date?->format('Y-m-d'),
                    'end_date' => $exam->end_date?->format('Y-m-d'),
                    'subjects' => $exam->schedules->map(fn ($s) => [
                        'subject' => $s->subject?->localized('name') ?? 'Subject',
                        'exam_date' => $s->exam_date?->format('Y-m-d'),
                        'start_time' => $this->formatTimeForInput($s->start_time),
                        'end_time' => $this->formatTimeForInput($s->end_time),
                        'room_number' => $s->room_number,
                    ])->values()->all(),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $hallTickets,
            'classOptions' => $this->getClassOptions($organization),
        ]);
    }

    public function printMarksheetData(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $className = $request->query('class_name');
        $examId = $request->query('exam_id');

        $exams = Exam::where('organization_id', $organization->id)
            ->when($examId, fn ($q) => $q->where('id', $examId))
            ->with(['schedules' => fn ($q) => $q->with(['subject:id,name,name_mr,name_hi', 'results' => fn ($r) => $r->with('student:id,first_name,last_name,admission_no,roll_number,class_id')])])
            ->orderByDesc('created_at')
            ->get();

        $marksheets = [];
        foreach ($exams as $exam) {
            $metadata = $this->decodeExamMetadata($exam);
            if ($className && $metadata['className'] !== $className) continue;

            $students = Student::where('organization_id', $organization->id)
                ->whereHas('schoolClass', fn ($q) => $q->where('name', $metadata['className'])->where('section', $metadata['section']))
                ->with('schoolClass:id,name,section')
                ->get();

            foreach ($students as $student) {
                $subjectResults = [];
                foreach ($exam->schedules as $schedule) {
                    $result = $schedule->results->firstWhere('student_id', $student->id);
                    $subjectResults[] = [
                        'subject' => $schedule->subject?->localized('name') ?? 'Subject',
                        'max_marks' => (float) $schedule->max_marks,
                        'obtained_marks' => $result ? (float) $result->obtained_marks : null,
                        'grade' => $result?->grade,
                        'passing_marks' => (float) $schedule->passing_marks,
                    ];
                }

                $totalMax = array_sum(array_column($subjectResults, 'max_marks'));
                $totalObtained = array_sum(array_filter(array_column($subjectResults, 'obtained_marks')));
                $percentage = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 2) : 0;

                $marksheets[] = [
                    'student_id' => (string) $student->id,
                    'student_name' => trim($student->first_name . ' ' . $student->last_name),
                    'admission_no' => $student->admission_no,
                    'roll_number' => $student->roll_number,
                    'class' => $student->schoolClass?->name,
                    'section' => $student->schoolClass?->section,
                    'exam_id' => (string) $exam->id,
                    'exam_name' => $exam->localized('name'),
                    'subjects' => $subjectResults,
                    'total_max_marks' => $totalMax,
                    'total_obtained_marks' => $totalObtained,
                    'percentage' => $percentage,
                    'overall_grade' => $this->resolveGrade($totalObtained, $totalMax),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $marksheets,
            'classOptions' => $this->getClassOptions($organization),
        ]);
    }

    public function studentOfflineExams(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $user->role === 'student' ? $this->resolveStudentForUser($user, $organization) : null;

        abort_unless($organization && $student && $user->role === 'student', 403);

        $examGroups = $this->getStudentExamGroups($organization, $student);

        return response()->json([
            'success' => true,
            'data' => $examGroups,
            'student' => [
                'id' => (string) $student->id,
                'name' => trim($student->first_name . ' ' . $student->last_name),
                'admission_no' => $student->admission_no,
                'roll_number' => $student->roll_number,
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
            ],
        ]);
    }

    private function getExamGroups(Organization $organization): array
    {
        return Exam::where('organization_id', $organization->id)
            ->with(['schedules.subject:id,name,name_mr,name_hi', 'schedules.results.student:id,first_name,last_name,class_id,roll_number', 'schedules.schoolClass:id,name,section'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Exam $exam) => $this->serializeExamGroup($exam))
            ->all();
    }

    private function serializeExamGroup(Exam $exam): array
    {
        $metadata = $this->decodeExamMetadata($exam);
        return [
            'group_id' => (string) $exam->id,
            'name' => $exam->localized('name'),
            'publish_status' => $exam->publish_status ?? 'draft',
            'class_name' => $metadata['className'],
            'section' => $metadata['section'],
            'start_date' => $exam->start_date?->format('Y-m-d'),
            'end_date' => $exam->end_date?->format('Y-m-d'),
            'status' => $exam->status,
            'created_at' => optional($exam->created_at)->toDateTimeString(),
            'exams' => $exam->schedules->map(function (ExamSchedule $schedule) {
                return [
                    'id' => (string) $schedule->id,
                    'subject_id' => $schedule->subject_id,
                    'subject' => $schedule->subject?->localized('name') ?? 'Subject',
                    'class' => $schedule->schoolClass?->name,
                    'section' => $schedule->schoolClass?->section,
                    'exam_date' => $schedule->exam_date?->format('Y-m-d'),
                    'start_time' => $this->formatTimeForInput($schedule->start_time),
                    'end_time' => $this->formatTimeForInput($schedule->end_time),
                    'room_number' => $schedule->room_number,
                    'total_marks' => $schedule->max_marks,
                    'passing_marks' => $schedule->passing_marks,
                    'results' => $schedule->results->map(fn (ExamResult $r) => [
                        'student_id' => (string) $r->student_id,
                        'marks_obtained' => (float) $r->obtained_marks,
                        'grade' => $r->grade,
                    ])->values()->all(),
                ];
            })->values()->all(),
        ];
    }

    private function getStudentExamGroups(Organization $organization, Student $student): array
    {
        $className = $student->schoolClass?->name;
        $section = $student->schoolClass?->section;

        if (!$className || !$section) return [];

        return Exam::where('organization_id', $organization->id)
            ->with(['schedules' => fn ($q) => $q->with(['subject:id,name,name_mr,name_hi', 'results' => fn ($r) => $r->where('student_id', $student->id), 'schoolClass:id,name,section'])->orderBy('exam_date')->orderBy('start_time')])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Exam $exam) use ($className, $section, $student) {
                $metadata = $this->decodeExamMetadata($exam);
                if ($metadata['className'] !== $className || $metadata['section'] !== $section) return null;

                $schedules = $exam->schedules->map(function (ExamSchedule $schedule) use ($student) {
                    $result = $schedule->results->firstWhere('student_id', $student->id);
                    $hasResult = $result !== null;
                    $obtained = $hasResult ? (float) $result->obtained_marks : null;
                    $total = (float) $schedule->max_marks;
                    $passing = (float) $schedule->passing_marks;

                    return [
                        'id' => (string) $schedule->id,
                        'subject' => $schedule->subject?->localized('name') ?? 'Subject',
                        'exam_date' => $schedule->exam_date?->format('Y-m-d'),
                        'start_time' => $this->formatTimeForInput($schedule->start_time),
                        'end_time' => $this->formatTimeForInput($schedule->end_time),
                        'room_number' => $schedule->room_number,
                        'total_marks' => $total,
                        'passing_marks' => $passing,
                        'has_result' => $hasResult,
                        'marks_obtained' => $obtained,
                        'grade' => $result?->grade,
                        'status' => !$hasResult ? 'pending' : ($obtained >= $passing ? 'passed' : 'failed'),
                    ];
                })->values();

                $totalObtained = $schedules->where('has_result', true)->sum('marks_obtained');
                $totalMaximum = $schedules->where('has_result', true)->sum('total_marks');

                return [
                    'group_id' => (string) $exam->id,
                    'name' => $exam->localized('name'),
                    'publish_status' => $exam->publish_status ?? 'draft',
                    'class_name' => $metadata['className'],
                    'section' => $metadata['section'],
                    'start_date' => $exam->start_date?->format('Y-m-d'),
                    'end_date' => $exam->end_date?->format('Y-m-d'),
                    'subjects_count' => $schedules->count(),
                    'published_results_count' => $schedules->where('has_result', true)->count(),
                    'result_percentage' => $totalMaximum > 0 ? round(($totalObtained / $totalMaximum) * 100, 2) : null,
                    'schedules' => $schedules->all(),
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    private function getStudents(Organization $organization): array
    {
        return Student::where('organization_id', $organization->id)
            ->with('schoolClass:id,name,section')
            ->orderBy('first_name')->orderBy('last_name')
            ->get()
            ->map(fn (Student $s) => [
                'id' => (string) $s->id,
                'first_name' => $s->first_name,
                'last_name' => $s->last_name,
                'class' => $s->schoolClass?->name,
                'section' => $s->schoolClass?->section,
                'roll_number' => $s->roll_number,
            ])->all();
    }

    private function getClassOptions(Organization $organization): array
    {
        return SchoolClass::where('organization_id', $organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $c) => ['id' => $c->id, 'name' => $c->name, 'section' => $c->section])
            ->all();
    }

    private function getSubjectOptions(Organization $organization): array
    {
        return Subject::where('organization_id', $organization->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Subject $s) => ['id' => $s->id, 'name' => $s->localized('name')])
            ->all();
    }

    private function getActiveAcademicYearId(Organization $organization): ?int
    {
        return AcademicYear::where('organization_id', $organization->id)->where('is_current', true)->value('id');
    }

    private function findClass(Organization $organization, string $className, string $section): ?SchoolClass
    {
        return SchoolClass::where('organization_id', $organization->id)
            ->where('name', $className)->where('section', $section)->where('status', 'active')->first();
    }

    private function encodeExamMetadata(string $className, string $section): string
    {
        return json_encode(['class_name' => $className, 'section' => $section], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
    }

    private function decodeExamMetadata(Exam $exam): array
    {
        $decoded = json_decode($exam->description ?: '', true);
        if (!is_array($decoded)) return ['className' => null, 'section' => null];
        return [
            'className' => isset($decoded['class_name']) && is_string($decoded['class_name']) ? $decoded['class_name'] : null,
            'section' => isset($decoded['section']) && is_string($decoded['section']) ? $decoded['section'] : null,
        ];
    }

    private function formatTimeForInput(?string $value): string
    {
        if (!$value) return '';
        return Str::of($value)->substr(0, 5)->toString();
    }

    private function resolveGrade(float $marksObtained, float $totalMarks): string
    {
        $percentage = $totalMarks > 0 ? ($marksObtained / $totalMarks) * 100 : 0;
        if ($percentage >= 90) return 'A+';
        if ($percentage >= 80) return 'A';
        if ($percentage >= 70) return 'B+';
        if ($percentage >= 60) return 'B';
        if ($percentage >= 50) return 'C+';
        if ($percentage >= 40) return 'C';
        return 'F';
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) return Organization::find($user->organization_id);

        if ($user->role === 'student') {
            $studentOrgId = Student::where(fn ($q) => $q->where('user_id', $user->id)->orWhere('email', $user->email))->value('organization_id');
            if ($studentOrgId) {
                $user->forceFill(['organization_id' => $studentOrgId])->save();
                $user->organization_id = $studentOrgId;
                return Organization::find($studentOrgId);
            }
        }

        if ($user->role !== 'admin') return null;

        $organization = Organization::where('email', $user->email)->first();
        if (!$organization && Organization::count() === 1) $organization = Organization::first();

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }

    private function resolveStudentForUser(User $user, ?Organization $organization): ?Student
    {
        if (!$organization) return null;
        $student = Student::where('organization_id', $organization->id)
            ->where(fn ($q) => $q->where('user_id', $user->id)->orWhere('email', $user->email))
            ->with('schoolClass')->first();

        if ($student && !$user->organization_id) {
            $user->forceFill(['organization_id' => $student->organization_id])->save();
            $user->organization_id = $student->organization_id;
        }
        return $student;
    }
}
