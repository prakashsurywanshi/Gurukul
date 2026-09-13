<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IdCardQrFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_id_card_payload_includes_qr_token(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $student = $this->createStudent($organization);

        $this->actingAs($admin)
            ->get('/certificates/student-id-card')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StudentIdCardManagement')
                ->has('students', 1)
                ->where('students.0.id', (string) $student->id)
                ->where('students.0.qr_token', $student->fresh()->qr_token)
            );

        $this->assertNotNull($student->fresh()->qr_token);
        $this->assertStringStartsWith('QR-'.$organization->id.'-'.$student->id.'-', $student->fresh()->qr_token);
    }

    public function test_existing_student_qr_token_is_reused(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $token = 'QR-'.$organization->id.'-999-PRESETTOKEN';
        $student = $this->createStudent($organization, ['qr_token' => $token]);

        $this->actingAs($admin)
            ->get('/certificates/student-id-card')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('students.0.qr_token', $token)
            );

        $this->assertEquals($token, $student->fresh()->qr_token);
    }

    public function test_staff_id_card_payload_includes_qr_token(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($admin)
            ->get('/staff/id-cards')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StaffIdCards')
                ->has('staff', 2)
                ->where('staff.1.id', (string) $teacher->id)
                ->where('staff.1.qr_token', $teacher->fresh()->qr_token)
            );

        $this->assertNotNull($teacher->fresh()->qr_token);
        $this->assertStringStartsWith('EMP-'.$organization->id.'-'.$teacher->id.'-', $teacher->fresh()->qr_token);
    }

    public function test_non_privileged_role_cannot_access_id_card_pages(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $driver = $this->createUser($organization, 'driver');

        $this->actingAs($driver)->get('/certificates/student-id-card')->assertForbidden();
        $this->actingAs($driver)->get('/staff/id-cards')->assertForbidden();
    }

    private function createStudent(Organization $organization, array $overrides = []): Student
    {
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => now()->year.'-'.(now()->year + 1),
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '6',
            'section' => 'A',
            'status' => 'active',
        ]);

        $student = Student::query()->create(array_merge([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'IDCARD-'.$organization->id,
            'first_name' => 'Anika',
            'last_name' => 'Joshi',
            'date_of_birth' => '2013-05-10',
            'gender' => 'female',
            'admission_date' => now()->toDateString(),
        ], $overrides));

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $year->id,
            'class_id' => $class->id,
            'session' => $year->name,
            'roll_number' => $student->roll_number,
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => now()->toDateString(),
        ]);

        return $student;
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'ID Card School '.$counter,
            'slug' => 'id-card-school-'.$counter,
            'email' => 'id-card-org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' ID Card User',
            'email' => $role.'-idcard-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}