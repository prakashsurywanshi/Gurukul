<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResolvesHrContext;
use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\StaffPayrollEntry;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Number;
use Illuminate\Validation\Rule;

class PayrollApiController extends Controller
{
    use ResolvesHrContext;

    public const STATUSES = ['draft', 'processed', 'paid'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveHrOrganization($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $month = $this->normalizeMonth($request->query('month'));

        $records = StaffPayrollEntry::query()
            ->with('staff')
            ->where('organization_id', $organization->id)
            ->whereDate('payroll_month', Carbon::createFromFormat('Y-m', $month)->startOfMonth()->toDateString())
            ->orderBy('id')
            ->get()
            ->map(fn (StaffPayrollEntry $entry) => $this->serialize($entry))
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'month' => $month,
                'statuses' => self::STATUSES,
                'can_manage' => $this->canManageHr($user, $organization),
                'staff' => $this->hrStaffRecords($organization),
                'records' => $records,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveHrOrganization($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        if (! $this->canManageHr($user, $organization)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'payroll_month' => ['required', 'date_format:Y-m'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.staff_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'entries.*.base_pay' => ['required', 'numeric', 'min:0'],
            'entries.*.allowance' => ['required', 'numeric', 'min:0'],
            'entries.*.deduction' => ['required', 'numeric', 'min:0'],
            'entries.*.status' => ['required', Rule::in(self::STATUSES)],
        ]);

        $staffIds = collect($validated['entries'])->pluck('staff_id')->all();
        $this->ensureHrStaffBelongToOrganization($staffIds, $organization);

        $payrollMonth = Carbon::createFromFormat('Y-m', $validated['payroll_month'])->startOfMonth()->toDateString();

        foreach ($validated['entries'] as $entry) {
            StaffPayrollEntry::query()->updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'user_id' => $entry['staff_id'],
                    'payroll_month' => $payrollMonth,
                ],
                [
                    'base_pay' => $entry['base_pay'],
                    'allowance' => $entry['allowance'],
                    'deduction' => $entry['deduction'],
                    'status' => $entry['status'],
                    'prepared_by' => $user->id,
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Staff payroll saved successfully.',
        ]);
    }

    public function payslip(StaffPayrollEntry $payrollEntry)
    {
        $user = Auth::user();
        $organization = $this->resolveHrOrganization($user);

        if (! $organization || (int) $payrollEntry->organization_id !== (int) $organization->id) {
            return response()->json(['success' => false, 'message' => 'Payslip not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->buildPayslipData($payrollEntry->load('staff.designation'), $organization),
        ]);
    }

    private function normalizeMonth(?string $month): string
    {
        if (is_string($month) && preg_match('/^\d{4}-\d{2}$/', $month)) {
            return $month;
        }

        return now()->format('Y-m');
    }

    private function serialize(StaffPayrollEntry $entry): array
    {
        $gross = (float) $entry->base_pay + (float) $entry->allowance;
        $net = max(0, $gross - (float) $entry->deduction);

        return [
            'id' => $entry->id,
            'staff_id' => $entry->user_id,
            'staff_name' => $entry->staff?->name,
            'payroll_month' => optional($entry->payroll_month)->format('Y-m'),
            'base_pay' => (float) $entry->base_pay,
            'allowance' => (float) $entry->allowance,
            'deduction' => (float) $entry->deduction,
            'gross_pay' => $gross,
            'net_pay' => $net,
            'status' => $entry->status,
        ];
    }

    private function buildPayslipData(StaffPayrollEntry $entry, Organization $organization): array
    {
        $staff = $entry->staff;
        $gross = (float) $entry->base_pay + (float) $entry->allowance;
        $net = max(0, $gross - (float) $entry->deduction);

        return [
            'slip_no' => $entry->id,
            'month' => optional($entry->payroll_month)->translatedFormat('F Y'),
            'status' => ucfirst((string) $entry->status),
            'base_pay' => (float) $entry->base_pay,
            'allowance' => (float) $entry->allowance,
            'deduction' => (float) $entry->deduction,
            'gross_pay' => $gross,
            'net_pay' => $net,
            'net_pay_words' => Number::spell((int) round($net)),
            'generated_at' => now()->format('d M Y, h:i A'),
            'earnings' => [
                ['description' => 'Basic Pay', 'amount' => (float) $entry->base_pay],
                ['description' => 'Allowances', 'amount' => (float) $entry->allowance],
            ],
            'deductions' => [
                ['description' => 'Deductions', 'amount' => (float) $entry->deduction],
            ],
            'staff' => [
                'name' => $staff?->name ?? 'Unknown Staff',
                'email' => $staff?->email ?? '-',
                'role' => $staff ? ucwords(str_replace('_', ' ', $staff->role)) : '-',
                'designation' => $staff?->designation?->name,
                'staff_id' => $staff?->employee_id ?? (string) ($staff?->id ?? '-'),
            ],
            'organization' => [
                'name' => $organization->name,
                'address' => $organization->address,
                'phone' => $organization->phone,
                'email' => $organization->email,
                'logo' => $organization->logo,
            ],
        ];
    }
}
