<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\ExpenseEntry;
use App\Models\FeeAudit;
use App\Models\FeePayment;
use App\Models\FeeStructure;
use App\Models\FeeType;
use App\Models\IncomeEntry;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentFee;
use App\Models\User;
use App\Services\AccountTransactionService;
use App\Services\FeeAuditService;
use App\Services\StudentAcademicHistoryService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Number;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;
use Throwable;

class FeesController extends Controller
{
    private const HOSTEL_FEE_PREFIX = 'Hostel Fee%';
    private const TRANSPORT_FEE_PREFIX = 'Transport Fee - %';

    public function __construct(
        private readonly StudentAcademicHistoryService $studentAcademicHistoryService,
        private readonly FeeAuditService $feeAuditService,
        private readonly AccountTransactionService $accountTransactionService
    ) {
    }

    public function index() {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $activeAcademicYearId = $organization ? $this->getActiveAcademicYearId($organization) : null;

        if ($user->role === 'student') {
            $student = $organization
                ? Student::query()
                    ->where('organization_id', $organization->id)
                    ->where(function ($query) use ($user) {
                        $query->where('user_id', $user->id)->orWhere('email', $user->email);
                    })
                    ->first()
                : null;

            $studentEnrollment = $student && $activeAcademicYearId
                ? $this->studentAcademicHistoryService->getSessionEnrollmentForStudent($student, $activeAcademicYearId)
                : null;

            return inertia('dashboard/StudentFees', [
                'user' => $user,
                'activeSession' => $organization ? $this->getActiveSessionName($organization) : null,
                'studentRecord' => $student ? $this->serializeStudent($student, $studentEnrollment) : null,
                'feeData' => $student ? $this->buildStudentFeeData($student, $activeAcademicYearId) : null,
            ]);
        }

        return inertia('dashboard/FeeManagement', [
            'user' => $user,
            'organization' => $organization ? [
                'id' => $organization->id,
                'name' => $organization->name,
                'logo' => $organization->logo,
            ] : null,
            'students' => $organization ? $this->getStudents($organization) : [],
            'classRecords' => $organization ? $this->getClassRecords($organization) : [],
            'feeTypes' => $organization ? $this->getFeeTypes($organization) : [],
            'feeStructures' => $organization ? $this->getFeeStructures($organization) : [],
            'studentFeeRecords' => $organization ? $this->getStudentFeeRecords($organization) : [],
            'academicSessions' => $organization ? $this->getAcademicSessions($organization) : [],
        ]);
    }

    public function storeFeeType(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('fee_types', 'name')->where(
                fn ($query) => $query->where('organization_id', $organization->id)
            )],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        FeeType::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'status' => 'active',
        ]);

        $this->feeAuditService->log($organization, 'fee_type.created', Auth::user(), [
            'meta' => [
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
            ],
        ]);

        return redirect()->route('fees')->with('success', 'Fee type created successfully.');
    }

    public function updateFeeType(Request $request, FeeType $feeType): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $feeType->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('fee_types', 'name')
                ->where(fn ($query) => $query->where('organization_id', $organization->id))
                ->ignore($feeType->id)],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $previousName = $feeType->name;

        $feeType->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        FeeStructure::query()
            ->where('organization_id', $organization->id)
            ->where('fee_type', $previousName)
            ->update(['fee_type' => $validated['name']]);

        $this->feeAuditService->log($organization, 'fee_type.updated', Auth::user(), [
            'meta' => [
                'previous_name' => $previousName,
                'name' => $validated['name'],
            ],
        ]);

        return redirect()->route('fees')->with('success', 'Fee type updated successfully.');
    }

    public function destroyFeeType(FeeType $feeType): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $feeType->organization_id === $organization->id, 403);

        $name = $feeType->name;
        $feeType->delete();

        $this->feeAuditService->log($organization, 'fee_type.deleted', Auth::user(), [
            'meta' => [
                'name' => $name,
            ],
        ]);

        return redirect()->route('fees')->with('success', 'Fee type deleted successfully.');
    }

    public function income()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return inertia('dashboard/IncomeManagement', [
            'user' => $user,
            'activeSession' => $organization ? $this->getActiveSessionName($organization) : null,
            'sessions' => $organization ? $this->getAcademicSessions($organization) : [],
            'entries' => $organization ? $this->getIncomeEntries($organization) : [],
        ]);
    }

    public function expenses()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return inertia('dashboard/ExpenseManagement', [
            'user' => $user,
            'activeSession' => $organization ? $this->getActiveSessionName($organization) : null,
            'sessions' => $organization ? $this->getAcademicSessions($organization) : [],
            'entries' => $organization ? $this->getExpenseEntries($organization) : [],
        ]);
    }

    public function storeIncome(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization, 403);
        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);

        if (!$activeAcademicYearId) {
            return redirect()->route('income-management')->with('error', 'Please create and activate an academic session first.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'date' => ['required', 'date'],
            'paymentMode' => ['required', 'string', 'max:100'],
            'receivedFrom' => ['required', 'string', 'max:255'],
            'referenceNo' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['received', 'pending'])],
        ]);

        $incomeEntry = IncomeEntry::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $activeAcademicYearId,
            'title' => $validated['title'],
            'category' => $validated['category'],
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'payment_mode' => $validated['paymentMode'],
            'received_from' => $validated['receivedFrom'],
            'reference_no' => $validated['referenceNo'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'],
        ]);

        if ($validated['status'] === 'received') {
            $account = $this->accountTransactionService->defaultAccount($organization);
            if ($account) {
                $this->accountTransactionService->record($organization, $account, 'income', (float) $validated['amount'], [
                    'description' => $validated['title'].' received from '.$validated['receivedFrom'],
                    'transaction_date' => $validated['date'],
                    'reference_type' => IncomeEntry::class,
                    'reference_id' => $incomeEntry->id,
                    'created_by' => Auth::id(),
                ]);
            }
        }

        return redirect()->route('income-management')->with('success', 'Income entry created successfully.');
    }

    public function updateIncome(Request $request, IncomeEntry $incomeEntry): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $incomeEntry->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'date' => ['required', 'date'],
            'paymentMode' => ['required', 'string', 'max:100'],
            'receivedFrom' => ['required', 'string', 'max:255'],
            'referenceNo' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['received', 'pending'])],
        ]);

        $incomeEntry->update([
            'title' => $validated['title'],
            'category' => $validated['category'],
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'payment_mode' => $validated['paymentMode'],
            'received_from' => $validated['receivedFrom'],
            'reference_no' => $validated['referenceNo'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'],
        ]);

        return redirect()->route('income-management')->with('success', 'Income entry updated successfully.');
    }

    public function destroyIncome(IncomeEntry $incomeEntry): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $incomeEntry->organization_id === $organization->id, 403);

        $incomeEntry->delete();

        return redirect()->route('income-management')->with('success', 'Income entry deleted successfully.');
    }

    public function importIncome(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization, 403);
        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);

        if (!$activeAcademicYearId) {
            return redirect()->route('income-management')->with('error', 'Please create and activate an academic session first.');
        }

        $validated = $request->validate([
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.title' => ['required', 'string', 'max:255'],
            'entries.*.category' => ['required', 'string', 'max:255'],
            'entries.*.amount' => ['required', 'numeric', 'min:0.01'],
            'entries.*.date' => ['required', 'date'],
            'entries.*.paymentMode' => ['required', 'string', 'max:100'],
            'entries.*.receivedFrom' => ['required', 'string', 'max:255'],
            'entries.*.referenceNo' => ['nullable', 'string', 'max:255'],
            'entries.*.notes' => ['nullable', 'string', 'max:1000'],
            'entries.*.status' => ['required', Rule::in(['received', 'pending'])],
        ]);

        foreach ($validated['entries'] as $entry) {
            $incomeEntry = IncomeEntry::query()->create([
                'organization_id' => $organization->id,
                'academic_year_id' => $activeAcademicYearId,
                'title' => $entry['title'],
                'category' => $entry['category'],
                'amount' => $entry['amount'],
                'date' => $entry['date'],
                'payment_mode' => $entry['paymentMode'],
                'received_from' => $entry['receivedFrom'],
                'reference_no' => $entry['referenceNo'] ?? null,
                'notes' => $entry['notes'] ?? null,
                'status' => $entry['status'],
            ]);

            if ($entry['status'] === 'received') {
                $account = $this->accountTransactionService->defaultAccount($organization);
                if ($account) {
                    $this->accountTransactionService->record($organization, $account, 'income', (float) $entry['amount'], [
                        'description' => $entry['title'].' received from '.$entry['receivedFrom'],
                        'transaction_date' => $entry['date'],
                        'reference_type' => IncomeEntry::class,
                        'reference_id' => $incomeEntry->id,
                        'created_by' => Auth::id(),
                    ]);
                }
            }
        }

        return redirect()->route('income-management')->with('success', count($validated['entries']) . ' income entries imported successfully.');
    }

    public function storeExpense(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization, 403);
        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);

        if (!$activeAcademicYearId) {
            return redirect()->route('expense-management')->with('error', 'Please create and activate an academic session first.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'date' => ['required', 'date'],
            'paymentMode' => ['required', 'string', 'max:100'],
            'paidTo' => ['required', 'string', 'max:255'],
            'voucherNo' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['paid', 'due'])],
        ]);

        $expenseEntry = ExpenseEntry::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $activeAcademicYearId,
            'title' => $validated['title'],
            'category' => $validated['category'],
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'payment_mode' => $validated['paymentMode'],
            'paid_to' => $validated['paidTo'],
            'voucher_no' => $validated['voucherNo'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'],
        ]);

        if ($validated['status'] === 'paid') {
            $account = $this->accountTransactionService->defaultAccount($organization);
            if ($account) {
                $this->accountTransactionService->record($organization, $account, 'expense', (float) $validated['amount'], [
                    'description' => $validated['title'].' paid to '.$validated['paidTo'],
                    'transaction_date' => $validated['date'],
                    'reference_type' => ExpenseEntry::class,
                    'reference_id' => $expenseEntry->id,
                    'created_by' => Auth::id(),
                ]);
            }
        }

        return redirect()->route('expense-management')->with('success', 'Expense entry created successfully.');
    }

    public function updateExpense(Request $request, ExpenseEntry $expenseEntry): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $expenseEntry->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'date' => ['required', 'date'],
            'paymentMode' => ['required', 'string', 'max:100'],
            'paidTo' => ['required', 'string', 'max:255'],
            'voucherNo' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['paid', 'due'])],
        ]);

        $expenseEntry->update([
            'title' => $validated['title'],
            'category' => $validated['category'],
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'payment_mode' => $validated['paymentMode'],
            'paid_to' => $validated['paidTo'],
            'voucher_no' => $validated['voucherNo'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'],
        ]);

        return redirect()->route('expense-management')->with('success', 'Expense entry updated successfully.');
    }

    public function destroyExpense(ExpenseEntry $expenseEntry): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $expenseEntry->organization_id === $organization->id, 403);

        $expenseEntry->delete();

        return redirect()->route('expense-management')->with('success', 'Expense entry deleted successfully.');
    }

    public function importExpense(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization, 403);
        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);

        if (!$activeAcademicYearId) {
            return redirect()->route('expense-management')->with('error', 'Please create and activate an academic session first.');
        }

        $validated = $request->validate([
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.title' => ['required', 'string', 'max:255'],
            'entries.*.category' => ['required', 'string', 'max:255'],
            'entries.*.amount' => ['required', 'numeric', 'min:0.01'],
            'entries.*.date' => ['required', 'date'],
            'entries.*.paymentMode' => ['required', 'string', 'max:100'],
            'entries.*.paidTo' => ['required', 'string', 'max:255'],
            'entries.*.voucherNo' => ['nullable', 'string', 'max:255'],
            'entries.*.notes' => ['nullable', 'string', 'max:1000'],
            'entries.*.status' => ['required', Rule::in(['paid', 'due'])],
        ]);

        foreach ($validated['entries'] as $entry) {
            $expenseEntry = ExpenseEntry::query()->create([
                'organization_id' => $organization->id,
                'academic_year_id' => $activeAcademicYearId,
                'title' => $entry['title'],
                'category' => $entry['category'],
                'amount' => $entry['amount'],
                'date' => $entry['date'],
                'payment_mode' => $entry['paymentMode'],
                'paid_to' => $entry['paidTo'],
                'voucher_no' => $entry['voucherNo'] ?? null,
                'notes' => $entry['notes'] ?? null,
                'status' => $entry['status'],
            ]);

            if ($entry['status'] === 'paid') {
                $account = $this->accountTransactionService->defaultAccount($organization);
                if ($account) {
                    $this->accountTransactionService->record($organization, $account, 'expense', (float) $entry['amount'], [
                        'description' => $entry['title'].' paid to '.$entry['paidTo'],
                        'transaction_date' => $entry['date'],
                        'reference_type' => ExpenseEntry::class,
                        'reference_id' => $expenseEntry->id,
                        'created_by' => Auth::id(),
                    ]);
                }
            }
        }

        return redirect()->route('expense-management')->with('success', count($validated['entries']) . ' expense entries imported successfully.');
    }

    public function storeStructure(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization, 403);

        $academicYearId = $this->getActiveAcademicYearId($organization);

        if (!$academicYearId) {
            return redirect()->route('fees')->with('error', 'Create and activate an academic session first.');
        }

        $validated = $request->validate([
            'class' => ['required', 'string'],
            'section' => ['required', 'string'],
            'feeType' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'frequency' => ['required', Rule::in(['monthly', 'quarterly', 'annually', 'one-time'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $schoolClass = $this->findClass($organization, $validated['class'], $validated['section']);

        if (!$schoolClass) {
            return redirect()->route('fees')->with('error', 'Selected class and section do not exist.');
        }

        FeeStructure::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'class_id' => $schoolClass->id,
            'fee_type' => $validated['feeType'],
            'amount' => $validated['amount'],
            'frequency' => $validated['frequency'],
            'description' => $validated['description'] ?? null,
            'status' => 'active',
        ]);

        $this->feeAuditService->log($organization, 'fee_structure.created', Auth::user(), [
            'amount' => $validated['amount'],
            'meta' => [
                'class' => $schoolClass->name,
                'section' => $schoolClass->section,
                'fee_type' => $validated['feeType'],
                'amount' => $validated['amount'],
                'frequency' => $validated['frequency'],
            ],
        ]);

        return redirect()->route('fees')->with('success', 'Fee structure created successfully.');
    }

    public function updateStructure(Request $request, FeeStructure $feeStructure): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $feeStructure->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'class' => ['required', 'string'],
            'section' => ['required', 'string'],
            'feeType' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'frequency' => ['required', Rule::in(['monthly', 'quarterly', 'annually', 'one-time'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $schoolClass = $this->findClass($organization, $validated['class'], $validated['section']);

        if (!$schoolClass) {
            return redirect()->route('fees')->with('error', 'Selected class and section do not exist.');
        }

        $feeStructure->update([
            'class_id' => $schoolClass->id,
            'fee_type' => $validated['feeType'],
            'amount' => $validated['amount'],
            'frequency' => $validated['frequency'],
            'description' => $validated['description'] ?? null,
        ]);

        $this->feeAuditService->log($organization, 'fee_structure.updated', Auth::user(), [
            'amount' => $validated['amount'],
            'meta' => [
                'id' => $feeStructure->id,
                'class' => $schoolClass->name,
                'section' => $schoolClass->section,
                'fee_type' => $validated['feeType'],
                'amount' => $validated['amount'],
                'frequency' => $validated['frequency'],
            ],
        ]);

        return redirect()->route('fees')->with('success', 'Fee structure updated successfully.');
    }

    public function destroyStructure(FeeStructure $feeStructure): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $feeStructure->organization_id === $organization->id, 403);

        $this->feeAuditService->log($organization, 'fee_structure.deleted', Auth::user(), [
            'meta' => [
                'fee_type' => $feeStructure->fee_type,
                'amount' => $feeStructure->amount,
            ],
        ]);

        $feeStructure->delete();

        return redirect()->route('fees')->with('success', 'Fee structure deleted successfully.');
    }

    public function assignFees(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization, 403);

        $academicYearId = $this->getActiveAcademicYearId($organization);

        if (!$academicYearId) {
            return redirect()->route('fees')->with('error', 'Create and activate an academic session first.');
        }

        $validated = $request->validate([
            'feeType' => ['required', 'integer'],
            'dueDate' => ['required', 'date'],
            'studentIds' => ['required', 'array', 'min:1'],
            'studentIds.*' => ['required', 'integer'],
        ]);

        $feeStructure = FeeStructure::query()
            ->where('organization_id', $organization->id)
            ->find($validated['feeType']);

        if (!$feeStructure) {
            return redirect()->route('fees')->with('error', 'Selected fee structure was not found.');
        }

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', $validated['studentIds'])
            ->get();

        $eligibleEnrollments = $this->studentAcademicHistoryService
            ->getSessionEnrollmentQuery($organization->id, $academicYearId)
            ->where('class_id', $feeStructure->class_id)
            ->whereIn('student_id', $students->pluck('id'))
            ->get(['student_id']);

        $activeSessionStudentIds = $eligibleEnrollments
            ->pluck('student_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $students = $students->filter(fn (Student $student) => in_array($student->id, $activeSessionStudentIds, true))->values();

        if ($students->isEmpty()) {
            return redirect()->route('fees')->with('error', 'No valid students were found in the selected class and section for this fee assignment.');
        }

        $assignedCount = 0;
        $dueDate = $validated['dueDate'];
        $month = date('F', strtotime($dueDate));
        $year = (int) date('Y', strtotime($dueDate));

        DB::transaction(function () use ($students, $feeStructure, $organization, $academicYearId, $dueDate, $month, $year, &$assignedCount) {
            foreach ($students as $student) {
                $studentFee = StudentFee::query()->firstOrNew([
                    'organization_id' => $organization->id,
                    'student_id' => $student->id,
                    'fee_structure_id' => $feeStructure->id,
                    'academic_year_id' => $academicYearId,
                    'month' => $feeStructure->frequency === 'monthly' ? $month : null,
                    'year' => $year,
                    'due_date' => $dueDate,
                ]);

                $studentFee->fill([
                    'amount' => $feeStructure->amount,
                    'discount' => $studentFee->discount ?? 0,
                    'fine' => $studentFee->fine ?? 0,
                    'net_amount' => $feeStructure->amount,
                    'paid_amount' => $studentFee->paid_amount ?? 0,
                    'balance' => $feeStructure->amount - ($studentFee->paid_amount ?? 0),
                    'status' => ($studentFee->paid_amount ?? 0) > 0 ? 'partial' : 'pending',
                ]);

                if (!$studentFee->exists || $studentFee->isDirty()) {
                    $studentFee->save();
                    $assignedCount++;
                }
            }
        });

        $this->feeAuditService->log($organization, 'fee.assigned', Auth::user(), [
            'amount' => $assignedCount * $feeStructure->amount,
            'meta' => [
                'count' => $assignedCount,
                'fee_type' => $feeStructure->fee_type,
                'amount_per_student' => $feeStructure->amount,
                'frequency' => $feeStructure->frequency,
                'month' => $feeStructure->frequency === 'monthly' ? $month : null,
                'year' => $year,
                'due_date' => $dueDate,
            ],
        ]);

        return redirect()->route('fees')->with('success', $assignedCount . ' fee assignment' . ($assignedCount === 1 ? '' : 's') . ' saved successfully.');
    }

    public function importFees(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);

        if (!$activeAcademicYearId) {
            return redirect()->route('fees')->with('error', 'Create and activate an academic session first.');
        }

        $validated = $request->validate([
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.studentIdentifier' => ['required', 'string', 'max:100'],
            'entries.*.feeType' => ['required', 'string', 'max:255'],
            'entries.*.month' => ['nullable', 'string', 'max:50'],
            'entries.*.year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'entries.*.dueDate' => ['required', 'date'],
            'entries.*.amount' => ['required', 'numeric', 'min:0.01'],
            'entries.*.discount' => ['nullable', 'numeric', 'min:0'],
            'entries.*.fine' => ['nullable', 'numeric', 'min:0'],
            'entries.*.paidAmount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $imported = 0;
        $skipped = 0;
        $failures = [];
        $totalAmount = 0.0;

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->get(['id', 'class_id', 'admission_no', 'roll_number']);

        foreach ($validated['entries'] as $index => $entry) {
            $rowNumber = $index + 1;
            $identifier = trim((string) $entry['studentIdentifier']);

            try {
                $student = $students->first(
                    fn (Student $student) => strcasecmp((string) $student->admission_no, $identifier) === 0
                        || strcasecmp((string) $student->roll_number, $identifier) === 0
                );

                if (!$student) {
                    $failures[] = ['row' => $rowNumber, 'reason' => "Student '{$identifier}' not found"];

                    continue;
                }

                $structure = FeeStructure::query()
                    ->where('organization_id', $organization->id)
                    ->where('academic_year_id', $activeAcademicYearId)
                    ->where('class_id', $student->class_id)
                    ->where('fee_type', $entry['feeType'])
                    ->where('status', 'active')
                    ->first();

                if (!$structure) {
                    $failures[] = ['row' => $rowNumber, 'reason' => "No active '{$entry['feeType']}' fee structure exists for this student's class and session"];

                    continue;
                }

                $amount = (float) $entry['amount'];
                $discount = (float) ($entry['discount'] ?? 0);
                $fine = (float) ($entry['fine'] ?? 0);
                $paidAmount = (float) ($entry['paidAmount'] ?? 0);
                $netAmount = max(0, $amount + $fine - $discount);
                $balance = max(0, $netAmount - $paidAmount);
                $month = ($entry['month'] ?? null) ?: null;
                $year = (int) ($entry['year'] ?? date('Y', strtotime($entry['dueDate'])));

                $exists = StudentFee::query()
                    ->where('organization_id', $organization->id)
                    ->where('student_id', $student->id)
                    ->where('fee_structure_id', $structure->id)
                    ->where('academic_year_id', $activeAcademicYearId)
                    ->whereDate('due_date', Carbon::parse($entry['dueDate']))
                    ->exists();

                if ($exists) {
                    $skipped++;

                    continue;
                }

                StudentFee::query()->create([
                    'organization_id' => $organization->id,
                    'student_id' => $student->id,
                    'fee_structure_id' => $structure->id,
                    'academic_year_id' => $activeAcademicYearId,
                    'month' => $month,
                    'year' => $year,
                    'amount' => $amount,
                    'discount' => $discount,
                    'fine' => $fine,
                    'net_amount' => $netAmount,
                    'paid_amount' => $paidAmount,
                    'balance' => $balance,
                    'due_date' => $entry['dueDate'],
                    'status' => $balance <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'pending'),
                ]);

                $imported++;
                $totalAmount += $netAmount;
            } catch (Throwable $e) {
                $failures[] = ['row' => $rowNumber, 'reason' => 'Unexpected row error: '.$e->getMessage()];
            }
        }

        $this->feeAuditService->log($organization, 'fee.imported', $user, [
            'amount' => $totalAmount,
            'meta' => [
                'imported' => $imported,
                'skipped' => $skipped,
                'failed' => count($failures),
            ],
        ]);

        session()->flash('feeImportResult', [
            'imported' => $imported,
            'skipped' => $skipped,
            'failed' => count($failures),
            'totalAmount' => round($totalAmount, 2),
            'failures' => array_slice($failures, 0, 20),
        ]);

        return redirect()->route('fees')->with(
            'success',
            $imported.' fee record'.($imported === 1 ? '' : 's').' imported'.($skipped > 0 ? ', '.$skipped.' skipped' : '').(count($failures) > 0 ? ', '.count($failures).' failed' : '').'.'
        );
    }

    public function carryForward(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'fromYearId' => ['required', 'integer'],
            'toYearId' => ['required', 'integer', 'different:fromYearId'],
        ]);

        $fromYear = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->find($validated['fromYearId']);
        $toYear = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->find($validated['toYearId']);

        if (!$fromYear || !$toYear) {
            return redirect()->route('fees')->with('error', 'Both source and target academic sessions must belong to this school.');
        }

        $sourceFees = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $fromYear->id)
            ->where('balance', '>', 0)
            ->with('feeStructure')
            ->get();

        if ($sourceFees->isEmpty()) {
            return redirect()->route('fees')->with('error', 'No outstanding fee balances to carry forward for the selected source session.');
        }

        $targetStructures = FeeStructure::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $toYear->id)
            ->where('status', 'active')
            ->get();

        $carried = 0;
        $skipped = 0;
        $totalCarried = 0.0;

        DB::transaction(function () use ($sourceFees, $targetStructures, $organization, $toYear, &$carried, &$skipped, &$totalCarried) {
            foreach ($sourceFees as $sourceFee) {
                $targetStructure = $targetStructures->first(
                    fn (FeeStructure $structure) => $structure->class_id === $sourceFee->feeStructure?->class_id
                        && strcasecmp($structure->fee_type, (string) $sourceFee->feeStructure?->fee_type) === 0
                );

                if (!$targetStructure) {
                    $skipped++;

                    continue;
                }

                $targetStart = $toYear->start_date ? Carbon::parse($toYear->start_date) : now();
                $dueDate = Carbon::parse($sourceFee->due_date ? $sourceFee->due_date->toDateString() : now()->toDateString())
                    ->setYear((int) $targetStart->year);

                while ($dueDate->lessThan($targetStart)) {
                    $dueDate->addYear();
                }

                $carriedYear = (int) $dueDate->year;

                $exists = StudentFee::query()
                    ->where('organization_id', $organization->id)
                    ->where('student_id', $sourceFee->student_id)
                    ->where('fee_structure_id', $targetStructure->id)
                    ->where('academic_year_id', $toYear->id)
                    ->where('month', $sourceFee->month)
                    ->whereDate('due_date', $dueDate)
                    ->exists();

                if ($exists) {
                    $skipped++;

                    continue;
                }

                $balance = (float) $sourceFee->balance;

                StudentFee::query()->create([
                    'organization_id' => $organization->id,
                    'student_id' => $sourceFee->student_id,
                    'fee_structure_id' => $targetStructure->id,
                    'academic_year_id' => $toYear->id,
                    'month' => $sourceFee->month,
                    'year' => $carriedYear,
                    'amount' => $balance,
                    'discount' => 0,
                    'fine' => 0,
                    'net_amount' => $balance,
                    'paid_amount' => 0,
                    'balance' => $balance,
                    'due_date' => $dueDate,
                    'status' => 'pending',
                ]);

                $carried++;
                $totalCarried += $balance;
            }
        });

        $this->feeAuditService->log($organization, 'fee.carried_forward', $user, [
            'amount' => round($totalCarried, 2),
            'meta' => [
                'from_session' => $fromYear->name,
                'to_session' => $toYear->name,
                'carried' => $carried,
                'skipped' => $skipped,
            ],
        ]);

        session()->flash('feeCarryForwardResult', [
            'carried' => $carried,
            'skipped' => $skipped,
            'totalAmount' => round($totalCarried, 2),
            'fromSession' => $fromYear->name,
            'toSession' => $toYear->name,
        ]);

        return redirect()->route('fees')->with(
            'success',
            $carried.' fee balance'.($carried === 1 ? '' : 's').' carried forward from '.$fromYear->name.' to '.$toYear->name.'.'
        );
    }

    public function collectPayment(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'fee_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', Rule::in(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'online'])],
            'transaction_id' => ['nullable', 'string', 'max:255'],
        ]);

        $studentFee = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'not like', self::HOSTEL_FEE_PREFIX))
            ->find($validated['fee_id']);

        if (!$studentFee) {
            return redirect()->route('fees')->with('error', 'Fee record not found.');
        }

        $currentBalance = (float) $studentFee->balance;
        $paymentAmount = (float) $validated['amount'];

        if ($paymentAmount > $currentBalance) {
            return redirect()->route('fees')->with('error', 'Payment amount cannot exceed pending balance.');
        }

        DB::transaction(function () use ($studentFee, $paymentAmount, $validated, $user, $organization, &$feePayment) {
            $feePayment = FeePayment::query()->create([
                'organization_id' => $organization->id,
                'student_fee_id' => $studentFee->id,
                'student_id' => $studentFee->student_id,
                'receipt_number' => $this->generateReceiptNumber(),
                'amount' => $paymentAmount,
                'payment_method' => $validated['payment_method'],
                'transaction_id' => $validated['transaction_id'] ?? null,
                'payment_date' => now()->toDateString(),
                'collected_by' => $user->id,
                'status' => 'success',
            ]);

            $paidAmount = (float) $studentFee->paid_amount + $paymentAmount;
            $balance = max(0, (float) $studentFee->net_amount - $paidAmount);

            $studentFee->update([
                'paid_amount' => $paidAmount,
                'balance' => $balance,
                'status' => $balance <= 0 ? 'paid' : 'partial',
            ]);
        });

        $this->feeAuditService->log($organization, 'payment.collected', Auth::user(), [
            'amount' => $paymentAmount,
            'student_id' => $studentFee->student_id,
            'student_fee_id' => $studentFee->id,
            'fee_payment_id' => $feePayment->id,
            'meta' => [
                'payment_method' => $validated['payment_method'],
                'transaction_id' => $validated['transaction_id'] ?? null,
            ],
        ]);

        $account = $this->accountTransactionService->defaultAccount($organization);
        if ($account) {
            $this->accountTransactionService->record($organization, $account, 'fee_payment', $paymentAmount, [
                'description' => 'Fee payment collected (receipt '.$feePayment->receipt_number.')',
                'transaction_date' => now()->toDateString(),
                'reference_type' => FeePayment::class,
                'reference_id' => $feePayment->id,
                'created_by' => $user->id,
            ]);
        }

        return redirect()->route('fees')->with('success', 'Payment collected successfully.');
    }

    public function revertPayment(Request $request, FeePayment $feePayment): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $feePayment->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        if ($feePayment->status === 'refunded') {
            return redirect()->route('fees')->with('error', 'Payment has already been reverted.');
        }

        $studentFee = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'not like', self::HOSTEL_FEE_PREFIX))
            ->find($feePayment->student_fee_id);

        if (!$studentFee) {
            return redirect()->route('fees')->with('error', 'Associated fee record not found.');
        }

        DB::transaction(function () use ($feePayment, $studentFee, $validated, $user) {
            $updatedPaidAmount = max(0, (float) $studentFee->paid_amount - (float) $feePayment->amount);
            $updatedBalance = min((float) $studentFee->net_amount, (float) $studentFee->balance + (float) $feePayment->amount);

            $studentFee->update([
                'paid_amount' => $updatedPaidAmount,
                'balance' => $updatedBalance,
                'status' => $updatedPaidAmount <= 0 ? 'pending' : ($updatedBalance <= 0 ? 'paid' : 'partial'),
            ]);

            $feePayment->update([
                'status' => 'refunded',
                'reverted_by' => $user->id,
                'reverted_at' => now()->toDateString(),
                'revert_reason' => $validated['reason'],
                'remarks' => $validated['reason'],
            ]);
        });

        $this->feeAuditService->log($organization, 'payment.reverted', Auth::user(), [
            'amount' => $feePayment->amount,
            'student_id' => $studentFee->student_id,
            'student_fee_id' => $studentFee->id,
            'fee_payment_id' => $feePayment->id,
            'meta' => [
                'reason' => $validated['reason'],
                'reverted_at' => now()->toDateString(),
            ],
        ]);

        return redirect()->route('fees')->with('success', 'Payment reverted successfully.');
    }

    public function feeAudit(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return inertia('dashboard/FeeAudit', [
                'user' => $user,
                'organization' => null,
                'auditLogs' => [],
                'actions' => [],
            ]);
        }

        $validated = $request->validate([
            'action' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $query = FeeAudit::query()
            ->where('organization_id', $organization->id)
            ->with(['user:id,name', 'student:id,first_name,last_name'])
            ->latest('created_at')
            ->latest('id');

        if (! empty($validated['action'])) {
            $query->where('action', $validated['action']);
        }

        if (! empty($validated['from'])) {
            $query->whereDate('created_at', '>=', $validated['from']);
        }

        if (! empty($validated['to'])) {
            $query->whereDate('created_at', '<=', $validated['to']);
        }

        $auditLogs = $query->paginate(50)->withQueryString();

        return inertia('dashboard/FeeAudit', [
            'user' => $user,
            'organization' => $this->serializeOrganization($organization),
            'auditLogs' => [
                'data' => $auditLogs->map(fn (FeeAudit $entry) => [
                    'id' => (string) $entry->id,
                    'action' => $entry->action,
                    'amount' => $entry->amount !== null ? (float) $entry->amount : null,
                    'userName' => $entry->user?->name ?? 'System',
                    'studentName' => $entry->student ? trim($entry->student->first_name.' '.$entry->student->last_name) : null,
                    'meta' => $entry->meta ?? [],
                    'ipAddress' => $entry->ip_address,
                    'createdAt' => $entry->created_at?->toIso8601String(),
                ])->all(),
                'total' => $auditLogs->total(),
                'currentPage' => $auditLogs->currentPage(),
                'lastPage' => $auditLogs->lastPage(),
                'perPage' => $auditLogs->perPage(),
            ],
            'actions' => FeeAudit::query()
                ->where('organization_id', $organization->id)
                ->select('action')
                ->distinct()
                ->orderBy('action')
                ->pluck('action')
                ->values()
                ->all(),
            'filters' => $validated,
        ]);
    }

    public function challans()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return inertia('dashboard/FeeChallans', [
            'user' => $user,
            'organization' => $organization ? $this->serializeOrganization($organization) : null,
            'students' => $organization ? $this->getStudents($organization) : [],
            'classRecords' => $organization ? $this->getClassRecords($organization) : [],
            'studentFeeRecords' => $organization ? $this->getStudentFeeRecords($organization) : [],
            'sessionName' => $organization ? $this->getActiveSessionName($organization) : null,
        ]);
    }

    public function dueSlips()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $activeAcademicYearId = $organization ? $this->getActiveAcademicYearId($organization) : null;

        $dues = [];
        if ($organization) {
            $records = collect($this->getStudentFeeRecordsForAcademicYear($organization, $activeAcademicYearId));

            $dues = $records
                ->map(function (array $record, $studentId) {
                    $fees = collect($record['fees']);

                    return [
                        'student_id' => (string) $studentId,
                        'total_due' => $fees->sum('due_amount'),
                        'pending_count' => $fees->filter(fn (array $fee) => (float) $fee['due_amount'] > 0)->count(),
                    ];
                })
                ->filter(fn (array $due) => $due['total_due'] > 0)
                ->values()
                ->all();
        }

        return inertia('dashboard/DueSlips', [
            'user' => $user,
            'organization' => $organization ? $this->serializeOrganization($organization) : null,
            'classRecords' => $organization ? $this->getClassRecords($organization) : [],
            'sessionName' => $organization ? $this->getActiveSessionName($organization) : null,
            'students' => $organization ? $this->getStudents($organization) : [],
            'dues' => $dues,
        ]);
    }

    public function printChallan(StudentFee $studentFee)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $studentFee->organization_id === $organization->id, 404);

        return response()->view('finance.fee-challan', $this->buildChallanData($studentFee, $organization));
    }

    public function downloadChallan(StudentFee $studentFee)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $studentFee->organization_id === $organization->id, 404);

        $html = view('finance.fee-challan', $this->buildChallanData($studentFee, $organization))->render();

        $pdf = Pdf::loadHTML($html)
            ->setPaper('a4', 'portrait')
            ->setOption('isRemoteEnabled', true);

        return $pdf->download('Fee-Challan-' . $studentFee->id . '-' . now()->format('Y-m-d') . '.pdf');
    }

    public function printDueSlip(Student $student)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $student->organization_id === $organization->id, 404);

        return response()->view('finance.due-slip', $this->buildDueSlipData($student, $organization));
    }

    public function downloadDueSlip(Student $student)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $student->organization_id === $organization->id, 404);

        $html = view('finance.due-slip', $this->buildDueSlipData($student, $organization))->render();

        $pdf = Pdf::loadHTML($html)
            ->setPaper('a4', 'portrait')
            ->setOption('isRemoteEnabled', true);

        return $pdf->download('Fee-Due-Slip-' . $student->id . '-' . now()->format('Y-m-d') . '.pdf');
    }

    private function serializeOrganization(Organization $organization): array
    {
        return [
            'id' => $organization->id,
            'name' => $organization->name,
            'logo' => $organization->logo,
            'address' => collect([$organization->address, $organization->city, $organization->state, $organization->pincode])
                ->filter()
                ->implode(', '),
            'phone' => $organization->phone,
            'email' => $organization->email,
        ];
    }

    private function buildChallanData(StudentFee $studentFee, Organization $organization): array
    {
        $student = $studentFee->student;
        $schoolClass = $studentFee->feeStructure?->schoolClass ?: $student->schoolClass;
        $balance = max(0, (float) $studentFee->balance);

        return [
            'organization' => $this->serializeOrganization($organization),
            'challan' => [
                'challan_number' => $this->generateChallanNumber($studentFee),
                'issued_at' => now()->format('d M Y'),
                'due_date' => optional($studentFee->due_date)->format('d M Y'),
                'session' => $studentFee->academicYear?->name,
                'student' => [
                    'name' => $this->studentFullName($student),
                    'admission_no' => $student->admission_no,
                    'roll_number' => $student->roll_number,
                    'class' => $schoolClass?->name,
                    'section' => $schoolClass?->section,
                ],
                'fee' => [
                    'amount' => (float) $studentFee->amount,
                    'discount' => (float) $studentFee->discount,
                    'fine' => (float) $studentFee->fine,
                    'net_amount' => (float) $studentFee->net_amount,
                    'paid_amount' => (float) $studentFee->paid_amount,
                    'balance' => $balance,
                ],
                'fee_type' => $studentFee->feeStructure?->localized('fee_type') ?: 'General Fee',
                'frequency' => $studentFee->feeStructure?->frequency ?? '-',
                'description' => $studentFee->feeStructure?->localized('description'),
                'amount_words' => $this->amountInWords($balance),
                'generated_by' => Auth::user()?->name,
            ],
        ];
    }

    private function buildDueSlipData(Student $student, Organization $organization): array
    {
        $academicYearId = $this->getActiveAcademicYearId($organization);
        $records = $this->getStudentFeeRecordsForAcademicYear($organization, $academicYearId);
        $record = $records[(string) $student->id] ?? ['fees' => [], 'payments' => []];

        $pending = collect($record['fees'])
            ->filter(fn (array $fee) => (float) $fee['due_amount'] > 0)
            ->values();

        $totalDue = $pending->sum('due_amount');

        $enrollment = $student;
        $schoolClass = $enrollment->schoolClass;

        if ($academicYearId) {
            $history = $this->studentAcademicHistoryService->getSessionEnrollmentForStudent($student, $academicYearId);
            $schoolClass = $history?->schoolClass ?: $schoolClass;
        }

        return [
            'organization' => $this->serializeOrganization($organization),
            'student' => [
                'name' => $this->studentFullName($student),
                'admission_no' => $student->admission_no,
                'roll_number' => $student->roll_number,
                'class' => $schoolClass?->name,
                'section' => $schoolClass?->section,
                'father_name' => $student->father_name,
                'phone' => $student->phone,
            ],
            'session' => $this->getActiveSessionName($organization),
            'generated_at' => now()->format('d M Y, h:i A'),
            'pending_fees' => $pending
                ->map(fn (array $fee) => [
                    'fee_type' => $fee['fee_type'],
                    'description' => '',
                    'due_date' => $fee['due_date'],
                    'net_amount' => $fee['total_amount'],
                    'paid_amount' => $fee['paid_amount'],
                    'balance' => $fee['due_amount'],
                ])
                ->values(),
            'total_due' => $totalDue,
            'amount_words' => $this->amountInWords($totalDue),
        ];
    }

    private function studentFullName(Student $student): string
    {
        return trim(implode(' ', array_filter([$student->first_name, $student->middle_name, $student->last_name])));
    }

    private function amountInWords(float $amount): string
    {
        $amount = max(0, round($amount, 2));
        $rupees = (int) floor($amount);
        $paise = (int) round(($amount - $rupees) * 100);

        $rupeesInWords = ucfirst(Number::spell($rupees));

        if ($paise > 0) {
            return $rupeesInWords . ' Rupees and ' . ucfirst(Number::spell($paise)) . ' Paise Only';
        }

        return $rupeesInWords . ' Rupees Only';
    }

    private function generateChallanNumber(StudentFee $studentFee): string
    {
        return 'CHLN-' . now()->format('Ymd') . '-' . str_pad((string) $studentFee->id, 5, '0', STR_PAD_LEFT);
    }

    private function getStudents(Organization $organization): array
    {
        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);

        return $this->studentAcademicHistoryService
            ->getSessionEnrollments($organization->id, $activeAcademicYearId)
            ->map(function (StudentAcademicHistory $history) {
                $student = $history->student;

                if (! $student) {
                    return null;
                }

                return $this->serializeStudent($student, $history);
            })
            ->filter()
            ->sortBy([
                ['first_name', 'asc'],
                ['last_name', 'asc'],
            ])
            ->values()
            ->all();
    }

    private function serializeStudent(Student $student, ?StudentAcademicHistory $history = null): array
    {
        return [
            'id' => (string) $student->id,
            'organization_id' => $student->organization_id,
            'admission_no' => $student->admission_no,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'email' => $student->email,
            'session_id' => $history?->academic_year_id,
            'session' => $history?->session ?: $history?->academicYear?->name,
            'class' => $history?->schoolClass?->name ?? $student->schoolClass?->name,
            'section' => $history?->schoolClass?->section ?? $student->schoolClass?->section,
            'roll_number' => $history?->roll_number ?: $student->roll_number,
            'status' => $history?->status ?: $student->status,
        ];
    }

    private function getClassRecords(Organization $organization): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => $schoolClass->id,
                'name' => $schoolClass->name,
                'section' => $schoolClass->section,
            ])
            ->all();
    }

    private function getFeeStructures(Organization $organization): array
    {
        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);

        return FeeStructure::query()
            ->where('organization_id', $organization->id)
            ->when($activeAcademicYearId, fn ($query) => $query->where('academic_year_id', $activeAcademicYearId))
            ->where('fee_type', 'not like', self::HOSTEL_FEE_PREFIX)
            ->where('fee_type', 'not like', self::TRANSPORT_FEE_PREFIX)
            ->with('schoolClass:id,name,section')
            ->orderBy('class_id')
            ->orderBy('fee_type')
            ->get()
            ->map(fn (FeeStructure $structure) => [
                'id' => (string) $structure->id,
                'class' => $structure->schoolClass?->name,
                'section' => $structure->schoolClass?->section,
                'feeType' => $structure->localized('fee_type'),
                'amount' => (float) $structure->amount,
                'frequency' => $structure->frequency,
                'description' => $structure->localized('description'),
            ])
            ->all();
    }

    private function getFeeTypes(Organization $organization): array
    {
        return FeeType::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->where('name', 'not like', self::TRANSPORT_FEE_PREFIX)
            ->orderBy('name')
            ->get()
            ->map(fn (FeeType $feeType) => [
                'id' => (string) $feeType->id,
                'name' => $feeType->localized('name'),
                'description' => $feeType->localized('description'),
            ])
            ->all();
    }

    private function getStudentFeeRecords(Organization $organization): array
    {
        return $this->getStudentFeeRecordsForAcademicYear($organization, $this->getActiveAcademicYearId($organization));
    }

    private function buildStudentFeeData(Student $student, ?int $academicYearId = null): array
    {
        $organization = Organization::query()->findOrFail($student->organization_id);
        $targetAcademicYearId = $academicYearId ?: $this->getActiveAcademicYearId($organization);

        $records = $this->getStudentFeeRecordsForAcademicYear($organization, $targetAcademicYearId);
        return $records[(string) $student->id] ?? [
            'fees' => [],
            'payments' => [],
            'summary' => [
                'total_pending' => 0,
                'total_paid' => 0,
            ],
        ];
    }

    private function getStudentFeeRecordsForAcademicYear(Organization $organization, ?int $academicYearId): array
    {
        $studentFees = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId))
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'not like', self::HOSTEL_FEE_PREFIX))
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'not like', self::TRANSPORT_FEE_PREFIX))
            ->with([
                'feeStructure:id,fee_type,fee_type_mr,fee_type_hi',
                'payments' => fn ($query) => $query->with('collector:id,name')->orderByDesc('payment_date'),
            ])
            ->get()
            ->groupBy('student_id');

        return $studentFees->mapWithKeys(function ($fees, $studentId) {
            $serializedFees = $fees->map(function (StudentFee $fee) {
                return [
                    'id' => (string) $fee->id,
                    'fee_type' => ($fee->feeStructure?->localized('fee_type') ?: 'General Fee'),
                    'amount' => (float) $fee->amount,
                    'discount' => (float) $fee->discount,
                    'total_amount' => (float) $fee->net_amount,
                    'paid_amount' => (float) $fee->paid_amount,
                    'due_amount' => (float) $fee->balance,
                    'status' => $fee->status,
                    'due_date' => optional($fee->due_date)->format('Y-m-d'),
                    'created_at' => optional($fee->created_at)->format('Y-m-d H:i:s'),
                ];
            })->values();

            $payments = $fees
                ->flatMap(fn (StudentFee $fee) => $fee->payments->map(function (FeePayment $payment) use ($fee) {
                    return [
                        'id' => (string) $payment->id,
                        'fee_id' => (string) $fee->id,
                        'student_id' => (string) $payment->student_id,
                        'amount' => (float) $payment->amount,
                        'payment_method' => $payment->payment_method,
                        'transaction_id' => $payment->transaction_id,
                        'payment_date' => optional($payment->payment_date)->format('Y-m-d'),
                        'collected_by' => $payment->collector?->name,
                        'status' => $payment->status === 'refunded' ? 'reverted' : 'active',
                        'reverted_at' => optional($payment->reverted_at)->format('Y-m-d'),
                        'reverted_by' => $payment->reverted_by ? User::query()->find($payment->reverted_by)?->name : null,
                        'revert_reason' => $payment->revert_reason,
                    ];
                }))
                ->sortByDesc('payment_date')
                ->values();

            return [
                (string) $studentId => [
                    'fees' => $serializedFees,
                    'payments' => $payments,
                    'summary' => [
                        'total_pending' => $serializedFees->sum('due_amount'),
                        'total_paid' => $serializedFees->sum('paid_amount'),
                    ],
                ],
            ];
        })->all();
    }

    private function getIncomeEntries(Organization $organization): array
    {
        return IncomeEntry::query()
            ->where('organization_id', $organization->id)
            ->with('academicYear:id,name')
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (IncomeEntry $entry) => [
                'id' => (string) $entry->id,
                'sessionId' => $entry->academic_year_id ? (string) $entry->academic_year_id : '',
                'sessionName' => $entry->academicYear?->name ?? '',
                'title' => $entry->title,
                'category' => $entry->category,
                'amount' => (float) $entry->amount,
                'date' => optional($entry->date)->format('Y-m-d'),
                'paymentMode' => $entry->payment_mode,
                'receivedFrom' => $entry->received_from,
                'referenceNo' => $entry->reference_no ?? '',
                'notes' => $entry->notes ?? '',
                'status' => $entry->status,
            ])
            ->all();
    }

    private function getExpenseEntries(Organization $organization): array
    {
        return ExpenseEntry::query()
            ->where('organization_id', $organization->id)
            ->with('academicYear:id,name')
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (ExpenseEntry $entry) => [
                'id' => (string) $entry->id,
                'sessionId' => $entry->academic_year_id ? (string) $entry->academic_year_id : '',
                'sessionName' => $entry->academicYear?->name ?? '',
                'title' => $entry->title,
                'category' => $entry->category,
                'amount' => (float) $entry->amount,
                'date' => optional($entry->date)->format('Y-m-d'),
                'paymentMode' => $entry->payment_mode,
                'paidTo' => $entry->paid_to,
                'voucherNo' => $entry->voucher_no ?? '',
                'notes' => $entry->notes ?? '',
                'status' => $entry->status,
            ])
            ->all();
    }

    private function getActiveAcademicYearId(Organization $organization): ?int
    {
        return $organization->selectedAcademicYear()?->id;
    }

    private function getActiveSessionName(Organization $organization): ?string
    {
        return $organization->selectedSessionName();
    }

    private function getAcademicSessions(Organization $organization): array
    {
        return AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get(['id', 'name', 'is_current'])
            ->map(fn (AcademicYear $session) => [
                'id' => (string) $session->id,
                'name' => $session->name,
                'isCurrent' => (bool) $session->is_current,
            ])
            ->all();
    }

    private function findClass(Organization $organization, string $className, string $section): ?SchoolClass
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('name', $className)
            ->where('section', $section)
            ->where('status', 'active')
            ->first();
    }

    private function generateReceiptNumber(): string
    {
        do {
            $receipt = 'RCT-' . now()->format('Ymd') . '-' . random_int(1000, 9999);
        } while (FeePayment::query()->where('receipt_number', $receipt)->exists());

        return $receipt;
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()->where('email', $user->email)->first();

        if (!$organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}
