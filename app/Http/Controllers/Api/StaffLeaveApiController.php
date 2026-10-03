<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResolvesHrContext;
use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Services\LeaveBalanceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class StaffLeaveApiController extends Controller
{
    use ResolvesHrContext;

    public function __construct(private readonly LeaveBalanceService $leaveBalanceService)
    {
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveHrOrganization($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $year = (int) ($request->query('year') ?: now()->year);

        $requests = LeaveRequest::query()
            ->with('user')
            ->where('organization_id', $organization->id)
            ->whereNull('student_id')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (LeaveRequest $leaveRequest) => $this->serialize($leaveRequest))
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'year' => $year,
                'can_manage' => $this->canManageHr($user, $organization),
                'leave_types' => LeaveBalanceService::LEAVE_TYPES,
                'staff' => $this->hrStaffRecords($organization),
                'requests' => $requests,
                'balances' => $this->leaveBalanceService->balancesForOrganization($organization, $year),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveHrOrganization($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        if (! $this->canManageHr($user, $organization)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $this->validatePayload($request, $organization);
        $this->ensureHrStaffBelongToOrganization([(int) $validated['staff_id']], $organization);

        $fromDate = Carbon::parse($validated['from_date'])->startOfDay();
        $toDate = Carbon::parse($validated['to_date'])->startOfDay();
        $requestedDays = $fromDate->diffInDays($toDate) + 1;

        if (! $this->leaveBalanceService->canTake(
            $organization,
            (int) $validated['staff_id'],
            $validated['leave_type'],
            (int) $fromDate->year,
            (float) $requestedDays
        )) {
            return response()->json([
                'success' => false,
                'message' => sprintf('Insufficient %s leave balance for year %d.', ucfirst($validated['leave_type']), $fromDate->year),
            ], 422);
        }

        $leaveRequest = LeaveRequest::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $validated['staff_id'],
            'student_id' => null,
            'leave_type' => $validated['leave_type'],
            'from_date' => $fromDate->toDateString(),
            'to_date' => $toDate->toDateString(),
            'total_days' => $requestedDays,
            'reason' => $validated['reason'],
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Leave request created successfully.',
            'data' => $this->serialize($leaveRequest->load('user')),
        ], 201);
    }

    public function update(Request $request, LeaveRequest $leaveRequest)
    {
        $user = Auth::user();
        $organization = $this->resolveHrOrganization($user);

        if (! $organization
            || (int) $leaveRequest->organization_id !== (int) $organization->id
            || $leaveRequest->student_id !== null) {
            return response()->json(['success' => false, 'message' => 'Leave request not found.'], 404);
        }

        if (! $this->canManageHr($user, $organization)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $this->validatePayload($request, $organization);
        $this->ensureHrStaffBelongToOrganization([(int) $validated['staff_id']], $organization);

        $fromDate = Carbon::parse($validated['from_date'])->startOfDay();
        $toDate = Carbon::parse($validated['to_date'])->startOfDay();
        $requestedDays = $fromDate->diffInDays($toDate) + 1;

        if (! $this->leaveBalanceService->canTake(
            $organization,
            (int) $validated['staff_id'],
            $validated['leave_type'],
            (int) $fromDate->year,
            (float) $requestedDays,
            $leaveRequest->id
        )) {
            return response()->json([
                'success' => false,
                'message' => sprintf('Insufficient %s leave balance for year %d.', ucfirst($validated['leave_type']), $fromDate->year),
            ], 422);
        }

        $leaveRequest->update([
            'user_id' => $validated['staff_id'],
            'leave_type' => $validated['leave_type'],
            'from_date' => $fromDate->toDateString(),
            'to_date' => $toDate->toDateString(),
            'total_days' => $requestedDays,
            'reason' => $validated['reason'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Leave request updated successfully.',
            'data' => $this->serialize($leaveRequest->fresh('user')),
        ]);
    }

    public function updateStatus(Request $request, LeaveRequest $leaveRequest)
    {
        $user = Auth::user();
        $organization = $this->resolveHrOrganization($user);

        if (! $organization
            || (int) $leaveRequest->organization_id !== (int) $organization->id
            || $leaveRequest->student_id !== null) {
            return response()->json(['success' => false, 'message' => 'Leave request not found.'], 404);
        }

        if (! $this->canManageHr($user, $organization)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected'])],
            'admin_remarks' => ['nullable', 'string', 'max:2000'],
        ]);

        $leaveRequest->update([
            'status' => $validated['status'],
            'admin_remarks' => $validated['admin_remarks'] ?? $leaveRequest->admin_remarks,
            'approved_by' => $validated['status'] === 'pending' ? null : $user->id,
            'approved_at' => $validated['status'] === 'pending' ? null : now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Leave request status updated successfully.',
            'data' => $this->serialize($leaveRequest->fresh('user')),
        ]);
    }

    public function destroy(LeaveRequest $leaveRequest)
    {
        $user = Auth::user();
        $organization = $this->resolveHrOrganization($user);

        if (! $organization
            || (int) $leaveRequest->organization_id !== (int) $organization->id
            || $leaveRequest->student_id !== null) {
            return response()->json(['success' => false, 'message' => 'Leave request not found.'], 404);
        }

        if (! $this->canManageHr($user, $organization)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $leaveRequest->delete();

        return response()->json([
            'success' => true,
            'message' => 'Leave request deleted successfully.',
        ]);
    }

    public function updateBalances(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveHrOrganization($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        if (! $this->canManageHr($user, $organization)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.staff_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'entries.*.leave_type' => ['required', Rule::in(LeaveBalanceService::LEAVE_TYPES)],
            'entries.*.entitled_days' => ['required', 'numeric', 'min:0', 'max:365'],
        ]);

        foreach ($validated['entries'] as $entry) {
            $this->leaveBalanceService->adjust(
                $organization,
                (int) $entry['staff_id'],
                $entry['leave_type'],
                (int) $validated['year'],
                (float) $entry['entitled_days']
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Leave balances updated successfully.',
        ]);
    }

    private function validatePayload(Request $request, $organization): array
    {
        return $request->validate([
            'staff_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'leave_type' => ['required', Rule::in(LeaveBalanceService::LEAVE_TYPES)],
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date', 'after_or_equal:from_date'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);
    }

    private function serialize(LeaveRequest $leaveRequest): array
    {
        return [
            'id' => $leaveRequest->id,
            'staff_id' => $leaveRequest->user_id,
            'staff_name' => $leaveRequest->user?->name,
            'type' => $leaveRequest->leave_type,
            'from_date' => optional($leaveRequest->from_date)->format('Y-m-d'),
            'to_date' => optional($leaveRequest->to_date)->format('Y-m-d'),
            'days' => (float) $leaveRequest->total_days,
            'reason' => $leaveRequest->reason,
            'status' => $leaveRequest->status,
            'admin_remarks' => $leaveRequest->admin_remarks,
            'approved_by' => $leaveRequest->approved_by,
            'applied_on' => optional($leaveRequest->created_at)->format('Y-m-d'),
        ];
    }
}
