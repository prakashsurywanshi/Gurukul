<?php

namespace Tests\Feature;

use App\Models\ExamType;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamTypeTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_exam_types_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        ExamType::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Theory',
            'code' => 'TH',
            'sort_order' => 1,
        ]);

        $this->actingAs($admin)
            ->get('/exam-types')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ExamTypes')
                ->has('examTypes', 1)
                ->where('examTypes.0.name', 'Theory')
                ->where('examTypes.0.code', 'TH')
            );
    }

    public function test_receptionist_cannot_view_exam_types(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->get('/exam-types')
            ->assertForbidden();
    }

    public function test_admin_can_add_exam_type(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/exam-types', [
                'name' => 'Practical',
                'code' => 'PR',
                'sort_order' => 2,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('exam_types', [
            'organization_id' => $organization->id,
            'name' => 'Practical',
            'code' => 'PR',
        ]);
    }

    public function test_exam_type_name_is_required(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/exam-types', ['name' => ''])
            ->assertSessionHasErrors('name');

        $this->assertDatabaseCount('exam_types', 0);
    }

    public function test_admin_can_update_exam_type(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $type = ExamType::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Note Book',
            'code' => 'NB',
        ]);

        $this->actingAs($admin)
            ->patch("/exam-types/{$type->id}", [
                'name' => 'Notebook',
                'code' => 'NBK',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('exam_types', [
            'id' => $type->id,
            'name' => 'Notebook',
            'code' => 'NBK',
        ]);
    }

    public function test_admin_can_delete_exam_type(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $type = ExamType::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Pre Term 1',
            'code' => 'PT1',
        ]);

        $this->actingAs($admin)
            ->delete("/exam-types/{$type->id}")
            ->assertRedirect();

        $this->assertDatabaseCount('exam_types', 0);
    }

    public function test_cannot_update_exam_type_from_another_organization(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $otherOrganization = $this->createOrganization('sister-school', 'sister@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $otherType = ExamType::query()->create([
            'organization_id' => $otherOrganization->id,
            'name' => 'Theory',
            'code' => 'TH',
        ]);

        $this->actingAs($admin)
            ->patch("/exam-types/{$otherType->id}", ['name' => 'Hijacked'])
            ->assertNotFound();

        $this->assertSame('Theory', $otherType->fresh()->name);
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