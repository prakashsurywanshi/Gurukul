<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\AttendanceCorrection;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceCorrectionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_pending_corrections(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        [$class, $students] = $this->seedClassWithStudents($organization, $admin, 1);

        AttendanceCorrection::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $students[0]->id,
            'class_id' => $class->id,
            'date' => now()->toDateString(),
            'current_status' => 'absent',
            'requested_status' => 'present',
            'reason' => 'Medical',
            'status' => 'pending',
            'requested_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/attendance-corrections?status=pending')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.can_review', true)
            ->assertJsonCount(1, 'data.corrections')
            ->assertJsonPath('data.corrections.0.current_status', 'absent')
            ->assertJsonPath('data.corrections.0.requested_status', 'present');
    }

    public function test_teacher_can_request_correction(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);
        [$class, $students] = $this->seedClassWithStudents($organization, $teacher, 1);

        Sanctum::actingAs($teacher);

        $this->postJson('/api/attendance-corrections', [
            'student_id' => $students[0]->id,
            'date' => now()->toDateString(),
            'requested_status' => 'present',
            'reason' => 'Student was present.',
        ])->assertCreated()->assertJsonPath('success', true);

        $this->assertDatabaseHas('attendance_corrections', [
            'organization_id' => $organization->id,
            'student_id' => $students[0]->id,
            'requested_status' => 'present',
            'status' => 'pending',
            'requested_by' => $teacher->id,
        ]);
    }

    public function test_admin_can_approve_correction_and_updates_attendance(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        [$class, $students] = $this->seedClassWithStudents($organization, $admin, 1);
        $date = now()->toDateString();

        $correction = AttendanceCorrection::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $students[0]->id,
            'class_id' => $class->id,
            'date' => $date,
            'current_status' => 'absent',
            'requested_status' => 'present',
            'reason' => 'Medical',
            'status' => 'pending',
            'requested_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/attendance-corrections/{$correction->id}/review", [
            'action' => 'approve',
            'review_note' => 'Verified.',
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('attendance', [
            'organization_id' => $organization->id,
            'student_id' => $students[0]->id,
            'status' => 'present',
        ]);
    }

    public function test_teacher_cannot_review_correction(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);
        [$class, $students] = $this->seedClassWithStudents($organization, $teacher, 1);

        $correction = AttendanceCorrection::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $students[0]->id,
            'class_id' => $class->id,
            'date' => now()->toDateString(),
            'current_status' => 'absent',
            'requested_status' => 'present',
            'reason' => 'Medical',
            'status' => 'pending',
            'requested_by' => $teacher->id,
        ]);

        Sanctum::actingAs($teacher);

        $this->patchJson("/api/attendance-corrections/{$correction->id}/review", [
            'action' => 'approve',
        ])->assertForbidden();
    }

    public function test_correction_review_is_tenant_scoped(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        [$class, $students] = $this->seedClassWithStudents($organization, $admin, 1);

        $correction = AttendanceCorrection::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $students[0]->id,
            'class_id' => $class->id,
            'date' => now()->toDateString(),
            'current_status' => 'absent',
            'requested_status' => 'present',
            'reason' => 'Medical',
            'status' => 'pending',
            'requested_by' => $admin->id,
        ]);

        [, $otherAdmin] = $this->createOrganizationAndAdmin('beta-school', 'admin@beta.test');

        Sanctum::actingAs($otherAdmin);

        $this->patchJson("/api/attendance-corrections/{$correction->id}/review", [
            'action' => 'approve',
        ])->assertNotFound();
    }

    public function test_correction_students_are_teacher_scoped(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->seedClassWithStudents($organization, $teacher, 1);
        $this->seedClassWithStudents($organization, $admin, 1, '11');

        Sanctum::actingAs($teacher);

        $this->getJson('/api/attendance-corrections/students')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');
    }

    private function seedClassWithStudents(Organization $organization, User $teacher, int $count, string $className = '10'): array
    {
        $year = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->first();

        if (! $year) {
            $year = AcademicYear::query()->create([
                'organization_id' => $organization->id,
                'name' => now()->year.'-'.(now()->year + 1),
                'start_date' => now()->startOfYear()->toDateString(),
                'end_date' => now()->endOfYear()->toDateString(),
                'is_current' => true,
                'status' => 'active',
            ]);
        }

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => $className,
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 40,
            'status' => 'active',
            'class_teacher_id' => $teacher->id,
        ]);

        $students = collect();

        for ($index = 0; $index < $count; $index++) {
            $student = Student::query()->create([
                'organization_id' => $organization->id,
                'class_id' => $class->id,
                'admission_no' => 'ADM-'.$className.'-'.$organization->id.'-'.($index + 1),
                'roll_number' => (string) ($index + 1),
                'first_name' => 'Student',
                'last_name' => 'Number'.($index + 1),
                'date_of_birth' => '2012-05-10',
                'gender' => 'male',
                'admission_date' => now()->toDateString(),
                'status' => 'active',
            ]);

            StudentAcademicHistory::query()->create([
                'organization_id' => $organization->id,
                'student_id' => $student->id,
                'academic_year_id' => $year->id,
                'class_id' => $class->id,
                'session' => $year->name,
                'roll_number' => (string) ($index + 1),
                'status' => 'active',
                'is_current' => true,
                'entry_type' => 'admission',
                'effective_date' => now()->toDateString(),
            ]);

            $students->push($student);
        }

        return [$class, $students];
    }

    private function createOrganizationAndAdmin(string $slug, string $email): array
    {
        $organization = Organization::query()->create([
            'name' => ucfirst(explode('-', $slug)[0]).' School',
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
        ]);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
            'phone' => '9999999999',
            'email' => $email,
        ]);

        return [$organization, $admin];
    }
}
