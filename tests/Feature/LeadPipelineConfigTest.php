<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\LeadPipelineStage;
use App\Models\LeadSource;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadPipelineConfigTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_pipeline_config_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/leads/sources-stages')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/LeadSourcesStages')
                ->has('defaultSources', count(Lead::SOURCES))
                ->has('defaultStages', count(Lead::STATUSES))
                ->has('sources')
                ->has('stages')
            );
    }

    public function test_admin_can_add_custom_source(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/leads/sources-stages/sources', [
                'name' => 'counselling-camp',
                'label' => 'Counselling Camp',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('lead_sources', [
            'organization_id' => $organization->id,
            'name' => 'counselling-camp',
            'is_system' => false,
            'status' => true,
        ]);
    }

    public function test_custom_source_is_available_in_lead_form_validation(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        LeadSource::query()->create([
            'organization_id' => $organization->id,
            'name' => 'counselling-camp',
            'status' => true,
        ]);

        $this->actingAs($admin)
            ->post('/leads', [
                'student_name' => 'Arjun',
                'phone' => '9876543210',
                'source' => 'counselling-camp',
                'status' => 'new',
                'priority' => 'low',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('leads', [
            'organization_id' => $organization->id,
            'student_name' => 'Arjun',
            'source' => 'counselling-camp',
        ]);
    }

    public function test_admin_can_add_and_use_custom_stage(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $lead = Lead::query()->create([
            'organization_id' => $organization->id,
            'student_name' => 'Kavya',
            'phone' => '9876543201',
            'source' => 'walkin',
            'status' => 'new',
            'priority' => 'medium',
            'created_by' => $admin->id,
        ]);

        LeadPipelineStage::query()->create([
            'organization_id' => $organization->id,
            'name' => 'meeting-scheduled',
            'status' => true,
        ]);

        $this->actingAs($admin)
            ->patch("/leads/{$lead->id}/status", ['status' => 'meeting-scheduled'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('meeting-scheduled', $lead->fresh()->status);
    }

    public function test_duplicate_option_name_is_rejected(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        LeadSource::query()->create([
            'organization_id' => $organization->id,
            'name' => 'counselling-camp',
            'status' => true,
        ]);

        $this->actingAs($admin)
            ->post('/leads/sources-stages/sources', ['name' => 'counselling-camp'])
            ->assertRedirect()
            ->assertSessionHasErrors('name');
    }

    public function test_admin_can_delete_custom_option(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $source = LeadSource::query()->create([
            'organization_id' => $organization->id,
            'name' => 'counselling-camp',
            'status' => true,
        ]);

        $this->actingAs($admin)
            ->delete("/leads/sources-stages/sources/{$source->id}")
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('lead_sources', ['id' => $source->id]);
    }

    public function test_teacher_can_view_but_not_manage_pipeline_config(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($teacher)
            ->get('/leads/sources-stages')
            ->assertOk();

        $this->actingAs($teacher)
            ->post('/leads/sources-stages/sources', ['name' => 'camp'])
            ->assertForbidden();
    }

    public function test_option_from_another_organization_is_not_accessible(): void
    {
        $organization = $this->createOrganization(slug: 'a', email: 'a@gurukul.test');
        $other = $this->createOrganization(slug: 'b', email: 'b@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($other);

        $admin = $this->createUser($organization, 'admin');
        $source = LeadSource::query()->create([
            'organization_id' => $other->id,
            'name' => 'other-camp',
            'status' => true,
        ]);

        $this->actingAs($admin)
            ->patch("/leads/sources-stages/sources/{$source->id}", ['label' => 'X'])
            ->assertNotFound();

        $this->assertDatabaseHas('lead_sources', [
            'id' => $source->id,
            'label' => null,
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
        ]);
    }
}