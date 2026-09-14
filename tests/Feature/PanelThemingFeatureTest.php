<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Services\AppearanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PanelThemingFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_panel_defaults_return_expected_shape(): void
    {
        $service = app(AppearanceService::class);
        $defaults = $service->panelDefaults();

        $this->assertArrayHasKey('primary_color', $defaults);
        $this->assertArrayHasKey('accent_color', $defaults);
        $this->assertArrayHasKey('font_family', $defaults);
        $this->assertArrayHasKey('density', $defaults);
        $this->assertArrayHasKey('show_logo', $defaults);
        $this->assertSame('normal', $defaults['density']);
    }

    public function test_normalize_panel_rejects_invalid_hex_colors(): void
    {
        $service = app(AppearanceService::class);

        $normalized = $service->normalizePanel(['primary_color' => 'not-a-color', 'accent_color' => '#123']);

        $this->assertSame('#2563EB', $normalized['primary_color']);
        $this->assertSame('#10B981', $normalized['accent_color']);
    }

    public function test_normalize_panel_rejects_invalid_font_and_density(): void
    {
        $service = app(AppearanceService::class);

        $normalized = $service->normalizePanel(['font_family' => 'Comic Sans', 'density' => 'extra']);

        $this->assertSame('Instrument Sans', $normalized['font_family']);
        $this->assertSame('normal', $normalized['density']);
    }

    public function test_panel_css_variables_returns_all_expected_vars(): void
    {
        $service = app(AppearanceService::class);
        $vars = $service->panelCssVariables([
            'primary_color' => '#ff0000',
            'accent_color' => '#00ff00',
            'font_family' => 'Inter',
            'density' => 'compact',
            'show_logo' => true,
        ]);

        $this->assertSame('#ff0000', $vars['--primary']);
        $this->assertSame('#ff0000', $vars['--ring']);
        $this->assertSame('#00ff00', $vars['--accent']);
        $this->assertArrayHasKey('--font-sans', $vars);
        $this->assertSame('14px', $vars['--font-size']);
        $this->assertSame('0.2rem', $vars['--spacing']);
    }

    public function test_admin_can_update_panel_appearance(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createUser($organization, 'admin');

        $response = $this->actingAs($admin)->patchJson('/settings/themes/appearance', [
            'primary_color' => '#ff5733',
            'accent_color' => '#33ff57',
            'font_family' => 'Poppins',
            'density' => 'compact',
            'show_logo' => false,
        ]);

        $response->assertRedirect();
        $organization->refresh();

        $this->assertSame('#ff5733', $organization->settings['panel_appearance']['primary_color']);
        $this->assertSame('#33ff57', $organization->settings['panel_appearance']['accent_color']);
        $this->assertSame('Poppins', $organization->settings['panel_appearance']['font_family']);
        $this->assertSame('compact', $organization->settings['panel_appearance']['density']);
        $this->assertFalse($organization->settings['panel_appearance']['show_logo']);
    }

    public function test_panel_appearance_is_shared_via_inertia(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createUser($organization, 'admin');

        $organization->update([
            'settings' => [
                'panel_appearance' => [
                    'primary_color' => '#123456',
                    'accent_color' => '#654321',
                    'font_family' => 'Inter',
                    'density' => 'comfortable',
                    'show_logo' => true,
                ],
            ],
        ]);

        $this->actingAs($admin)->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('panelAppearance'));
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
            'name' => 'Theming Test School',
            'slug' => 'theming-test-school-'.uniqid(),
            'email' => 'admin@theming.test',
            'phone' => '9999999999',
            'address' => 'Test Road',
            'city' => 'Mumbai',
            'state' => 'Maharashtra',
            'country' => 'India',
            'pincode' => '400001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);
    }
}