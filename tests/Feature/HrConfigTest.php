<?php

namespace Tests\Feature;

use App\Models\AppraisalCycle;
use App\Models\LeaveType;
use App\Models\Organization;
use App\Models\SalaryTemplate;
use App\Models\StaffAppraisal;
use App\Models\StaffLoan;
use App\Models\StaffSalary;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HrConfigTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_leave_types(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/staff/leave-types')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/LeaveTypes')->has('types', 0));

        $this->actingAs($admin)->post('/staff/leave-types', [
            'name' => 'Casual Leave',
            'code' => 'CL',
            'days_per_year' => 12,
            'approval_required' => true,
            'cashable' => false,
            'color' => '#22c55e',
            'applies_to' => 'staff',
            'status' => 'active',
            'description' => 'Emergency casual leave',
        ])->assertRedirect();

        $type = LeaveType::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($type);
        $this->assertSame('Casual Leave', $type->name);
        $this->assertSame(12.0, (float) $type->days_per_year);

        $this->actingAs($admin)->put("/staff/leave-types/{$type->id}", [
            'name' => 'Casual Leave',
            'code' => 'CL',
            'days_per_year' => 15,
            'approval_required' => true,
            'cashable' => true,
            'color' => '#22c55e',
            'applies_to' => 'both',
            'status' => 'inactive',
        ])->assertRedirect();

        $this->assertSame(15.0, (float) $type->fresh()->days_per_year);
        $this->assertSame('inactive', $type->fresh()->status);

        $this->actingAs($admin)->delete("/staff/leave-types/{$type->id}")->assertRedirect();
        $this->assertNull(LeaveType::find($type->id));
    }

    public function test_leave_type_name_must_be_unique_per_organization(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        LeaveType::query()->create(['organization_id' => $organization->id, 'name' => 'Sick Leave']);

        $this->actingAs($admin)->post('/staff/leave-types', [
            'name' => 'Sick Leave',
            'approval_required' => true,
            'cashable' => false,
            'applies_to' => 'staff',
            'status' => 'active',
        ])->assertSessionHasErrors('name');

        $this->assertSame(1, LeaveType::query()->where('organization_id', $organization->id)->count());
    }

    public function test_admin_can_manage_staff_loans(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($admin)->post('/staff/loans', [
            'staff_user_id' => $teacher->id,
            'loan_reason' => 'House repair',
            'principal_amount' => 120000,
            'interest_rate' => 6,
            'tenure_months' => 12,
            'monthly_emi' => 10320,
            'start_date' => '2026-08-01',
            'status' => 'active',
        ])->assertRedirect();

        $loan = StaffLoan::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($loan);
        $this->assertSame(120000.0, (float) $loan->principal_amount);
        $this->assertSame('active', $loan->status);

        $this->actingAs($admin)->get('/staff/loans')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StaffLoans')
                ->has('loans', 1)
                ->where('loans.0.staffName', 'Teacher User')
                ->where('summary.openLoans', 1)
            );

        $this->actingAs($admin)->put("/staff/loans/{$loan->id}", ['paid_emis' => 6, 'status' => 'active'])->assertRedirect();
        $this->assertSame(6, $loan->fresh()->paid_emis);

        $this->actingAs($admin)->delete("/staff/loans/{$loan->id}")->assertRedirect();
        $this->assertNull(StaffLoan::find($loan->id));
    }

    public function test_admin_can_manage_appraisal_cycles_and_appraisals(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($admin)->post('/staff/appraisals/cycles', [
            'name' => '2026 Annual',
            'starts_on' => '2026-04-01',
            'ends_on' => '2026-07-31',
            'status' => 'active',
        ])->assertRedirect();

        $cycle = AppraisalCycle::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($cycle);

        $this->actingAs($admin)->post('/staff/appraisals', [
            'staff_user_id' => $teacher->id,
            'appraisal_cycle_id' => $cycle->id,
            'overall_score' => 88,
            'rating' => 'Outstanding',
            'feedback' => 'Great work overall.',
            'status' => 'completed',
        ])->assertRedirect();

        $appraisal = StaffAppraisal::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($appraisal);
        $this->assertSame(88, $appraisal->overall_score);
        $this->assertNotNull($appraisal->review_date);

        $this->actingAs($admin)->get('/staff/appraisals')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StaffAppraisals')
                ->has('cycles', 1)
                ->has('appraisals', 1)
                ->where('appraisals.0.staffName', 'Teacher User')
                ->where('appraisals.0.overallScore', 88)
            );

        $this->actingAs($admin)->delete("/staff/appraisals/{$appraisal->id}")->assertRedirect();
        $this->assertNull(StaffAppraisal::find($appraisal->id));
    }

    public function test_admin_can_manage_salary_templates_and_assignments(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($admin)->post('/staff/salary-templates', [
            'name' => 'Primary Teacher',
            'basic' => 25000,
            'hra' => 5000,
            'special_allowance' => 2000,
            'deductions' => [
                ['name' => 'Provident Fund', 'amount' => 1800],
            ],
            'status' => 'active',
        ])->assertRedirect();

        $template = SalaryTemplate::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($template);
        $this->assertSame(32000.0, (float) $template->gross);
        $this->assertSame(30200.0, (float) $template->net_salary);

        $this->actingAs($admin)->post('/staff/salary-templates/assign', [
            'staff_user_id' => $teacher->id,
            'salary_template_id' => $template->id,
            'effective_from' => '2026-09-01',
        ])->assertRedirect();

        $assignment = StaffSalary::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($assignment);
        $this->assertSame($teacher->id, $assignment->staff_user_id);
        $this->assertSame(30200.0, (float) $assignment->monthly_net);

        $this->actingAs($admin)
            ->get('/staff/salary-templates')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/SalaryTemplates')
                ->has('templates', 1)
                ->has('assignments', 1)
                ->where('summary.monthlyPayroll', 30200)
            );

        $this->actingAs($admin)->delete('/staff/salary-templates/assign/'.$assignment->id)->assertRedirect();
        $this->assertNull(StaffSalary::find($assignment->id));

        $this->actingAs($admin)->delete("/staff/salary-templates/{$template->id}")->assertRedirect();
        $this->assertNull(SalaryTemplate::find($template->id));
    }

    public function test_non_admin_cannot_access_hr_config_pages(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)->get('/staff/leave-types')->assertStatus(403);
        $this->actingAs($receptionist)->get('/staff/loans')->assertStatus(403);
        $this->actingAs($receptionist)->get('/staff/appraisals')->assertStatus(403);
        $this->actingAs($receptionist)->get('/staff/salary-templates')->assertStatus(403);
    }

    public function test_cross_organization_hr_records_are_not_accessible(): void
    {
        $organizationA = $this->createOrganization();
        $organizationB = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organizationA);

        $adminA = $this->createUser($organizationA, 'admin');
        $adminB = $this->createUser($organizationB, 'admin');

        $teacherB = $this->createUser($organizationB, 'teacher');
        $loanB = StaffLoan::query()->create([
            'organization_id' => $organizationB->id,
            'staff_user_id' => $teacherB->id,
            'loan_reason' => 'Vehicle',
            'principal_amount' => 50000,
            'monthly_emi' => 4400,
            'start_date' => now()->toDateString(),
            'status' => 'active',
        ]);

        $this->actingAs($adminA)->delete("/staff/loans/{$loanB->id}")->assertNotFound();
        $this->assertNotNull(StaffLoan::find($loanB->id));
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'HR Test School '.$counter,
            'slug' => 'hr-test-school-'.$counter,
            'email' => 'hr-org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' User',
            'email' => $role.'-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}