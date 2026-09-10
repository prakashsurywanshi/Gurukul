<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Student;
use App\Models\StudentCategory;
use App\Models\StudentHouse;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HousesCategoriesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_houses_and_categories_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $house = StudentHouse::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Blue House',
            'color' => '#3b82f6',
        ]);
        StudentCategory::query()->create([
            'organization_id' => $organization->id,
            'name' => 'RTE',
        ]);

        $this->actingAs($admin)
            ->get('/houses-categories')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/HousesCategories')
                ->has('houses', 1)
                ->where('houses.0.name', 'Blue House')
                ->where('houses.0.color', '#3b82f6')
                ->has('categories', 1)
                ->where('categories.0.name', 'RTE')
            );
    }

    public function test_admin_can_add_house_with_student_count(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $student = $this->createStudent($organization);
        $student->update(['house' => 'Red House']);

        $this->actingAs($admin)
            ->post('/houses-categories/houses', [
                'name' => 'Red House',
                'color' => '#ef4444',
                'description' => 'Leadership house.',
                'status' => 'active',
                'sort_order' => 1,
            ])
            ->assertRedirect();

        $house = StudentHouse::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($house);
        $this->assertSame('Red House', $house->name);
        $this->assertSame('#ef4444', $house->color);

        $this->actingAs($admin)
            ->get('/houses-categories')
            ->assertInertia(fn ($page) => $page
                ->where('houses.0.studentCount', 1)
            );
    }

    public function test_house_name_must_be_unique_per_organization(): void
    {
        $organization = $this->createOrganization();
        $other = $this->createOrganization('other-school', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($other);

        StudentHouse::query()->create(['organization_id' => $organization->id, 'name' => 'Blue House', 'color' => '#3b82f6']);

        $admin = $this->createUser($organization, 'admin');
        $otherAdmin = $this->createUser($other, 'admin');

        $this->actingAs($admin)
            ->post('/houses-categories/houses', ['name' => 'Blue House', 'color' => '#22c55e'])
            ->assertSessionHasErrors('name');

        $this->actingAs($otherAdmin)->get('/houses-categories')->assertOk();

        $otherAdmin->organization_id = $organization->id;
        $otherAdmin->save();
    }

    public function test_admin_can_update_house_and_migrate_assigned_students(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $student = $this->createStudent($organization);
        $house = StudentHouse::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Blue House',
            'color' => '#3b82f6',
        ]);
        $student->update(['house' => 'Blue House']);

        $this->actingAs($admin)
            ->put("/houses-categories/houses/{$house->id}", [
                'name' => 'Azure House',
                'color' => '#06b6d4',
                'status' => 'active',
                'sort_order' => 2,
            ])
            ->assertRedirect();

        $this->assertSame('Azure House', $house->fresh()->name);
        $this->assertSame('Azure House', $student->fresh()->house);
    }

    public function test_cross_organization_house_returns_404(): void
    {
        $organization = $this->createOrganization();
        $other = $this->createOrganization('other-school', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($other);

        $house = StudentHouse::query()->create(['organization_id' => $organization->id, 'name' => 'Blue House', 'color' => '#3b82f6']);
        $otherAdmin = $this->createUser($other, 'admin');

        $this->actingAs($otherAdmin)
            ->put("/houses-categories/houses/{$house->id}", ['name' => 'X', 'color' => '#000000', 'status' => 'active'])
            ->assertNotFound();
    }

    public function test_admin_can_delete_house(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $house = StudentHouse::query()->create(['organization_id' => $organization->id, 'name' => 'Blue House', 'color' => '#3b82f6']);

        $this->actingAs($admin)
            ->delete("/houses-categories/houses/{$house->id}")
            ->assertRedirect();

        $this->assertNull(StudentHouse::find($house->id));
    }

    public function test_admin_can_add_and_update_category(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $student = $this->createStudent($organization);

        $this->actingAs($admin)
            ->post('/houses-categories/categories', [
                'name' => 'RTE',
                'description' => 'Right to Education quota.',
                'status' => 'active',
                'sort_order' => 1,
            ])
            ->assertRedirect();

        $category = StudentCategory::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($category);
        $this->assertSame('RTE', $category->name);

        $student->update(['category' => 'RTE']);

        $this->actingAs($admin)
            ->put("/houses-categories/categories/{$category->id}", [
                'name' => 'RTE General',
                'status' => 'active',
                'sort_order' => 1,
            ])
            ->assertRedirect();

        $this->assertSame('RTE General', $category->fresh()->name);
        $this->assertSame('RTE General', $student->fresh()->category);
    }

    public function test_admin_can_delete_category(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $category = StudentCategory::query()->create(['organization_id' => $organization->id, 'name' => 'General']);

        $this->actingAs($admin)
            ->delete("/houses-categories/categories/{$category->id}")
            ->assertRedirect();

        $this->assertNull(StudentCategory::find($category->id));
    }

    public function test_non_authorized_role_blocked_from_writes(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($teacher)
            ->post('/houses-categories/houses', ['name' => 'Red House', 'color' => '#ef4444'])
            ->assertForbidden();
    }

    private function createStudent(Organization $organization): Student
    {
        return Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => 'ADM-1001',
            'roll_number' => '5',
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => '9876543210',
            'status' => 'active',
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
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);
    }
}