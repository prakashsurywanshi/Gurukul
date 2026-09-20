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

class StudentDeleteIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_single_delete_soft_deletes_student_and_removes_unshared_login(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $soloUser = $this->createStudentUser($organization, 'solo-student@example.com');
        $student = $this->createStudent($organization, 'DLT-1', ['user_id' => $soloUser->id]);

        $this->actingAs($admin)
            ->delete('/students/'.$student->id)
            ->assertRedirect('/students');

        $this->assertSoftDeleted('students', ['id' => $student->id]);
        $this->assertDatabaseMissing('users', ['id' => $soloUser->id]);
    }

    public function test_single_delete_preserves_shared_sibling_login(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $sharedUser = $this->createStudentUser($organization, 'shared@example.com');
        $this->createStudent($organization, 'SH-A', ['user_id' => $sharedUser->id]);
        $studentB = $this->createStudent($organization, 'SH-B', ['user_id' => $sharedUser->id]);

        $this->actingAs($admin)
            ->delete('/students/'.$studentB->id)
            ->assertRedirect('/students');

        $this->assertDatabaseHas('users', ['id' => $sharedUser->id, 'role' => 'student']);
    }

    public function test_delete_preserves_login_while_active_sibling_uses_it(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $sharedUser = $this->createStudentUser($organization, 'share2@example.com');
        $studentA = $this->createStudent($organization, 'SH-C', ['user_id' => $sharedUser->id]);
        $studentB = $this->createStudent($organization, 'SH-D', ['user_id' => $sharedUser->id]);

        $this->actingAs($admin)->delete('/students/'.$studentA->id)->assertRedirect('/students');

        $this->assertDatabaseHas('users', ['id' => $sharedUser->id, 'role' => 'student']);
        $this->assertNotSoftDeleted('students', ['id' => $studentB->id]);
    }

    public function test_bulk_destroy_moves_students_to_recycle_bin(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $firstUser = $this->createStudentUser($organization, 'bulk-a@example.com');
        $secondUser = $this->createStudentUser($organization, 'bulk-b@example.com');

        $studentA = $this->createStudent($organization, 'BLK-A', ['user_id' => $firstUser->id]);
        $studentB = $this->createStudent($organization, 'BLK-B', ['user_id' => $secondUser->id]);

        $this->actingAs($admin)
            ->post('/students/bulk-delete', ['studentIds' => [$studentA->id, $studentB->id]])
            ->assertRedirect('/bulk-delete-students');

        $this->assertSoftDeleted('students', ['id' => $studentA->id]);
        $this->assertSoftDeleted('students', ['id' => $studentB->id]);
        $this->assertDatabaseMissing('users', ['id' => $firstUser->id]);
        $this->assertDatabaseMissing('users', ['id' => $secondUser->id]);

        $this->actingAs($admin)
            ->get('/students-recycle-bin')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('students', 2));
    }

    public function test_bulk_destroy_preserves_shared_login_when_other_student_kept(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $sharedUser = $this->createStudentUser($organization, 'bulk-shared@example.com');
        $studentA = $this->createStudent($organization, 'BLK-C', ['user_id' => $sharedUser->id]);
        $studentB = $this->createStudent($organization, 'BLK-D', ['user_id' => $sharedUser->id]);

        $this->actingAs($admin)
            ->post('/students/bulk-delete', ['studentIds' => [$studentA->id]])
            ->assertRedirect('/bulk-delete-students');

        $this->assertDatabaseHas('users', ['id' => $sharedUser->id, 'role' => 'student']);
        $this->assertNotSoftDeleted('students', ['id' => $studentB->id]);
    }

    public function test_bulk_destroy_removes_last_shared_login(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $sharedUser = $this->createStudentUser($organization, 'bulk-last@example.com');
        $studentA = $this->createStudent($organization, 'BLK-E', ['user_id' => $sharedUser->id]);
        $studentB = $this->createStudent($organization, 'BLK-F', ['user_id' => $sharedUser->id]);

        $this->actingAs($admin)
            ->post('/students/bulk-delete', ['studentIds' => [$studentA->id, $studentB->id]])
            ->assertRedirect('/bulk-delete-students');

        $this->assertDatabaseMissing('users', ['id' => $sharedUser->id]);
    }

    public function test_restore_recreates_student_login(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $oldUser = $this->createStudentUser($organization, 'restore-me@example.com');
        $student = $this->createStudent($organization, 'RST-1', ['user_id' => $oldUser->id]);

        $this->actingAs($admin)->delete('/students/'.$student->id)->assertRedirect('/students');
        $this->assertDatabaseMissing('users', ['id' => $oldUser->id]);

        $this->actingAs($admin)
            ->post('/students-recycle-bin/'.$student->id.'/restore')
            ->assertRedirect();

        $student->refresh();

        $this->assertDatabaseHas('students', ['id' => $student->id, 'deleted_at' => null]);
        $this->assertNotNull($student->user_id);
        $this->assertDatabaseHas('users', ['id' => $student->user_id, 'role' => 'student']);
    }

    public function test_trashed_student_is_not_viewable_by_url(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $student = $this->createStudent($organization, 'TRS-1');

        $this->actingAs($admin)->delete('/students/'.$student->id)->assertRedirect('/students');

        $this->actingAs($admin)
            ->get('/students/'.$student->id)
            ->assertNotFound();
    }

    private function createStudent(Organization $organization, string $admissionNo, array $overrides = []): Student
    {
        return Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $this->createClass($organization, $this->createAcademicYear($organization))->id,
            'admission_no' => $admissionNo,
            'first_name' => 'Test',
            'last_name' => 'Student',
            'email' => strtolower($admissionNo).'@example.com',
            'date_of_birth' => '2013-04-10',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
            ...$overrides,
        ]);
    }

    private function createStudentUser(Organization $organization, string $email): User
    {
        return User::factory()->create([
            'name' => 'Student Login',
            'email' => $email,
            'role' => 'student',
            'organization_id' => $organization->id,
        ]);
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

        $label = $name ?: 'Student Delete School '.$counter;

        return Organization::query()->create([
            'name' => $label,
            'slug' => 'student-delete-school-'.$counter,
            'email' => 'student-delete-org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' User',
            'email' => $role.'-student-delete-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}