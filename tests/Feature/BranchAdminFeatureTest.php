<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BranchAdminFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_view_branch_admin_index(): void
    {
        $superAdmin = $this->createSuperAdmin();

        [$orgA, $orgB] = $this->createTwoOrganizations();

        $this->actingAs($superAdmin)
            ->get('/branch-admin')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/BranchAdmin')
                ->where('isSuperAdmin', true)
                ->has('branches', 2)
                ->has('branchAdmins', 0)
            );
    }

    public function test_super_admin_can_create_branch_admin(): void
    {
        $superAdmin = $this->createSuperAdmin();
        [$orgA, $orgB] = $this->createTwoOrganizations();

        $this->actingAs($superAdmin)
            ->post('/branch-admin/users', [
                'name' => 'Branch Lead',
                'email' => 'branchlead@gurukul.test',
                'password' => 'password123',
                'organization_ids' => [$orgA->id, $orgB->id],
            ])
            ->assertRedirect();

        $created = User::query()->where('email', 'branchlead@gurukul.test')->first();

        $this->assertNotNull($created);
        $this->assertEquals('branch_admin', $created->role);
        $this->assertEqualsCanonicalizing([$orgA->id, $orgB->id], $created->managedOrganizations()->pluck('organizations.id')->all());
    }

    public function test_super_admin_can_update_assignments(): void
    {
        $superAdmin = $this->createSuperAdmin();
        [$orgA, $orgB] = $this->createTwoOrganizations();

        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'status' => 'active',
        ]);
        $branchAdmin->managedOrganizations()->attach([$orgA->id]);

        $this->actingAs($superAdmin)
            ->patch("/branch-admin/users/{$branchAdmin->id}/organizations", [
                'organization_ids' => [$orgB->id],
            ])
            ->assertRedirect();

        $this->assertEqualsCanonicalizing([$orgB->id], $branchAdmin->fresh()->managedOrganizations()->pluck('organizations.id')->all());
    }

    public function test_super_admin_can_deactivate_branch_admin(): void
    {
        $superAdmin = $this->createSuperAdmin();

        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'status' => 'active',
        ]);

        $this->actingAs($superAdmin)
            ->delete("/branch-admin/users/{$branchAdmin->id}")
            ->assertRedirect();

        $this->assertEquals('inactive', $branchAdmin->fresh()->status);
    }

    public function test_branch_admin_can_view_index_with_only_managed_orgs(): void
    {
        [$orgA, $orgB] = $this->createTwoOrganizations();

        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'organization_id' => null,
            'status' => 'active',
        ]);
        $branchAdmin->managedOrganizations()->attach([$orgA->id]);

        $this->actingAs($branchAdmin)
            ->get('/branch-admin')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/BranchAdmin')
                ->where('isSuperAdmin', false)
                ->has('branches', 1)
                ->where('branches.0.id', $orgA->id)
            );
    }

    public function test_branch_admin_can_switch_branch(): void
    {
        [$orgA] = $this->createTwoOrganizations();

        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'status' => 'active',
        ]);
        $branchAdmin->managedOrganizations()->attach([$orgA->id]);

        $this->actingAs($branchAdmin)
            ->post("/branch-admin/switch/{$orgA->id}")
            ->assertRedirect('/dashboard');

        $this->assertEquals((string) $orgA->id, session('branch_admin_active_org_id'));
    }

    public function test_branch_admin_cannot_switch_to_unmanaged_org(): void
    {
        [$orgA, $orgB] = $this->createTwoOrganizations();

        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'status' => 'active',
        ]);
        $branchAdmin->managedOrganizations()->attach([$orgA->id]);

        $this->actingAs($branchAdmin)
            ->post("/branch-admin/switch/{$orgB->id}")
            ->assertStatus(403);
    }

    public function test_branch_admin_can_leave_branch(): void
    {
        [$orgA] = $this->createTwoOrganizations();

        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'status' => 'active',
        ]);
        $branchAdmin->managedOrganizations()->attach([$orgA->id]);

        $this->actingAs($branchAdmin)
            ->post('/branch-admin/switch/'.$orgA->id);

        $this->actingAs($branchAdmin)
            ->post('/branch-admin/leave')
            ->assertRedirect();

        $this->assertNull(session('branch_admin_active_org_id'));
    }

    public function test_branch_admin_cannot_manage_other_branch_admins(): void
    {
        [$orgA] = $this->createTwoOrganizations();

        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'status' => 'active',
        ]);
        $branchAdmin->managedOrganizations()->attach([$orgA->id]);

        $this->actingAs($branchAdmin)
            ->post('/branch-admin/users', [
                'name' => 'Bad Actor',
                'email' => 'bad@gurukul.test',
                'password' => 'password123',
                'organization_ids' => [$orgA->id],
            ])
            ->assertStatus(403);
    }

    public function test_branch_admin_manages_second_branch_admin_cannot_access(): void
    {
        [$orgA] = $this->createTwoOrganizations();

        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'status' => 'active',
        ]);
        $branchAdmin->managedOrganizations()->attach([$orgA->id]);

        $target = User::factory()->create([
            'role' => 'branch_admin',
            'status' => 'active',
        ]);

        $this->actingAs($branchAdmin)
            ->delete("/branch-admin/users/{$target->id}")
            ->assertStatus(403);

        $this->actingAs($branchAdmin)
            ->patch("/branch-admin/users/{$target->id}/organizations", [
                'organization_ids' => [],
            ])
            ->assertStatus(403);
    }

    public function test_regular_admin_cannot_access_branch_admin(): void
    {
        $org = $this->createTwoOrganizations()[0];

        $admin = User::factory()->create([
            'role' => 'admin',
            'organization_id' => $org->id,
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get('/branch-admin')
            ->assertStatus(403);
    }

    public function test_branch_admin_can_access_billing_center_scoped_to_managed_orgs(): void
    {
        [$orgA, $orgB] = $this->createTwoOrganizations();

        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'organization_id' => null,
            'status' => 'active',
        ]);
        $branchAdmin->managedOrganizations()->attach([$orgA->id]);

        $this->actingAs($branchAdmin)
            ->get('/billing-center')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('isBranchAdmin', true)
                ->has('organizations', 1)
                ->where('organizations.0.id', $orgA->id)
            );
    }

    public function test_branch_admin_cannot_mutate_billing(): void
    {
        [$orgA] = $this->createTwoOrganizations();

        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'organization_id' => null,
            'status' => 'active',
        ]);
        $branchAdmin->managedOrganizations()->attach([$orgA->id]);

        $this->actingAs($branchAdmin)
            ->post("/billing-center/organizations/{$orgA->id}/payments", [
                'amount' => 1000,
                'payment_method' => 'upi',
                'payment_date' => now()->toDateString(),
            ])
            ->assertStatus(403);
    }

    public function test_branch_admin_404_when_has_no_managed_orgs(): void
    {
        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'organization_id' => null,
            'status' => 'active',
        ]);

        $this->actingAs($branchAdmin)
            ->get('/branch-admin')
            ->assertStatus(403);
    }

    public function test_permissions_for_branch_admin_return_true_for_all_features(): void
    {
        [$orgA] = $this->createTwoOrganizations();

        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'organization_id' => null,
            'status' => 'active',
        ]);
        $branchAdmin->managedOrganizations()->attach([$orgA->id]);

        $this->actingAs($branchAdmin);

        $service = app(\App\Services\StaffPermissionService::class);

        $this->assertTrue($service->allows($branchAdmin, 'Branch Admin'));
        $this->assertTrue($service->allows($branchAdmin, 'Student Details', 'edit'));
        $this->assertTrue($service->allows($branchAdmin, 'Fees Management', 'add'));
        $this->assertTrue($service->allows($branchAdmin, 'Class / Section', 'delete'));
    }

    public function test_active_branch_is_resolved_on_switch(): void
    {
        [$orgA, $orgB] = $this->createTwoOrganizations();

        $branchAdmin = User::factory()->create([
            'role' => 'branch_admin',
            'organization_id' => null,
            'status' => 'active',
        ]);
        $branchAdmin->managedOrganizations()->attach([$orgA->id, $orgB->id]);

        $this->actingAs($branchAdmin)
            ->post("/branch-admin/switch/{$orgB->id}");

        $resolver = app(\App\Services\ActiveOrgResolver::class);
        $this->assertEquals((int) $orgB->id, $resolver->resolveActiveBranch($branchAdmin));
    }

    private function createSuperAdmin(): User
    {
        return User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    private function createTwoOrganizations(): array
    {
        $orgA = Organization::query()->create([
            'name' => 'Alpha School',
            'slug' => 'alpha-school',
            'email' => 'alpha@gurukul.test',
            'phone' => '1111111111',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonth()->toDateString(),
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);

        $orgB = Organization::query()->create([
            'name' => 'Beta School',
            'slug' => 'beta-school',
            'email' => 'beta@gurukul.test',
            'phone' => '2222222222',
            'address' => 'Second Road',
            'city' => 'Mumbai',
            'state' => 'Maharashtra',
            'country' => 'India',
            'pincode' => '400001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonth()->toDateString(),
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);

        return [$orgA, $orgB];
    }
}