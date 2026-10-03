<?php

namespace App\Services\AiAnalytics;

use App\Models\TransportAssignment;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use Illuminate\Support\Collection;

class RouteOptimizerSuggestions
{
    /**
     * Deterministic transport route optimisation suggestions for an organisation.
     *
     * @return array<int, array{type: string, severity: string, title: string, detail: string, context: array<string, mixed>}>
     */
    public function suggest(int $organizationId, ?int $academicYearId = null): array
    {
        $suggestions = [];

        $vehicles = TransportVehicle::query()
            ->where('organization_id', $organizationId)
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId))
            ->where('status', 'active')
            ->get();

        // student_transport has no organization_id column; scope through the route.
        $assignmentsByVehicle = TransportAssignment::query()
            ->whereHas('route', fn ($q) => $q->where('organization_id', $organizationId))
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId))
            ->get()
            ->groupBy('vehicle_id');

        foreach ($vehicles as $vehicle) {
            $riding = $assignmentsByVehicle->get($vehicle->id, collect())->count();
            $capacity = (int) $vehicle->capacity;

            if ($capacity <= 0) {
                continue;
            }

            $utilization = $capacity > 0 ? ($riding / $capacity) * 100 : 0;

            if ($riding > $capacity) {
                $suggestions[] = [
                    'type' => 'capacity_overflow',
                    'severity' => 'high',
                    'title' => 'Vehicle '.($vehicle->vehicle_number ?: '#'.$vehicle->id).' is over capacity',
                    'detail' => "{$riding} students are assigned to a vehicle with capacity {$capacity}. Consider splitting the route or adding a vehicle.",
                    'context' => ['vehicle_id' => $vehicle->id, 'riding' => $riding, 'capacity' => $capacity],
                ];
            } elseif ($utilization < 50 && $riding > 0) {
                $suggestions[] = [
                    'type' => 'underutilized',
                    'severity' => 'low',
                    'title' => 'Vehicle '.($vehicle->vehicle_number ?: '#'.$vehicle->id).' is underused',
                    'detail' => "Only {$riding} of {$capacity} seats are filled (".round($utilization)."% utilization). Reassign seats or consolidate stops.",
                    'context' => ['vehicle_id' => $vehicle->id, 'riding' => $riding, 'capacity' => $capacity],
                ];
            }
        }

        $routes = TransportRoute::query()
            ->where('organization_id', $organizationId)
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId))
            ->with(['vehicles', 'assignments'])
            ->get();

        foreach ($routes as $route) {
            if ($route->vehicles->isEmpty()) {
                $suggestions[] = [
                    'type' => 'no_vehicle',
                    'severity' => 'high',
                    'title' => 'Route '.($route->route_name ?: '#'.$route->id).' has no vehicle',
                    'detail' => 'Assign a vehicle to keep this route running reliably.',
                    'context' => ['route_id' => $route->id],
                ];
            }
        }

        $unassignedStops = $routes->filter(fn (TransportRoute $route) => $route->assignments->isEmpty())->count();
        if ($unassignedStops > 0) {
            $suggestions[] = [
                'type' => 'unassigned_route',
                'severity' => 'medium',
                'title' => "{$unassignedStops} route(s) have no student assignments",
                'detail' => 'Routes without riders still consume fuel and driver time. Review whether these routes should be merged or paused.',
                'context' => ['routes' => $unassignedStops],
            ];
        }

        $overlap = $this->overlappingStopWarnings($routes);
        $suggestions = [...$suggestions, ...$overlap];

        usort($suggestions, fn (array $a, array $b) => $this->severityWeight($a['severity']) <=> $this->severityWeight($b['severity']));

        return $suggestions;
    }

    /**
     * @param Collection<int, TransportRoute> $routes
     *
     * @return array<int, array<string, mixed>>
     */
    private function overlappingStopWarnings(Collection $routes): array
    {
        $warnings = [];

        $stopIndex = [];
        foreach ($routes as $route) {
            foreach ($this->stopNames($route) as $stop) {
                $stopIndex[$stop][] = $route->route_name ?: (string) $route->id;
            }
        }

        foreach ($stopIndex as $stop => $routeNames) {
            $uniques = array_unique($routeNames);
            if (count($uniques) > 1) {
                $warnings[] = [
                    'type' => 'stop_overlap',
                    'severity' => 'medium',
                    'title' => "Stop \"{$stop}\" is served by multiple routes",
                    'detail' => 'Routes '.implode(', ', $uniques).' all stop at '.$stop.'. Consolidate to cut fuel and wait time.',
                    'context' => ['stop' => $stop, 'routes' => $uniques],
                ];
            }
        }

        return $warnings;
    }

    /**
     * @return array<int, string>
     */
    private function stopNames(TransportRoute $route): array
    {
        $stops = is_array($route->stops) ? $route->stops : [];

        return array_values(array_filter(array_map(
            fn ($stop) => is_array($stop) ? trim((string) ($stop['name'] ?? '')) : trim((string) $stop),
            $stops
        ), fn (string $name) => $name !== ''));
    }

    private function severityWeight(string $severity): int
    {
        return match ($severity) {
            'high' => 0,
            'medium' => 1,
            default => 2,
        };
    }
}