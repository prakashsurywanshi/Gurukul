<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\StaffLoan;
use App\Models\User;
use App\Support\RolePermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StaffLoansController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $loans = StaffLoan::query()
            ->where('organization_id', $organization->id)
            ->with(['staff:id,name,role', 'approver:id,name'])
            ->orderByDesc('start_date')
            ->get()
            ->map(fn (StaffLoan $loan) => [
                'id' => $loan->id,
                'staffName' => $loan->staff?->name,
                'staffRole' => RolePermissionCatalog::displayNameForSlug($loan->staff?->role ?? '') ?? $loan->staff?->role,
                'reason' => $loan->loan_reason,
                'principal' => (float) $loan->principal_amount,
                'interestRate' => (float) $loan->interest_rate,
                'tenureMonths' => $loan->tenure_months,
                'monthlyEmi' => (float) $loan->monthly_emi,
                'startDate' => $loan->start_date->toDateString(),
                'paidEmis' => $loan->paid_emis,
                'remainingEmis' => max(0, $loan->tenure_months - $loan->paid_emis),
                'outstanding' => max(0.0, round((float) $loan->monthly_emi * ($loan->tenure_months - $loan->paid_emis), 2)),
                'status' => $loan->status,
                'notes' => $loan->notes,
            ]);

        return Inertia::render('dashboard/StaffLoans', [
            'user' => $user,
            'loans' => $loans,
            'staffOptions' => $this->staffOptions($organization),
            'summary' => [
                'openLoans' => $loans->filter(fn ($loan) => $loan['status'] === 'active')->count(),
                'outstandingTotal' => (float) StaffLoan::query()
                    ->where('organization_id', $organization->id)
                    ->where('status', 'active')
                    ->get()
                    ->sum(fn (StaffLoan $loan) => $loan->monthly_emi * max(0, $loan->tenure_months - $loan->paid_emis)),
                'emisCollected' => (int) StaffLoan::query()->where('organization_id', $organization->id)->sum('paid_emis'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate($this->rules($organization));

        StaffLoan::query()->create([
            'organization_id' => $organization->id,
            'staff_user_id' => $validated['staff_user_id'],
            'loan_reason' => $validated['loan_reason'],
            'principal_amount' => $validated['principal_amount'],
            'interest_rate' => $validated['interest_rate'] ?? 0,
            'tenure_months' => $validated['tenure_months'],
            'monthly_emi' => $validated['monthly_emi'],
            'start_date' => $validated['start_date'] ?? now()->toDateString(),
            'paid_emis' => $validated['paid_emis'] ?? 0,
            'status' => $validated['status'],
            'approved_by' => $user->id,
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Staff loan recorded.');
    }

    public function update(Request $request, StaffLoan $staffLoan): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($staffLoan->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'paid_emis' => ['required', 'integer', 'min:0'],
            'status' => ['required', Rule::in(['active', 'completed', 'cancelled'])],
        ]);

        $staffLoan->update([
            'paid_emis' => $validated['paid_emis'],
            'status' => $validated['status'],
        ]);

        return back()->with('success', 'Loan record updated.');
    }

    public function destroy(Request $request, StaffLoan $staffLoan): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($staffLoan->organization_id === $organization->id, 404);

        $staffLoan->delete();

        return back()->with('success', 'Loan record deleted.');
    }

    private function rules(Organization $organization): array
    {
        return [
            'staff_user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('organization_id', $organization->id)],
            'loan_reason' => ['required', 'string', 'max:255'],
            'principal_amount' => ['required', 'numeric', 'gt:0'],
            'interest_rate' => ['nullable', 'numeric', 'min:0'],
            'tenure_months' => ['required', 'integer', 'min:1'],
            'monthly_emi' => ['required', 'numeric', 'gt:0'],
            'start_date' => ['nullable', 'date'],
            'paid_emis' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', Rule::in(['active', 'completed', 'cancelled'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    private function staffOptions(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', RolePermissionCatalog::staffRoleSlugs())
            ->orderBy('name')
            ->get(['id', 'name', 'role'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => RolePermissionCatalog::displayNameForSlug($user->role) ?? $user->role,
            ])
            ->values()
            ->all();
    }

    private function abortUnlessAdmin(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
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