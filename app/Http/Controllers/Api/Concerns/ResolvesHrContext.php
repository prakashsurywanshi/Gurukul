<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Collection;

trait ResolvesHrContext
{
    private function resolveHrOrganization(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

        if (! $organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }

    private function hrRoleSlugs(Organization $organization): array
    {
        return Role::query()
            ->where('organization_id', $organization->id)
            ->pluck('slug')
            ->all();
    }

    private function hrStaffRecords(Organization $organization): Collection
    {
        return User::query()
            ->with(['designation', 'department'])
            ->where('organization_id', $organization->id)
            ->whereIn('role', $this->hrRoleSlugs($organization))
            ->orderBy('name')
            ->get()
            ->map(fn (User $staff) => [
                'id' => (string) $staff->id,
                'name' => $staff->name,
                'role' => $staff->role,
                'email' => $staff->email,
                'phone' => $staff->phone,
                'employee_id' => $staff->employee_id,
                'designation_name' => $staff->relationLoaded('designation') ? $staff->designation?->name : null,
                'department_name' => $staff->relationLoaded('department') ? $staff->department?->name : null,
            ])
            ->values();
    }

    private function canManageHr(User $user, Organization $organization): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }

        return Role::query()
            ->where('organization_id', $organization->id)
            ->where('slug', $user->role)
            ->exists();
    }

    private function ensureHrStaffBelongToOrganization(array $staffIds, Organization $organization): void
    {
        $uniqueStaffIds = array_values(array_unique(array_map('intval', $staffIds)));

        if ($uniqueStaffIds === []) {
            return;
        }

        $validCount = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', $uniqueStaffIds)
            ->whereIn('role', $this->hrRoleSlugs($organization))
            ->count();

        abort_unless($validCount === count($uniqueStaffIds), 403);
    }
}
