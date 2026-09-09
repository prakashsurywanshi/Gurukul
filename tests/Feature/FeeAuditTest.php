<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\FeeAudit;
use App\Models\FeePayment;
use App\Models\FeeStructure;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentFee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeeAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_fee_audit_page_renders_for_admin(): void
    {
        [$organization] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get('/fees/audit')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/FeeAudit'));
    }

    public function test_fee_type_creation_is_logged(): void
    {
        [$organization] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/types', [
            'name' => 'Sports Fee',
            'description' => 'Annual sports contribution',
        ])->assertRedirect();

        $this->assertDatabaseHas('fee_audits', [
            'organization_id' => $organization->id,
            'action' => 'fee_type.created',
            'user_id' => $admin->id,
        ]);
    }

    public function test_fee_structure_creation_is_logged(): void
    {
        [$organization] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/structures', [
            'class' => '10',
            'section' => 'A',
            'feeType' => 'Exam Fee',
            'amount' => 2000,
            'frequency' => 'annually',
            'description' => 'Board exam fee',
        ])->assertRedirect();

        $audit = FeeAudit::query()->where('action', 'fee_structure.created')->first();
        $this->assertNotNull($audit);
        $this->assertEquals(2000, (float) $audit->amount);
        $this->assertEquals('Exam Fee', $audit->meta['fee_type']);
        $this->assertNull($audit->student_id);
    }

    public function test_fee_assignment_is_logged(): void
    {
        [$organization, $student, $studentFee, $structure] = $this->seedFees();
        $studentFee->delete();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/assign', [
            'feeType' => $structure->id,
            'dueDate' => '2026-08-10',
            'studentIds' => [$student->id],
        ])->assertRedirect();

        $audit = FeeAudit::query()->where('action', 'fee.assigned')->first();
        $this->assertNotNull($audit);
        $this->assertEquals(1, $audit->meta['count']);
        $this->assertEquals(5000, (float) $audit->amount);
    }

    public function test_payment_collection_is_logged(): void
    {
        [$organization, , $studentFee] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/payments', [
            'fee_id' => $studentFee->id,
            'amount' => 2000,
            'payment_method' => 'cash',
        ])->assertRedirect();

        $audit = FeeAudit::query()->where('action', 'payment.collected')->first();
        $this->assertNotNull($audit);
        $this->assertEquals(2000, (float) $audit->amount);
        $this->assertEquals($studentFee->id, $audit->student_fee_id);
        $this->assertNotNull($audit->fee_payment_id);
        $this->assertEquals($studentFee->student_id, $audit->student_id);
    }

    public function test_payment_revert_is_logged(): void
    {
        [$organization, , $studentFee] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $payment = FeePayment::query()->create([
            'organization_id' => $organization->id,
            'student_fee_id' => $studentFee->id,
            'student_id' => $studentFee->student_id,
            'receipt_number' => 'RCPT-TEST-001',
            'amount' => 1000,
            'payment_method' => 'cash',
            'payment_date' => now()->toDateString(),
            'collected_by' => $admin->id,
            'status' => 'success',
        ]);

        $this->actingAs($admin)->post("/fees/payments/{$payment->id}/revert", [
            'reason' => 'Wrong amount collected',
        ])->assertRedirect();

        $audit = FeeAudit::query()->where('action', 'payment.reverted')->first();
        $this->assertNotNull($audit);
        $this->assertEquals(1000, (float) $audit->amount);
        $this->assertEquals('Wrong amount collected', $audit->meta['reason']);
    }

    public function test_audit_logs_are_isolated_per_organization(): void
    {
        [$organization] = $this->seedFees();
        $other = $this->createOrganization('other');

        $admin = $this->createAdmin($organization);
        $otherAdmin = $this->createAdmin($other);

        $this->actingAs($admin)->post('/fees/types', ['name' => 'Library Fee'])->assertRedirect();

        $this->assertSame(1, FeeAudit::query()->where('organization_id', $organization->id)->count());

        $this->actingAs($otherAdmin)
            ->get('/fees/audit')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('organization.id', $other->id)
                ->where('auditLogs.total', 0)
                ->component('dashboard/FeeAudit'));
    }

    public function test_teacher_without_fee_permission_cannot_open_audit(): void
    {
        [$organization] = $this->seedFees();

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->get('/fees/audit')
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

        return [$organization, $student, $studentFee, $structure];
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