<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class FaceSearchKioskFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_kiosk_page_loads_for_admin(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/face-search/kiosk')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/FaceSearchKiosk')
                ->where('configured', false)
            );
    }

    public function test_kiosk_requires_photos(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/face-search/kiosk', [])
            ->assertSessionHasErrors('photos');
    }

    public function test_kiosk_returns_graceful_unconfigured_error(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $photo = UploadedFile::fake()->image('student.jpg', 320, 240);

        $this->actingAs($admin)
            ->post('/face-search/kiosk', ['photos' => [$photo]])
            ->assertRedirect()
            ->assertSessionDoesntHaveErrors()
            ->assertSessionHas('error');
    }

    public function test_kiosk_limits_photo_count(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $photos = collect(range(1, 6))
            ->map(fn (int $i) => UploadedFile::fake()->image("p{$i}.jpg", 100, 100))
            ->all();

        $this->actingAs($admin)
            ->post('/face-search/kiosk', ['photos' => $photos])
            ->assertSessionHasErrors('photos');
    }

    public function test_kiosk_requires_search_students_permission(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $driver = $this->createUser($organization, 'driver');

        $this->actingAs($driver)->get('/face-search/kiosk')->assertForbidden();
    }

    private function createUser(Organization $organization, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    private function createOrganization(): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school-'.uniqid(),
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
        ]);
    }
}