<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Designation;
use App\Models\SuperAdminSetting;
use App\Models\LeaveRequest;
use App\Models\Organization;
use App\Models\Role;
use App\Models\StaffAppraisal;
use App\Models\StaffAttendance;
use App\Models\StaffLeaveBalance;
use App\Models\StaffLoan;
use App\Models\StaffPayrollEntry;
use App\Models\User;
use App\Services\LeaveBalanceService;
use App\Services\QwaAutoAlertService;
use App\Services\StaffPermissionService;
use App\Services\SystemNotificationService;
use App\Services\PdfService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Number;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class UsersController extends Controller
{
    public function __construct(
        private readonly StaffPermissionService $staffPermissionService,
        private readonly LeaveBalanceService $leaveBalanceService
    ) {
    }

    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $roleRecords = $this->roleRecordsForOrganization($organization);

        return Inertia::render('dashboard/UserManagement', [
            'user' => $user,
            'userRecords' => $this->staffRecordsForOrganization($organization, $roleRecords),
            'roleOptions' => $roleRecords,
            'designations' => $organization ? Designation::where('organization_id', $organization->id)->orderBy('name')->get(['id', 'name']) : [],
            'departments' => $organization ? Department::where('organization_id', $organization->id)->orderBy('name')->get(['id', 'name']) : [],
            'initialSearch' => (string) $request->string('q')->toString(),
        ]);
    }

    public function show(User $managedUser): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization !== null, 403);

        $roleSlugs = collect($this->roleRecordsForOrganization($organization))->pluck('slug')->all();
        abort_unless(
            $managedUser->organization_id === $organization->id && in_array($managedUser->role, $roleSlugs, true),
            404,
        );

        $managedUser->load(['designation', 'department']);

        return Inertia::render('dashboard/staff/StaffDetails', [
            'user' => $user,
            'staffId' => (string) $managedUser->id,
            'staff' => $this->serializeStaffProfile($managedUser),
            'hub' => $this->buildStaffHub($organization, $managedUser),
        ]);
    }

    public function dailyAttendance(): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $roleRecords = $this->roleRecordsForOrganization($organization);

        return Inertia::render('dashboard/StaffDailyAttendance', [
            'user' => $user,
            'staffRecords' => $this->staffRecordsForOrganization($organization, $roleRecords),
            'staffAttendanceRecords' => $this->staffAttendanceRecordsForOrganization($organization),
        ]);
    }

    public function payrollManagement(): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $roleRecords = $this->roleRecordsForOrganization($organization);

        return Inertia::render('dashboard/PayrollManagement', [
            'user' => $user,
            'staffRecords' => $this->staffRecordsForOrganization($organization, $roleRecords),
            'staffPayrollRecords' => $this->staffPayrollRecordsForOrganization($organization),
        ]);
    }

    public function leaveManagement(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $roleRecords = $this->roleRecordsForOrganization($organization);
        $leaveYear = $this->leaveBalanceService->titledYear($request->query('year'));

        return Inertia::render('dashboard/StaffLeaveManagement', [
            'user' => $user,
            'staffRecords' => $this->staffRecordsForOrganization($organization, $roleRecords),
            'leaveRequests' => $this->staffLeaveRequestsForOrganization($organization),
            'leaveBalances' => $organization ? $this->leaveBalanceService->balancesForOrganization($organization, $leaveYear) : collect(),
            'leaveTypes' => LeaveBalanceService::LEAVE_TYPES,
            'leaveYear' => $leaveYear,
        ]);
    }

    public function storeDailyAttendance(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || !$this->canManageUsers($user)) {
            abort(403);
        }

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.staff_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'entries.*.status' => ['required', Rule::in(['present', 'late', 'half_day', 'absent'])],
        ]);

        $staffIds = collect($validated['entries'])->pluck('staff_id')->map(fn ($id) => (int) $id)->all();
        $this->ensureStaffUsersBelongToOrganization($staffIds, $organization->id);

        foreach ($validated['entries'] as $entry) {
            StaffAttendance::query()->updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'user_id' => $entry['staff_id'],
                    'date' => $validated['date'],
                ],
                [
                    'status' => $entry['status'],
                    'marked_by' => $user->id,
                ]
            );
        }

        return redirect()->route('staff.daily-attendance')->with('success', 'Staff attendance saved successfully.');
    }

    public function storePayroll(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || !$this->canManageUsers($user)) {
            abort(403);
        }

        $validated = $request->validate([
            'payroll_month' => ['required', 'date_format:Y-m'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.staff_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'entries.*.base_pay' => ['required', 'numeric', 'min:0'],
            'entries.*.allowance' => ['required', 'numeric', 'min:0'],
            'entries.*.deduction' => ['required', 'numeric', 'min:0'],
            'entries.*.status' => ['required', Rule::in(['draft', 'processed', 'paid'])],
        ]);

        $staffIds = collect($validated['entries'])->pluck('staff_id')->map(fn ($id) => (int) $id)->all();
        $this->ensureStaffUsersBelongToOrganization($staffIds, $organization->id);
        $payrollMonth = Carbon::createFromFormat('Y-m', $validated['payroll_month'])->startOfMonth()->toDateString();

        foreach ($validated['entries'] as $entry) {
            StaffPayrollEntry::query()->updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'user_id' => $entry['staff_id'],
                    'payroll_month' => $payrollMonth,
                ],
                [
                    'base_pay' => $entry['base_pay'],
                    'allowance' => $entry['allowance'],
                    'deduction' => $entry['deduction'],
                    'status' => $entry['status'],
                    'prepared_by' => $user->id,
                ]
            );
        }

        return redirect()->route('staff.payroll-management')->with('success', 'Staff payroll saved successfully.');
    }

    public function printPayslip(StaffPayrollEntry $payrollEntry)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $payrollEntry->organization_id === $organization->id, 404);

        return response()->view('payroll.slip', ['slip' => $this->buildPayslipData($payrollEntry, $organization)]);
    }

    public function downloadPayslip(StaffPayrollEntry $payrollEntry)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $payrollEntry->organization_id === $organization->id, 404);

        $html = view('payroll.slip', ['slip' => $this->buildPayslipData($payrollEntry, $organization)])->render();

        $filename = 'Payslip-' . $payrollEntry->id . '-' . optional($payrollEntry->payroll_month)->format('Y-m') . '.pdf';

        return app(PdfService::class)->download($html, $filename, ['orientation' => 'portrait']);
    }

    public function storeLeaveRequest(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || !$this->canManageUsers($user)) {
            abort(403);
        }

        $validated = $this->validateLeaveRequestPayload($request, $organization);

        $this->ensureStaffUsersBelongToOrganization([(int) $validated['staff_id']], $organization->id);

        $fromDate = Carbon::parse($validated['from_date'])->startOfDay();
        $toDate = Carbon::parse($validated['to_date'])->startOfDay();
        $requestedDays = $fromDate->diffInDays($toDate) + 1;

        if (!$this->leaveBalanceService->canTake(
            $organization,
            (int) $validated['staff_id'],
            $validated['leave_type'],
            (int) $fromDate->year,
            (float) $requestedDays
        )) {
            return redirect()
                ->back()
                ->with(
                    'error',
                    sprintf(
                        "Insufficient %s leave balance for year %d.",
                        ucfirst($validated['leave_type']),
                        $fromDate->year
                    )
                );
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

        $this->notifyAdminsOfLeaveRequest($leaveRequest);

        app(QwaAutoAlertService::class)->dispatch(
            $organization,
            'leave_request',
            [
                'subject' => sprintf('Leave request: %s', ucfirst((string) $leaveRequest->leave_type)),
                'message' => (string) $leaveRequest->reason,
                'name' => $leaveRequest->user?->name ?? 'Staff member',
                'event_key' => 'leave_request:'.$leaveRequest->id.':'.$leaveRequest->status,
            ]
        );

        return redirect()->route('staff.leave-management')->with('success', 'Leave request created successfully.');
    }

    private function notifyAdminsOfLeaveRequest(LeaveRequest $leaveRequest): void
    {
        $organization = Organization::query()->find($leaveRequest->organization_id);

        if (!$organization) {
            return;
        }

        $staffName = $leaveRequest->user?->name ?? 'Staff member';
        $leaveType = ucfirst((string) ($leaveRequest->leave_type ?? 'leave'));
        $days = max(1, $leaveRequest->from_date->diffInDays($leaveRequest->to_date) + 1);

        app(SystemNotificationService::class)->notifyAdmins(
            $organization,
            NotificationCenterController::TYPE_LEAVE_REQUEST,
            'New Leave Request',
            sprintf('%s applied for %s leave for %d day(s).', $staffName, $leaveType, $days),
            [
                'action_label' => 'Review Request',
                'action_url' => '/staff/leave-management',
                'event' => 'leave_request_created',
            ]
        );
    }

    public function updateLeaveRequest(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || !$this->canManageUsers($user)) {
            abort(403);
        }

        abort_unless($leaveRequest->organization_id === $organization->id && $leaveRequest->student_id === null, 403);

        $validated = $this->validateLeaveRequestPayload($request, $organization);
        $this->ensureStaffUsersBelongToOrganization([(int) $validated['staff_id']], $organization->id);

        $fromDate = Carbon::parse($validated['from_date'])->startOfDay();
        $toDate = Carbon::parse($validated['to_date'])->startOfDay();
        $requestedDays = $fromDate->diffInDays($toDate) + 1;

        if (!$this->leaveBalanceService->canTake(
            $organization,
            (int) $validated['staff_id'],
            $validated['leave_type'],
            (int) $fromDate->year,
            (float) $requestedDays,
            $leaveRequest->id
        )) {
            return redirect()
                ->back()
                ->with(
                    'error',
                    sprintf(
                        "Insufficient %s leave balance for year %d.",
                        ucfirst($validated['leave_type']),
                        $fromDate->year
                    )
                );
        }

        $leaveRequest->update([
            'user_id' => $validated['staff_id'],
            'leave_type' => $validated['leave_type'],
            'from_date' => $fromDate->toDateString(),
            'to_date' => $toDate->toDateString(),
            'total_days' => $requestedDays,
            'reason' => $validated['reason'],
        ]);

        return redirect()->route('staff.leave-management')->with('success', 'Leave request updated successfully.');
    }

    public function updateLeaveRequestStatus(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || !$this->canManageUsers($user)) {
            abort(403);
        }

        abort_unless($leaveRequest->organization_id === $organization->id && $leaveRequest->student_id === null, 403);

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

        $staff = User::query()->find($leaveRequest->user_id);
        if ($staff) {
            $organization = Organization::query()->find($leaveRequest->organization_id);

            app(SystemNotificationService::class)->notifyUser(
                $staff,
                $organization,
                NotificationCenterController::TYPE_LEAVE_REQUEST,
                'Leave Request ' . ucfirst($validated['status']),
                sprintf(
                    'Your %s leave request (%s) was %s.',
                    ucfirst((string) ($leaveRequest->leave_type ?? 'leave')),
                    $leaveRequest->from_date?->format('j M'),
                    strtolower($validated['status'])
                ),
                [
                    'action_label' => 'View Leave',
                    'action_url' => '/staff/leave-management',
                    'event' => 'leave_request_status',
                ]
            );
        }

        if ($validated['status'] === 'approved') {
            app(QwaAutoAlertService::class)->dispatch(
                $organization,
                'leave_request',
                [
                    'subject' => sprintf('Leave approved: %s', ucfirst((string) $leaveRequest->leave_type)),
                    'message' => (string) ($validated['admin_remarks'] ?? $leaveRequest->reason ?? ''),
                    'name' => $leaveRequest->user?->name ?? 'Staff member',
                    'event_key' => 'leave_request:'.$leaveRequest->id.':approved',
                ]
            );
        }

        return redirect()->route('staff.leave-management')->with('success', 'Leave request status updated successfully.');
    }

    public function destroyLeaveRequest(LeaveRequest $leaveRequest): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || !$this->canManageUsers($user)) {
            abort(403);
        }

        abort_unless($leaveRequest->organization_id === $organization->id && $leaveRequest->student_id === null, 403);

        $leaveRequest->delete();

        return redirect()->route('staff.leave-management')->with('success', 'Leave request deleted successfully.');
    }

    public function updateLeaveBalances(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || !$this->canManageUsers($user)) {
            abort(403);
        }

        $validated = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.staffId' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'entries.*.leaveType' => ['required', Rule::in(LeaveBalanceService::LEAVE_TYPES)],
            'entries.*.entitledDays' => ['required', 'numeric', 'min:0', 'max:365'],
        ]);

        foreach ($validated['entries'] as $entry) {
            $this->leaveBalanceService->adjust(
                $organization,
                (int) $entry['staffId'],
                $entry['leaveType'],
                (int) $validated['year'],
                (float) $entry['entitledDays']
            );
        }

        return redirect()
            ->route('staff.leave-management', ['year' => $validated['year']])
            ->with('success', 'Leave balances updated successfully.');
    }

    public function designations(): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return Inertia::render('dashboard/Designations', [
            'user' => $user,
            'designations' => $organization
                ? Designation::withCount('users')
                    ->where('organization_id', $organization->id)
                    ->orderBy('name')
                    ->get(['id', 'name'])
                : [],
        ]);
    }

    public function departments(): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return Inertia::render('dashboard/Departments', [
            'user' => $user,
            'departments' => $organization
                ? Department::withCount('users')
                    ->where('organization_id', $organization->id)
                    ->orderBy('name')
                    ->get(['id', 'name'])
                : [],
        ]);
    }

    public function storeDesignation(Request $request): RedirectResponse
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || !$this->canManageUsers($currentUser)) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        Designation::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
        ]);

        return redirect()->back()->with('success', 'Designation created successfully.');
    }

    public function updateDesignation(Request $request, Designation $designation): RedirectResponse
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || !$this->canManageUsers($currentUser)) {
            abort(403);
        }

        abort_unless($designation->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $designation->update(['name' => $validated['name']]);

        return redirect()->back()->with('success', 'Designation updated successfully.');
    }

    public function destroyDesignation(Request $request, Designation $designation): RedirectResponse
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || !$this->canManageUsers($currentUser)) {
            abort(403);
        }

        abort_unless($designation->organization_id === $organization->id, 403);

        $designation->delete();

        return redirect()->back()->with('success', 'Designation deleted successfully.');
    }

    public function storeDepartment(Request $request): RedirectResponse
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || !$this->canManageUsers($currentUser)) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        Department::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
        ]);

        return redirect()->back()->with('success', 'Department created successfully.');
    }

    public function updateDepartment(Request $request, Department $department): RedirectResponse
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || !$this->canManageUsers($currentUser)) {
            abort(403);
        }

        abort_unless($department->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $department->update(['name' => $validated['name']]);

        return redirect()->back()->with('success', 'Department updated successfully.');
    }

    public function destroyDepartment(Request $request, Department $department): RedirectResponse
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || !$this->canManageUsers($currentUser)) {
            abort(403);
        }

        abort_unless($department->organization_id === $organization->id, 403);

        $department->delete();

        return redirect()->back()->with('success', 'Department deleted successfully.');
    }

    public function store(Request $request): RedirectResponse
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || !$this->canManageUsers($currentUser)) {
            abort(403);
        }

        $validated = $this->validatePayload($request);

        $staff = User::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'role' => $validated['role'],
            'status' => $validated['status'],
            'designation_id' => $validated['designation_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
        ]);

        $this->syncStaffProfile($staff, $validated['profile'] ?? []);

        return redirect()->route('users')->with('success', 'Staff member created successfully.');
    }

    public function update(Request $request, User $managedUser): RedirectResponse
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || !$this->canManageUsers($currentUser)) {
            abort(403);
        }

        $this->ensureUserBelongsToOrganization($managedUser, $organization->id);

        $validated = $this->validatePayload($request, $managedUser);

        $managedUser->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'role' => $validated['role'],
            'status' => $validated['status'],
            'designation_id' => $validated['designation_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
        ]);

        if (isset($validated['profile'])) {
            $this->syncStaffProfile($managedUser, $validated['profile']);
        }

        return redirect()->route('users')->with('success', 'Staff member updated successfully.');
    }

    public function updateStatus(Request $request, User $managedUser): RedirectResponse
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || !$this->canManageUsers($currentUser)) {
            abort(403);
        }

        $this->ensureUserBelongsToOrganization($managedUser, $organization->id);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        if ($managedUser->is($currentUser) && $validated['status'] !== 'active') {
            return back()->with('error', 'You cannot deactivate your own account.');
        }

        $managedUser->update([
            'status' => $validated['status'],
        ]);

        return redirect()->route('users')->with('success', 'Staff status updated successfully.');
    }

    public function resetPassword(User $managedUser): RedirectResponse
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || !$this->canManageUsers($currentUser)) {
            abort(403);
        }

        $this->ensureUserBelongsToOrganization($managedUser, $organization->id);

        if (! $managedUser->email) {
            return back()->with('error', 'This staff member does not have an email address.');
        }

        if (Str::endsWith($managedUser->email, '.local')) {
            return back()->with('error', 'A valid staff email is required before sending a reset password email.');
        }

        $temporaryPassword = Str::password(12);

        try {
            DB::transaction(function () use ($managedUser, $temporaryPassword) {
                $managedUser->update([
                    'password' => $temporaryPassword,
                ]);

                $this->sendStaffResetPasswordEmail($managedUser, $temporaryPassword);
            });
        } catch (Throwable $exception) {
            report($exception);

            return back()->with('error', 'Failed to reset password and send the staff email.');
        }

        return redirect()
            ->route('users')
            ->with('success', sprintf('Password reset email sent to %s.', $managedUser->email));
    }

    public function destroy(User $managedUser): RedirectResponse
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || !$this->canManageUsers($currentUser)) {
            abort(403);
        }

        $this->ensureUserBelongsToOrganization($managedUser, $organization->id);

        if ($managedUser->is($currentUser)) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        $managedUser->delete();

        return redirect()->route('users')->with('success', 'Staff member deleted successfully.');
    }

    private function validatePayload(Request $request, ?User $managedUser = null): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($managedUser?->id)],
            'role' => [
                'required',
                Rule::exists('roles', 'slug')->where(
                    fn ($query) => $query->where('organization_id', $this->resolveOrganizationForUser(Auth::user())?->id)
                ),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'designation_id' => ['nullable', 'integer', Rule::exists('designations', 'id')->where(fn ($q) => $q->where('organization_id', $this->resolveOrganizationForUser(Auth::user())?->id))],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')->where(fn ($q) => $q->where('organization_id', $this->resolveOrganizationForUser(Auth::user())?->id))],
            'profile.aadhar_number' => ['nullable', 'string', 'max:20'],
            'profile.pan' => ['nullable', 'string', 'max:20'],
            'profile.national_teacher_id' => ['nullable', 'string', 'max:50'],
            'profile.employee_code' => ['nullable', 'string', 'max:50'],
            'profile.appointment_date' => ['nullable', 'date'],
            'profile.appointment_type' => ['nullable', 'string', 'max:100'],
            'profile.recruitment_type' => ['nullable', 'string', 'max:100'],
            'profile.post' => ['nullable', 'string', 'max:200'],
            'profile.pay_scale' => ['nullable', 'string', 'max:100'],
            'profile.basic_pay' => ['nullable', 'numeric'],
            'profile.government_service_join_date' => ['nullable', 'date'],
            'profile.qualification' => ['nullable', 'string', 'max:300'],
            'profile.teaching_qualification' => ['nullable', 'string', 'max:300'],
            'profile.tet_status' => ['nullable', 'string', 'max:100'],
            'profile.mother_tongue' => ['nullable', 'string', 'max:100'],
            'profile.religion' => ['nullable', 'string', 'max:100'],
            'profile.category' => ['nullable', 'string', 'max:100'],
            'profile.subjects_taught' => ['nullable', 'array'],
            'profile.subjects_taught.*' => ['nullable', 'string', 'max:100'],
            'profile.experience_years' => ['nullable', 'numeric', 'min:0'],
            'profile.training_received' => ['nullable', 'boolean'],
            'profile.teacher_type' => ['nullable', 'string', 'max:100'],
        ];

        if (!$managedUser) {
            $rules['password'] = ['required', 'string', 'min:8'];
        }

        return $request->validate($rules);
    }

    private function syncStaffProfile(User $staff, array $profile): void
    {
        $subjects = $profile['subjects_taught'] ?? null;

        $staff->profile()->updateOrCreate([], [
            'organization_id' => $staff->organization_id,
            'aadhar_number' => $profile['aadhar_number'] ?? null,
            'pan' => $profile['pan'] ?? null,
            'national_teacher_id' => $profile['national_teacher_id'] ?? null,
            'employee_code' => $profile['employee_code'] ?? null,
            'appointment_date' => $profile['appointment_date'] ?? null,
            'appointment_type' => $profile['appointment_type'] ?? null,
            'recruitment_type' => $profile['recruitment_type'] ?? null,
            'post' => $profile['post'] ?? null,
            'pay_scale' => $profile['pay_scale'] ?? null,
            'basic_pay' => $profile['basic_pay'] ?? null,
            'government_service_join_date' => $profile['government_service_join_date'] ?? null,
            'qualification' => $profile['qualification'] ?? null,
            'teaching_qualification' => $profile['teaching_qualification'] ?? null,
            'tet_status' => $profile['tet_status'] ?? null,
            'mother_tongue' => $profile['mother_tongue'] ?? null,
            'religion' => $profile['religion'] ?? null,
            'category' => $profile['category'] ?? null,
            'subjects_taught' => is_array($subjects) ? array_values($subjects) : ($subjects !== null ? [$subjects] : null),
            'experience_years' => $profile['experience_years'] ?? null,
            'training_received' => $this->normalizeTrainingReceived($profile['training_received'] ?? null),
            'teacher_type' => $profile['teacher_type'] ?? null,
        ]);
    }

    private function validateLeaveRequestPayload(Request $request, Organization $organization): array
    {
        return $request->validate([
            'staff_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'leave_type' => ['required', Rule::in(['sick', 'casual', 'vacation', 'emergency', 'other'])],
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date', 'after_or_equal:from_date'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);
    }

    private function roleRecordsForOrganization(?Organization $organization): array
    {
        return $organization
            ? $this->staffPermissionService->roleRecords($organization)
            : [];
    }

    private function staffRecordsForOrganization(?Organization $organization, array $roleRecords): Collection
    {
        if (!$organization) {
            return collect();
        }

        $roleSlugs = collect($roleRecords)->pluck('slug')->all();

        return User::query()
            ->with(['designation', 'department', 'profile'])
            ->where('organization_id', $organization->id)
            ->whereIn('role', $roleSlugs)
            ->orderBy('name')
            ->get()
            ->map(fn (User $managedUser) => $this->serializeUser($managedUser))
            ->values();
    }

    private function serializeUser(User $managedUser): array
    {
        $profile = $managedUser->profile;

        return [
            'id' => $managedUser->id,
            'name' => $managedUser->name,
            'email' => $managedUser->email,
            'phone' => $managedUser->phone,
            'address' => $managedUser->address,
            'role' => $managedUser->role,
            'status' => $managedUser->status === 'inactive' ? 'inactive' : 'active',
            'designation_id' => $managedUser->designation_id,
            'department_id' => $managedUser->department_id,
            'designation_name' => $managedUser->relationLoaded('designation') ? $managedUser->designation?->name : null,
            'department_name' => $managedUser->relationLoaded('department') ? $managedUser->department?->name : null,
            'profile' => [
                'aadhar_number' => $profile?->aadhar_number,
                'pan' => $profile?->pan,
                'national_teacher_id' => $profile?->national_teacher_id,
                'employee_code' => $profile?->employee_code,
                'appointment_date' => $profile?->appointment_date?->format('Y-m-d'),
                'appointment_type' => $profile?->appointment_type,
                'recruitment_type' => $profile?->recruitment_type,
                'post' => $profile?->post,
                'pay_scale' => $profile?->pay_scale,
                'basic_pay' => $profile?->basic_pay,
                'government_service_join_date' => $profile?->government_service_join_date?->format('Y-m-d'),
                'qualification' => $profile?->qualification,
                'teaching_qualification' => $profile?->teaching_qualification,
                'tet_status' => $profile?->tet_status,
                'mother_tongue' => $profile?->mother_tongue,
                'religion' => $profile?->religion,
                'category' => $profile?->category,
                'subjects_taught' => is_array($profile?->subjects_taught) ? $profile->subjects_taught : [],
                'experience_years' => $profile?->experience_years,
                'training_received' => $profile?->training_received,
                'teacher_type' => $profile?->teacher_type,
            ],
        ];
    }

    private function normalizeTrainingReceived(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value)) {
            return $value !== 0;
        }

        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'y', 'on'], true);
    }

    private function serializeStaffProfile(User $managedUser): array
    {
        return [
            'id' => $managedUser->id,
            'name' => $managedUser->name,
            'email' => $managedUser->email,
            'phone' => $managedUser->phone,
            'address' => $managedUser->address,
            'city' => $managedUser->city,
            'state' => $managedUser->state,
            'pincode' => $managedUser->pincode,
            'role' => $managedUser->role,
            'status' => $managedUser->status === 'inactive' ? 'inactive' : 'active',
            'employee_id' => $managedUser->employee_id,
            'gender' => $managedUser->gender,
            'date_of_birth' => optional($managedUser->date_of_birth)->format('Y-m-d'),
            'joining_date' => optional($managedUser->joining_date)->format('Y-m-d'),
            'blood_group' => $managedUser->blood_group,
            'emergency_contact' => $managedUser->emergency_contact,
            'profile_photo' => $managedUser->profile_photo,
            'designation_id' => $managedUser->designation_id,
            'department_id' => $managedUser->department_id,
            'designation_name' => optional($managedUser->designation)->name,
            'department_name' => optional($managedUser->department)->name,
        ];
    }

    private function buildStaffHub(Organization $organization, User $staff): array
    {
        $thisMonth = Carbon::now()->format('Y-m');

        $attendance = StaffAttendance::where('organization_id', $organization->id)
            ->where('user_id', $staff->id)
            ->get();

        $payroll = StaffPayrollEntry::where('organization_id', $organization->id)
            ->where('user_id', $staff->id)
            ->orderByDesc('payroll_month')
            ->get();
        $latestPayroll = $payroll->first();

        $leaveYear = (int) Carbon::now()->year;
        $balances = StaffLeaveBalance::where('organization_id', $organization->id)
            ->where('user_id', $staff->id)
            ->where('year', $leaveYear)
            ->get(['leave_type', 'entitled_days']);
        $leaveRequests = LeaveRequest::where('organization_id', $organization->id)
            ->where('user_id', $staff->id)
            ->get();

        $appraisals = StaffAppraisal::where('organization_id', $organization->id)
            ->where('staff_user_id', $staff->id)
            ->with('cycle:id,name')
            ->orderByDesc('review_date')
            ->get();
        $latestAppraisal = $appraisals->first();

        $loans = StaffLoan::where('organization_id', $organization->id)
            ->where('staff_user_id', $staff->id)
            ->get();

        return [
            'attendance' => [
                'total' => $attendance->count(),
                'present' => $attendance->where('status', 'present')->count(),
                'absent' => $attendance->where('status', 'absent')->count(),
                'late' => $attendance->where('status', 'late')->count(),
                'leave' => $attendance->where('status', 'leave')->count(),
                'this_month_present' => $attendance->filter(
                    fn (StaffAttendance $record) => optional($record->date)->format('Y-m') === $thisMonth
                        && $record->status === 'present',
                )->count(),
            ],
            'payroll' => [
                'total_entries' => $payroll->count(),
                'latest_month' => optional($latestPayroll?->payroll_month)->format('Y-m'),
                'base_pay' => $latestPayroll ? (float) $latestPayroll->base_pay : 0,
                'allowance' => $latestPayroll ? (float) $latestPayroll->allowance : 0,
                'deduction' => $latestPayroll ? (float) $latestPayroll->deduction : 0,
                'net_pay' => $latestPayroll
                    ? (float) ($latestPayroll->base_pay + $latestPayroll->allowance - $latestPayroll->deduction)
                    : 0,
                'status' => $latestPayroll?->status,
            ],
            'leave' => [
                'balances' => $balances->map(fn (StaffLeaveBalance $balance) => [
                    'leave_type' => $balance->leave_type,
                    'entitled_days' => (float) $balance->entitled_days,
                ])->values(),
                'pending' => $leaveRequests->where('status', 'pending')->count(),
                'approved_days' => (float) $leaveRequests->where('status', 'approved')->sum('total_days'),
            ],
            'appraisals' => [
                'total' => $appraisals->count(),
                'latest_score' => $latestAppraisal?->overall_score,
                'latest_rating' => $latestAppraisal?->rating,
                'latest_cycle' => $latestAppraisal?->cycle?->name,
                'latest_review_date' => optional($latestAppraisal?->review_date)->format('Y-m-d'),
                'latest_status' => $latestAppraisal?->status,
            ],
            'loans' => [
                'total' => $loans->count(),
                'active' => $loans->where('status', 'active')->count(),
                'outstanding' => (float) $loans
                    ->where('status', 'active')
                    ->sum(fn (StaffLoan $loan) => max(0, ((float) $loan->principal_amount) - ((int) $loan->paid_emis * (float) $loan->monthly_emi))),
            ],
        ];
    }

    private function staffAttendanceRecordsForOrganization(?Organization $organization): Collection
    {
        if (!$organization) {
            return collect();
        }

        return StaffAttendance::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('date')
            ->get()
            ->map(fn (StaffAttendance $attendance) => [
                'staff_id' => $attendance->user_id,
                'date' => optional($attendance->date)->format('Y-m-d'),
                'status' => $attendance->status,
            ])
            ->values();
    }

    private function staffPayrollRecordsForOrganization(?Organization $organization): Collection
    {
        if (!$organization) {
            return collect();
        }

        return StaffPayrollEntry::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('payroll_month')
            ->get()
            ->map(fn (StaffPayrollEntry $entry) => [
                'id' => $entry->id,
                'staff_id' => $entry->user_id,
                'payroll_month' => optional($entry->payroll_month)->format('Y-m'),
                'base_pay' => (float) $entry->base_pay,
                'allowance' => (float) $entry->allowance,
                'deduction' => (float) $entry->deduction,
                'status' => $entry->status,
            ])
            ->values();
    }

    private function buildPayslipData(StaffPayrollEntry $entry, Organization $organization): array
    {
        $staff = $entry->staff;
        $gross = (float) $entry->base_pay + (float) $entry->allowance;
        $net = max(0, $gross - (float) $entry->deduction);

        return [
            'slip_no' => $entry->id,
            'month' => optional($entry->payroll_month)->translatedFormat('F Y'),
            'status' => ucfirst($entry->status),
            'base_pay' => (float) $entry->base_pay,
            'allowance' => (float) $entry->allowance,
            'deduction' => (float) $entry->deduction,
            'gross_pay' => $gross,
            'net_pay' => $net,
            'net_pay_words' => Number::spell((int) round($net)),
            'generated_at' => now()->format('d M Y, h:i A'),
            'earnings' => [
                ['description' => 'Basic Pay', 'amount' => (float) $entry->base_pay],
                ['description' => 'Allowances', 'amount' => (float) $entry->allowance],
            ],
            'deductions' => [
                ['description' => 'Deductions', 'amount' => (float) $entry->deduction],
            ],
            'staff' => [
                'name' => $staff?->name ?? 'Unknown Staff',
                'email' => $staff?->email ?? '-',
                'role' => $staff ? ucwords(str_replace('_', ' ', $staff->role)) : '-',
                'designation' => $staff?->designation?->name,
                'staff_id' => $staff?->employee_id ?? (string) ($staff?->id ?? '-'),
            ],
            'organization' => [
                'name' => $organization->name,
                'address' => $organization->address,
                'phone' => $organization->phone,
                'email' => $organization->email,
                'logo' => $organization->logo,
            ],
        ];
    }

    private function staffLeaveRequestsForOrganization(?Organization $organization): Collection
    {
        if (!$organization) {
            return collect();
        }

        return LeaveRequest::query()
            ->where('organization_id', $organization->id)
            ->whereNull('student_id')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (LeaveRequest $leaveRequest) => [
                'id' => $leaveRequest->id,
                'staffId' => $leaveRequest->user_id,
                'type' => $leaveRequest->leave_type,
                'fromDate' => optional($leaveRequest->from_date)->format('Y-m-d'),
                'toDate' => optional($leaveRequest->to_date)->format('Y-m-d'),
                'days' => $leaveRequest->total_days,
                'reason' => $leaveRequest->reason,
                'status' => $leaveRequest->status,
                'appliedOn' => optional($leaveRequest->created_at)->format('Y-m-d'),
            ])
            ->values();
    }

    private function ensureStaffUsersBelongToOrganization(array $staffIds, int $organizationId): void
    {
        $uniqueStaffIds = array_values(array_unique($staffIds));

        $validStaffCount = User::query()
            ->where('organization_id', $organizationId)
            ->whereIn('id', $uniqueStaffIds)
            ->whereIn(
                'role',
                Role::query()
                    ->where('organization_id', $organizationId)
                    ->pluck('slug')
                    ->all()
            )
            ->count();

        abort_unless($validStaffCount === count($uniqueStaffIds), 403);
    }

    private function ensureUserBelongsToOrganization(User $managedUser, int $organizationId): void
    {
        abort_unless(
            $managedUser->organization_id === $organizationId
            && Role::query()
                ->where('organization_id', $organizationId)
                ->where('slug', $managedUser->role)
                ->exists(),
            403
        );
    }

    private function canManageUsers(User $user): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }

        $organization = $this->resolveOrganizationForUser($user);

        return $organization
            && Role::query()
                ->where('organization_id', $organization->id)
                ->where('slug', $user->role)
                ->exists();
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

    private function sendStaffResetPasswordEmail(User $managedUser, string $temporaryPassword): void
    {
        if (! Schema::hasTable('super_admin_settings')) {
            throw new \RuntimeException('SMTP settings are not available.');
        }

        $settings = SuperAdminSetting::query()->first();

        if (! $settings || ! $settings->is_active) {
            throw new \RuntimeException('SMTP settings are not active.');
        }

        Mail::raw(
            "Hello {$managedUser->name},\n\nYour Gurukul ERP password has been reset by an administrator.\n\nYour updated login credentials:\nEmail: {$managedUser->email}\nPassword: {$temporaryPassword}\n\nPlease sign in and change this password as soon as possible.\n\nRegards,\nGurukul ERP",
            function ($message) use ($managedUser, $settings) {
                $message
                    ->to($managedUser->email)
                    ->subject('Your Gurukul ERP Password Has Been Reset');

                if ($settings->from_email) {
                    $message->from($settings->from_email, $settings->from_name ?: 'Gurukul ERP');
                }

                if ($settings->reply_to_email) {
                    $message->replyTo($settings->reply_to_email, $settings->from_name ?: 'Gurukul ERP');
                }
            }
        );
    }
}
