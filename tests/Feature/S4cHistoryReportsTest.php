<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ComplianceItem;
use App\Models\CompliancePack;
use App\Models\FeeStructure;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentFee;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class S4cHistoryReportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.timezone' => 'UTC']);
        date_default_timezone_set('UTC');
    }

    public function test_due_slip_history_page_renders_empty_for_admin(): void
    {
        [$organization] = $this->seedFees();
        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get('/fees/due-slips/history')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DueSlipHistory')
                ->has('logs', 0)
                ->where('summary.totalSlips', 0)
            );
    }

    public function test_printing_due_slip_records_history_entry(): void
    {
        [$organization, $student] = $this->seedFees();
        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->get("/fees/due-slips/{$student->id}/print")->assertOk();

        $this->assertDatabaseHas('fee_due_slip_logs', [
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'via' => 'print',
            'total_due' => 5000,
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/fees/due-slips/history')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DueSlipHistory')
                ->has('logs', 1)
                ->where('logs.0.student', 'Aarav Mehta')
                ->where('logs.0.admission_no', 'ADM-1001')
                ->where('logs.0.via', 'print')
                ->where('logs.0.total_due', 5000)
                ->where('summary.totalSlips', 1)
                ->where('summary.todaySlips', 1)
            );
    }

    public function test_downloading_due_slip_logs_download_via(): void
    {
        [$organization, $student] = $this->seedFees();
        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->get("/fees/due-slips/{$student->id}/download")->assertOk();

        $this->assertDatabaseHas('fee_due_slip_logs', [
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'via' => 'download',
        ]);
    }

    public function test_due_slip_history_is_scoped_to_organization(): void
    {
        [$organization, $student] = $this->seedFees();
        $other = $this->createOrganization('other');
        $admin = $this->createAdmin($organization);
        $otherAdmin = $this->createAdmin($other);

        $this->actingAs($admin)->get("/fees/due-slips/{$student->id}/print")->assertOk();

        $this->actingAs($otherAdmin)
            ->get('/fees/due-slips/history')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('logs', 0));
    }

    public function test_teacher_without_fee_permission_cannot_open_history(): void
    {
        [$organization] = $this->seedFees();

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)->get('/fees/due-slips/history')->assertForbidden();
    }

    public function test_compliance_calendar_renders_deadlines_for_admin(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createAdmin($organization);

        $pack = CompliancePack::query()->create([
            'organization_id' => $organization->id,
            'name' => 'CBSE Affiliation Requirements',
            'category' => 'CBSE',
            'description' => 'Annual compliance',
            'status' => 'active',
        ]);

        ComplianceItem::query()->create([
            'organization_id' => $organization->id,
            'compliance_pack_id' => $pack->id,
            'title' => 'Renew school recognition certificate',
            'frequency' => 'yearly',
            'due_date' => now()->addMonths(2)->toDateString(),
            'status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->get('/compliance/calendar')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ComplianceCalendar')
                ->has('events', 1)
                ->where('events.0.title', 'Renew school recognition certificate')
                ->where('events.0.dueDate', now()->addMonths(2)->toDateString())
                ->where('events.0.status', 'pending')
                ->where('events.0.pack', 'CBSE Affiliation Requirements')
                ->where('summary.events', 1)
                ->where('summary.dueThisMonth', 0)
            );
    }

    public function test_compliance_calendar_scopes_events_to_organization(): void
    {
        $organization = $this->createOrganization();
        $other = $this->createOrganization('other');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createAdmin($organization);

        $otherPack = CompliancePack::query()->create([
            'organization_id' => $other->id,
            'name' => 'Other Pack',
            'category' => 'Other',
            'status' => 'active',
        ]);

        ComplianceItem::query()->create([
            'organization_id' => $other->id,
            'compliance_pack_id' => $otherPack->id,
            'title' => 'Other item',
            'frequency' => 'once',
            'due_date' => now()->addDay()->toDateString(),
            'status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->get('/compliance/calendar')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('events', 0));
    }

    public function test_compliance_calendar_rejects_non_admin(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)->get('/compliance/calendar')->assertForbidden();
    }

    public function test_cbc_reports_tab_returns_report_payload(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get('/cbc?tab=reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Cbc')
                ->where('tab', 'reports')
                ->has('reports.byStrand', 0)
                ->where('reports.proficiencyRate', 0)
                ->where('reports.levelTotals.emerging', 0)
            );
    }

    private function seedFees(): array
    {
        $organization = $this->createOrganization();
        $academicYear = $this->createAcademicYear($organization);
        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM-1001',
            'roll_number' => '5',
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => '9876543210',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'session' => $academicYear->name,
            'roll_number' => '5',
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => '2026-04-10',
        ]);

        $structure = FeeStructure::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'fee_type' => 'Tuition Fee',
            'amount' => 5000,
            'frequency' => 'monthly',
            'description' => 'Monthly tuition',
            'status' => 'active',
        ]);

        StudentFee::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'fee_structure_id' => $structure->id,
            'academic_year_id' => $academicYear->id,
            'month' => 'August',
            'year' => 2026,
            'amount' => 5000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 5000,
            'paid_amount' => 0,
            'balance' => 5000,
            'due_date' => '2026-08-10',
            'status' => 'pending',
        ]);

        return [$organization, $student];
    }

    private function createAdmin(Organization $organization): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    private function createOrganization(string $suffix = ''): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School' . ($suffix ? " {$suffix}" : ''),
            'slug' => 'gurukul-public-school' . ($suffix ? "-{$suffix}" : ''),
            'email' => ($suffix ? "{$suffix}-" : '') . 'admin@gurukul.test',
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
            'settings' => [],
        ]);
    }

    private function createAcademicYear(Organization $organization): AcademicYear
    {
        return AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);
    }
}