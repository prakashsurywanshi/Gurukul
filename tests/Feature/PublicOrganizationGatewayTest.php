<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Services\ActiveOrgResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicOrganizationGatewayTest extends TestCase
{
    use RefreshDatabase;

    private function createOrganization(string $slug, string $type = 'school', string $status = 'active'): Organization
    {
        return Organization::query()->create([
            'name' => ucwords(str_replace('-', ' ', $slug)),
            'slug' => $slug,
            'email' => "{$slug}@example.test",
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => $type,
            'status' => $status,
            'subscription_plan' => 'basic',
            'subscription_start_date' => now()->subDays(10)->toDateString(),
            'subscription_end_date' => now()->addDays(30)->toDateString(),
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);
    }

    private function superAdmin(): User
    {
        return User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
            'organization_id' => null,
        ]);
    }

    public function test_gateway_lists_only_active_organizations_grouped_by_type(): void
    {
        $this->createOrganization('gurukul-school');
        $this->createOrganization('career-college', 'college');
        $this->createOrganization('hidden-institute', 'coaching', 'inactive');

        $this->get('/select-organization')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('SelectOrganization')
                ->has('organizations', 2)
                ->where('organizations.0.slug', 'gurukul-school')
                ->where('organizations.1.slug', 'career-college'));
    }

    public function test_selecting_an_organization_sets_session_and_redirects_home(): void
    {
        $this->createOrganization('gurukul-school');
        $college = $this->createOrganization('career-college', 'college');

        $this->post("/select-organization/{$college->id}")
            ->assertRedirect('/')
            ->assertSessionHas('public_active_org_id', $college->id);
    }

    public function test_selecting_an_inactive_organization_is_rejected(): void
    {
        $inactive = $this->createOrganization('hidden-institute', 'coaching', 'inactive');

        $this->post("/select-organization/{$inactive->id}")->assertNotFound();
    }

    public function test_home_renders_the_organization_chosen_on_the_gateway(): void
    {
        $this->createOrganization('gurukul-school');
        $college = $this->createOrganization('career-college', 'college');

        $this->withSession(['public_active_org_id' => $college->id])
            ->get('/')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Home')
                ->where('websiteContent.schoolName', 'Career College')
                ->where('websiteContent.type', 'college'));

        $this->assertSame('college', app(ActiveOrgResolver::class)
            ->resolvePublicOrganization()?->type);
    }

    public function test_home_falls_back_to_first_organization_without_selection(): void
    {
        $this->createOrganization('gurukul-school');
        $this->createOrganization('career-college', 'college');

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Home')
                ->where('websiteContent.schoolName', 'Gurukul School'));

        $this->assertSame('school', app(ActiveOrgResolver::class)
            ->resolvePublicOrganization()?->type);
    }

    public function test_org_query_parameter_selects_and_persists_organization(): void
    {
        $this->createOrganization('gurukul-school');
        $this->createOrganization('career-college', 'college');

        $this->get('/?org=career-college')
            ->assertOk()
            ->assertSessionHas('public_active_org_id');

        $this->assertSame('college', app(ActiveOrgResolver::class)
            ->resolvePublicOrganization()?->type);
    }

    public function test_path_mechanism_resolves_organization_from_first_url_segment(): void
    {
        $this->createOrganization('gurukul-school');
        $this->createOrganization('career-college', 'college');

        $this->get('/career-college/login')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('LoginPage')
                ->where('schoolName', 'Career College')
                ->where('orgType', 'college'));

        $this->assertSame('college', app(ActiveOrgResolver::class)
            ->resolvePublicOrganization()?->type);
    }

    public function test_subdomain_mechanism_resolves_organization_from_third_part_host(): void
    {
        $this->createOrganization('gurukul-school');
        $this->createOrganization('career-college', 'college');

        $this->get('http://career-college.example.com/')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Home')
                ->where('websiteContent.schoolName', 'Career College')
                ->where('websiteContent.type', 'college'));

        $this->assertSame('college', app(ActiveOrgResolver::class)
            ->resolvePublicOrganization()?->type);
    }

    public function test_auth_users_keep_their_own_organization_ignoring_public_session(): void
    {
        $orgA = $this->createOrganization('org-a');
        $this->createOrganization('org-b');

        $user = User::factory()->create([
            'organization_id' => $orgA->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->withSession(['public_active_org_id' => 999])
            ->get('/login')
            ->assertRedirect();

        $this->assertSame((int) $orgA->id, app(ActiveOrgResolver::class)
            ->resolveForUser($user));
    }
}
