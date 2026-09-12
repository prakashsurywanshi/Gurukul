<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class S9AccountantSurfaceTest extends TestCase
{
    use RefreshDatabase;

    private StaffPermissionService $permissionService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->permissionService = app(StaffPermissionService::class);
    }

    public function test_accountant_can_view_collect_fees_deep_link(): void
    {
        [$organization, $accountant] = $this->setupAccountantWithOrg();

        $this->actingAs($accountant)
            ->get('/fees?tab=collection')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/FeeManagement'));
    }

    public function test_accountant_can_view_fee_types_deep_link(): void
    {
        [$organization, $accountant] = $this->setupAccountantWithOrg();

        $this->actingAs($accountant)
            ->get('/fees?tab=fee-types')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/FeeManagement'));
    }

    public function test_accountant_can_view_search_due_fees_page(): void
    {
        [$organization, $accountant] = $this->setupAccountantWithOrg();

        $this->actingAs($accountant)
            ->get('/fees/due-slips')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/DueSlips'));
    }

    public function test_accountant_can_view_lead_dashboard(): void
    {
        [$organization, $accountant] = $this->setupAccountantWithOrg();

        $this->actingAs($accountant)
            ->get('/leads/dashboard')
            ->assertOk();
    }

    public function test_accountant_can_view_lead_pipeline_board(): void
    {
        [$organization, $accountant] = $this->setupAccountantWithOrg();

        $this->actingAs($accountant)
            ->get('/leads')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/Leads'));
    }

    public function test_accountant_can_view_lead_sources_stages(): void
    {
        [$organization, $accountant] = $this->setupAccountantWithOrg();

        $this->actingAs($accountant)
            ->get('/leads/sources-stages')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/LeadSourcesStages'));
    }

    public function test_accountant_admission_leads_permissions_are_view_only(): void
    {
        [$organization, $accountant] = $this->setupAccountantWithOrg();

        $this->assertTrue($this->permissionService->allows($accountant, 'Admission Leads', 'view'));
        $this->assertFalse($this->permissionService->allows($accountant, 'Admission Leads', 'add'));
        $this->assertFalse($this->permissionService->allows($accountant, 'Admission Leads', 'edit'));
        $this->assertFalse($this->permissionService->allows($accountant, 'Admission Leads', 'delete'));
    }

    public function test_accountant_cannot_mutate_leads(): void
    {
        [$organization, $accountant] = $this->setupAccountantWithOrg();

        $this->actingAs($accountant)
            ->post('/leads', [
                'first_name' => 'Lead',
                'last_name' => 'Test',
                'phone' => '9876543210',
                'source' => 'Website',
            ])
            ->assertForbidden();
    }

    public function test_accountant_still_has_fees_management_full_permissions(): void
    {
        [$organization, $accountant] = $this->setupAccountantWithOrg();

        $this->assertTrue($this->permissionService->allows($accountant, 'Fees Management', 'view'));
        $this->assertTrue($this->permissionService->allows($accountant, 'Fees Management', 'add'));
        $this->assertTrue($this->permissionService->allows($accountant, 'Fees Management', 'edit'));
        $this->assertTrue($this->permissionService->allows($accountant, 'Fees Management', 'delete'));
    }

    private function setupAccountantWithOrg(): array
    {
        $organization = $this->createOrganization();
        $this->permissionService->ensureRolesExist($organization);
        $accountant = $this->createStaff($organization, 'accountant');

        return [$organization, $accountant];
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'S9 Accountant Surface School '.$counter,
            'slug' => 's9-accountant-surface-school-'.$counter,
            'address' => '123 Main Street',
            'contact_number' => '9876543210',
            'email' => 'admin-'.$counter.'@example.com',
            'password' => '12345678',
            'time_zone' => 'Asia/Kolkata',
            'locale' => 'en',
            'status' => 'active',
        ]);
    }

    private function createStaff(Organization $organization, string $role): User
    {
        static $staffCounter = 0;
        $staffCounter++;

        return User::query()->create([
            'name' => ucfirst($role).' Staff '.$staffCounter,
            'email' => $role.'-staff-'.$staffCounter.'@example.com',
            'password' => '12345678',
            'role' => $role,
            'organization_id' => $organization->id,
            'status' => 'active',
        ]);
    }
}
