<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssignClassTeacherTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_assign_class_teacher_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($admin)
            ->get('/assign-class-teacher')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/AssignClassTeacher')
                ->has('classes', 1)
                ->where('classes.0.name', '10')
                ->where('classes.0.section', 'A')
                ->where('classes.0.roomNumber', '101')
                ->has('teachers', 1)
                ->where('teachers.0.id', $teacher->id)
                ->where('academicYearLabel', '2026-2027')
            );
    }

    public function test_admin_can_assign_class_teacher(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($admin)
            ->post('/assign-class-teacher', [
                'class_id' => $class->id,
                'teacher_id' => $teacher->id,
            ])
            ->assertRedirect();

        $this->assertSame($teacher->id, $class->fresh()->class_teacher_id);
    }

    public function test_admin_can_unassign_class_teacher(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $teacher = $this->createUser($organization, 'teacher');
        $class = $this->createClass($organization, $year, $teacher->id);

        $this->actingAs($admin)
            ->post('/assign-class-teacher', [
                'class_id' => $class->id,
                'teacher_id' => null,
            ])
            ->assertRedirect();

        $this->assertNull($class->fresh()->class_teacher_id);
    }

    public function test_cannot_assign_class_teacher_from_other_organization(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $otherOrganization = $this->createOrganization('sister-school', 'sister@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $otherTeacher = $this->createUser($otherOrganization, 'teacher');

        $this->actingAs($admin)
            ->post('/assign-class-teacher', [
                'class_id' => $class->id,
                'teacher_id' => $otherTeacher->id,
            ])
            ->assertRedirect();

        $this->assertNull($class->fresh()->class_teacher_id);
    }

    public function test_receptionist_cannot_access_assign_class_teacher(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->get('/assign-class-teacher')
            ->assertForbidden();
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

    private function createAcademicYear(Organization $organization, string $name = '2026-2027'): AcademicYear
    {
        return AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);
    }

    private function createClass(Organization $organization, AcademicYear $year, ?int $classTeacherId = null): SchoolClass
    {
        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 30,
            'class_teacher_id' => $classTeacherId,
            'status' => 'active',
        ]);
    }
}