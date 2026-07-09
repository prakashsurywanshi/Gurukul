<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationSubscriptionAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_expired_organization_user_cannot_log_in(): void
    {
        $organization = $this->createOrganization([
            'subscription_end_date' => now()->subDay()->toDateString(),
        ]);

        User::factory()->create([
            'organization_id' => $organization->id,
            'email' => 'admin@gurukul.test',
            'password' => 'password',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->post('/login', [
            'email' => 'admin@gurukul.test',
            'password' => 'password',
        ])->assertSessionHasErrors([
            'email' => 'Your organization subscription expired on ' . now()->subDay()->format('d M Y') . '. Please contact the super admin to renew access.',
        ]);

        $this->assertGuest();
    }

    public function test_expired_organization_user_is_logged_out_when_trying_to_access_the_system(): void
    {
        $organization = $this->createOrganization([
            'subscription_end_date' => now()->subDay()->toDateString(),
        ]);

        $user = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'student',
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertRedirect('/login');

        $this->assertGuest();
    }

    private function createOrganization(array $overrides = []): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school',
            'email' => 'school@gurukul.test',
            'phone' => '9999999999',
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
            ...$overrides,
        ]);
    }
}
