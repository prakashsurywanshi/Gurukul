<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyTrip;
use App\Models\Organization;
use App\Models\TransportGpsPosition;
use App\Models\TransportVehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransportGpsApiController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        return response()->json([
            'service' => 'transport-gps-sync',
            'configured' => $this->anyKeyConfigured(),
            'time' => now()->toIso8601String(),
        ]);
    }

    public function position(Request $request): JsonResponse
    {
        if (!$this->anyKeyConfigured()) {
            return response()->json(['message' => 'Transport GPS sync is not configured.'], 503);
        }

        $resolved = $this->resolveKey($request);

        if (!$resolved['authenticated']) {
            return response()->json(['message' => 'Invalid transport GPS sync key.'], 401);
        }

        $validated = $request->validate([
            'vehicle_number' => ['nullable', 'string', 'max:100', 'required_without:gps_device_id'],
            'gps_device_id' => ['nullable', 'string', 'max:100', 'required_without:vehicle_number'],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'speed_kmh' => ['nullable', 'numeric', 'min:0', 'max:400'],
            'heading' => ['nullable', 'string', 'max:20'],
            'recorded_at' => ['nullable', 'date'],
            'daily_trip_id' => ['nullable', 'integer'],
        ]);

        $vehicle = $this->resolveVehicle($resolved['organization_id'], $validated);

        if (!$vehicle) {
            return response()->json(['message' => 'No vehicle found for the provided vehicle number / GPS device id.'], 404);
        }

        $trip = null;

        if (!empty($validated['daily_trip_id'])) {
            $trip = DailyTrip::query()
                ->when($resolved['organization_id'], fn ($query, $orgId) => $query->whereHas('route', fn ($route) => $route->where('organization_id', $orgId)))
                ->find($validated['daily_trip_id']);

            if (!$trip) {
                return response()->json(['message' => 'No daily trip found for the given trip id.'], 404);
            }
        }

        $position = TransportGpsPosition::query()->create([
            'organization_id' => $vehicle->organization_id,
            'daily_trip_id' => $trip?->id,
            'vehicle_id' => $vehicle->id,
            'lat' => $validated['lat'],
            'lng' => $validated['lng'],
            'speed_kmh' => $validated['speed_kmh'] ?? 0,
            'heading' => $validated['heading'] ?? '',
            'recorded_at' => isset($validated['recorded_at'])
                ? \Carbon\Carbon::parse($validated['recorded_at'])
                : now(),
            'created_by' => $this->systemUserId(),
        ]);

        if ($trip && in_array($trip->trip_status, ['scheduled', 'running'], true)) {
            $trip->update([
                'current_location' => rtrim(rtrim(number_format($position->lat, 6), '0'), '.') . ', ' . rtrim(rtrim(number_format($position->lng, 6), '0'), '.'),
                'trip_status' => 'running',
            ]);
        }

        return response()->json([
            'message' => 'GPS position recorded.',
            'position_id' => (string) $position->id,
            'vehicle_id' => (string) $vehicle->id,
            'vehicle_number' => $vehicle->vehicle_number,
            'lat' => $position->lat,
            'lng' => $position->lng,
            'recorded_at' => $position->recorded_at->toIso8601String(),
        ], 201);
    }

    private function anyKeyConfigured(): bool
    {
        if ((bool) env('TRANSPORT_GPS_KEY', false)) {
            return true;
        }

        return Organization::query()
            ->where('settings->transport->sync_key', '!=', '')
            ->exists();
    }

    private function resolveKey(Request $request): array
    {
        $requestKey = (string) $request->header('X-Transport-Key', '');

        if (blank($requestKey)) {
            return ['authenticated' => false, 'organization_id' => null];
        }

        $envKey = env('TRANSPORT_GPS_KEY', '');
        if (filled($envKey) && hash_equals($envKey, $requestKey)) {
            return ['authenticated' => true, 'organization_id' => null];
        }

        $organization = Organization::query()
            ->where('settings->transport->sync_key', $requestKey)
            ->first();

        if ($organization) {
            return ['authenticated' => true, 'organization_id' => $organization->id];
        }

        return ['authenticated' => false, 'organization_id' => null];
    }

    private function resolveVehicle(?int $organizationId, array $validated): ?TransportVehicle
    {
        return TransportVehicle::query()
            ->when($organizationId, fn ($query, $orgId) => $query->where('organization_id', $orgId))
            ->where(function ($query) use ($validated) {
                if (!empty($validated['vehicle_number'])) {
                    $query->orWhere('vehicle_number', $validated['vehicle_number']);
                }

                if (!empty($validated['gps_device_id'])) {
                    $query->orWhere('gps_device_id', $validated['gps_device_id']);
                }
            })
            ->whereHas('route', fn ($query) => $query->when($organizationId, fn ($route) => $route->where('organization_id', $organizationId)))
            ->orderBy('id')
            ->first();
    }

    private function systemUserId(): ?int
    {
        $admin = \App\Models\User::query()
            ->where('role', 'super_admin')
            ->orWhere('role', 'admin')
            ->orderBy('id')
            ->value('id');

        return $admin !== null ? (int) $admin : null;
    }
}