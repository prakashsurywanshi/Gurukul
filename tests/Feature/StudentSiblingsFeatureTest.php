<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentSiblingsFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_with_shared_guardian_email_returns_siblings(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);

        $studentA = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'SIB-A',
            'first_name' => 'Aarav',
            'last_name' => 'Sharma',
            'date_of_birth' => '2013-04-10',
            'gender' => 'male',
            'father_email' => 'ravi.sharma@example.com',
            'mother_email' => 'sunita.sharma@example.com',
            'admission_date' => now()->toDateString(),
        ]);

        $studentB = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'SIB-B',
            'first_name' => 'Meera',
            'last_name' => 'Sharma',
            'date_of_birth' => '2015-07-22',
            'gender' => 'female',
            'father_email' => 'ravi.sharma@example.com',
            'mother_email' => 'sunita.sharma@example.com',
            'admission_date' => now()->toDateString(),
        ]);

        $this->actingAs($admin)
            ->get('/students/'.$studentA->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/students/StudentDetails')
                ->has('siblings', 1)
                ->where('siblings.0.id', (string) $studentB->id)
                ->where('siblings.0.name', 'Meera Sharma')
                ->where('siblings.0.admission_no', 'SIB-B')
            );
    }

    public function test_student_without_linkable_parent_returns_no_siblings(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'SOLO',
            'first_name' => 'Ishan',
            'last_name' => 'Patel',
            'date_of_birth' => '2013-02-02',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
        ]);

        $this->actingAs($admin)
            ->get('/students/'.$student->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('siblings', 0));
    }

    public function test_siblings_exclude_inactive_students(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);

        $studentA = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'SIB-C',
            'first_name' => 'Nikhil',
            'last_name' => 'Kulkarni',
            'date_of_birth' => '2013-04-10',
            'gender' => 'male',
            'father_email' => 'ramesh.k@example.com',
            'admission_date' => now()->toDateString(),
        ]);

        Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'SIB-D',
            'first_name' => 'Priya',
            'last_name' => 'Kulkarni',
            'date_of_birth' => '2015-07-22',
            'gender' => 'female',
            'father_email' => 'ramesh.k@example.com',
            'status' => 'inactive',
            'admission_date' => now()->toDateString(),
        ]);

        $this->actingAs($admin)
            ->get('/students/'.$studentA->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('siblings', 0));
    }

    public function test_siblings_do_not_leak_across_organizations(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $otherOrg = $this->createOrganization('Other School');
        app(StaffPermissionService::class)->ensureRolesExist($otherOrg);

        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $otherYear = $this->createAcademicYear($otherOrg);
        $otherClass = $this->createClass($otherOrg, $otherYear);

        $studentA = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'SIB-E',
            'first_name' => 'Rohan',
            'last_name' => 'Mehta',
            'date_of_birth' => '2013-04-10',
            'gender' => 'male',
            'father_email' => 'same@example.com',
            'admission_date' => now()->toDateString(),
        ]);

        Student::query()->create([
            'organization_id' => $otherOrg->id,
            'class_id' => $otherClass->id,
            'admission_no' => 'SIB-F',
            'first_name' => 'Sara',
            'last_name' => 'Mehta',
            'date_of_birth' => '2015-07-22',
            'gender' => 'female',
            'father_email' => 'same@example.com',
            'admission_date' => now()->toDateString(),
        ]);

        $this->actingAs($admin)
            ->get('/students/'.$studentA->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('siblings', 0));
    }

    private function createAcademicYear(Organization $organization): AcademicYear
    {
        return AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => now()->year.'-'.(now()->year + 1),
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);
    }

    private function createClass(Organization $organization, AcademicYear $year): SchoolClass
    {
        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '6',
            'section' => 'A',
            'status' => 'active',
        ]);
    }

    private function createOrganization(string $name = null): Organization
    {
        static $counter = 0;
        $counter++;

        $label = $name ?: 'Siblings School '.$counter;

        return Organization::query()->create([
            'name' => $label,
            'slug' => 'siblings-school-'.$counter,
            'email' => 'siblings-org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' Sibling User',
            'email' => $role.'-siblings-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}