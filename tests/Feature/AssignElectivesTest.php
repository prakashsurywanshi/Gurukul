<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AssignElectivesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_assign_electives_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $this->assignSubject($class, $subject, true);

        $this->actingAs($admin)
            ->get('/assign-electives')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/AssignElectives')
                ->has('classes', 1)
                ->where('classes.0.name', '10')
                ->where('selectedClassId', null)
            );

        $this->actingAs($admin)
            ->get("/assign-electives?class={$class->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('rows', 1)
                ->where('rows.0.name', 'Mathematics')
                ->where('rows.0.isElective', true)
                ->has('unassignedSubjects', 0)
            );
    }

    public function test_admin_can_mark_subjects_as_elective(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $this->assignSubject($class, $subject, false);

        $this->actingAs($admin)
            ->post('/assign-electives', [
                'class_id' => $class->id,
                'rows' => [
                    ['subject_id' => $subject->id, 'is_elective' => true],
                ],
            ])
            ->assertRedirect();

        $this->assertSame(1, DB::table('class_subject')->where('class_id', $class->id)->where('is_elective', 1)->count());
    }

    public function test_admin_can_add_and_remove_assigned_subjects(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $otherSubject = $this->createSubject($organization, 'Physical Education', 'PE');
        $this->assignSubject($class, $subject, true);

        $this->actingAs($admin)
            ->post('/assign-electives', [
                'class_id' => $class->id,
                'rows' => [
                    ['subject_id' => $otherSubject->id, 'is_elective' => true],
                ],
            ])
            ->assertRedirect();

        $assigned = DB::table('class_subject')->where('class_id', $class->id)->pluck('subject_id')->all();
        $this->assertSame([$otherSubject->id], $assigned);
    }

    public function test_unassigned_subjects_are_listed_on_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $this->createSubject($organization, 'Computer Science', 'CS');

        $this->actingAs($admin)
            ->get("/assign-electives?class={$class->id}")
            ->assertInertia(fn ($page) => $page
                ->has('rows', 0)
                ->has('unassignedSubjects', 1)
                ->where('unassignedSubjects.0.name', 'Computer Science')
            );
    }

    public function test_cannot_assign_other_organization_subject(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $otherOrganization = $this->createOrganization('sister-school', 'sister@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $otherSubject = $this->createSubject($otherOrganization, 'Science', 'SCI');

        $response = $this->actingAs($admin)
            ->post('/assign-electives', [
                'class_id' => $class->id,
                'rows' => [
                    ['subject_id' => $otherSubject->id, 'is_elective' => true],
                ],
            ]);

        $response
            ->assertRedirect()
            ->assertSessionHasErrors('rows.0.subject_id');

        $this->assertSame(0, DB::table('class_subject')->where('class_id', $class->id)->count());
    }

    public function test_receptionist_cannot_access_assign_electives(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->get('/assign-electives')
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

    private function createClass(Organization $organization, AcademicYear $year): SchoolClass
    {
        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);
    }

    private function createSubject(Organization $organization, string $name = 'Mathematics', string $code = 'MATH'): Subject
    {
        return Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'code' => $code,
            'type' => 'theory',
        ]);
    }

    private function assignSubject(SchoolClass $class, Subject $subject, bool $isElective = false): void
    {
        DB::table('class_subject')->insert([
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'is_elective' => $isElective,
        ]);
    }
}