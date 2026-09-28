<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Student;
use App\Models\TransportAssignment;
use App\Models\TransportVehicle;
use App\Models\TransportVehiclePolicy;
use App\Models\User;
use App\Services\TransportAssignmentService;
use App\Services\TransportPolicyResolver;
use App\Support\TransportPolicyPresets;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DriverBusStudentsController extends Controller
{
    public function __construct(
        private readonly TransportPolicyResolver $policies,
        private readonly TransportAssignmentService $assignments,
    ) {
    }

    public function index(Request $request)
    {
        $actor = $this->requireActor($request);
        $organization = $this->requireOrganization($actor);
        $academicYearId = $organization->selectedAcademicYear()?->id;

        $vehicles = $this->visibleVehicles($actor, $organization);
        $vehicleIds = $vehicles->pluck('id')->all();

        $assignments = TransportAssignment::query()
            ->with(['student.schoolClass', 'route', 'vehicle', 'createdBy'])
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId), fn ($query) => $query->whereRaw('1 = 0'))
            ->when($vehicleIds !== [], fn ($query) => $query->whereIn('vehicle_id', $vehicleIds))
            ->orderByRaw("CASE status WHEN 'active' THEN 1 WHEN 'pending' THEN 2 WHEN 'paused' THEN 3 ELSE 4 END")
            ->orderBy('id')
            ->get()
            ->map(fn (TransportAssignment $assignment) => $this->serializeAssignment($assignment, $actor));

        return inertia('dashboard/DriverBusStudents', [
            'user' => $actor,
            'isDriverView' => $actor->role === 'driver',
            'vehicles' => $vehicles->map(fn (TransportVehicle $vehicle) => [
                'id' => (string) $vehicle->id,
                'vehicleNumber' => $vehicle->vehicle_number,
                'vehicleType' => $vehicle->vehicle_type ?? $vehicle->vehicle_model ?? '',
                'capacity' => (int) $vehicle->capacity,
                'routeName' => $vehicle->route?->route_name ?? '',
                'stops' => $this->stops($vehicle),
                'status' => $vehicle->status,
                'policy' => $this->serializePolicy($vehicle),
                'canManageRoster' => (bool) $this->policies->canManageRoster($actor, $vehicle, 'add')['allowed'],
            ])->values(),
            'assignments' => $assignments,
            'students' => $this->availableStudents($organization, $academicYearId, $request->input('search')),
            'policyOptions' => [
                'busTypes' => TransportPolicyPresets::BUS_TYPES,
                'rosterControls' => TransportPolicyPresets::ROSTER_CONTROLS,
                'boardingControls' => TransportPolicyPresets::BOARDING_CONTROLS,
                'feeLedgers' => TransportPolicyPresets::FEE_LEDGERS,
                'presets' => [
                    'school_owned' => TransportPolicyPresets::schoolOwned(),
                    'private_vendor' => TransportPolicyPresets::privateVendor(),
                ],
            ],
        ]);
    }

    public function updatePolicy(Request $request, $vehicle)
    {
        $actor = $this->requireActor($request);
        $organization = $this->requireOrganization($actor);

        $target = TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->findOrFail($vehicle);

        abort_unless(
            $actor->role === 'driver'
                ? $this->policies->driverOwnsVehicle($actor, $target)
                : in_array($actor->role, ['admin', 'super_admin', 'transport_manager'], true),
            403,
            'You can only change the policy of your own bus.'
        );

        $isVendor = $request->input('busType') === 'private_vendor';

        $data = $request->validate([
            'busType' => ['required', Rule::in(TransportPolicyPresets::BUS_TYPES)],
            'rosterControl' => ['required', Rule::in(TransportPolicyPresets::ROSTER_CONTROLS)],
            'boardingControl' => ['required', Rule::in(TransportPolicyPresets::BOARDING_CONTROLS)],
            'requiresRosterApproval' => ['nullable', 'boolean'],
            'requiresFeeApproval' => ['nullable', 'boolean'],
            'feeLedger' => ['required', Rule::in(TransportPolicyPresets::FEE_LEDGERS)],
            'vendorName' => [$isVendor ? 'required' : 'nullable', 'string', 'max:255'],
            'vendorContractNo' => ['nullable', 'string', 'max:255'],
            'vendorValidFrom' => ['nullable', 'date'],
            'vendorValidTill' => ['nullable', 'date', 'after_or_equal:vendorValidFrom'],
            'vendorContact' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        TransportVehiclePolicy::query()->updateOrCreate(
            ['vehicle_id' => $target->id],
            [
                'organization_id' => $organization->id,
                'academic_year_id' => $organization->selectedAcademicYear()?->id,
                'bus_type' => $data['busType'],
                'roster_control' => $data['rosterControl'],
                'boarding_control' => $data['boardingControl'],
                'requires_roster_approval' => (bool) ($data['requiresRosterApproval'] ?? false),
                'requires_fee_approval' => (bool) ($data['requiresFeeApproval'] ?? false),
                'fee_ledger' => $data['feeLedger'],
                'vendor_name' => $data['vendorName'] ?? null,
                'vendor_contract_no' => $data['vendorContractNo'] ?? null,
                'vendor_valid_from' => $data['vendorValidFrom'] ?? null,
                'vendor_valid_till' => $data['vendorValidTill'] ?? null,
                'vendor_contact' => $data['vendorContact'] ?? null,
                'notes' => $data['notes'] ?? null,
            ],
        );

        return back()->with('success', 'Bus policy updated.');
    }

    public function storeAssignment(Request $request)
    {
        $actor = $this->requireActor($request);
        $organization = $this->requireOrganization($actor);
        $academicYearId = $organization->selectedAcademicYear()?->id;

        abort_unless($academicYearId, 422, 'Create and activate an academic session before assigning students.');

        $data = $request->validate([
            'vehicleId' => ['required', 'integer'],
            'routeId' => ['required', 'integer'],
            'studentId' => ['required', 'integer'],
            'pickupStop' => ['required', 'string', 'max:255'],
            'dropStop' => ['nullable', 'string', 'max:255'],
            'pickupTime' => ['nullable', 'date_format:H:i'],
            'dropTime' => ['nullable', 'date_format:H:i'],
            'monthlyFee' => ['nullable', 'numeric', 'min:0'],
        ]);

        try {
            $assignment = $this->assignments->create($actor, $organization, $academicYearId, [
                'studentId' => $data['studentId'],
                'routeId' => $data['routeId'],
                'vehicleId' => $data['vehicleId'],
                'pickupStop' => $data['pickupStop'],
                'dropStop' => $data['dropStop'] ?? null,
                'pickupTime' => $data['pickupTime'] ?? null,
                'dropTime' => $data['dropTime'] ?? null,
                'monthlyFee' => $data['monthlyFee'] ?? 0,
                'status' => 'active',
            ]);
        } catch (ValidationException $exception) {
            return back()->withErrors($exception->errors());
        }

        return back()->with('success', $assignment->isPending()
            ? 'Student submitted for manager approval. They will join the bus once approved.'
            : 'Student added to your bus.');
    }

    public function destroyAssignment(Request $Request, $id)
    {
        $driver = $this->requireActor($Request);
        $organization = $this->requireOrganization($driver);

        $assignment = TransportAssignment::query()
            ->with(['student', 'route', 'vehicle.policy'])
            ->whereHas('student', fn ($query) => $query->where('organization_id', $organization->id))
            ->findOrFail($id);

        $vehicle = $assignment->vehicle;
        abort_unless(
            $vehicle && $this->policies->canManageRoster($driver, $vehicle, 'delete')['allowed'],
            403,
            'You can only remove students from your own bus.'
        );

        try {
            $this->assignments->delete($driver, $assignment);
        } catch (ValidationException $exception) {
            return back()->withErrors($exception->errors());
        }

        return back()->with('success', 'Student removed from your bus.');
    }

    private function availableStudents(Organization $organization, ?int $academicYearId, ?string $search): array
    {
        return Student::query()
            ->where('organization_id', $organization->id)
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
                'admissionNo' => $student->admission_no,
                'class' => $student->schoolClass?->name ?? '',
                'section' => $student->schoolClass?->section ?? '',
            ])
            ->values()
            ->all();
    }

    private function serializeAssignment(TransportAssignment $assignment, User $driver): array
    {
        $vehicle = $assignment->vehicle;

        return [
            'id' => (string) $assignment->id,
            'studentId' => (string) $assignment->student_id,
            'studentName' => trim(($assignment->student?->first_name ?? '') . ' ' . ($assignment->student?->last_name ?? '')),
            'admissionNo' => $assignment->student?->admission_no ?? '',
            'className' => $assignment->student?->schoolClass?->name ?? '',
            'section' => $assignment->student?->schoolClass?->section ?? '',
            'vehicleId' => $assignment->vehicle_id ? (string) $assignment->vehicle_id : '',
            'vehicleNumber' => $vehicle?->vehicle_number ?? '',
            'routeId' => (string) $assignment->route_id,
            'routeName' => $assignment->route?->route_name ?? '',
            'pickupStop' => $assignment->pickup_point ?? '',
            'dropStop' => $assignment->drop_point ?? '',
            'pickupTime' => $assignment->pickup_time ? \Carbon\Carbon::parse($assignment->pickup_time)->format('H:i') : '',
            'dropTime' => $assignment->drop_time ? \Carbon\Carbon::parse($assignment->drop_time)->format('H:i') : '',
            'monthlyFee' => (float) ($assignment->monthly_fee ?? 0),
            'status' => $assignment->status,
            'isPending' => $assignment->isPending(),
            'createdBy' => $assignment->createdBy?->name ?? '',
            'decisionNote' => $assignment->decision_note ?? '',
            'feeLedger' => $vehicle?->effectivePolicy()['fee_ledger'] ?? 'school',
            'canRevoke' => (bool) ($vehicle && $this->policies->canManageRoster($driver, $vehicle, 'delete')['allowed']),
        ];
    }

    private function serializePolicy(TransportVehicle $vehicle): array
    {
        $policy = $vehicle->effectivePolicy();

        return [
            'busType' => $policy['bus_type'],
            'rosterControl' => $policy['roster_control'],
            'boardingControl' => $policy['boarding_control'],
            'requiresRosterApproval' => $policy['requires_roster_approval'],
            'requiresFeeApproval' => $policy['requires_fee_approval'],
            'feeLedger' => $policy['fee_ledger'],
            'vendorName' => $policy['vendor_name'] ?? '',
            'vendorContractNo' => $policy['vendor_contract_no'] ?? '',
            'vendorValidFrom' => $policy['vendor_valid_from'] ?? '',
            'vendorValidTill' => $policy['vendor_valid_till'] ?? '',
            'vendorContact' => $policy['vendor_contact'] ?? '',
            'notes' => $policy['notes'] ?? '',
            'inherited' => $policy['inherited'],
        ];
    }

    private function stops(TransportVehicle $vehicle): array
    {
        $stops = $vehicle->route?->stops ?? [];

        if (is_string($stops)) {
            $stops = json_decode($stops, true) ?: [];
        }

        return collect(is_array($stops) ? $stops : [])
            ->map(fn ($stop) => is_array($stop) ? ($stop['name'] ?? $stop['stop'] ?? '') : (string) $stop)
            ->filter()
            ->values()
            ->all();
    }

    /**
     * Drivers see their own buses; the transport office and system admins see
     * the whole fleet and may force any policy.
     */
    private function requireActor(Request $request): User
    {
        $user = $request->user();

        abort_unless(
            $user && in_array($user->role, ['driver', 'transport_manager', 'admin', 'super_admin'], true),
            403,
            'Driver or transport office access only.'
        );

        return $user;
    }

    private function visibleVehicles(User $actor, Organization $organization): \Illuminate\Support\Collection
    {
        if ($actor->role === 'driver') {
            return $this->policies->vehiclesForDriver($actor, $organization);
        }

        return TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->with(['policy', 'route'])
            ->orderBy('vehicle_number')
            ->get();
    }

    private function requireOrganization(User $driver): Organization
    {
        $organization = $driver->organization_id ? Organization::query()->find($driver->organization_id) : null;

        abort_unless($organization, 403, 'No organization is linked to this driver.');

        return $organization;
    }
}
