<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\DailyTrip;
use App\Models\DriverProfile;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\TransportAssignment;
use App\Models\TransportBoardingRecord;
use App\Models\TransportGpsPosition;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DriverApiContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_role_is_required_for_driver_endpoints(): void
    {
        [$organization, , $year] = $this->createSetup();
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/driver/me')
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/driver/me')
            ->assertForbidden();
    }

    public function test_guest_cannot_reach_driver_endpoints(): void
    {
        $this->getJson('/api/driver/me')->assertUnauthorized();
        $this->getJson('/api/driver/trips')->assertUnauthorized();
    }

    public function test_driver_me_returns_profile_and_assigned_vehicles(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Ramesh Kulkarni');
        $vehicle->update(['driver_id' => $driver->id, 'driver_name' => $driver->name, 'driver_phone' => $driver->phone]);
        $route->update(['driver_user_id' => $driver->id, 'driver_name' => $driver->name]);

        $response = $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/me')
            ->assertOk()
            ->assertJsonStructure(['driver' => ['id', 'name', 'phone', 'email', 'status', 'profile'], 'vehicles' => [['id', 'vehicleNumber']]]);

        $this->assertSame($driver->name, $response->json('driver.name'));
        $this->assertSame('MH-12-9911', $response->json('vehicles.0.vehicleNumber'));
        $this->assertSame('MH-12-55555', $response->json('driver.profile.license_number'));
    }

    public function test_driver_lists_only_own_trips(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Suresh Patil');
        $otherDriver = $this->createDriver($organization, 'Anil Desai');

        $ownTrip = $this->createTrip($organization, $year->id, $route->id, $vehicle->id, $driver->id);
        $this->createTrip($organization, $year->id, $route->id, $vehicle->id, $otherDriver->id);

        $response = $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/trips')
            ->assertOk();

        $this->assertCount(1, $response->json('trips'));
        $this->assertSame((string) $ownTrip->id, $response->json('trips.0.id'));
        $this->assertSame('Demo Route', $response->json('trips.0.route_name'));
    }

    public function test_driver_cannot_view_another_driver_trip(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Owner Driver');
        $otherDriver = $this->createDriver($organization, 'Other Driver');
        $trip = $this->createTrip($organization, $year->id, $route->id, $vehicle->id, $otherDriver->id);

        $this->actingAs($driver, 'sanctum')
            ->getJson("/api/driver/trips/{$trip->id}")
            ->assertForbidden();
    }

    public function test_driver_trip_detail_returns_roster_with_boarding_status(): void
    {
        [$organization, $class, $year, $route, $vehicle, $student] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Roster Driver');
        $trip = $this->createTrip($organization, $year->id, $route->id, $vehicle->id, $driver->id);
        $this->createAssignment($organization, $year->id, $student->id, $route->id);

        $response = $this->actingAs($driver, 'sanctum')
            ->getJson("/api/driver/trips/{$trip->id}")
            ->assertOk()
            ->assertJsonPath('roster.0.boarding_status', 'pending');

        $this->assertSame('Rahul Kumar', $response->json('roster.0.student_name'));
        $this->assertSame('Main Road', $response->json('roster.0.stop'));
        $this->assertContains('Stop A', $response->json('stops'));
    }

    public function test_driver_starts_trip_for_assigned_vehicle(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Start Driver');
        $vehicle->update(['driver_id' => $driver->id, 'driver_name' => $driver->name]);

        $response = $this->actingAs($driver, 'sanctum')
            ->postJson('/api/driver/trips', [
                'routeId' => $route->id,
                'vehicleId' => $vehicle->id,
                'shift' => 'morning',
                'direction' => 'pickup',
            ])
            ->assertCreated();

        $tripId = $response->json('trip.id');
        $trip = DailyTrip::query()->findOrFail($tripId);
        $this->assertSame($driver->id, $trip->driver_user_id);
        $this->assertSame('running', $trip->trip_status);
        $this->assertNotNull($trip->started_at);
    }

    public function test_driver_cannot_start_trip_for_unassigned_vehicle(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Unassigned Driver');
        $vehicle->update(['driver_id' => null, 'driver_name' => 'Someone Else', 'driver_phone' => null]);

        $this->actingAs($driver, 'sanctum')
            ->postJson('/api/driver/trips', [
                'routeId' => $route->id,
                'vehicleId' => $vehicle->id,
                'shift' => 'morning',
                'direction' => 'pickup',
            ])
            ->assertForbidden();
    }

    public function test_driver_marks_boarding_and_parent_is_notified(): void
    {
        [$organization, $class, $year, $route, $vehicle, $student] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Boarding Driver');
        $parent = $this->createUser($organization, 'parent');
        $student->update(['user_id' => $parent->id]);
        $trip = $this->createTrip($organization, $year->id, $route->id, $vehicle->id, $driver->id);
        $this->createAssignment($organization, $year->id, $student->id, $route->id);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/boarding", [
                'studentId' => $student->id,
                'status' => 'present',
            ])
            ->assertOk()
            ->assertJsonPath('record.status', 'present');

        $record = TransportBoardingRecord::query()
            ->where('daily_trip_id', $trip->id)
            ->where('student_id', $student->id)
            ->where('direction', 'pickup')
            ->firstOrFail();

        $this->assertSame('present', $record->status);
        $this->assertNotNull($record->boarded_at);
        $this->assertSame($driver->id, $record->recorded_by_user_id);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $parent->id,
            'type' => 'transport_boarding',
        ]);
    }

    public function test_boarding_upserts_and_keeps_pickup_and_drop_separate(): void
    {
        [$organization, $class, $year, $route, $vehicle, $student] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Upsert Driver');
        $trip = $this->createTrip($organization, $year->id, $route->id, $vehicle->id, $driver->id);
        $this->createAssignment($organization, $year->id, $student->id, $route->id);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/boarding", [
                'studentId' => $student->id,
                'status' => 'present',
            ])->assertOk();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/boarding", [
                'studentId' => $student->id,
                'status' => 'absent',
            ])->assertOk();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/boarding", [
                'studentId' => $student->id,
                'status' => 'present',
                'direction' => 'drop',
            ])->assertOk();

        $this->assertSame(2, TransportBoardingRecord::query()->where('daily_trip_id', $trip->id)->count());
        $this->assertSame('absent', TransportBoardingRecord::query()->where('direction', 'pickup')->value('status'));
        $this->assertSame('present', TransportBoardingRecord::query()->where('direction', 'drop')->value('status'));
    }

    public function test_driver_cannot_mark_boarding_for_unassigned_student(): void
    {
        [$organization, $class, $year, $route, $vehicle, $student] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Roster Guard');
        $trip = $this->createTrip($organization, $year->id, $route->id, $vehicle->id, $driver->id);
        $otherStudent = $this->createStudent($organization, $class->id, 'Other', 'Student');

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/boarding", [
                'studentId' => $otherStudent->id,
                'status' => 'present',
            ])
            ->assertNotFound();
    }

    public function test_driver_reaches_stop_and_completes_trip(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Journey Driver');
        $trip = $this->createTrip($organization, $year->id, $route->id, $vehicle->id, $driver->id);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/reached-stop", ['stop' => 'Stop A'])
            ->assertOk()
            ->assertJsonPath('success', true);

        $trip->refresh();
        $this->assertSame('Stop A', $trip->current_stop);
        $this->assertCount(1, $trip->stop_updates);
        $this->assertSame('Stop A', $trip->stop_updates[0]['stop']);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/end")
            ->assertOk();

        $trip->refresh();
        $this->assertSame('completed', $trip->trip_status);
        $this->assertNotNull($trip->ended_at);
    }

    public function test_driver_posts_gps_position_for_own_trip(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $driver = $this->createDriver($organization, 'GPS Driver');
        $trip = $this->createTrip($organization, $year->id, $route->id, $vehicle->id, $driver->id);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/gps", [
                'lat' => 18.5204,
                'lng' => 73.8567,
                'speed_kmh' => 32,
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('transport_gps_positions', [
            'daily_trip_id' => $trip->id,
            'vehicle_id' => $vehicle->id,
        ]);

        $this->assertSame(1, TransportGpsPosition::query()->where('daily_trip_id', $trip->id)->count());
    }

    public function test_driver_gps_for_other_driver_trip_is_forbidden(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $driver = $this->createDriver($organization, 'GPS Guard');
        $otherDriver = $this->createDriver($organization, 'Other GPS');
        $trip = $this->createTrip($organization, $year->id, $route->id, $vehicle->id, $otherDriver->id);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/gps", ['lat' => 18.5, 'lng' => 73.8])
            ->assertForbidden();
    }

    public function test_v1_mirror_serves_same_driver_payload(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Mirror Driver');
        $vehicle->update(['driver_id' => $driver->id, 'driver_name' => $driver->name]);

        $response = $this->actingAs($driver, 'sanctum')
            ->getJson('/api/v1/driver/me')
            ->assertOk();

        $this->assertSame($driver->name, $response->json('driver.name'));
        $this->assertCount(1, $response->json('vehicles'));
    }

    private function createSetup(): array
    {
        $organization = Organization::query()->create([
            'name' => 'Driver API School',
            'slug' => 'driver-api-school',
            'email' => 'driver-api@example.com',
            'phone' => '9876500000',
            'address' => 'Main Road',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonth()->toDateString(),
            'settings' => [],
        ]);

        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => 'Grade 5',
            'section' => 'A',
            'status' => 'active',
        ]);

        $route = TransportRoute::query()->create([
            'organization_id' => $organization->id,
            'route_name' => 'Demo Route',
            'route_number' => 'R-101',
            'stops' => ['Stop A', 'Stop B'],
            'fare' => 400,
            'status' => 'active',
        ]);

        $vehicle = TransportVehicle::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'vehicle_number' => 'MH-12-9911',
            'vehicle_type' => 'Bus',
            'capacity' => 40,
            'status' => 'active',
        ]);

        $student = $this->createStudent($organization, $class->id, 'Rahul', 'Kumar');

        return [$organization, $class, $year, $route, $vehicle, $student];
    }

    private function createStudent(Organization $organization, $classId, string $firstName, string $lastName): Student
    {
        static $counter = 0;
        $counter++;

        return Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $classId,
            'admission_no' => 'ADM-2026-'.str_pad((string) $counter, 4, '0', STR_PAD_LEFT),
            'roll_number' => (string) $counter,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'date_of_birth' => '2013-05-10',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);
    }

    private function createDriver(Organization $organization, string $name): User
    {
        static $counter = 0;
        $counter++;

        $driver = User::query()->create([
            'name' => $name,
            'email' => 'api-driver-'.$counter.'@example.com',
            'phone' => '90000000'.$counter,
            'password' => '12345678',
            'role' => 'driver',
            'organization_id' => $organization->id,
            'status' => 'active',
        ]);

        DriverProfile::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $driver->id,
            'license_number' => 'MH-12-55555',
            'verification_status' => 'verified',
            'status' => 'active',
        ]);

        return $driver;
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::query()->create([
            'name' => ucfirst($role).' User '.$counter,
            'email' => 'api-'.$role.'-'.$counter.'@example.com',
            'phone' => '91000000'.$counter,
            'password' => '12345678',
            'role' => $role,
            'organization_id' => $organization->id,
            'status' => 'active',
        ]);
    }

    private function createTrip(Organization $organization, int $yearId, int $routeId, int $vehicleId, int $driverId): DailyTrip
    {
        return DailyTrip::query()->create([
            'academic_year_id' => $yearId,
            'route_id' => $routeId,
            'vehicle_id' => $vehicleId,
            'driver_user_id' => $driverId,
            'shift' => 'morning',
            'journey_date' => now()->toDateString(),
            'direction' => 'pickup',
            'trip_status' => 'running',
            'started_at' => now(),
        ]);
    }

    private function createAssignment(Organization $organization, int $yearId, int $studentId, int $routeId): TransportAssignment
    {
        return TransportAssignment::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $yearId,
            'student_id' => $studentId,
            'route_id' => $routeId,
            'pickup_point' => 'Main Road',
            'drop_point' => 'School Gate',
            'pickup_time' => '07:30',
            'drop_time' => '08:15',
            'status' => 'active',
        ]);
    }
}