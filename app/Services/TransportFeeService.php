<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\FeeStructure;
use App\Models\Organization;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\TransportAssignment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class TransportFeeService
{
    public const FEE_TYPE_PREFIX = 'Transport Fee - ';

    /**
     * Creates or refreshes the monthly transport due rows for an active
     * assignment. Nothing is generated while the assignment is not active, or
     * while the bus routes its fees to a vendor ledger instead of the school.
     */
    public function syncAssignmentFees(
        TransportAssignment $assignment,
        ?int $academicYearId = null,
        bool $feesApproved = true
    ): void {
        $student = $assignment->student;
        $route = $assignment->route;

        if (! $student || ! $route || ! $student->organization_id || ! $student->class_id || $assignment->status !== 'active') {
            return;
        }

        $organization = Organization::query()->find($student->organization_id);
        if (! $organization) {
            return;
        }

        if (! $feesApproved) {
            return;
        }

        $vehicle = $assignment->vehicle;
        if ($vehicle?->effectivePolicy()['fee_ledger'] === 'vendor') {
            return;
        }

        $academicYearId ??= $assignment->academic_year_id ?: $organization->selectedAcademicYear()?->id;
        if (! $academicYearId) {
            return;
        }

        if ($assignment->academic_year_id && (int) $assignment->academic_year_id !== (int) $academicYearId) {
            return;
        }

        $academicYear = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->find($academicYearId);

        if (! $academicYear) {
            return;
        }

        $feeStructure = $this->ensureTransportFeeStructure($organization, $academicYearId, $student, $route, $assignment);
        $monthlyAmount = (float) ($assignment->monthly_fee ?: $route->monthly_fee ?: $route->fare ?: 0);

        $periodStart = Carbon::parse($academicYear->start_date)->startOfMonth();
        $assignmentStart = Carbon::parse($assignment->created_at ?? now())->startOfMonth();
        $cursor = $assignmentStart->greaterThan($periodStart) ? $assignmentStart->copy() : $periodStart->copy();
        $periodEnd = Carbon::parse($academicYear->end_date)->startOfMonth();

        while ($cursor->lte($periodEnd)) {
            $monthName = $cursor->format('F');
            $dueDate = $this->determineTransportDueDate($cursor, $academicYear);

            $studentFee = StudentFee::query()->firstOrNew([
                'organization_id' => $organization->id,
                'student_id' => $student->id,
                'fee_structure_id' => $feeStructure->id,
                'transport_assignment_id' => $assignment->id,
                'academic_year_id' => $academicYearId,
                'month' => $monthName,
                'year' => (int) $cursor->format('Y'),
            ]);

            $discount = (float) ($studentFee->discount ?? 0);
            $fine = (float) ($studentFee->fine ?? 0);
            $paidAmount = (float) ($studentFee->paid_amount ?? 0);
            $netAmount = max(0, $monthlyAmount - $discount + $fine);
            $balance = max(0, $netAmount - $paidAmount);

            $studentFee->fill([
                'amount' => $monthlyAmount,
                'discount' => $discount,
                'fine' => $fine,
                'net_amount' => $netAmount,
                'paid_amount' => $paidAmount,
                'balance' => $balance,
                'due_date' => $dueDate->toDateString(),
                'status' => $studentFee->status === 'waived'
                    ? 'waived'
                    : $this->determineFeeStatus($balance, $dueDate, $paidAmount),
                'notes' => sprintf(
                    'Auto-synced monthly transport fee for route %s and stop %s.',
                    $route->route_name,
                    $assignment->pickup_point
                ),
            ]);
            $studentFee->save();

            $cursor->addMonthNoOverflow();
        }
    }

    public function syncOrganization(Organization $organization, ?int $academicYearId = null): void
    {
        $academicYearId ??= $organization->selectedAcademicYear()?->id;

        if (! $academicYearId) {
            return;
        }

        TransportAssignment::query()
            ->with(['student.schoolClass', 'route', 'vehicle'])
            ->where('status', 'active')
            ->where('academic_year_id', $academicYearId)
            ->whereHas('student', fn ($query) => $query->where('organization_id', $organization->id))
            ->get()
            ->each(fn (TransportAssignment $assignment) => $this->syncAssignmentFees($assignment, $academicYearId));
    }

    /**
     * Drops or zeroes the monthly dues tied to an assignment. Unpaid dues with
     * no payment attempt are deleted; anything already collected is written off
     * so the ledger stays balanced.
     */
    public function clearAssignmentDues(TransportAssignment $assignment): void
    {
        DB::transaction(function () use ($assignment) {
            StudentFee::query()
                ->where('transport_assignment_id', $assignment->id)
                ->withCount([
                    'payments as active_payments_count' => fn ($query) => $query->whereIn('status', ['success', 'pending']),
                ])
                ->get()
                ->each(function (StudentFee $fee) {
                    $paidAmount = (float) $fee->paid_amount;

                    if ($paidAmount <= 0 && (int) $fee->active_payments_count === 0) {
                        $fee->delete();

                        return;
                    }

                    $fee->update([
                        'net_amount' => $paidAmount,
                        'balance' => 0,
                        'status' => $paidAmount > 0 ? 'paid' : 'waived',
                        'notes' => trim(($fee->notes ? $fee->notes . "\n" : '') . 'Transport assignment removed; remaining transport due cleared.'),
                    ]);
                });
        });
    }

    private function ensureTransportFeeStructure(
        Organization $organization,
        int $academicYearId,
        Student $student,
        \App\Models\TransportRoute $route,
        TransportAssignment $assignment
    ): FeeStructure {
        $stopLabel = $assignment->pickup_point ?: 'Assigned Stop';
        $feeType = sprintf('%s%s / %s', self::FEE_TYPE_PREFIX, $route->route_name, $stopLabel);
        $amount = (float) ($assignment->monthly_fee ?: $route->monthly_fee ?: $route->fare ?: 0);

        $feeStructure = FeeStructure::query()->firstOrNew([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'class_id' => $student->class_id,
            'fee_type' => $feeType,
        ]);

        $feeStructure->fill([
            'amount' => $amount,
            'frequency' => 'monthly',
            'description' => sprintf('Auto-synced monthly transport fee for route %s (%s).', $route->route_name, $stopLabel),
            'is_compulsory' => true,
            'status' => 'active',
        ]);
        $feeStructure->save();

        return $feeStructure;
    }

    private function determineTransportDueDate(Carbon $month, AcademicYear $academicYear): Carbon
    {
        $sessionStart = Carbon::parse($academicYear->start_date)->startOfDay();
        $defaultDueDate = $month->copy()->startOfMonth();

        return $defaultDueDate->format('Y-m') === $sessionStart->format('Y-m')
            ? $sessionStart
            : $defaultDueDate;
    }

    public function determineFeeStatus(float $balance, Carbon|string|null $dueDate, float $paidAmount): string
    {
        if ($balance <= 0) {
            return 'paid';
        }

        if ($paidAmount > 0) {
            return 'partial';
        }

        if ($dueDate && Carbon::parse($dueDate)->isPast()) {
            return 'overdue';
        }

        return 'pending';
    }
}
