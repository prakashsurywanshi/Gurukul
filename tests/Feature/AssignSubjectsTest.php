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

class AssignSubjectsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_assign_subjects_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization, 'Mathematics', 'MATH');
        $this->assignSubject($class, $subject, null);

        $this->actingAs($admin)
            ->get('/assign-subjects')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/AssignSubjects')
                ->has('classes', 1)
                ->where('selectedClassId', null)
            );

        $this->actingAs($admin)
            ->get("/assign-subjects?class={$class->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('rows', 1)
                ->where('rows.0.name', 'Mathematics')
                ->has('unassignedSubjects', 0)
            );
    }

    public function test_admin_can_assign_teachers_to_subjects(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $math = $this->createSubject($organization, 'Mathematics', 'MATH');
        $science = $this->createSubject($organization, 'Science', 'SCI');
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($admin)
            ->post('/assign-subjects', [
                'class_id' => $class->id,
                'rows' => [
                    ['subject_id' => $math->id, 'teacher_id' => $teacher->id],
                    ['subject_id' => $science->id, 'teacher_id' => null],
                ],
            ])
            ->assertRedirect();

        $assigned = DB::table('class_subject')->where('class_id', $class->id)->get();
        $this->assertCount(2, $assigned);
        $this->assertSame($teacher->id, (int) $assigned->firstWhere('subject_id', $math->id)->teacher_id);
        $this->assertNull($assigned->firstWhere('subject_id', $science->id)->teacher_id);
    }

    public function test_cannot_assign_subject_from_other_organization(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $otherOrganization = $this->createOrganization('sister-school', 'sister@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $otherSubject = $this->createSubject($otherOrganization, 'Science', 'SCI');

        $this->actingAs($admin)
            ->post('/assign-subjects', [
                'class_id' => $class->id,
                'rows' => [
                    ['subject_id' => $otherSubject->id, 'teacher_id' => null],
                ],
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('rows.0.subject_id');

        $this->assertSame(0, DB::table('class_subject')->where('class_id', $class->id)->count());
    }

    public function test_cannot_assign_non_teacher_user(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $math = $this->createSubject($organization, 'Mathematics', 'MATH');
        $otherAdmin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/assign-subjects', [
                'class_id' => $class->id,
                'rows' => [
                    ['subject_id' => $math->id, 'teacher_id' => $otherAdmin->id],
                ],
            ])
            ->assertRedirect();

        $this->assertSame(0, DB::table('class_subject')->where('class_id', $class->id)->count());
    }

    public function test_receptionist_cannot_access_assign_subjects(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->get('/assign-subjects')
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

    private function assignSubject(SchoolClass $class, Subject $subject, ?int $teacherId): void
    {
        DB::table('class_subject')->insert([
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacherId,
        ]);
    }
}