<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\Organization;
use App\Models\ReportCardRemark;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ReportCardRemarksController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $selectedClassId = $request->integer('class') ?: null;
        $selectedExamId = $request->integer('exam') ?: null;
        $includePromoted = $request->boolean('promoted');
        $search = trim((string) $request->string('q'));

        $students = [];

        if ($selectedClassId) {
            $students = $this->getStudentsForGrid(
                $organization,
                $selectedClassId,
                $selectedExamId,
                $includePromoted,
                $search
            );
        }

        return Inertia::render('dashboard/EnterReportCardRemarks', [
            'user' => $user,
            'classes' => $this->getClassOptions($organization),
            'exams' => $this->getExamOptions($organization),
            'selectedClassId' => $selectedClassId,
            'selectedExamId' => $selectedExamId,
            'includePromoted' => $includePromoted,
            'search' => $search,
            'students' => $students,
        ]);
    }

    public function save(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'class_id' => ['required', Rule::exists('classes', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'exam_id' => ['nullable', Rule::exists('exams', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'students' => ['required', 'array'],
            'students.*.student_id' => ['required', Rule::exists('students', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'students.*.class_teacher_remark' => ['nullable', 'string', 'max:500'],
            'students.*.principal_remark' => ['nullable', 'string', 'max:500'],
        ]);

        $examId = $validated['exam_id'] ?? null;

        DB::transaction(function () use ($organization, $examId, $validated) {
            foreach ($validated['students'] as $row) {
                $classTeacherRemark = trim((string) ($row['class_teacher_remark'] ?? ''));
                $principalRemark = trim((string) ($row['principal_remark'] ?? ''));

                if ($classTeacherRemark === '' && $principalRemark === '') {
                    ReportCardRemark::query()
                        ->where('organization_id', $organization->id)
                        ->where('exam_id', $examId)
                        ->where('student_id', (int) $row['student_id'])
                        ->delete();

                    continue;
                }

                ReportCardRemark::query()->updateOrCreate(
                    [
                        'organization_id' => $organization->id,
                        'exam_id' => $examId,
                        'student_id' => (int) $row['student_id'],
                    ],
                    [
                        'class_teacher_remark' => $classTeacherRemark !== '' ? $classTeacherRemark : null,
                        'principal_remark' => $principalRemark !== '' ? $principalRemark : null,
                    ]
                );
            }
        });

        return redirect()
            ->route('marksheet-remarks', [
                'class' => $validated['class_id'],
                'exam' => $examId,
                'promoted' => $request->boolean('promoted') ? 1 : 0,
            ])
            ->with('success', 'Report card remarks saved successfully.');
    }

    private function getStudentsForGrid(
        Organization $organization,
        int $classId,
        ?int $examId,
        bool $includePromoted,
        string $search
    ): array {
        $currentStudentIds = Student::query()
            ->forCurrentSession($organization->id)
            ->where('class_id', $classId)
            ->pluck('id');

        $studentIds = $currentStudentIds->toArray();

        if ($includePromoted) {
            $promotedIds = Student::query()
                ->where('organization_id', $organization->id)
                ->whereHas(
                    'academicHistories',
                    fn ($query) => $query->where('class_id', $classId)->where('status', 'promoted')
                )
                ->pluck('id');

            $studentIds = $currentStudentIds
                ->merge($promotedIds)
                ->unique()
                ->values()
                ->toArray();
        }

        if ($studentIds === []) {
            return [];
        }

        $remarks = ReportCardRemark::query()
            ->where('organization_id', $organization->id)
            ->where('exam_id', $examId)
            ->whereIn('student_id', $studentIds)
            ->get()
            ->keyBy('student_id');

        return Student::query()
            ->whereIn('id', $studentIds)
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query
                    ->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('admission_no', 'like', "%{$search}%");
            }))
            ->orderByRaw('CAST(roll_number AS UNSIGNED)')
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'admission_no', 'roll_number'])
            ->map(function (Student $student) use ($remarks, $currentStudentIds) {
                $remark = $remarks->get($student->id);

                return [
                    'id' => (string) $student->id,
                    'name' => trim($student->first_name . ' ' . $student->last_name),
                    'admissionNo' => $student->admission_no,
                    'rollNumber' => $student->roll_number,
                    'classTeacherRemark' => $remark?->class_teacher_remark ?? '',
                    'principalRemark' => $remark?->principal_remark ?? '',
                    'isCurrent' => $currentStudentIds->contains($student->id),
                ];
            })
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

    private function getExamOptions(Organization $organization): array
    {
        return Exam::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('start_date')
            ->get()
            ->map(fn (Exam $exam) => [
                'id' => $exam->id,
                'name' => $exam->localized('name'),
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
            return null;
        }

        return Organization::query()->where('status', 'active')->first();
    }
}