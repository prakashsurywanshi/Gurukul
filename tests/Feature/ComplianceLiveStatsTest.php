<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\ComplianceItem;
use App\Models\CompliancePack;
use App\Models\FeeConcessionRequest;
use App\Models\FeeStructure;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComplianceLiveStatsTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    private User $admin;

    private User $teacher;

    private Student $studentOne;

    private Student $studentTwo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->organization = Organization::query()->create([
            'name' => 'Live Stats Test School',
            'slug' => 'live-stats-test-school',
            'email' => 'live-stats-test@example.com',
        ]);
        $this->admin = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
        $this->teacher = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $year = AcademicYear::query()->create([
            'organization_id' => $this->organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);
        $schoolClass = SchoolClass::query()->create([
            'organization_id' => $this->organization->id,
            'academic_year_id' => $year->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);
        $this->studentOne = Student::query()->create([
            'organization_id' => $this->organization->id,
            'class_id' => $schoolClass->id,
            'admission_no' => 'ADM-9001',
            'roll_number' => '1',
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => '9876543210',
            'status' => 'active',
        ]);
        $this->studentTwo = Student::query()->create([
            'organization_id' => $this->organization->id,
            'class_id' => $schoolClass->id,
            'admission_no' => 'ADM-9002',
            'roll_number' => '2',
            'first_name' => 'Ishita',
            'last_name' => 'Sharma',
            'date_of_birth' => '2011-06-21',
            'gender' => 'female',
            'admission_date' => '2026-04-11',
            'father_name' => 'Vikram Sharma',
            'phone' => '9876543211',
            'status' => 'active',
        ]);

        $feeStructure = FeeStructure::query()->create([
            'organization_id' => $this->organization->id,
            'academic_year_id' => $year->id,
            'class_id' => $schoolClass->id,
            'fee_type' => 'Tuition Fee',
            'amount' => 5000,
            'frequency' => 'monthly',
            'description' => 'Monthly tuition',
            'status' => 'active',
        ]);
        StudentFee::query()->create([
            'organization_id' => $this->organization->id,
            'student_id' => $this->studentOne->id,
            'fee_structure_id' => $feeStructure->id,
            'academic_year_id' => $year->id,
            'year' => 2026,
            'amount' => 5000,
            'net_amount' => 5000,
            'paid_amount' => 4500,
            'balance' => 500,
            'due_date' => '2026-09-10',
            'status' => 'partial',
        ]);

        Attendance::query()->create([
            'organization_id' => $this->organization->id,
            'student_id' => $this->studentOne->id,
            'class_id' => $schoolClass->id,
            'date' => now()->subDays(2)->toDateString(),
            'status' => 'present',
            'marked_by' => $this->admin->id,
        ]);
        Attendance::query()->create([
            'organization_id' => $this->organization->id,
            'student_id' => $this->studentTwo->id,
            'class_id' => $schoolClass->id,
            'date' => now()->subDays(2)->toDateString(),
            'status' => 'present',
            'marked_by' => $this->admin->id,
        ]);
        Attendance::query()->create([
            'organization_id' => $this->organization->id,
            'student_id' => $this->studentTwo->id,
            'class_id' => $schoolClass->id,
            'date' => now()->subDays(1)->toDateString(),
            'status' => 'absent',
            'marked_by' => $this->admin->id,
        ]);

        FeeConcessionRequest::query()->create([
            'organization_id' => $this->organization->id,
            'student_id' => $this->studentTwo->id,
            'amount' => 1000,
            'applied_amount' => 1000,
            'status' => 'pending',
            'reason' => 'Parent financial difficulty',
            'requested_by' => $this->teacher->id,
        ]);
    }

    public function test_compliance_overview_exposes_live_school_stats(): void
    {
        $this->actingAs($this->admin)
            ->get('/compliance')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Compliance')
                ->has('liveStats')
                ->where('liveStats.students', 2)
                ->where('liveStats.activeStudents', 2)
                ->where('liveStats.staff', 2)
                ->where('liveStats.staffStudentRatio', 1)
                ->where('liveStats.attendanceRate30d', 67)
                ->where('liveStats.feesDueCount', 1)
                ->where('liveStats.pendingConcessions', 1)
                ->where('summary.healthScore', 0)
                ->where('summary.completion', 0));
    }

    public function test_compliance_overview_health_score_reflects_completion(): void
    {
        $pack = CompliancePack::query()->create([
            'organization_id' => $this->organization->id,
            'name' => 'RTE Requirements',
            'category' => 'RTE',
            'status' => 'active',
        ]);
        ComplianceItem::query()->create([
            'organization_id' => $this->organization->id,
            'compliance_pack_id' => $pack->id,
            'title' => 'Display school information on website',
            'frequency' => 'yearly',
            'status' => 'compliant',
            'verified_at' => now()->toDateString(),
        ]);
        ComplianceItem::query()->create([
            'organization_id' => $this->organization->id,
            'compliance_pack_id' => $pack->id,
            'title' => 'File annual recognition renewal',
            'frequency' => 'yearly',
            'due_date' => now()->subDays(10)->toDateString(),
            'status' => 'pending',
        ]);

        $this->actingAs($this->admin)
            ->get('/compliance')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Compliance')
                ->where('summary.completion', 50)
                ->where('summary.overdue', 1)
                ->where('summary.healthScore', 53));
    }

    public function test_compliance_csv_export_contains_checklist_items(): void
    {
        $pack = CompliancePack::query()->create([
            'organization_id' => $this->organization->id,
            'name' => 'CBSE Affiliation',
            'category' => 'CBSE',
            'status' => 'active',
        ]);
        ComplianceItem::query()->create([
            'organization_id' => $this->organization->id,
            'compliance_pack_id' => $pack->id,
            'title' => 'Renew affiliation certificate',
            'frequency' => 'yearly',
            'due_date' => '2026-11-30',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->admin)
            ->get('/compliance/export')
            ->assertOk();

        $csv = (string) $response->streamedContent();
        $this->assertStringContainsString('Pack,Category,Item,Frequency,"Due Date",Status,"Verified At"', $csv);
        $this->assertStringContainsString('CBSE Affiliation', $csv);
        $this->assertStringContainsString('Renew affiliation certificate', $csv);
        $this->assertStringContainsString('2026-11-30', $csv);
    }

    public function test_compliance_live_stats_reject_non_admin(): void
    {
        $librarian = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'librarian',
        ]);

        $this->actingAs($librarian)
            ->get('/compliance')
            ->assertForbidden();

        $this->actingAs($librarian)
            ->get('/compliance/export')
            ->assertForbidden();
    }

    public function test_compliance_calendar_exposes_events_summary(): void
    {
        $pack = CompliancePack::query()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Mandatory Filings',
            'category' => 'Statutory',
            'status' => 'active',
        ]);
        ComplianceItem::query()->create([
            'organization_id' => $this->organization->id,
            'compliance_pack_id' => $pack->id,
            'title' => 'GST monthly return',
            'frequency' => 'monthly',
            'due_date' => now()->subDays(3)->toDateString(),
            'status' => 'pending',
        ]);

        $this->actingAs($this->admin)
            ->get('/compliance/calendar')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ComplianceCalendar')
                ->has('events', 1)
                ->where('events.0.overdue', true)
                ->where('summary.overdue', 1));
    }
}