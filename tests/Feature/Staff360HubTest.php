<?php

namespace Tests\Feature;

use App\Models\AppraisalCycle;
use App\Models\Department;
use App\Models\Designation;
use App\Models\LeaveRequest;
use App\Models\Organization;
use App\Models\StaffAppraisal;
use App\Models\StaffAttendance;
use App\Models\StaffLeaveBalance;
use App\Models\StaffLoan;
use App\Models\StaffPayrollEntry;
use App\Models\User;
use App\Services\StaffPermissionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Staff360HubTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_sees_full_hub_summaries_for_staff_member(): void
    {
        $organization = $this->createOrganization('Gurukul Staff 360');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $staff = $this->createUser($organization, 'teacher');
        $department = Department::query()->create(['organization_id' => $organization->id, 'name' => 'Mathematics']);
        $designation = Designation::query()->create(['organization_id' => $organization->id, 'name' => 'Senior Teacher']);
        $staff->forceFill([
            'employee_id' => 'EMP-360-01',
            'department_id' => $department->id,
            'designation_id' => $designation->id,
            'joining_date' => '2021-06-01',
            'phone' => '9123456780',
            'gender' => 'male',
            'date_of_birth' => '1990-01-12',
            'emergency_contact' => '9833334444',
            'blood_group' => 'B+',
        ])->save();

        $today = Carbon::now();
        $staffAttendanceSeeds = [
            ['date' => $today->format('Y-m-d'), 'status' => 'present'],
            ['date' => $today->copy()->subDay()->format('Y-m-d'), 'status' => 'present'],
            ['date' => $today->copy()->subDays(2)->format('Y-m-d'), 'status' => 'absent'],
            ['date' => $today->copy()->subDays(3)->format('Y-m-d'), 'status' => 'late'],
        ];
        foreach ($staffAttendanceSeeds as $index => $record) {
            StaffAttendance::query()->create([
                'organization_id' => $organization->id,
                'user_id' => $staff->id,
                'date' => $record['date'],
                'status' => $record['status'],
                'marked_by' => $admin->id,
            ]);
        }

        StaffPayrollEntry::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $staff->id,
            'payroll_month' => '2026-08-01',
            'base_pay' => 20000,
            'allowance' => 5000,
            'deduction' => 2000,
            'status' => 'paid',
            'prepared_by' => $admin->id,
        ]);
        StaffPayrollEntry::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $staff->id,
            'payroll_month' => '2026-07-01',
            'base_pay' => 20000,
            'allowance' => 4000,
            'deduction' => 1500,
            'status' => 'paid',
            'prepared_by' => $admin->id,
        ]);

        StaffLeaveBalance::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $staff->id,
            'leave_type' => 'casual',
            'year' => (int) $today->year,
            'entitled_days' => 12,
        ]);
        StaffLeaveBalance::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $staff->id,
            'leave_type' => 'sick',
            'year' => (int) $today->year,
            'entitled_days' => 10,
        ]);

        LeaveRequest::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $staff->id,
            'leave_type' => 'casual',
            'from_date' => $today->copy()->addDays(2)->format('Y-m-d'),
            'to_date' => $today->copy()->addDays(2)->format('Y-m-d'),
            'total_days' => 1,
            'reason' => 'Family function',
            'status' => 'pending',
        ]);
        LeaveRequest::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $staff->id,
            'leave_type' => 'sick',
            'from_date' => '2026-07-10',
            'to_date' => '2026-07-12',
            'total_days' => 3,
            'reason' => 'Fever',
            'status' => 'approved',
        ]);

        $cycle = AppraisalCycle::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Annual 2026',
            'starts_on' => '2026-01-01',
            'ends_on' => '2026-12-31',
            'status' => 'active',
        ]);
        StaffAppraisal::query()->create([
            'organization_id' => $organization->id,
            'staff_user_id' => $staff->id,
            'appraisal_cycle_id' => $cycle->id,
            'criteria' => ['teaching' => 4],
            'overall_score' => 88,
            'rating' => 'Excellent',
            'reviewer_user_id' => $admin->id,
            'feedback' => 'Great performance',
            'status' => 'completed',
            'review_date' => '2026-08-20',
        ]);

        StaffLoan::query()->create([
            'organization_id' => $organization->id,
            'staff_user_id' => $staff->id,
            'loan_reason' => 'Home renovation',
            'principal_amount' => 100000,
            'interest_rate' => 8,
            'tenure_months' => 24,
            'monthly_emi' => 4550,
            'start_date' => '2026-01-15',
            'paid_emis' => 5,
            'status' => 'active',
            'approved_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/staff/'.$staff->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/staff/StaffDetails')
                ->where('staff.employee_id', 'EMP-360-01')
                ->where('staff.department_name', 'Mathematics')
                ->where('staff.designation_name', 'Senior Teacher')
                ->where('hub.attendance.present', 2)
                ->where('hub.attendance.absent', 1)
                ->where('hub.attendance.late', 1)
                ->where('hub.attendance.this_month_present', 2)
                ->where('hub.attendance.total', 4)
                ->where('hub.payroll.total_entries', 2)
                ->where('hub.payroll.latest_month', '2026-08')
                ->where('hub.payroll.base_pay', 20000)
                ->where('hub.payroll.allowance', 5000)
                ->where('hub.payroll.deduction', 2000)
                ->where('hub.payroll.net_pay', 23000)
                ->where('hub.leave.balances.0.leave_type', 'casual')
                ->where('hub.leave.balances.0.entitled_days', 12)
                ->where('hub.leave.pending', 1)
                ->where('hub.leave.approved_days', 3)
                ->where('hub.appraisals.total', 1)
                ->where('hub.appraisals.latest_score', 88)
                ->where('hub.appraisals.latest_rating', 'Excellent')
                ->where('hub.appraisals.latest_cycle', 'Annual 2026')
                ->where('hub.loans.total', 1)
                ->where('hub.loans.active', 1)
                ->where('hub.loans.outstanding', 77250)
            );
    }

    public function test_hub_returns_defaults_when_staff_has_no_related_records(): void
    {
        $organization = $this->createOrganization('Gurukul Staff Empty');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $staff = $this->createUser($organization, 'teacher');

        $this->actingAs($admin)
            ->get('/staff/'.$staff->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/staff/StaffDetails')
                ->where('hub.attendance.total', 0)
                ->where('hub.attendance.this_month_present', 0)
                ->where('hub.payroll.total_entries', 0)
                ->where('hub.payroll.latest_month', null)
                ->where('hub.payroll.net_pay', 0)
                ->where('hub.leave.balances', [])
                ->where('hub.leave.pending', 0)
                ->where('hub.appraisals.total', 0)
                ->where('hub.loans.total', 0)
                ->where('hub.loans.outstanding', 0)
            );
    }

    public function test_hub_does_not_leak_records_from_other_organizations(): void
    {
        $organization = $this->createOrganization('Gurukul Staff Primary');
        $otherOrg = $this->createOrganization('Gurukul Staff Other');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($otherOrg);
        $admin = $this->createUser($organization, 'admin');
        $staff = $this->createUser($organization, 'teacher');

        $otherAdmin = $this->createUser($otherOrg, 'admin');
        $otherStaff = $this->createUser($otherOrg, 'teacher');

        StaffPayrollEntry::query()->create([
            'organization_id' => $otherOrg->id,
            'user_id' => $otherStaff->id,
            'payroll_month' => '2026-08-01',
            'base_pay' => 90000,
            'allowance' => 10000,
            'deduction' => 5000,
            'status' => 'paid',
            'prepared_by' => $otherAdmin->id,
        ]);

        StaffAttendance::query()->create([
            'organization_id' => $otherOrg->id,
            'user_id' => $otherStaff->id,
            'date' => Carbon::now()->format('Y-m-d'),
            'status' => 'present',
            'marked_by' => $otherAdmin->id,
        ]);

        $this->actingAs($admin)
            ->get('/staff/'.$staff->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('hub.attendance.total', 0)
                ->where('hub.payroll.total_entries', 0)
                ->where('hub.leave.balances', [])
            );
    }

    public function test_staff_cannot_open_member_from_another_organization_and_driver_is_forbidden(): void
    {
        $organization = $this->createOrganization('Gurukul Staff Access');
        $otherOrg = $this->createOrganization('Gurukul Staff Access Other');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($otherOrg);
        $admin = $this->createUser($organization, 'admin');
        $otherStaff = $this->createUser($otherOrg, 'teacher');

        $this->actingAs($admin)
            ->get('/staff/'.$otherStaff->id)
            ->assertNotFound();

        $driver = $this->createUser($organization, 'driver');
        $staff = $this->createUser($organization, 'teacher');

        $this->actingAs($driver)
            ->get('/staff/'.$staff->id)
            ->assertForbidden();
    }

    private function createOrganization(string $name): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => $name,
            'slug' => 'staff360-org-'.$counter,
            'email' => 'staff360-org-'.$counter.'@example.com',
            'type' => 'school',
            'status' => 'active',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' Staff 360 '.$counter,
            'email' => $role.'-staff360-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
            'status' => 'active',
        ]);
    }
}