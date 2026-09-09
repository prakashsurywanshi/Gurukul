<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\FeeAudit;
use App\Models\FeeStructure;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentFee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeeCarryForwardTest extends TestCase
{
    use RefreshDatabase;

    public function test_unpaid_balances_are_carried_forward_to_target_session(): void
    {
        [$organization, $student, $fromYear, $toYear] = $this->seedSessions();

        $sourceStructure = FeeStructure::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $fromYear->id)
            ->first();
        $targetStructure = FeeStructure::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $toYear->id)
            ->where('class_id', $sourceStructure->class_id)
            ->where('fee_type', $sourceStructure->fee_type)
            ->first();
        $this->assertNotNull($targetStructure);

        StudentFee::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'fee_structure_id' => $sourceStructure->id,
            'academic_year_id' => $fromYear->id,
            'month' => 'March',
            'year' => 2026,
            'amount' => 5000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 5000,
            'paid_amount' => 2000,
            'balance' => 3000,
            'due_date' => '2026-03-10',
            'status' => 'partial',
        ]);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/carry-forward', [
            'fromYearId' => $fromYear->id,
            'toYearId' => $toYear->id,
        ])->assertRedirect()->assertSessionHas('feeCarryForwardResult', [
            'carried' => 1,
            'skipped' => 0,
            'totalAmount' => 3000.0,
            'fromSession' => '2025-2026',
            'toSession' => '2026-2027',
        ]);

        $carried = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $toYear->id)
            ->where('student_id', $student->id)
            ->first();

        $this->assertNotNull($carried);
        $this->assertEquals(3000, (float) $carried->net_amount);
        $this->assertEquals(3000, (float) $carried->balance);
        $this->assertEquals(0, (float) $carried->paid_amount);
        $this->assertEquals('pending', $carried->status);
        $this->assertEquals(2027, (int) $carried->year);

        $audit = FeeAudit::query()->where('action', 'fee.carried_forward')->first();
        $this->assertNotNull($audit);
        $this->assertEquals(3000, (float) $audit->amount);
        $this->assertEquals('2026-2027', $audit->meta['to_session']);
    }

    public function test_fully_paid_fees_are_not_carried(): void
    {
        [$organization, $student, $fromYear, $toYear] = $this->seedSessions();

        $sourceStructure = FeeStructure::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $fromYear->id)
            ->first();

        StudentFee::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'fee_structure_id' => $sourceStructure->id,
            'academic_year_id' => $fromYear->id,
            'month' => 'March',
            'year' => 2026,
            'amount' => 5000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 5000,
            'paid_amount' => 5000,
            'balance' => 0,
            'due_date' => '2026-03-10',
            'status' => 'paid',
        ]);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/carry-forward', [
            'fromYearId' => $fromYear->id,
            'toYearId' => $toYear->id,
        ])->assertRedirect()->assertSessionHas('error');

        $this->assertSame(0, StudentFee::query()->where('organization_id', $organization->id)->where('academic_year_id', $toYear->id)->count());
    }

    public function test_repeat_carry_forward_skips_existing_records(): void
    {
        [$organization, $student, $fromYear, $toYear] = $this->seedSessions();

        $sourceStructure = FeeStructure::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $fromYear->id)
            ->first();

        StudentFee::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'fee_structure_id' => $sourceStructure->id,
            'academic_year_id' => $fromYear->id,
            'month' => 'March',
            'year' => 2026,
            'amount' => 5000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 5000,
            'paid_amount' => 0,
            'balance' => 5000,
            'due_date' => '2026-03-10',
            'status' => 'pending',
        ]);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/carry-forward', [
            'fromYearId' => $fromYear->id,
            'toYearId' => $toYear->id,
        ])->assertRedirect();

        $this->actingAs($admin)->post('/fees/carry-forward', [
            'fromYearId' => $fromYear->id,
            'toYearId' => $toYear->id,
        ])->assertRedirect()->assertSessionHas('feeCarryForwardResult', function ($result) {
            $this->assertSame(0, $result['carried']);
            $this->assertSame(1, $result['skipped']);

            return true;
        });

        $this->assertSame(1, StudentFee::query()->where('organization_id', $organization->id)->where('academic_year_id', $toYear->id)->count());
    }

    public function test_carry_forward_is_isolated_per_organization(): void
    {
        [$organization, , $fromYear] = $this->seedSessions();
        $other = $this->createOrganization('other');
        $otherFrom = $this->createAcademicYear($other, '2025-2026', '2025-04-01', '2026-03-31');
        $otherTo = $this->createAcademicYear($other, '2026-2027', '2026-04-01', '2027-03-31');

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/carry-forward', [
            'fromYearId' => $otherFrom->id,
            'toYearId' => $otherTo->id,
        ])->assertRedirect()->assertSessionHas('error');

        $this->actingAs($admin)->post('/fees/carry-forward', [
            'fromYearId' => $fromYear->id,
            'toYearId' => $otherTo->id,
        ])->assertRedirect()->assertSessionHas('error');
    }

    public function test_teacher_without_fee_permission_cannot_carry_forward(): void
    {
        [$organization, , $fromYear, $toYear] = $this->seedSessions();

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->post('/fees/carry-forward', [
                'fromYearId' => $fromYear->id,
                'toYearId' => $toYear->id,
            ])
            ->assertForbidden();
    }

    private function activeYearId(Organization $organization): int
    {
        return (int) $organization->selectedAcademicYear()?->id;
    }

    private function seedSessions(): array
    {
        $organization = $this->createOrganization();
        $fromYear = $this->createAcademicYear($organization, '2025-2026', '2025-04-01', '2026-03-31');
        $toYear = $this->createAcademicYear($organization, '2026-2027', '2026-04-01', '2027-03-31', true);
        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $fromYear->id,
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
            'admission_date' => '2025-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => '9876543210',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $fromYear->id,
            'class_id' => $class->id,
            'session' => $fromYear->name,
            'roll_number' => '5',
            'status' => 'active',
            'is_current' => false,
            'entry_type' => 'admission',
            'effective_date' => '2025-04-10',
        ]);

        FeeStructure::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $fromYear->id,
            'class_id' => $class->id,
            'fee_type' => 'Tuition Fee',
            'amount' => 5000,
            'frequency' => 'monthly',
            'description' => 'Monthly tuition',
            'status' => 'active',
        ]);

        FeeStructure::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $toYear->id,
            'class_id' => $class->id,
            'fee_type' => 'Tuition Fee',
            'amount' => 5500,
            'frequency' => 'monthly',
            'description' => 'Monthly tuition',
            'status' => 'active',
        ]);

        return [$organization, $student, $fromYear, $toYear];
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

    private function createAcademicYear(
        Organization $organization,
        string $name,
        string $start,
        string $end,
        bool $isCurrent = false
    ): AcademicYear {
        return AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'start_date' => $start,
            'end_date' => $end,
            'is_current' => $isCurrent,
            'status' => 'active',
        ]);
    }
}