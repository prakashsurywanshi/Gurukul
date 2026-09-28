<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\TransportAssignment;
use App\Models\TransportVehicle;
use App\Models\User;
use App\Support\TransportPolicyPresets;

class TransportPolicyResolver
{
    public const ROSTER_UNMANAGED = 'unmanaged';

    public const DENY_REASONS = [
        'driver_not_assigned' => 'You can only manage students for a bus assigned to you.',
        'roster_locked' => 'Roster control for this bus belongs to its driver. Turn off driver roster control on the bus policy to manage it here.',
        'manager_locked' => 'Only the transport manager can change students on this bus.',
        'student_on_other_bus' => 'This student is already assigned to another bus. Ask the transport manager to move them.',
        'assignment_not_on_vehicle' => 'You can only remove students from your own bus.',
    ];

    public function effectivePolicy(?TransportVehicle $vehicle): array
    {
        if (! $vehicle) {
            return TransportPolicyPresets::resolve([], null);
        }

        return $vehicle->effectivePolicy();
    }

    public function isAdmin(?User $actor): bool
    {
        return in_array($actor?->role, ['super_admin', 'admin'], true);
    }

    /**
     * Whether the actor may add or remove students on this bus, and why not
     * when they may not.
     */
    public function canManageRoster(User $actor, ?TransportVehicle $vehicle, string $action = 'add'): array
    {
        if ($this->isAdmin($actor)) {
            return $this->allow();
        }

        $policy = $this->effectivePolicy($vehicle);
        $rosterControl = $policy['roster_control'];

        if ($actor->role === 'driver') {
            if (! $vehicle || ! $this->driverOwnsVehicle($actor, $vehicle)) {
                return $this->deny('driver_not_assigned');
            }

            if ($rosterControl === 'manager_only') {
                return $this->deny('manager_locked');
            }

            return $this->allow();
        }

        if ($rosterControl === 'driver_only') {
            return $this->deny('roster_locked');
        }

        return $this->allow();
    }

    public function canManageRosterForAssignment(User $actor, TransportAssignment $assignment, string $action = 'add'): array
    {
        $vehicle = $assignment->vehicle ?: $this->vehicleForRoute($assignment->route_id, $assignment->vehicle_id);

        return $this->canManageRoster($actor, $vehicle, $action);
    }

    /**
     * Whether the actor may record pickup/drop for this bus.
     */
    public function canMarkBoarding(User $actor, ?TransportVehicle $vehicle): array
    {
        if ($this->isAdmin($actor)) {
            return $this->allow();
        }

        $policy = $this->effectivePolicy($vehicle);
        $boardingControl = $policy['boarding_control'];

        if ($actor->role === 'driver') {
            if (! $vehicle || ! $this->driverOwnsVehicle($actor, $vehicle)) {
                return $this->deny('driver_not_assigned');
            }

            if ($boardingControl === 'manager_only') {
                return $this->deny('manager_locked');
            }

            return $this->allow();
        }

        return $boardingControl === 'driver_and_manager' ? $this->allow() : $this->deny('manager_locked');
    }

    public function driverOwnsVehicle(User $driver, TransportVehicle $vehicle): bool
    {
        $owner = $vehicle->resolveDriverUser();

        return $owner !== null && (int) $owner->id === (int) $driver->id;
    }

    /**
     * Every bus the driver is responsible for, in either the driver_id or the
     * route-driver direction.
     */
    public function vehiclesForDriver(User $driver, ?Organization $organization = null): \Illuminate\Support\Collection
    {
        $organizationId = $organization?->id ?? $driver->organization_id;

        if (! $organizationId) {
            return collect();
        }

        $routeIds = \App\Models\TransportRoute::query()
            ->where('organization_id', $organizationId)
            ->where(function ($query) use ($driver) {
                $query->where('driver_user_id', $driver->id);

                if ($driver->name) {
                    $query->orWhereRaw('LOWER(driver_name) = ?', [mb_strtolower($driver->name)]);
                }
            })
            ->pluck('id')
            ->all();

        return TransportVehicle::query()
            ->where('organization_id', $organizationId)
            ->where(function ($query) use ($driver, $routeIds) {
                $query->where('driver_id', $driver->id);

                if ($driver->name) {
                    $query->orWhereRaw('LOWER(driver_name) = ?', [mb_strtolower($driver->name)]);
                }

                if ($routeIds !== []) {
                    $query->orWhereIn('route_id', $routeIds);
                }
            })
            ->with(['policy', 'route'])
            ->orderBy('vehicle_number')
            ->get();
    }

    public function vehicleForRoute(?int $routeId, ?int $vehicleId = null): ?TransportVehicle
    {
        if ($vehicleId) {
            return TransportVehicle::query()->with('policy')->find($vehicleId);
        }

        if (! $routeId) {
            return null;
        }

        return TransportVehicle::query()
            ->where('route_id', $routeId)
            ->orderByRaw('driver_id IS NULL')
            ->orderBy('id')
            ->with('policy')
            ->first();
    }

    private function allow(): array
    {
        return ['allowed' => true, 'reason' => null, 'message' => null];
    }

    private function deny(string $reason): array
    {
        return [
            'allowed' => false,
            'reason' => $reason,
            'message' => self::DENY_REASONS[$reason] ?? 'You are not allowed to manage this bus.',
        ];
    }
}
