<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\StaffPayrollEntry;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollPayslipTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_payslip(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $staff = $this->createUser($organization, 'teacher');
        $entry = $this->createPayrollEntry($organization, $staff, 50000, 5000, 3000, 'processed');

        $this->actingAs($admin)
            ->get("/staff/payroll-management/{$entry->id}/payslip")
            ->assertOk()
            ->assertSee('Payroll Slip')
            ->assertSee($staff->name)
            ->assertSee('Rupees Only');
    }

    public function test_admin_can_download_payslip_pdf(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $staff = $this->createUser($organization, 'teacher');
        $entry = $this->createPayrollEntry($organization, $staff, 50000, 5000, 3000, 'paid');

        $response = $this->actingAs($admin)->get("/staff/payroll-management/{$entry->id}/payslip/download");

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString(
            'Payslip-' . $entry->id . '-' . $entry->payroll_month->format('Y-m') . '.pdf',
            $response->headers->get('Content-Disposition')
        );
    }

    public function test_payslip_denied_to_teacher(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $staff = $this->createUser($organization, 'teacher');
        $entry = $this->createPayrollEntry($organization, $staff, 50000, 5000, 3000, 'processed');

        $this->actingAs($staff)
            ->get("/staff/payroll-management/{$entry->id}/payslip")
            ->assertForbidden();
    }

    public function test_payslip_from_another_organization_is_not_visible(): void
    {
        $organization = $this->createOrganization();
        $otherOrganization = $this->createOrganization('other-gurukul', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $otherStaff = $this->createUser($otherOrganization, 'teacher');
        $otherEntry = $this->createPayrollEntry($otherOrganization, $otherStaff, 40000, 4000, 2000, 'processed');

        $this->actingAs($admin)
            ->get("/staff/payroll-management/{$otherEntry->id}/payslip")
            ->assertNotFound();

        $this->actingAs($admin)
            ->get("/staff/payroll-management/{$otherEntry->id}/payslip/download")
            ->assertNotFound();
    }

    private function createPayrollEntry(
        Organization $organization,
        User $staff,
        float $basePay,
        float $allowance,
        float $deduction,
        string $status
    ): StaffPayrollEntry {
        return StaffPayrollEntry::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $staff->id,
            'payroll_month' => now()->startOfMonth()->toDateString(),
            'base_pay' => $basePay,
            'allowance' => $allowance,
            'deduction' => $deduction,
            'status' => $status,
            'prepared_by' => $staff->id,
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    private function createOrganization(string $slug = 'gurukul-public-school', string $email = 'admin@gurukul.test'): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => $slug,
            'email' => $email,
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);
    }
}