<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminOrganizationTypeTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): User
    {
        return User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Career College',
            'slug' => 'career-college',
            'address' => 'College Road',
            'city' => 'Pune',
            'state' => 'Maharashtra',
            'pincode' => '411001',
            'phone' => '9999999999',
            'email' => 'career-college@example.test',
            'type' => 'college',
            'portal_routing' => 'path',
            'subscription_plan' => 'basic',
            'subscription_status' => 'active',
            'subscription_end_date' => now()->addYear()->toDateString(),
            'max_students' => 1000,
            'password' => 'password123',
        ], $overrides);
    }

    public function test_superadmin_can_create_organization_with_type_and_portal_routing(): void
    {
        $this->actingAs($this->superAdmin())
            ->post('/superadmin/organizations', $this->payload())
            ->assertRedirect('/dashboard');

        $organization = Organization::query()->where('email', 'career-college@example.test')->firstOrFail();

        $this->assertSame('college', $organization->type);
        $this->assertSame('path', $organization->settings['portal_routing'] ?? null);
    }

    public function test_created_organization_defaults_to_session_portal_routing_when_omitted(): void
    {
        $this->actingAs($this->superAdmin())
            ->post('/superadmin/organizations', $this->payload(['portal_routing' => null]))
            ->assertRedirect('/dashboard');

        $organization = Organization::query()->where('email', 'career-college@example.test')->firstOrFail();

        $this->assertSame('session', $organization->settings['portal_routing'] ?? null);
    }

    public function test_superadmin_can_update_organization_type(): void
    {
        $organization = Organization::query()->create([
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
        ]);

        $payload = $this->payload([
            'email' => 'admin@gurukul.test',
            'type' => 'university',
            'portal_routing' => 'subdomain',
        ]);

        $this->actingAs($this->superAdmin())
            ->patch("/superadmin/organizations/{$organization->id}", $payload)
            ->assertRedirect('/dashboard');

        $organization->refresh();

        $this->assertSame('university', $organization->type);
        $this->assertSame('subdomain', $organization->settings['portal_routing'] ?? null);
    }

    public function test_invalid_organization_type_is_rejected(): void
    {
        $this->actingAs($this->superAdmin())
            ->post('/superadmin/organizations', $this->payload(['type' => 'madrassa']))
            ->assertSessionHasErrors('type');

        $this->assertSame(0, Organization::query()->where('email', 'career-college@example.test')->count());
    }

    public function test_invalid_portal_routing_is_rejected(): void
    {
        $this->actingAs($this->superAdmin())
            ->post('/superadmin/organizations', $this->payload(['portal_routing' => 'https']))
            ->assertSessionHasErrors('portal_routing');

        $this->assertSame(0, Organization::query()->where('email', 'career-college@example.test')->count());
    }

    public function test_organizations_payload_includes_type_and_portal_routing(): void
    {
        $this->actingAs($this->superAdmin());

        $organization = Organization::query()->create([
            'name' => 'City University',
            'slug' => 'city-university',
            'email' => 'university@example.test',
            'phone' => '9999999999',
            'address' => 'University Road',
            'city' => 'Chennai',
            'state' => 'Tamil Nadu',
            'country' => 'India',
            'pincode' => '600001',
            'type' => 'university',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subDays(10)->toDateString(),
            'subscription_end_date' => now()->addDays(30)->toDateString(),
            'max_students' => 5000,
            'max_staff' => 500,
            'settings' => ['portal_routing' => 'subdomain'],
        ]);

        $this->get('/superadmin/organizations')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->has('organizations', 1)
                ->where('organizations.0.type', 'university')
                ->where('organizations.0.settings.portal_routing', 'subdomain'));
    }
}