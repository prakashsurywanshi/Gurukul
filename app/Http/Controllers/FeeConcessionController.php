<?php

namespace App\Http\Controllers;

use App\Models\FeeConcessionRequest;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Services\Approvals\ApprovalEngine;
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

    public function __construct(
        private readonly ApprovalEngine $approvalEngine,
        private readonly SystemNotificationService $notificationService,
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

        $record = FeeConcessionRequest::query()
            ->where('organization_id', $organization->id)
            ->latest('id')
            ->firstOrFail();

        $student = $record->student;
        $summary = 'Fee concession of '.number_format((float) $record->amount, 2).' for '.trim(($student->first_name ?? '').' '.($student->last_name ?? ''));

        $this->approvalEngine->submit('fee_concession', $user, $record, $summary);

        return redirect()->route('fee-concession-requests')->with('success', 'Fee concession requested successfully.');
    }

    public function review(Request $request, FeeConcessionRequest $feeConcessionRequest): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization || $organization->id !== $feeConcessionRequest->organization_id) {
            abort(403);
        }

        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'review_note' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($feeConcessionRequest->status !== 'pending') {
            return back()->with('error', 'This request has already been reviewed.');
        }

        $student = $feeConcessionRequest->student;
        $summary = 'Fee concession of '.number_format((float) $feeConcessionRequest->amount, 2).' for '.trim(($student->first_name ?? '').' '.($student->last_name ?? ''));

        $approval = $this->approvalEngine->ensureForRecord(
            'fee_concession',
            $feeConcessionRequest->requester ?: $user,
            $feeConcessionRequest,
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

        return redirect()->route('fee-concession-requests')->with('success', 'Concession request '.$validated['action'].'d successfully.');
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