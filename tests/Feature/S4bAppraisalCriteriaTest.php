<?php

namespace Tests\Feature;

use App\Models\AppraisalCriteria;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class S4bAppraisalCriteriaTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_appraisal_criteria_page(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->get('/staff/appraisal-criteria')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/AppraisalCriteria')
                ->where('criteria', fn ($criteria) => count($criteria) === 0));
    }

    public function test_admin_can_add_appraisal_criterion(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->post('/staff/appraisal-criteria', [
                'title' => 'Classroom Management',
                'description' => 'Keeps the class engaged and well organised.',
                'weight' => 4,
                'status' => 'active',
            ])
            ->assertSessionDoesntHaveErrors();

        $criterion = AppraisalCriteria::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($criterion);
        $this->assertSame('Classroom Management', $criterion->title);
        $this->assertSame(4, $criterion->weight);
        $this->assertSame('active', $criterion->status);
    }

    public function test_admin_can_update_appraisal_criterion(): void
    {
        [$organization, $admin] = $this->seedRole();
        $criterion = AppraisalCriteria::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Lesson Delivery',
            'description' => null,
            'weight' => 3,
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->put("/staff/appraisal-criteria/{$criterion->id}", [
                'title' => 'Lesson Delivery Quality',
                'description' => 'Clear and structured delivery.',
                'weight' => 5,
                'status' => 'inactive',
            ])
            ->assertSessionDoesntHaveErrors();

        $criterion->refresh();
        $this->assertSame('Lesson Delivery Quality', $criterion->title);
        $this->assertSame(5, $criterion->weight);
        $this->assertSame('inactive', $criterion->status);
    }

    public function test_admin_can_delete_appraisal_criterion(): void
    {
        [$organization, $admin] = $this->seedRole();
        $criterion = AppraisalCriteria::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Punctuality',
            'description' => null,
            'weight' => 2,
            'status' => 'active',
        ]);

        $this->actingAs($admin)->delete("/staff/appraisal-criteria/{$criterion->id}");

        $this->assertDatabaseMissing('appraisal_criteria', ['id' => $criterion->id]);
    }

    public function test_user_cannot_delete_criterion_from_another_organization(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $other = $this->createOrganization();
        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
        $foreign = AppraisalCriteria::query()->create([
            'organization_id' => $other->id,
            'title' => 'Foreign Criterion',
            'description' => null,
            'weight' => 1,
            'status' => 'active',
        ]);

        $this->actingAs($admin)->delete("/staff/appraisal-criteria/{$foreign->id}")->assertNotFound();

        $this->assertDatabaseHas('appraisal_criteria', ['id' => $foreign->id]);
    }

    public function test_teacher_is_forbidden_from_appraisal_criteria_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)->get('/staff/appraisal-criteria')->assertForbidden();
    }

    public function test_staff_roles_can_view_complaints_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
        $receptionist = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'receptionist',
            'status' => 'active',
        ]);
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($admin)->get('/complains')->assertOk();
        $this->actingAs($receptionist)->get('/complains')->assertOk();
        $this->actingAs($teacher)->get('/complains')->assertOk();
    }

    private function seedRole(): array
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        return [$organization, $admin];
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'S4b Appraisal School '.$counter,
            'slug' => 's4b-appraisal-school-'.$counter,
            'email' => 's4b-appraisal-org'.$counter.'@example.com',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Nagpur',
            'state' => 'Maharashtra',
            'country' => 'India',
            'pincode' => '440001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
        ]);
    }
}