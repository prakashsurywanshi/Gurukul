<?php

namespace App\Http\Controllers;

use App\Models\LeaveType;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LeaveTypesController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $types = LeaveType::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get()
            ->map(fn ($type) => [
                'id' => $type->id,
                'name' => $type->name,
                'code' => $type->code,
                'daysPerYear' => $type->days_per_year,
                'approvalRequired' => $type->approval_required,
                'cashable' => $type->cashable,
                'color' => $type->color,
                'appliesTo' => $type->applies_to,
                'status' => $type->status,
                'description' => $type->description,
            ]);

        return Inertia::render('dashboard/LeaveTypes', [
            'user' => $user,
            'types' => $types,
            'summary' => [
                'activeCount' => $types->filter(fn ($type) => $type['status'] === 'active')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:30'],
            'days_per_year' => ['nullable', 'numeric', 'min:0'],
            'approval_required' => ['required', 'boolean'],
            'cashable' => ['required', 'boolean'],
            'color' => ['nullable', 'string', 'max:20'],
            'applies_to' => ['required', Rule::in(['staff', 'student', 'both'])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $exists = LeaveType::query()
            ->where('organization_id', $organization->id)
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return back()->withErrors(['name' => 'A leave type with this name already exists.'])->withInput();
        }

        LeaveType::query()->create($validated + ['organization_id' => $organization->id]);

        return back()->with('success', 'Leave type added.');
    }

    public function update(Request $request, LeaveType $leaveType): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($leaveType->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:30'],
            'days_per_year' => ['nullable', 'numeric', 'min:0'],
            'approval_required' => ['required', 'boolean'],
            'cashable' => ['required', 'boolean'],
            'color' => ['nullable', 'string', 'max:20'],
            'applies_to' => ['required', Rule::in(['staff', 'student', 'both'])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $duplicate = LeaveType::query()
            ->where('organization_id', $organization->id)
            ->where('name', $validated['name'])
            ->where('id', '!=', $leaveType->id)
            ->exists();

        if ($duplicate) {
            return back()->withErrors(['name' => 'A leave type with this name already exists.'])->withInput();
        }

        $leaveType->update($validated);

        return back()->with('success', 'Leave type updated.');
    }

    public function destroy(Request $request, LeaveType $leaveType): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($leaveType->organization_id === $organization->id, 404);

        $leaveType->delete();

        return back()->with('success', 'Leave type deleted.');
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