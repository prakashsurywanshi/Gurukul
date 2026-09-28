<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyTrip;
use App\Models\FeePayment;
use App\Models\Organization;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\TransportAssignment;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\User;
use App\Services\TransportAssignmentService;
use App\Services\TransportFeeService;
use App\Services\TransportPolicyResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TransportApiController extends Controller
{
    public function __construct(
        private readonly TransportFeeService $fees,
        private readonly TransportPolicyResolver $policies,
    ) {
    }

    public function getOverview(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $routeCount = TransportRoute::where('organization_id', $organization->id)->count();
        $vehicleCount = TransportVehicle::where('organization_id', $organization->id)->count();
        $assignmentCount = TransportAssignment::whereHas('route', fn ($q) => $q->where('organization_id', $organization->id))->count();
        $tripCount = DailyTrip::whereHas('route', fn ($q) => $q->where('organization_id', $organization->id))->count();
        $activeAssignments = TransportAssignment::where('status', 'active')
            ->whereHas('route', fn ($q) => $q->where('organization_id', $organization->id))->count();
        $runningTrips = DailyTrip::where('trip_status', 'running')
            ->whereHas('route', fn ($q) => $q->where('organization_id', $organization->id))->count();

        return response()->json([
            'success' => true,
            'data' => [
                'route_count' => $routeCount,
                'vehicle_count' => $vehicleCount,
                'assignment_count' => $assignmentCount,
                'trip_count' => $tripCount,
                'active_assignments' => $activeAssignments,
                'running_trips' => $runningTrips,
            ],
        ]);
    }

    public function indexRoutes(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $routes = TransportRoute::where('organization_id', $organization->id)
            ->orderBy('route_name')
            ->get()
            ->map(function (TransportRoute $route) {
                $stops = $route->stops;
                if (is_string($stops)) {
                    $stops = json_decode($stops, true) ?? [];
                }
                return [
                    'id' => $route->id,
                    'name' => $route->route_name,
                    'route_number' => $route->route_number ?? '',
                    'area' => $route->area ?? '',
                    'vehicle_number' => $route->vehicle_number ?? '',
                    'driver_name' => $route->driver_name ?? '',
                    'driver_phone' => $route->driver_phone ?? '',
                    'morning_pickup' => $route->morning_pickup ? Carbon::parse($route->morning_pickup)->format('H:i') : '',
                    'afternoon_drop' => $route->afternoon_drop ? Carbon::parse($route->afternoon_drop)->format('H:i') : '',
                    'monthly_fee' => (float) ($route->monthly_fee ?? $route->fare ?? 0),
                    'stops' => $stops,
                    'description' => $route->description ?? '',
                    'status' => $route->status,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $routes,
        ]);
    }

    public function storeRoute(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'area' => ['nullable', 'string', 'max:255'],
            'vehicle_number' => ['nullable', 'string', 'max:50'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'driver_phone' => ['nullable', 'string', 'max:30'],
            'morning_pickup' => ['nullable', 'string', 'max:10'],
            'afternoon_drop' => ['nullable', 'string', 'max:10'],
            'monthly_fee' => ['nullable', 'numeric', 'min:0'],
            'stops' => ['nullable', 'array'],
            'description' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $routeNumber = 'RT-' . strtoupper(substr(md5(microtime()), 0, 6));

        $route = TransportRoute::create([
            'organization_id' => $organization->id,
            'route_name' => $validated['name'],
            'route_number' => $routeNumber,
            'area' => $validated['area'] ?? null,
            'vehicle_number' => $validated['vehicle_number'] ?? null,
            'driver_name' => $validated['driver_name'] ?? null,
            'driver_phone' => $validated['driver_phone'] ?? null,
            'morning_pickup' => $validated['morning_pickup'] ?? null,
            'afternoon_drop' => $validated['afternoon_drop'] ?? null,
            'monthly_fee' => $validated['monthly_fee'] ?? 0,
            'fare' => $validated['monthly_fee'] ?? 0,
            'stops' => !empty($validated['stops']) ? json_encode($validated['stops']) : null,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Route created successfully',
            'data' => $this->serializeRoute($route),
        ], 201);
    }

    public function updateRoute(Request $request, TransportRoute $route): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($route->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'area' => ['nullable', 'string', 'max:255'],
            'vehicle_number' => ['nullable', 'string', 'max:50'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'driver_phone' => ['nullable', 'string', 'max:30'],
            'morning_pickup' => ['nullable', 'string', 'max:10'],
            'afternoon_drop' => ['nullable', 'string', 'max:10'],
            'monthly_fee' => ['nullable', 'numeric', 'min:0'],
            'stops' => ['nullable', 'array'],
            'description' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $route->update([
            'route_name' => $validated['name'],
            'area' => $validated['area'] ?? null,
            'vehicle_number' => $validated['vehicle_number'] ?? null,
            'driver_name' => $validated['driver_name'] ?? null,
            'driver_phone' => $validated['driver_phone'] ?? null,
            'morning_pickup' => $validated['morning_pickup'] ?? null,
            'afternoon_drop' => $validated['afternoon_drop'] ?? null,
            'monthly_fee' => $validated['monthly_fee'] ?? 0,
            'fare' => $validated['monthly_fee'] ?? 0,
            'stops' => !empty($validated['stops']) ? json_encode($validated['stops']) : null,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Route updated successfully',
            'data' => $this->serializeRoute($route),
        ]);
    }

    public function destroyRoute(TransportRoute $route): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($route->organization_id === $organization->id, 403);

        $route->delete();

        return response()->json([
            'success' => true,
            'message' => 'Route deleted successfully',
        ]);
    }

    public function indexVehicles(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $vehicles = TransportVehicle::where('organization_id', $organization->id)
            ->orderBy('vehicle_number')
            ->get()
            ->map(fn (TransportVehicle $v) => [
                'id' => $v->id,
                'vehicle_number' => $v->vehicle_number,
                'vehicle_type' => $v->vehicle_type ?? $v->vehicle_model ?? '',
                'capacity' => (int) $v->capacity,
                'assigned_driver' => $v->assigned_driver ?? $v->driver_name ?? '',
                'driver_phone' => $v->driver_phone ?? '',
                'driver_license' => $v->driver_license ?? '',
                'gps_device_id' => $v->gps_device_id ?? '',
                'insurance_expiry' => $v->insurance_expiry?->format('Y-m-d'),
                'fitness_expiry' => $v->fitness_expiry?->format('Y-m-d'),
                'status' => $v->status,
            ]);

        return response()->json([
            'success' => true,
            'data' => $vehicles,
        ]);
    }

    public function storeVehicle(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'vehicle_number' => ['required', 'string', 'max:50'],
            'vehicle_type' => ['nullable', 'string', 'max:100'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'assigned_driver' => ['nullable', 'string', 'max:255'],
            'driver_phone' => ['nullable', 'string', 'max:30'],
            'driver_license' => ['nullable', 'string', 'max:100'],
            'gps_device_id' => ['nullable', 'string', 'max:100'],
            'insurance_expiry' => ['nullable', 'date'],
            'fitness_expiry' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['active', 'maintenance', 'inactive'])],
        ]);

        $vehicle = TransportVehicle::create([
            'organization_id' => $organization->id,
            'vehicle_number' => $validated['vehicle_number'],
            'vehicle_type' => $validated['vehicle_type'] ?? null,
            'vehicle_model' => $validated['vehicle_type'] ?? null,
            'capacity' => $validated['capacity'] ?? 40,
            'assigned_driver' => $validated['assigned_driver'] ?? null,
            'driver_name' => $validated['assigned_driver'] ?? null,
            'driver_phone' => $validated['driver_phone'] ?? null,
            'driver_license' => $validated['driver_license'] ?? null,
            'gps_device_id' => $validated['gps_device_id'] ?? null,
            'insurance_expiry' => $validated['insurance_expiry'] ?? null,
            'fitness_expiry' => $validated['fitness_expiry'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Vehicle added to fleet',
            'data' => $this->serializeVehicle($vehicle),
        ], 201);
    }

    public function updateVehicle(Request $request, TransportVehicle $vehicle): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($vehicle->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'vehicle_number' => ['required', 'string', 'max:50'],
            'vehicle_type' => ['nullable', 'string', 'max:100'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'assigned_driver' => ['nullable', 'string', 'max:255'],
            'driver_phone' => ['nullable', 'string', 'max:30'],
            'driver_license' => ['nullable', 'string', 'max:100'],
            'gps_device_id' => ['nullable', 'string', 'max:100'],
            'insurance_expiry' => ['nullable', 'date'],
            'fitness_expiry' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['active', 'maintenance', 'inactive'])],
        ]);

        $vehicle->update([
            'vehicle_number' => $validated['vehicle_number'],
            'vehicle_type' => $validated['vehicle_type'] ?? null,
            'vehicle_model' => $validated['vehicle_type'] ?? null,
            'capacity' => $validated['capacity'] ?? 40,
            'assigned_driver' => $validated['assigned_driver'] ?? null,
            'driver_name' => $validated['assigned_driver'] ?? null,
            'driver_phone' => $validated['driver_phone'] ?? null,
            'driver_license' => $validated['driver_license'] ?? null,
            'gps_device_id' => $validated['gps_device_id'] ?? null,
            'insurance_expiry' => $validated['insurance_expiry'] ?? null,
            'fitness_expiry' => $validated['fitness_expiry'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Vehicle updated',
            'data' => $this->serializeVehicle($vehicle),
        ]);
    }

    public function destroyVehicle(TransportVehicle $vehicle): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($vehicle->organization_id === $organization->id, 403);

        $vehicle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Vehicle removed from fleet',
        ]);
    }

    public function indexAssignments(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();
        $statusFilter = $request->query('status');
        $search = $request->query('search');

        $query = TransportAssignment::query()
            ->whereHas('route', fn ($q) => $q->where('organization_id', $organization->id))
            ->with(['student.schoolClass:id,name,section', 'route:id,route_name,route_number', 'vehicle:id,vehicle_number']);

        $assignments = $query->orderByDesc('created_at')
            ->get()
            ->map(fn (TransportAssignment $a) => [
                'id' => $a->id,
                'student_id' => $a->student_id,
                'student_name' => trim(($a->student?->first_name ?? '') . ' ' . ($a->student?->last_name ?? '')),
                'admission_no' => $a->student?->admission_no ?? '',
                'class' => $a->student?->schoolClass?->name ?? '',
                'section' => $a->student?->schoolClass?->section ?? '',
                'route_id' => $a->route_id,
                'route_name' => $a->route?->route_name ?? '',
                'route_number' => $a->route?->route_number ?? '',
                'vehicle_id' => $a->vehicle_id,
                'vehicle_number' => $a->vehicle?->vehicle_number ?? '',
                'pickup_point' => $a->pickup_point ?? '',
                'drop_point' => $a->drop_point ?? '',
                'pickup_time' => $this->formatTransportTime($a->pickup_time),
                'drop_time' => $this->formatTransportTime($a->drop_time),
                'monthly_fee' => (float) ($a->monthly_fee ?? 0),
                'status' => $a->status,
            ]);

        if ($statusFilter && $statusFilter !== 'all') {
            $assignments = $assignments->filter(fn ($a) => $a['status'] === $statusFilter)->values();
        }
        if ($search) {
            $search = strtolower($search);
            $assignments = $assignments->filter(fn ($a) =>
                str_contains(strtolower($a['student_name']), $search) ||
                str_contains(strtolower($a['admission_no']), $search) ||
                str_contains(strtolower($a['route_name']), $search)
            )->values();
        }

        $students = Student::where('organization_id', $organization->id)
            ->where('status', 'active')
            ->with('schoolClass:id,name,section')
            ->orderBy('first_name')
            ->get()
            ->map(fn (Student $s) => [
                'id' => $s->id,
                'name' => trim(($s->first_name ?? '') . ' ' . ($s->last_name ?? '')),
                'admission_no' => $s->admission_no ?? '',
                'class' => $s->schoolClass?->name ?? '',
                'section' => $s->schoolClass?->section ?? '',
            ]);

        $routes = TransportRoute::where('organization_id', $organization->id)
            ->where('status', 'active')
            ->orderBy('route_name')
            ->get(['id', 'route_name', 'route_number'])
            ->map(fn (TransportRoute $r) => [
                'id' => $r->id,
                'name' => $r->route_name,
                'route_number' => $r->route_number,
            ]);

        $vehicles = TransportVehicle::where('organization_id', $organization->id)
            ->where('status', 'active')
            ->orderBy('vehicle_number')
            ->get(['id', 'vehicle_number'])
            ->map(fn (TransportVehicle $v) => [
                'id' => $v->id,
                'vehicle_number' => $v->vehicle_number,
            ]);

        $totalFee = $assignments->sum('monthly_fee');
        $activeCount = $assignments->where('status', 'active')->count();

        return response()->json([
            'success' => true,
            'data' => $assignments,
            'students' => $students,
            'routes' => $routes,
            'vehicles' => $vehicles,
            'summary' => [
                'total_assignments' => $assignments->count(),
                'active_assignments' => $activeCount,
                'total_fee' => $totalFee,
            ],
        ]);
    }

    public function storeAssignment(Request $request, TransportAssignmentService $assignments): JsonResponse
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);

        $this->assertCanManageRosterInput($request, 'add');

        $validated = $request->validate([
            'student_id' => ['required', 'integer'],
            'route_id' => ['required', 'integer'],
            'vehicle_id' => ['required', 'integer'],
            'pickup_point' => ['required', 'string', 'max:255'],
            'drop_point' => ['nullable', 'string', 'max:255'],
            'pickup_time' => ['nullable', 'string', 'max:10'],
            'drop_time' => ['nullable', 'string', 'max:10'],
            'monthly_fee' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['active', 'pending', 'paused', 'inactive'])],
        ]);

        $assignment = $assignments->create($request->user(), $organization, $academicYearId, [
            'studentId' => $validated['student_id'],
            'routeId' => $validated['route_id'],
            'vehicleId' => $validated['vehicle_id'],
            'pickupStop' => $validated['pickup_point'],
            'dropStop' => $validated['drop_point'] ?? null,
            'pickupTime' => $validated['pickup_time'] ?? null,
            'dropTime' => $validated['drop_time'] ?? null,
            'monthlyFee' => $validated['monthly_fee'] ?? 0,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => $assignment->isPending() ? 'Transport assignment submitted and waiting for manager approval' : 'Transport assignment created',
            'data' => $this->serializeAssignment($assignment),
        ], 201);
    }

    public function updateAssignment(Request $request, TransportAssignment $assignment, TransportAssignmentService $assignments): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($assignment->route && $assignment->route->organization_id === $organization->id, 403);
        $academicYearId = $this->requireActiveAcademicYearId($organization);

        $this->assertCanManageRosterInput($request, 'update', $assignment->vehicle);

        $validated = $request->validate([
            'student_id' => ['required', 'integer'],
            'route_id' => ['required', 'integer'],
            'vehicle_id' => ['required', 'integer'],
            'pickup_point' => ['required', 'string', 'max:255'],
            'drop_point' => ['nullable', 'string', 'max:255'],
            'pickup_time' => ['nullable', 'string', 'max:10'],
            'drop_time' => ['nullable', 'string', 'max:10'],
            'monthly_fee' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['active', 'pending', 'paused', 'inactive'])],
        ]);

        $updated = $assignments->update($request->user(), $organization, $academicYearId, $assignment, [
            'studentId' => $validated['student_id'],
            'routeId' => $validated['route_id'],
            'vehicleId' => $validated['vehicle_id'],
            'pickupStop' => $validated['pickup_point'],
            'dropStop' => $validated['drop_point'] ?? null,
            'pickupTime' => $validated['pickup_time'] ?? null,
            'dropTime' => $validated['drop_time'] ?? null,
            'monthlyFee' => $validated['monthly_fee'] ?? 0,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transport assignment updated',
            'data' => $this->serializeAssignment($updated),
        ]);
    }

    public function destroyAssignment(Request $request, TransportAssignment $assignment, TransportAssignmentService $assignments): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($assignment->route && $assignment->route->organization_id === $organization->id, 403);

        $assignments->delete($request->user(), $assignment);

        return response()->json([
            'success' => true,
            'message' => 'Transport assignment removed',
        ]);
    }

    public function approveAssignment(Request $request, TransportAssignment $assignment, TransportAssignmentService $assignments): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($assignment->route && $assignment->route->organization_id === $organization->id, 403);

        $assignments->approve($request->user(), $assignment);

        return response()->json(['success' => true, 'message' => 'Transport assignment approved', 'data' => $this->serializeAssignment($assignment->fresh())]);
    }

    public function rejectAssignment(Request $request, TransportAssignment $assignment, TransportAssignmentService $assignments): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($assignment->route && $assignment->route->organization_id === $organization->id, 403);

        $reason = $request->input('reason');
        $assignments->reject($request->user(), $assignment, is_string($reason) ? $reason : null);

        return response()->json(['success' => true, 'message' => 'Transport assignment rejected', 'data' => $this->serializeAssignment($assignment->fresh())]);
    }

    public function indexTrips(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();
        $statusFilter = $request->query('status');
        $shiftFilter = $request->query('shift');

        $query = DailyTrip::query()
            ->whereHas('route', fn ($q) => $q->where('organization_id', $organization->id))
            ->with(['route:id,route_name', 'vehicle:id,vehicle_number'])
            ->orderByDesc('created_at');

        if ($statusFilter && $statusFilter !== 'all') {
            $query->where('trip_status', $statusFilter);
        }
        if ($shiftFilter && $shiftFilter !== 'all') {
            $query->where('shift', $shiftFilter);
        }

        $trips = $query->get()
            ->map(fn (DailyTrip $t) => [
                'id' => $t->id,
                'route_id' => $t->route_id,
                'route_name' => $t->route?->route_name ?? '',
                'vehicle_id' => $t->vehicle_id,
                'vehicle_number' => $t->vehicle?->vehicle_number ?? '',
                'shift' => $t->shift,
                'pickup_points' => $t->pickup_points ? explode(',', $t->pickup_points) : [],
                'current_location' => $t->current_location ?? '',
                'destination_point' => $t->destination_point ?? '',
                'departure_time' => $t->departure_time ?? '',
                'expected_arrival' => $t->expected_arrival ?? '',
                'supervisor' => $t->supervisor ?? '',
                'trip_status' => $t->trip_status,
                'note' => $t->note ?? '',
                'date' => $t->created_at?->format('Y-m-d'),
            ]);

        $routes = TransportRoute::where('organization_id', $organization->id)
            ->where('status', 'active')
            ->orderBy('route_name')
            ->get(['id', 'route_name'])
            ->map(fn (TransportRoute $r) => [
                'id' => $r->id,
                'name' => $r->route_name,
            ]);

        $vehicles = TransportVehicle::where('organization_id', $organization->id)
            ->where('status', 'active')
            ->orderBy('vehicle_number')
            ->get(['id', 'vehicle_number'])
            ->map(fn (TransportVehicle $v) => [
                'id' => $v->id,
                'vehicle_number' => $v->vehicle_number,
            ]);

        return response()->json([
            'success' => true,
            'data' => $trips,
            'routes' => $routes,
            'vehicles' => $vehicles,
        ]);
    }

    public function storeTrip(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'route_id' => ['nullable', 'integer'],
            'vehicle_id' => ['nullable', 'integer'],
            'shift' => ['required', Rule::in(['morning', 'afternoon', 'evening'])],
            'pickup_points' => ['nullable', 'array'],
            'current_location' => ['nullable', 'string', 'max:255'],
            'destination_point' => ['nullable', 'string', 'max:255'],
            'departure_time' => ['nullable', 'string', 'max:10'],
            'expected_arrival' => ['nullable', 'string', 'max:10'],
            'supervisor' => ['nullable', 'string', 'max:255'],
            'trip_status' => ['required', Rule::in(['scheduled', 'running', 'completed', 'delayed', 'cancelled'])],
            'note' => ['nullable', 'string'],
        ]);

        if ($validated['route_id']) {
            TransportRoute::where('organization_id', $organization->id)->findOrFail($validated['route_id']);
        }
        if ($validated['vehicle_id']) {
            TransportVehicle::where('organization_id', $organization->id)->findOrFail($validated['vehicle_id']);
        }

        $trip = DailyTrip::create([
            'route_id' => $validated['route_id'] ?? null,
            'vehicle_id' => $validated['vehicle_id'] ?? null,
            'shift' => $validated['shift'],
            'pickup_points' => !empty($validated['pickup_points']) ? implode(',', $validated['pickup_points']) : null,
            'current_location' => $validated['current_location'] ?? null,
            'destination_point' => $validated['destination_point'] ?? null,
            'departure_time' => $validated['departure_time'] ?? null,
            'expected_arrival' => $validated['expected_arrival'] ?? null,
            'supervisor' => $validated['supervisor'] ?? null,
            'trip_status' => $validated['trip_status'],
            'note' => $validated['note'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Daily trip scheduled',
            'data' => $this->serializeTrip($trip),
        ], 201);
    }

    public function updateTrip(Request $request, DailyTrip $trip): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($trip->route && $trip->route->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'route_id' => ['nullable', 'integer'],
            'vehicle_id' => ['nullable', 'integer'],
            'shift' => ['required', Rule::in(['morning', 'afternoon', 'evening'])],
            'pickup_points' => ['nullable', 'array'],
            'current_location' => ['nullable', 'string', 'max:255'],
            'destination_point' => ['nullable', 'string', 'max:255'],
            'departure_time' => ['nullable', 'string', 'max:10'],
            'expected_arrival' => ['nullable', 'string', 'max:10'],
            'supervisor' => ['nullable', 'string', 'max:255'],
            'trip_status' => ['required', Rule::in(['scheduled', 'running', 'completed', 'delayed', 'cancelled'])],
            'note' => ['nullable', 'string'],
        ]);

        if ($validated['route_id']) {
            TransportRoute::where('organization_id', $organization->id)->findOrFail($validated['route_id']);
        }
        if ($validated['vehicle_id']) {
            TransportVehicle::where('organization_id', $organization->id)->findOrFail($validated['vehicle_id']);
        }

        $trip->update([
            'route_id' => $validated['route_id'] ?? null,
            'vehicle_id' => $validated['vehicle_id'] ?? null,
            'shift' => $validated['shift'],
            'pickup_points' => !empty($validated['pickup_points']) ? implode(',', $validated['pickup_points']) : null,
            'current_location' => $validated['current_location'] ?? null,
            'destination_point' => $validated['destination_point'] ?? null,
            'departure_time' => $validated['departure_time'] ?? null,
            'expected_arrival' => $validated['expected_arrival'] ?? null,
            'supervisor' => $validated['supervisor'] ?? null,
            'trip_status' => $validated['trip_status'],
            'note' => $validated['note'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Daily trip updated',
            'data' => $this->serializeTrip($trip),
        ]);
    }

    public function destroyTrip(DailyTrip $trip): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($trip->route && $trip->route->organization_id === $organization->id, 403);

        $trip->delete();

        return response()->json([
            'success' => true,
            'message' => 'Daily trip removed',
        ]);
    }

    public function indexFeeCollection(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();
        $transport = app(\App\Http\Controllers\TransportManagementController::class);

        $this->fees->syncOrganization($organization);

        $classFilter = (string) $request->input('class', '');
        $sectionFilter = (string) $request->input('section', '');
        $statusFilter = (string) $request->input('status', '');
        $search = trim((string) $request->input('search', ''));

        $records = collect($transport->getTransportFeeRecords($organization))
            ->filter(function (array $record) use ($classFilter, $sectionFilter, $statusFilter, $search) {
                if ($classFilter !== '' && ($record['class'] !== $classFilter || ($sectionFilter !== '' && $record['section'] !== $sectionFilter))) {
                    return false;
                }

                if ($statusFilter !== '' && $record['status'] !== $statusFilter) {
                    return false;
                }

                if ($search !== '' && ! str_contains(strtolower((string) $record['studentName']), strtolower($search))
                    && ! str_contains(strtolower((string) $record['admissionNumber']), strtolower($search))) {
                    return false;
                }

                return true;
            })
            ->values()
            ->all();

        $records = collect($records);

        return response()->json([
            'success' => true,
            'data' => $records->values()->all(),
            'classes' => $transport->getTransportFeeClassRecords($organization),
            'summary' => [
                'totalRecords' => $records->count(),
                'totalAmount' => round($records->sum('amount'), 2),
                'totalPaidAmount' => round($records->sum('paidAmount'), 2),
                'totalDueAmount' => round($records->sum('dueAmount'), 2),
                'paidCount' => $records->where('status', 'paid')->count(),
                'partialCount' => $records->where('status', 'partial')->count(),
                'pendingCount' => $records->where('status', 'pending')->count(),
            ],
            'message' => 'Transport fee records loaded',
        ]);
    }

    public function collectPayment(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();
        $user = Auth::user();

        $validated = $request->validate([
            'student_fee_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', Rule::in(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'online'])],
            'transaction_id' => ['nullable', 'string', 'max:255'],
        ]);

        $feeRecord = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->whereNotNull('transport_assignment_id')
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'like', '%Transport Fee - %'))
            ->find($validated['student_fee_id']);

        if (! $feeRecord) {
            return response()->json(['success' => false, 'message' => 'Transport fee record not found.'], 404);
        }

        if ((float) $feeRecord->balance <= 0 || $feeRecord->status === 'waived') {
            return response()->json(['success' => false, 'message' => 'Transport fee record does not have a pending balance.'], 422);
        }

        $transport = app(\App\Http\Controllers\TransportManagementController::class);

        $payment = DB::transaction(function () use ($feeRecord, $validated, $organization, $user, $transport) {
            $payment = FeePayment::query()->create([
                'organization_id' => $organization->id,
                'student_fee_id' => $feeRecord->id,
                'student_id' => $feeRecord->student_id,
                'receipt_number' => $transport->generateReceiptNumber(),
                'amount' => (float) $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'transaction_id' => $validated['transaction_id'] ?? null,
                'payment_date' => now()->toDateString(),
                'collected_by' => $user->id,
                'remarks' => sprintf('Transport fee collection for %s %s.', $feeRecord->month, $feeRecord->year),
                'status' => 'success',
            ]);

            $paidAmount = (float) $feeRecord->paid_amount + (float) $validated['amount'];
            $balance = max(0, (float) $feeRecord->net_amount - $paidAmount);

            $feeRecord->update([
                'paid_amount' => $paidAmount,
                'balance' => $balance,
                'status' => $this->fees->determineFeeStatus($balance, $feeRecord->due_date, $paidAmount),
            ]);

            return $payment;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $payment->id,
                'receiptNumber' => $payment->receipt_number,
                'amount' => (float) $payment->amount,
                'paymentDate' => $payment->payment_date?->format('Y-m-d'),
                'studentFeeId' => (string) $payment->student_fee_id,
                'balance' => (float) $feeRecord->balance,
            ],
            'message' => 'Transport fee payment recorded successfully.',
        ], 201);
    }

    public function revertPayment(Request $request, FeePayment $feePayment): JsonResponse
    {
        $organization = $this->requireOrganization();

        if ($feePayment->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Payment does not belong to this organization.'], 403);
        }

        if ($feePayment->status === 'refunded') {
            return response()->json(['success' => false, 'message' => 'Payment has already been reverted.'], 422);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
            'reverted_at' => ['nullable', 'date'],
        ]);

        $transport = app(\App\Http\Controllers\TransportManagementController::class);

        $studentFee = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->whereNotNull('transport_assignment_id')
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'like', '%Transport Fee - %'))
            ->find($feePayment->student_fee_id);

        if (! $studentFee) {
            return response()->json(['success' => false, 'message' => 'Linked transport fee record was not found.'], 404);
        }

        DB::transaction(function () use ($feePayment, $studentFee, $validated, $transport) {
            $updatedPaidAmount = max(0, (float) $studentFee->paid_amount - (float) $feePayment->amount);
            $updatedBalance = min((float) $studentFee->net_amount, max(0, (float) $studentFee->net_amount - $updatedPaidAmount));

            $studentFee->update([
                'paid_amount' => $updatedPaidAmount,
                'balance' => $updatedBalance,
                'status' => $this->fees->determineFeeStatus($updatedBalance, $studentFee->due_date, $updatedPaidAmount),
            ]);

            $feePayment->update([
                'status' => 'refunded',
                'revert_reason' => $validated['reason'],
                'reverted_at' => ($validated['reverted_at'] ?? null) ? Carbon::parse($validated['reverted_at'])->toDateTimeString() : now(),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Transport fee payment reverted successfully.',
        ]);
    }

    private function serializeRoute(TransportRoute $route): array
    {
        $stops = $route->stops;
        if (is_string($stops)) {
            $stops = json_decode($stops, true) ?? [];
        }
        return [
            'id' => $route->id,
            'name' => $route->route_name,
            'route_number' => $route->route_number ?? '',
            'area' => $route->area ?? '',
            'vehicle_number' => $route->vehicle_number ?? '',
            'driver_name' => $route->driver_name ?? '',
            'driver_phone' => $route->driver_phone ?? '',
            'morning_pickup' => $route->morning_pickup ? Carbon::parse($route->morning_pickup)->format('H:i') : '',
            'afternoon_drop' => $route->afternoon_drop ? Carbon::parse($route->afternoon_drop)->format('H:i') : '',
            'monthly_fee' => (float) ($route->monthly_fee ?? $route->fare ?? 0),
            'stops' => $stops,
            'description' => $route->description ?? '',
            'status' => $route->status,
        ];
    }

    private function serializeVehicle(TransportVehicle $vehicle): array
    {
        return [
            'id' => $vehicle->id,
            'vehicle_number' => $vehicle->vehicle_number,
            'vehicle_type' => $vehicle->vehicle_type ?? $vehicle->vehicle_model ?? '',
            'capacity' => (int) $vehicle->capacity,
            'assigned_driver' => $vehicle->assigned_driver ?? $vehicle->driver_name ?? '',
            'driver_phone' => $vehicle->driver_phone ?? '',
            'driver_license' => $vehicle->driver_license ?? '',
            'gps_device_id' => $vehicle->gps_device_id ?? '',
            'insurance_expiry' => $vehicle->insurance_expiry?->format('Y-m-d'),
            'fitness_expiry' => $vehicle->fitness_expiry?->format('Y-m-d'),
            'status' => $vehicle->status,
        ];
    }

    private function serializeAssignment(TransportAssignment $assignment): array
    {
        return [
            'id' => $assignment->id,
            'student_id' => $assignment->student_id,
            'student_name' => trim(($assignment->student?->first_name ?? '') . ' ' . ($assignment->student?->last_name ?? '')),
            'admission_no' => $assignment->student?->admission_no ?? '',
            'class' => $assignment->student?->schoolClass?->name ?? '',
            'section' => $assignment->student?->schoolClass?->section ?? '',
            'route_id' => $assignment->route_id,
            'route_name' => $assignment->route?->route_name ?? '',
            'route_number' => $assignment->route?->route_number ?? '',
            'vehicle_id' => $assignment->vehicle_id,
            'vehicle_number' => $assignment->vehicle?->vehicle_number ?? '',
            'pickup_point' => $assignment->pickup_point ?? '',
            'drop_point' => $assignment->drop_point ?? '',
            'pickup_time' => $this->formatTransportTime($assignment->pickup_time),
            'drop_time' => $this->formatTransportTime($assignment->drop_time),
            'monthly_fee' => (float) ($assignment->monthly_fee ?? 0),
            'status' => $assignment->status,
        ];
    }

    private function formatTransportTime(mixed $time): string
    {
        if (empty($time)) {
            return '';
        }

        try {
            return Carbon::parse($time)->format('H:i');
        } catch (\Throwable) {
            return (string) $time;
        }
    }

    private function serializeTrip(DailyTrip $trip): array
    {
        return [
            'id' => $trip->id,
            'route_id' => $trip->route_id,
            'route_name' => $trip->route?->route_name ?? '',
            'vehicle_id' => $trip->vehicle_id,
            'vehicle_number' => $trip->vehicle?->vehicle_number ?? '',
            'shift' => $trip->shift,
            'pickup_points' => $trip->pickup_points ? explode(',', $trip->pickup_points) : [],
            'current_location' => $trip->current_location ?? '',
            'destination_point' => $trip->destination_point ?? '',
            'departure_time' => $trip->departure_time ?? '',
            'expected_arrival' => $trip->expected_arrival ?? '',
            'supervisor' => $trip->supervisor ?? '',
            'trip_status' => $trip->trip_status,
            'note' => $trip->note ?? '',
            'date' => $trip->created_at?->format('Y-m-d'),
        ];
    }

    /**
     * Roster authority is decided before field validation so an unauthorised
     * driver gets a 403 instead of a 422 that confirms the roster shape.
     */
    private function assertCanManageRosterInput(Request $request, string $action, ?TransportVehicle $fallback = null): void
    {
        $organization = $this->requireOrganization();
        $vehicleId = $request->input('vehicle_id') ?? $request->input('vehicleId') ?? $fallback?->id;

        $vehicle = $vehicleId
            ? TransportVehicle::query()->where('organization_id', $organization->id)->find($vehicleId)
            : $fallback;

        $decision = app(TransportPolicyResolver::class)->canManageRoster($request->user(), $vehicle, $action);

        abort_unless($decision['allowed'], 403, $decision['message']);
    }

    private function requireActiveAcademicYearId(Organization $organization): int
    {
        $academicYearId = $organization->selectedAcademicYear()?->id;

        abort_unless($academicYearId, 422, 'Create and activate an academic session before managing transport data.');

        return (int) $academicYearId;
    }

    private function requireOrganization(): Organization
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization, 403);
        return $organization;
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::find($user->organization_id);
        }
        if ($user->role !== 'admin') {
            return null;
        }
        $organization = Organization::where('email', $user->email)->first();
        if (!$organization && Organization::count() === 1) {
            $organization = Organization::first();
        }
        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }
        return $organization;
    }
}
