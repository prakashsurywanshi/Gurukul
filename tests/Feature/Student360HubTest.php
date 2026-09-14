<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\CertificateTemplate;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\ExamSchedule;
use App\Models\FeeStructure;
use App\Models\HealthRecord;
use App\Models\Incident;
use App\Models\IssuedCertificate;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentExit;
use App\Models\StudentFee;
use App\Models\Subject;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Student360HubTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_sees_full_hub_summaries_for_student(): void
    {
        $organization = $this->createOrganization('Gurukul Hub School');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        [$student, $class, $year] = $this->seedStudent($organization);
        $subject = $this->createSubject($organization);

        $feeStructure = FeeStructure::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'class_id' => $class->id,
            'fee_type' => 'tuition',
            'amount' => 1000,
            'frequency' => 'monthly',
            'status' => 'active',
        ]);

        foreach ([
            ['amount' => 500, 'net_amount' => 500, 'paid_amount' => 500, 'balance' => 0, 'status' => 'paid'],
            ['amount' => 1000, 'net_amount' => 1000, 'paid_amount' => 500, 'balance' => 500, 'status' => 'partial'],
            ['amount' => 2000, 'net_amount' => 2000, 'paid_amount' => 0, 'balance' => 2000, 'status' => 'pending'],
        ] as $index => $bill) {
            StudentFee::query()->create([
                'organization_id' => $organization->id,
                'student_id' => $student->id,
                'fee_structure_id' => $feeStructure->id,
                'academic_year_id' => $year->id,
                'month' => 'April',
                'year' => 2026,
                'amount' => $bill['amount'],
                'discount' => 0,
                'fine' => 0,
                'net_amount' => $bill['net_amount'],
                'paid_amount' => $bill['paid_amount'],
                'balance' => $bill['balance'],
                'due_date' => '2026-04-10',
                'status' => $bill['status'],
            ]);
        }

        foreach ([['2026-05-01', 'present'], ['2026-05-02', 'present'], ['2026-05-03', 'absent'], ['2026-05-04', 'late']] as [$date, $status]) {
            Attendance::query()->create([
                'organization_id' => $organization->id,
                'student_id' => $student->id,
                'class_id' => $class->id,
                'date' => $date,
                'status' => $status,
                'marked_by' => $admin->id,
            ]);
        }

        $exam = Exam::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => 'First Term',
            'exam_type' => 'mid_term',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-15',
            'status' => 'completed',
        ]);

        $schedule = ExamSchedule::query()->create([
            'exam_id' => $exam->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'exam_date' => '2026-09-05',
            'start_time' => '09:00:00',
            'end_time' => '10:30:00',
            'max_marks' => 100,
            'passing_marks' => 33,
        ]);

        ExamResult::query()->create([
            'organization_id' => $organization->id,
            'exam_schedule_id' => $schedule->id,
            'student_id' => $student->id,
            'theory_marks' => 82,
            'practical_marks' => null,
            'total_marks' => 100,
            'obtained_marks' => 82,
            'grade' => 'A',
            'is_absent' => false,
            'entered_by' => $admin->id,
        ]);

        $template = CertificateTemplate::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Participation',
            'type' => 'participation',
            'status' => 'active',
        ]);

        IssuedCertificate::query()->create([
            'organization_id' => $organization->id,
            'certificate_template_id' => $template->id,
            'student_id' => $student->id,
            'certificate_number' => 'CERT-HUB-001',
            'student_name' => 'Aarav Mehta',
            'class' => '10',
            'section' => 'A',
            'reason' => 'Annual day participation',
            'issue_date' => '2026-08-15',
            'issued_by' => 'Principal',
            'created_by' => $admin->id,
        ]);

        Incident::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'type' => 'behavior',
            'title' => 'Late submission',
            'incident_date' => '2026-09-08',
            'status' => 'open',
            'created_by' => $admin->id,
        ]);

        Incident::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'type' => 'behavior',
            'title' => 'Resolved counselling',
            'incident_date' => '2026-09-09',
            'status' => 'resolved',
            'created_by' => $admin->id,
        ]);

        Incident::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'type' => 'academic',
            'title' => 'Topper badge',
            'incident_date' => '2026-09-10',
            'status' => 'resolved',
            'created_by' => $admin->id,
        ]);

        HealthRecord::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'record_date' => '2026-09-08',
            'blood_group' => 'O+',
            'height_cm' => 152,
            'weight_kg' => 42,
            'blood_pressure' => '110/70',
            'allergies' => 'Dust',
            'medical_conditions' => null,
            'recorded_by' => $admin->id,
        ]);

        StudentExit::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'type' => 'exit',
            'status' => 'pending',
            'reason' => 'transfer_out',
            'exit_date' => '2026-12-20',
            'tc_number' => null,
            'tc_issued_date' => null,
            'note' => 'Shifting to another city',
            'acted_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/students/'.$student->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/students/StudentDetails')
                ->has('hub.fees')
                ->where('hub.fees.bill_count', 3)
                ->where('hub.fees.outstanding_bills', 2)
                ->where('hub.fees.total_paid', 1000)
                ->where('hub.fees.total_pending', 2500)
                ->where('hub.attendance.present', 2)
                ->where('hub.attendance.absent', 1)
                ->where('hub.attendance.late', 1)
                ->where('hub.attendance.total', 4)
                ->where('hub.exam.exam_id', $exam->id)
                ->where('hub.exam.exam_name', 'First Term')
                ->where('hub.exam.obtained', 82)
                ->where('hub.exam.max', 100)
                ->where('hub.exam.grade', 'A')
                ->where('hub.exam.exam_count', 1)
                ->where('hub.certificates.count', 1)
                ->where('hub.certificates.latest.0.certificate_number', 'CERT-HUB-001')
                ->where('hub.behavior.total', 2)
                ->where('hub.behavior.open', 1)
                ->where('hub.behavior.resolved', 1)
                ->where('hub.behavior.latest.title', 'Resolved counselling')
                ->where('hub.health.count', 1)
                ->where('hub.health.latest.blood_group', 'O+')
                ->where('hub.exit.status', 'pending')
                ->where('hub.exit.reason', 'transfer_out')
                ->where('hub.enrollment_status', 'active')
            );
    }

    public function test_hub_returns_defaults_when_student_has_no_related_records(): void
    {
        $organization = $this->createOrganization('Gurukul Empty Hub');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        [$student] = $this->seedStudent($organization);

        $this->actingAs($admin)
            ->get('/students/'.$student->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/students/StudentDetails')
                ->where('hub.fees.bill_count', 0)
                ->where('hub.fees.outstanding_bills', 0)
                ->where('hub.fees.total_paid', 0)
                ->where('hub.fees.total_pending', 0)
                ->where('hub.attendance.total', 0)
                ->where('hub.exam.exam_id', null)
                ->where('hub.exam.exam_count', 0)
                ->where('hub.certificates.count', 0)
                ->where('hub.behavior.total', 0)
                ->where('hub.health.count', 0)
                ->where('hub.exit', null)
                ->where('hub.enrollment_status', 'active')
            );
    }

    public function test_hub_does_not_leak_related_records_from_other_organizations(): void
    {
        $organization = $this->createOrganization('Gurukul Hub Primary');
        $otherOrg = $this->createOrganization('Gurukul Hub Other');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($otherOrg);
        $admin = $this->createUser($organization, 'admin');

        [$student, $class, $year] = $this->seedStudent($organization);
        [$otherStudent, $otherClass, $otherYear] = $this->seedStudentInOrg($otherOrg, 'Other');

        $otherFeeStructure = FeeStructure::query()->create([
            'organization_id' => $otherOrg->id,
            'academic_year_id' => $otherYear->id,
            'class_id' => $otherClass->id,
            'fee_type' => 'tuition',
            'amount' => 900,
            'frequency' => 'monthly',
            'status' => 'active',
        ]);

        StudentFee::query()->create([
            'organization_id' => $otherOrg->id,
            'student_id' => $otherStudent->id,
            'fee_structure_id' => $otherFeeStructure->id,
            'academic_year_id' => $otherYear->id,
            'year' => 2026,
            'amount' => 900,
            'net_amount' => 900,
            'paid_amount' => 0,
            'balance' => 900,
            'due_date' => '2026-04-10',
            'status' => 'pending',
        ]);

        Incident::query()->create([
            'organization_id' => $otherOrg->id,
            'student_id' => $otherStudent->id,
            'type' => 'behavior',
            'title' => 'Other org incident',
            'incident_date' => '2026-09-08',
            'status' => 'open',
            'created_by' => $admin->id,
        ]);

        HealthRecord::query()->create([
            'organization_id' => $otherOrg->id,
            'student_id' => $otherStudent->id,
            'record_date' => '2026-09-08',
            'blood_group' => 'B-',
            'recorded_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/students/'.$student->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('hub.fees.bill_count', 0)
                ->where('hub.behavior.total', 0)
                ->where('hub.health.count', 0)
                ->where('hub.exit', null)
            );
    }

    public function test_staff_without_student_details_permission_cannot_open_student(): void
    {
        $organization = $this->createOrganization('Gurukul Hub Access');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $this->createUser($organization, 'admin');

        [$student] = $this->seedStudent($organization);

        $driver = $this->createUser($organization, 'driver');

        $this->actingAs($driver)
            ->get('/students/'.$student->id)
            ->assertForbidden();
    }

    private function createOrganization(string $name): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => $name,
            'slug' => 'hub-org-'.$counter,
            'email' => 'hub-org-'.$counter.'@example.com',
            'type' => 'school',
            'status' => 'active',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' Hub '.$counter,
            'email' => $role.'-hub-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
            'status' => 'active',
        ]);
    }

    private function seedStudent(Organization $organization): array
    {
        return $this->seedStudentInOrg($organization, 'Hub');
    }

    private function seedStudentInOrg(Organization $organization, string $suffix): array
    {
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM-'.$suffix.'-'.random_int(1000, 9999),
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

        return [$student, $class, $year];
    }

    private function createSubject(Organization $organization): Subject
    {
        return Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Mathematics',
            'code' => 'MTH',
        ]);
    }
}