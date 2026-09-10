<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadPipelineTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_move_lead_between_stages(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $lead = Lead::query()->create([
            'organization_id' => $organization->id,
            'student_name' => 'Aarav Sharma',
            'phone' => '9876543210',
            'source' => 'walkin',
            'status' => 'new',
            'priority' => 'medium',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->patch("/leads/{$lead->id}/status", ['status' => 'interested'])
            ->assertRedirect();

        $this->assertSame('interested', $lead->fresh()->status);
    }

    public function test_invalid_stage_is_rejected(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $lead = Lead::query()->create([
            'organization_id' => $organization->id,
            'student_name' => 'Priya Nair',
            'phone' => '9988776655',
            'source' => 'website',
            'status' => 'contacted',
            'priority' => 'high',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->patch("/leads/{$lead->id}/status", ['status' => 'not-a-stage'])
            ->assertSessionHasErrors('status');

        $this->assertSame('contacted', $lead->fresh()->status);
    }

    public function test_lead_transition_is_scoped_to_organization(): void
    {
        $organizationA = $this->createOrganization();
        $organizationB = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organizationA);
        app(StaffPermissionService::class)->ensureRolesExist($organizationB);
        $adminA = $this->createUser($organizationA, 'admin');

        $leadB = Lead::query()->create([
            'organization_id' => $organizationB->id,
            'student_name' => 'Other School',
            'phone' => '9111222333',
            'source' => 'referral',
            'status' => 'new',
            'priority' => 'low',
        ]);

        $this->actingAs($adminA)
            ->patch("/leads/{$leadB->id}/status", ['status' => 'closed'])
            ->assertNotFound();

        $this->assertSame('new', $leadB->fresh()->status);
    }

    public function test_lead_transition_requires_permission(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = $this->createUser($organization, 'teacher');

        $lead = Lead::query()->create([
            'organization_id' => $organization->id,
            'student_name' => 'No Access',
            'phone' => '9000000000',
            'source' => 'call',
            'status' => 'new',
            'priority' => 'medium',
        ]);

        $this->actingAs($teacher)
            ->patch("/leads/{$lead->id}/status", ['status' => 'interested'])
            ->assertForbidden();

        $this->assertSame('new', $lead->fresh()->status);
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'Leads Pipeline School '.$counter,
            'slug' => 'leads-pipeline-school-'.$counter,
            'email' => 'leads-pipeline-org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' User',
            'email' => 'lead-'.$role.'-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}