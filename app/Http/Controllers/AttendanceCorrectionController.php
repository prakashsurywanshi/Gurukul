<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceCorrection;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\Approvals\ApprovalEngine;
use App\Services\StudentAcademicHistoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AttendanceCorrectionController extends Controller
{
    public const STATUSES = ['pending', 'approved', 'rejected'];

    public function __construct(
        private readonly StudentAcademicHistoryService $studentAcademicHistoryService,
        private readonly ApprovalEngine $approvalEngine,
    ) {
    }

    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            abort(403);
        }

        $status = in_array($request->query('status'), self::STATUSES, true)
            ? $request->query('status')
            : 'pending';

        $corrections = AttendanceCorrection::query()
            ->where('organization_id', $organization->id)
            ->with(['student', 'schoolClass', 'requester', 'reviewer'])
            ->when(
                $user->role === 'teacher',
                fn ($query) => $query->whereIn('class_id', $this->allowedClassIds($organization, $user))
            )
            ->when(
                $status !== 'all',
                fn ($query) => $query->where('status', $status)
            )
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (AttendanceCorrection $correction) => $this->serialize($correction))
            ->values()
            ->all();

        return Inertia::render('dashboard/AttendanceCorrections', [
            'user' => $user,
            'corrections' => $corrections,
            'classRecords' => $this->classRecords($organization, $user),
            'students' => $this->studentRecords($organization, $user),
            'statuses' => self::STATUSES,
            'canReview' => in_array($user->role, ['admin', 'super_admin'], true),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'student_id' => [
                'required',
                Rule::exists('students', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'date' => ['required', 'date'],
            'requested_status' => ['required', Rule::in(['present', 'absent', 'late', 'half_day'])],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $classId = Student::query()->whereKey($validated['student_id'])->value('class_id');
        $this->ensureTeacherCanAccessClass($user, $organization, (int) $classId);

        $current = Attendance::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $validated['student_id'])
            ->where('date', $validated['date'])
            ->value('status');

        $currentStatus = $current ?: 'absent';

        if ($currentStatus === $validated['requested_status']) {
            return back()->with('error', 'The student already has the requested attendance status.');
        }

        AttendanceCorrection::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $validated['student_id'],
            'class_id' => $classId ?: null,
            'date' => $validated['date'],
            'current_status' => $currentStatus,
            'requested_status' => $validated['requested_status'],
            'reason' => $validated['reason'] ?? null,
            'status' => 'pending',
            'requested_by' => $user->id,
        ]);

        $record = AttendanceCorrection::query()
            ->where('organization_id', $organization->id)
            ->latest('id')
            ->firstOrFail();

        $student = $record->student;
        $summary = 'Attendance correction: '.trim(($student->first_name ?? '').' '.($student->last_name ?? '')).' '.$record->date->format('Y-m-d').' '.$record->current_status.' → '.$record->requested_status;

        $this->approvalEngine->submit('attendance_correction', $user, $record, $summary);

        return redirect()->route('attendance-corrections')->with('success', 'Attendance correction requested successfully.');
    }

    public function review(Request $request, AttendanceCorrection $attendanceCorrection): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization || $organization->id !== $attendanceCorrection->organization_id) {
            abort(403);
        }

        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'review_note' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($attendanceCorrection->status !== 'pending') {
            return back()->with('error', 'This correction has already been reviewed.');
        }

        $student = $attendanceCorrection->student;
        $summary = 'Attendance correction: '.trim(($student->first_name ?? '').' '.($student->last_name ?? '')).' '.$attendanceCorrection->date->format('Y-m-d').' '.$attendanceCorrection->current_status.' → '.$attendanceCorrection->requested_status;

        $approval = $this->approvalEngine->ensureForRecord(
            'attendance_correction',
            $attendanceCorrection->requester ?: $user,
            $attendanceCorrection,
            $summary
        );

        try {
            if ($validated['action'] === 'approve') {
                $this->approvalEngine->approve($approval, $user, $validated['review_note'] ?? null);
            } else {
                $this->approvalEngine->reject($approval, $user, $validated['review_note'] ?? null);
            }
        } catch (HttpException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()->route('attendance-corrections')->with('success', 'Correction '.$validated['action'].'d successfully.');
    }

    private function serialize(AttendanceCorrection $correction): array
    {
        $student = $correction->student;

        return [
            'id' => (string) $correction->id,
            'student_id' => (string) $correction->student_id,
            'admission_no' => $student?->admission_no,
            'first_name' => $student?->first_name,
            'last_name' => $student?->last_name,
            'class' => trim(($correction->schoolClass?->name ?? '').' '.($correction->schoolClass?->section ?? '')),
            'date' => optional($correction->date)->format('Y-m-d'),
            'current_status' => $correction->current_status,
            'requested_status' => $correction->requested_status,
            'reason' => $correction->reason,
            'status' => $correction->status,
            'requested_by' => $correction->requester?->name,
            'reviewed_by' => $correction->reviewer?->name,
            'reviewed_at' => optional($correction->reviewed_at)->format('Y-m-d H:i'),
            'review_note' => $correction->review_note,
        ];
    }

    private function classRecords(Organization $organization, User $user)
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
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => (string) $schoolClass->id,
                'label' => trim(($schoolClass->name ?? '').' '.($schoolClass->section ?? '')),
            ])
            ->values();
    }

    private function studentRecords(Organization $organization, User $user)
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
                    'admission_no' => $student->admission_no,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'class' => trim(($history->schoolClass?->name ?? '').' '.($history->schoolClass?->section ?? '')),
                ];
            })
            ->filter()
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
            throw new HttpException(403, 'You can only request corrections for your own classes.');
        }
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

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

        if (! $organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}