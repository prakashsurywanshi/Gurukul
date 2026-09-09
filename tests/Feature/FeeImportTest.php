<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\FeeAudit;
use App\Models\FeeStructure;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeeImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_bulk_fee_import_creates_fee_records_and_audit(): void
    {
        [$organization, $student, $structure] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/import', [
            'entries' => [
                [
                    'studentIdentifier' => 'ADM-1001',
                    'feeType' => 'Tuition Fee',
                    'month' => 'August',
                    'year' => 2026,
                    'dueDate' => '2026-08-10',
                    'amount' => 5000,
                    'discount' => 0,
                    'fine' => 0,
                    'paidAmount' => 0,
                ],
            ],
        ])->assertRedirect()->assertSessionHas('feeImportResult', [
            'imported' => 1,
            'skipped' => 0,
            'failed' => 0,
            'totalAmount' => 5000.0,
            'failures' => [],
        ]);

        $record = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->where('fee_structure_id', $structure->id)
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals(5000, (float) $record->net_amount);
        $this->assertEquals(5000, (float) $record->balance);
        $this->assertEquals('pending', $record->status);

        $audit = FeeAudit::query()->where('action', 'fee.imported')->first();
        $this->assertNotNull($audit);
        $this->assertEquals(5000, (float) $audit->amount);
        $this->assertEquals(1, $audit->meta['imported']);
    }

    public function test_import_supports_opening_paid_balances(): void
    {
        [$organization, $student, $structure] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/import', [
            'entries' => [
                [
                    'studentIdentifier' => (string) $student->roll_number,
                    'feeType' => 'Tuition Fee',
                    'month' => 'August',
                    'year' => 2026,
                    'dueDate' => '2026-08-10',
                    'amount' => 5000,
                    'discount' => 500,
                    'fine' => 0,
                    'paidAmount' => 2000,
                ],
            ],
        ])->assertRedirect()->assertSessionHas('feeImportResult', [
            'imported' => 1,
            'skipped' => 0,
            'failed' => 0,
            'totalAmount' => 4500.0,
            'failures' => [],
        ]);

        $record = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->where('fee_structure_id', $structure->id)
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals(4500, (float) $record->net_amount);
        $this->assertEquals(2500, (float) $record->balance);
        $this->assertEquals(2000, (float) $record->paid_amount);
        $this->assertEquals('partial', $record->status);
    }

    public function test_import_skips_duplicate_records(): void
    {
        [$organization, $student, $structure] = $this->seedFees();

        StudentFee::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'fee_structure_id' => $structure->id,
            'academic_year_id' => $this->activeYearId($organization),
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

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/import', [
            'entries' => [
                [
                    'studentIdentifier' => 'ADM-1001',
                    'feeType' => 'Tuition Fee',
                    'month' => 'August',
                    'year' => 2026,
                    'dueDate' => '2026-08-10',
                    'amount' => 5000,
                    'discount' => 0,
                    'fine' => 0,
                    'paidAmount' => 0,
                ],
            ],
        ])->assertRedirect()->assertSessionHas('feeImportResult', [
            'imported' => 0,
            'skipped' => 1,
            'failed' => 0,
            'totalAmount' => 0.0,
            'failures' => [],
        ]);
    }

    public function test_import_reports_unknown_student_and_missing_structure(): void
    {
        [$organization] = $this->seedFees();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/import', [
            'entries' => [
                [
                    'studentIdentifier' => 'ADM-9999',
                    'feeType' => 'Tuition Fee',
                    'dueDate' => '2026-08-10',
                    'amount' => 5000,
                    'discount' => 0,
                    'fine' => 0,
                    'paidAmount' => 0,
                ],
                [
                    'studentIdentifier' => 'ADM-1001',
                    'feeType' => 'Non Existent Fee',
                    'dueDate' => '2026-08-10',
                    'amount' => 5000,
                    'discount' => 0,
                    'fine' => 0,
                    'paidAmount' => 0,
                ],
            ],
        ])->assertRedirect()->assertSessionHas('feeImportResult', function ($result) {
            $this->assertSame(0, $result['imported']);
            $this->assertSame(2, $result['failed']);
            $this->assertCount(2, $result['failures']);

            return true;
        });

        $failures = session('feeImportResult')['failures'];
        $this->assertStringContainsString('not found', $failures[0]['reason']);
        $this->assertStringContainsString('No active', $failures[1]['reason']);
    }

    public function test_import_is_isolated_per_organization(): void
    {
        [$organization] = $this->seedFees();
        $other = $this->createOrganization('other');
        $this->createAcademicYear($other);

        $otherAdmin = $this->createAdmin($other);

        $this->actingAs($otherAdmin)->post('/fees/import', [
            'entries' => [
                [
                    'studentIdentifier' => 'ADM-1001',
                    'feeType' => 'Tuition Fee',
                    'dueDate' => '2026-08-10',
                    'amount' => 5000,
                    'discount' => 0,
                    'fine' => 0,
                    'paidAmount' => 0,
                ],
            ],
        ])->assertRedirect()->assertSessionHas('feeImportResult', function ($result) {
            $this->assertSame(0, $result['imported']);
            $this->assertSame(1, $result['failed']);

            return true;
        });

        $this->assertSame(0, StudentFee::query()->where('organization_id', $organization->id)->count());
    }

    public function test_teacher_without_fee_permission_cannot_import(): void
    {
        [$organization] = $this->seedFees();

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->post('/fees/import', [
                'entries' => [
                    [
                        'studentIdentifier' => 'ADM-1001',
                        'feeType' => 'Tuition Fee',
                        'dueDate' => '2026-08-10',
                        'amount' => 5000,
                        'discount' => 0,
                        'fine' => 0,
                        'paidAmount' => 0,
                    ],
                ],
            ])
            ->assertForbidden();
    }

    private function activeYearId(Organization $organization): int
    {
        return (int) $organization->selectedAcademicYear()?->id;
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

        return [$organization, $student, $structure];
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