<?php

namespace App\Http\Controllers;

use App\Models\AuditTrail;
use App\Models\Department;
use App\Models\LeaveRequest;
use App\Models\Organization;
use App\Models\StaffLoan;
use App\Models\StaffPayrollEntry;
use App\Models\StaffAttendance;
use App\Models\User;
use App\Support\RolePermissionCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Throwable;

class HrDashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $staffRoles = RolePermissionCatalog::staffRoleSlugs();

        $staffBase = User::query()->where('organization_id', $organization->id)->whereIn('role', $staffRoles);

        $totalStaff = (clone $staffBase)->count();
        $activeStaff = (clone $staffBase)->where(fn ($q) => $q->whereNull('status')->orWhere('status', 'active'))->count();

        $pendingLeaves = LeaveRequest::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'pending')
            ->with('user:id,name,role')
            ->latest()
            ->limit(20)
            ->get();

        $onLeaveToday = LeaveRequest::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'approved')
            ->whereDate('from_date', '<=', now()->toDateString())
            ->whereDate('to_date', '>=', now()->toDateString())
            ->count();

        $activeLoans = StaffLoan::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->with('staff:id,name')
            ->get();

        $outstandingLoans = (float) $activeLoans->sum(
            fn (StaffLoan $loan) => ((float) $loan->principal_amount) - ((float) $loan->monthly_emi * $loan->paid_emis)
        );

        $unpaidPayslips = StaffPayrollEntry::query()
            ->where('organization_id', $organization->id)
            ->where('status', '!=', 'paid')
            ->with('staff:id,name')
            ->get();

        $unpaidPayrollValue = (float) $unpaidPayslips->sum(
            fn (StaffPayrollEntry $entry) => ((float) $entry->base_pay) + ((float) $entry->allowance) - ((float) $entry->deduction)
        );

        $departments = Department::query()->where('organization_id', $organization->id)->get(['id', 'name']);

        $departmentBreakdown = $departments->map(fn (Department $department) => [
            'name' => $department->name,
            'count' => (clone $staffBase)->where('department_id', $department->id)->count(),
        ])->filter(fn (array $entry) => $entry['count'] > 0)->values()->all();

        $ungrouped = (clone $staffBase)->whereNull('department_id')->count();
        if ($ungrouped > 0) {
            $departmentBreakdown[] = ['name' => 'Unassigned', 'count' => $ungrouped];
        }

        $today = now()->startOfDay();
        $inThirtyDays = now()->addDays(30)->endOfDay();

        $upcomingBirthdays = (clone $staffBase)
            ->whereNotNull('date_of_birth')
            ->with('department:id,name')
            ->get()
            ->filter(function (User $member) use ($today, $inThirtyDays) {
                $dob = $member->date_of_birth;
                if (!$dob) {
                    return false;
                }

                $next = $dob->copy()->setYear((int) $today->format('Y'));
                if ($next->lt($today)) {
                    $next->addYear();
                }

                return $next->lte($inThirtyDays);
            })
            ->sortBy(fn (User $member) => $member->date_of_birth->format('m-d'))
            ->take(8)
            ->values()
            ->map(fn (User $member) => [
                'name' => $member->name,
                'birthday' => $member->date_of_birth->format('d M'),
                'department' => $member->department?->name,
            ])
            ->all();

        $recentActivity = AuditTrail::query()
            ->where('organization_id', $organization->id)
            ->with('user:id,name')
            ->latest()
            ->limit(30)
            ->get()
            ->filter(fn (AuditTrail $trail) => $trail->module && str_contains((string) $trail->module, 'staff'))
            ->take(10)
            ->values()
            ->map(fn (AuditTrail $trail) => [
                'id' => $trail->id,
                'description' => $trail->description,
                'user' => $trail->user?->name,
                'created_at' => optional($trail->created_at)->format('d M Y, H:i'),
            ])
            ->all();

        return inertia('dashboard/HrDashboard', [
            'user' => $user,
            'staff' => [
                'total' => $totalStaff,
                'active' => $activeStaff,
                'onLeaveToday' => $onLeaveToday,
                'pendingLeaves' => $pendingLeaves->count(),
                'activeLoans' => $activeLoans->count(),
                'outstandingLoans' => round($outstandingLoans, 2),
                'unpaidPayslips' => $unpaidPayslips->count(),
                'unpaidPayrollValue' => round($unpaidPayrollValue, 2),
                'attendanceMarkedToday' => StaffAttendance::query()
                    ->where('organization_id', $organization->id)
                    ->whereDate('date', now()->toDateString())
                    ->count(),
            ],
            'departmentBreakdown' => $departmentBreakdown,
            'upcomingBirthdays' => $upcomingBirthdays,
            'recentActivity' => $recentActivity,
            'pendingLeaveRequests' => $pendingLeaves->map(fn (LeaveRequest $leave) => [
                'id' => $leave->id,
                'name' => $leave->user?->name,
                'leave_type' => $leave->leave_type,
                'from_date' => $leave->from_date?->format('d M'),
                'to_date' => $leave->to_date?->format('d M'),
                'days' => $leave->total_days,
            ])->values()->all(),
        ]);
    }

    public static function derivePendingCount(Organization $organization): int
    {
        return LeaveRequest::query()->where('organization_id', $organization->id)->where('status', 'pending')->count();
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

        try {
            $organization = Organization::query()->firstOrFail();
            $user->organization_id = $organization->id;
            $user->save();

            return $organization;
        } catch (Throwable) {
            return null;
        }
    }
}