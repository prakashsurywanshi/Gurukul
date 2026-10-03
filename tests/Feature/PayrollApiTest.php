<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\StaffPayrollEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PayrollApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_payroll_records_for_a_month(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = $this->createTeacher($organization);

        StaffPayrollEntry::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $teacher->id,
            'payroll_month' => now()->startOfMonth()->toDateString(),
            'base_pay' => 30000,
            'allowance' => 5000,
            'deduction' => 2000,
            'status' => 'processed',
            'prepared_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/payroll?month='.now()->format('Y-m'))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.can_manage', true)
            ->assertJsonPath('data.month', now()->format('Y-m'))
            ->assertJsonCount(1, 'data.records')
            ->assertJsonPath('data.records.0.staff_id', $teacher->id)
            ->assertJsonPath('data.records.0.net_pay', 33000)
            ->assertJsonCount(2, 'data.staff');
    }

    public function test_admin_can_save_payroll_entries(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = $this->createTeacher($organization);

        Sanctum::actingAs($admin);

        $month = now()->format('Y-m');

        $this->postJson('/api/payroll', [
            'payroll_month' => $month,
            'entries' => [
                [
                    'staff_id' => $teacher->id,
                    'base_pay' => 25000,
                    'allowance' => 1500,
                    'deduction' => 500,
                    'status' => 'draft',
                ],
            ],
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseHas('staff_payroll_entries', [
            'organization_id' => $organization->id,
            'user_id' => $teacher->id,
            'base_pay' => 25000,
            'status' => 'draft',
            'prepared_by' => $admin->id,
        ]);
    }

    public function test_payroll_is_tenant_scoped(): void
    {
        [, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        [$otherOrganization] = $this->createOrganizationAndAdmin('beta-school', 'admin@beta.test');
        $otherTeacher = $this->createTeacher($otherOrganization);

        Sanctum::actingAs($admin);

        $this->postJson('/api/payroll', [
            'payroll_month' => now()->format('Y-m'),
            'entries' => [
                [
                    'staff_id' => $otherTeacher->id,
                    'base_pay' => 1000,
                    'allowance' => 0,
                    'deduction' => 0,
                    'status' => 'draft',
                ],
            ],
        ])->assertStatus(422);
    }

    public function test_admin_can_view_payslip(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = $this->createTeacher($organization);

        $entry = StaffPayrollEntry::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $teacher->id,
            'payroll_month' => now()->startOfMonth()->toDateString(),
            'base_pay' => 20000,
            'allowance' => 2000,
            'deduction' => 1000,
            'status' => 'paid',
            'prepared_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/payroll/{$entry->id}/payslip")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.base_pay', 20000)
            ->assertJsonPath('data.gross_pay', 22000)
            ->assertJsonPath('data.net_pay', 21000)
            ->assertJsonPath('data.staff.name', $teacher->name);
    }

    public function test_teacher_cannot_list_payroll(): void
    {
        [$organization] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = $this->createTeacher($organization);

        Sanctum::actingAs($teacher);

        $this->getJson('/api/payroll')->assertForbidden();
    }

    private function createTeacher(Organization $organization): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);
    }

    private function createOrganizationAndAdmin(string $slug, string $email): array
    {
        $organization = Organization::query()->create([
            'name' => ucfirst(explode('-', $slug)[0]).' School',
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
        ]);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
            'phone' => '9999999999',
            'email' => $email,
        ]);

        return [$organization, $admin];
    }
}
