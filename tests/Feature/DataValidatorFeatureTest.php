<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\FeeStructure;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentFee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DataValidatorFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_reports_validation_checks(): void
    {
        [$organization, $admin] = $this->seedOrganization();
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);

        $valid = $this->createStudent($organization, $class, 'ADM-1001', '9123456789');
        $noContact = $this->createStudent($organization, $class, 'ADM-1002', null);

        Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => null,
            'admission_no' => 'ADM-3001',
            'roll_number' => '6',
            'first_name' => 'NoClass',
            'last_name' => 'Singh',
            'date_of_birth' => '2012-05-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'R Singh',
            'phone' => '9123456785',
            'status' => 'active',
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

        $studentFee = StudentFee::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $valid->id,
            'fee_structure_id' => $structure->id,
            'academic_year_id' => $academicYear->id,
            'month' => 'August',
            'year' => 2026,
            'amount' => 5000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 5000,
            'paid_amount' => 2000,
            'balance' => 3000,
            'due_date' => '2026-08-10',
            'status' => 'paid',
        ]);

        $this->actingAs($admin)
            ->get('/data-validator')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DataValidator')
                ->has('checks', 5)
                ->where('checks.0.count', 1)
                ->where('checks.0.items.0.id', (string) $noContact->id)
                ->where('checks.1.count', 1)
                ->where('checks.2.count', 1)
                ->where('checks.3.count', 0)
                ->where('checks.4.count', 1)
                ->where('checks.4.severity', 'error')
                ->where('checks.4.items.0.id', (string) $studentFee->id));
    }

    public function test_no_enrollment_and_paid_with_balance_flags(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        $this->actingAs($admin)
            ->get('/data-validator')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('checks', 5)
                ->where('checks.0.count', 0)
                ->where('checks.4.count', 0));
    }

    public function test_teacher_cannot_open_data_validator(): void
    {
        [$organization] = $this->seedOrganization();
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->get('/data-validator')
            ->assertForbidden();
    }

    private function seedOrganization(): array
    {
        $organization = $this->createOrganization();
        $admin = $this->createAdmin($organization);

        return [$organization, $admin];
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

    private function createStudent(Organization $organization, SchoolClass $class, string $admissionNo, ?string $phone): Student
    {
        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => $admissionNo,
            'roll_number' => '5',
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => $phone,
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

    private function createAdmin(Organization $organization): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    private function createOrganization(): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school',
            'email' => 'admin@gurukul.test',
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