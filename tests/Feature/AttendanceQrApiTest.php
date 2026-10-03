<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceQrApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_qr_roster_returns_students_with_generated_tokens(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        [$class, $students] = $this->seedClassWithStudents($organization, 2);

        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/attendance/qr/students?class_id={$class->id}&date=".now()->toDateString());

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertCount(2, $response->json('data.students'));
        $this->assertNotNull($response->json('data.settings'));

        foreach ($response->json('data.students') as $row) {
            $this->assertNotEmpty($row['qr_token']);
        }

        $this->assertDatabaseMissing('students', [
            'id' => $students[0]->id,
            'qr_token' => null,
        ]);
    }

    public function test_qr_mark_creates_attendance_and_scan_log(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        [$class, $students] = $this->seedClassWithStudents($organization, 1);
        $date = now()->toDateString();

        Sanctum::actingAs($admin);

        $this->postJson('/api/attendance/qr', [
            'class_id' => $class->id,
            'date' => $date,
            'entries' => [
                ['student_id' => $students[0]->id, 'status' => 'present'],
            ],
        ])->assertOk()->assertJsonPath('saved', 1);

        $this->assertDatabaseHas('attendance', [
            'organization_id' => $organization->id,
            'student_id' => $students[0]->id,
            'class_id' => $class->id,
            'status' => 'present',
        ]);

        $this->assertDatabaseHas('qr_scan_logs', [
            'organization_id' => $organization->id,
            'student_id' => $students[0]->id,
            'method' => 'qr',
            'status' => 'success',
        ]);
    }

    public function test_qr_duplicate_upsert_setting_controls_overwrite(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        [$class, $students] = $this->seedClassWithStudents($organization, 1);
        $date = now()->toDateString();

        Attendance::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $students[0]->id,
            'class_id' => $class->id,
            'date' => $date,
            'status' => 'absent',
            'marked_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/attendance/qr', [
            'class_id' => $class->id,
            'date' => $date,
            'entries' => [
                ['student_id' => $students[0]->id, 'status' => 'present'],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('attendance', [
            'student_id' => $students[0]->id,
            'status' => 'absent',
        ]);

        $organization->forceFill(['settings' => ['qr_attendance' => [
            'enabled' => true,
            'duplicate_upsert' => true,
            'auto_late_mark' => false,
            'opening_time' => '08:30',
            'late_after_minutes' => 15,
        ]]])->save();

        $this->postJson('/api/attendance/qr', [
            'class_id' => $class->id,
            'date' => $date,
            'entries' => [
                ['student_id' => $students[0]->id, 'status' => 'present'],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('attendance', [
            'student_id' => $students[0]->id,
            'status' => 'present',
        ]);
    }

    public function test_qr_settings_can_be_saved_and_read(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');

        Sanctum::actingAs($admin);

        $this->postJson('/api/attendance/qr/settings', [
            'enabled' => true,
            'duplicate_upsert' => true,
            'auto_late_mark' => true,
            'opening_time' => '09:00',
            'late_after_minutes' => 10,
        ])->assertOk()->assertJsonPath('data.settings.late_after_minutes', 10);

        $this->getJson('/api/attendance/qr/settings')
            ->assertOk()
            ->assertJsonPath('data.settings.opening_time', '09:00')
            ->assertJsonPath('data.settings.duplicate_upsert', true);
    }

    public function test_qr_roster_is_tenant_scoped(): void
    {
        [$alphaOrganization] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        [$class] = $this->seedClassWithStudents($alphaOrganization, 1);

        [, $otherAdmin] = $this->createOrganizationAndAdmin('beta-school', 'admin@beta.test');

        Sanctum::actingAs($otherAdmin);

        $this->getJson("/api/attendance/qr/students?class_id={$class->id}&date=".now()->toDateString())
            ->assertStatus(422);
    }

    public function test_qr_endpoints_require_qr_permission(): void
    {
        [$organization] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');

        $accountant = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'accountant',
            'status' => 'active',
        ]);

        Sanctum::actingAs($accountant);

        $this->getJson('/api/attendance/qr/settings')->assertForbidden();
    }

    private function seedClassWithStudents(Organization $organization, int $count): array
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
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 40,
            'status' => 'active',
        ]);

        $students = collect();

        for ($index = 0; $index < $count; $index++) {
            $student = Student::query()->create([
                'organization_id' => $organization->id,
                'class_id' => $class->id,
                'admission_no' => 'ADM-'.$organization->id.'-'.($index + 1),
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
