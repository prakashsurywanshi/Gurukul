<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegulatorReportsExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_export_regulator_reports_csv(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');
        $class = $this->createClass($organization);
        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM-RR-'.$organization->id,
            'first_name' => 'Riya',
            'last_name' => 'Sharma',
            'date_of_birth' => '2013-07-19',
            'gender' => 'female',
            'admission_date' => '2026-04-05',
        ]);

        Attendance::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'date' => now()->toDateString(),
            'status' => 'present',
            'marked_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin)->get('/regulator-reports/export');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment; filename="regulator-reports-', $response->headers->get('Content-Disposition'));

        $content = $response->getContent();

        $this->assertStringContainsString($organization->name, $content);
        $this->assertStringContainsString('Students,1', $content);
        $this->assertStringContainsString('Staff,2', $content);
        $this->assertStringContainsString('"Attendance Rate (%)",100', $content);
        $this->assertStringContainsString('teacher,1', $content);
        $this->assertStringContainsString('"10 - A",1', $content);
    }

    public function test_non_admin_cannot_export_regulator_reports(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($teacher)
            ->get('/regulator-reports/export')
            ->assertForbidden();
    }

    public function test_regulator_reports_page_still_renders(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $this->createClass($organization);

        $this->actingAs($admin)
            ->get('/regulator-reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/RegulatorReports'));
    }

    private function createClass(Organization $organization): SchoolClass
    {
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

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

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'Regulator Export School '.$counter,
            'slug' => 'regulator-export-school-'.$counter,
            'email' => 'regulator-export-org'.$counter.'@example.com',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'pincode' => '302001',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' User',
            'email' => 'regulator-'.$role.'-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}