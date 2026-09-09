<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\ExamSchedule;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\GradingScaleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ExamMarksController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $selectedExamId = $request->integer('exam') ?: null;
        $selectedClassId = $request->integer('class') ?: null;

        $students = [];
        $subjects = [];

        if ($selectedExamId && $selectedClassId) {
            $exam = $this->findExam($organization, $selectedExamId);
            $class = $this->findClass($organization, $selectedClassId);

            if ($exam && $class) {
                $schedules = $exam->schedules()
                    ->where('class_id', $class->id)
                    ->with(['subject:id,name,name_mr,name_hi', 'results.student:id,first_name,last_name,roll_number'])
                    ->orderBy('exam_date')
                    ->orderBy('start_time')
                    ->get();

                $subjects = $schedules
                    ->map(fn (ExamSchedule $schedule) => [
                        'scheduleId' => $schedule->id,
                        'subject' => $schedule->subject?->localized('name') ?? 'Subject',
                        'examDate' => $schedule->exam_date?->format('d M, Y'),
                        'startTime' => $this->formatTime($schedule->start_time),
                        'endTime' => $this->formatTime($schedule->end_time),
                        'room' => $schedule->room_number,
                        'maxMarks' => $schedule->max_marks,
                        'passingMarks' => $schedule->passing_marks,
                    ])
                    ->values()
                    ->all();

                $classStudents = Student::query()
                    ->forCurrentSession($organization->id)
                    ->where('class_id', $class->id)
                    ->orderByRaw('CAST(roll_number AS UNSIGNED)')
                    ->orderBy('first_name')
                    ->get(['id', 'first_name', 'last_name', 'class_id', 'roll_number']);

                $students = $classStudents
                    ->map(fn (Student $student) => [
                        'id' => (string) $student->id,
                        'name' => trim($student->first_name . ' ' . $student->last_name),
                        'rollNumber' => $student->roll_number,
                        'marks' => $schedules->map(function (ExamSchedule $schedule) use ($student) {
                            $result = $schedule->results->firstWhere('student_id', $student->id);

                            return $result ? [
                                'marks' => (float) $result->obtained_marks,
                                'grade' => $result->grade,
                                'isAbsent' => (bool) $result->is_absent,
                            ] : null;
                        })->values()->all(),
                    ])
                    ->values()
                    ->all();
            }
        }

        return Inertia::render('dashboard/EnterMarks', [
            'user' => $user,
            'exams' => $this->getExamOptions($organization),
            'classes' => $this->getClassOptions($organization),
            'selectedExamId' => $selectedExamId,
            'selectedClassId' => $selectedClassId,
            'subjects' => $subjects,
            'students' => $students,
        ]);
    }

    public function save(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'schedule_id' => ['required', 'integer'],
            'values' => ['required', 'array', 'min:1'],
            'values.*.student_id' => ['required', Rule::exists('students', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'values.*.marks_obtained' => ['nullable', 'numeric', 'min:0'],
            'values.*.is_absent' => ['nullable', 'boolean'],
        ]);

        $schedule = ExamSchedule::query()
            ->whereHas('exam', fn ($query) => $query->where('organization_id', $organization->id))
            ->find($validated['schedule_id']);

        if (!$schedule) {
            return back()->with('error', 'Schedule does not exist for this school.');
        }

        DB::transaction(function () use ($organization, $user, $schedule, $validated) {
            foreach ($validated['values'] as $value) {
                $isAbsent = (bool) ($value['is_absent'] ?? false);
                $marksObtained = $isAbsent ? 0.0 : (float) ($value['marks_obtained'] ?? 0);
                $totalMarks = (float) $schedule->max_marks;
                $percentage = $totalMarks > 0 ? ($marksObtained / $totalMarks) * 100 : 0;

                $grade = GradingScaleService::gradeFor($percentage, $organization)['grade'] ?? 'F';

                ExamResult::query()->updateOrCreate(
                    [
                        'exam_schedule_id' => $schedule->id,
                        'student_id' => (int) $value['student_id'],
                    ],
                    [
                        'organization_id' => $organization->id,
                        'theory_marks' => $isAbsent ? null : $marksObtained,
                        'practical_marks' => null,
                        'total_marks' => $totalMarks,
                        'obtained_marks' => $marksObtained,
                        'grade' => $grade,
                        'is_absent' => $isAbsent,
                        'remarks' => null,
                        'entered_by' => $user->id,
                    ]
                );
            }
        });

        return back()->with('success', 'Marks saved successfully.');
    }

    private function getExamOptions(Organization $organization): array
    {
        return Exam::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('start_date')
            ->get()
            ->map(fn (Exam $exam) => [
                'id' => $exam->id,
                'name' => $exam->name,
            ])
            ->values()
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

    private function findExam(Organization $organization, int $examId): ?Exam
    {
        return Exam::query()
            ->where('organization_id', $organization->id)
            ->find($examId);
    }

    private function findClass(Organization $organization, int $classId): ?SchoolClass
    {
        return SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->find($classId);
    }

    private function formatTime(?string $time): ?string
    {
        if (blank($time)) {
            return null;
        }

        return \Carbon\Carbon::parse($time)->format('g:i A');
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