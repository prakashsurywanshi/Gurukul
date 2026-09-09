<?php

namespace App\Http\Controllers;

use App\Models\FeeGroup;
use App\Models\FeeType;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FeeGroupController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $groups = FeeGroup::query()
            ->where('organization_id', $organization->id)
            ->orderBy('sort_order')
            ->get();

        $feeTypes = FeeType::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get(['id', 'name', 'status']);

        return Inertia::render('dashboard/FeeGroups', [
            'user' => $user,
            'groups' => $groups->map(fn (FeeGroup $group) => [
                'id' => $group->id,
                'name' => $group->name,
                'description' => $group->description,
                'status' => $group->status,
                'sortOrder' => $group->sort_order,
                'feeTypeIds' => $group->feeTypes()->orderBy('fee_types.name')->pluck('fee_types.id'),
            ]),
            'feeTypes' => $feeTypes->map(fn (FeeType $type) => [
                'id' => $type->id,
                'name' => $type->name,
                'status' => $type->status,
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'accountant'], true), 403);

        $validated = $this->validateGroup($request, $organization);

        $group = FeeGroup::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);
        $group->feeTypes()->sync($validated['fee_type_ids'] ?? []);

        return back()->with('success', 'Fee group created successfully.');
    }

    public function update(Request $request, FeeGroup $feeGroup): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($feeGroup->organization_id === $organization->id, 404);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'accountant'], true), 403);

        $validated = $this->validateGroup($request, $organization, $feeGroup);

        $feeGroup->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'sort_order' => $validated['sort_order'] ?? $feeGroup->sort_order,
        ]);
        $feeGroup->feeTypes()->sync($validated['fee_type_ids'] ?? []);

        return back()->with('success', 'Fee group updated successfully.');
    }

    public function destroy(Request $request, FeeGroup $feeGroup): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($feeGroup->organization_id === $organization->id, 404);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'accountant'], true), 403);

        $feeGroup->delete();

        return back()->with('success', 'Fee group deleted successfully.');
    }

    private function validateGroup(Request $request, Organization $organization, ?FeeGroup $exclude = null): array
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('fee_groups', 'name')->where('organization_id', $organization->id)
                    ->ignore($exclude?->id),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', 'in:active,inactive'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'fee_type_ids' => ['sometimes', 'array'],
            'fee_type_ids.*' => ['integer', Rule::exists('fee_types', 'id')->where('organization_id', $organization->id)],
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