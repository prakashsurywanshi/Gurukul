<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\DailyTrip;
use App\Models\FeePayment;
use App\Models\FeeStructure;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\Organization;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\TransportAssignment;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\User;
use App\Services\FirebaseCloudMessagingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TransportManagementController extends Controller
{
    private const TRANSPORT_FEE_PREFIX = 'Transport Fee - ';

    public function __construct(
        private readonly FirebaseCloudMessagingService $firebaseCloudMessagingService,
    ) {}

    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $academicYearId = $organization ? $this->getActiveAcademicYearId($organization) : null;

        $routes = TransportRoute::query()
            ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId), fn ($query) => $query->whereRaw('1 = 0'))
            ->when($user?->role === 'driver', fn ($query) => $this->scopeRouteToDriver($query, $user))
            ->orderBy('route_name')
            ->get()
            ->map(fn (TransportRoute $route) => [
                'id' => (string) $route->id,
                'name' => $route->route_name,
                'area' => $route->area ?? '',
                'vehicleNumber' => $route->vehicle_number ?? '',
                'driverName' => $route->driver_name ?? '',
                'driverPhone' => $route->driver_phone ?? '',
                'morningPickup' => $route->morning_pickup ? Carbon::parse($route->morning_pickup)->format('H:i') : '',
                'afternoonDrop' => $route->afternoon_drop ? Carbon::parse($route->afternoon_drop)->format('H:i') : '',
                'monthlyFee' => (float) ($route->monthly_fee ?? $route->fare ?? 0),
                'stops' => is_array($route->stops) ? $route->stops : (json_decode($route->stops ?? '[]', true) ?? []),
                'status' => $route->status,
            ]);

        $vehicles = TransportVehicle::query()
            ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId), fn ($query) => $query->whereRaw('1 = 0'))
            ->when($user?->role === 'driver', fn ($query) => $this->scopeVehicleToDriver($query, $user))
            ->orderBy('vehicle_number')
            ->get()
            ->map(fn (TransportVehicle $vehicle) => [
                'id' => (string) $vehicle->id,
                'vehicleNumber' => $vehicle->vehicle_number,
                'vehicleType' => $vehicle->vehicle_type ?? $vehicle->vehicle_model ?? '',
                'capacity' => (int) $vehicle->capacity,
                'assignedDriver' => $vehicle->assigned_driver ?? $vehicle->driver_name ?? '',
                'driverPhone' => $vehicle->driver_phone ?? '',
                'gpsDeviceId' => $vehicle->gps_device_id ?? '',
                'insuranceExpiry' => $vehicle->insurance_expiry ? Carbon::parse($vehicle->insurance_expiry)->format('Y-m-d') : '',
                'status' => $vehicle->status,
            ]);

        $assignments = TransportAssignment::query()
            ->with(['student.schoolClass', 'route', 'vehicle'])
            ->when(
                $organization,
                fn ($query) => $query->whereHas('student', fn ($studentQuery) => $studentQuery->where('organization_id', $organization->id))
            )
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId), fn ($query) => $query->whereRaw('1 = 0'))
            ->get()
            ->map(fn (TransportAssignment $assignment) => [
                'id' => (string) $assignment->id,
                'studentId' => (string) $assignment->student_id,
                'studentName' => trim(($assignment->student?->first_name ?? '') . ' ' . ($assignment->student?->last_name ?? '')),
                'admissionNo' => $assignment->student?->admission_no ?? '',
                'className' => $assignment->student?->schoolClass?->name ?? '',
                'section' => $assignment->student?->schoolClass?->section ?? '',
                'routeId' => (string) $assignment->route_id,
                'vehicleId' => $assignment->vehicle_id ? (string) $assignment->vehicle_id : '',
                'pickupStop' => $assignment->pickup_point ?? '',
                'dropStop' => $assignment->drop_point ?? '',
                'pickupTime' => $this->formatTransportTime($assignment->pickup_time),
                'dropTime' => $this->formatTransportTime($assignment->drop_time),
                'monthlyFee' => (float) ($assignment->monthly_fee ?? 0),
                'status' => $assignment->status,
            ]);

        $trips = DailyTrip::query()
            ->with(['route', 'vehicle', 'driver:id,name'])
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId), fn ($query) => $query->whereRaw('1 = 0'))
            ->when($user?->role === 'driver', fn ($query) => $query->where('driver_user_id', $user->id))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (DailyTrip $trip) => [
                'id' => (string) $trip->id,
                'routeId' => $trip->route_id ? (string) $trip->route_id : '',
                'vehicleId' => $trip->vehicle_id ? (string) $trip->vehicle_id : '',
                'driverId' => $trip->driver_user_id ? (string) $trip->driver_user_id : '',
                'driverName' => $trip->driver?->name ?? '',
                'shift' => $trip->shift,
                'journeyDate' => $trip->journey_date?->format('Y-m-d') ?? '',
                'direction' => $trip->direction ?? 'pickup',
                'pickupPoints' => $trip->pickup_points ? explode(',', $trip->pickup_points) : [],
                'currentLocation' => $trip->current_location ?? '',
                'currentStop' => $trip->current_stop ?? '',
                'destinationPoint' => $trip->destination_point ?? '',
                'departureTime' => $trip->departure_time ?? '',
                'expectedArrival' => $trip->expected_arrival ?? '',
                'startedAt' => $trip->started_at?->format('Y-m-d H:i:s') ?? '',
                'endedAt' => $trip->ended_at?->format('Y-m-d H:i:s') ?? '',
                'stopUpdates' => $trip->stop_updates ?? [],
                'supervisor' => $trip->supervisor ?? '',
                'tripStatus' => $trip->trip_status,
                'note' => $trip->note ?? '',
            ]);

        $students = Student::query()
            ->with('schoolClass')
            ->when($organization, fn ($query) => $query->forCurrentSession($organization->id), fn ($query) => $query->whereRaw('1 = 0'))
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get()
            ->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name ?? '',
                'admission_no' => $student->admission_no,
                'class' => $student->schoolClass ? $student->schoolClass->name : '',
                'section' => $student->schoolClass ? $student->schoolClass->section : '',
                'status' => $student->status,
                'transport_required' => (bool) $student->transport_required,
            ]);

        return inertia('dashboard/TransportManagement', [
            'user' => $user,
            'routes' => $routes,
            'vehicles' => $vehicles,
            'assignments' => $assignments,
            'trips' => $trips,
            'students' => $students,
        ]);
    }

    public function feeCollection(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $selectedAcademicYear = $organization
            ? $this->resolveSelectedAcademicYear($organization, $request->input('session'))
            : null;

        if ($organization && $selectedAcademicYear) {
            $this->syncOrganizationTransportFees($organization, $selectedAcademicYear->id);
        }

        return inertia('dashboard/TransportFeeCollection', [
            'user' => $user,
            'sessions' => $organization ? $this->getAcademicSessions($organization) : [],
            'selectedSessionId' => $selectedAcademicYear ? (string) $selectedAcademicYear->id : null,
            'selectedSessionName' => $selectedAcademicYear?->name,
            'classRecords' => $organization ? $this->getTransportFeeClassRecords($organization, $selectedAcademicYear?->id) : [],
            'transportFeeRecords' => $organization ? $this->getTransportFeeRecords($organization, $selectedAcademicYear?->id) : [],
        ]);
    }

    public function collectBulkFeePayment(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization();
        $user = Auth::user();

        $validated = $request->validate([
            'fee_ids' => ['required', 'array', 'min:1'],
            'fee_ids.*' => ['required', 'integer'],
            'payment_method' => ['required', Rule::in(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'online'])],
            'transaction_id' => ['nullable', 'string', 'max:255'],
        ]);

        $feeRecords = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', $validated['fee_ids'])
            ->whereNotNull('transport_assignment_id')
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'like', self::TRANSPORT_FEE_PREFIX . '%'))
            ->get();

        if ($feeRecords->count() !== count($validated['fee_ids'])) {
            return redirect()->back()->with('error', 'Some selected transport fee records were not found.');
        }

        $payableRecords = $feeRecords->filter(fn (StudentFee $fee) => (float) $fee->balance > 0 && $fee->status !== 'waived')->values();

        if ($payableRecords->isEmpty()) {
            return redirect()->back()->with('error', 'Selected transport fee records do not have any pending balance.');
        }

        $batchReference = $this->generateBatchReference();

        DB::transaction(function () use ($payableRecords, $validated, $organization, $user, $batchReference) {
            foreach ($payableRecords as $feeRecord) {
                $amount = (float) $feeRecord->balance;

                FeePayment::query()->create([
                    'organization_id' => $organization->id,
                    'student_fee_id' => $feeRecord->id,
                    'student_id' => $feeRecord->student_id,
                    'receipt_number' => $this->generateReceiptNumber(),
                    'batch_reference' => $batchReference,
                    'amount' => $amount,
                    'payment_method' => $validated['payment_method'],
                    'transaction_id' => $validated['transaction_id'] ?: null,
                    'payment_date' => now()->toDateString(),
                    'collected_by' => $user->id,
                    'remarks' => sprintf('Bulk transport fee collection for %s %s.', $feeRecord->month, $feeRecord->year),
                    'status' => 'success',
                ]);

                $paidAmount = (float) $feeRecord->paid_amount + $amount;
                $balance = max(0, (float) $feeRecord->net_amount - $paidAmount);

                $feeRecord->update([
                    'paid_amount' => $paidAmount,
                    'balance' => $balance,
                    'status' => $balance <= 0 ? 'paid' : 'partial',
                ]);
            }
        });

        return redirect()->back()->with('success', sprintf(
            'Collected transport fees for %d month%s successfully.',
            $payableRecords->count(),
            $payableRecords->count() === 1 ? '' : 's'
        ));
    }

    public function revertFeePayment(Request $request, FeePayment $feePayment): RedirectResponse
    {
        $organization = $this->requireOrganization();
        $user = Auth::user();

        abort_unless($feePayment->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
            'scope' => ['nullable', Rule::in(['payment', 'batch'])],
        ]);

        $scope = $validated['scope'] ?? 'payment';
        $payments = collect([$feePayment]);

        if ($scope === 'batch' && $feePayment->batch_reference) {
            $payments = FeePayment::query()
                ->where('organization_id', $organization->id)
                ->where('batch_reference', $feePayment->batch_reference)
                ->where('status', 'success')
                ->whereHas('studentFee', function ($query) {
                    $query->whereNotNull('transport_assignment_id')
                        ->whereHas('feeStructure', fn ($feeStructureQuery) => $feeStructureQuery->where('fee_type', 'like', self::TRANSPORT_FEE_PREFIX . '%'));
                })
                ->get();
        }

        $activePayments = $payments->filter(fn (FeePayment $payment) => $payment->status !== 'refunded')->values();

        if ($activePayments->isEmpty()) {
            return redirect()->back()->with('error', 'Selected payment has already been reverted.');
        }

        DB::transaction(function () use ($activePayments, $validated, $user, $organization) {
            foreach ($activePayments as $payment) {
                $studentFee = StudentFee::query()
                    ->where('organization_id', $organization->id)
                    ->whereNotNull('transport_assignment_id')
                    ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'like', self::TRANSPORT_FEE_PREFIX . '%'))
                    ->find($payment->student_fee_id);

                if (!$studentFee) {
                    continue;
                }

                $updatedPaidAmount = max(0, (float) $studentFee->paid_amount - (float) $payment->amount);
                $updatedBalance = min((float) $studentFee->net_amount, max(0, (float) $studentFee->net_amount - $updatedPaidAmount));

                $studentFee->update([
                    'paid_amount' => $updatedPaidAmount,
                    'balance' => $updatedBalance,
                    'status' => $this->determineFeeStatus($updatedBalance, $studentFee->due_date, $updatedPaidAmount),
                ]);

                $payment->update([
                    'status' => 'refunded',
                    'reverted_by' => $user->id,
                    'reverted_at' => now()->toDateString(),
                    'revert_reason' => $validated['reason'],
                    'remarks' => $validated['reason'],
                ]);
            }
        });

        return redirect()->back()->with('success', $scope === 'batch'
            ? 'Transport fee batch reverted successfully.'
            : 'Transport fee payment reverted successfully.');
    }

    // Routes

    public function storeRoute(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'area' => 'nullable|string|max:255',
            'vehicleNumber' => 'nullable|string|max:50',
            'driverName' => 'nullable|string|max:255',
            'driverPhone' => 'nullable|string|max:30',
            'morningPickup' => 'nullable|date_format:H:i',
            'afternoonDrop' => 'nullable|date_format:H:i',
            'monthlyFee' => 'nullable|numeric|min:0',
            'stops' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);
        $stopsArray = array_filter(array_map('trim', explode(',', $data['stops'] ?? '')));

        TransportRoute::query()->create([
            'route_name' => $data['name'],
            'route_number' => 'RT-' . strtoupper(substr(md5(microtime()), 0, 6)),
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'area' => $data['area'] ?? null,
            'vehicle_number' => $data['vehicleNumber'] ?? null,
            'driver_name' => $data['driverName'] ?? null,
            'driver_phone' => $data['driverPhone'] ?? null,
            'morning_pickup' => $data['morningPickup'] ?? null,
            'afternoon_drop' => $data['afternoonDrop'] ?? null,
            'monthly_fee' => $data['monthlyFee'] ?? 0,
            'fare' => $data['monthlyFee'] ?? 0,
            'stops' => json_encode(array_values($stopsArray)),
            'status' => $data['status'],
        ]);

        return back()->with('success', 'Route created successfully.');
    }

    public function updateRoute(Request $request, $id)
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);
        $route = TransportRoute::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($id);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'area' => 'nullable|string|max:255',
            'vehicleNumber' => 'nullable|string|max:50',
            'driverName' => 'nullable|string|max:255',
            'driverPhone' => 'nullable|string|max:30',
            'morningPickup' => 'nullable|date_format:H:i',
            'afternoonDrop' => 'nullable|date_format:H:i',
            'monthlyFee' => 'nullable|numeric|min:0',
            'stops' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $stopsArray = array_filter(array_map('trim', explode(',', $data['stops'] ?? '')));

        $route->update([
            'route_name' => $data['name'],
            'area' => $data['area'] ?? null,
            'vehicle_number' => $data['vehicleNumber'] ?? null,
            'driver_name' => $data['driverName'] ?? null,
            'driver_phone' => $data['driverPhone'] ?? null,
            'morning_pickup' => $data['morningPickup'] ?? null,
            'afternoon_drop' => $data['afternoonDrop'] ?? null,
            'monthly_fee' => $data['monthlyFee'] ?? 0,
            'fare' => $data['monthlyFee'] ?? 0,
            'stops' => json_encode(array_values($stopsArray)),
            'status' => $data['status'],
        ]);

        return back()->with('success', 'Route updated successfully.');
    }

    public function deleteRoute($id)
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);
        TransportRoute::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($id)
            ->delete();

        return back()->with('success', 'Route deleted.');
    }

    // Vehicles

    public function storeVehicle(Request $request)
    {
        $data = $request->validate([
            'vehicleNumber' => 'required|string|max:50',
            'vehicleType' => 'nullable|string|max:100',
            'capacity' => 'nullable|integer|min:1',
            'assignedDriver' => 'nullable|string|max:255',
            'driverPhone' => 'nullable|string|max:30',
            'gpsDeviceId' => 'nullable|string|max:100',
            'insuranceExpiry' => 'nullable|date',
            'status' => 'required|in:active,maintenance,inactive',
        ]);

        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);

        TransportVehicle::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'vehicle_number' => $data['vehicleNumber'],
            'vehicle_type' => $data['vehicleType'] ?? null,
            'vehicle_model' => $data['vehicleType'] ?? null,
            'capacity' => $data['capacity'] ?? 40,
            'assigned_driver' => $data['assignedDriver'] ?? null,
            'driver_name' => $data['assignedDriver'] ?? null,
            'driver_phone' => $data['driverPhone'] ?? null,
            'gps_device_id' => $data['gpsDeviceId'] ?? null,
            'insurance_expiry' => $data['insuranceExpiry'] ?? null,
            'status' => $data['status'],
        ]);

        return back()->with('success', 'Vehicle added to fleet.');
    }

    public function updateVehicle(Request $request, $id)
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);
        $vehicle = TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($id);

        $data = $request->validate([
            'vehicleNumber' => 'required|string|max:50',
            'vehicleType' => 'nullable|string|max:100',
            'capacity' => 'nullable|integer|min:1',
            'assignedDriver' => 'nullable|string|max:255',
            'driverPhone' => 'nullable|string|max:30',
            'gpsDeviceId' => 'nullable|string|max:100',
            'insuranceExpiry' => 'nullable|date',
            'status' => 'required|in:active,maintenance,inactive',
        ]);

        $vehicle->update([
            'vehicle_number' => $data['vehicleNumber'],
            'vehicle_type' => $data['vehicleType'] ?? null,
            'vehicle_model' => $data['vehicleType'] ?? null,
            'capacity' => $data['capacity'] ?? 40,
            'assigned_driver' => $data['assignedDriver'] ?? null,
            'driver_name' => $data['assignedDriver'] ?? null,
            'driver_phone' => $data['driverPhone'] ?? null,
            'gps_device_id' => $data['gpsDeviceId'] ?? null,
            'insurance_expiry' => $data['insuranceExpiry'] ?? null,
            'status' => $data['status'],
        ]);

        return back()->with('success', 'Vehicle updated.');
    }

    public function deleteVehicle($id)
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);
        TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($id)
            ->delete();

        return back()->with('success', 'Vehicle removed from fleet.');
    }

    // Assignments

    public function storeAssignment(Request $request)
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);

        $data = $request->validate([
            'studentId' => 'required|exists:students,id',
            'routeId' => 'required|exists:transport_routes,id',
            'vehicleId' => 'required|exists:transport_vehicles,id',
            'pickupStop' => 'required|string|max:255',
            'dropStop' => 'nullable|string|max:255',
            'pickupTime' => 'nullable|date_format:H:i',
            'dropTime' => 'nullable|date_format:H:i',
            'monthlyFee' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,pending,paused,inactive',
        ]);

        $student = Student::query()
            ->forCurrentSession($organization->id)
            ->findOrFail($data['studentId']);

        $route = TransportRoute::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($data['routeId']);

        $vehicle = TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($data['vehicleId']);

        $this->authorizeDriverJourneySelection($route, $vehicle);

        $exists = TransportAssignment::query()
            ->where('student_id', $student->id)
            ->where('academic_year_id', $academicYearId)
            ->exists();
        if ($exists) {
            return back()->withErrors(['studentId' => 'Student already has a transport assignment.']);
        }

        DB::transaction(function () use ($data, $student, $route, $vehicle, $organization, $academicYearId) {
            $assignment = TransportAssignment::query()->create([
                'academic_year_id' => $academicYearId,
                'student_id' => $student->id,
                'route_id' => $route->id,
                'vehicle_id' => $vehicle->id,
                'pickup_point' => $data['pickupStop'],
                'drop_point' => $data['dropStop'] ?? $data['pickupStop'],
                'pickup_time' => $data['pickupTime'] ?? null,
                'drop_time' => $data['dropTime'] ?? null,
                'monthly_fee' => $data['monthlyFee'] ?? 0,
                'status' => $data['status'],
            ]);

            $this->syncStudentTransportDetails($student, $assignment);
            $this->syncTransportFeeForAssignment($assignment->fresh(['student.schoolClass', 'route', 'vehicle']), $this->getActiveAcademicYearId($organization));
        });

        return redirect()->route('transport-management')->with('success', 'Transport assignment created.');
    }

    public function updateAssignment(Request $request, $id)
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);
        $assignment = TransportAssignment::query()
            ->with(['student', 'route', 'vehicle'])
            ->where('academic_year_id', $academicYearId)
            ->whereHas('student', fn ($query) => $query->where('organization_id', $organization->id))
            ->findOrFail($id);
        $previousStudent = $assignment->student;

        $data = $request->validate([
            'studentId' => 'required|exists:students,id',
            'routeId' => 'required|exists:transport_routes,id',
            'vehicleId' => 'required|exists:transport_vehicles,id',
            'pickupStop' => 'required|string|max:255',
            'dropStop' => 'nullable|string|max:255',
            'pickupTime' => 'nullable|date_format:H:i',
            'dropTime' => 'nullable|date_format:H:i',
            'monthlyFee' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,pending,paused,inactive',
        ]);

        $student = Student::query()
            ->forCurrentSession($organization->id)
            ->findOrFail($data['studentId']);

        $route = TransportRoute::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($data['routeId']);

        $vehicle = TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($data['vehicleId']);

        $duplicateAssignmentExists = TransportAssignment::query()
            ->where('student_id', $student->id)
            ->where('academic_year_id', $academicYearId)
            ->where('id', '!=', $assignment->id)
            ->exists();

        if ($duplicateAssignmentExists) {
            return back()->withErrors(['studentId' => 'Student already has a transport assignment.']);
        }

        DB::transaction(function () use ($assignment, $data, $student, $route, $vehicle, $organization, $previousStudent, $academicYearId) {
            $assignment->update([
                'academic_year_id' => $academicYearId,
                'student_id' => $student->id,
                'route_id' => $route->id,
                'vehicle_id' => $vehicle->id,
                'pickup_point' => $data['pickupStop'],
                'drop_point' => $data['dropStop'] ?? $data['pickupStop'],
                'pickup_time' => $data['pickupTime'] ?? null,
                'drop_time' => $data['dropTime'] ?? null,
                'monthly_fee' => $data['monthlyFee'] ?? 0,
                'status' => $data['status'],
            ]);

            $updatedAssignment = $assignment->fresh(['student.schoolClass', 'route', 'vehicle']);

            if ($previousStudent && $previousStudent->id !== $student->id) {
                StudentFee::query()
                    ->where('transport_assignment_id', $assignment->id)
                    ->update(['student_id' => $student->id]);

                $this->syncStudentTransportDetails($previousStudent, null);
            }

            $this->syncStudentTransportDetails($student, $updatedAssignment);
            $this->syncTransportFeeForAssignment($updatedAssignment, $this->getActiveAcademicYearId($organization));
        });

        return redirect()->route('transport-management')->with('success', 'Transport assignment updated.');
    }

    public function deleteAssignment($id)
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);
        $assignment = TransportAssignment::query()
            ->with('student')
            ->where('academic_year_id', $academicYearId)
            ->whereHas('student', fn ($query) => $query->where('organization_id', $organization->id))
            ->findOrFail($id);

        DB::transaction(function () use ($assignment) {
            $student = $assignment->student;
            $this->clearTransportDuesForRemovedAssignment($assignment);
            $assignment->delete();

            if ($student) {
                $this->syncStudentTransportDetails($student, null);
            }
        });

        return redirect()->route('transport-management')->with('success', 'Transport assignment removed.');
    }

    // Trips

    public function storeTrip(Request $request)
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);

        $data = $request->validate([
            'routeId' => 'nullable|exists:transport_routes,id',
            'vehicleId' => 'nullable|exists:transport_vehicles,id',
            'shift' => 'required|in:morning,afternoon,evening',
            'direction' => 'nullable|in:pickup,drop',
            'pickupPoints' => 'nullable|string',
            'currentLocation' => 'nullable|string|max:255',
            'currentStop' => 'nullable|string|max:255',
            'destinationPoint' => 'nullable|string|max:255',
            'departureTime' => 'nullable|date_format:H:i',
            'expectedArrival' => 'nullable|date_format:H:i',
            'supervisor' => 'nullable|string|max:255',
            'tripStatus' => 'required|in:scheduled,running,completed,delayed,cancelled',
            'note' => 'nullable|string',
        ]);

        if (!empty($data['routeId'])) {
            TransportRoute::query()
                ->where('organization_id', $organization->id)
                ->where('academic_year_id', $academicYearId)
                ->findOrFail($data['routeId']);
        }

        if (!empty($data['vehicleId'])) {
            TransportVehicle::query()
                ->where('organization_id', $organization->id)
                ->where('academic_year_id', $academicYearId)
                ->findOrFail($data['vehicleId']);
        }

        DailyTrip::query()->create([
            'academic_year_id' => $academicYearId,
            'route_id' => $data['routeId'] ?? null,
            'vehicle_id' => $data['vehicleId'] ?? null,
            'driver_user_id' => Auth::id(),
            'shift' => $data['shift'],
            'journey_date' => now()->toDateString(),
            'direction' => $data['direction'] ?? ($data['shift'] === 'afternoon' ? 'drop' : 'pickup'),
            'pickup_points' => $data['pickupPoints'] ?? null,
            'current_location' => $data['currentLocation'] ?? null,
            'current_stop' => $data['currentStop'] ?? null,
            'destination_point' => $data['destinationPoint'] ?? null,
            'departure_time' => $data['departureTime'] ?? null,
            'expected_arrival' => $data['expectedArrival'] ?? null,
            'supervisor' => $data['supervisor'] ?? null,
            'trip_status' => $data['tripStatus'],
            'note' => $data['note'] ?? null,
        ]);

        return back()->with('success', 'Daily trip scheduled.');
    }

    public function updateTrip(Request $request, $id)
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);
        $trip = DailyTrip::query()
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($id);

        $data = $request->validate([
            'routeId' => 'nullable|exists:transport_routes,id',
            'vehicleId' => 'nullable|exists:transport_vehicles,id',
            'shift' => 'required|in:morning,afternoon,evening',
            'direction' => 'nullable|in:pickup,drop',
            'pickupPoints' => 'nullable|string',
            'currentLocation' => 'nullable|string|max:255',
            'currentStop' => 'nullable|string|max:255',
            'destinationPoint' => 'nullable|string|max:255',
            'departureTime' => 'nullable|date_format:H:i',
            'expectedArrival' => 'nullable|date_format:H:i',
            'supervisor' => 'nullable|string|max:255',
            'tripStatus' => 'required|in:scheduled,running,completed,delayed,cancelled',
            'note' => 'nullable|string',
        ]);

        if (!empty($data['routeId'])) {
            TransportRoute::query()
                ->where('organization_id', $organization->id)
                ->where('academic_year_id', $academicYearId)
                ->findOrFail($data['routeId']);
        }

        if (!empty($data['vehicleId'])) {
            TransportVehicle::query()
                ->where('organization_id', $organization->id)
                ->where('academic_year_id', $academicYearId)
                ->findOrFail($data['vehicleId']);
        }

        $trip->update([
            'academic_year_id' => $academicYearId,
            'route_id' => $data['routeId'] ?? null,
            'vehicle_id' => $data['vehicleId'] ?? null,
            'shift' => $data['shift'],
            'direction' => $data['direction'] ?? ($data['shift'] === 'afternoon' ? 'drop' : 'pickup'),
            'pickup_points' => $data['pickupPoints'] ?? null,
            'current_location' => $data['currentLocation'] ?? null,
            'current_stop' => $data['currentStop'] ?? null,
            'destination_point' => $data['destinationPoint'] ?? null,
            'departure_time' => $data['departureTime'] ?? null,
            'expected_arrival' => $data['expectedArrival'] ?? null,
            'supervisor' => $data['supervisor'] ?? null,
            'trip_status' => $data['tripStatus'],
            'note' => $data['note'] ?? null,
        ]);

        return back()->with('success', 'Daily trip updated.');
    }

    public function startJourney(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);

        $data = $request->validate([
            'routeId' => ['required', 'integer'],
            'vehicleId' => ['required', 'integer'],
            'shift' => ['required', Rule::in(['morning', 'afternoon', 'evening'])],
            'direction' => ['required', Rule::in(['pickup', 'drop'])],
            'destinationPoint' => ['nullable', 'string', 'max:255'],
            'supervisor' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
        ]);

        $route = TransportRoute::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($data['routeId']);

        $vehicle = TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($data['vehicleId']);

        $trip = DailyTrip::query()->create([
            'academic_year_id' => $academicYearId,
            'route_id' => $route->id,
            'vehicle_id' => $vehicle->id,
            'driver_user_id' => Auth::id(),
            'shift' => $data['shift'],
            'journey_date' => now()->toDateString(),
            'direction' => $data['direction'],
            'pickup_points' => implode(',', $data['direction'] === 'drop' ? array_reverse($this->normalizeRouteStops($route->stops)) : $this->normalizeRouteStops($route->stops)),
            'current_location' => 'Journey started',
            'destination_point' => $data['destinationPoint'] ?? null,
            'departure_time' => now()->format('H:i'),
            'started_at' => now(),
            'supervisor' => $data['supervisor'] ?? null,
            'trip_status' => 'running',
            'note' => $data['note'] ?? null,
            'stop_updates' => [],
        ]);

        $this->sendStudentStopFcmNotifications($trip->fresh(['route']), null);

        return redirect()->route('transport-management')->with('success', 'Journey started successfully.');
    }

    public function updateReachedStop(Request $request, DailyTrip $dailyTrip): RedirectResponse
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);

        abort_unless((int) $dailyTrip->academic_year_id === $academicYearId, 403);
        abort_unless($dailyTrip->route && (int) $dailyTrip->route->organization_id === $organization->id, 403);
        $this->authorizeDailyTripDriver($dailyTrip);

        $data = $request->validate([
            'stop' => ['required', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $updates = $dailyTrip->stop_updates ?? [];
        $updates[] = [
            'stop' => $data['stop'],
            'note' => $data['note'] ?? null,
            'reached_at' => now()->format('Y-m-d H:i:s'),
            'updated_by' => Auth::user()?->name,
        ];

        $dailyTrip->update([
            'current_stop' => $data['stop'],
            'current_location' => $data['stop'],
            'trip_status' => 'running',
            'stop_updates' => $updates,
        ]);

        $freshTrip = $dailyTrip->fresh(['route']);
        $parentNotificationResult = $this->notifyParentsForReachedStop($organization, $freshTrip, $data['stop']);
        $fcmResult = $this->sendStudentStopFcmNotifications($freshTrip, $data['stop']);
        $fcmSuccessCount = (int) ($fcmResult['successCount'] ?? 0);
        $parentMessageCount = (int) ($parentNotificationResult['messageCount'] ?? 0);
        $parentPushCount = (int) ($parentNotificationResult['pushCount'] ?? 0);

        return redirect()->route('transport-management')->with(
            'success',
            $parentMessageCount > 0 || $parentPushCount > 0 || $fcmSuccessCount > 0
                ? "Reached stop updated. {$parentMessageCount} parent message(s), {$parentPushCount} parent push notification(s), and {$fcmSuccessCount} student push notification(s) sent."
                : 'Reached stop updated. No matching parent or student devices were found.'
        );
    }

    public function endJourney(DailyTrip $dailyTrip): RedirectResponse
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);

        abort_unless((int) $dailyTrip->academic_year_id === $academicYearId, 403);
        abort_unless($dailyTrip->route && (int) $dailyTrip->route->organization_id === $organization->id, 403);
        $this->authorizeDailyTripDriver($dailyTrip);

        $dailyTrip->update([
            'trip_status' => 'completed',
            'ended_at' => now(),
        ]);

        return redirect()->route('transport-management')->with('success', 'Journey ended successfully.');
    }

    public function deleteTrip($id)
    {
        $organization = $this->requireOrganization();
        $academicYearId = $this->requireActiveAcademicYearId($organization);
        $trip = DailyTrip::query()
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($id);

        $trip->delete();

        return back()->with('success', 'Daily trip removed.');
    }

    private function notifyParentsForReachedStop(Organization $organization, DailyTrip $trip, string $stop): array
    {
        $stopColumn = $trip->direction === 'drop' ? 'drop_point' : 'pickup_point';

        $assignments = TransportAssignment::query()
            ->where('route_id', $trip->route_id)
            ->where('status', 'active')
            ->where($stopColumn, $stop)
            ->with('student')
            ->get();

        $emails = $assignments
            ->flatMap(function (TransportAssignment $assignment) {
                $student = $assignment->student;

                if (! $student) {
                    return [];
                }

                return [
                    $student->father_email,
                    $student->mother_email,
                    $student->guardian_email,
                ];
            })
            ->filter()
            ->map(fn ($email) => strtolower(trim((string) $email)))
            ->unique()
            ->values();
        $phones = $assignments
            ->flatMap(function (TransportAssignment $assignment) {
                $student = $assignment->student;

                if (! $student) {
                    return [];
                }

                return [
                    $student->father_phone,
                    $student->mother_phone,
                    $student->guardian_phone,
                ];
            })
            ->filter()
            ->map(fn ($phone) => preg_replace('/\D+/', '', (string) $phone))
            ->filter()
            ->unique()
            ->values();

        if ($emails->isEmpty() && $phones->isEmpty()) {
            return ['messageCount' => 0, 'pushCount' => 0];
        }

        $parents = User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'parent')
            ->where(function ($query) use ($emails, $phones) {
                if ($emails->isNotEmpty()) {
                    $query->whereIn(DB::raw('LOWER(email)'), $emails->all());
                }

                if ($phones->isNotEmpty()) {
                    $phoneExpression = DB::raw("REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '')");
                    $method = $emails->isNotEmpty() ? 'orWhereIn' : 'whereIn';
                    $query->{$method}($phoneExpression, $phones->all());
                }
            })
            ->get(['id', 'email']);

        if ($parents->isEmpty()) {
            return ['messageCount' => 0, 'pushCount' => 0];
        }

        $routeName = $trip->route?->route_name ?? 'Transport route';
        $title = "Bus reached {$stop}";
        $body = "{$routeName} bus has reached {$stop} at " . now()->format('h:i A') . '.';
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
            'type' => 'transport_stop_update',
            'title' => $title,
            'message' => $body,
            'data' => json_encode([
                'trip_id' => (string) $trip->id,
                'route_id' => (string) $trip->route_id,
                'stop' => $stop,
                'direction' => (string) ($trip->direction ?? 'pickup'),
            ]),
            'link' => '/communication',
            'is_read' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all());

        $pushResult = $this->firebaseCloudMessagingService->sendToUsers(
            $parents->pluck('id'),
            $title,
            $body,
            [
                'type' => 'transport_stop_update',
                'trip_id' => (string) $trip->id,
                'route_id' => (string) $trip->route_id,
                'stop' => $stop,
                'direction' => (string) ($trip->direction ?? 'pickup'),
                'recipient' => 'parent',
            ],
        );

        return [
            'messageCount' => $parents->count(),
            'pushCount' => (int) ($pushResult['successCount'] ?? 0),
        ];
    }

    private function sendStudentStopFcmNotifications(DailyTrip $trip, ?string $reachedStop): array
    {
        $route = $trip->route;

        if (! $route) {
            return ['successCount' => 0, 'failureCount' => 0, 'attemptedCount' => 0];
        }

        $stops = $this->normalizeRouteStops($route->stops);
        $direction = $trip->direction === 'drop' ? 'drop' : 'pickup';
        $stopColumn = $direction === 'drop' ? 'drop_point' : 'pickup_point';
        $results = [];

        if ($reachedStop) {
            $currentTitle = $direction === 'drop' ? 'Bus reached your drop stop' : 'Bus reached your pickup stop';
            $currentBody = $direction === 'drop'
                ? "The bus has reached {$reachedStop}. Your child has been dropped."
                : "The bus has reached {$reachedStop}. Your child has been picked up.";

            $results[] = $this->sendStopFcmToStudents($trip, $stopColumn, $reachedStop, $currentTitle, $currentBody, $direction === 'drop' ? 'dropped' : 'picked');
        }

        $nextStop = $this->resolveNextStop($stops, $reachedStop);

        if ($nextStop) {
            $nextTitle = $direction === 'drop' ? 'Bus is approaching drop stop' : 'Bus is approaching pickup stop';
            $nextBody = $direction === 'drop'
                ? "The bus is approaching {$nextStop}. Please be ready for drop."
                : "The bus is approaching {$nextStop}. Please be ready for pickup.";

            $results[] = $this->sendStopFcmToStudents($trip, $stopColumn, $nextStop, $nextTitle, $nextBody, $direction === 'drop' ? 'to_be_dropped' : 'to_be_picked');
        }

        return [
            'attemptedCount' => collect($results)->sum(fn (array $result) => (int) ($result['attemptedCount'] ?? 0)),
            'successCount' => collect($results)->sum(fn (array $result) => (int) ($result['successCount'] ?? 0)),
            'failureCount' => collect($results)->sum(fn (array $result) => (int) ($result['failureCount'] ?? 0)),
        ];
    }

    private function sendStopFcmToStudents(DailyTrip $trip, string $stopColumn, string $stop, string $title, string $body, string $stage): array
    {
        $studentUserIds = TransportAssignment::query()
            ->where('route_id', $trip->route_id)
            ->where('status', 'active')
            ->where($stopColumn, $stop)
            ->whereHas('student', fn ($query) => $query->whereNotNull('user_id'))
            ->with('student:id,user_id')
            ->get()
            ->pluck('student.user_id')
            ->filter()
            ->unique()
            ->values();

        if ($studentUserIds->isEmpty()) {
            return ['successCount' => 0, 'failureCount' => 0, 'attemptedCount' => 0];
        }

        return $this->firebaseCloudMessagingService->sendToUsers(
            $studentUserIds,
            $title,
            $body,
            [
                'type' => 'transport_stop_update',
                'trip_id' => (string) $trip->id,
                'route_id' => (string) $trip->route_id,
                'stop' => $stop,
                'stage' => $stage,
                'direction' => (string) ($trip->direction ?? 'pickup'),
            ],
        );
    }

    private function resolveNextStop(array $stops, ?string $reachedStop): ?string
    {
        if ($stops === []) {
            return null;
        }

        if (! $reachedStop) {
            return $stops[0] ?? null;
        }

        $index = array_search($reachedStop, $stops, true);

        if ($index === false) {
            return null;
        }

        return $stops[$index + 1] ?? null;
    }

    private function scopeRouteToDriver($query, User $user)
    {
        $driverVehicleNumbers = TransportVehicle::query()
            ->where('organization_id', $user->organization_id)
            ->tap(fn ($vehicleQuery) => $this->scopeVehicleToDriver($vehicleQuery, $user))
            ->pluck('vehicle_number')
            ->filter()
            ->all();

        return $query->where(function ($driverQuery) use ($user) {
            $driverQuery->where('driver_name', $user->name);

            if ($user->phone) {
                $driverQuery->orWhere('driver_phone', $user->phone);
            }
        })->when($driverVehicleNumbers !== [], fn ($driverQuery) => $driverQuery->orWhereIn('vehicle_number', $driverVehicleNumbers));
    }

    private function scopeVehicleToDriver($query, User $user)
    {
        return $query->where(function ($driverQuery) use ($user) {
            $driverQuery
                ->where('driver_id', $user->id)
                ->orWhere('driver_name', $user->name)
                ->orWhere('assigned_driver', $user->name);

            if ($user->phone) {
                $driverQuery->orWhere('driver_phone', $user->phone);
            }
        });
    }

    private function authorizeDriverJourneySelection(TransportRoute $route, TransportVehicle $vehicle): void
    {
        $user = Auth::user();

        if ($user?->role !== 'driver') {
            return;
        }

        abort_unless(
            $this->driverMatchesRoute($user, $route) || $this->driverMatchesVehicle($user, $vehicle),
            403
        );
    }

    private function authorizeDailyTripDriver(DailyTrip $trip): void
    {
        $user = Auth::user();

        if ($user?->role !== 'driver') {
            return;
        }

        abort_unless((int) $trip->driver_user_id === (int) $user->id, 403);
    }

    private function driverMatchesRoute(User $user, TransportRoute $route): bool
    {
        return $this->driverTextMatches($user, $route->driver_name, $route->driver_phone);
    }

    private function driverMatchesVehicle(User $user, TransportVehicle $vehicle): bool
    {
        if ((int) $vehicle->driver_id === (int) $user->id) {
            return true;
        }

        return $this->driverTextMatches($user, $vehicle->assigned_driver ?: $vehicle->driver_name, $vehicle->driver_phone);
    }

    private function driverTextMatches(User $user, ?string $name, ?string $phone): bool
    {
        $nameMatches = $name && strcasecmp(trim($name), trim($user->name)) === 0;
        $phoneMatches = $phone && $user->phone && preg_replace('/\D+/', '', $phone) === preg_replace('/\D+/', '', $user->phone);

        return $nameMatches || $phoneMatches;
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

    private function syncOrganizationTransportFees(Organization $organization, ?int $academicYearId = null): void
    {
        $academicYearId ??= $this->getActiveAcademicYearId($organization);

        if (! $academicYearId) {
            return;
        }

        $transportAssignments = TransportAssignment::query()
            ->with(['student.schoolClass', 'route', 'vehicle'])
            ->where('status', 'active')
            ->where('academic_year_id', $academicYearId)
            ->whereHas('student', fn ($query) => $query->where('organization_id', $organization->id))
            ->get();

        foreach ($transportAssignments as $assignment) {
            $this->syncTransportFeeForAssignment($assignment, $academicYearId);
        }
    }

    private function syncTransportFeeForAssignment(TransportAssignment $assignment, ?int $academicYearId = null): void
    {
        $student = $assignment->student;
        $route = $assignment->route;

        if (!$student || !$route || !$student->organization_id || !$student->class_id || $assignment->status !== 'active') {
            return;
        }

        $organization = Organization::query()->find($student->organization_id);
        if (!$organization) {
            return;
        }

        $academicYearId ??= $assignment->academic_year_id ?: $this->getActiveAcademicYearId($organization);
        if (!$academicYearId) {
            return;
        }

        if ($assignment->academic_year_id && (int) $assignment->academic_year_id !== (int) $academicYearId) {
            return;
        }

        $academicYear = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->find($academicYearId);

        if (!$academicYear) {
            return;
        }

        $feeStructure = $this->ensureTransportFeeStructure($organization, $academicYearId, $student, $route, $assignment);
        $monthlyAmount = (float) ($assignment->monthly_fee ?: $route->monthly_fee ?: $route->fare ?: 0);

        $periodStart = Carbon::parse($academicYear->start_date)->startOfMonth();
        $assignmentStart = Carbon::parse($assignment->created_at ?? now())->startOfMonth();
        $cursor = $assignmentStart->greaterThan($periodStart) ? $assignmentStart->copy() : $periodStart->copy();
        $periodEnd = Carbon::parse($academicYear->end_date)->startOfMonth();

        while ($cursor->lte($periodEnd)) {
            $monthName = $cursor->format('F');
            $dueDate = $this->determineTransportDueDate($cursor, $academicYear);

            $studentFee = StudentFee::query()->firstOrNew([
                'organization_id' => $organization->id,
                'student_id' => $student->id,
                'fee_structure_id' => $feeStructure->id,
                'transport_assignment_id' => $assignment->id,
                'academic_year_id' => $academicYearId,
                'month' => $monthName,
                'year' => (int) $cursor->format('Y'),
            ]);

            $discount = (float) ($studentFee->discount ?? 0);
            $fine = (float) ($studentFee->fine ?? 0);
            $paidAmount = (float) ($studentFee->paid_amount ?? 0);
            $netAmount = max(0, $monthlyAmount - $discount + $fine);
            $balance = max(0, $netAmount - $paidAmount);

            $studentFee->fill([
                'amount' => $monthlyAmount,
                'discount' => $discount,
                'fine' => $fine,
                'net_amount' => $netAmount,
                'paid_amount' => $paidAmount,
                'balance' => $balance,
                'due_date' => $dueDate->toDateString(),
                'status' => $studentFee->status === 'waived'
                    ? 'waived'
                    : $this->determineFeeStatus($balance, $dueDate, $paidAmount),
                'notes' => sprintf(
                    'Auto-synced monthly transport fee for route %s and stop %s.',
                    $route->route_name,
                    $assignment->pickup_point
                ),
            ]);
            $studentFee->save();

            $cursor->addMonthNoOverflow();
        }
    }

    private function ensureTransportFeeStructure(Organization $organization, int $academicYearId, Student $student, TransportRoute $route, TransportAssignment $assignment): FeeStructure
    {
        $stopLabel = $assignment->pickup_point ?: 'Assigned Stop';
        $feeType = sprintf('%s%s / %s', self::TRANSPORT_FEE_PREFIX, $route->route_name, $stopLabel);
        $amount = (float) ($assignment->monthly_fee ?: $route->monthly_fee ?: $route->fare ?: 0);

        $feeStructure = FeeStructure::query()->firstOrNew([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'class_id' => $student->class_id,
            'fee_type' => $feeType,
        ]);

        $feeStructure->fill([
            'amount' => $amount,
            'frequency' => 'monthly',
            'description' => sprintf('Auto-synced monthly transport fee for route %s (%s).', $route->route_name, $stopLabel),
            'is_compulsory' => true,
            'status' => 'active',
        ]);
        $feeStructure->save();

        return $feeStructure;
    }

    private function getTransportFeeRecords(Organization $organization, ?int $academicYearId = null): array
    {
        return StudentFee::query()
            ->where('organization_id', $organization->id)
            ->whereNotNull('transport_assignment_id')
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId))
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'like', self::TRANSPORT_FEE_PREFIX . '%'))
            ->with([
                'student.schoolClass:id,name,section',
                'feeStructure:id,fee_type',
                'transportAssignment.route:id,route_name',
                'transportAssignment.vehicle:id,vehicle_number',
                'payments' => fn ($query) => $query->with('collector:id,name')->orderByDesc('payment_date')->orderByDesc('id'),
            ])
            ->orderBy('year')
            ->orderByRaw("FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')")
            ->orderBy('student_id')
            ->get()
            ->map(function (StudentFee $fee) {
                $latestActivePayment = $fee->payments->firstWhere('status', 'success');
                $assignment = $fee->transportAssignment;
                $route = $assignment?->route;
                $vehicle = $assignment?->vehicle;

                return [
                    'id' => (string) $fee->id,
                    'studentId' => (string) $fee->student_id,
                    'studentName' => trim(($fee->student?->first_name ?? '') . ' ' . ($fee->student?->last_name ?? '')),
                    'admissionNumber' => $fee->student?->admission_no ?? '',
                    'class' => $fee->student?->schoolClass?->name ?? '',
                    'section' => $fee->student?->schoolClass?->section ?? '',
                    'routeName' => $route?->route_name ?? '',
                    'pickupStop' => $assignment?->pickup_point ?? '',
                    'vehicleNumber' => $vehicle?->vehicle_number ?? '',
                    'month' => $fee->month ?? '',
                    'year' => (int) $fee->year,
                    'feeType' => $fee->feeStructure?->fee_type ?? '',
                    'amount' => (float) $fee->amount,
                    'paidAmount' => (float) $fee->paid_amount,
                    'dueAmount' => (float) $fee->balance,
                    'status' => $fee->status,
                    'dueDate' => optional($fee->due_date)->format('Y-m-d'),
                    'latestPaymentId' => $latestActivePayment ? (string) $latestActivePayment->id : null,
                    'latestPaymentAmount' => $latestActivePayment ? (float) $latestActivePayment->amount : null,
                    'latestPaymentDate' => $latestActivePayment?->payment_date?->format('Y-m-d'),
                    'latestPaymentMethod' => $latestActivePayment?->payment_method,
                    'latestTransactionId' => $latestActivePayment?->transaction_id,
                    'latestReceiptNumber' => $latestActivePayment?->receipt_number,
                    'latestBatchReference' => $latestActivePayment?->batch_reference,
                    'latestCollectedBy' => $latestActivePayment?->collector?->name,
                    'payments' => $fee->payments->map(fn (FeePayment $payment) => [
                        'id' => (string) $payment->id,
                        'amount' => (float) $payment->amount,
                        'paymentDate' => $payment->payment_date?->format('Y-m-d'),
                        'paymentMethod' => $payment->payment_method,
                        'transactionId' => $payment->transaction_id,
                        'receiptNumber' => $payment->receipt_number,
                        'batchReference' => $payment->batch_reference,
                        'collectedBy' => $payment->collector?->name,
                        'status' => $payment->status,
                        'revertedAt' => $payment->reverted_at?->format('Y-m-d'),
                        'revertReason' => $payment->revert_reason,
                    ])->values()->all(),
                ];
            })
            ->all();
    }

    private function getTransportFeeClassRecords(Organization $organization, ?int $academicYearId = null): array
    {
        return Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->whereHas('schoolClass', fn ($query) => $query->when($academicYearId, fn ($classQuery) => $classQuery->where('academic_year_id', $academicYearId)))
            ->with('schoolClass:id,name,section')
            ->get()
            ->map(fn (Student $student) => [
                'id' => $student->class_id,
                'name' => $student->schoolClass?->name ?? '',
                'section' => $student->schoolClass?->section ?? '',
            ])
            ->unique(fn (array $record) => $record['name'] . '|' . $record['section'])
            ->values()
            ->all();
    }

    private function syncStudentTransportDetails(Student $student, ?TransportAssignment $assignment): void
    {
        $student->update([
            'transport_required' => (bool) $assignment,
            'transport_pickup_point' => $assignment?->pickup_point,
            'transport_vehicle' => $assignment?->vehicle?->vehicle_number ?? '',
            'transport_route' => $assignment?->route?->route_name ?? '',
            'transport_route_details' => $assignment && $assignment->route
                ? trim($assignment->route->route_name . ($assignment->pickup_point ? ' / ' . $assignment->pickup_point : ''))
                : '',
        ]);
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

    private function determineTransportDueDate(Carbon $month, AcademicYear $academicYear): Carbon
    {
        $sessionStart = Carbon::parse($academicYear->start_date)->startOfDay();
        $defaultDueDate = $month->copy()->startOfMonth();

        return $defaultDueDate->format('Y-m') === $sessionStart->format('Y-m')
            ? $sessionStart
            : $defaultDueDate;
    }

    private function determineFeeStatus(float $balance, Carbon|string|null $dueDate, float $paidAmount): string
    {
        if ($balance <= 0) {
            return 'paid';
        }

        if ($paidAmount > 0) {
            return 'partial';
        }

        if ($dueDate && Carbon::parse($dueDate)->isPast()) {
            return 'overdue';
        }

        return 'pending';
    }

    private function getActiveAcademicYearId(Organization $organization): ?int
    {
        return $organization->selectedAcademicYear()?->id;
    }

    private function requireActiveAcademicYearId(Organization $organization): int
    {
        $academicYearId = $this->getActiveAcademicYearId($organization);

        abort_unless($academicYearId, 422, 'Create and activate an academic session before managing transport data.');

        return $academicYearId;
    }

    private function getAcademicSessions(Organization $organization): array
    {
        return AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get(['id', 'name', 'is_current'])
            ->map(fn (AcademicYear $session) => [
                'id' => (string) $session->id,
                'name' => $session->name,
                'isCurrent' => (bool) $session->is_current,
            ])
            ->all();
    }

    private function resolveSelectedAcademicYear(Organization $organization, mixed $selectedSession): ?AcademicYear
    {
        $query = AcademicYear::query()->where('organization_id', $organization->id);

        if ($selectedSession) {
            return (clone $query)->find($selectedSession) ?: $organization->selectedAcademicYear();
        }

        return $organization->selectedAcademicYear();
    }

    private function requireOrganization(): Organization
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());

        abort_unless($organization, 403, 'Organization not found for authenticated user.');

        return $organization;
    }

    private function generateReceiptNumber(): string
    {
        do {
            $receipt = 'RCT-' . now()->format('Ymd') . '-' . random_int(1000, 9999);
        } while (FeePayment::query()->where('receipt_number', $receipt)->exists());

        return $receipt;
    }

    private function generateBatchReference(): string
    {
        do {
            $reference = 'TRN-BATCH-' . now()->format('Ymd') . '-' . random_int(1000, 9999);
        } while (FeePayment::query()->where('batch_reference', $reference)->exists());

        return $reference;
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()->where('email', $user->email)->first();

        if (!$organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}
