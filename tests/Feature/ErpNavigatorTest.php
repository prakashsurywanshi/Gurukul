<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ErpNavigatorTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_erp_navigator(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/explore')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ErpNavigator')
                ->has('categories', 10)
                ->where('orgName', 'Gurukul Public School')
                ->where('categories.0.name', 'Dashboard & Profiles')
            );
    }

    public function test_catalog_contains_key_modules(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/explore')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('categories.3.name', 'Fees & Accounts')
                ->where('categories.3.modules.0.href', '/fees')
                ->where('categories.3.modules.1.href', '/income-management')
                ->where('categories.3.modules.5.href', '/bank-accounts')
                ->where('categories.3.modules.6.href', '/tally')
            );
    }

    public function test_receptionist_can_view_erp_navigator(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->get('/explore')
            ->assertOk();
    }

    public function test_student_sees_dashboard_home_permissions_on_navigator(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $student = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'student',
            'status' => 'active',
        ]);

        $this->actingAs($student)
            ->get('/explore')
            ->assertOk();
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