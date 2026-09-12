<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ReportsFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(): array
    {
        $organization = DB::table('organizations')->insertGetId([
            'name' => 'Reports School',
            'slug' => 'reports-school',
            'email' => 'school@reports.test',
            'phone' => '4444444444',
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
            'email' => 'admin@reports.test',
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

        $subjectId = DB::table('subjects')->insertGetId([
            'organization_id' => $organization,
            'name' => 'Mathematics',
            'code' => 'MATH',
            'type' => 'theory',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentId = DB::table('students')->insertGetId([
            'organization_id' => $organization,
            'first_name' => 'Priya',
            'last_name' => 'Sharma',
            'email' => 'priya@reports.test',
            'class_id' => $classId,
            'status' => 'active',
            'admission_no' => 'ADM-3001',
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'female',
            'date_of_birth' => now()->subYears(15)->toDateString(),
            'guardian_name' => 'Rahul Sharma',
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

        DB::table('attendance')->insertGetId([
            'organization_id' => $organization,
            'student_id' => $studentId,
            'class_id' => $classId,
            'date' => now()->toDateString(),
            'status' => 'present',
            'marked_by' => $adminId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $feeStructureId = DB::table('fee_structures')->insertGetId([
            'organization_id' => $organization,
            'academic_year_id' => $academicYearId,
            'class_id' => $classId,
            'fee_type' => 'Tuition Fee',
            'amount' => 5000,
            'frequency' => 'monthly',
            'is_compulsory' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentFeeId = DB::table('student_fees')->insertGetId([
            'organization_id' => $organization,
            'student_id' => $studentId,
            'fee_structure_id' => $feeStructureId,
            'academic_year_id' => $academicYearId,
            'year' => (int) now()->format('Y'),
            'month' => (string) now()->format('n'),
            'amount' => 5000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 5000,
            'paid_amount' => 5000,
            'balance' => 0,
            'due_date' => now()->toDateString(),
            'status' => 'paid',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('fee_payments')->insertGetId([
            'organization_id' => $organization,
            'student_fee_id' => $studentFeeId,
            'student_id' => $studentId,
            'receipt_number' => 'RCPT-3001',
            'amount' => 5000,
            'payment_method' => 'cash',
            'payment_date' => now()->toDateString(),
            'collected_by' => $adminId,
            'status' => 'success',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $examId = DB::table('exams')->insertGetId([
            'organization_id' => $organization,
            'academic_year_id' => $academicYearId,
            'name' => 'Term Test',
            'exam_type' => 'unit_test',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDay()->toDateString(),
            'status' => 'completed',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $examScheduleId = DB::table('exam_schedules')->insertGetId([
            'exam_id' => $examId,
            'class_id' => $classId,
            'subject_id' => $subjectId,
            'exam_date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '11:00:00',
            'max_marks' => 100,
            'passing_marks' => 33,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('exam_results')->insertGetId([
            'organization_id' => $organization,
            'exam_schedule_id' => $examScheduleId,
            'student_id' => $studentId,
            'total_marks' => 100,
            'obtained_marks' => 85,
            'grade' => 'A',
            'is_absent' => false,
            'entered_by' => $adminId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $admin = \App\Models\User::query()->find($adminId);

        return [$admin, $organization, $classId];
    }

    public function test_reports_page_loads_with_all_module_reports(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ReportsAnalytics')
                ->where('metrics.totalStudents', 1)
                ->where('metrics.attendanceRate', 100)
                ->has('moduleReports', 16)
                ->where('moduleReports.0.id', 'students')
                ->where('moduleReports.1.id', 'attendance')
                ->where('moduleReports.2.id', 'fees')
                ->where('attendanceData.0.month', fn ($month) => is_string($month)));
    }

    public function test_fees_module_filter_returns_fee_records(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/reports?module=fees&month=' . now()->format('Y-m'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('moduleReports.2.rows', 1)
                ->where('moduleReports.2.rows.0.6', 'Paid')
                ->where('moduleReports.2.stats.1.label', 'Collected'));
    }

    public function test_attendance_module_report_lists_student(): void
    {
        [$admin, $organization, $classId] = $this->seedContext();

        $this->actingAs($admin)
            ->get("/reports?module=attendance&class={$classId}&month=" . now()->format('Y-m'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('moduleReports.1.rows', 1)
                ->where('moduleReports.1.rows.0.0', 'Priya Sharma'));
    }

    public function test_exams_module_report_lists_result(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/reports?module=exams&month=' . now()->format('Y-m'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('moduleReports.3.rows', 1)
                ->where('moduleReports.3.rows.0.3', 'Mathematics')
                ->where('moduleReports.3.rows.0.4', '85.00 / 100.00'));
    }

    public function test_students_module_search_filters(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/reports?module=students&search=Priya')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('moduleReports.0.rows', 1));
    }

    public function test_reports_pdf_export_downloads(): void
    {
        [$admin] = $this->seedContext();

        $response = $this->actingAs($admin)->get('/reports/export-pdf?module=students');

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', strtolower($response->headers->get('content-type') ?? ''));
        $this->assertStringContainsString('Students-Report', $response->headers->get('content-disposition') ?? '');
    }
}