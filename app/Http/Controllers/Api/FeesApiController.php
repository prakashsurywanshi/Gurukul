<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
use App\Services\StudentAcademicHistoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FeesApiController extends Controller
{
    private const HOSTEL_FEE_PREFIX = 'Hostel Fee%';

    public function __construct(private readonly StudentAcademicHistoryService $studentAcademicHistoryService)
    {
    }

    public function indexOverview(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);

        $classRecords = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->when($activeAcademicYearId, fn ($q) => $q->where('academic_year_id', $activeAcademicYearId))
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section']);

        $classSummaries = $classRecords->map(function ($class) use ($organization, $activeAcademicYearId) {
            $studentIds = $this->studentAcademicHistoryService
                ->getSessionEnrollmentQuery($organization->id, $activeAcademicYearId)
                ->where('class_id', $class->id)
                ->pluck('student_id');

            $fees = StudentFee::query()
                ->where('organization_id', $organization->id)
                ->when($activeAcademicYearId, fn ($q) => $q->where('academic_year_id', $activeAcademicYearId))
                ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'not like', self::HOSTEL_FEE_PREFIX))
                ->whereIn('student_id', $studentIds)
                ->get();

            $totalAmount = $fees->sum('net_amount');
            $paidAmount = $fees->sum('paid_amount');
            $balance = $fees->sum('balance');
            $studentCount = $studentIds->count();

            return [
                'class_id' => $class->id,
                'name' => $class->name,
                'section' => $class->section,
                'student_count' => $studentCount,
                'total_amount' => (float) $totalAmount,
                'paid_amount' => (float) $paidAmount,
                'balance' => (float) $balance,
                'collection_rate' => $totalAmount > 0 ? round(($paidAmount / $totalAmount) * 100, 1) : 0,
            ];
        });

        $totals = [
            'total_amount' => $classSummaries->sum('total_amount'),
            'paid_amount' => $classSummaries->sum('paid_amount'),
            'balance' => $classSummaries->sum('balance'),
        ];

        return response()->json([
            'success' => true,
            'classes' => $classSummaries,
            'totals' => $totals,
        ]);
    }

    public function indexStructures(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);

        $query = FeeStructure::query()
            ->where('organization_id', $organization->id)
            ->where('fee_type', 'not like', self::HOSTEL_FEE_PREFIX)
            ->with('schoolClass:id,name,section');

        if ($activeAcademicYearId) {
            $query->where('academic_year_id', $activeAcademicYearId);
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->input('class_id'));
        }

        $structures = $query->orderBy('class_id')->orderBy('fee_type')->get()->map(function (FeeStructure $s) {
            return [
                'id' => $s->id,
                'class_id' => $s->class_id,
                'class_name' => $s->schoolClass?->name,
                'section' => $s->schoolClass?->section,
                'fee_type' => $s->localized('fee_type'),
                'amount' => (float) $s->amount,
                'frequency' => $s->frequency,
                'description' => $s->localized('description'),
                'is_compulsory' => (bool) $s->is_compulsory,
                'status' => $s->status,
            ];
        });

        $classes = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->when($activeAcademicYearId, fn ($q) => $q->where('academic_year_id', $activeAcademicYearId))
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section']);

        return response()->json([
            'success' => true,
            'data' => $structures,
            'classes' => $classes,
        ]);
    }

    public function storeStructure(Request $request)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked.'], 403);
        }

        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);
        if (!$activeAcademicYearId) {
            return response()->json(['success' => false, 'message' => 'No active academic year.'], 422);
        }

        $validated = $request->validate([
            'class_id' => 'required|exists:classes,id',
            'fee_type' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'frequency' => ['required', Rule::in(['monthly', 'quarterly', 'annually', 'one-time'])],
            'description' => 'nullable|string|max:1000',
            'is_compulsory' => 'nullable|boolean',
        ]);

        $structure = FeeStructure::create([
            'organization_id' => $organization->id,
            'academic_year_id' => $activeAcademicYearId,
            'class_id' => $validated['class_id'],
            'fee_type' => $validated['fee_type'],
            'amount' => $validated['amount'],
            'frequency' => $validated['frequency'],
            'description' => $validated['description'] ?? null,
            'is_compulsory' => $validated['is_compulsory'] ?? true,
            'status' => 'active',
        ]);

        return response()->json(['success' => true, 'message' => 'Fee structure created', 'data' => $structure]);
    }

    public function updateStructure(Request $request, FeeStructure $structure)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        if (!$organization || $structure->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'class_id' => 'required|exists:classes,id',
            'fee_type' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'frequency' => ['required', Rule::in(['monthly', 'quarterly', 'annually', 'one-time'])],
            'description' => 'nullable|string|max:1000',
            'is_compulsory' => 'nullable|boolean',
        ]);

        $structure->update([
            'class_id' => $validated['class_id'],
            'fee_type' => $validated['fee_type'],
            'amount' => $validated['amount'],
            'frequency' => $validated['frequency'],
            'description' => $validated['description'] ?? null,
            'is_compulsory' => $validated['is_compulsory'] ?? $structure->is_compulsory,
        ]);

        return response()->json(['success' => true, 'message' => 'Fee structure updated', 'data' => $structure]);
    }

    public function destroyStructure(FeeStructure $structure)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        if (!$organization || $structure->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $structure->delete();
        return response()->json(['success' => true, 'message' => 'Fee structure deleted']);
    }

    public function indexStudents(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked.'], 403);
        }

        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);

        $enrollments = $this->studentAcademicHistoryService
            ->getSessionEnrollments($organization->id, $activeAcademicYearId)
            ->filter(fn ($h) => ($h->status ?? $h->student?->status) === 'active');

        if ($request->filled('class_id')) {
            $enrollments = $enrollments->where('class_id', (int) $request->input('class_id'));
        }

        if ($request->filled('search')) {
            $search = strtolower($request->input('search'));
            $enrollments = $enrollments->filter(function ($h) use ($search) {
                $s = $h->student;
                if (!$s) return false;
                return stripos($s->first_name, $search) !== false
                    || stripos($s->last_name, $search) !== false
                    || stripos($s->admission_no, $search) !== false;
            });
        }

        $students = $enrollments->map(function ($h) {
            $s = $h->student;
            return [
                'id' => (string) $s->id,
                'admission_no' => $s->admission_no,
                'first_name' => $s->first_name,
                'last_name' => $s->last_name,
                'class_id' => $h->class_id,
                'class_name' => $h->schoolClass?->name,
                'section' => $h->schoolClass?->section,
                'roll_number' => $h->roll_number ?: $s->roll_number,
            ];
        })->values();

        return response()->json(['success' => true, 'data' => $students]);
    }

    public function assignFees(Request $request)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked.'], 403);
        }

        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);
        if (!$activeAcademicYearId) {
            return response()->json(['success' => false, 'message' => 'No active academic year.'], 422);
        }

        $validated = $request->validate([
            'fee_structure_id' => 'required|integer',
            'due_date' => 'required|date',
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => 'required|integer',
        ]);

        $feeStructure = FeeStructure::query()
            ->where('organization_id', $organization->id)
            ->find($validated['fee_structure_id']);

        if (!$feeStructure) {
            return response()->json(['success' => false, 'message' => 'Fee structure not found.'], 404);
        }

        $validStudentIds = $this->studentAcademicHistoryService
            ->getSessionEnrollmentQuery($organization->id, $activeAcademicYearId)
            ->whereIn('student_id', $validated['student_ids'])
            ->pluck('student_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (empty($validStudentIds)) {
            return response()->json(['success' => false, 'message' => 'No valid students in active session.'], 422);
        }

        $dueDate = $validated['due_date'];
        $month = date('F', strtotime($dueDate));
        $year = (int) date('Y', strtotime($dueDate));

        $assignedCount = 0;

        DB::transaction(function () use ($validStudentIds, $feeStructure, $organization, $activeAcademicYearId, $dueDate, $month, $year, &$assignedCount) {
            foreach ($validStudentIds as $studentId) {
                $studentFee = StudentFee::query()->firstOrNew([
                    'organization_id' => $organization->id,
                    'student_id' => $studentId,
                    'fee_structure_id' => $feeStructure->id,
                    'academic_year_id' => $activeAcademicYearId,
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

        return response()->json(['success' => true, 'message' => "$assignedCount fee(s) assigned", 'assigned' => $assignedCount]);
    }

    public function indexStudentFees(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked.'], 403);
        }

        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);

        $query = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'not like', self::HOSTEL_FEE_PREFIX))
            ->with([
                'student:id,first_name,last_name,admission_no',
                'feeStructure:id,fee_type,fee_type_mr,fee_type_hi',
                'payments' => fn ($q) => $q->with('collector:id,name')->orderByDesc('payment_date'),
            ])
            ->when($activeAcademicYearId, fn ($q) => $q->where('academic_year_id', $activeAcademicYearId));

        if ($request->filled('class_id')) {
            $studentIds = $this->studentAcademicHistoryService
                ->getSessionEnrollmentQuery($organization->id, $activeAcademicYearId)
                ->where('class_id', $request->input('class_id'))
                ->pluck('student_id');
            $query->whereIn('student_id', $studentIds);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->input('student_id'));
        }

        $fees = $query->orderBy('due_date')->get()->map(function (StudentFee $fee) {
            $student = $fee->student;
            return [
                'id' => $fee->id,
                'student_id' => (string) $fee->student_id,
                'student_name' => $student ? "$student->first_name $student->last_name" : '',
                'admission_no' => $student?->admission_no,
                'fee_type' => ($fee->feeStructure?->localized('fee_type') ?: 'General'),
                'amount' => (float) $fee->amount,
                'discount' => (float) $fee->discount,
                'fine' => (float) $fee->fine,
                'net_amount' => (float) $fee->net_amount,
                'paid_amount' => (float) $fee->paid_amount,
                'balance' => (float) $fee->balance,
                'status' => $fee->status,
                'due_date' => optional($fee->due_date)->format('Y-m-d'),
                'month' => $fee->month,
                'year' => $fee->year,
            ];
        });

        return response()->json(['success' => true, 'data' => $fees]);
    }

    public function collectPayment(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked.'], 403);
        }

        $validated = $request->validate([
            'fee_id' => 'required|integer',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => ['required', Rule::in(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'online'])],
            'transaction_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'remarks' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $studentFee = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->find($validated['fee_id']);

        if (!$studentFee) {
            return response()->json(['success' => false, 'message' => 'Fee record not found.'], 404);
        }

        $currentBalance = (float) $studentFee->balance;
        $paymentAmount = (float) $validated['amount'];

        if ($paymentAmount > $currentBalance) {
            return response()->json(['success' => false, 'message' => 'Payment exceeds pending balance.'], 422);
        }

        DB::transaction(function () use ($studentFee, $paymentAmount, $validated, $user, $organization) {
            FeePayment::create([
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
                'remarks' => $validated['remarks'] ?? null,
            ]);

            $newPaid = (float) $studentFee->paid_amount + $paymentAmount;
            $newBalance = max(0, (float) $studentFee->net_amount - $newPaid);

            $studentFee->update([
                'paid_amount' => $newPaid,
                'balance' => $newBalance,
                'status' => $newBalance <= 0 ? 'paid' : 'partial',
            ]);
        });

        return response()->json(['success' => true, 'message' => 'Payment collected successfully']);
    }

    public function revertPayment(Request $request, FeePayment $payment)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        if (!$organization || $payment->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        if ($payment->status === 'refunded') {
            return response()->json(['success' => false, 'message' => 'Payment already reverted.'], 422);
        }

        $studentFee = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->find($payment->student_fee_id);

        if (!$studentFee) {
            return response()->json(['success' => false, 'message' => 'Associated fee not found.'], 404);
        }

        DB::transaction(function () use ($payment, $studentFee, $validated, $user) {
            $newPaid = max(0, (float) $studentFee->paid_amount - (float) $payment->amount);
            $newBalance = min((float) $studentFee->net_amount, (float) $studentFee->balance + (float) $payment->amount);

            $studentFee->update([
                'paid_amount' => $newPaid,
                'balance' => $newBalance,
                'status' => $newPaid <= 0 ? 'pending' : ($newBalance <= 0 ? 'paid' : 'partial'),
            ]);

            $payment->update([
                'status' => 'refunded',
                'reverted_by' => $user->id,
                'reverted_at' => now()->toDateString(),
                'revert_reason' => $validated['reason'],
                'remarks' => $validated['reason'],
            ]);
        });

        return response()->json(['success' => true, 'message' => 'Payment reverted successfully']);
    }

    public function indexPayments(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked.'], 403);
        }

        $query = FeePayment::query()
            ->where('organization_id', $organization->id)
            ->with(['student:id,first_name,last_name', 'collector:id,name'])
            ->orderByDesc('payment_date');

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->input('student_id'));
        }

        if ($request->filled('date_from')) {
            $query->where('payment_date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->where('payment_date', '<=', $request->input('date_to'));
        }

        $payments = $query->limit(500)->get()->map(function (FeePayment $p) {
            $student = $p->student;
            return [
                'id' => $p->id,
                'student_id' => (string) $p->student_id,
                'student_name' => $student ? "$student->first_name $student->last_name" : '',
                'fee_id' => (string) $p->student_fee_id,
                'receipt_number' => $p->receipt_number,
                'amount' => (float) $p->amount,
                'payment_method' => $p->payment_method,
                'transaction_id' => $p->transaction_id,
                'payment_date' => optional($p->payment_date)->format('Y-m-d'),
                'collected_by' => $p->collector?->name,
                'status' => $p->status === 'refunded' ? 'reverted' : 'active',
                'is_reverted' => $p->status === 'refunded',
                'reverted_at' => optional($p->reverted_at)->format('Y-m-d'),
                'revert_reason' => $p->revert_reason,
                'remarks' => $p->remarks,
            ];
        });

        return response()->json(['success' => true, 'data' => $payments]);
    }

    public function indexIncomeEntries(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked.'], 403);
        }

        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);
        $query = IncomeEntry::query()->where('organization_id', $organization->id);
        if ($activeAcademicYearId) {
            $query->where('academic_year_id', $activeAcademicYearId);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('date_from')) {
            $query->where('date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->where('date', '<=', $request->input('date_to'));
        }

        $entries = $query->orderByDesc('date')->orderByDesc('id')->get()->map(function (IncomeEntry $e) {
            return [
                'id' => $e->id,
                'title' => $e->title,
                'category' => $e->category,
                'amount' => (float) $e->amount,
                'date' => optional($e->date)->format('Y-m-d'),
                'payment_mode' => $e->payment_mode,
                'received_from' => $e->received_from,
                'reference_no' => $e->reference_no ?? '',
                'notes' => $e->notes ?? '',
                'status' => $e->status,
            ];
        });

        return response()->json(['success' => true, 'data' => $entries]);
    }

    public function storeIncomeEntry(Request $request)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked.'], 403);
        }

        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);
        if (!$activeAcademicYearId) {
            return response()->json(['success' => false, 'message' => 'No active academic year.'], 422);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'payment_mode' => 'required|string|max:100',
            'received_from' => 'required|string|max:255',
            'reference_no' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'status' => ['required', Rule::in(['received', 'pending'])],
        ]);

        $entry = IncomeEntry::create([
            'organization_id' => $organization->id,
            'academic_year_id' => $activeAcademicYearId,
            'title' => $validated['title'],
            'category' => $validated['category'],
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'payment_mode' => $validated['payment_mode'],
            'received_from' => $validated['received_from'],
            'reference_no' => $validated['reference_no'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json(['success' => true, 'message' => 'Income entry created', 'data' => $entry]);
    }

    public function updateIncomeEntry(Request $request, IncomeEntry $entry)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        if (!$organization || $entry->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'payment_mode' => 'required|string|max:100',
            'received_from' => 'required|string|max:255',
            'reference_no' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'status' => ['required', Rule::in(['received', 'pending'])],
        ]);

        $entry->update($validated);
        return response()->json(['success' => true, 'message' => 'Income entry updated', 'data' => $entry]);
    }

    public function destroyIncomeEntry(IncomeEntry $entry)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        if (!$organization || $entry->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $entry->delete();
        return response()->json(['success' => true, 'message' => 'Income entry deleted']);
    }

    public function indexExpenseEntries(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked.'], 403);
        }

        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);
        $query = ExpenseEntry::query()->where('organization_id', $organization->id);
        if ($activeAcademicYearId) {
            $query->where('academic_year_id', $activeAcademicYearId);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('date_from')) {
            $query->where('date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->where('date', '<=', $request->input('date_to'));
        }

        $entries = $query->orderByDesc('date')->orderByDesc('id')->get()->map(function (ExpenseEntry $e) {
            return [
                'id' => $e->id,
                'title' => $e->title,
                'category' => $e->category,
                'amount' => (float) $e->amount,
                'date' => optional($e->date)->format('Y-m-d'),
                'payment_mode' => $e->payment_mode,
                'paid_to' => $e->paid_to,
                'voucher_no' => $e->voucher_no ?? '',
                'notes' => $e->notes ?? '',
                'status' => $e->status,
            ];
        });

        return response()->json(['success' => true, 'data' => $entries]);
    }

    public function storeExpenseEntry(Request $request)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked.'], 403);
        }

        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);
        if (!$activeAcademicYearId) {
            return response()->json(['success' => false, 'message' => 'No active academic year.'], 422);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'payment_mode' => 'required|string|max:100',
            'paid_to' => 'required|string|max:255',
            'voucher_no' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'status' => ['required', Rule::in(['paid', 'due'])],
        ]);

        $entry = ExpenseEntry::create([
            'organization_id' => $organization->id,
            'academic_year_id' => $activeAcademicYearId,
            'title' => $validated['title'],
            'category' => $validated['category'],
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'payment_mode' => $validated['payment_mode'],
            'paid_to' => $validated['paid_to'],
            'voucher_no' => $validated['voucher_no'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json(['success' => true, 'message' => 'Expense entry created', 'data' => $entry]);
    }

    public function updateExpenseEntry(Request $request, ExpenseEntry $entry)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        if (!$organization || $entry->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'payment_mode' => 'required|string|max:100',
            'paid_to' => 'required|string|max:255',
            'voucher_no' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'status' => ['required', Rule::in(['paid', 'due'])],
        ]);

        $entry->update($validated);
        return response()->json(['success' => true, 'message' => 'Expense entry updated', 'data' => $entry]);
    }

    public function destroyExpenseEntry(ExpenseEntry $entry)
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        if (!$organization || $entry->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $entry->delete();
        return response()->json(['success' => true, 'message' => 'Expense entry deleted']);
    }

    private function getActiveAcademicYearId(Organization $org): ?int
    {
        return AcademicYear::query()
            ->where('organization_id', $org->id)
            ->where('is_current', true)
            ->value('id');
    }

    private function generateReceiptNumber(): string
    {
        do {
            $receipt = 'RCT-' . now()->format('Ymd') . '-' . random_int(1000, 9999);
        } while (FeePayment::query()->where('receipt_number', $receipt)->exists());

        return $receipt;
    }

    private function resolveOrganizationForUser($user): ?Organization
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
