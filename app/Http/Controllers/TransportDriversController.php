<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TransportDriversController extends Controller
{
    public function index(Request $request, StaffPermissionService $permissions)
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless($permissions->allows($user, 'Transport Management', 'view'), 403);

        $vehicles = $organization
            ? TransportVehicle::query()
                ->where('organization_id', $organization->id)
                ->where(function ($query) {
                    $query->whereNotNull('driver_name')->where('driver_name', '!=', '')
                        ->orWhereNotNull('assigned_driver');
                })
                ->orderBy('driver_name')
                ->get()
            : collect();

        $routes = $organization
            ? TransportRoute::query()
                ->where('organization_id', $organization->id)
                ->whereNotNull('driver_name')
                ->where('driver_name', '!=', '')
                ->get()
            : collect();

        $routeCounts = $routes->countBy(fn (TransportRoute $route) => strtolower(trim((string) $route->driver_name)))
            ->map(fn (int $count) => $count)
            ->all();

        $rows = $vehicles
            ->map(function (TransportVehicle $vehicle) use ($routeCounts): array {
                $name = trim((string) ($vehicle->driver_name ?: $vehicle->assigned_driver));
                $key = strtolower($name);

                return [
                    'name' => $name,
                    'phone' => trim((string) $vehicle->driver_phone),
                    'license' => trim((string) $vehicle->driver_license),
                    'vehicleNumber' => trim((string) $vehicle->vehicle_number),
                    'vehicleType' => trim((string) $vehicle->vehicle_type),
                    'routeAssignments' => $routeCounts[$key] ?? 0,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('dashboard/TransportDrivers', [
            'user' => $user,
            'drivers' => array_values(array_filter($rows, fn (array $row) => $row['name'] !== '')),
            'total' => count(array_filter($rows, fn (array $row) => $row['name'] !== '')),
        ]);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user
            ? Organization::where('id', $user->organization_id)->first()
            : null;
    }
}