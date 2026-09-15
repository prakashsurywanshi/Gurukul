<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;

class ActiveOrgResolver
{
    public function __construct(
        private StaffPermissionService $permissions
    ) {}

    public function resolveForRequest(Request $request): ?int
    {
        $user = $request->user();

        if (! $user) {
            $organization = Organization::query()->first();

            return $organization ? (int) $organization->id : null;
        }

        if ($user->role === 'super_admin') {
            return (int) $user->organization_id;
        }

        if ($user->role === 'branch_admin') {
            return $this->resolveActiveBranch($user);
        }

        return $this->resolveForUser($user);
    }

    public function resolveForUser(User $user): ?int
    {
        if ($user->organization_id) {
            return (int) $user->organization_id;
        }

        if ($user->role === 'admin') {
            $organization = Organization::query()
                ->where('email', $user->email)
                ->first();

            if (! $organization && Organization::query()->count() === 1) {
                $organization = Organization::query()->first();
            }

            if ($organization) {
                $user->forceFill(['organization_id' => $organization->id])->save();

                return (int) $organization->id;
            }
        }

        return null;
    }

    public function resolveOrganizationForUser(User $user): ?Organization
    {
        $orgId = $this->resolveForUser($user);

        return $orgId ? Organization::query()->find($orgId) : null;
    }

    public function resolveActiveBranch(User $user): ?int
    {
        if ($user->role !== 'branch_admin') {
            return $this->resolveForUser($user);
        }

        $activeOrgId = session('branch_admin_active_org_id');

        if ($activeOrgId) {
            if ($user->managedOrganizations()->where('organizations.id', $activeOrgId)->exists()) {
                return (int) $activeOrgId;
            }

            session()->forget('branch_admin_active_org_id');
        }

        $firstOrg = $user->managedOrganizations()->first();

        if ($firstOrg) {
            session(['branch_admin_active_org_id' => (int) $firstOrg->id]);

            return (int) $firstOrg->id;
        }

        return null;
    }

    public function switchBranch(User $user, int $organizationId): bool
    {
        if ($user->role !== 'branch_admin') {
            return false;
        }

        if (! $user->managedOrganizations()->where('organizations.id', $organizationId)->exists()) {
            return false;
        }

        session(['branch_admin_active_org_id' => $organizationId]);

        return true;
    }

    public function leaveBranch(User $user): void
    {
        session()->forget('branch_admin_active_org_id');
    }

    public function isBranchAdmin(User $user): bool
    {
        return $user->role === 'branch_admin';
    }

    public function managedOrganizationIds(User $user): array
    {
        if ($user->role === 'super_admin') {
            return Organization::query()->pluck('id')->map(fn ($id) => (int) $id)->all();
        }

        if ($user->role !== 'branch_admin') {
            return $user->organization_id ? [(int) $user->organization_id] : [];
        }

        return $user->managedOrganizations()->pluck('organizations.id')->map(fn ($id) => (int) $id)->all();
    }
}