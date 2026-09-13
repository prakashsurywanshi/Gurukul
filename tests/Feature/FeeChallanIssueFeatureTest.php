<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\FeeStructure;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeeChallanIssueFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_issue_page_lists_pending_fees(): void
    {
        [$organization, , $studentFee] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get('/fees/challans/issue')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/IssueChallans')
                ->has('students', 1)
                ->has('students.0.fees', 1)
                ->where('students.0.total_due', 5000));
    }

    public function test_issue_page_excludes_students_without_pending_fees(): void
    {
        [$organization, $student, $studentFee] = $this->seedFees();
        $studentFee->update(['paid_amount' => 5000, 'balance' => 0, 'status' => 'paid']);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get('/fees/challans/issue')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('students', 0));
    }

    public function test_issue_page_filters_by_class(): void
    {
        [$organization, , , $academicYear] = $this->seedFees();
        $otherClass = $this->createClass($organization, $academicYear, '9', 'B');
        $otherStudent = $this->createStudent($organization, $otherClass, 'ADM-2002');
        $structure = $this->createFeeStructure($organization, $academicYear, $otherClass);
        $this->createStudentFee($organization, $otherStudent, $structure, $academicYear);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get('/fees/challans/issue')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('students', 2));

        $this->actingAs($admin)
            ->get('/fees/challans/issue?class='.$otherClass->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('students', 1)
                ->where('selectedClassId', $otherClass->id)
                ->where('students.0.first_name', $otherStudent->first_name));
    }

    public function test_batch_download_returns_pdf(): void
    {
        [$organization, , $studentFee] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $response = $this->actingAs($admin)
            ->get('/fees/challans/issue/batch?ids[]='.$studentFee->id);

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
    }

    public function test_batch_excludes_fee_from_other_organization(): void
    {
        [$organization] = $this->seedFees();
        $other = $this->createOrganization('other');
        $academicYear = $this->createAcademicYear($other);
        $class = $this->createClass($other, $academicYear);
        $student = $this->createStudent($other, $class, 'ADM-3001');
        $structure = $this->createFeeStructure($other, $academicYear, $class);
        $otherFee = $this->createStudentFee($other, $student, $structure, $academicYear);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get('/fees/challans/issue/batch?ids[]='.$otherFee->id)
            ->assertRedirect()
            ->assertSessionHas('error');
    }

    public function test_batch_rejects_empty_selection(): void
    {
        [$organization] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->get('/fees/challans/issue/batch')
            ->assertRedirect()
            ->assertSessionHasErrors('ids');
    }

    public function test_batch_excludes_cleared_fees(): void
    {
        [$organization, , $studentFee] = $this->seedFees();
        $studentFee->update(['paid_amount' => 5000, 'balance' => 0, 'status' => 'paid']);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get('/fees/challans/issue/batch?ids[]='.$studentFee->id)
            ->assertRedirect()
            ->assertSessionHas('error');
    }

    public function test_batch_excludes_hostel_fees(): void
    {
        [$organization, $student] = $this->seedFees();
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);
        $hostelStructure = $this->createFeeStructure($organization, $academicYear, $class, 'Hostel Fee - Boys Hostel');
        $hostelFee = $this->createStudentFee($organization, $student, $hostelStructure, $academicYear);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get('/fees/challans/issue/batch?ids[]='.$hostelFee->id)
            ->assertRedirect()
            ->assertSessionHas('error');
    }

    public function test_teacher_without_fee_permission_cannot_open_issue_screen(): void
    {
        [$organization] = $this->seedFees();

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->get('/fees/challans/issue')
            ->assertForbidden();
    }

    private function seedFees(): array
    {
        $organization = $this->createOrganization();
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);
        $student = $this->createStudent($organization, $class);
        $structure = $this->createFeeStructure($organization, $academicYear, $class);
        $studentFee = $this->createStudentFee($organization, $student, $structure, $academicYear);

        return [$organization, $student, $studentFee, $academicYear];
    }

    private function createClass(Organization $organization, AcademicYear $academicYear, string $name = '10', string $section = 'A'): SchoolClass
    {
        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => $name,
            'section' => $section,
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);
    }

    private function createStudent(Organization $organization, SchoolClass $class, string $admissionNo = 'ADM-1001'): Student
    {
        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => $admissionNo,
            'roll_number' => '5',
            'first_name' => $class->name === '9' ? 'Ishaan' : 'Aarav',
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
            'academic_year_id' => $class->academic_year_id,
            'class_id' => $class->id,
            'session' => '2026-2027',
            'roll_number' => '5',
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => '2026-04-10',
        ]);

        return $student;
    }

    private function createFeeStructure(Organization $organization, AcademicYear $academicYear, SchoolClass $class, string $feeType = 'Tuition Fee'): FeeStructure
    {
        return FeeStructure::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'fee_type' => $feeType,
            'amount' => 5000,
            'frequency' => 'monthly',
            'description' => 'Monthly tuition',
            'status' => 'active',
        ]);
    }

    private function createStudentFee(Organization $organization, Student $student, FeeStructure $structure, AcademicYear $academicYear): StudentFee
    {
        return StudentFee::query()->create([
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
            'name' => 'Gurukul Public School'.($suffix ? " {$suffix}" : ''),
            'slug' => 'gurukul-public-school'.($suffix ? "-{$suffix}" : ''),
            'email' => ($suffix ? "{$suffix}-" : '').'admin@gurukul.test',
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

    private function createAcademicYear(Organization $organization, string $name = '2026-2027', bool $isCurrent = true): AcademicYear
    {
        return AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => $isCurrent,
            'status' => 'active',
        ]);
    }
}