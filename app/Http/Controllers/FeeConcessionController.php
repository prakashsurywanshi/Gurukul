<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\FeeConcessionRequest;
use App\Models\Organization;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use App\Services\SystemNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

class FeeConcessionController extends Controller
{
    public const STATUSES = ['pending', 'approved', 'rejected'];

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

        $requests = FeeConcessionRequest::query()
            ->where('organization_id', $organization->id)
            ->with(['student.schoolClass', 'requester', 'reviewer'])
            ->when(
                $status !== 'all',
                fn ($query) => $query->where('status', $status)
            )
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (FeeConcessionRequest $concession) => $this->serialize($concession))
            ->values()
            ->all();

        return Inertia::render('dashboard/FeeConcessions', [
            'user' => $user,
            'requests' => $requests,
            'students' => $this->studentRecords($organization),
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
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        FeeConcessionRequest::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $validated['student_id'],
            'amount' => $validated['amount'],
            'reason' => $validated['reason'],
            'requested_by' => $user->id,
        ]);

        $this->notificationService()->notifyAdmins(
            $organization,
            NotificationCenterController::TYPE_FEE_CONCESSION,
            'New fee concession request',
            'A fee concession of '.number_format((float) $validated['amount'], 2).' has been requested.',
            ['action_label' => 'Review', 'action_url' => '/fees/concession-requests'],
        );

        return redirect()->route('fee-concession-requests')->with('success', 'Fee concession requested successfully.');
    }

    public function review(Request $request, FeeConcessionRequest $feeConcessionRequest): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization || $organization->id !== $feeConcessionRequest->organization_id) {
            abort(403);
        }

        if (! in_array($user->role, ['admin', 'super_admin'], true)) {
            throw new HttpException(403, 'Only admins can review fee concession requests.');
        }

        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'review_note' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($feeConcessionRequest->status !== 'pending') {
            return back()->with('error', 'This request has already been reviewed.');
        }

        $appliedAmount = 0;

        if ($validated['action'] === 'approve') {
            $appliedAmount = $this->applyConcession($organization, $feeConcessionRequest);
        }

        $note = $validated['review_note'] ?? null;
        if ($validated['action'] === 'approve' && $appliedAmount < (float) $feeConcessionRequest->amount) {
            $note = trim(($note ? $note."\n" : '').'Applied amount: '.number_format($appliedAmount, 2));
        }

        $feeConcessionRequest->forceFill([
            'status' => $validated['action'] === 'approve' ? 'approved' : 'rejected',
            'applied_amount' => $appliedAmount,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'review_note' => $note,
        ])->save();

        if ($validated['action'] === 'approve') {
            ActivityLog::query()->create([
                'organization_id' => $organization->id,
                'user_id' => $user->id,
                'action' => 'Approved',
                'module' => 'Fee Concession',
                'record_type' => FeeConcessionRequest::class,
                'record_id' => $feeConcessionRequest->id,
                'description' => 'Approved fee concession of '.$feeConcessionRequest->amount.' for student #'.$feeConcessionRequest->student_id,
            ]);
        }

        $this->notificationService()->notifyUser(
            $feeConcessionRequest->requester,
            $organization,
            NotificationCenterController::TYPE_FEE_CONCESSION,
            $validated['action'] === 'approve' ? 'Fee concession approved' : 'Fee concession rejected',
            'The fee concession request was '.($validated['action'] === 'approve' ? 'approved' : 'rejected').'.',
            ['action_label' => 'View', 'action_url' => '/fees/concession-requests'],
        );

        return redirect()->route('fee-concession-requests')->with('success', 'Concession request '.$validated['action'].'d successfully.');
    }

    private function applyConcession(Organization $organization, FeeConcessionRequest $request): float
    {
        $studentId = $request->student_id;
        $remaining = (float) $request->amount;
        $applied = 0;

        $rows = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $studentId)
            ->whereIn('status', ['pending', 'partial', 'overdue'])
            ->where('balance', '>', 0)
            ->orderBy('due_date')
            ->orderBy('id')
            ->get();

        if ($rows->isEmpty()) {
            return 0;
        }

        foreach ($rows as $row) {
            if ($remaining <= 0) {
                break;
            }

            $cap = max(0.0, (float) $row->balance);
            if ($cap <= 0) {
                continue;
            }

            $apply = min($remaining, $cap);
            $apply = round($apply, 2);
            if ($apply <= 0) {
                continue;
            }

            $currentDiscount = max(0.0, (float) $row->discount);
            $newDiscount = round($currentDiscount + $apply, 2);
            $amount = (float) $row->amount;
            $fine = (float) $row->fine;
            $netAmount = round(max(0, $amount + $fine - $newDiscount), 2);
            $paidAmount = max(0.0, (float) $row->paid_amount);
            $newBalance = round(max(0, $netAmount - $paidAmount), 2);

            $row->update([
                'discount' => $newDiscount,
                'net_amount' => $netAmount,
                'balance' => $newBalance,
                'status' => $newBalance <= 0
                    ? 'paid'
                    : ($paidAmount > 0 ? 'partial' : $row->status),
            ]);

            $applied = round($applied + $apply, 2);
            $remaining = round($remaining - $apply, 2);
        }

        return $applied;
    }

    private function serialize(FeeConcessionRequest $concession): array
    {
        $student = $concession->student;

        return [
            'id' => (string) $concession->id,
            'student_id' => (string) $concession->student_id,
            'admission_no' => $student?->admission_no,
            'first_name' => $student?->first_name,
            'last_name' => $student?->last_name,
            'class' => trim(($student->schoolClass?->name ?? '').' '.($student->schoolClass?->section ?? '')),
            'amount' => (float) $concession->amount,
            'reason' => $concession->reason,
            'status' => $concession->status,
            'applied_amount' => (float) $concession->applied_amount,
            'requested_by' => $concession->requester?->name,
            'reviewed_by' => $concession->reviewer?->name,
            'reviewed_at' => optional($concession->reviewed_at)->format('Y-m-d H:i'),
            'review_note' => $concession->review_note,
        ];
    }

    private function studentRecords(Organization $organization): array
    {
        $activeAcademicYearId = $organization->selectedAcademicYear()?->id;

        return Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get(['id', 'admission_no', 'first_name', 'last_name', 'class_id'])
            ->map(function (Student $student) use ($organization) {
                $className = $student->class_id
                    ? trim(($student->schoolClass?->name ?? '').' '.($student->schoolClass?->section ?? ''))
                    : null;

                return [
                    'id' => (string) $student->id,
                    'admission_no' => $student->admission_no,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'class' => $className,
                ];
            })
            ->values()
            ->all();
    }

    private function notificationService(): SystemNotificationService
    {
        return app(SystemNotificationService::class);
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