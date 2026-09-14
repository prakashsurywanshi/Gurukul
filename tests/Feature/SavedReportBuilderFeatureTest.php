<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SavedReportBuilderFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(): array
    {
        $organization = DB::table('organizations')->insertGetId([
            'name' => 'Builder School',
            'slug' => 'builder-school',
            'email' => 'school@builder.test',
            'phone' => '5555555555',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $adminId = DB::table('users')->insertGetId([
            'organization_id' => $organization,
            'name' => 'Admin User',
            'email' => 'admin@builder.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $academicYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $organization,
            'name' => '2026-2027',
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $classId = DB::table('classes')->insertGetId([
            'organization_id' => $organization,
            'academic_year_id' => $academicYearId,
            'name' => '10',
            'section' => 'A',
            'room_number' => 'R1',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$adminId, $organization, $academicYearId, $classId];
    }

    public function test_admin_can_open_report_builder_page(): void
    {
        [$adminId, $organization] = $this->seedContext();

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->get('/reports/builder')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ReportBuilder')
                ->has('modules')
                ->has('classOptions')
                ->has('savedReports'));
    }

    public function test_admin_can_create_saved_report(): void
    {
        [$adminId, $organization, $academicYearId] = $this->seedContext();

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->post('/reports/builder', [
                'name' => 'Monthly Fees',
                'module' => 'fees',
                'filters' => [
                    'class' => 'all',
                    'session' => (string) $academicYearId,
                ],
            ])
            ->assertRedirect('/reports/builder');

        $this->assertDatabaseHas('saved_reports', [
            'organization_id' => $organization,
            'name' => 'Monthly Fees',
            'module' => 'fees',
            'created_by' => $adminId,
        ]);
    }

    public function test_save_report_validation_rejects_bad_module(): void
    {
        [$adminId] = $this->seedContext();

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->post('/reports/builder', [
                'name' => 'Bad Module',
                'module' => 'not-a-module',
                'filters' => [],
            ])
            ->assertSessionHasErrors('module');

        $this->assertDatabaseCount('saved_reports', 0);
    }

    public function test_saved_report_hydrates_filters_when_running_reports(): void
    {
        [$adminId, $organization, $academicYearId, $classId] = $this->seedContext();

        $savedReportId = DB::table('saved_reports')->insertGetId([
            'organization_id' => $organization,
            'name' => 'Class 10 Students',
            'module' => 'students',
            'filters' => json_encode([
                'class' => (string) $classId,
                'session' => (string) $academicYearId,
            ]),
            'is_active' => true,
            'created_by' => $adminId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->get("/reports?saved_report_id={$savedReportId}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ReportsAnalytics')
                ->where('selectedFilters.module', 'students')
                ->where('selectedFilters.class', (string) $classId));
    }

    public function test_saved_report_csv_export_streams_content(): void
    {
        [$adminId, $organization, $academicYearId, $classId] = $this->seedContext();

        $studentId = DB::table('students')->insertGetId([
            'organization_id' => $organization,
            'first_name' => 'Builder',
            'last_name' => 'Student',
            'email' => 'builder@builder.test',
            'class_id' => $classId,
            'status' => 'active',
            'admission_no' => 'B-1001',
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'male',
            'date_of_birth' => now()->subYears(15)->toDateString(),
            'guardian_name' => 'Builder Guardian',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('student_academic_histories')->insert([
            'organization_id' => $organization,
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_year_id' => $academicYearId,
            'is_current' => true,
            'status' => 'active',
            'entry_type' => 'admission',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs(\App\Models\User::query()->find($adminId))
            ->get('/reports/export-csv?module=students')
            ->assertOk();

        $this->assertStringContainsString('text/csv', $response->headers->get('content-type'));
        $this->assertStringContainsString('Builder', $response->streamedContent());
    }

    public function test_saved_report_pdf_export_still_works(): void
    {
        [$adminId, $organization] = $this->seedContext();

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->get('/reports/export-pdf?module=students')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_admin_can_delete_saved_report(): void
    {
        [$adminId, $organization] = $this->seedContext();

        $savedReportId = DB::table('saved_reports')->insertGetId([
            'organization_id' => $organization,
            'name' => 'Temp Report',
            'module' => 'students',
            'filters' => json_encode([]),
            'is_active' => true,
            'created_by' => $adminId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->delete("/reports/builder/{$savedReportId}")
            ->assertRedirect('/reports/builder');

        $this->assertDatabaseMissing('saved_reports', ['id' => $savedReportId]);
    }

    public function test_deleting_others_saved_report_is_forbidden(): void
    {
        [$adminId, $organization] = $this->seedContext();

        $otherOrg = DB::table('organizations')->insertGetId([
            'name' => 'Other School',
            'slug' => 'other-school',
            'email' => 'other@builder.test',
            'phone' => '6666666666',
            'address' => 'Side Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(5),
            'subscription_end_date' => now()->addDays(25),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $foreignId = DB::table('saved_reports')->insertGetId([
            'organization_id' => $otherOrg,
            'name' => 'Foreign Report',
            'module' => 'students',
            'filters' => json_encode([]),
            'is_active' => true,
            'created_by' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->delete("/reports/builder/{$foreignId}")
            ->assertForbidden();

        $this->assertDatabaseHas('saved_reports', ['id' => $foreignId]);
    }

    public function test_run_saved_report_forbidden_across_organizations(): void
    {
        [$adminId] = $this->seedContext();

        $otherOrg = DB::table('organizations')->insertGetId([
            'name' => 'Other School 2',
            'slug' => 'other-school-2',
            'email' => 'other2@builder.test',
            'phone' => '7777777777',
            'address' => 'Cross Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(5),
            'subscription_end_date' => now()->addDays(25),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $foreignId = DB::table('saved_reports')->insertGetId([
            'organization_id' => $otherOrg,
            'name' => 'Foreign Report 2',
            'module' => 'students',
            'filters' => json_encode([]),
            'is_active' => true,
            'created_by' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->get("/reports?saved_report_id={$foreignId}")
            ->assertForbidden();
    }
}