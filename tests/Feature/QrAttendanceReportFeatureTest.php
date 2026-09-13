<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\QrScanLog;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrAttendanceReportFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_page_loads_with_aggregates(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        [$classA, $studentA, $studentB, $date] = $this->seedScans($organization, $admin);

        $this->actingAs($admin)
            ->get('/qr-attendance/report')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/QrAttendanceReport')
                ->where('summary.totalScans', 2)
                ->where('summary.successScans', 1)
                ->where('summary.failedScans', 1)
                ->where('summary.uniqueStudents', 1)
                ->where('summary.successRate', 50)
                ->where('byDate.0.date', $date)
                ->where('byDate.0.scans', 2)
                ->where('byDate.0.success', 1)
                ->where('byDate.0.failed', 1)
                ->where('byClass.0.class', '6 A')
                ->where('byClass.0.scans', 2)
                ->where('byClass.0.studentCount', 1)
                ->has('classes', 1)
            );
    }

    public function test_report_filters_by_status(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        [$classA, $studentA, $studentB, $date] = $this->seedScans($organization, $admin);

        $this->actingAs($admin)
            ->get('/qr-attendance/report?status=success')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('summary.totalScans', 1)
                ->where('summary.successScans', 1)
                ->where('summary.uniqueStudents', 1)
            );

        $this->actingAs($admin)
            ->get('/qr-attendance/report?status=failure')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('summary.totalScans', 1)
                ->where('summary.failedScans', 1)
            );
    }

    public function test_report_is_org_scoped_and_admin_only(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $otherOrg = Organization::query()->create([
            'name' => 'Other School',
            'slug' => 'other-school-qr',
            'email' => 'other-qr@example.com',
        ]);
        app(StaffPermissionService::class)->ensureRolesExist($otherOrg);
        $otherAdmin = $this->createUser($otherOrg, 'admin');

        [$classA, $studentA, $studentB, $date] = $this->seedScans($organization, $admin);

        QrScanLog::query()->create([
            'organization_id' => $otherOrg->id,
            'student_id' => null,
            'scanned_by' => $otherAdmin->id,
            'method' => 'qr',
            'status' => 'success',
            'scan_date' => $date,
        ]);

        $this->actingAs($admin)
            ->get('/qr-attendance/report')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('summary.totalScans', 2));

        $teacher = $this->createUser($organization, 'teacher');
        $this->actingAs($teacher)->get('/qr-attendance/report')->assertForbidden();
    }

    private function seedScans(Organization $organization, User $admin): array
    {
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => now()->year.'-'.(now()->year + 1),
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);

        $classA = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '6',
            'section' => 'A',
            'status' => 'active',
        ]);

        $studentA = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $classA->id,
            'admission_no' => 'QR-REP-'.$organization->id,
            'first_name' => 'Devika',
            'last_name' => 'Rane',
            'date_of_birth' => '2013-05-10',
            'gender' => 'female',
            'qr_token' => 'QR-'.$organization->id.'-REPORT-TOKEN',
            'admission_date' => now()->toDateString(),
        ]);

        $studentB = Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => 'QR-REP-B-'.$organization->id,
            'first_name' => 'Om',
            'last_name' => 'Desai',
            'date_of_birth' => '2013-08-20',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
        ]);

        $date = now()->toDateString();

        QrScanLog::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $studentA->id,
            'scanned_by' => $admin->id,
            'method' => 'qr',
            'status' => 'success',
            'qr_token' => 'QR-'.$organization->id.'-REPORT-TOKEN',
            'scan_date' => $date,
        ]);

        QrScanLog::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $studentA->id,
            'scanned_by' => $admin->id,
            'method' => 'qr',
            'status' => 'failure',
            'qr_token' => 'QR-'.$organization->id.'-REPORT-TOKEN',
            'scan_date' => $date,
        ]);

        return [$classA, $studentA, $studentB, $date];
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'QR Report School '.$counter,
            'slug' => 'qr-report-school-'.$counter,
            'email' => 'qr-report-org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' User',
            'email' => $role.'-qr-report-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}