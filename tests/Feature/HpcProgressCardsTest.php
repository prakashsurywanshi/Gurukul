<?php

namespace Tests\Feature;

use App\Models\HpcActivity;
use App\Models\HpcCard;
use App\Models\HpcFramework;
use App\Models\HpcStudentCard;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HpcProgressCardsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_hpc_dashboard(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/hpc/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/HpcDashboard')
                ->where('stats.frameworks', 0)
                ->has('recentActivities', 0)
            );
    }

    public function test_admin_can_view_activities_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/hpc/activities')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/HpcActivities')
                ->has('activities', 0)
            );
    }

    public function test_admin_can_record_activity(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $student = $this->createStudent($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/hpc/activities', [
                'student_id' => $student->id,
                'category' => 'sports',
                'title' => 'Inter-school cricket tournament',
                'rating' => 4.5,
                'teacher_remark' => 'Excellent sportsmanship',
                'occurred_at' => '2026-08-10',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('hpc_activities', [
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'category' => 'sports',
            'title' => 'Inter-school cricket tournament',
        ]);
    }

    public function test_admin_can_view_cards_page_and_create_card(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/hpc/cards')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/HpcCards'));

        $this->actingAs($admin)
            ->post('/hpc/cards', [
                'name' => 'Term 1 Progress Card',
                'framework_id' => null,
                'card_type' => 'academic',
                'description' => 'Mid-year academic progress',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('hpc_cards', [
            'organization_id' => $organization->id,
            'name' => 'Term 1 Progress Card',
            'card_type' => 'academic',
        ]);
    }

    public function test_admin_can_view_frameworks_and_create_framework(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/hpc/frameworks')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/HpcFrameworks'));

        $this->actingAs($admin)
            ->post('/hpc/frameworks', [
                'name' => 'Holistic Framework',
                'description' => 'Holistic evaluation',
                'criteria' => ['Academics', 'Co-curricular', 'Discipline'],
                'is_default' => true,
            ])
            ->assertRedirect();

        $framework = HpcFramework::where('organization_id', $organization->id)->first();
        $this->assertNotNull($framework);
        $this->assertTrue($framework->is_default);
        $this->assertSame(['Academics', 'Co-curricular', 'Discipline'], $framework->criteria);
    }

    public function test_admin_can_view_and_save_card_appearance(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/hpc/card-appearance')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/HpcCardAppearance')
                ->where('settings.primary_color', '#2563EB')
            );

        $this->actingAs($admin)
            ->post('/hpc/card-appearance', [
                'primary_color' => '#FF5733',
                'accent_color' => '#33FF57',
                'font_size' => 'large',
                'show_logo' => true,
                'show_grades' => true,
            ])
            ->assertRedirect();

        $organization->refresh();
        $this->assertSame('#FF5733', $organization->settings['hpc_appearance']['primary_color']);
        $this->assertSame('large', $organization->settings['hpc_appearance']['font_size']);
    }

    public function test_teacher_has_access_but_student_does_not(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $teacher = $this->createUser($organization, 'teacher');
        $student = $this->createUser($organization, 'student');

        $this->actingAs($teacher)
            ->get('/hpc/dashboard')
            ->assertOk();

        $this->actingAs($student)
            ->get('/hpc/dashboard')
            ->assertForbidden();
    }

    private function createStudent(Organization $organization): Student
    {
        return Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => 'ADM-HPC-1',
            'roll_number' => '1',
            'first_name' => 'Ananya',
            'last_name' => 'Sharma',
            'date_of_birth' => '2011-05-20',
            'gender' => 'female',
            'admission_date' => '2026-04-10',
            'father_name' => 'Vikram Sharma',
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