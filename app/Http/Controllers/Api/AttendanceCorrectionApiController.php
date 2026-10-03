<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceCorrection;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\Approvals\ApprovalEngine;
use App\Services\StudentAcademicHistoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AttendanceCorrectionApiController extends Controller
{
    public const STATUSES = ['pending', 'approved', 'rejected'];

    public function __construct(
        private readonly StudentAcademicHistoryService $studentAcademicHistoryService,
        private readonly ApprovalEngine $approvalEngine,
    ) {
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
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
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'corrections' => $corrections,
                'statuses' => self::STATUSES,
                'can_review' => in_array($user->role, ['admin', 'super_admin'], true),
            ],
        ]);
    }

    public function students(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $activeAcademicYearId = $organization->selectedAcademicYear()?->id;
        $allowedClassIds = $this->allowedClassIds($organization, $user);

        $students = $this->studentAcademicHistoryService
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
                    'class_id' => $history->class_id,
                    'class' => trim(($history->schoolClass?->name ?? '').' '.($history->schoolClass?->section ?? '')),
                ];
            })
            ->filter()
            ->values();

        return response()->json([
            'success' => true,
            'data' => $students,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
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

        $student = Student::query()->whereKey($validated['student_id'])->first();
        $classId = $student?->class_id;

        $this->ensureTeacherCanAccessClass($user, $organization, (int) $classId);

        $current = Attendance::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $validated['student_id'])
            ->where('date', $validated['date'])
            ->value('status');

        $currentStatus = $current ?: 'absent';

        if ($currentStatus === $validated['requested_status']) {
            return response()->json(['success' => false, 'message' => 'The student already has the requested attendance status.'], 422);
        }

        $correction = AttendanceCorrection::query()->create([
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

        $summary = 'Attendance correction: '.trim(($student->first_name ?? '').' '.($student->last_name ?? ''))
            .' '.$correction->date->format('Y-m-d')
            .' '.$correction->current_status.' → '.$correction->requested_status;

        $this->approvalEngine->submit('attendance_correction', $user, $correction, $summary);

        return response()->json([
            'success' => true,
            'message' => 'Attendance correction requested successfully.',
            'data' => $this->serialize($correction->fresh(['student', 'schoolClass', 'requester', 'reviewer'])),
        ], 201);
    }

    public function review(Request $request, AttendanceCorrection $attendanceCorrection)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization || (int) $organization->id !== (int) $attendanceCorrection->organization_id) {
            return response()->json(['success' => false, 'message' => 'Correction not found.'], 404);
        }

        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'review_note' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($attendanceCorrection->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'This correction has already been reviewed.'], 422);
        }

        $student = $attendanceCorrection->student;
        $summary = 'Attendance correction: '.trim(($student->first_name ?? '').' '.($student->last_name ?? ''))
            .' '.$attendanceCorrection->date->format('Y-m-d')
            .' '.$attendanceCorrection->current_status.' → '.$attendanceCorrection->requested_status;

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
            return response()->json(['success' => false, 'message' => $exception->getMessage()], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Correction '.$validated['action'].'d successfully.',
            'data' => $this->serialize($attendanceCorrection->fresh(['student', 'schoolClass', 'requester', 'reviewer'])),
        ]);
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
