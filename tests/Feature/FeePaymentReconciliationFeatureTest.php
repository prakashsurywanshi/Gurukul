<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\FeePayment;
use App\Models\FeeStructure;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeePaymentReconciliationFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_reconciliation_page_loads_with_summary(): void
    {
        [$organization, , $studentFee] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->get('/fees/payments/reconciliation')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/FeePaymentReconciliation')
                ->where('summary.total', 0)
                ->where('summary.reconciled', 0));
    }

    public function test_reconcile_marks_payment_and_logs_action(): void
    {
        [$organization, , $studentFee] = $this->seedFees();

        $admin = $this->createAdmin($organization);
        $payment = $this->createPayment($organization, $studentFee, $admin, 'cash');

        $this->actingAs($admin)
            ->patch("/fees/payments/{$payment->id}/reconcile", ['reconciled' => true])
            ->assertRedirect()
            ->assertSessionHas('success');

        $payment->refresh();
        $this->assertNotNull($payment->reconciled_at);
        $this->assertSame($admin->id, $payment->reconciled_by);
    }

    public function test_unreconcile_clears_reconciliation(): void
    {
        [$organization, , $studentFee] = $this->seedFees();

        $admin = $this->createAdmin($organization);
        $payment = $this->createPayment($organization, $studentFee, $admin, 'cheque');
        $payment->update([
            'reconciled_at' => now(),
            'reconciled_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->patch("/fees/payments/{$payment->id}/reconcile", ['reconciled' => false])
            ->assertRedirect();

        $payment->refresh();
        $this->assertNull($payment->reconciled_at);
        $this->assertNull($payment->reconciled_by);
    }

    public function test_refunded_payment_cannot_be_reconciled(): void
    {
        [$organization, , $studentFee] = $this->seedFees();

        $admin = $this->createAdmin($organization);
        $payment = $this->createPayment($organization, $studentFee, $admin, 'upi');
        $payment->update(['status' => 'refunded']);

        $this->actingAs($admin)
            ->patch("/fees/payments/{$payment->id}/reconcile", ['reconciled' => true])
            ->assertRedirect()
            ->assertSessionHas('error');

        $payment->refresh();
        $this->assertNull($payment->reconciled_at);
    }

    public function test_reconciliation_is_isolated_per_organization(): void
    {
        [$organization, , $studentFee] = $this->seedFees();
        $other = $this->createOrganization('other');
        $academicYear = $this->createAcademicYear($other);
        $class = $this->createClass($other, $academicYear);
        $student = $this->createStudent($other, $class, 'ADM-2001');
        $structure = $this->createFeeStructure($other, $academicYear, $class);
        $otherFee = $this->createStudentFee($other, $student, $structure, $academicYear);

        $admin = $this->createAdmin($organization);
        $otherAdmin = $this->createAdmin($other);

        $this->createPayment($other, $otherFee, $otherAdmin, 'cash');

        $this->actingAs($admin)
            ->get('/fees/payments/reconciliation')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('payments', 0)
                ->where('summary.total', 0));
    }

    public function test_teacher_without_fee_permission_cannot_open_reconciliation(): void
    {
        [$organization] = $this->seedFees();

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->get('/fees/payments/reconciliation')
            ->assertForbidden();
    }

    public function test_reconciled_payment_appears_in_list_with_details(): void
    {
        [$organization, , $studentFee] = $this->seedFees();

        $admin = $this->createAdmin($organization);
        $payment = $this->createPayment($organization, $studentFee, $admin, 'bank_transfer');
        $payment->update(['transaction_id' => 'TXN-ABC-123']);

        $this->actingAs($admin)
            ->get('/fees/payments/reconciliation')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('payments', 1)
                ->where('payments.0.receipt_number', $payment->receipt_number)
                ->where('payments.0.transaction_id', 'TXN-ABC-123')
                ->where('payments.0.student.admission_no', 'ADM-1001'));
    }

    private function createPayment(Organization $organization, StudentFee $studentFee, User $collector, string $method): FeePayment
    {
        return FeePayment::query()->create([
            'organization_id' => $organization->id,
            'student_fee_id' => $studentFee->id,
            'student_id' => $studentFee->student_id,
            'receipt_number' => 'RCPT-'.uniqid(),
            'amount' => 1200,
            'payment_method' => $method,
            'payment_date' => now()->toDateString(),
            'collected_by' => $collector->id,
            'status' => 'success',
        ]);
    }

    private function seedFees(): array
    {
        $organization = $this->createOrganization();
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);
        $student = $this->createStudent($organization, $class);
        $structure = $this->createFeeStructure($organization, $academicYear, $class);
        $studentFee = $this->createStudentFee($organization, $student, $structure, $academicYear);

        return [$organization, $student, $studentFee];
    }

    private function createClass(Organization $organization, AcademicYear $academicYear): SchoolClass
    {
        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);
    }

    private function createStudent(Organization $organization, SchoolClass $class, string $admissionNo = 'ADM-1001'): Student
    {
        return Student::query()->create([
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
            'phone' => '9876543210',
            'status' => 'active',
        ]);
    }

    private function createFeeStructure(Organization $organization, AcademicYear $academicYear, SchoolClass $class): FeeStructure
    {
        return FeeStructure::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'fee_type' => 'Tuition Fee',
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