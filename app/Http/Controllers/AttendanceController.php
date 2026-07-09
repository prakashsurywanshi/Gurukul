<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\User;
use App\Services\StudentAcademicHistoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    public function __construct(private readonly StudentAcademicHistoryService $studentAcademicHistoryService)
    {
    }

    public function index(): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return Inertia::render('dashboard/AttendanceManagement', [
            'user' => $user,
            'classRecords' => $organization ? $this->getClassRecords($organization, $user) : collect(),
            'studentRecords' => $organization ? $this->getStudentRecords($organization, $user) : collect(),
            'attendanceRecords' => $organization ? $this->getAttendanceRecords($organization, $user) : collect(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'class_id' => [
                'required',
                Rule::exists('classes', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'date' => ['required', 'date'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.student_id' => [
                'required',
                Rule::exists('students', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'entries.*.status' => ['required', Rule::in(['present', 'absent', 'late', 'half_day'])],
        ]);

        $this->ensureTeacherCanAccessClass($user, $organization, (int) $validated['class_id']);

        $activeAcademicYearId = $organization->selectedAcademicYear()?->id;

        $students = $this->studentAcademicHistoryService
            ->getSessionEnrollmentQuery($organization->id, $activeAcademicYearId)
            ->where('class_id', $validated['class_id'])
            ->whereIn('student_id', collect($validated['entries'])->pluck('student_id'))
            ->pluck('student_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($students) !== count($validated['entries'])) {
            return back()->with('error', 'One or more students do not belong to the selected class.');
        }

        foreach ($validated['entries'] as $entry) {
            Attendance::query()->updateOrCreate(
                [
                    'student_id' => $entry['student_id'],
                    'date' => $validated['date'],
                ],
                [
                    'organization_id' => $organization->id,
                    'class_id' => $validated['class_id'],
                    'status' => $entry['status'],
                    'marked_by' => $user->id,
                ]
            );
        }

        return redirect()->route('attendance')->with('success', 'Attendance saved successfully.');
    }

    private function getClassRecords(Organization $organization, User $user)
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->when(
                $user->role === 'teacher',
                fn ($query) => $query->where('class_teacher_id', $user->id)
            )
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section']);
    }

    private function getStudentRecords(Organization $organization, User $user)
    {
        $activeAcademicYearId = $organization->selectedAcademicYear()?->id;
        $allowedClassIds = $this->allowedClassIds($organization, $user);

        return $this->studentAcademicHistoryService
            ->getSessionEnrollments($organization->id, $activeAcademicYearId)
            ->when(
                $user->role === 'teacher',
                fn ($histories) => $histories->whereIn('class_id', $allowedClassIds)
            )
            ->filter(fn ($history) => ($history->status ?? $history->student?->status) === 'active')
            ->map(function ($history) {
                $student = $history->student;

                if (! $student) {
                    return null;
                }

                return [
                    'id' => (string) $student->id,
                    'class_id' => $history->class_id,
                    'admission_no' => $student->admission_no,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'class' => $history->schoolClass?->name,
                    'section' => $history->schoolClass?->section,
                    'roll_number' => $history->roll_number ?: $student->roll_number,
                ];
            })
            ->filter()
            ->values();
    }

    private function getAttendanceRecords(Organization $organization, User $user)
    {
        $allowedClassIds = $this->allowedClassIds($organization, $user);

        return Attendance::query()
            ->where('organization_id', $organization->id)
            ->whereHas('schoolClass', fn ($query) => $query->forCurrentSession($organization->id))
            ->when(
                $user->role === 'teacher',
                fn ($query) => $query->whereIn('class_id', $allowedClassIds)
            )
            ->orderByDesc('date')
            ->get()
            ->map(function (Attendance $attendance) {
                return [
                    'student_id' => (string) $attendance->student_id,
                    'class_id' => $attendance->class_id,
                    'date' => optional($attendance->date)->format('Y-m-d'),
                    'status' => $attendance->status,
                ];
            })
            ->values();
    }

    private function allowedClassIds(Organization $organization, User $user): array
    {
        if ($user->role !== 'teacher') {
            return [];
        }

        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('class_teacher_id', $user->id)
            ->pluck('id')
            ->all();
    }

    private function ensureTeacherCanAccessClass(User $user, Organization $organization, int $classId): void
    {
        if ($user->role !== 'teacher') {
            return;
        }

        $isAllowed = SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->whereKey($classId)
            ->where('class_teacher_id', $user->id)
            ->exists();

        if (! $isAllowed) {
            throw new HttpException(403, 'You can only mark attendance for your own classes.');
        }
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
