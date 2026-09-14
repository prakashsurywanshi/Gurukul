<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\Subject;
use App\Models\Timetable;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Class360HubTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_sees_full_class_hub(): void
    {
        $organization = $this->createOrganization('Gurukul Class 360');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        [$class, $year] = $this->seedClassAndYear($organization, $teacher);
        $subject = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Physics',
            'code' => 'PHY',
        ]);

        $class->subjects()->attach($subject->id, ['teacher_id' => $teacher->id]);

        Timetable::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'day' => 'monday',
            'period_code' => 'P1',
            'period_order' => 1,
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'room_number' => '301',
            'period_type' => 'lecture',
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM-CLASS360-'.random_int(1000, 9999),
            'roll_number' => '1',
            'first_name' => 'Riya',
            'last_name' => 'Sharma',
            'date_of_birth' => '2011-05-20',
            'gender' => 'female',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $year->id,
            'class_id' => $class->id,
            'roll_number' => '1',
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'promoted',
            'effective_date' => '2026-04-01',
        ]);

        $this->actingAs($admin)
            ->get('/classes/'.$class->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/classes/ClassDetails')
                ->where('classInfo.name', '9')
                ->where('classInfo.section', 'A')
                ->where('classInfo.room_number', '302')
                ->where('classInfo.capacity', 40)
                ->where('classInfo.teacher_name', $teacher->name)
                ->where('classInfo.student_count', 1)
                ->where('hub.subjects.0.name', 'Physics')
                ->where('hub.subjects.0.teacher_name', $teacher->name)
                ->where('hub.timetable.0.day', 'Monday')
                ->where('hub.timetable.0.subject', 'Physics')
                ->where('hub.timetable.0.periodId', 'P1')
                ->where('hub.timetable.0.startTime', '09:00')
                ->where('hub.timetable.0.endTime', '10:00')
                ->where('hub.timetable.0.teacherName', $teacher->name)
            );
    }

    public function test_hub_returns_defaults_when_class_has_no_subjects_or_timetable(): void
    {
        $organization = $this->createOrganization('Gurukul Class Empty');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        [$class] = $this->seedClassAndYear($organization, $teacher);

        $this->actingAs($admin)
            ->get('/classes/'.$class->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/classes/ClassDetails')
                ->where('classInfo.student_count', 0)
                ->where('hub.subjects', [])
                ->where('hub.timetable', [])
            );
    }

    public function test_hub_does_not_leak_from_other_organizations_and_returns_404(): void
    {
        $organization = $this->createOrganization('Gurukul Class Primary');
        $otherOrg = $this->createOrganization('Gurukul Class Other');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($otherOrg);
        $admin = $this->createUser($organization, 'admin');
        $otherTeacher = $this->createUser($otherOrg, 'teacher');

        [$otherClass] = $this->seedClassAndYear($otherOrg, $otherTeacher);
        $subject = Subject::query()->create([
            'organization_id' => $otherOrg->id,
            'name' => 'Chemistry',
            'code' => 'CHE',
        ]);
        $otherClass->subjects()->attach($subject->id, ['teacher_id' => $otherTeacher->id]);

        $this->actingAs($admin)
            ->get('/classes/'.$otherClass->id)
            ->assertNotFound();
    }

    public function test_driver_without_class_permission_is_forbidden(): void
    {
        $organization = $this->createOrganization('Gurukul Class Access');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        [$class] = $this->seedClassAndYear($organization, $teacher);
        $driver = $this->createUser($organization, 'driver');

        $this->actingAs($driver)
            ->get('/classes/'.$class->id)
            ->assertForbidden();
    }

    private function createOrganization(string $name): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => $name,
            'slug' => 'class360-org-'.$counter,
            'email' => 'class360-org-'.$counter.'@example.com',
            'type' => 'school',
            'status' => 'active',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' Class 360 '.$counter,
            'email' => $role.'-class360-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
            'status' => 'active',
        ]);
    }

    private function seedClassAndYear(Organization $organization, User $teacher): array
    {
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '9',
            'section' => 'A',
            'class_teacher_id' => $teacher->id,
            'room_number' => '302',
            'capacity' => 40,
            'status' => 'active',
        ]);

        return [$class, $year];
    }
}