<?php

namespace App\Services;

use App\Models\LeaveRequest;
use App\Models\Organization;
use App\Models\StaffLeaveBalance;
use App\Models\User;
use Illuminate\Support\Collection;

class LeaveBalanceService
{
    public const LEAVE_TYPES = ['casual', 'sick', 'vacation', 'emergency', 'other'];

    public const DEFAULT_ENTITLEMENTS = [
        'casual' => 12.0,
        'sick' => 12.0,
        'vacation' => 24.0,
        'emergency' => 10.0,
        'other' => 10.0,
    ];

    public function titledYear($year): int
    {
        return (int) ($year ?? now()->year);
    }

    public function entitledDays(Organization $organization, int $userId, string $leaveType, int $year): float
    {
        $row = StaffLeaveBalance::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $userId)
            ->where('leave_type', $leaveType)
            ->where('year', $year)
            ->first();

        return $row ? (float) $row->entitled_days : (float) (self::DEFAULT_ENTITLEMENTS[$leaveType] ?? 0);
    }

    public function usedDays(
        Organization $organization,
        int $userId,
        string $leaveType,
        int $year,
        int $excludeRequestId = 0
    ): float {
        return (float) LeaveRequest::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $userId)
            ->whereNull('student_id')
            ->where('leave_type', $leaveType)
            ->whereIn('status', ['approved', 'pending'])
            ->whereYear('from_date', $year)
            ->when($excludeRequestId, fn ($query) => $query->where('id', '!=', $excludeRequestId))
            ->sum('total_days');
    }

    public function remainingDays(
        Organization $organization,
        int $userId,
        string $leaveType,
        int $year,
        int $excludeRequestId = 0
    ): float {
        return max(0.0, $this->entitledDays($organization, $userId, $leaveType, $year)
            - $this->usedDays($organization, $userId, $leaveType, $year, $excludeRequestId));
    }

    public function canTake(
        Organization $organization,
        int $userId,
        string $leaveType,
        int $year,
        float $days,
        int $excludeRequestId = 0
    ): bool {
        if ($days <= 0) {
            return false;
        }

        $entitled = $this->entitledDays($organization, $userId, $leaveType, $year);

        if ($entitled <= 0) {
            return false;
        }

        return $days <= $this->remainingDays($organization, $userId, $leaveType, $year, $excludeRequestId);
    }

    public function balancesForStaff(Organization $organization, int $userId, int $year): array
    {
        return collect(self::LEAVE_TYPES)->map(fn (string $type) => [
            'leaveType' => $type,
            'year' => $year,
            'entitled' => $this->entitledDays($organization, $userId, $type, $year),
            'used' => $this->usedDays($organization, $userId, $type, $year),
            'remaining' => $this->remainingDays($organization, $userId, $type, $year),
        ])->values()->all();
    }

    public function balancesForOrganization(Organization $organization, int $year): Collection
    {
        $roleSlugs = \App\Models\Role::query()
            ->where('organization_id', $organization->id)
            ->pluck('slug')
            ->all();

        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', $roleSlugs)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $staff) => [
                'staffId' => $staff->id,
                'name' => $staff->name,
                'balances' => $this->balancesForStaff($organization, $staff->id, $year),
            ])
            ->values();
    }

    public function adjust(
        Organization $organization,
        int $userId,
        string $leaveType,
        int $year,
        float $entitledDays
    ): StaffLeaveBalance {
        return StaffLeaveBalance::query()->updateOrCreate(
            [
                'organization_id' => $organization->id,
                'user_id' => $userId,
                'leave_type' => $leaveType,
                'year' => $year,
            ],
            ['entitled_days' => $entitledDays]
        );
    }
}