<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamSchedule;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ExamScheduleSetupController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $selectedExamId = $request->integer('exam') ?: null;
        $selectedClassId = $request->integer('class') ?: null;

        $rows = [];
        $subjectsOutOfScope = [];

        if ($selectedExamId && $selectedClassId) {
            $exam = $this->findExam($organization, $selectedExamId);
            $class = $this->findClass($organization, $selectedClassId);

            if ($exam && $class) {
                [$rows, $subjectsOutOfScope] = $this->buildRows($organization, $exam, $class);
            }
        }

        return Inertia::render('dashboard/ExamScheduleSetup', [
            'user' => $user,
            'exams' => $this->getExamOptions($organization),
            'classes' => $this->getClassOptions($organization),
            'selectedExamId' => $selectedExamId,
            'selectedClassId' => $selectedClassId,
            'rows' => $rows,
            'subjectsOutOfScope' => $subjectsOutOfScope,
        ]);
    }

    public function save(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'exam_id' => ['required', 'integer'],
            'class_id' => ['required', 'integer'],
            'rows' => ['present', 'array'],
            'rows.*.subject_id' => ['required', 'integer'],
            'rows.*.exam_date' => ['nullable', 'date'],
            'rows.*.start_time' => ['nullable', 'string'],
            'rows.*.end_time' => ['nullable', 'string'],
            'rows.*.room_number' => ['nullable', 'string', 'max:255'],
            'rows.*.max_marks' => ['required', 'integer', 'min:1', 'max:1000'],
            'rows.*.passing_marks' => ['required', 'integer', 'min:0'],
        ]);

        $exam = $this->findExam($organization, (int) $validated['exam_id']);
        $class = $this->findClass($organization, (int) $validated['class_id']);

        if (!$exam || !$class) {
            return back()->with('error', 'Selected exam or class does not exist.');
        }

        DB::transaction(function () use ($organization, $exam, $class, $validated) {
            $dates = [];

            foreach ($validated['rows'] as $row) {
                $subjectId = (int) $row['subject_id'];

                if (!DB::table('class_subject')->where('class_id', $class->id)->where('subject_id', $subjectId)->exists()) {
                    continue;
                }

                $schedule = ExamSchedule::query()->updateOrCreate(
                    [
                        'exam_id' => $exam->id,
                        'class_id' => $class->id,
                        'subject_id' => $subjectId,
                    ],
                    [
                        'exam_date' => $row['exam_date'] ?? $exam->start_date,
                        'start_time' => $row['start_time'] ?? '10:00:00',
                        'end_time' => $row['end_time'] ?? '12:00:00',
                        'room_number' => $row['room_number'] ?? null,
                        'max_marks' => (int) $row['max_marks'],
                        'passing_marks' => (int) $row['passing_marks'],
                    ]
                );

                if ($schedule->exam_date) {
                    $dates[] = $schedule->exam_date;
                }
            }

            ExamSchedule::query()
                ->where('exam_id', $exam->id)
                ->where('class_id', $class->id)
                ->whereNotIn('subject_id', collect($validated['rows'])->pluck('subject_id')->all())
                ->delete();

            if ($dates) {
                $exam->update([
                    'start_date' => min($dates)->format('Y-m-d'),
                    'end_date' => max($dates)->format('Y-m-d'),
                ]);
            }
        });

        return back()->with('success', 'Schedule and marks setup saved successfully.');
    }

    private function buildRows(Organization $organization, Exam $exam, SchoolClass $class): array
    {
        $assigned = DB::table('class_subject')
            ->where('class_id', $class->id)
            ->get(['subject_id'])
            ->pluck('subject_id')
            ->unique();

        $existing = $exam->schedules()
            ->where('class_id', $class->id)
            ->get()
            ->keyBy('subject_id');

        $rows = Subject::query()
            ->whereIn('id', $assigned)
            ->orderBy('name')
            ->get()
            ->map(function (Subject $subject) use ($existing) {
                $schedule = $existing->get($subject->id);

                return [
                    'id' => $subject->id,
                    'subjectId' => $subject->id,
                    'subject' => $subject->name,
                    'code' => $subject->code,
                    'examDate' => $schedule?->exam_date?->format('Y-m-d'),
                    'startTime' => $schedule?->start_time,
                    'endTime' => $schedule?->end_time,
                    'roomNumber' => $schedule?->room_number,
                    'maxMarks' => $schedule?->max_marks ?? 100,
                    'passingMarks' => $schedule?->passing_marks ?? 33,
                    'scheduled' => (bool) $schedule,
                ];
            })
            ->values()
            ->all();

        $excluded = Subject::query()
            ->where('organization_id', $organization->id)
            ->whereNotIn('id', $assigned)
            ->orderBy('name')
            ->get(['name'])
            ->pluck('name');

        return [$rows, $excluded];
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