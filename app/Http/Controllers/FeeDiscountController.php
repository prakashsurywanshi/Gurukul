<?php

namespace App\Http\Controllers;

use App\Models\FeeDiscount;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FeeDiscountController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $discounts = FeeDiscount::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get();

        return Inertia::render('dashboard/FeeDiscounts', [
            'user' => $user,
            'discounts' => $discounts->map(fn (FeeDiscount $discount) => [
                'id' => $discount->id,
                'name' => $discount->name,
                'discountType' => $discount->discount_type,
                'value' => $discount->value,
                'description' => $discount->description,
                'status' => $discount->status,
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'accountant'], true), 403);

        $validated = $this->validateDiscount($request, $organization);

        FeeDiscount::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'discount_type' => $validated['discount_type'],
            'value' => $validated['value'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        return back()->with('success', 'Fee discount created successfully.');
    }

    public function update(Request $request, FeeDiscount $feeDiscount): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($feeDiscount->organization_id === $organization->id, 404);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'accountant'], true), 403);

        $validated = $this->validateDiscount($request, $organization, $feeDiscount);

        $feeDiscount->update([
            'name' => $validated['name'],
            'discount_type' => $validated['discount_type'],
            'value' => $validated['value'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        return back()->with('success', 'Fee discount updated successfully.');
    }

    public function destroy(Request $request, FeeDiscount $feeDiscount): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($feeDiscount->organization_id === $organization->id, 404);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'accountant'], true), 403);

        $feeDiscount->delete();

        return back()->with('success', 'Fee discount deleted successfully.');
    }

    private function validateDiscount(Request $request, Organization $organization, ?FeeDiscount $exclude = null): array
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('fee_discounts', 'name')->where('organization_id', $organization->id)
                    ->ignore($exclude?->id),
            ],
            'discount_type' => ['required', 'in:percentage,fixed'],
            'value' => ['required', 'numeric', 'min:0', 'max:100000'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', 'in:active,inactive'],
        ]);
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