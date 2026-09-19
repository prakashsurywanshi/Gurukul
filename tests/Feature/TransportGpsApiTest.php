<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TransportGpsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_status_public_when_no_key_configured(): void
    {
        $this->getJson('/api/transport/gps/status')->assertOk()->assertJsonPath('configured', false);
    }

    public function test_position_rejected_without_key_when_unconfigured(): void
    {
        $this->postJson('/api/transport/gps', [
            'vehicle_number' => 'MH-01-AB-1234',
            'lat' => 18.5204,
            'lng' => 73.8567,
        ])->assertStatus(503);
    }

    public function test_position_rejected_with_invalid_key_when_configured(): void
    {
        $this->organization()->update(['settings' => ['transport' => ['sync_key' => 'org-key-123']]]);

        $this->postJson('/api/transport/gps', [
            'vehicle_number' => 'MH-01-AB-1234',
            'lat' => 18.5204,
            'lng' => 73.8567,
        ])->assertStatus(401);
    }

    public function test_position_rejected_when_both_vehicle_refs_missing(): void
    {
        $this->organization()->update(['settings' => ['transport' => ['sync_key' => 'org-key-123']]]);

        $this->postJson('/api/transport/gps', [
            'lat' => 18.5204,
            'lng' => 73.8567,
        ], ['X-Transport-Key' => 'org-key-123'])->assertStatus(422);
    }

    public function test_position_not_found_for_unknown_vehicle(): void
    {
        $this->organization()->update(['settings' => ['transport' => ['sync_key' => 'org-key-123']]]);

        $this->postJson('/api/transport/gps', [
            'vehicle_number' => 'UNKNOWN-999',
            'lat' => 18.5204,
            'lng' => 73.8567,
        ], ['X-Transport-Key' => 'org-key-123'])->assertStatus(404);
    }

    public function test_position_recorded_and_scoped_to_org(): void
    {
        $org = $this->organization();
        $org->update(['settings' => ['transport' => ['sync_key' => 'org-key-123']]]);

        $other = Organization::create($this->organizationFields('Org B', 'org-b'));

        [$routeId, $vehicleId] = $this->seedVehicle($org, 'MH-01-AB-1234');

        $this->postJson('/api/transport/gps', [
            'vehicle_number' => 'MH-01-AB-1234',
            'lat' => 18.5204,
            'lng' => 73.8567,
            'speed_kmh' => 42.5,
            'heading' => 'NE',
        ], ['X-Transport-Key' => 'org-key-123'])
            ->assertStatus(201)
            ->assertJsonPath('vehicle_id', (string) $vehicleId)
            ->assertJsonPath('vehicle_number', 'MH-01-AB-1234');

        $this->assertDatabaseHas('transport_gps_positions', [
            'organization_id' => $org->id,
            'vehicle_id' => $vehicleId,
            'speed_kmh' => 42.5,
            'heading' => 'NE',
        ]);
        $this->assertDatabaseCount('transport_gps_positions', 1);
    }

    public function test_position_resolved_by_gps_device_id(): void
    {
        $org = $this->organization();
        $org->update(['settings' => ['transport' => ['sync_key' => 'org-key-123']]]);

        [, $vehicleId] = $this->seedVehicle($org, 'MH-02-CD-5678', 'GPS-DEV-01');

        $this->postJson('/api/transport/gps', [
            'gps_device_id' => 'GPS-DEV-01',
            'lat' => 19.076,
            'lng' => 72.8777,
        ], ['X-Transport-Key' => 'org-key-123'])
            ->assertStatus(201)
            ->assertJsonPath('vehicle_id', (string) $vehicleId);
    }

    public function test_position_not_found_vehicle_from_other_org(): void
    {
        $org = $this->organization();
        $org->update(['settings' => ['transport' => ['sync_key' => 'org-key-123']]]);

        $other = Organization::create($this->organizationFields('Org B', 'org-b'));
        $this->seedVehicle($other, 'MH-03-EF-9012');

        $this->postJson('/api/transport/gps', [
            'vehicle_number' => 'MH-03-EF-9012',
            'lat' => 18.5204,
            'lng' => 73.8567,
        ], ['X-Transport-Key' => 'org-key-123'])->assertStatus(404);
    }

    private function organization(): Organization
    {
        if ($org = Organization::first()) {
            return $org;
        }

        return Organization::create($this->organizationFields('Preview School', 'preview-school'));
    }

    private function organizationFields(string $name, string $slug): array
    {
        return [
            'name' => $name,
            'slug' => $slug,
            'email' => $slug . '@school.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
        ];
    }

    private function seedVehicle(Organization $organization, string $vehicleNumber, ?string $gpsDeviceId = null): array
    {
        $academicYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $routeId = DB::table('transport_routes')->insertGetId([
            'organization_id' => $organization->id,
            'route_name' => 'Downtown',
            'route_number' => 'RT-' . $organization->id . '-' . substr($vehicleNumber, -4),
            'fare' => 500,
            'stops' => json_encode(['Station A', 'Station B']),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $vehicleId = DB::table('transport_vehicles')->insertGetId([
            'organization_id' => $organization->id,
            'route_id' => $routeId,
            'vehicle_number' => $vehicleNumber,
            'vehicle_type' => 'bus',
            'capacity' => 40,
            'gps_device_id' => $gpsDeviceId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$routeId, $vehicleId];
    }
}