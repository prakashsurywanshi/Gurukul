<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\DailyTrip;
use App\Models\Organization;
use App\Models\TransportGpsPosition;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransportLiveGpsTest extends TestCase
{
    use RefreshDatabase;

    public function test_live_tracking_page_loads_for_admin(): void
    {
        $organization = $this->createOrganization();
        $this->setupYearRouteVehicle($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/transport-management/live')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/TransportLiveTracking')
                ->has('summary.running')
            );
    }

    public function test_simulate_gps_records_position_and_advances_stop(): void
    {
        [$organization, , $trip] = $this->createRunningJourney();
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post("/transport-management/trips/{$trip->id}/simulate-gps")
            ->assertRedirect(route('transport-management.live'));

        $positions = TransportGpsPosition::query()->where('daily_trip_id', $trip->id)->get();
        $this->assertCount(1, $positions);

        $fresh = $trip->fresh();
        $this->assertSame('A', $fresh->current_stop);
        $this->assertCount(1, $fresh->stop_updates);
        $this->assertStringContainsString('Simulated GPS', $fresh->current_location);
        $this->assertGreaterThan(0, $positions->first()->lat);
    }

    public function test_simulate_gps_advances_through_all_stops(): void
    {
        [$organization, , $trip] = $this->createRunningJourney();
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)->post("/transport-management/trips/{$trip->id}/simulate-gps");
        $this->actingAs($admin)->post("/transport-management/trips/{$trip->id}/simulate-gps");
        $this->actingAs($admin)->post("/transport-management/trips/{$trip->id}/simulate-gps");

        $fresh = $trip->fresh();
        $this->assertSame('C', $fresh->current_stop);
        $this->assertCount(3, $fresh->stop_updates);
        $this->assertSame(3, TransportGpsPosition::query()->where('daily_trip_id', $trip->id)->count());

        $this->actingAs($admin)
            ->get('/transport-management/live')
            ->assertInertia(fn ($page) => $page
                ->where('trips.0.reached', 3)
                ->where('trips.0.totalStops', 4)
                ->where('trips.0.latestGps.lat', (float) TransportGpsPosition::query()->where('daily_trip_id', $trip->id)->latest('recorded_at')->first()->lat)
            );
    }

    public function test_simulate_gps_is_scoped_to_organization(): void
    {
        [$organization, , $trip] = $this->createRunningJourney();
        $other = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($other);
        AcademicYear::query()->create([
            'organization_id' => $other->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);
        $otherAdmin = $this->createUser($other, 'admin');

        $this->actingAs($otherAdmin)
            ->post("/transport-management/trips/{$trip->id}/simulate-gps")
            ->assertNotFound();
    }

    public function test_reset_gps_clears_simulated_history(): void
    {
        [$organization, , $trip] = $this->createRunningJourney();
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)->post("/transport-management/trips/{$trip->id}/simulate-gps");
        $this->assertSame(1, TransportGpsPosition::query()->where('daily_trip_id', $trip->id)->count());

        $this->actingAs($admin)
            ->delete("/transport-management/trips/{$trip->id}/gps")
            ->assertRedirect(route('transport-management.live'));

        $this->assertSame(0, TransportGpsPosition::query()->where('daily_trip_id', $trip->id)->count());
    }

    public function test_simulate_gps_not_allowed_on_completed_trip(): void
    {
        [$organization, $admin, $trip] = $this->createRunningJourney();
        $trip->update(['trip_status' => 'completed', 'ended_at' => now()]);

        $this->actingAs($admin)
            ->post("/transport-management/trips/{$trip->id}/simulate-gps")
            ->assertStatus(422);
    }

    private function createRunningJourney(): array
    {
        $organization = $this->createOrganization();
        $admin = $this->createUser($organization, 'admin');
        [$year, $route, $vehicle] = $this->setupYearRouteVehicle($organization);

        $this->actingAs($admin)->post('/transport-management/journeys/start', [
            'routeId' => $route->id,
            'vehicleId' => $vehicle->id,
            'shift' => 'morning',
            'direction' => 'pickup',
            'destinationPoint' => 'School',
        ])->assertRedirect();

        $trip = DailyTrip::query()->where('academic_year_id', $year->id)->latest('id')->firstOrFail();

        return [$organization, $admin, $trip];
    }

    private function setupYearRouteVehicle(Organization $organization): array
    {
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $route = TransportRoute::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'route_name' => 'Route GPS',
            'route_number' => 'R-GPS-'.$organization->id,
            'area' => 'Kothrud',
            'stops' => ['A', 'B', 'C'],
            'status' => 'active',
        ]);

        $vehicle = TransportVehicle::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'route_id' => $route->id,
            'vehicle_number' => 'MH-12-GPS-'.$organization->id,
            'capacity' => 40,
            'status' => 'active',
        ]);

        return [$year, $route, $vehicle];
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'S6 GPS School '.$counter,
            'slug' => 's6-gps-school-'.$counter,
            'address' => '123 Main Street',
            'contact_number' => '9876543210',
            'email' => 'admin-'.$counter.'@example.com',
            'password' => '12345678',
            'time_zone' => 'Asia/Kolkata',
            'locale' => 'en',
            'status' => 'active',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $staffCounter = 0;
        $staffCounter++;

        return User::query()->create([
            'name' => ucfirst($role).' Staff '.$staffCounter,
            'email' => $role.'-staff-'.$staffCounter.'@example.com',
            'password' => '12345678',
            'role' => $role,
            'organization_id' => $organization->id,
            'status' => 'active',
        ]);
    }
}