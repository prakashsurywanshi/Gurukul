<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\AccountTransaction;
use App\Models\BankAccount;
use App\Models\ExpenseEntry;
use App\Models\FeeStructure;
use App\Models\IncomeEntry;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentFee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BankAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_bank_accounts_page(): void
    {
        [$organization, , ] = $this->seedFinance();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get('/bank-accounts')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard/BankAccounts')
                ->has('accounts')
                ->has('transactions.data')
                ->has('summary'));
    }

    public function test_first_account_becomes_default_with_opening_balance(): void
    {
        $organization = $this->createOrganization();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/bank-accounts', [
            'accountName' => 'Main School Account',
            'bankName' => 'State Bank of India',
            'branch' => 'Connaught Place',
            'accountHolder' => 'Gurukul Trust',
            'accountNumber' => '111122223333',
            'ifscCode' => 'SBIN0001234',
            'openingBalance' => 25000,
        ])->assertRedirect();

        $account = BankAccount::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($account);
        $this->assertTrue((bool) $account->is_default);
        $this->assertEquals(25000, (float) $account->current_balance);
        $this->assertEquals(25000, (float) $account->opening_balance);
    }

    public function test_second_account_does_not_auto_become_default(): void
    {
        [$organization, $first, ] = $this->seedFinance();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/bank-accounts', [
            'accountName' => 'Savings Account',
            'bankName' => 'HDFC Bank',
            'accountHolder' => 'Gurukul Trust',
            'accountNumber' => '999988887777',
        ])->assertRedirect();

        $this->assertSame(2, BankAccount::query()->where('organization_id', $organization->id)->count());
        $this->assertTrue((bool) $first->fresh()->is_default);
    }

    public function test_set_default_updates_the_default_account(): void
    {
        [$organization, $first, ] = $this->seedFinance();

        $admin = $this->createAdmin($organization);
        $second = $this->createAccount($organization, 'Savings Account');

        $this->actingAs($admin)
            ->post("/bank-accounts/{$second->id}/set-default")
            ->assertRedirect();

        $this->assertFalse((bool) $first->fresh()->is_default);
        $this->assertTrue((bool) $second->fresh()->is_default);
    }

    public function test_income_transaction_increases_balance(): void
    {
        [$organization, $account, ] = $this->seedFinance();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/bank-accounts/transactions', [
            'bankAccountId' => $account->id,
            'type' => 'income',
            'amount' => 15000,
            'description' => 'Donation received',
            'transactionDate' => '2026-06-01',
        ])->assertRedirect();

        $this->assertEquals(25000 + 15000, (float) $account->fresh()->current_balance);

        $transaction = AccountTransaction::query()->where('bank_account_id', $account->id)->first();
        $this->assertNotNull($transaction);
        $this->assertEquals('income', $transaction->type);
        $this->assertEquals(15000, (float) $transaction->amount);
        $this->assertEquals(40000, (float) $transaction->balance_after);
    }

    public function test_expense_transaction_decreases_balance(): void
    {
        [$organization, $account, ] = $this->seedFinance();

        $admin = $this->createAdmin($organization);
        $this->createAccount($organization, 'Savings Account');

        $this->actingAs($admin)->post('/bank-accounts/transactions', [
            'bankAccountId' => $account->id,
            'type' => 'expense',
            'amount' => 5000,
            'description' => 'Electricity bill',
            'transactionDate' => '2026-06-01',
        ])->assertRedirect();

        $this->assertEquals(25000 - 5000, (float) $account->fresh()->current_balance);

        $transaction = AccountTransaction::query()->where('bank_account_id', $account->id)->first();
        $this->assertEquals('expense', $transaction->type);
        $this->assertEquals(20000, (float) $transaction->balance_after);
    }

    public function test_fee_payment_creates_account_transaction(): void
    {
        [$organization, $account, $student, $feeStructure] = $this->seedFinance();

        $studentFee = StudentFee::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'fee_structure_id' => $feeStructure->id,
            'academic_year_id' => $this->activeYearId($organization),
            'month' => 'April',
            'year' => 2026,
            'amount' => 5000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 5000,
            'paid_amount' => 0,
            'balance' => 5000,
            'due_date' => '2026-04-10',
            'status' => 'pending',
        ]);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/fees/payments', [
            'fee_id' => $studentFee->id,
            'amount' => 5000,
            'payment_method' => 'cash',
        ], ['Referer' => route('fees')])->assertRedirect();

        $transaction = AccountTransaction::query()
            ->where('bank_account_id', $account->id)
            ->where('type', 'fee_payment')
            ->first();
        $this->assertNotNull($transaction);
        $this->assertEquals(5000, (float) $transaction->amount);
        $this->assertEquals(25000 + 5000, (float) $account->fresh()->current_balance);
        $this->assertEquals(30000, (float) $transaction->balance_after);
    }

    public function test_income_entry_creation_records_transaction(): void
    {
        [$organization, $account, ] = $this->seedFinance();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/income-management', [
            'title' => 'Donation',
            'category' => 'Donation',
            'amount' => 50000,
            'date' => '2026-06-15',
            'paymentMode' => 'Cheque',
            'receivedFrom' => 'Trustee',
            'status' => 'received',
        ], ['Referer' => route('income-management')])->assertRedirect();

        $incomeEntry = IncomeEntry::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($incomeEntry);

        $transaction = AccountTransaction::query()
            ->where('bank_account_id', $account->id)
            ->where('type', 'income')
            ->where('reference_type', IncomeEntry::class)
            ->first();
        $this->assertNotNull($transaction);
        $this->assertEquals($incomeEntry->id, $transaction->reference_id);
        $this->assertEquals(75000, (float) $account->fresh()->current_balance);
    }

    public function test_expense_entry_creation_records_transaction(): void
    {
        [$organization, $account, ] = $this->seedFinance();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/expense-management', [
            'title' => 'Salary Advance',
            'category' => 'Salary',
            'amount' => 8000,
            'date' => '2026-06-15',
            'paymentMode' => 'Bank Transfer',
            'paidTo' => 'Ramesh Yadav',
            'status' => 'paid',
        ], ['Referer' => route('expense-management')])->assertRedirect();

        $expenseEntry = ExpenseEntry::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($expenseEntry);

        $transaction = AccountTransaction::query()
            ->where('bank_account_id', $account->id)
            ->where('type', 'expense')
            ->where('reference_type', ExpenseEntry::class)
            ->first();
        $this->assertNotNull($transaction);
        $this->assertEquals($expenseEntry->id, $transaction->reference_id);
        $this->assertEquals(25000 - 8000, (float) $account->fresh()->current_balance);
    }

    public function test_pending_income_does_not_record_transaction(): void
    {
        [$organization, $account, ] = $this->seedFinance();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/income-management', [
            'title' => 'Grant Pending',
            'category' => 'Grant',
            'amount' => 10000,
            'date' => '2026-06-15',
            'paymentMode' => 'Cash',
            'receivedFrom' => 'Govt',
            'status' => 'pending',
        ], ['Referer' => route('income-management')])->assertRedirect();

        $this->assertSame(0, AccountTransaction::query()->where('organization_id', $organization->id)->count());
    }

    public function test_income_without_bank_account_skips_transaction(): void
    {
        $organization = $this->createOrganization();
        $this->createAcademicYear($organization, '2025-2026', '2025-04-01', '2026-03-31', true);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/income-management', [
            'title' => 'Donation',
            'category' => 'Donation',
            'amount' => 20000,
            'date' => '2026-06-15',
            'paymentMode' => 'Cash',
            'receivedFrom' => 'Wellwisher',
            'status' => 'received',
        ], ['Referer' => route('income-management')])->assertRedirect();

        $incomeEntry = IncomeEntry::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($incomeEntry);
        $this->assertSame(0, AccountTransaction::query()->where('organization_id', $organization->id)->count());
    }

    public function test_transactions_are_isolated_per_organization(): void
    {
        [$organization, $account, ] = $this->seedFinance();
        $other = $this->createOrganization('other');
        $otherAccount = $this->createAccount($other, 'Other Org Account');

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/bank-accounts/transactions', [
            'bankAccountId' => $otherAccount->id,
            'type' => 'income',
            'amount' => 1000,
            'description' => 'Cross org',
            'transactionDate' => '2026-06-01',
        ])->assertRedirect()->assertSessionHas('error');

        $this->assertEquals(25000, (float) $account->fresh()->current_balance);
        $this->assertEquals(0, (float) $otherAccount->fresh()->current_balance);
        $this->assertSame(0, AccountTransaction::query()->count());
    }

    public function test_account_with_transactions_cannot_be_deleted(): void
    {
        [$organization, $account, ] = $this->seedFinance();

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->post('/bank-accounts/transactions', [
            'bankAccountId' => $account->id,
            'type' => 'income',
            'amount' => 1000,
            'description' => 'Donation',
            'transactionDate' => '2026-06-01',
        ])->assertRedirect();

        $this->actingAs($admin)
            ->delete("/bank-accounts/{$account->id}")
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertNotNull($account->fresh());
    }

    public function test_teacher_without_permission_cannot_manage_bank_accounts(): void
    {
        $organization = $this->createOrganization();

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)->get('/bank-accounts')->assertForbidden();

        $this->actingAs($teacher)->post('/bank-accounts', [
            'accountName' => 'Main School Account',
            'bankName' => 'SBI',
            'accountHolder' => 'Trust',
            'accountNumber' => '1234',
        ])->assertForbidden();

        $this->assertSame(0, BankAccount::query()->count());
    }

    private function activeYearId(Organization $organization): int
    {
        return (int) $organization->selectedAcademicYear()?->id;
    }

    private function seedFinance(): array
    {
        $organization = $this->createOrganization();
        $year = $this->createAcademicYear($organization, '2025-2026', '2025-04-01', '2026-03-31', true);
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
            'academic_year_id' => $year->id,
            'class_id' => $class->id,
            'session' => $year->name,
            'roll_number' => '5',
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => '2025-04-10',
        ]);

        $feeStructure = FeeStructure::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'class_id' => $class->id,
            'fee_type' => 'Tuition Fee',
            'amount' => 5000,
            'frequency' => 'monthly',
            'description' => 'Monthly tuition',
            'status' => 'active',
        ]);

        $account = $this->createAccount($organization, 'Main School Account', 25000, true);

        return [$organization, $account, $student, $feeStructure];
    }

    private function createAccount(
        Organization $organization,
        string $name,
        float $openingBalance = 0,
        bool $isDefault = false
    ): BankAccount {
        return BankAccount::query()->create([
            'organization_id' => $organization->id,
            'account_name' => $name,
            'bank_name' => 'State Bank of India',
            'branch' => 'Connaught Place',
            'account_holder' => 'Gurukul Trust',
            'account_number' => '111122223333'.rand(10, 99),
            'ifsc_code' => 'SBIN0001234',
            'opening_balance' => $openingBalance,
            'current_balance' => $openingBalance,
            'is_default' => $isDefault,
            'status' => 'active',
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