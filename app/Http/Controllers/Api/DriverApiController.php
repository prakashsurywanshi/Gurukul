<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\DailyTrip;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\Organization;
use App\Models\Student;
use App\Models\TransportAssignment;
use App\Models\TransportBoardingRecord;
use App\Models\TransportGpsPosition;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\TransportVehiclePolicy;
use App\Models\User;
use App\Services\FirebaseCloudMessagingService;
use App\Services\TransportAssignmentService;
use App\Services\TransportPolicyResolver;
use App\Support\TransportPolicyPresets;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DriverApiController extends Controller
{
    public function __construct(
        private readonly FirebaseCloudMessagingService $firebaseCloudMessagingService,
        private readonly TransportPolicyResolver $policies,
        private readonly TransportAssignmentService $assignments,
    ) {}

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);
        $drivers = User::query()
            ->with('driverProfile')
            ->where('organization_id', $organization?->id)
            ->where('id', $user->id)
            ->first();

        return response()->json([
            'driver' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'email' => $user->email,
                'status' => $user->status,
                'profile' => [
                    'license_number' => $drivers?->driverProfile?->license_number,
                    'license_expiry' => $drivers?->driverProfile?->license_expiry_date?->format('Y-m-d'),
                    'verification_status' => $drivers?->driverProfile?->verification_status ?? 'pending',
                ],
            ],
            'vehicles' => $this->assignedVehicles($user, $organization)->map(fn (TransportVehicle $vehicle) => [
                'id' => (string) $vehicle->id,
                'vehicleNumber' => $vehicle->vehicle_number,
                'vehicleType' => $vehicle->vehicle_type ?? '',
                'gpsDeviceId' => $vehicle->gps_device_id ?? '',
            ])->values(),
        ]);
    }

    /**
     * Routes this driver is allowed to operate.
     *
     * `startTrip` validates a route against `driverMatchesRoute`, but before
     * this endpoint drivers had no way to discover a valid `routeId`: the staff
     * listing under `/transport/routes` requires the
     * `staff.permission:Transport Management,view` permission that a driver
     * account does not hold. Without it the "start trip" flow is unreachable.
     *
     * Reuses the exact same matcher as `startTrip` so the list can never offer
     * a route the create call would reject.
     */
    public function routes(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);

        abort_unless($organization, 422, 'No organization is linked to this account.');

        $routes = TransportRoute::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->orderBy('route_name')
            ->get()
            ->filter(fn (TransportRoute $route) => $this->driverMatchesRoute($user, $route))
            ->map(fn (TransportRoute $route) => [
                'id' => (string) $route->id,
                'route_name' => $route->route_name,
                'route_number' => $route->route_number ?? '',
                'area' => $route->area ?? '',
                'vehicle_number' => $route->vehicle_number ?? '',
                'fare' => $route->fare !== null ? (float) $route->fare : null,
                'monthly_fee' => $route->monthly_fee !== null ? (float) $route->monthly_fee : null,
                'stops' => $this->normalizeRouteStops($route->stops),
            ])
            ->values();

        return response()->json(['success' => true, 'routes' => $routes]);
    }

    public function trips(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);

        $trips = DailyTrip::query()
            ->with(['route', 'vehicle'])
            ->where('academic_year_id', $this->activeYearId($organization))
            ->where('driver_user_id', $user->id)
            ->where(function ($query) {
                $query->whereDate('journey_date', today())
                    ->orWhereNotIn('trip_status', ['completed', 'cancelled']);
            })
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['trips' => $this->serializeTrips($trips)]);
    }

    public function trip(Request $request, DailyTrip $trip): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);

        abort_unless((int) $trip->driver_user_id === (int) $user->id, 403);
        abort_unless($trip->route && (int) $trip->route->organization_id === $organization?->id, 403);

        $trip->load(['route', 'vehicle', 'driver:id,name']);

        $assignments = TransportAssignment::query()
            ->where('route_id', $trip->route_id)
            ->where('status', 'active')
            ->with(['student.schoolClass'])
            ->get();

        $direction = $trip->direction === 'drop' ? 'drop' : 'pickup';
        $stopColumn = $direction === 'drop' ? 'drop_point' : 'pickup_point';
        $boarding = TransportBoardingRecord::query()
            ->where('daily_trip_id', $trip->id)
            ->where('direction', $direction)
            ->get()
            ->keyBy('student_id');

        return response()->json([
            'trip' => $this->serializeTrips(collect([$trip]))->first(),
            'roster' => $assignments->map(function (TransportAssignment $assignment) use ($stopColumn, $boarding, $direction) {
                $student = $assignment->student;
                $record = $boarding->get((string) $assignment->student_id);

                return [
                    'student_id' => (string) $assignment->student_id,
                    'student_name' => $student ? trim(($student->first_name ?? '').' '.($student->last_name ?? '')) : 'Unknown',
                    'admission_no' => $student?->admission_no ?? '',
                    'class' => $student?->schoolClass ? trim(($student->schoolClass->name ?? '').' '.($student->schoolClass->section ?? '')) : '',
                    'stop' => $direction === 'drop' ? $assignment->drop_point : $assignment->pickup_point,
                    'stopTime' => $direction === 'drop' ? $this->formatTime($assignment->drop_time) : $this->formatTime($assignment->pickup_time),
                    'boarding_status' => $record?->status ?? 'pending',
                    'boarded_at' => $record?->boarded_at?->format('Y-m-d H:i:s'),
                    'assigned_stop_matches' => ($stopColumn === 'drop_point' ? $assignment->drop_point : $assignment->pickup_point) !== null,
                ];
            })->values(),
            'stops' => $this->normalizeRouteStops($trip->route?->stops),
        ]);
    }

    public function startTrip(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);

        $data = $request->validate([
            'routeId' => ['required', 'integer'],
            'vehicleId' => ['required', 'integer'],
            'shift' => ['required', Rule::in(['morning', 'afternoon', 'evening'])],
            'direction' => ['required', Rule::in(['pickup', 'drop'])],
            'destinationPoint' => ['nullable', 'string', 'max:255'],
            'supervisor' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
        ]);

        $this->requireActiveYearId($organization);
        $route = TransportRoute::query()
            ->where('organization_id', $organization->id)
            ->findOrFail($data['routeId']);
        $vehicle = TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->findOrFail($data['vehicleId']);

        abort_unless($this->driverMatchesRoute($user, $route) || $this->driverMatchesVehicle($user, $vehicle), 403);

        $trip = DailyTrip::query()->create([
            'academic_year_id' => $this->activeYearId($organization),
            'route_id' => $route->id,
            'vehicle_id' => $vehicle->id,
            'driver_user_id' => $user->id,
            'shift' => $data['shift'],
            'journey_date' => now()->toDateString(),
            'direction' => $data['direction'],
            'pickup_points' => implode(',', $this->normalizeRouteStops($route->stops)),
            'current_location' => 'Journey started',
            'destination_point' => $data['destinationPoint'] ?? null,
            'departure_time' => now()->format('H:i'),
            'started_at' => now(),
            'supervisor' => $data['supervisor'] ?? null,
            'trip_status' => 'running',
            'note' => $data['note'] ?? null,
            'stop_updates' => [],
        ]);

        return response()->json(['trip' => $this->serializeTrips(collect([$trip->fresh(['route', 'vehicle'])]))->first()], 201);
    }

    public function reachedStop(Request $request, DailyTrip $trip): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);

        abort_unless((int) $trip->driver_user_id === (int) $user->id, 403);
        abort_unless($trip->route && (int) $trip->route->organization_id === $organization?->id, 403);

        $data = $request->validate([
            'stop' => ['required', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $updates = $trip->stop_updates ?? [];
        $updates[] = [
            'stop' => $data['stop'],
            'note' => $data['note'] ?? null,
            'reached_at' => now()->format('Y-m-d H:i:s'),
            'updated_by' => $user->name,
        ];

        $trip->update([
            'current_stop' => $data['stop'],
            'current_location' => $data['stop'],
            'trip_status' => 'running',
            'stop_updates' => $updates,
        ]);

        if ($organization) {
            $this->notifyParentsForReachedStop($organization, $trip, $data['stop']);
        }

        return response()->json(['success' => true, 'trip' => $this->serializeTrips(collect([$trip->fresh(['route'])]))->first()]);
    }

    public function endTrip(Request $request, DailyTrip $trip): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);

        abort_unless((int) $trip->driver_user_id === (int) $user->id, 403);
        abort_unless($trip->route && (int) $trip->route->organization_id === $organization?->id, 403);

        $trip->update([
            'trip_status' => 'completed',
            'ended_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    public function markBoarding(Request $request, DailyTrip $trip): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);

        abort_unless((int) $trip->driver_user_id === (int) $user->id, 403);
        abort_unless($trip->route && (int) $trip->route->organization_id === $organization?->id, 403);

        // Trip ownership already proves this driver is the one driving; the bus
        // policy only decides whether a driver is allowed to record boarding.
        $vehicle = $trip->vehicle ?: $trip->route?->vehicles()->first();
        $boardingPolicy = $user->role === 'driver'
            ? ['allowed' => $this->policies->effectivePolicy($vehicle)['boarding_control'] !== 'manager_only', 'message' => 'Boarding on this bus is recorded by the transport office.']
            : $this->policies->canMarkBoarding($user, $vehicle);
        abort_unless($boardingPolicy['allowed'], 403, $boardingPolicy['message']);

        $data = $request->validate([
            'studentId' => ['required', 'integer'],
            'status' => ['required', Rule::in(['present', 'absent'])],
            'direction' => ['nullable', Rule::in(['pickup', 'drop'])],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        // Boarding is only meaningful while the bus is actually on the road.
        abort_if(
            ! in_array($trip->trip_status, ['running', 'in_progress'], true),
            422,
            'Pickup and drop can only be recorded while the trip is running.'
        );

        $direction = $data['direction'] ?? $trip->direction ?? 'pickup';

        $assignment = TransportAssignment::query()
            ->where('route_id', $trip->route_id)
            ->where('student_id', $data['studentId'])
            ->where('status', 'active')
            ->with('student')
            ->firstOrFail();

        $expectedStop = $direction === 'pickup'
            ? $assignment->pickup_point
            : $assignment->drop_point;

        $this->assertStopMatches($trip, $expectedStop, $direction);

        $existing = TransportBoardingRecord::query()
            ->where('daily_trip_id', $trip->id)
            ->where('student_id', $data['studentId'])
            ->where('direction', $direction)
            ->first();

        $changed = ! $existing || $existing->status !== $data['status'];

        $record = TransportBoardingRecord::query()->updateOrCreate(
            [
                'daily_trip_id' => $trip->id,
                'student_id' => $data['studentId'],
                'direction' => $direction,
            ],
            [
                'organization_id' => $organization->id,
                'status' => $data['status'],
                'boarded_at' => $data['status'] === 'present' ? ($existing?->boarded_at ?? now()) : null,
                'recorded_by_user_id' => $user->id,
                'note' => $data['note'] ?? null,
            ]
        );

        // Only tell the parent about a real transition, not a repeated tap.
        if ($organization && $changed) {
            $this->notifyParentForBoarding($organization, $assignment->student, $trip, $direction, $data['status'], $data['note'] ?? null);
        }

        return response()->json([
            'success' => true,
            'changed' => $changed,
            'record' => [
                'student_id' => (string) $record->student_id,
                'status' => $record->status,
                'boarded_at' => $record->boarded_at?->format('Y-m-d H:i:s'),
            ],
        ]);
    }

    /**
     * When the trip has a current stop and the student has a matching stop on
     * file, the two have to agree. A trip without a reported stop is accepted
     * as-is so manual trips still work.
     */
    private function assertStopMatches(DailyTrip $trip, ?string $expectedStop, string $direction): void
    {
        $currentStop = trim((string) $trip->current_stop);
        $expectedStop = trim((string) $expectedStop);

        if ($currentStop === '' || $expectedStop === '') {
            return;
        }

        abort_if(
            mb_strtolower($currentStop) !== mb_strtolower($expectedStop),
            422,
            sprintf('The bus is at "%s" but this student belongs to the "%s" stop.', $currentStop, $expectedStop)
        );
    }

    // ---- bus policy and roster self-service --------------------------------

    public function myVehicles(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);

        $vehicles = $this->policies->vehiclesForDriver($user, $organization);

        return response()->json([
            'success' => true,
            'vehicles' => $vehicles->map(function (TransportVehicle $vehicle) use ($user) {
                $policy = $vehicle->effectivePolicy();

                return [
                    'id' => (string) $vehicle->id,
                    'vehicle_number' => $vehicle->vehicle_number,
                    'vehicle_type' => $vehicle->vehicle_type ?? '',
                    'capacity' => (int) $vehicle->capacity,
                    'route_id' => $vehicle->route_id ? (string) $vehicle->route_id : null,
                    'route_name' => $vehicle->route?->route_name ?? '',
                    'status' => $vehicle->status,
                    'policy' => [
                        'bus_type' => $policy['bus_type'],
                        'roster_control' => $policy['roster_control'],
                        'boarding_control' => $policy['boarding_control'],
                        'requires_roster_approval' => $policy['requires_roster_approval'],
                        'requires_fee_approval' => $policy['requires_fee_approval'],
                        'fee_ledger' => $policy['fee_ledger'],
                        'vendor_name' => $policy['vendor_name'],
                        'vendor_contract_no' => $policy['vendor_contract_no'],
                        'vendor_valid_from' => $policy['vendor_valid_from'],
                        'vendor_valid_till' => $policy['vendor_valid_till'],
                        'vendor_contact' => $policy['vendor_contact'],
                        'inherited' => $policy['inherited'],
                    ],
                    'can_manage_roster' => (bool) $this->policies->canManageRoster($user, $vehicle, 'add')['allowed'],
                    'can_mark_boarding' => (bool) $this->policies->canMarkBoarding($user, $vehicle)['allowed'],
                ];
            })->values(),
            'policy_options' => [
                'bus_types' => TransportPolicyPresets::BUS_TYPES,
                'roster_controls' => TransportPolicyPresets::ROSTER_CONTROLS,
                'boarding_controls' => TransportPolicyPresets::BOARDING_CONTROLS,
                'fee_ledgers' => TransportPolicyPresets::FEE_LEDGERS,
            ],
        ]);
    }

    public function updateVehiclePolicy(Request $request, TransportVehicle $vehicle): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);

        abort_unless(
            $vehicle && (int) $vehicle->organization_id === (int) $organization?->id,
            404
        );
        abort_unless($this->policies->driverOwnsVehicle($user, $vehicle), 403, 'You can only change the policy of your own bus.');

        $isVendor = $request->input('bus_type') === 'private_vendor';

        $data = $request->validate([
            'bus_type' => ['required', Rule::in(TransportPolicyPresets::BUS_TYPES)],
            'roster_control' => ['required', Rule::in(TransportPolicyPresets::ROSTER_CONTROLS)],
            'boarding_control' => ['required', Rule::in(TransportPolicyPresets::BOARDING_CONTROLS)],
            'requires_roster_approval' => ['nullable', 'boolean'],
            'requires_fee_approval' => ['nullable', 'boolean'],
            'fee_ledger' => ['required', Rule::in(TransportPolicyPresets::FEE_LEDGERS)],
            'vendor_name' => [$isVendor ? 'required' : 'nullable', 'string', 'max:255'],
            'vendor_contract_no' => ['nullable', 'string', 'max:255'],
            'vendor_valid_from' => ['nullable', 'date'],
            'vendor_valid_till' => ['nullable', 'date', 'after_or_equal:vendor_valid_from'],
            'vendor_contact' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        TransportVehiclePolicy::query()->updateOrCreate(
            ['vehicle_id' => $vehicle->id],
            [
                'organization_id' => $organization->id,
                'academic_year_id' => $organization?->selectedAcademicYear()?->id,
                'bus_type' => $data['bus_type'],
                'roster_control' => $data['roster_control'],
                'boarding_control' => $data['boarding_control'],
                'requires_roster_approval' => (bool) ($data['requires_roster_approval'] ?? false),
                'requires_fee_approval' => (bool) ($data['requires_fee_approval'] ?? false),
                'fee_ledger' => $data['fee_ledger'],
                'vendor_name' => $data['vendor_name'] ?? null,
                'vendor_contract_no' => $data['vendor_contract_no'] ?? null,
                'vendor_valid_from' => $data['vendor_valid_from'] ?? null,
                'vendor_valid_till' => $data['vendor_valid_till'] ?? null,
                'vendor_contact' => $data['vendor_contact'] ?? null,
                'notes' => $data['notes'] ?? null,
            ],
        );

        return $this->myVehicles($request);
    }

    public function assignments(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);
        $academicYearId = $organization?->selectedAcademicYear()?->id;
        $vehicleIds = $this->policies->vehiclesForDriver($user, $organization)->pluck('id')->all();

        $assignments = TransportAssignment::query()
            ->with(['student.schoolClass', 'route', 'vehicle', 'createdBy'])
            ->whereNotNull('vehicle_id')
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId), fn ($query) => $query->whereRaw('1 = 0'))
            ->when($vehicleIds !== [], fn ($query) => $query->whereIn('vehicle_id', $vehicleIds), fn ($query) => $query->whereRaw('1 = 0'))
            ->orderBy('id')
            ->get()
            ->map(fn (TransportAssignment $assignment) => $this->serializeDriverAssignment($assignment, $user));

        return response()->json(['success' => true, 'assignments' => $assignments->values()]);
    }

    public function availableStudents(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);
        $academicYearId = $organization?->selectedAcademicYear()?->id;
        $search = $request->query('search');

        $students = Student::query()
            ->where('organization_id', $organization?->id)
            ->where('status', 'active')
            ->whereNotIn('id', TransportAssignment::query()
                ->where('academic_year_id', $academicYearId)
                ->select('student_id'))
            ->when($search, function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('admission_no', 'like', "%{$search}%");
                });
            })
            ->with('schoolClass')
            ->orderBy('first_name')
            ->limit(50)
            ->get()
            ->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'name' => trim($student->first_name . ' ' . ($student->last_name ?? '')),
                'admission_no' => $student->admission_no ?? '',
                'class' => $student->schoolClass?->name ?? '',
                'section' => $student->schoolClass?->section ?? '',
            ]);

        return response()->json(['success' => true, 'students' => $students->values()]);
    }

    public function storeAssignment(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);
        $academicYearId = $organization?->selectedAcademicYear()?->id;

        abort_unless($organization, 403);
        abort_unless($academicYearId, 422, 'Create and activate an academic session before assigning students.');

        $data = $request->validate([
            'vehicle_id' => ['required', 'integer'],
            'route_id' => ['required', 'integer'],
            'student_id' => ['required', 'integer'],
            'pickup_point' => ['required', 'string', 'max:255'],
            'drop_point' => ['nullable', 'string', 'max:255'],
            'pickup_time' => ['nullable', 'string', 'max:10'],
            'drop_time' => ['nullable', 'string', 'max:10'],
            'monthly_fee' => ['nullable', 'numeric', 'min:0'],
        ]);

        try {
            $assignment = $this->assignments->create($user, $organization, $academicYearId, [
                'studentId' => $data['student_id'],
                'routeId' => $data['route_id'],
                'vehicleId' => $data['vehicle_id'],
                'pickupStop' => $data['pickup_point'],
                'dropStop' => $data['drop_point'] ?? null,
                'pickupTime' => $data['pickup_time'] ?? null,
                'dropTime' => $data['drop_time'] ?? null,
                'monthlyFee' => $data['monthly_fee'] ?? 0,
                'status' => 'active',
            ]);
        } catch (ValidationException $exception) {
            return response()->json([
                'success' => false,
                'message' => collect($exception->errors())->flatten()->first() ?: 'Unable to assign this student.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => $assignment->isPending() ? 'Assignment submitted and waiting for manager approval' : 'Student added to your bus',
            'assignment' => $this->serializeDriverAssignment($assignment, $user),
        ], 201);
    }

    public function destroyAssignment(Request $request, TransportAssignment $assignment): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);
        $vehicle = $assignment->vehicle;

        abort_unless($assignment->student && (int) $assignment->student->organization_id === (int) $organization?->id, 404);
        abort_unless($vehicle, 403, 'This assignment is not tied to a bus you drive.');

        try {
            $this->assignments->delete($user, $assignment);
        } catch (ValidationException $exception) {
            return response()->json([
                'success' => false,
                'message' => collect($exception->errors())->flatten()->first() ?: 'Unable to remove this student.',
            ], 422);
        }

        return response()->json(['success' => true, 'message' => 'Student removed from your bus']);
    }

    private function serializeDriverAssignment(TransportAssignment $assignment, User $driver): array
    {
        $vehicle = $assignment->vehicle;

        return [
            'id' => (string) $assignment->id,
            'student_id' => (string) $assignment->student_id,
            'student_name' => trim(($assignment->student?->first_name ?? '') . ' ' . ($assignment->student?->last_name ?? '')),
            'admission_no' => $assignment->student?->admission_no ?? '',
            'class' => $assignment->student?->schoolClass?->name ?? '',
            'section' => $assignment->student?->schoolClass?->section ?? '',
            'vehicle_id' => $assignment->vehicle_id ? (string) $assignment->vehicle_id : null,
            'vehicle_number' => $vehicle?->vehicle_number ?? '',
            'route_id' => (string) $assignment->route_id,
            'route_name' => $assignment->route?->route_name ?? '',
            'pickup_point' => $assignment->pickup_point,
            'drop_point' => $assignment->drop_point,
            'pickup_time' => $assignment->pickup_time,
            'drop_time' => $assignment->drop_time,
            'monthly_fee' => (float) ($assignment->monthly_fee ?? 0),
            'status' => $assignment->status,
            'is_pending' => $assignment->isPending(),
            'created_by' => $assignment->createdBy?->name ?? null,
            'decision_note' => $assignment->decision_note,
            'fee_ledger' => $vehicle?->effectivePolicy()['fee_ledger'] ?? 'school',
            'can_revoke' => (bool) ($vehicle && $this->policies->canManageRoster($driver, $vehicle, 'delete')['allowed']),
        ];
    }

    public function updateGps(Request $request, DailyTrip $trip): JsonResponse
    {
        $user = $request->user();
        $organization = $this->organization($user);

        abort_unless((int) $trip->driver_user_id === (int) $user->id, 403);
        abort_unless($trip->route && (int) $trip->route->organization_id === $organization?->id, 403);

        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'speed_kmh' => ['nullable', 'numeric', 'min:0'],
            'heading' => ['nullable', 'string', 'max:10'],
        ]);

        TransportGpsPosition::query()->create([
            'organization_id' => $organization->id,
            'daily_trip_id' => $trip->id,
            'vehicle_id' => $trip->vehicle_id,
            'lat' => $data['lat'],
            'lng' => $data['lng'],
            'speed_kmh' => $data['speed_kmh'] ?? null,
            'heading' => $data['heading'] ?? null,
            'recorded_at' => now(),
            'created_by' => $user->id,
        ]);

        return response()->json(['success' => true]);
    }

    private function assignedVehicles(User $user, ?Organization $organization): \Illuminate\Support\Collection
    {
        if (! $organization) {
            return collect();
        }

        return TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->where(function ($query) use ($user) {
                $query
                    ->where('driver_id', $user->id)
                    ->orWhere('driver_name', $user->name);
            })
            ->orderBy('vehicle_number')
            ->get();
    }

    private function serializeTrips($trips): \Illuminate\Support\Collection
    {
        return $trips->map(fn (DailyTrip $trip) => [
            'id' => (string) $trip->id,
            'route_id' => $trip->route_id ? (string) $trip->route_id : null,
            'route_name' => $trip->route?->route_name ?? '',
            'vehicle_id' => $trip->vehicle_id ? (string) $trip->vehicle_id : null,
            'vehicle_number' => $trip->vehicle?->vehicle_number ?? '',
            'shift' => $trip->shift,
            'direction' => $trip->direction ?? 'pickup',
            'journey_date' => $trip->journey_date?->format('Y-m-d') ?? '',
            'current_stop' => $trip->current_stop ?? '',
            'current_location' => $trip->current_location ?? '',
            'destination_point' => $trip->destination_point ?? '',
            'departure_time' => $trip->departure_time ?? '',
            'expected_arrival' => $trip->expected_arrival ?? '',
            'started_at' => $trip->started_at?->format('Y-m-d H:i:s') ?? '',
            'ended_at' => $trip->ended_at?->format('Y-m-d H:i:s') ?? '',
            'trip_status' => $trip->trip_status,
            'note' => $trip->note ?? '',
        ]);
    }

    private function notifyParentsForReachedStop(Organization $organization, DailyTrip $trip, string $stop): void
    {
        $stopColumn = $trip->direction === 'drop' ? 'drop_point' : 'pickup_point';

        $parents = User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'parent')
            ->whereIn('id', TransportAssignment::query()
                ->where('route_id', $trip->route_id)
                ->where('status', 'active')
                ->where($stopColumn, $stop)
                ->pluck('student_id')
                ->pipe(fn ($studentIds) => Student::query()
                    ->whereIn('id', $studentIds)
                    ->whereNotNull('user_id')
                    ->pluck('user_id'))
                ->all())
            ->get(['id', 'email']);

        if ($parents->isEmpty()) {
            return;
        }

        $direction = $trip->direction === 'drop' ? 'drop' : 'pickup';
        $title = $direction === 'drop' ? "Bus reached drop stop {$stop}" : "Bus reached pickup stop {$stop}";
        $body = "Bus on {$trip->route?->route_name} reached {$stop} at " . now()->format('h:i A').'.';

        $this->sendParentNotification($organization, $trip->id, (string) $trip->route_id, $stop, $direction, $parents, $title, $body);
    }

    private function notifyParentForBoarding(Organization $organization, ?Student $student, DailyTrip $trip, string $direction, string $status, ?string $note): void
    {
        if (! $student?->user_id) {
            return;
        }

        $parents = User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'parent')
            ->where('id', $student->user_id)
            ->get(['id', 'email']);

        if ($parents->isEmpty()) {
            return;
        }

        $studentName = trim(($student->first_name ?? '').' '.($student->last_name ?? ''));
        $routeName = $trip->route?->route_name ?? 'Transport';
        $type = $direction === 'drop' ? ($status === 'present' ? 'dropped' : 'not dropped') : ($status === 'present' ? 'picked up' : 'not picked up');
        $title = $direction === 'drop' ? "Child {$type} from bus" : "Child {$type} on bus";
        $body = "{$studentName} has been {$type} on trip ({$routeName}) at " . now()->format('h:i A') . ($note ? ". Note: {$note}" : '').'.';

        $this->sendParentNotification($organization, $trip->id, (string) $trip->route_id, $trip->current_stop ?? '', $direction, $parents, $title, $body, 'transport_boarding');
    }

    private function sendParentNotification(Organization $organization, ?string $tripId, ?string $routeId, string $stop, string $direction, $parents, string $title, string $body, string $type = 'transport_stop_update'): void
    {
        $message = Message::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => Auth::id(),
            'subject' => $title,
            'message' => $body,
            'priority' => 'high',
            'is_announcement' => false,
        ]);

        foreach ($parents as $parent) {
            MessageRecipient::query()->create([
                'message_id' => $message->id,
                'recipient_id' => $parent->id,
            ]);
        }

        $now = now();
        DB::table('notifications')->insert($parents->map(fn (User $parent) => [
            'organization_id' => $organization->id,
            'user_id' => $parent->id,
            'type' => $type,
            'title' => $title,
            'message' => $body,
            'data' => json_encode([
                'trip_id' => (string) ($tripId ?? ''),
                'route_id' => (string) ($routeId ?? ''),
                'stop' => $stop,
                'direction' => $direction,
            ]),
            'link' => '/communication',
            'is_read' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all());

        $this->firebaseCloudMessagingService->sendToUsers(
            $parents->pluck('id'),
            $title,
            $body,
            [
                'type' => $type,
                'trip_id' => (string) ($tripId ?? ''),
                'route_id' => (string) ($routeId ?? ''),
                'stop' => $stop,
                'direction' => $direction,
                'recipient' => 'parent',
            ],
            $organization,
        );
    }

    private function driverMatchesRoute(User $user, TransportRoute $route): bool
    {
        if ((int) $route->driver_user_id === (int) $user->id) {
            return true;
        }

        $nameMatches = $route->driver_name && strcasecmp(trim($route->driver_name), trim($user->name)) === 0;
        $phoneMatches = $route->driver_phone && $user->phone && preg_replace('/\D+/', '', $route->driver_phone) === preg_replace('/\D+/', '', $user->phone);

        return $nameMatches || $phoneMatches;
    }

    private function driverMatchesVehicle(User $user, TransportVehicle $vehicle): bool
    {
        if ((int) $vehicle->driver_id === (int) $user->id) {
            return true;
        }

        $nameMatches = $vehicle->assigned_driver
            ? strcasecmp(trim($vehicle->assigned_driver), trim($user->name)) === 0
            : ($vehicle->driver_name && strcasecmp(trim($vehicle->driver_name), trim($user->name)) === 0);
        $phoneMatches = $vehicle->driver_phone && $user->phone && preg_replace('/\D+/', '', $vehicle->driver_phone) === preg_replace('/\D+/', '', $user->phone);

        return $nameMatches || $phoneMatches;
    }

    private function organization(User $user): ?Organization
    {
        return $user
            ? Organization::query()->find($user->organization_id)
            : null;
    }

    private function activeYearId(?Organization $organization): ?int
    {
        if (! $organization) {
            return null;
        }

        return (int) (AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->where('status', 'active')
            ->value('id') ?? 0);
    }

    private function requireActiveYearId(Organization $organization): int
    {
        abort_unless((int) $this->activeYearId($organization) > 0, 422, 'No active academic year.');

        return $this->activeYearId($organization);
    }

    private function normalizeRouteStops(mixed $stops): array
    {
        if (is_array($stops)) {
            return array_values(array_filter(array_map('trim', $stops)));
        }

        if (! is_string($stops) || trim($stops) === '') {
            return [];
        }

        $decoded = json_decode($stops, true);

        if (is_array($decoded)) {
            return array_values(array_filter(array_map('trim', $decoded)));
        }

        return array_values(array_filter(array_map('trim', explode(',', $stops))));
    }

    private function formatTime(?string $time): string
    {
        if (! $time) {
            return '';
        }

        return strlen($time) >= 5 ? substr($time, 0, 5) : $time;
    }
}