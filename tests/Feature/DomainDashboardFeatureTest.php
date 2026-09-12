<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DomainDashboardFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(): array
    {
        $organization = DB::table('organizations')->insertGetId([
            'name' => 'Dashboard School',
            'slug' => 'dashboard-school',
            'email' => 'school@dash.test',
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
            'email' => 'admin@dash.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $academicYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $organization,
            'name' => '2026-2027',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
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

        $studentId = DB::table('students')->insertGetId([
            'organization_id' => $organization,
            'first_name' => 'Priya',
            'last_name' => 'Sharma',
            'email' => 'priya@dash.test',
            'class_id' => $classId,
            'status' => 'active',
            'admission_no' => 'ADM-2001',
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'female',
            'date_of_birth' => now()->subYears(15)->toDateString(),
            'guardian_name' => 'Rahul Sharma',
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
            'year' => 2026,
            'month' => 'September',
            'amount' => 5000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 5000,
            'paid_amount' => 2000,
            'balance' => 3000,
            'due_date' => now()->addDays(10)->toDateString(),
            'status' => 'partial',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('fee_payments')->insertGetId([
            'organization_id' => $organization,
            'student_fee_id' => $studentFeeId,
            'student_id' => $studentId,
            'receipt_number' => 'RCPT-2001',
            'amount' => 2000,
            'payment_method' => 'cash',
            'payment_date' => now()->toDateString(),
            'collected_by' => $adminId,
            'status' => 'success',
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

        $admin = \App\Models\User::query()->find($adminId);

        return [$admin, $organization, $classId, $studentId];
    }

    public function test_fees_dashboard_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/fees/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DomainDashboard')
                ->where('domain', 'fees')
                ->where('metrics.0.label', 'Total Collected'));
    }

    public function test_accounts_dashboard_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/accounting/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/DomainDashboard')->where('domain', 'accounts'));
    }

    public function test_student_dashboard_loads_with_todays_attendance(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/student-dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DomainDashboard')
                ->where('metrics.0.label', 'Students (This Session)')
                ->where('metrics.2.label', 'Present Today')
                ->where('charts.0.title', 'Students by Class')
                ->where('charts.1.title', 'Gender Distribution'));
    }

    public function test_academics_dashboard_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/academics/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DomainDashboard')
                ->where('metrics.1.label', 'Sections'));
    }

    public function test_front_office_dashboard_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/front-office/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/DomainDashboard')->where('domain', 'front-office'));
    }

    public function test_leads_and_library_dashboards_load(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/leads/dashboard')->assertOk();
        $this->actingAs($admin)->get('/library/dashboard')->assertOk();
    }

    public function test_exams_and_online_exam_dashboards_load(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/exams-dashboard')->assertOk();
        $this->actingAs($admin)->get('/online-exam/dashboard')->assertOk();
    }

    public function test_ptm_lesson_osm_assessment_survey_dashboards_load(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/ptm/dashboard')->assertOk();
        $this->actingAs($admin)->get('/lesson-plans/dashboard')->assertOk();
        $this->actingAs($admin)->get('/osm/dashboard')->assertOk();
        $this->actingAs($admin)->get('/assessment/dashboard')->assertOk();
        $this->actingAs($admin)->get('/survey/dashboard')->assertOk();
    }

    public function test_inventory_transport_hostel_assets_dashboards_load(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/inventory/dashboard')->assertOk();
        $this->actingAs($admin)->get('/transport/dashboard')->assertOk();
        $this->actingAs($admin)->get('/hostel/dashboard')->assertOk();
        $this->actingAs($admin)->get('/assets/dashboard')->assertOk();
    }

    public function test_cbc_dashboard_loads_when_module_enabled(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/cbc/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/DomainDashboard')->where('domain', 'cbc'));
    }

    public function test_unknown_domain_is_404(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/dashboard/nope')->assertNotFound();
    }
}