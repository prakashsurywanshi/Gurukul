<?php

namespace Tests\Feature;

use App\Models\CocurricularArea;
use App\Models\CocurricularGrade;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CocurricularFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_cocurricular_page_with_areas_and_grades(): void
    {
        [$organization, $admin] = $this->seedRole();
        CocurricularArea::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Sports',
            'is_active' => true,
            'sort_order' => 1,
        ]);
        CocurricularGrade::query()->create([
            'organization_id' => $organization->id,
            'name' => 'A',
            'min_percentage' => 80,
            'max_percentage' => 100,
            'sort_order' => 1,
        ]);

        $this->actingAs($admin)
            ->get('/cocurricular')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Cocurricular')
                ->has('areas', 1)
                ->has('grades', 1)
                ->where('areas.0.name', 'Sports'));
    }

    public function test_admin_can_create_update_delete_area(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)->post('/cocurricular/areas', [
            'name' => 'Cultural Club',
            'description' => 'Music, dance and art.',
            'is_active' => true,
            'sort_order' => 2,
        ])->assertSessionDoesntHaveErrors();

        $area = CocurricularArea::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($area);
        $this->assertSame('Cultural Club', $area->name);

        $this->actingAs($admin)->put("/cocurricular/areas/{$area->id}", [
            'name' => 'Drama Club',
            'description' => 'Plays and theatre.',
            'is_active' => false,
            'sort_order' => 3,
        ])->assertSessionDoesntHaveErrors();

        $area->refresh();
        $this->assertSame('Drama Club', $area->name);
        $this->assertFalse((bool) $area->is_active);

        $this->actingAs($admin)->delete("/cocurricular/areas/{$area->id}");
        $this->assertDatabaseMissing('cocurricular_areas', ['id' => $area->id]);
    }

    public function test_admin_can_create_update_delete_grade(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)->post('/cocurricular/grades', [
            'name' => 'B',
            'min_percentage' => 60,
            'max_percentage' => 79,
            'sort_order' => 2,
        ])->assertSessionDoesntHaveErrors();

        $grade = CocurricularGrade::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($grade);
        $this->assertSame('B', $grade->name);

        $this->actingAs($admin)->put("/cocurricular/grades/{$grade->id}", [
            'name' => 'B+',
            'min_percentage' => 65,
            'max_percentage' => 79,
            'sort_order' => 2,
        ])->assertSessionDoesntHaveErrors();

        $grade->refresh();
        $this->assertSame('B+', $grade->name);
        $this->assertSame(65.0, (float) $grade->min_percentage);

        $this->actingAs($admin)->delete("/cocurricular/grades/{$grade->id}");
        $this->assertDatabaseMissing('cocurricular_grades', ['id' => $grade->id]);
    }

    public function test_area_name_is_unique_per_organization(): void
    {
        [$organization, $admin] = $this->seedRole();
        CocurricularArea::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Sports',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->actingAs($admin)->post('/cocurricular/areas', [
            'name' => 'Sports',
            'is_active' => true,
        ])->assertSessionHasErrors('name');
    }

    public function test_cannot_modify_area_from_another_organization(): void
    {
        [$organization, $admin] = $this->seedRole();
        $other = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($other);
        $foreign = CocurricularArea::query()->create([
            'organization_id' => $other->id,
            'name' => 'Foreign Area',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->actingAs($admin)->put("/cocurricular/areas/{$foreign->id}", [
            'name' => 'Hacked',
            'is_active' => true,
        ])->assertNotFound();
        $this->actingAs($admin)->delete("/cocurricular/areas/{$foreign->id}")->assertNotFound();

        $this->assertDatabaseHas('cocurricular_areas', ['id' => $foreign->id, 'name' => 'Foreign Area']);
    }

    public function test_driver_cannot_access_cocurricular_surfaces(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $driver = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'driver',
            'status' => 'active',
        ]);

        $this->actingAs($driver)->get('/cocurricular')->assertForbidden();
        $this->actingAs($driver)->post('/cocurricular/areas', [
            'name' => 'Sneaky',
            'is_active' => true,
        ])->assertForbidden();
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
            'name' => 'Cocurricular School '.$counter,
            'slug' => 'cocurricular-school-'.$counter,
            'email' => 'cocurricular-org'.$counter.'@example.com',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Nasik',
            'state' => 'Maharashtra',
            'country' => 'India',
            'pincode' => '422001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);
    }
}