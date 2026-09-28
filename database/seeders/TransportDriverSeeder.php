<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\DailyTrip;
use App\Models\DriverProfile;
use App\Models\Organization;
use App\Models\Student;
use App\Models\TransportAssignment;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\TransportVehiclePolicy;
use App\Models\User;
use App\Services\StaffPermissionService;
use App\Support\TransportPolicyPresets;
use Illuminate\Database\Seeder;

class TransportDriverSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Organization::query()->first();

        if (! $organization) {
            return;
        }

        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $drivers = [
            [
                'email' => 'ramesh.driver@gurukul.com',
                'name' => 'Ramesh Kulkarni',
                'phone' => '9812300001',
                'license_number' => 'UP-32-2026-1101',
                'license_expiry_date' => now()->addYears(4)->toDateString(),
                'license_categories' => 'LMV,LMV-TR,HMV',
                'employment_type' => 'full_time',
                'verification_status' => 'verified',
            ],
            [
                'email' => 'suresh.driver@gurukul.com',
                'name' => 'Suresh Patil',
                'phone' => '9812300002',
                'license_number' => 'UP-32-2027-2202',
                'license_expiry_date' => now()->addMonths(45)->toDateString(),
                'license_categories' => 'LMV',
                'employment_type' => 'contract',
                'verification_status' => 'pending',
            ],
        ];

        $driverUsers = collect($drivers)->map(function (array $attributes) use ($organization) {
            $driver = User::query()->updateOrCreate(
                ['email' => $attributes['email']],
                [
                    'name' => $attributes['name'],
                    'phone' => $attributes['phone'],
                    'password' => bcrypt('driver123'),
                    'role' => 'driver',
                    'organization_id' => $organization->id,
                    'status' => 'active',
                ]
            );

            DriverProfile::query()->updateOrCreate(
                ['user_id' => $driver->id],
                [
                    'organization_id' => $organization->id,
                    'license_number' => $attributes['license_number'],
                    'license_expiry_date' => $attributes['license_expiry_date'],
                    'license_categories' => $attributes['license_categories'],
                    'employment_type' => $attributes['employment_type'],
                    'verification_status' => $attributes['verification_status'],
                    'joining_date' => now()->subYear()->toDateString(),
                    'status' => 'active',
                ]
            );

            return $driver;
        });

        $this->seedDemoFleet($organization, $driverUsers);
        $this->linkDriversToFleet($organization, $this->fleetDrivers($organization, $driverUsers));
        $this->seedVehiclePolicies($organization);
        $this->seedDemoTrip($organization);

        DailyTrip::query()
            ->whereNull('driver_user_id')
            ->whereHas('vehicle', fn ($query) => $query->whereNotNull('driver_id'))
            ->get()
            ->each(fn (DailyTrip $trip) => $trip->update(['driver_user_id' => $trip->vehicle?->driver_id]));
    }

    private function seedDemoFleet(Organization $organization, $driverUsers): void
    {
        $academicYear = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->orderByDesc('id')
            ->first();

        if (! $academicYear) {
            return;
        }

        $demoDriver = $driverUsers->first();

        $demoDriverUser = User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'driver')
            ->orderBy('id')
            ->first();

        $primaryDriver = $demoDriverUser ?? $demoDriver;

        $routes = [
            ['route_name' => 'North City Route', 'route_number' => 'RT-101', 'area' => 'Viman Nagar', 'stops' => ['Shivajinagar', 'Deccan Gymkhana', 'Ruby Hall Clinic'], 'fare' => 450],
            ['route_name' => 'South Lake Route', 'route_number' => 'RT-102', 'area' => 'Baner', 'stops' => ['Kothrud Depot', 'Balewadi', 'Hinjewadi Phase 2'], 'fare' => 500],
        ];

        foreach ($routes as $attributes) {
            TransportRoute::query()->firstOrCreate(
                [
                    'organization_id' => $organization->id,
                    'route_number' => $attributes['route_number'],
                ],
                [
                    'route_name' => $attributes['route_name'],
                    'area' => $attributes['area'],
                    'stops' => $attributes['stops'],
                    'morning_pickup' => '07:00',
                    'afternoon_drop' => '15:30',
                    'fare' => $attributes['fare'],
                    'status' => 'active',
                ]
            );
        }

        $vehicles = [
            ['vehicle_number' => 'MH-12-AB-1234', 'vehicle_type' => 'Bus', 'vehicle_model' => 'Tata Starbus', 'capacity' => 40, 'gps_device_id' => 'GPS-DEMO-001'],
            ['vehicle_number' => 'MH-12-AB-5678', 'vehicle_type' => 'Bus', 'vehicle_model' => 'Ashok Leyland', 'capacity' => 35, 'gps_device_id' => 'GPS-DEMO-002'],
        ];

        foreach ($vehicles as $attributes) {
            TransportVehicle::query()->firstOrCreate(
                [
                    'organization_id' => $organization->id,
                    'vehicle_number' => $attributes['vehicle_number'],
                ],
                [
                    'academic_year_id' => $academicYear->id,
                    'vehicle_type' => $attributes['vehicle_type'],
                    'vehicle_model' => $attributes['vehicle_model'],
                    'capacity' => $attributes['capacity'],
                    'gps_device_id' => $attributes['gps_device_id'],
                    'driver_license' => $primaryDriver?->driverProfile?->license_number,
                    'insurance_expiry' => now()->addYear()->toDateString(),
                    'fitness_expiry' => now()->addYear()->toDateString(),
                    'status' => 'active',
                ]
            );
        }

        $routeIds = TransportRoute::query()
            ->where('organization_id', $organization->id)
            ->whereIn('route_number', array_column($routes, 'route_number'))
            ->pluck('id');

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->orderBy('id')
            ->take(8)
            ->get();

        $stops = ['Shivajinagar', 'Deccan Gymkhana', 'Ruby Hall Clinic'];
        $pickupTimes = ['07:10', '07:25', '07:40'];

        foreach ($students->values() as $index => $student) {
            $routeId = $routeIds[$index % max($routeIds->count(), 1)] ?? $routeIds->first();

            if (! $routeId) {
                continue;
            }

            $stop = $stops[$index % count($stops)];

            TransportAssignment::query()->firstOrCreate(
                [
                    'student_id' => $student->id,
                    'route_id' => $routeId,
                ],
                [
                    'academic_year_id' => $academicYear->id,
                    'pickup_point' => $stop,
                    'drop_point' => 'School Campus',
                    'pickup_time' => $pickupTimes[$index % count($pickupTimes)],
                    'drop_time' => '14:30',
                    'monthly_fee' => 500,
                    'status' => 'active',
                ]
            );
        }
    }

    private function fleetDrivers(Organization $organization, $driverUsers)
    {
        $demoDriver = User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'driver')
            ->orderBy('id')
            ->first();

        if (! $demoDriver) {
            return $driverUsers;
        }

        return $driverUsers
            ->reject(fn ($driver) => (int) $driver->id === (int) $demoDriver->id)
            ->prepend($demoDriver)
            ->values();
    }

    private function seedDemoTrip(Organization $organization): void
    {
        $academicYear = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->orderByDesc('id')
            ->first();

        $driver = User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'driver')
            ->orderBy('id')
            ->first();

        if (! $academicYear || ! $driver) {
            return;
        }

        $vehicle = TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->where('driver_id', $driver->id)
            ->orderBy('id')
            ->first();

        $route = TransportRoute::query()
            ->where('organization_id', $organization->id)
            ->orderBy('id')
            ->first();

        if (! $vehicle || ! $route) {
            return;
        }

        DailyTrip::query()->firstOrCreate(
            [
                'route_id' => $route->id,
                'vehicle_id' => $vehicle->id,
                'journey_date' => now()->toDateString(),
                'shift' => 'morning',
            ],
            [
                'academic_year_id' => $academicYear->id,
                'driver_user_id' => $driver->id,
                'direction' => 'pickup',
                'pickup_points' => is_array($route->stops) ? implode(',', $route->stops) : $route->stops,
                'current_location' => 'Shivajinagar',
                'current_stop' => 'Shivajinagar',
                'destination_point' => 'School Campus',
                'departure_time' => '07:00',
                'expected_arrival' => '08:15',
                'started_at' => now()->subMinutes(25),
                'supervisor' => 'Transport Manager',
                'trip_status' => 'running',
                'stop_updates' => [
                    [
                        'stop' => 'Shivajinagar',
                        'note' => 'Demo journey started.',
                        'reached_at' => now()->subMinutes(20)->format('Y-m-d H:i:s'),
                        'updated_by' => $driver->name,
                    ],
                ],
                'note' => 'Demo trip for the driver app.',
            ]
        );
    }

    /**
     * Demo buses start on the school-owned preset so the transport office has a
     * known baseline before switching any of them to a private vendor.
     */
    private function seedVehiclePolicies(Organization $organization): void
    {
        $academicYear = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('is_current')
            ->orderByDesc('id')
            ->first();

        TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->whereDoesntHave('policy')
            ->get()
            ->each(function (TransportVehicle $vehicle) use ($organization, $academicYear) {
                TransportVehiclePolicy::query()->create([
                    'vehicle_id' => $vehicle->id,
                    'organization_id' => $organization->id,
                    'academic_year_id' => $academicYear?->id,
                    ...TransportPolicyPresets::schoolOwned(),
                ]);
            });
    }

    private function linkDriversToFleet(Organization $organization, $driverUsers): void    {
        $vehicles = TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->orderBy('id')
            ->get();

        $routes = TransportRoute::query()
            ->where('organization_id', $organization->id)
            ->orderBy('id')
            ->get();

        foreach ($vehicles->values() as $index => $vehicle) {
            $driver = $driverUsers[$index % $driverUsers->count()];

            $vehicle->update([
                'driver_id' => $driver->id,
                'driver_name' => $driver->name,
                'driver_phone' => $driver->phone,
                'assigned_driver' => $driver->name,
            ]);
        }

        foreach ($routes->values() as $index => $route) {
            $driver = $driverUsers[$index % $driverUsers->count()];

            $route->update([
                'driver_user_id' => $driver->id,
                'driver_name' => $driver->name,
                'driver_phone' => $driver->phone,
            ]);
        }
    }
}