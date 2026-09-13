<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IdCardDesignFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_id_card_page_exposes_default_design(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/certificates/student-id-card')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StudentIdCardManagement')
                ->where('design.layout', 'landscape')
                ->where('design.primary_color', '#1d4ed8')
                ->where('design.show_qr', true)
            );
    }

    public function test_staff_id_card_page_exposes_design(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/staff/id-cards')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StaffIdCards')
                ->where('design.layout', 'landscape')
            );
    }

    public function test_admin_can_persist_custom_design_and_it_round_trips(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->from('/id-cards/designs')
            ->patch('/id-cards/designs', [
                'layout' => 'portrait',
                'primary_color' => '#0f766e',
                'show_photo' => true,
                'show_admission_no' => false,
                'show_qr' => true,
                'show_guardian' => false,
                'show_blood_group' => true,
                'show_dob' => false,
            ])
            ->assertRedirect('/id-cards/designs');

        $stored = $organization->fresh()->settings['id_card_design'];
        $this->assertSame('portrait', $stored['layout']);
        $this->assertSame('#0f766e', $stored['primary_color']);
        $this->assertFalse($stored['show_admission_no']);
        $this->assertTrue($stored['show_blood_group']);
        $this->assertFalse($stored['show_dob']);

        $this->actingAs($admin)
            ->get('/id-cards/designs')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/CardDesigns')
                ->where('design.layout', 'portrait')
                ->where('design.primary_color', '#0f766e')
                ->where('design.show_admission_no', false)
            );

        $this->actingAs($admin)
            ->get('/certificates/student-id-card')
            ->assertInertia(fn ($page) => $page
                ->where('design.layout', 'portrait')
                ->where('design.primary_color', '#0f766e')
            );
    }

    public function test_non_admin_cannot_access_design_settings(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($teacher)->get('/id-cards/designs')->assertForbidden();
        $this->actingAs($teacher)->patch('/id-cards/designs', ['layout' => 'portrait'])->assertForbidden();
    }

    public function test_invalid_layout_falls_back_to_landscape(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->patch('/id-cards/designs', [
                'layout' => 'diagonal',
                'primary_color' => '#ff0000',
            ])
            ->assertRedirect('/id-cards/designs');

        $stored = $organization->fresh()->settings['id_card_design'];
        $this->assertSame('landscape', $stored['layout']);
        $this->assertSame('#ff0000', $stored['primary_color']);
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'Design School '.$counter,
            'slug' => 'design-school-'.$counter,
            'email' => 'design-school-'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' Design User',
            'email' => $role.'-design-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}