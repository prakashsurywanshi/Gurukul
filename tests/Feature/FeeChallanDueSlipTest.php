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

class FeeChallanDueSlipTest extends TestCase
{
    use RefreshDatabase;

    public function test_fee_challans_page_renders_for_admin(): void
    {
        [$organization] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get('/fees/challans')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/FeeChallans'));
    }

    public function test_due_slips_page_renders_with_dues_for_admin(): void
    {
        [$organization, $student] = $this->seedFees();

        $admin = $this->createAdmin($organization);
        $activeYearId = $organization->selectedAcademicYear()?->id;
        $this->assertNotNull($activeYearId);
        $this->assertTrue(StudentFee::query()->where('organization_id', $organization->id)->where('student_id', $student->id)->exists());

        $this->actingAs($admin)
            ->get('/fees/due-slips')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/DueSlips'));
    }

    public function test_fee_challan_prints_document(): void
    {
        [$organization, , $studentFee] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get("/fees/challans/{$studentFee->id}/print")
            ->assertOk()
            ->assertSee('Fee Challan')
            ->assertSee('CHLN-')
            ->assertSee('Amount Due in Words')
            ->assertSee('5,000.00');
    }

    public function test_fee_challan_downloads_pdf(): void
    {
        [$organization, , $studentFee] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $response = $this->actingAs($admin)
            ->get("/fees/challans/{$studentFee->id}/download");

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type') ?: '');
        $this->assertStringContainsString('Fee-Challan', $response->headers->get('content-disposition') ?: '');
    }

    public function test_due_slip_prints_document(): void
    {
        [$organization, $student] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get("/fees/due-slips/{$student->id}/print")
            ->assertOk()
            ->assertSee('Fee Due Slip')
            ->assertSee('Amount Due in Words')
            ->assertSee('Tuition Fee');
    }

    public function test_due_slip_downloads_pdf(): void
    {
        [$organization, $student] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $response = $this->actingAs($admin)
            ->get("/fees/due-slips/{$student->id}/download");

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type') ?: '');
        $this->assertStringContainsString('Fee-Due-Slip', $response->headers->get('content-disposition') ?: '');
    }

    public function test_challan_of_another_organization_is_not_visible(): void
    {
        [$organization, , $studentFee] = $this->seedFees();
        $other = $this->createOrganization('other');

        $admin = $this->createAdmin($other);

        $this->actingAs($admin)
            ->get("/fees/challans/{$studentFee->id}/print")
            ->assertNotFound();
    }

    public function test_teacher_without_fee_permission_cannot_open_challans(): void
    {
        [$organization] = $this->seedFees();

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->get('/fees/challans')
            ->assertForbidden();
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

        $studentFee = StudentFee::query()->create([
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

        return [$organization, $student, $studentFee];
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