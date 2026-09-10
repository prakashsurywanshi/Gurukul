<?php

namespace App\Http\Controllers;

use App\Models\InventorySupplier;
use App\Models\Organization;
use App\Models\SupplierPayment;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SupplierPaymentController extends Controller
{
    public function index(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $payments = SupplierPayment::query()
            ->where('organization_id', $organization->id)
            ->with(['supplier:id,organization_id,name', 'creator:id,name'])
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($payment) => [
                'id' => $payment->id,
                'supplierName' => $payment->supplier?->name,
                'amount' => (float) $payment->amount,
                'paymentDate' => $payment->payment_date->toDateString(),
                'paymentMethod' => $payment->payment_method,
                'referenceNo' => $payment->reference_no,
                'notes' => $payment->notes,
                'createdByName' => $payment->creator?->name,
            ]);

        $suppliers = InventorySupplier::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get()
            ->map(fn ($supplier) => [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'paidTotal' => (float) SupplierPayment::query()->where('inventory_supplier_id', $supplier->id)->sum('amount'),
            ]);

        return Inertia::render('dashboard/SupplierPayments', [
            'payments' => $payments,
            'suppliers' => $suppliers,
            'summary' => [
                'totalPaid' => (float) SupplierPayment::query()->where('organization_id', $organization->id)->sum('amount'),
                'monthPaid' => (float) SupplierPayment::query()->where('organization_id', $organization->id)->whereMonth('payment_date', now()->month)->whereYear('payment_date', now()->year)->sum('amount'),
                'paymentsCount' => $payments->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'inventory_supplier_id' => ['required', 'integer', Rule::exists('inventory_suppliers', 'id')->where('organization_id', $organization->id)],
            'amount' => ['required', 'numeric', 'gt:0'],
            'payment_date' => ['nullable', 'date'],
            'payment_method' => ['required', Rule::in(['cash', 'cheque', 'bank_transfer', 'upi', 'other'])],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        SupplierPayment::query()->create([
            'organization_id' => $organization->id,
            'inventory_supplier_id' => $validated['inventory_supplier_id'],
            'amount' => $validated['amount'],
            'payment_date' => $validated['payment_date'] ?? now()->toDateString(),
            'payment_method' => $validated['payment_method'],
            'reference_no' => $validated['reference_no'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'created_by' => $user->id,
        ]);

        return back()->with('success', 'Supplier payment recorded.');
    }

    public function destroy(Request $request, SupplierPayment $supplierPayment): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($supplierPayment->organization_id === $organization->id, 404);

        $supplierPayment->delete();

        return back()->with('success', 'Payment record deleted.');
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

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

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