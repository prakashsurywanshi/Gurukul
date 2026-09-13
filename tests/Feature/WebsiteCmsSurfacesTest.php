<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Models\WebsiteSetting;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class WebsiteCmsSurfacesTest extends TestCase
{
    use RefreshDatabase;

    public function test_website_cms_page_loads_with_content(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/website-cms')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/WebsiteCms'));
    }

    public function test_hero_slide_upload_persists_and_returns_updated_slider(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $response = $this->actingAs($admin)->post('/website-cms/slider-images', [
            'slider_image' => UploadedFile::fake()->image('slide.jpg', 800, 400),
        ]);

        $response->assertOk();
        $sliderImages = $response->json('sliderImages');

        $this->assertCount(1, $sliderImages);
        $this->assertStringStartsWith('/storage/website-slider-images/', $sliderImages[0]);

        $published = WebsiteSetting::query()
            ->where('organization_id', $organization->id)
            ->where('key', 'sliderImages')
            ->first();

        $this->assertNotNull($published);
    }

    public function test_hero_slide_destroy_removes_slide_from_content(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)->post('/website-cms/slider-images', [
            'slider_image' => UploadedFile::fake()->image('slide.jpg', 800, 400),
        ]);

        $response = $this->actingAs($admin)->delete('/website-cms/slider-images/0');

        $response->assertOk();
        $this->assertCount(0, $response->json('sliderImages'));

        $stored = WebsiteSetting::query()
            ->where('organization_id', $organization->id)
            ->where('key', 'sliderImages')
            ->value('value');

        $this->assertEquals([], json_decode((string) $stored, true));
    }

    public function test_testimonials_and_navigation_labels_persist_through_update(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)->patch('/website-cms', [
            'activeTemplate' => 'template1',
            'theme' => 'white',
            'shared' => [
                'navAbout' => 'Our Academy',
                'navPrograms' => 'Programs',
                'loginLabel' => 'Staff Login',
            ],
            'testimonials' => [
                ['quote' => 'A truly transformative school experience.', 'author' => 'Priya Sharma', 'role' => 'Parent'],
            ],
        ])->assertRedirect(route('website-cms'));

        $this->assertEquals('Our Academy', $this->settingValue($organization, 'navAbout', 'shared'));
        $this->assertEquals('Staff Login', $this->settingValue($organization, 'loginLabel', 'shared'));

        $testimonials = json_decode(
            (string) WebsiteSetting::query()
                ->where('organization_id', $organization->id)
                ->where('key', 'testimonials')
                ->value('value'),
            true
        );

        $this->assertCount(1, $testimonials);
        $this->assertEquals('Priya Sharma', $testimonials[0]['author']);

        $this->actingAs($admin)
            ->get('/website-cms')
            ->assertInertia(fn ($page) => $page
                ->where('websiteContent.shared.navAbout', 'Our Academy')
                ->where('websiteContent.testimonials.0.author', 'Priya Sharma')
            );
    }

    public function test_driver_cannot_access_website_cms_surfaces(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $driver = $this->createUser($organization, 'driver');

        $this->actingAs($driver)->get('/website-cms')->assertForbidden();
        $this->actingAs($driver)->patch('/website-cms', [
            'activeTemplate' => 'template1',
            'theme' => 'white',
        ])->assertForbidden();
        $this->actingAs($driver)->post('/website-cms/slider-images', [
            'slider_image' => UploadedFile::fake()->image('slide.jpg'),
        ])->assertForbidden();
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

    private function settingValue(Organization $organization, string $key, string $group): ?string
    {
        return WebsiteSetting::query()
            ->where('organization_id', $organization->id)
            ->where('key', $key)
            ->where('group', $group)
            ->value('value');
    }
}