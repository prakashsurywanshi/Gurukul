<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_leads_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/leads')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Leads')
                ->has('leads')
                ->has('statuses')
                ->has('sources')
                ->has('priorities')
                ->has('filters')
            );
    }

    public function test_admin_can_create_lead(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $staff = $this->createUser($organization, 'receptionist');

        $this->actingAs($admin)
            ->post('/leads', [
                'student_name' => 'Aarav Sharma',
                'parent_name' => 'Rahul Sharma',
                'phone' => '9876543210',
                'email' => 'aarav@example.com',
                'source' => 'walkin',
                'interested_class' => '6th Class',
                'academic_year' => '2026-2027',
                'status' => 'new',
                'priority' => 'high',
                'preferred_contact_time' => 'Evening after 6 PM',
                'follow_up_date' => '2026-09-15',
                'notes' => 'Visited campus with father.',
                'assigned_to' => $staff->id,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('leads', [
            'organization_id' => $organization->id,
            'student_name' => 'Aarav Sharma',
            'phone' => '9876543210',
            'status' => 'new',
            'priority' => 'high',
            'assigned_to' => $staff->id,
            'created_by' => $admin->id,
        ]);
    }

    public function test_lead_phone_is_required(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/leads', [
                'student_name' => 'Aarav Sharma',
                'phone' => '',
                'source' => 'call',
                'status' => 'new',
                'priority' => 'medium',
            ])
            ->assertSessionHasErrors('phone');

        $this->assertDatabaseCount('leads', 0);
    }

    public function test_lead_cannot_be_assigned_to_staff_of_another_organization(): void
    {
        $organization = $this->createOrganization();
        $otherOrganization = $this->createOrganization('other-gurukul', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $otherStaff = $this->createUser($otherOrganization, 'teacher');

        $this->actingAs($admin)
            ->post('/leads', [
                'student_name' => 'Aarav Sharma',
                'phone' => '9876543210',
                'source' => 'walkin',
                'status' => 'new',
                'priority' => 'medium',
                'assigned_to' => $otherStaff->id,
            ])
            ->assertSessionHasErrors('assigned_to');

        $this->assertDatabaseCount('leads', 0);
    }

    public function test_admin_can_update_lead(): void
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
            ->patch("/leads/{$lead->id}", [
                'student_name' => 'Aarav Sharma',
                'parent_name' => 'Rahul Sharma',
                'phone' => '9876543210',
                'source' => 'referral',
                'status' => 'interested',
                'priority' => 'high',
                'follow_up_date' => '2026-09-20',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'source' => 'referral',
            'status' => 'interested',
            'priority' => 'high',
        ]);
    }

    public function test_admin_can_delete_lead(): void
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
            ->delete("/leads/{$lead->id}")
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('leads', ['id' => $lead->id]);
    }

    public function test_lead_from_another_organization_is_not_accessible(): void
    {
        $organization = $this->createOrganization();
        $otherOrganization = $this->createOrganization('other-gurukul', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $otherAdmin = $this->createUser($otherOrganization, 'admin');
        $otherLead = Lead::query()->create([
            'organization_id' => $otherOrganization->id,
            'student_name' => 'Ishaan Verma',
            'phone' => '9123456780',
            'source' => 'website',
            'status' => 'new',
            'priority' => 'low',
            'created_by' => $otherAdmin->id,
        ]);

        $this->actingAs($admin)
            ->patch("/leads/{$otherLead->id}", [
                'student_name' => 'Hijacked',
                'phone' => '1111111111',
                'source' => 'other',
                'status' => 'lost',
                'priority' => 'low',
            ])
            ->assertNotFound();

        $this->actingAs($admin)
            ->delete("/leads/{$otherLead->id}")
            ->assertNotFound();
    }

    public function test_teacher_can_view_leads(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($teacher)
            ->get('/leads')
            ->assertOk();
    }

    public function test_leads_can_be_filtered_by_status(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        Lead::query()->create([
            'organization_id' => $organization->id,
            'student_name' => 'Aarav Sharma',
            'phone' => '9876543210',
            'source' => 'walkin',
            'status' => 'new',
            'priority' => 'medium',
            'created_by' => $admin->id,
        ]);
        Lead::query()->create([
            'organization_id' => $organization->id,
            'student_name' => 'Ishaan Verma',
            'phone' => '9123456780',
            'source' => 'website',
            'status' => 'interested',
            'priority' => 'high',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/leads?status=new')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Leads')
                ->where('filters.status', 'new')
                ->has('leads', 1)
                ->where('leads.0.status', 'new')
            );
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