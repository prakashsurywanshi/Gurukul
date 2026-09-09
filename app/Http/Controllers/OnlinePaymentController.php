<?php

namespace App\Http\Controllers;

use App\Models\FeePayment;
use App\Models\Organization;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use App\Services\AccountTransactionService;
use App\Services\FeeAuditService;
use App\Services\OnlinePaymentService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Throwable;

class OnlinePaymentController extends Controller
{
    public function __construct(
        private readonly OnlinePaymentService $paymentService,
        private readonly FeeAuditService $feeAuditService,
        private readonly AccountTransactionService $accountTransactionService
    ) {
    }

    public function pay(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $this->resolveStudentForUser($user, $organization);

        abort_unless($organization && $student && $user->role === 'student', 403);

        $validated = $request->validate([
            'student_fee_id' => ['required', 'string'],
        ]);

        $studentFee = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->find($validated['student_fee_id']);

        if (! $studentFee) {
            return response()->json(['message' => 'Fee record not found.'], 422);
        }

        $balance = (float) $studentFee->balance;

        if ($balance <= 0) {
            return response()->json(['message' => 'This fee has no pending balance.'], 422);
        }

        $settings = OnlinePaymentService::settings($organization);

        if (OnlinePaymentService::isRazorpayConfigured($organization)) {
            try {
                $order = $this->paymentService->createRazorpayOrder(
                    $organization,
                    round($balance * 100, 2),
                    'FEES-'.$studentFee->id,
                );
            } catch (Throwable $e) {
                return response()->json(['message' => 'Payment gateway is temporarily unavailable.'], 503);
            }

            $pendingPayment = FeePayment::query()->create([
                'organization_id' => $organization->id,
                'student_fee_id' => $studentFee->id,
                'student_id' => $studentFee->student_id,
                'receipt_number' => $this->generateReceiptNumber(),
                'amount' => $balance,
                'payment_method' => 'online',
                'transaction_id' => $order['id'] ?? null,
                'payment_date' => now()->toDateString(),
                'collected_by' => $user->id,
                'status' => 'pending',
            ]);

            return response()->json([
                'gateway' => 'razorpay',
                'keyId' => $settings['razorpay_key_id'],
                'orderId' => $order['id'] ?? null,
                'amount' => (int) round($balance * 100),
                'currency' => $settings['razorpay_currency'] ?? 'INR',
                'pendingPaymentId' => (string) $pendingPayment->id,
            ]);
        }

        if (OnlinePaymentService::isUpiConfigured($organization)) {
            return response()->json([
                'gateway' => 'upi',
                'upiPayload' => OnlinePaymentService::upiPayload(
                    $settings['upi_id'],
                    $settings['upi_holder_name'],
                    $balance,
                    'Fee Payment RCT • '.$student->admission_no,
                ),
                'upiId' => $settings['upi_id'],
                'holderName' => $settings['upi_holder_name'],
                'amount' => $balance,
                'currency' => 'INR',
                'studentFeeId' => (string) $studentFee->id,
            ]);
        }

        return response()->json(['message' => 'Online payments are not enabled. Contact the school office.'], 422);
    }

    public function razorpayVerify(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $this->resolveStudentForUser($user, $organization);

        abort_unless($organization && $student && $user->role === 'student', 403);

        $validated = $request->validate([
            'orderId' => ['required', 'string'],
            'paymentId' => ['required', 'string'],
            'signature' => ['required', 'string'],
        ]);

        $pendingPayment = FeePayment::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->where('status', 'pending')
            ->where('payment_method', 'online')
            ->where('transaction_id', $validated['orderId'])
            ->first();

        if (! $pendingPayment) {
            return response()->json(['message' => 'Payment record not found.'], 422);
        }

        if (! $this->paymentService->verifySignature($validated['orderId'], $validated['paymentId'], $validated['signature'], $organization)) {
            $pendingPayment->update(['status' => 'failed', 'remarks' => 'Signature verification failed']);

            return response()->json(['message' => 'Payment verification failed. Please contact the school office.'], 422);
        }

        $studentFee = $pendingPayment->studentFee;

        if (! $studentFee) {
            return response()->json(['message' => 'Fee record not found.'], 422);
        }

        $receipt = DB::transaction(function () use ($pendingPayment, $studentFee, $user, $validated) {
            $pendingPayment->update([
                'status' => 'success',
                'transaction_id' => $validated['paymentId'],
                'remarks' => 'Razorpay order '.$validated['orderId'],
            ]);

            $paidAmount = (float) $studentFee->paid_amount + (float) $pendingPayment->amount;
            $balance = max(0, (float) $studentFee->net_amount - $paidAmount);

            $studentFee->update([
                'paid_amount' => $paidAmount,
                'balance' => $balance,
                'status' => $balance <= 0 ? 'paid' : 'partial',
            ]);

            return $this->serializeReceipt($pendingPayment->refresh());
        });

        return response()->json(['success' => true, 'receipt' => $receipt]);
    }

    public function upiConfirm(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $this->resolveStudentForUser($user, $organization);

        abort_unless($organization && $student && $user->role === 'student', 403);

        $validated = $request->validate([
            'student_fee_id' => ['required', 'string'],
            'upi_transaction_id' => ['required', 'string', 'max:255'],
        ]);

        $studentFee = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->find($validated['student_fee_id']);

        if (! $studentFee) {
            return response()->json(['message' => 'Fee record not found.'], 422);
        }

        $exists = $studentFee->payments()
            ->where('status', '!=', 'failed')
            ->where('payment_method', 'upi')
            ->where('transaction_id', $validated['upi_transaction_id'])
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'This UPI transaction reference was already submitted.'], 422);
        }

        FeePayment::query()->create([
            'organization_id' => $organization->id,
            'student_fee_id' => $studentFee->id,
            'student_id' => $studentFee->student_id,
            'receipt_number' => $this->generateReceiptNumber(),
            'amount' => (float) $studentFee->balance,
            'payment_method' => 'upi',
            'transaction_id' => $validated['upi_transaction_id'],
            'payment_date' => now()->toDateString(),
            'collected_by' => $user->id,
            'status' => 'pending',
            'remarks' => 'Submitted via UPI QR. Awaiting staff verification.',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment reference submitted. The accounts team will confirm it shortly.',
        ]);
    }

    public function approvePending(Request $request, FeePayment $feePayment): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $feePayment->organization_id === $organization->id, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'accountant', 'receptionist'], true), 403);

        if ($feePayment->status !== 'pending') {
            return redirect()->route('fees')->with('error', 'Only pending online payments can be confirmed.');
        }

        $studentFee = $feePayment->studentFee;

        if (! $studentFee) {
            return redirect()->route('fees')->with('error', 'Associated fee record no longer exists.');
        }

        DB::transaction(function () use ($feePayment, $studentFee, $user) {
            $feePayment->update([
                'status' => 'success',
                'payment_date' => now()->toDateString(),
                'collected_by' => $user->id,
                'remarks' => trim(($feePayment->remarks ? $feePayment->remarks.' ' : '').'Confirmed by '.$user->name),
            ]);

            $paidAmount = (float) $studentFee->paid_amount + (float) $feePayment->amount;
            $balance = max(0, (float) $studentFee->net_amount - $paidAmount);

            $studentFee->update([
                'paid_amount' => $paidAmount,
                'balance' => $balance,
                'status' => $balance <= 0 ? 'paid' : 'partial',
            ]);
        });

        $this->feeAuditService->log($organization, 'payment.approved', $user, [
            'amount' => $feePayment->amount,
            'student_id' => $feePayment->student_id,
            'student_fee_id' => $feePayment->student_fee_id,
            'fee_payment_id' => $feePayment->id,
            'meta' => [
                'payment_method' => 'online',
                'remarks' => $feePayment->remarks,
            ],
        ]);

        $account = $this->accountTransactionService->defaultAccount($organization);
        if ($account) {
            $this->accountTransactionService->record($organization, $account, 'fee_payment', (float) $feePayment->amount, [
                'description' => 'Online fee payment for student record '.$feePayment->student_fee_id,
                'transaction_date' => now()->toDateString(),
                'reference_type' => FeePayment::class,
                'reference_id' => $feePayment->id,
                'created_by' => $user->id,
            ]);
        }

        return redirect()->route('fees')->with('success', 'Online payment confirmed successfully.');
    }

    private function serializeReceipt(FeePayment $payment): array
    {
        $student = $payment->student;
        $fee = $payment->studentFee;

        return [
            'receiptNumber' => $payment->receipt_number,
            'amount' => (float) $payment->amount,
            'paymentMethod' => $payment->payment_method,
            'transactionId' => $payment->transaction_id,
            'paymentDate' => $payment->payment_date->format('d M Y'),
            'status' => $payment->status,
            'feeType' => $fee?->feeStructure?->localized('fee_type') ?? 'General Fee',
            'student' => [
                'first_name' => $student?->first_name,
                'last_name' => $student?->last_name,
                'admission_no' => $student?->admission_no,
                'class' => $student?->schoolClass?->name,
                'section' => $student?->schoolClass?->section,
            ],
        ];
    }

    private function generateReceiptNumber(): string
    {
        do {
            $receipt = 'RCT-'.now()->format('Ymd').'-'.random_int(1000, 9999);
        } while (FeePayment::query()->where('receipt_number', $receipt)->exists());

        return $receipt;
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user->organization_id
            ? Organization::query()->find($user->organization_id)
            : null;
    }

    private function resolveStudentForUser(User $user, ?Organization $organization): ?Student
    {
        if (! $organization) {
            return null;
        }

        return Student::query()
            ->with(['schoolClass:id,name,section', 'feeStructure'])
            ->where('organization_id', $organization->id)
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)->orWhere('email', $user->email);
            })
            ->first();
    }
}