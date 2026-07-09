<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminImpersonationTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_impersonate_school_admin_and_return(): void
    {
        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $organization = $this->createOrganization([
            'status' => 'active',
        ]);

        $schoolAdmin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->actingAs($superAdmin)
            ->post("/superadmin/organizations/{$organization->id}/impersonate")
            ->assertRedirect('/dashboard')
            ->assertSessionHas('impersonator_id', $superAdmin->id)
            ->assertSessionHas('impersonated_user_id', $schoolAdmin->id);

        $this->assertAuthenticatedAs($schoolAdmin);

        $this->post('/superadmin/impersonation/leave')
            ->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($superAdmin);
        $this->assertNull(session('impersonator_id'));
        $this->assertNull(session('impersonated_user_id'));
    }

    public function test_impersonated_school_admin_can_access_dashboard_even_when_organization_is_inactive(): void
    {
        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $organization = $this->createOrganization([
            'status' => 'inactive',
        ]);

        $schoolAdmin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'inactive',
        ]);

        $this->actingAs($superAdmin)
            ->post("/superadmin/organizations/{$organization->id}/impersonate")
            ->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($schoolAdmin);

        $this->get('/dashboard')->assertOk();
    }

    private function createOrganization(array $attributes = []): Organization
    {
        return Organization::query()->create(array_merge([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school',
            'email' => 'admin@gurukul.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subDays(10)->toDateString(),
            'subscription_end_date' => now()->addDays(30)->toDateString(),
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ], $attributes));
    }
}
