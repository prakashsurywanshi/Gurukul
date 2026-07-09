<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyTrip;
use App\Models\Organization;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\TransportAssignment;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TransportApiController extends Controller
{
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

    public function storeAssignment(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

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

        $exists = TransportAssignment::where('student_id', $validated['student_id'])->exists();
        if ($exists) {
            return response()->json(['success' => false, 'message' => 'Student already has a transport assignment'], 400);
        }

        Student::where('organization_id', $organization->id)->findOrFail($validated['student_id']);
        TransportRoute::where('organization_id', $organization->id)->findOrFail($validated['route_id']);
        TransportVehicle::where('organization_id', $organization->id)->findOrFail($validated['vehicle_id']);

        $assignment = TransportAssignment::create([
            'student_id' => $validated['student_id'],
            'route_id' => $validated['route_id'],
            'vehicle_id' => $validated['vehicle_id'],
            'pickup_point' => $validated['pickup_point'],
            'drop_point' => $validated['drop_point'] ?? $validated['pickup_point'],
            'pickup_time' => $validated['pickup_time'] ?? null,
            'drop_time' => $validated['drop_time'] ?? null,
            'monthly_fee' => $validated['monthly_fee'] ?? 0,
            'status' => $validated['status'],
        ]);

        $student = Student::find($validated['student_id']);
        if ($student) {
            $student->update([
                'transport_required' => true,
                'transport_pickup_point' => $validated['pickup_point'],
                'transport_vehicle' => TransportVehicle::find($validated['vehicle_id'])?->vehicle_number ?? null,
                'transport_route' => TransportRoute::find($validated['route_id'])?->route_name ?? null,
                'transport_route_details' => trim(
                    (TransportRoute::find($validated['route_id'])?->route_name ?? '')
                    . ($validated['pickup_point'] ? ' / ' . $validated['pickup_point'] : '')
                ),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Transport assignment created',
            'data' => $this->serializeAssignment($assignment),
        ], 201);
    }

    public function updateAssignment(Request $request, TransportAssignment $assignment): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($assignment->route && $assignment->route->organization_id === $organization->id, 403);
        $previousStudent = $assignment->student;

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

        TransportRoute::where('organization_id', $organization->id)->findOrFail($validated['route_id']);
        TransportVehicle::where('organization_id', $organization->id)->findOrFail($validated['vehicle_id']);

        $assignment->update([
            'student_id' => $validated['student_id'],
            'route_id' => $validated['route_id'],
            'vehicle_id' => $validated['vehicle_id'],
            'pickup_point' => $validated['pickup_point'],
            'drop_point' => $validated['drop_point'] ?? $validated['pickup_point'],
            'pickup_time' => $validated['pickup_time'] ?? null,
            'drop_time' => $validated['drop_time'] ?? null,
            'monthly_fee' => $validated['monthly_fee'] ?? 0,
            'status' => $validated['status'],
        ]);

        $student = Student::find($validated['student_id']);
        $route = TransportRoute::find($validated['route_id']);
        $vehicle = TransportVehicle::find($validated['vehicle_id']);

        if ($previousStudent && $previousStudent->id !== $validated['student_id']) {
            $previousStudent->update([
                'transport_required' => false,
                'transport_pickup_point' => null,
                'transport_vehicle' => null,
                'transport_route' => null,
                'transport_route_details' => null,
            ]);
        }

        if ($student) {
            $student->update([
                'transport_required' => true,
                'transport_pickup_point' => $validated['pickup_point'],
                'transport_vehicle' => $vehicle?->vehicle_number,
                'transport_route' => $route?->route_name,
                'transport_route_details' => trim(
                    ($route?->route_name ?? '')
                    . ($validated['pickup_point'] ? ' / ' . $validated['pickup_point'] : '')
                ),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Transport assignment updated',
            'data' => $this->serializeAssignment($assignment),
        ]);
    }

    public function destroyAssignment(TransportAssignment $assignment): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($assignment->route && $assignment->route->organization_id === $organization->id, 403);

        $student = $assignment->student;

        DB::transaction(function () use ($assignment, $student) {
            $this->clearTransportDuesForRemovedAssignment($assignment);
            $assignment->delete();

            if ($student) {
                $student->update([
                    'transport_required' => false,
                    'transport_pickup_point' => null,
                    'transport_vehicle' => null,
                    'transport_route' => null,
                    'transport_route_details' => null,
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Transport assignment removed',
        ]);
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

    private function clearTransportDuesForRemovedAssignment(TransportAssignment $assignment): void
    {
        StudentFee::query()
            ->where('transport_assignment_id', $assignment->id)
            ->withCount([
                'payments as active_payments_count' => fn ($query) => $query->whereIn('status', ['success', 'pending']),
            ])
            ->get()
            ->each(function (StudentFee $fee) {
                $paidAmount = (float) $fee->paid_amount;

                if ($paidAmount <= 0 && (int) $fee->active_payments_count === 0) {
                    $fee->delete();
                    return;
                }

                $fee->update([
                    'net_amount' => $paidAmount,
                    'balance' => 0,
                    'status' => $paidAmount > 0 ? 'paid' : 'waived',
                    'notes' => trim(($fee->notes ? $fee->notes . "\n" : '') . 'Transport assignment removed; remaining transport due cleared.'),
                ]);
            });
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
