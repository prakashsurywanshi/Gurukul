<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\DailyTrip;
use App\Models\DriverProfile;
use App\Models\Organization;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Student;
use App\Models\TransportAssignment;
use App\Models\TransportBoardingRecord;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\User;
use App\Services\StaffPermissionService;
use Database\Seeders\DemoAccountsSeeder;
use Database\Seeders\TransportDriverSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransportRolesFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_transport_manager_can_create_driver_with_profile(): void
    {
        [$organization, $manager] = $this->createManagerAndSetup();

        $this->actingAs($manager)
            ->post('/transport-management/drivers', [
                'name' => 'Ramesh Kulkarni',
                'email' => 'ramesh.kulkarni@example.com',
                'phone' => '9911223344',
                'licenseNumber' => 'MH-12-77661',
                'licenseExpiry' => '2028-05-31',
                'licenseCategories' => 'LMV,LMV-TR',
                'employmentType' => 'full_time',
                'status' => 'active',
                'verificationStatus' => 'verified',
            ])
            ->assertRedirect();

        $driver = User::query()->where('email', 'ramesh.kulkarni@example.com')->firstOrFail();
        $this->assertSame('driver', $driver->role);
        $this->assertSame($organization->id, $driver->organization_id);
        $this->assertNotNull($driver->driverProfile);
        $this->assertSame('MH-12-77661', $driver->driverProfile->license_number);
        $this->assertSame('verified', $driver->driverProfile->verification_status);
    }

    public function test_transport_manager_can_update_driver_profile(): void
    {
        [$organization, $manager] = $this->createManagerAndSetup();
        $driver = $this->createDriverUser($organization, 'Suresh Patil');

        $this->actingAs($manager)
            ->put("/transport-management/drivers/{$driver->id}", [
                'name' => 'Suresh Patil Updated',
                'email' => $driver->email,
                'phone' => $driver->phone,
                'licenseNumber' => 'MH-09-22334',
                'licenseExpiry' => '2029-01-31',
                'licenseCategories' => 'LMV',
                'status' => 'active',
                'verificationStatus' => 'rejected',
            ])
            ->assertRedirect();

        $this->assertSame('MH-09-22334', $driver->fresh()->driverProfile->license_number);
        $this->assertSame('rejected', $driver->fresh()->driverProfile->verification_status);
        $this->assertSame('Suresh Patil Updated', $driver->fresh()->name);
    }

    public function test_driver_cannot_create_vehicle(): void
    {
        [$organization, ] = $this->createManagerAndSetup();
        $driver = $this->createDriverUser($organization, 'Driver Blocked');

        $this->actingAs($driver)
            ->post('/transport-management/vehicles', [
                'vehicleNumber' => 'MH-12-9999',
                'vehicleType' => 'Bus',
                'capacity' => 40,
                'status' => 'active',
            ])
            ->assertForbidden();
    }

    public function test_driver_cannot_create_or_delete_route(): void
    {
        [$organization, , $route] = $this->createManagerAndRoute();
        $driver = $this->createDriverUser($organization, 'Driver Route Blocked');

        $this->actingAs($driver)
            ->post('/transport-management/routes', [
                'name' => 'Blocked Route',
                'area' => 'Shivajinagar',
                'status' => 'active',
            ])
            ->assertForbidden();

        $this->actingAs($driver)
            ->delete("/transport-management/routes/{$route->id}")
            ->assertForbidden();
    }

    public function test_driver_cannot_modify_assignment(): void
    {
        [$organization, ] = $this->createManagerAndSetup();
        $driver = $this->createDriverUser($organization, 'Driver No Assign');

        $this->actingAs($driver)
            ->post('/transport-management/assignments', [
                'studentId' => 1,
                'routeId' => 1,
                'vehicleId' => 1,
                'pickupStop' => 'Main Gate',
                'status' => 'active',
            ])
            ->assertForbidden();
    }

    public function test_manager_route_store_assigns_driver_fk(): void
    {
        [$organization, $manager, $year] = $this->createManagerAndSetup();
        $driver = $this->createDriverUser($organization, 'Route Driver');

        $this->actingAs($manager)
            ->post('/transport-management/routes', [
                'name' => 'Central Route',
                'area' => 'Kothrud',
                'driverUserId' => $driver->id,
                'morningPickup' => '07:30',
                'afternoonDrop' => '14:30',
                'stops' => 'Stop A, Stop B',
                'status' => 'active',
            ])
            ->assertRedirect();

        $route = TransportRoute::query()->where('route_name', 'Central Route')->firstOrFail();
        $this->assertSame($driver->id, (int) $route->driver_user_id);
        $this->assertSame($driver->name, $route->driver_name);
        $this->assertSame($year->id, $route->academic_year_id);
    }

    public function test_manager_vehicle_store_assigns_driver_fk(): void
    {
        [$organization, $manager, $year] = $this->createManagerAndSetup();
        $driver = $this->createDriverUser($organization, 'Fleet Driver');

        $this->actingAs($manager)
            ->post('/transport-management/vehicles', [
                'vehicleNumber' => 'MH-12-4455',
                'vehicleType' => 'School Bus',
                'capacity' => 45,
                'driverId' => $driver->id,
                'status' => 'active',
            ])
            ->assertRedirect();

        $vehicle = TransportVehicle::query()->where('vehicle_number', 'MH-12-4455')->firstOrFail();
        $this->assertSame($driver->id, (int) $vehicle->driver_id);
        $this->assertSame($driver->name, $vehicle->assigned_driver);
        $this->assertSame($driver->phone, $vehicle->driver_phone);
    }

    public function test_driver_cannot_assign_other_org_driver_to_vehicle(): void
    {
        [$organization, $manager, ] = $this->createManagerAndSetup();
        $other = $this->createOrganization('Other Org DM');
        $otherDriver = $this->createDriverUser($other, 'Other Driver');

        $this->actingAs($manager)
            ->post('/transport-management/vehicles', [
                'vehicleNumber' => 'MH-12-7788',
                'vehicleType' => 'Van',
                'capacity' => 12,
                'driverId' => $otherDriver->id,
                'status' => 'active',
            ])
            ->assertNotFound();
    }

    public function test_manager_start_journey_uses_vehicle_driver_by_default(): void
    {
        [$organization, $manager, $year, $route, $vehicle] = $this->createManagerAndRoute();
        $driver = $this->createDriverUser($organization, 'Journey Driver');
        $vehicle->update(['driver_id' => $driver->id, 'driver_name' => $driver->name, 'driver_phone' => $driver->phone]);

        $this->actingAs($manager)
            ->post('/transport-management/journeys/start', [
                'routeId' => $route->id,
                'vehicleId' => $vehicle->id,
                'shift' => 'morning',
                'direction' => 'pickup',
                'destinationPoint' => 'School',
            ])
            ->assertRedirect();

        $trip = DailyTrip::query()->where('academic_year_id', $year->id)->latest('id')->firstOrFail();
        $this->assertSame($driver->id, (int) $trip->driver_user_id);
    }

    public function test_driver_start_journey_only_for_own_vehicle(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createManagerAndRoute();
        $driver = $this->createDriverUser($organization, 'Solo Driver');
        $vehicle->update(['driver_id' => $driver->id, 'driver_name' => $driver->name, 'driver_phone' => $driver->phone]);
        $other = $this->createVehicle($organization, $year->id, 'MH-12-0001');

        $this->actingAs($driver)
            ->post('/transport-management/journeys/start', [
                'routeId' => $route->id,
                'vehicleId' => $other->id,
                'shift' => 'morning',
                'direction' => 'pickup',
            ])
            ->assertForbidden();

        $this->actingAs($driver)
            ->post('/transport-management/journeys/start', [
                'routeId' => $route->id,
                'vehicleId' => $vehicle->id,
                'shift' => 'morning',
                'direction' => 'pickup',
            ])
            ->assertRedirect();

        $trip = DailyTrip::query()->where('academic_year_id', $year->id)->latest('id')->firstOrFail();
        $this->assertSame($driver->id, (int) $trip->driver_user_id);
    }

    public function test_driver_sees_only_own_vehicles_in_index(): void
    {
        [$organization, , $year, , ] = $this->createManagerAndRoute();
        $driver = $this->createDriverUser($organization, 'Scoped Driver');
        $this->createVehicle($organization, $year->id, 'MH-12-UNASSIGNED');

        $response = $this->actingAs($driver)
            ->get('/transport-management')
            ->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('dashboard/TransportManagement')
            ->has('vehicles', 0)
            ->has('routes', 0)
        );
    }

    public function test_demo_transport_seeder_builds_assignable_fleet_for_demo_driver(): void
    {
        $organization = $this->createOrganization('Seeded Transport Co-op');
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-27',
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);

        for ($i = 1; $i <= 3; $i++) {
            $user = $this->createUser($organization, 'student');
            Student::query()->create([
                'organization_id' => $organization->id,
                'user_id' => $user->id,
                'admission_no' => 'SEED-'.$i,
                'name' => 'Seeded Student '.$i,
                'first_name' => 'Seeded',
                'last_name' => 'Student'.$i,
                'date_of_birth' => now()->subYears(10)->toDateString(),
                'gender' => 'male',
                'admission_date' => now()->subYears(2)->toDateString(),
                'class_id' => null,
                'section_id' => null,
                'status' => 'active',
            ]);
        }

        $this->seed(DemoAccountsSeeder::class);
        $this->seed(TransportDriverSeeder::class);
        $this->seed(TransportDriverSeeder::class);

        $vehicles = TransportVehicle::query()->where('organization_id', $organization->id)->get();
        $routes = TransportRoute::query()->where('organization_id', $organization->id)->get();

        $this->assertCount(2, $vehicles);
        $this->assertCount(2, $routes);
        $this->assertGreaterThan(0, TransportAssignment::query()->count());

        $demoDriver = User::query()
            ->where('organization_id', $organization->id)
            ->where('email', 'driver@gurukul.com')
            ->firstOrFail();

        $this->assertNotNull(DriverProfile::query()->where('user_id', $demoDriver->id)->first());
        $this->assertTrue($vehicles->contains(fn (TransportVehicle $v) => (int) $v->driver_id === (int) $demoDriver->id));
        $this->assertTrue($routes->contains(fn (TransportRoute $r) => (int) $r->driver_user_id === (int) $demoDriver->id));

        $trip = DailyTrip::query()
            ->where('driver_user_id', $demoDriver->id)
            ->where('trip_status', 'running')
            ->first();

        $this->assertNotNull($trip);
        $this->assertSame($year->id, (int) $trip->academic_year_id);
    }

    public function test_transport_manager_can_reach_every_transport_page(): void
    {
        [$organization, $manager] = $this->createManagerAndSetup();

        $pages = [
            '/transport/dashboard',
            '/transport-management',
            '/transport-management/live',
            '/transport-fee-collection',
            '/transport/drivers',
            '/transport/device-settings',
        ];

        foreach ($pages as $page) {
            $this->actingAs($manager)
                ->get($page)
                ->assertOk("Transport manager should reach {$page}.");
        }
    }

    public function test_transport_manager_is_denied_every_non_transport_module(): void
    {
        [$organization, $manager] = $this->createManagerAndSetup();

        $deniedPages = [
            '/students' => 'Search Students',
            '/staff' => 'User Management',
            '/staff-directory' => 'User Management',
            '/fees' => 'Fees Management',
            '/attendance' => 'Attendance Management',
            '/classes' => 'Class / Section',
            '/class-time-table' => 'Class Time Table',
            '/library' => 'Library Management',
            '/hostel-management' => 'Hostel Management',
            '/inventory' => 'Inventory Management',
            '/exams' => 'Exam Management',
            '/complains' => 'Complains',
            '/communication' => 'Messages',
            '/settings' => 'General Setting',
            '/settings/roles-permissions' => 'Roles & Permissions',
            '/compliance' => 'Reports & Analytics',
        ];

        foreach ($deniedPages as $page => $feature) {
            $this->actingAs($manager)
                ->get($page)
                ->assertForbidden("Transport manager must not reach {$page} ({$feature}).");
        }
    }

    public function test_transport_manager_permission_map_is_transport_scoped(): void
    {
        [$organization, $manager] = $this->createManagerAndSetup();

        $viewable = app(StaffPermissionService::class)
            ->featurePermissionsFor($manager);

        $granted = collect($viewable)
            ->filter(fn (array $flags) => ! empty($flags['view']))
            ->keys()
            ->sort()
            ->values()
            ->all();

        $this->assertSame(
            [
                'Dashboard Home',
                'Edit Profile',
                'My Leaves',
                'Profile',
                'Transport Device Settings',
                'Transport Fee Collection',
                'Transport Management',
            ],
            $granted,
        );
    }

    public function test_unknown_permission_action_fails_closed(): void
    {
        [$organization, $manager] = $this->createManagerAndSetup();

        $this->assertTrue(
            app(StaffPermissionService::class)->allows($manager, 'Transport Management', 'view')
        );
        $this->assertFalse(
            app(StaffPermissionService::class)->allows($manager, 'Transport Management', 'manage')
        );
    }

    public function test_user_without_resolvable_organization_is_denied(): void
    {
        $organization = $this->createOrganization('Orphan Staff Co-op');

        $user = $this->createUser($organization, 'teacher');
        $user->forceFill(['organization_id' => null])->save();

        $this->assertFalse(
            app(StaffPermissionService::class)->allows($user, 'Transport Management', 'view')
        );
        $this->assertFalse(
            app(StaffPermissionService::class)->allows($user, 'Fees Management', 'view')
        );
    }

    public function test_transport_module_toggle_blocks_transport_pages(): void
    {
        [$organization, $manager] = $this->createManagerAndSetup();

        $organization->update([
            'features' => array_merge((array) $organization->features, ['transport' => ['enabled' => false]]),
        ]);

        $this->actingAs($manager)
            ->get('/transport-management')
            ->assertForbidden();

        $this->actingAs($manager)
            ->get('/transport-fee-collection')
            ->assertForbidden();
    }

    public function test_transport_manager_role_receives_transport_permissions_on_bootstrap(): void
    {
        [$organization, $manager] = $this->createManagerAndSetup();

        $role = Role::query()
            ->where('organization_id', $organization->id)
            ->where('slug', 'transport_manager')
            ->firstOrFail();

        $permissions = RolePermission::query()->where('role_id', $role->id)->get();

        $this->assertGreaterThan(0, $permissions->count());

        foreach (['Dashboard Home', 'Transport Management', 'Transport Fee Collection'] as $feature) {
            $permission = $permissions->firstWhere('feature', $feature);

            $this->assertNotNull($permission, "Missing {$feature} permission for transport_manager.");
            $this->assertTrue((bool) $permission->can_view, "{$feature} should be viewable.");
        }

        $this->actingAs($manager)
            ->get('/transport-management')
            ->assertOk();
    }

    public function test_sync_command_repairs_role_with_stale_permission_rows(): void
    {
        [$organization, $manager] = $this->createManagerAndSetup();

        $role = Role::query()
            ->where('organization_id', $organization->id)
            ->where('slug', 'transport_manager')
            ->firstOrFail();

        RolePermission::query()->where('role_id', $role->id)->update([
            'can_view' => false,
            'can_add' => false,
            'can_edit' => false,
            'can_delete' => false,
        ]);

        $this->actingAs($manager)
            ->get('/transport-management')
            ->assertForbidden();

        $this->artisan('permissions:sync-defaults', ['organization' => $organization->id, '--role' => 'transport_manager'])
            ->assertSuccessful();

        $this->actingAs($manager)
            ->get('/transport-management')
            ->assertOk();
    }

    public function test_transport_manager_keeps_working_self_service_pages(): void
    {
        [$organization, $manager] = $this->createManagerAndSetup();

        $this->actingAs($manager)
            ->get('/profile')
            ->assertOk();

        $this->actingAs($manager)
            ->get('/my-leaves')
            ->assertOk();

        $this->actingAs($manager)
            ->post('/my-leaves', [
                'leave_type' => 'casual',
                'from_date' => now()->addDay()->toDateString(),
                'to_date' => now()->addDay()->toDateString(),
                'reason' => 'Personal work',
            ])->assertRedirect();
    }

    public function test_sync_command_revokes_features_the_role_no_longer_holds(): void
    {
        [$organization, $manager] = $this->createManagerAndSetup();

        $role = Role::query()
            ->where('organization_id', $organization->id)
            ->where('slug', 'transport_manager')
            ->firstOrFail();

        RolePermission::query()->updateOrCreate(
            ['role_id' => $role->id, 'feature' => 'Search Students'],
            [
                'module' => 'Students',
                'can_view' => true,
                'can_add' => true,
                'can_edit' => true,
                'can_delete' => true,
            ],
        );

        $this->actingAs($manager)
            ->get('/students')
            ->assertOk();

        $this->artisan('permissions:sync-defaults', ['organization' => $organization->id, '--role' => 'transport_manager'])
            ->assertSuccessful();

        $revoked = RolePermission::query()
            ->where('role_id', $role->id)
            ->where('feature', 'Search Students')
            ->firstOrFail();

        $this->assertFalse((bool) $revoked->can_view);
        $this->assertFalse((bool) $revoked->can_edit);

        $this->actingAs($manager)
            ->get('/students')
            ->assertForbidden();
    }

    public function test_manager_trips_payload_includes_boarding_summary(): void
    {
        [$organization, $manager, $year, $route, $vehicle] = $this->createManagerAndRoute();
        $driver = $this->createDriverUser($organization, 'Boarding Summary Driver');
        $vehicle->update(['driver_id' => $driver->id, 'driver_name' => $driver->name, 'driver_phone' => $driver->phone]);

        $trip = DailyTrip::query()->create([
            'academic_year_id' => $year->id,
            'route_id' => $route->id,
            'vehicle_id' => $vehicle->id,
            'driver_user_id' => $driver->id,
            'shift' => 'morning',
            'journey_date' => now()->toDateString(),
            'direction' => 'pickup',
            'trip_status' => 'running',
            'started_at' => now(),
        ]);

        TransportBoardingRecord::query()->create([
            'organization_id' => $organization->id,
            'daily_trip_id' => $trip->id,
            'student_id' => Student::query()->create([
                'organization_id' => $organization->id,
                'class_id' => null,
                'admission_no' => 'ADM-SUM-1',
                'first_name' => 'Boarding',
                'last_name' => 'Summary',
                'date_of_birth' => '2013-05-10',
                'gender' => 'male',
                'admission_date' => '2026-04-10',
                'status' => 'active',
            ])->id,
            'direction' => 'pickup',
            'status' => 'present',
            'boarded_at' => now(),
            'recorded_by_user_id' => $driver->id,
        ]);

        $response = $this->actingAs($manager)
            ->get('/transport-management')
            ->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('dashboard/TransportManagement')
            ->where('trips.0.boarding.pickup.present', 1)
            ->where('trips.0.boarding.pickup.marked', 1)
            ->where('trips.0.boarding.drop.marked', 0)
        );
    }

    private function createManagerAndSetup(): array
    {
        $organization = $this->createOrganization('Transport Co-op');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);
        $manager = $this->createUser($organization, 'transport_manager');

        return [$organization, $manager, $year];
    }

    private function createManagerAndRoute(): array
    {
        [$organization, $manager, $year] = $this->createManagerAndSetup();
        $route = TransportRoute::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'route_name' => 'Main East Route',
            'route_number' => 'R-'.$organization->id,
            'area' => 'Viman Nagar',
            'stops' => ['Stop A', 'Stop B'],
            'status' => 'active',
        ]);
        $vehicle = $this->createVehicle($organization, $year->id, 'MH-12-6600');

        return [$organization, $manager, $year, $route, $vehicle];
    }

    private function createVehicle(Organization $organization, $yearId, string $number): TransportVehicle
    {
        return TransportVehicle::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $yearId,
            'vehicle_number' => $number,
            'capacity' => 40,
            'status' => 'active',
        ]);
    }

    private function createDriverUser(Organization $organization, string $name): User
    {
        static $driverCounter = 0;
        $driverCounter++;
        $email = 'driver-'.strtolower(str_replace(' ', '-', $name)).'-'.$driverCounter.'@example.com';

        $driver = User::query()->create([
            'name' => $name,
            'email' => $email,
            'phone' => '9000000000',
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

    private function createOrganization(string $name): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => $name.' '.$counter,
            'slug' => 'transport-co-op-'.$counter,
            'address' => '123 Main Street',
            'contact_number' => '9876543210',
            'email' => 't-org-'.$counter.'@example.com',
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