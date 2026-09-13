<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportCardAppearanceFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_card_page_exposes_default_appearance(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/exams/report-card')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ReportCard')
                ->where('appearance.primary_color', '#2563EB')
                ->where('appearance.accent_color', '#10B981')
                ->where('appearance.font_size', 'normal')
                ->where('appearance.show_logo', true)
                ->where('appearance.show_grades', true)
            );
    }

    public function test_admin_can_persist_report_card_appearance_and_it_round_trips(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->from('/exams/report-card')
            ->patch('/exams/report-card/appearance', [
                'primary_color' => '#4338CA',
                'accent_color' => '#0369A1',
                'font_size' => 'large',
                'show_logo' => true,
                'show_grades' => false,
            ])
            ->assertRedirect('/exams/report-card');

        $stored = $organization->fresh()->settings['report_card_appearance'];
        $this->assertSame('#4338CA', $stored['primary_color']);
        $this->assertSame('#0369A1', $stored['accent_color']);
        $this->assertSame('large', $stored['font_size']);
        $this->assertFalse($stored['show_grades']);

        $this->actingAs($admin)
            ->get('/exams/report-card')
            ->assertInertia(fn ($page) => $page
                ->where('appearance.primary_color', '#4338CA')
                ->where('appearance.font_size', 'large')
                ->where('appearance.show_grades', false)
            );
    }

    public function test_invalid_font_size_is_rejected(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->patch('/exams/report-card/appearance', [
                'primary_color' => '#123456',
                'font_size' => 'x-large',
            ])
            ->assertSessionHasErrors('font_size');

        $this->assertArrayNotHasKey(
            'report_card_appearance',
            $organization->fresh()->settings ?? [],
            'Invalid appearance payload should not be persisted.',
        );
    }

    public function test_non_privileged_role_cannot_save_appearance(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $driver = $this->createUser($organization, 'driver');

        $this->actingAs($driver)
            ->patch('/exams/report-card/appearance', ['primary_color' => '#000000'])
            ->assertForbidden();
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'Appearance School '.$counter,
            'slug' => 'appearance-school-'.$counter,
            'email' => 'appearance-school-'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' Appearance User',
            'email' => $role.'-appearance-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}