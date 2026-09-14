<?php

namespace App\Services\Approvals;

use App\Models\ActivityLog;
use App\Models\FeeConcessionRequest;
use App\Models\Organization;
use App\Models\ApprovalRequest;
use App\Models\StudentFee;
use App\Models\User;

class FeeConcessionApprovalHandler implements ApprovalModuleHandler
{
    public static function module(): string
    {
        return 'fee_concession';
    }

    public function label(): string
    {
        return 'Fee Concession';
    }

    public function title(ApprovalRequest $request): string
    {
        $record = $this->record($request);
        $student = $record->student ?? null;

        return 'Fee concession for '.trim(($student->first_name ?? '').' '.($student->last_name ?? '')).' (₹'.number_format((float) $record->amount, 2).')';
    }

    public function summary(ApprovalRequest $request): string
    {
        $record = $this->record($request);
        $student = $record->student ?? null;

        return 'Fee concession of ₹'.number_format((float) $record->amount, 2).' for '.trim(($student->first_name ?? '').' '.($student->last_name ?? ''));
    }

    public function detail(ApprovalRequest $request): array
    {
        $record = $this->record($request);
        $student = $record->student ?? null;

        return [
            'Student' => trim(($student->first_name ?? '').' '.($student->last_name ?? '')).' ('.($student->admission_no ?? '').')',
            'Class' => trim(($student->schoolClass?->name ?? '').' '.($student->schoolClass?->section ?? '')),
            'Amount' => '₹'.number_format((float) $record->amount, 2),
            'Reason' => $record->reason,
            'Requested by' => $record->requester?->name,
        ];
    }

    public function onSubmitted(Organization $organization, ApprovalRequest $request, User $requester): void
    {
        // FeeConcessionRequest already created with status pending by the controller.
    }

    public function onApproved(Organization $organization, ApprovalRequest $request, User $actor, ?string $note): void
    {
        $record = $this->record($request);

        if ($record->status !== 'pending') {
            return;
        }

        $appliedAmount = $this->applyConcession($organization, $record);

        $noteText = $note ?? null;
        if ($appliedAmount < (float) $record->amount) {
            $noteText = trim(($noteText ? $noteText."\n" : '').'Applied amount: '.number_format($appliedAmount, 2));
        }

        $record->forceFill([
            'status' => 'approved',
            'applied_amount' => $appliedAmount,
            'reviewed_by' => $actor->id,
            'reviewed_at' => now(),
            'review_note' => $noteText,
        ])->save();

        ActivityLog::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $actor->id,
            'action' => 'Approved',
            'module' => 'Fee Concession',
            'record_type' => FeeConcessionRequest::class,
            'record_id' => $record->id,
            'description' => 'Approved fee concession of '.$record->amount.' for student #'.$record->student_id,
        ]);
    }

    public function onRejected(Organization $organization, ApprovalRequest $request, User $actor, ?string $note): void
    {
        $record = $this->record($request);

        if ($record->status !== 'pending') {
            return;
        }

        $record->forceFill([
            'status' => 'rejected',
            'reviewed_by' => $actor->id,
            'reviewed_at' => now(),
            'review_note' => $note,
        ])->save();
    }

    public function onCancelled(Organization $organization, ApprovalRequest $request, User $actor): void
    {
        // No-op; record stays in pending state until manually dealt with.
    }

    private function record(ApprovalRequest $request): FeeConcessionRequest
    {
        return FeeConcessionRequest::query()->find($request->module_id);
    }

    private function applyConcession(Organization $organization, FeeConcessionRequest $request): float
    {
        $studentId = $request->student_id;
        $remaining = (float) $request->amount;
        $applied = 0;

        $rows = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $studentId)
            ->whereIn('status', ['pending', 'partial', 'overdue'])
            ->where('balance', '>', 0)
            ->orderBy('due_date')
            ->orderBy('id')
            ->get();

        foreach ($rows as $row) {
            if ($remaining <= 0) {
                break;
            }

            $cap = max(0.0, (float) $row->balance);
            if ($cap <= 0) {
                continue;
            }

            $apply = round(min($remaining, $cap), 2);
            if ($apply <= 0) {
                continue;
            }

            $currentDiscount = max(0.0, (float) $row->discount);
            $newDiscount = round($currentDiscount + $apply, 2);
            $amount = (float) $row->amount;
            $fine = (float) $row->fine;
            $netAmount = round(max(0, $amount + $fine - $newDiscount), 2);
            $paidAmount = max(0.0, (float) $row->paid_amount);
            $newBalance = round(max(0, $netAmount - $paidAmount), 2);

            $row->update([
                'discount' => $newDiscount,
                'net_amount' => $netAmount,
                'balance' => $newBalance,
                'status' => $newBalance <= 0
                    ? 'paid'
                    : ($paidAmount > 0 ? 'partial' : $row->status),
            ]);

            $applied = round($applied + $apply, 2);
            $remaining = round($remaining - $apply, 2);
        }

        return $applied;
    }
}