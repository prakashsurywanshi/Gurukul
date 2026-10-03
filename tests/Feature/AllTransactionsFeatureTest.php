<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ExpenseEntry;
use App\Models\FeePayment;
use App\Models\FeeStructure;
use App\Models\IncomeEntry;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentFee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AllTransactionsFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_merges_income_expense_and_fee_rows(): void
    {
        [$organization, $admin] = $this->seedOrganization();
        [$studentFee, , ] = $this->seedFee($organization);

        IncomeEntry::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Donation',
            'category' => 'donation',
            'amount' => 1000,
            'date' => '2026-07-01',
            'payment_mode' => 'cash',
            'received_from' => 'Wellwisher',
            // income_entries.status is enum('received','pending'); 'completed'
            // is rejected by MySQL strict mode (SQLite silently accepted it).
            'status' => 'received',
        ]);

        ExpenseEntry::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Stationery',
            'category' => 'stationery',
            'amount' => 400,
            'date' => '2026-07-02',
            'payment_mode' => 'cash',
            'paid_to' => 'Vendor',
            // expense_entries.status is enum('paid','due').
            'status' => 'paid',
        ]);

        FeePayment::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $studentFee->student_id,
            'student_fee_id' => $studentFee->id,
            'receipt_number' => 'RCPT-001',
            'amount' => 5000,
            'payment_date' => '2026-07-03',
            'payment_method' => 'online',
            'transaction_id' => 'TXN-1',
            'status' => 'success',
            'collected_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/all-transactions')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/AllTransactions')
                ->has('transactions', 3)
                ->where('summary.income', 1000)
                ->where('summary.expenses', 400)
                ->where('summary.fees', 5000)
                ->where('summary.net', 5600));
    }

    public function test_type_filter_limits_rows(): void
    {
        [$organization, $admin] = $this->seedOrganization();
        [$studentFee, , ] = $this->seedFee($organization);

        IncomeEntry::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Donation',
            'category' => 'donation',
            'amount' => 1000,
            'date' => '2026-07-01',
            'payment_mode' => 'cash',
            'received_from' => 'Wellwisher',
            // income_entries.status is enum('received','pending'); 'completed'
            // is rejected by MySQL strict mode (SQLite silently accepted it).
            'status' => 'received',
        ]);

        $this->actingAs($admin)
            ->get('/all-transactions?type=income')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('transactions', 1)
                ->where('transactions.0.type', 'income')
                ->where('summary.expenses', 0)
                ->where('summary.fees', 0));
    }

    public function test_date_filter_and_search(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        IncomeEntry::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Old Donation',
            'category' => 'donation',
            'amount' => 1000,
            'date' => '2026-06-01',
            'payment_mode' => 'cash',
            'received_from' => 'A',
            'status' => 'received',
        ]);

        IncomeEntry::query()->create([
            'organization_id' => $organization->id,
            'title' => 'New Grant',
            'category' => 'grant',
            'amount' => 2000,
            'date' => '2026-08-01',
            'payment_mode' => 'bank',
            'received_from' => 'B',
            'status' => 'received',
        ]);

        $this->actingAs($admin)
            ->get('/all-transactions?type=income&from=2026-07-01&to=2026-12-31')
            ->assertInertia(fn ($page) => $page
                ->has('transactions', 1)
                ->where('transactions.0.title', 'New Grant'));

        $this->actingAs($admin)
            ->get('/all-transactions?q=grant')
            ->assertInertia(fn ($page) => $page
                ->has('transactions', 1)
                ->where('transactions.0.title', 'New Grant'));
    }

    public function test_refunded_fees_are_excluded(): void
    {
        [$organization, $admin] = $this->seedOrganization();
        [$studentFee, , ] = $this->seedFee($organization);

        $refunded = FeePayment::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $studentFee->student_id,
            'student_fee_id' => $studentFee->id,
            'receipt_number' => 'RCPT-002',
            'amount' => 5000,
            'payment_date' => '2026-07-03',
            'payment_method' => 'online',
            'transaction_id' => 'TXN-R',
            'status' => 'refunded',
            'collected_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/all-transactions?type=fee')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('transactions', 0)
                ->where('summary.fees', 0));
    }

    public function test_teacher_cannot_open_all_transactions(): void
    {
        [$organization] = $this->seedOrganization();
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->get('/all-transactions')
            ->assertForbidden();
    }

    private function seedOrganization(): array
    {
        $organization = $this->createOrganization();
        $admin = $this->createAdmin($organization);

        return [$organization, $admin];
    }

    private function seedFee(Organization $organization): array
    {
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);
        $student = $this->createStudent($organization, $class);
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

        return [$studentFee, $student, $academicYear];
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

    private function createStudent(Organization $organization, SchoolClass $class): Student
    {
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