<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\TransportAssignment;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\TransportVehiclePolicy;
use App\Models\User;
use App\Support\TransportPolicyPresets;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransportVehiclePolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_vehicle_without_policy_row_falls_back_to_the_school_owned_preset(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();

        $policy = $vehicle->fresh()->effectivePolicy();

        $this->assertSame('school_owned', $policy['bus_type']);
        $this->assertSame('manager_only', $policy['roster_control']);
        $this->assertSame('driver_only', $policy['boarding_control']);
        $this->assertSame('school', $policy['fee_ledger']);
        $this->assertFalse($policy['requires_roster_approval']);
        $this->assertFalse($policy['requires_fee_approval']);
        $this->assertTrue($policy['inherited']);
    }

    public function test_organization_default_applies_to_vehicles_without_a_policy_row(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();

        $organization->update([
            'settings' => [
                'transport' => [
                    'vehicle_policy' => [
                        'roster_control' => 'both',
                        'requires_roster_approval' => true,
                    ],
                ],
            ],
        ]);

        $policy = $vehicle->fresh()->effectivePolicy();

        $this->assertSame('both', $policy['roster_control']);
        $this->assertTrue($policy['requires_roster_approval']);
        $this->assertSame('driver_only', $policy['boarding_control'], 'unset keys still fall back to the school-owned preset');
        $this->assertTrue($policy['inherited']);
    }

    public function test_vehicle_policy_row_overrides_the_organization_default(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();

        $organization->update([
            'settings' => ['transport' => ['vehicle_policy' => ['roster_control' => 'both']]],
        ]);

        TransportVehiclePolicy::query()->create([
            'vehicle_id' => $vehicle->id,
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            ...TransportPolicyPresets::privateVendor(),
            'vendor_name' => 'Shivneri Travels',
            'vendor_contract_no' => 'VT-2026-14',
        ]);

        $policy = $vehicle->fresh()->effectivePolicy();

        $this->assertSame('private_vendor', $policy['bus_type']);
        $this->assertSame('driver_only', $policy['roster_control']);
        $this->assertTrue($policy['requires_roster_approval']);
        $this->assertSame('vendor', $policy['fee_ledger']);
        $this->assertSame('Shivneri Travels', $policy['vendor_name']);
        $this->assertFalse($policy['inherited']);
    }

    public function test_school_bus_keeps_the_transport_manager_in_full_control(): void
    {
        [$organization, , $year, $route, $vehicle, $student] = $this->createSetup();
        $manager = $this->createUser($organization, 'manager', 'transport_manager');
        $driver = $this->createDriver($organization, 'Sunil Pawar', $vehicle);

        $this->actingAs($manager)
            ->post('/transport-management/assignments', $this->assignmentPayload($year, $route, $vehicle, $student))
            ->assertRedirect();

        $this->assertDatabaseHas('student_transport', [
            'student_id' => $student->id,
            'vehicle_id' => $vehicle->id,
            'status' => 'active',
            'created_by_user_id' => $manager->id,
        ]);
        // School-owned buses still bill through the school fee ledger.
        $this->assertDatabaseHas('student_fees', [
            'transport_assignment_id' => TransportAssignment::query()->where('student_id', $student->id)->value('id'),
        ]);

        // Driver may not touch a manager-owned roster, even on their own bus.
        $this->actingAs($driver)
            ->post('/transport-management/assignments', $this->assignmentPayload($year, $route, $vehicle, $this->createStudent($organization, $year, 'Other', 'Kid'), [], 'Other Kid'))
            ->assertForbidden();
    }

    public function test_vendor_bus_lets_the_driver_add_students_but_never_self_approve(): void
    {
        [$organization, , $year, $route, $vehicle, $student] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Sunil Pawar', $vehicle);
        $manager = $this->createUser($organization, 'manager', 'transport_manager');

        $this->setPolicy($organization, $year, $vehicle, TransportPolicyPresets::privateVendor());

        $this->actingAs($driver)
            ->post('/transport-management/assignments', $this->assignmentPayload($year, $route, $vehicle, $student, ['monthlyFee' => 500]))
            ->assertRedirect();

        $assignment = TransportAssignment::query()->where('student_id', $student->id)->firstOrFail();

        $this->assertSame('pending', $assignment->status, 'driver submissions wait for the manager');
        $this->assertSame($driver->id, (int) $assignment->created_by_user_id);
        $this->assertFalse((bool) $student->fresh()->transport_required, 'a pending student is not yet flagged as needing transport');
        $this->assertDatabaseMissing('student_fees', [
            'transport_assignment_id' => $assignment->id,
        ]);

        $this->actingAs($manager)
            ->post("/transport-management/assignments/{$assignment->id}/approve")
            ->assertRedirect();

        $this->assertDatabaseHas('student_transport', [
            'id' => $assignment->id,
            'status' => 'active',
            'reviewed_by_user_id' => $manager->id,
        ]);
        $this->assertTrue((bool) $student->fresh()->transport_required);
        // Vendor buses are paid to the vendor, not through the school ledger.
        $this->assertDatabaseMissing('student_fees', [
            'transport_assignment_id' => $assignment->id,
        ]);
    }

    public function test_vendor_bus_never_posts_student_fees_to_the_school_ledger(): void
    {
        [$organization, , $year, $route, $vehicle, $student] = $this->createSetup();
        $manager = $this->createUser($organization, 'manager', 'transport_manager');

        $this->setPolicy($organization, $year, $vehicle, [
            ...TransportPolicyPresets::privateVendor(),
            'roster_control' => 'both',
        ]);

        $this->actingAs($manager)
            ->post('/transport-management/assignments', $this->assignmentPayload($year, $route, $vehicle, $student, ['monthlyFee' => 500]))
            ->assertRedirect();

        $assignment = TransportAssignment::query()->where('student_id', $student->id)->firstOrFail();

        $this->assertSame('active', $assignment->status);
        $this->assertDatabaseMissing('student_fees', [
            'transport_assignment_id' => $assignment->id,
        ]);
    }

    public function test_manager_is_locked_out_of_a_driver_only_roster_unless_they_are_an_admin(): void
    {
        [$organization, , $year, $route, $vehicle, $student] = $this->createSetup();
        $manager = $this->createUser($organization, 'manager', 'transport_manager');
        $admin = $this->createUser($organization, 'admin', 'admin');
        $driver = $this->createDriver($organization, 'Sunil Pawar', $vehicle);

        $this->setPolicy($organization, $year, $vehicle, [
            ...TransportPolicyPresets::privateVendor(),
            'roster_control' => 'driver_only',
        ]);

        $this->actingAs($manager)
            ->post('/transport-management/assignments', $this->assignmentPayload($year, $route, $vehicle, $student))
            ->assertForbidden();

        // System admins always win.
        $this->actingAs($admin)
            ->post('/transport-management/assignments', $this->assignmentPayload($year, $route, $vehicle, $student))
            ->assertRedirect();

        $this->assertDatabaseHas('student_transport', [
            'student_id' => $student->id,
            'status' => 'active',
        ]);
    }

    public function test_driver_can_only_edit_the_policy_of_a_bus_assigned_to_them(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Sunil Pawar', $vehicle);
        $otherVehicle = TransportVehicle::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'vehicle_number' => 'MH-12-2222',
            'vehicle_type' => 'Bus',
            'capacity' => 30,
            'status' => 'active',
        ]);

        $payload = [
            'busType' => 'private_vendor',
            'rosterControl' => 'driver_only',
            'boardingControl' => 'driver_only',
            'feeLedger' => 'vendor',
            'requiresRosterApproval' => true,
            'requiresFeeApproval' => true,
            'vendorName' => 'Kondhwa Travels',
        ];

        $this->actingAs($driver)
            ->put("/driver/bus-students/{$otherVehicle->id}/policy", $payload)
            ->assertForbidden();

        $this->actingAs($driver)
            ->put("/driver/bus-students/{$vehicle->id}/policy", $payload)
            ->assertRedirect();

        $this->assertDatabaseHas('transport_vehicle_policies', [
            'vehicle_id' => $vehicle->id,
            'organization_id' => $organization->id,
            'bus_type' => 'private_vendor',
            'roster_control' => 'driver_only',
            'fee_ledger' => 'vendor',
            'vendor_name' => 'Kondhwa Travels',
        ]);
    }

    public function test_vendor_policy_requires_vendor_paperwork(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $manager = $this->createUser($organization, 'manager', 'transport_manager');

        $this->actingAs($manager)
            ->put("/transport-management/vehicles/{$vehicle->id}/policy", [
                'busType' => 'private_vendor',
                'rosterControl' => 'driver_only',
                'boardingControl' => 'driver_only',
                'feeLedger' => 'vendor',
            ])
            ->assertSessionHasErrors('vendorName');

        $this->assertDatabaseMissing('transport_vehicle_policies', ['vehicle_id' => $vehicle->id]);
    }

    public function test_boarding_is_refused_when_the_bus_policy_keeps_it_with_the_transport_office(): void
    {
        [$organization, , $year, $route, $vehicle, $student] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Sunil Pawar', $vehicle);

        $trip = \App\Models\DailyTrip::query()->create([
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

        $this->createAssignment($year, $organization, $student, $route, $vehicle);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/boarding", ['studentId' => $student->id, 'status' => 'present'])
            ->assertOk();

        $this->setPolicy($organization, $year, $vehicle, [
            ...TransportPolicyPresets::schoolOwned(),
            'boarding_control' => 'manager_only',
        ]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/boarding", ['studentId' => $student->id, 'status' => 'absent'])
            ->assertForbidden();
    }

    public function test_repeated_boarding_taps_do_not_notify_the_parent_twice(): void
    {
        [$organization, , $year, $route, $vehicle, $student] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Sunil Pawar', $vehicle);

        $trip = \App\Models\DailyTrip::query()->create([
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

        $parent = $this->createUser($organization, 'parent', 'parent');
        $student->update(['user_id' => $parent->id]);
        $this->createAssignment($year, $organization, $student, $route, $vehicle);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/boarding", ['studentId' => $student->id, 'status' => 'present'])
            ->assertOk()
            ->assertJsonPath('changed', true);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/boarding", ['studentId' => $student->id, 'status' => 'present'])
            ->assertOk()
            ->assertJsonPath('changed', false);

        $this->assertSame(1, \Illuminate\Support\Facades\DB::table('notifications')
            ->where('user_id', $parent->id)
            ->where('type', 'transport_boarding')
            ->count(), 'a repeated tap must not notify the parent twice');
    }

    public function test_driver_roster_screen_loads_only_the_buses_of_that_driver(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Sunil Pawar', $vehicle);
        $otherVehicle = TransportVehicle::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'vehicle_number' => 'MH-12-9999',
            'vehicle_type' => 'Van',
            'capacity' => 12,
            'status' => 'active',
        ]);

        $this->actingAs($driver)
            ->get('/driver/bus-students')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DriverBusStudents')
                ->where('isDriverView', true)
                ->has('vehicles', 1)
                ->where('vehicles.0.id', (string) $vehicle->id)
                ->where('vehicles.0.policy.rosterControl', 'manager_only')
            );

        // A driver cannot open the screen as somebody else's identity.
        $other = $this->createUser($organization, 'reception', 'receptionist');
        $this->actingAs($other)->get('/driver/bus-students')->assertForbidden();
    }

    public function test_driver_adds_and_revokes_a_student_from_the_roster_screen(): void
    {
        [$organization, , $year, $route, $vehicle, $student] = $this->createSetup();
        $driver = $this->createDriver($organization, 'Sunil Pawar', $vehicle);

        $this->setPolicy($organization, $year, $vehicle, [
            ...TransportPolicyPresets::privateVendor(),
            'requires_roster_approval' => false,
        ]);

        $this->actingAs($driver)
            ->post('/driver/bus-students/assignments', [
                'vehicleId' => $vehicle->id,
                'routeId' => $route->id,
                'studentId' => $student->id,
                'pickupStop' => 'Stop A',
                'dropStop' => 'Stop B',
                'monthlyFee' => 450,
            ])
            ->assertRedirect();

        $assignment = TransportAssignment::query()->where('student_id', $student->id)->firstOrFail();
        $this->assertSame('active', $assignment->status);
        $this->assertSame($driver->id, (int) $assignment->created_by_user_id);

        $this->actingAs($driver)
            ->delete("/driver/bus-students/assignments/{$assignment->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('student_transport', ['id' => $assignment->id]);
        $this->assertFalse((bool) $student->fresh()->transport_required);
    }

    public function test_manager_roster_screen_can_force_a_policy_on_any_bus(): void
    {
        [$organization, , $year, $route, $vehicle] = $this->createSetup();
        $manager = $this->createUser($organization, 'manager', 'transport_manager');

        $this->actingAs($manager)
            ->put("/driver/bus-students/{$vehicle->id}/policy", [
                'busType' => 'private_vendor',
                'rosterControl' => 'driver_only',
                'boardingControl' => 'driver_and_manager',
                'feeLedger' => 'vendor',
                'requiresRosterApproval' => true,
                'requiresFeeApproval' => true,
                'vendorName' => 'Jeevan Travels',
                'vendorContractNo' => 'JT-09',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('transport_vehicle_policies', [
            'vehicle_id' => $vehicle->id,
            'roster_control' => 'driver_only',
            'boarding_control' => 'driver_and_manager',
            'vendor_name' => 'Jeevan Travels',
        ]);
    }

    private function createSetup(): array
    {
        $organization = Organization::query()->create([
            'name' => 'Policy School',
            'slug' => 'policy-school',
            'email' => 'policy@example.com',
            'phone' => '9876511111',
            'address' => 'Main Road',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonth()->toDateString(),
            'settings' => [],
        ]);

        app(\App\Services\StaffPermissionService::class)->ensureRolesExist($organization);

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
            'academic_year_id' => $year->id,
            'route_name' => 'Policy Route',
            'route_number' => 'R-202',
            'stops' => ['Stop A', 'Stop B'],
            'fare' => 400,
            'status' => 'active',
        ]);

        $vehicle = TransportVehicle::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'vehicle_number' => 'MH-12-3322',
            'vehicle_type' => 'Bus',
            'capacity' => 40,
            'status' => 'active',
        ]);

        $student = $this->createStudent($organization, $year, 'Aarav', 'Shah');

        return [$organization, $class, $year, $route, $vehicle, $student];
    }

    private function createStudent(Organization $organization, AcademicYear $year, string $first, string $last): Student
    {
        static $counter = 0;
        $counter++;

        $class = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $year->id)
            ->firstOrFail();

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM-2026-'.str_pad((string) $counter, 4, '0', STR_PAD_LEFT),
            'roll_number' => (string) $counter,
            'first_name' => $first,
            'last_name' => $last,
            'date_of_birth' => '2013-05-10',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        \Illuminate\Support\Facades\DB::table('student_academic_histories')->insert([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $student;
    }

    private function createUser(Organization $organization, string $name, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::query()->create([
            'name' => $name,
            'email' => strtolower($role).'-'.$counter.'@example.com',
            'phone' => '90000'.str_pad((string) $counter, 5, '0', STR_PAD_LEFT),
            'password' => '12345678',
            'role' => $role,
            'organization_id' => $organization->id,
            'status' => 'active',
        ]);
    }

    private function createDriver(Organization $organization, string $name, ?TransportVehicle $vehicle = null): User
    {
        $driver = $this->createUser($organization, $name, 'driver');

        $vehicle?->update([
            'driver_id' => $driver->id,
            'driver_name' => $driver->name,
            'driver_phone' => $driver->phone,
        ]);

        return $driver;
    }

    private function setPolicy(Organization $organization, AcademicYear $year, TransportVehicle $vehicle, array $values): void
    {
        TransportVehiclePolicy::query()->updateOrCreate(
            ['vehicle_id' => $vehicle->id],
            [
                'organization_id' => $organization->id,
                'academic_year_id' => $year->id,
                ...$values,
            ],
        );
    }

    private function assignmentPayload(AcademicYear $year, TransportRoute $route, TransportVehicle $vehicle, Student $student, array $overrides = [], string $suffix = ''): array
    {
        return array_merge([
            'studentId' => $student->id,
            'routeId' => $route->id,
            'vehicleId' => $vehicle->id,
            'pickupStop' => 'Main Gate',
            'dropStop' => 'School Gate',
            'pickupTime' => '07:30',
            'dropTime' => '14:30',
            'monthlyFee' => 400,
            'status' => 'active',
        ], $overrides);
    }

    private function createAssignment(AcademicYear $year, Organization $organization, Student $student, TransportRoute $route, TransportVehicle $vehicle): TransportAssignment
    {
        return TransportAssignment::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'student_id' => $student->id,
            'route_id' => $route->id,
            'vehicle_id' => $vehicle->id,
            'pickup_point' => 'Stop A',
            'drop_point' => 'Stop A',
            'monthly_fee' => 400,
            'status' => 'active',
        ]);
    }
}
