<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Designation;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartmentsDesignationsFeatureTest extends TestCase
{
    use RefreshDatabase;

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
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ], $attributes));
    }

    private function createUser(Organization $organization, string $role = 'admin'): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    private function createDriver(Organization $organization): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'driver',
        ]);
    }

    public function test_departments_page_lists_organization_departments(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createUser($organization);
        $science = Department::query()->create(['organization_id' => $organization->id, 'name' => 'Science']);

        $response = $this->actingAs($admin)->get('/staff/departments');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('dashboard/Departments')
            ->has('departments', 1)
            ->where('departments.0.name', 'Science')
            ->has('departments.0.users_count'));
    }

    public function test_departments_do_not_leak_across_organizations(): void
    {
        $organization = $this->createOrganization();
        $other = $this->createOrganization(['slug' => 'second-org', 'email' => 'second@gurukul.test']);
        Department::query()->create(['organization_id' => $other->id, 'name' => 'Other Org Dept']);
        $admin = $this->createUser($organization);

        $response = $this->actingAs($admin)->get('/staff/departments');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('dashboard/Departments')->has('departments', 0));
    }

    public function test_department_crud_roundtrip(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createUser($organization);

        $this->actingAs($admin)->post('/staff/departments', ['name' => 'Mathematics']);
        $this->assertDatabaseHas('departments', ['name' => 'Mathematics', 'organization_id' => $organization->id]);

        $department = Department::where('organization_id', $organization->id)->firstOrFail();
        $this->actingAs($admin)->put("/staff/departments/{$department->id}", ['name' => 'Maths']);
        $this->assertDatabaseHas('departments', ['name' => 'Maths', 'organization_id' => $organization->id]);

        $this->actingAs($admin)->delete("/staff/departments/{$department->id}");
        $this->assertDatabaseMissing('departments', ['name' => 'Maths', 'organization_id' => $organization->id]);
    }

    public function test_cannot_modify_department_from_another_organization(): void
    {
        $organization = $this->createOrganization();
        $other = $this->createOrganization(['slug' => 'second-org', 'email' => 'second@gurukul.test']);
        $admin = $this->createUser($organization);
        $foreign = Department::query()->create(['organization_id' => $other->id, 'name' => 'Foreign']);

        $this->actingAs($admin)->put("/staff/departments/{$foreign->id}", ['name' => 'Hacked'])->assertForbidden();
        $this->actingAs($admin)->delete("/staff/departments/{$foreign->id}")->assertForbidden();
        $this->assertDatabaseHas('departments', ['name' => 'Foreign']);
    }

    public function test_designations_page_lists_organization_designations(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createUser($organization);
        Designation::query()->create(['organization_id' => $organization->id, 'name' => 'Principal']);

        $response = $this->actingAs($admin)->get('/staff/designations');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('dashboard/Designations')
            ->has('designations', 1)
            ->where('designations.0.name', 'Principal'));
    }

    public function test_designations_do_not_leak_across_organizations(): void
    {
        $organization = $this->createOrganization();
        $other = $this->createOrganization(['slug' => 'second-org', 'email' => 'second@gurukul.test']);
        Designation::query()->create(['organization_id' => $other->id, 'name' => 'Other Org Designation']);
        $admin = $this->createUser($organization);

        $response = $this->actingAs($admin)->get('/staff/designations');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('dashboard/Designations')->has('designations', 0));
    }

    public function test_designation_crud_roundtrip(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createUser($organization);

        $this->actingAs($admin)->post('/staff/designations', ['name' => 'HOD']);
        $this->assertDatabaseHas('designations', ['name' => 'HOD', 'organization_id' => $organization->id]);

        $designation = Designation::where('organization_id', $organization->id)->firstOrFail();
        $this->actingAs($admin)->put("/staff/designations/{$designation->id}", ['name' => 'Head of Department']);
        $this->assertDatabaseHas('designations', ['name' => 'Head of Department', 'organization_id' => $organization->id]);

        $this->actingAs($admin)->delete("/staff/designations/{$designation->id}");
        $this->assertDatabaseMissing('designations', ['name' => 'Head of Department', 'organization_id' => $organization->id]);
    }

    public function test_cannot_modify_designation_from_another_organization(): void
    {
        $organization = $this->createOrganization();
        $other = $this->createOrganization(['slug' => 'second-org', 'email' => 'second@gurukul.test']);
        $admin = $this->createUser($organization);
        $foreign = Designation::query()->create(['organization_id' => $other->id, 'name' => 'Foreign']);

        $this->actingAs($admin)->put("/staff/designations/{$foreign->id}", ['name' => 'Hacked'])->assertForbidden();
        $this->actingAs($admin)->delete("/staff/designations/{$foreign->id}")->assertForbidden();
        $this->assertDatabaseHas('designations', ['name' => 'Foreign']);
    }

    public function test_driver_cannot_access_standalone_department_designation_pages(): void
    {
        $organization = $this->createOrganization();
        $driver = $this->createDriver($organization);

        $this->actingAs($driver)->get('/staff/departments')->assertForbidden();
        $this->actingAs($driver)->get('/staff/designations')->assertForbidden();
        $this->actingAs($driver)->post('/staff/departments', ['name' => 'X'])->assertForbidden();
        $this->actingAs($driver)->post('/staff/designations', ['name' => 'X'])->assertForbidden();
    }
}