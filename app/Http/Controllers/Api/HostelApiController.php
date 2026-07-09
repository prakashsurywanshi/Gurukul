<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\FeePayment;
use App\Models\FeeStructure;
use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelBed;
use App\Models\HostelFeeStructure;
use App\Models\HostelRoom;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class HostelApiController extends Controller
{
    public function getOverview(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $hostels = Hostel::where('organization_id', $organization->id)->get();
        $rooms = HostelRoom::whereHas('hostel', fn ($q) => $q->where('organization_id', $organization->id))->get();
        $beds = HostelBed::whereHas('hostel', fn ($q) => $q->where('organization_id', $organization->id))->get();
        $feeStructures = HostelFeeStructure::where('organization_id', $organization->id)->get();

        return response()->json([
            'success' => true,
            'data' => [
                'hostel_count' => $hostels->count(),
                'room_count' => $rooms->count(),
                'bed_count' => $beds->count(),
                'fee_structure_count' => $feeStructures->count(),
                'total_capacity' => $rooms->sum('capacity'),
                'total_occupied' => $rooms->sum('occupied'),
                'total_available' => $beds->where('status', 'available')->count(),
            ],
        ]);
    }

    public function indexHostels(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $hostels = Hostel::where('organization_id', $organization->id)
            ->withCount(['rooms', 'beds'])
            ->orderBy('name')
            ->get()
            ->map(fn (Hostel $hostel) => [
                'id' => $hostel->id,
                'name' => $hostel->name,
                'type' => $hostel->type,
                'type_label' => ucfirst($hostel->type),
                'address' => $hostel->address,
                'warden_name' => $hostel->warden_name ?? '',
                'warden_phone' => $hostel->warden_phone ?? '',
                'total_rooms' => $hostel->rooms_count ?? 0,
                'total_beds' => $hostel->beds_count ?? 0,
                'status' => $hostel->status,
            ]);

        return response()->json([
            'success' => true,
            'data' => $hostels,
        ]);
    }

    public function storeHostel(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['boys', 'girls', 'mixed'])],
            'address' => ['required', 'string'],
            'warden_name' => ['nullable', 'string', 'max:255'],
            'warden_phone' => ['nullable', 'string', 'max:50'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $hostel = Hostel::create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'address' => $validated['address'],
            'warden_name' => $validated['warden_name'] ?? null,
            'warden_phone' => $validated['warden_phone'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Hostel created successfully',
            'data' => $this->serializeHostel($hostel),
        ], 201);
    }

    public function updateHostel(Request $request, Hostel $hostel): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostel->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['boys', 'girls', 'mixed'])],
            'address' => ['required', 'string'],
            'warden_name' => ['nullable', 'string', 'max:255'],
            'warden_phone' => ['nullable', 'string', 'max:50'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $hostel->update([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'address' => $validated['address'],
            'warden_name' => $validated['warden_name'] ?? null,
            'warden_phone' => $validated['warden_phone'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Hostel updated successfully',
            'data' => $this->serializeHostel($hostel),
        ]);
    }

    public function destroyHostel(Hostel $hostel): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostel->organization_id === $organization->id, 403);

        $studentIds = HostelAllocation::where('hostel_id', $hostel->id)
            ->pluck('student_id')
            ->unique();

        DB::transaction(function () use ($hostel, $studentIds) {
            $hostel->delete();
            foreach ($studentIds as $studentId) {
                $student = Student::find($studentId);
                if ($student) {
                    $this->syncStudentHostelRoom($student);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Hostel deleted successfully',
        ]);
    }

    public function indexRooms(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();
        $hostelId = $request->query('hostel_id');

        $query = HostelRoom::query()
            ->whereHas('hostel', fn ($q) => $q->where('organization_id', $organization->id))
            ->with('hostel:id,name');

        if ($hostelId) {
            $query->where('hostel_id', $hostelId);
        }

        $rooms = $query->orderBy('hostel_id')
            ->orderBy('room_number')
            ->get()
            ->map(fn (HostelRoom $room) => [
                'id' => $room->id,
                'hostel_id' => $room->hostel_id,
                'hostel_name' => $room->hostel?->name ?? '',
                'room_number' => $room->room_number,
                'floor' => $room->floor ?? '',
                'room_type' => $room->room_type,
                'room_type_label' => ucfirst($room->room_type),
                'capacity' => (int) $room->capacity,
                'occupied' => (int) $room->occupied,
                'available' => max(0, (int) $room->capacity - (int) $room->occupied),
                'monthly_fee' => (float) $room->monthly_fee,
                'facilities' => $room->facilities ?? [],
                'status' => $room->status,
            ]);

        $hostels = Hostel::where('organization_id', $organization->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Hostel $h) => ['id' => $h->id, 'name' => $h->name]);

        return response()->json([
            'success' => true,
            'data' => $rooms,
            'hostels' => $hostels,
        ]);
    }

    public function storeRoom(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'hostel_id' => ['required', 'integer'],
            'room_number' => ['required', 'string', 'max:255'],
            'floor' => ['nullable', 'string', 'max:255'],
            'room_type' => ['required', Rule::in(['single', 'double', 'triple', 'dormitory'])],
            'capacity' => ['required', 'integer', 'min:1'],
            'monthly_fee' => ['nullable', 'numeric', 'min:0'],
            'facilities' => ['nullable', 'array'],
            'status' => ['required', Rule::in(['available', 'full', 'maintenance'])],
        ]);

        $hostel = Hostel::where('organization_id', $organization->id)->findOrFail($validated['hostel_id']);

        $room = HostelRoom::create([
            'hostel_id' => $hostel->id,
            'room_number' => $validated['room_number'],
            'floor' => $validated['floor'] ?? null,
            'room_type' => $validated['room_type'],
            'capacity' => $validated['capacity'],
            'monthly_fee' => $validated['monthly_fee'] ?? 0,
            'facilities' => $validated['facilities'] ?? null,
            'status' => $validated['status'],
        ]);

        $this->syncHostelRoomCount($hostel);
        $this->syncRoomOccupancy($room->fresh());

        return response()->json([
            'success' => true,
            'message' => 'Room created successfully',
            'data' => $this->serializeRoom($room),
        ], 201);
    }

    public function updateRoom(Request $request, HostelRoom $room): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($room->hostel && $room->hostel->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'hostel_id' => ['required', 'integer'],
            'room_number' => ['required', 'string', 'max:255'],
            'floor' => ['nullable', 'string', 'max:255'],
            'room_type' => ['required', Rule::in(['single', 'double', 'triple', 'dormitory'])],
            'capacity' => ['required', 'integer', 'min:1'],
            'monthly_fee' => ['nullable', 'numeric', 'min:0'],
            'facilities' => ['nullable', 'array'],
            'status' => ['required', Rule::in(['available', 'full', 'maintenance'])],
        ]);

        $hostel = Hostel::where('organization_id', $organization->id)->findOrFail($validated['hostel_id']);
        $previousHostelId = $room->hostel_id;

        $room->update([
            'hostel_id' => $hostel->id,
            'room_number' => $validated['room_number'],
            'floor' => $validated['floor'] ?? null,
            'room_type' => $validated['room_type'],
            'capacity' => $validated['capacity'],
            'monthly_fee' => $validated['monthly_fee'] ?? 0,
            'facilities' => $validated['facilities'] ?? null,
            'status' => $validated['status'],
        ]);

        if ($previousHostelId !== $hostel->id) {
            HostelBed::where('room_id', $room->id)->update(['hostel_id' => $hostel->id]);
            HostelAllocation::where('room_id', $room->id)->update(['hostel_id' => $hostel->id]);
            $previousHostel = Hostel::find($previousHostelId);
            if ($previousHostel) {
                $this->syncHostelRoomCount($previousHostel);
            }
        }

        $this->syncHostelRoomCount($hostel);
        $this->syncRoomOccupancy($room->fresh());

        return response()->json([
            'success' => true,
            'message' => 'Room updated successfully',
            'data' => $this->serializeRoom($room),
        ]);
    }

    public function destroyRoom(HostelRoom $room): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($room->hostel && $room->hostel->organization_id === $organization->id, 403);

        $hostel = $room->hostel;
        $studentIds = HostelAllocation::where('room_id', $room->id)
            ->pluck('student_id')
            ->unique();

        DB::transaction(function () use ($room, $hostel, $studentIds) {
            $room->delete();
            $this->syncHostelRoomCount($hostel);
            foreach ($studentIds as $studentId) {
                $student = Student::find($studentId);
                if ($student) {
                    $this->syncStudentHostelRoom($student);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Room deleted successfully',
        ]);
    }

    public function indexBeds(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();
        $hostelId = $request->query('hostel_id');
        $roomId = $request->query('room_id');

        $query = HostelBed::query()
            ->whereHas('hostel', fn ($q) => $q->where('organization_id', $organization->id))
            ->with(['hostel:id,name', 'room:id,room_number,room_type']);

        if ($hostelId) {
            $query->where('hostel_id', $hostelId);
        }
        if ($roomId) {
            $query->where('room_id', $roomId);
        }

        $activeAllocations = HostelAllocation::where('status', 'active')
            ->whereHas('hostel', fn ($q) => $q->where('organization_id', $organization->id))
            ->with('student:id,first_name,last_name,roll_number')
            ->get()
            ->keyBy('bed_id');

        $beds = $query->orderBy('hostel_id')
            ->orderBy('room_id')
            ->orderBy('bed_number')
            ->get()
            ->map(function (HostelBed $bed) use ($activeAllocations) {
                $allocation = $activeAllocations->get($bed->id);
                return [
                    'id' => $bed->id,
                    'hostel_id' => $bed->hostel_id,
                    'hostel_name' => $bed->hostel?->name ?? '',
                    'room_id' => $bed->room_id,
                    'room_number' => $bed->room?->room_number ?? '',
                    'room_type' => $bed->room?->room_type ?? '',
                    'bed_number' => $bed->bed_number,
                    'status' => $bed->status,
                    'assigned_student_id' => $allocation ? $allocation->student_id : null,
                    'assigned_student_name' => $allocation ? trim(($allocation->student?->first_name ?? '') . ' ' . ($allocation->student?->last_name ?? '')) : null,
                    'assigned_student_roll' => $allocation ? ($allocation->student?->roll_number ?? '') : null,
                ];
            });

        $hostels = Hostel::where('organization_id', $organization->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Hostel $h) => ['id' => $h->id, 'name' => $h->name]);

        $rooms = HostelRoom::whereHas('hostel', fn ($q) => $q->where('organization_id', $organization->id))
            ->orderBy('hostel_id')
            ->orderBy('room_number')
            ->get(['id', 'hostel_id', 'room_number', 'room_type', 'capacity']);

        return response()->json([
            'success' => true,
            'data' => $beds,
            'hostels' => $hostels,
            'rooms' => $rooms,
        ]);
    }

    public function storeBed(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'hostel_id' => ['required', 'integer'],
            'room_id' => ['required', 'integer'],
            'bed_number' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(['available', 'occupied', 'maintenance'])],
            'assigned_student_id' => ['nullable', 'integer'],
            'remarks' => ['nullable', 'string'],
        ]);

        $hostel = Hostel::where('organization_id', $organization->id)->findOrFail($validated['hostel_id']);
        $room = HostelRoom::where('hostel_id', $hostel->id)->findOrFail($validated['room_id']);

        if (!empty($validated['assigned_student_id'])) {
            Student::where('organization_id', $organization->id)
                ->findOrFail($validated['assigned_student_id']);
        }

        $bed = null;
        DB::transaction(function () use ($validated, $room, &$bed) {
            $existingBedCount = HostelBed::where('room_id', $room->id)->count();
            if ($existingBedCount >= $room->capacity) {
                throw ValidationException::withMessages([
                    'room_id' => 'Room capacity reached. Increase room capacity first.',
                ]);
            }

            $bed = HostelBed::create([
                'hostel_id' => $room->hostel_id,
                'room_id' => $room->id,
                'bed_number' => $validated['bed_number'],
                'status' => $validated['assigned_student_id'] ? 'occupied' : $validated['status'],
            ]);

            $this->syncBedAllocation($bed, $validated['assigned_student_id'] ?? null, $validated['remarks'] ?? null);
        });

        return response()->json([
            'success' => true,
            'message' => 'Bed created successfully',
            'data' => $this->serializeBed($bed),
        ], 201);
    }

    public function updateBed(Request $request, HostelBed $bed): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($bed->hostel && $bed->hostel->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'hostel_id' => ['required', 'integer'],
            'room_id' => ['required', 'integer'],
            'bed_number' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(['available', 'occupied', 'maintenance'])],
            'assigned_student_id' => ['nullable', 'integer'],
            'remarks' => ['nullable', 'string'],
        ]);

        $hostel = Hostel::where('organization_id', $organization->id)->findOrFail($validated['hostel_id']);
        $room = HostelRoom::where('hostel_id', $hostel->id)->findOrFail($validated['room_id']);

        if (!empty($validated['assigned_student_id'])) {
            Student::where('organization_id', $organization->id)
                ->findOrFail($validated['assigned_student_id']);
        }

        DB::transaction(function () use ($validated, $room, $bed) {
            $bed->update([
                'hostel_id' => $room->hostel_id,
                'room_id' => $room->id,
                'bed_number' => $validated['bed_number'],
                'status' => $validated['assigned_student_id'] ? 'occupied' : $validated['status'],
            ]);

            $this->syncBedAllocation($bed->fresh(), $validated['assigned_student_id'] ?? null, $validated['remarks'] ?? null);
        });

        return response()->json([
            'success' => true,
            'message' => 'Bed updated successfully',
            'data' => $this->serializeBed($bed->fresh()),
        ]);
    }

    public function destroyBed(HostelBed $bed): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($bed->hostel && $bed->hostel->organization_id === $organization->id, 403);

        $studentIds = HostelAllocation::where('bed_id', $bed->id)
            ->pluck('student_id')
            ->unique();
        $room = $bed->room;

        DB::transaction(function () use ($bed, $room, $studentIds) {
            $bed->delete();
            if ($room) {
                $this->syncRoomOccupancy($room->fresh());
            }
            foreach ($studentIds as $studentId) {
                $student = Student::find($studentId);
                if ($student) {
                    $this->syncStudentHostelRoom($student);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Bed deleted successfully',
        ]);
    }

    public function indexFeeStructures(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();
        $hostelId = $request->query('hostel_id');

        $query = HostelFeeStructure::where('organization_id', $organization->id)
            ->with('hostel:id,name');

        if ($hostelId) {
            $query->where('hostel_id', $hostelId);
        }

        $structures = $query->orderBy('hostel_id')
            ->orderBy('room_type')
            ->get()
            ->map(fn (HostelFeeStructure $structure) => [
                'id' => $structure->id,
                'hostel_id' => $structure->hostel_id,
                'hostel_name' => $structure->hostel?->name ?? '',
                'room_type' => $structure->room_type,
                'room_type_label' => ucfirst($structure->room_type),
                'amount' => (float) $structure->amount,
                'frequency' => $structure->frequency,
                'frequency_label' => ucfirst($structure->frequency),
                'description' => $structure->description ?? '',
                'status' => $structure->status,
            ]);

        $hostels = Hostel::where('organization_id', $organization->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Hostel $h) => ['id' => $h->id, 'name' => $h->name]);

        return response()->json([
            'success' => true,
            'data' => $structures,
            'hostels' => $hostels,
        ]);
    }

    public function storeFeeStructure(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'hostel_id' => ['required', 'integer'],
            'room_type' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'frequency' => ['required', Rule::in(['monthly', 'quarterly', 'yearly'])],
            'description' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        Hostel::where('organization_id', $organization->id)
            ->findOrFail($validated['hostel_id']);

        $structure = HostelFeeStructure::create([
            'organization_id' => $organization->id,
            'hostel_id' => $validated['hostel_id'],
            'room_type' => $validated['room_type'],
            'amount' => $validated['amount'],
            'frequency' => $validated['frequency'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Fee structure created successfully',
            'data' => $this->serializeFeeStructure($structure),
        ], 201);
    }

    public function updateFeeStructure(Request $request, HostelFeeStructure $structure): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($structure->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'hostel_id' => ['required', 'integer'],
            'room_type' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'frequency' => ['required', Rule::in(['monthly', 'quarterly', 'yearly'])],
            'description' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        Hostel::where('organization_id', $organization->id)
            ->findOrFail($validated['hostel_id']);

        $structure->update([
            'hostel_id' => $validated['hostel_id'],
            'room_type' => $validated['room_type'],
            'amount' => $validated['amount'],
            'frequency' => $validated['frequency'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Fee structure updated successfully',
            'data' => $this->serializeFeeStructure($structure),
        ]);
    }

    public function destroyFeeStructure(HostelFeeStructure $structure): JsonResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($structure->organization_id === $organization->id, 403);

        $structure->delete();

        return response()->json([
            'success' => true,
            'message' => 'Fee structure deleted successfully',
        ]);
    }

    public function getFeeCollection(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();

        $this->syncOrganizationHostelFees($organization);

        $classFilter = $request->query('class');
        $sectionFilter = $request->query('section');
        $statusFilter = $request->query('status');
        $search = $request->query('search');

        $query = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->whereHas('feeStructure', fn ($q) => $q->where('fee_type', 'like', 'Hostel Fee%'))
            ->with([
                'student.schoolClass:id,name,section',
                'feeStructure:id,fee_type',
                'payments' => fn ($q) => $q->with('collector:id,name')->orderByDesc('payment_date')->orderByDesc('id'),
            ]);

        $fees = $query->orderByDesc('due_date')
            ->orderByDesc('id')
            ->get()
            ->map(function (StudentFee $fee) {
                $latestActivePayment = $fee->payments->firstWhere('status', 'success');
                return [
                    'id' => $fee->id,
                    'student_id' => $fee->student_id,
                    'student_name' => trim(($fee->student?->first_name ?? '') . ' ' . ($fee->student?->last_name ?? '')),
                    'admission_number' => $fee->student?->admission_no ?? '',
                    'class' => $fee->student?->schoolClass?->name ?? '',
                    'section' => $fee->student?->schoolClass?->section ?? '',
                    'hostel_room' => $fee->student?->hostel_room ?? '',
                    'fee_type' => $fee->feeStructure?->fee_type ?? 'Hostel Fee',
                    'amount' => (float) $fee->amount,
                    'paid_amount' => (float) $fee->paid_amount,
                    'due_amount' => (float) $fee->balance,
                    'status' => $fee->status,
                    'due_date' => optional($fee->due_date)->format('Y-m-d'),
                    'latest_payment_id' => $latestActivePayment?->id,
                    'latest_payment_amount' => $latestActivePayment ? (float) $latestActivePayment->amount : null,
                    'latest_payment_date' => $latestActivePayment?->payment_date?->format('Y-m-d'),
                    'latest_payment_method' => $latestActivePayment?->payment_method,
                    'latest_transaction_id' => $latestActivePayment?->transaction_id,
                    'latest_receipt_number' => $latestActivePayment?->receipt_number,
                    'latest_collected_by' => $latestActivePayment?->collector?->name,
                    'payments' => $fee->payments->values()->map(fn (FeePayment $p) => [
                        'id' => $p->id,
                        'amount' => (float) $p->amount,
                        'payment_date' => $p->payment_date?->format('Y-m-d'),
                        'payment_method' => $p->payment_method,
                        'transaction_id' => $p->transaction_id,
                        'receipt_number' => $p->receipt_number,
                        'collected_by' => $p->collector?->name,
                        'status' => $p->status === 'refunded' ? 'reverted' : 'active',
                        'reverted_at' => $p->reverted_at?->format('Y-m-d'),
                        'revert_reason' => $p->revert_reason,
                    ])->all(),
                ];
            });

        if ($classFilter && $classFilter !== 'all') {
            $fees = $fees->filter(fn ($f) => $f['class'] === $classFilter);
        }
        if ($sectionFilter && $sectionFilter !== 'all') {
            $fees = $fees->filter(fn ($f) => $f['section'] === $sectionFilter);
        }
        if ($statusFilter && $statusFilter !== 'all') {
            $fees = $fees->filter(fn ($f) => $f['status'] === $statusFilter);
        }
        if ($search) {
            $search = strtolower($search);
            $fees = $fees->filter(fn ($f) =>
                str_contains(strtolower($f['student_name']), $search) ||
                str_contains(strtolower($f['admission_number']), $search) ||
                str_contains(strtolower($f['class']), $search) ||
                str_contains(strtolower($f['section']), $search) ||
                str_contains(strtolower($f['hostel_room']), $search)
            );
        }

        $fees = $fees->values();

        $classRecords = SchoolClass::where('organization_id', $organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $c) => ['id' => $c->id, 'name' => $c->name, 'section' => $c->section]);

        $totalAmount = $fees->sum('amount');
        $totalPaid = $fees->sum('paid_amount');
        $totalBalance = $fees->sum('due_amount');

        return response()->json([
            'success' => true,
            'data' => $fees,
            'class_records' => $classRecords,
            'summary' => [
                'total_amount' => $totalAmount,
                'total_paid' => $totalPaid,
                'total_balance' => $totalBalance,
            ],
        ]);
    }

    public function collectFeePayment(Request $request): JsonResponse
    {
        $organization = $this->requireOrganization();
        $user = Auth::user();

        $validated = $request->validate([
            'fee_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', Rule::in(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'online'])],
            'transaction_id' => ['nullable', 'string', 'max:255'],
        ]);

        $studentFee = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->whereHas('feeStructure', fn ($q) => $q->where('fee_type', 'like', 'Hostel Fee%'))
            ->find($validated['fee_id']);

        if (!$studentFee) {
            return response()->json(['success' => false, 'message' => 'Hostel fee record not found'], 404);
        }

        $currentBalance = (float) $studentFee->balance;
        $paymentAmount = (float) $validated['amount'];

        if ($paymentAmount > $currentBalance) {
            return response()->json(['success' => false, 'message' => 'Payment amount cannot exceed pending balance'], 400);
        }

        DB::transaction(function () use ($studentFee, $paymentAmount, $validated, $user, $organization) {
            FeePayment::create([
                'organization_id' => $organization->id,
                'student_fee_id' => $studentFee->id,
                'student_id' => $studentFee->student_id,
                'receipt_number' => $this->generateReceiptNumber(),
                'amount' => $paymentAmount,
                'payment_method' => $validated['payment_method'],
                'transaction_id' => $validated['transaction_id'] ?: null,
                'payment_date' => now(),
                'collected_by' => $user->id,
                'status' => 'success',
            ]);

            $paidAmount = (float) $studentFee->paid_amount + $paymentAmount;
            $balance = max(0, (float) $studentFee->net_amount - $paidAmount);

            $studentFee->update([
                'paid_amount' => $paidAmount,
                'balance' => $balance,
                'status' => $balance <= 0 ? 'paid' : 'partial',
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Hostel fee collected successfully',
        ]);
    }

    public function revertFeePayment(Request $request, FeePayment $feePayment): JsonResponse
    {
        $organization = $this->requireOrganization();
        $user = Auth::user();
        abort_unless($feePayment->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        if ($feePayment->status === 'refunded') {
            return response()->json(['success' => false, 'message' => 'Payment has already been reverted'], 400);
        }

        $studentFee = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->whereHas('feeStructure', fn ($q) => $q->where('fee_type', 'like', 'Hostel Fee%'))
            ->find($feePayment->student_fee_id);

        if (!$studentFee) {
            return response()->json(['success' => false, 'message' => 'Associated hostel fee record not found'], 404);
        }

        DB::transaction(function () use ($feePayment, $studentFee, $validated, $user) {
            $updatedPaidAmount = max(0, (float) $studentFee->paid_amount - (float) $feePayment->amount);
            $updatedBalance = min((float) $studentFee->net_amount, (float) $studentFee->balance + (float) $feePayment->amount);

            $studentFee->update([
                'paid_amount' => $updatedPaidAmount,
                'balance' => $updatedBalance,
                'status' => $updatedPaidAmount <= 0 ? 'pending' : ($updatedBalance <= 0 ? 'paid' : 'partial'),
            ]);

            $feePayment->update([
                'status' => 'refunded',
                'reverted_by' => $user->id,
                'reverted_at' => now(),
                'revert_reason' => $validated['reason'],
                'remarks' => $validated['reason'],
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Hostel fee payment reverted successfully',
        ]);
    }

    private function serializeHostel(Hostel $hostel): array
    {
        return [
            'id' => $hostel->id,
            'name' => $hostel->name,
            'type' => $hostel->type,
            'type_label' => ucfirst($hostel->type),
            'address' => $hostel->address,
            'warden_name' => $hostel->warden_name ?? '',
            'warden_phone' => $hostel->warden_phone ?? '',
            'total_rooms' => $hostel->total_rooms,
            'status' => $hostel->status,
        ];
    }

    private function serializeRoom(HostelRoom $room): array
    {
        return [
            'id' => $room->id,
            'hostel_id' => $room->hostel_id,
            'room_number' => $room->room_number,
            'floor' => $room->floor ?? '',
            'room_type' => $room->room_type,
            'room_type_label' => ucfirst($room->room_type),
            'capacity' => (int) $room->capacity,
            'occupied' => (int) $room->occupied,
            'monthly_fee' => (float) $room->monthly_fee,
            'facilities' => $room->facilities ?? [],
            'status' => $room->status,
        ];
    }

    private function serializeBed(HostelBed $bed): array
    {
        $allocation = HostelAllocation::where('bed_id', $bed->id)
            ->where('status', 'active')
            ->with('student:id,first_name,last_name,roll_number')
            ->first();

        return [
            'id' => $bed->id,
            'hostel_id' => $bed->hostel_id,
            'room_id' => $bed->room_id,
            'bed_number' => $bed->bed_number,
            'status' => $bed->status,
            'assigned_student_id' => $allocation ? $allocation->student_id : null,
            'assigned_student_name' => $allocation ? trim(($allocation->student?->first_name ?? '') . ' ' . ($allocation->student?->last_name ?? '')) : null,
            'assigned_student_roll' => $allocation ? ($allocation->student?->roll_number ?? '') : null,
        ];
    }

    private function serializeFeeStructure(HostelFeeStructure $structure): array
    {
        return [
            'id' => $structure->id,
            'hostel_id' => $structure->hostel_id,
            'room_type' => $structure->room_type,
            'room_type_label' => ucfirst($structure->room_type),
            'amount' => (float) $structure->amount,
            'frequency' => $structure->frequency,
            'frequency_label' => ucfirst($structure->frequency),
            'description' => $structure->description ?? '',
            'status' => $structure->status,
        ];
    }

    private function syncBedAllocation(HostelBed $bed, ?int $studentId, ?string $remarks = null): void
    {
        $existingActiveAllocations = HostelAllocation::where('bed_id', $bed->id)
            ->where('status', 'active')
            ->get();

        foreach ($existingActiveAllocations as $allocation) {
            if ($studentId === null || $allocation->student_id !== $studentId) {
                $this->vacateAllocation($allocation);
            }
        }

        if ($studentId === null) {
            $bed->update(['status' => $bed->status === 'maintenance' ? 'maintenance' : 'available']);
            if ($bed->room) {
                $this->syncRoomOccupancy($bed->room->fresh());
            }
            return;
        }

        HostelAllocation::where('student_id', $studentId)
            ->where('status', 'active')
            ->where(function ($q) use ($bed) {
                $q->where('bed_id', '!=', $bed->id)->orWhereNull('bed_id');
            })
            ->get()
            ->each(fn (HostelAllocation $a) => $this->vacateAllocation($a));

        $allocation = HostelAllocation::where('student_id', $studentId)
            ->where('bed_id', $bed->id)
            ->where('status', 'active')
            ->first();

        if (!$allocation) {
            $allocation = HostelAllocation::create([
                'student_id' => $studentId,
                'hostel_id' => $bed->hostel_id,
                'room_id' => $bed->room_id,
                'bed_id' => $bed->id,
                'allocation_date' => now()->toDateString(),
                'status' => 'active',
                'remarks' => $remarks,
            ]);
        } else {
            $allocation->update([
                'hostel_id' => $bed->hostel_id,
                'room_id' => $bed->room_id,
                'remarks' => $remarks,
            ]);
        }

        $bed->update(['status' => 'occupied']);
        $this->syncStudentHostelRoom($allocation->student);
        if ($bed->room) {
            $this->syncRoomOccupancy($bed->room->fresh());
        }
    }

    private function vacateAllocation(HostelAllocation $allocation): void
    {
        $allocation->update([
            'status' => 'vacated',
            'departure_date' => now()->toDateString(),
        ]);

        if ($allocation->bed) {
            $allocation->bed->update([
                'status' => $allocation->bed->status === 'maintenance' ? 'maintenance' : 'available',
            ]);
        }

        if ($allocation->student) {
            $this->syncStudentHostelRoom($allocation->student);
        }
    }

    private function syncStudentHostelRoom(Student $student): void
    {
        $activeAllocation = HostelAllocation::where('student_id', $student->id)
            ->where('status', 'active')
            ->with(['room:id,room_number', 'bed:id,bed_number'])
            ->latest('allocation_date')
            ->first();

        $hostelRoom = null;
        if ($activeAllocation?->room) {
            $hostelRoom = $activeAllocation->room->room_number;
            if ($activeAllocation->bed?->bed_number) {
                $hostelRoom .= ' / ' . $activeAllocation->bed->bed_number;
            }
        }

        $student->update([
            'hostel_room' => $hostelRoom,
            'hostel_required' => (bool) $activeAllocation,
        ]);

        if ($activeAllocation) {
            $this->syncHostelFeeForAllocation($activeAllocation);
        }
    }

    private function syncRoomOccupancy(?HostelRoom $room): void
    {
        if (!$room) return;

        $occupied = HostelAllocation::where('room_id', $room->id)
            ->where('status', 'active')
            ->count();

        $status = $room->status === 'maintenance'
            ? 'maintenance'
            : ($occupied >= $room->capacity ? 'full' : 'available');

        $room->update([
            'occupied' => $occupied,
            'status' => $status,
        ]);
    }

    private function syncHostelRoomCount(Hostel $hostel): void
    {
        $hostel->update([
            'total_rooms' => HostelRoom::where('hostel_id', $hostel->id)->count(),
        ]);
    }

    private function syncOrganizationHostelFees(Organization $organization): void
    {
        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);
        if (!$activeAcademicYearId) return;

        HostelAllocation::where('status', 'active')
            ->whereHas('hostel', fn ($q) => $q->where('organization_id', $organization->id))
            ->with(['hostel', 'room', 'student'])
            ->get()
            ->each(fn (HostelAllocation $a) => $this->syncHostelFeeForAllocation($a, $activeAcademicYearId));
    }

    private function syncHostelFeeForAllocation(HostelAllocation $allocation, ?int $academicYearId = null): void
    {
        $student = $allocation->student;
        $hostel = $allocation->hostel;
        $room = $allocation->room;

        if (!$student || !$hostel || !$room || !$student->organization_id || !$student->class_id) {
            return;
        }

        $hostelFeeStructure = $this->findApplicableHostelFeeStructure($student->organization_id, $hostel, $room);
        if (!$hostelFeeStructure) return;

        $amount = (float) $hostelFeeStructure->amount;
        if ($amount <= 0) return;

        $organization = Organization::find($student->organization_id);
        if (!$organization) return;

        $academicYearId ??= $this->getActiveAcademicYearId($organization);
        if (!$academicYearId) return;

        $feeStructure = $this->ensureHostelFeeStructure($organization, $academicYearId, $student, $hostel, $room, $hostelFeeStructure);
        $allocationDate = $allocation->allocation_date ? $allocation->allocation_date->copy() : now();
        $year = (int) $allocationDate->format('Y');
        $dueDate = $allocationDate->toDateString();

        $studentFee = StudentFee::where('hostel_allocation_id', $allocation->id)->first();

        $paidAmount = (float) ($studentFee?->paid_amount ?? 0);
        $discount = (float) ($studentFee?->discount ?? 0);
        $fine = (float) ($studentFee?->fine ?? 0);
        $netAmount = max(0, $amount - $discount + $fine);
        $balance = max(0, $netAmount - $paidAmount);

        if (!$studentFee) {
            StudentFee::create([
                'organization_id' => $organization->id,
                'student_id' => $student->id,
                'fee_structure_id' => $feeStructure->id,
                'hostel_allocation_id' => $allocation->id,
                'academic_year_id' => $academicYearId,
                'month' => null,
                'year' => $year,
                'amount' => $amount,
                'discount' => $discount,
                'fine' => $fine,
                'net_amount' => $netAmount,
                'paid_amount' => $paidAmount,
                'balance' => $balance,
                'due_date' => $dueDate,
                'status' => $balance <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'pending'),
                'notes' => sprintf('Auto-synced one-time hostel fee from %s (%s).', $hostel->name, ucfirst($room->room_type)),
            ]);
            return;
        }

        $studentFee->update([
            'fee_structure_id' => $feeStructure->id,
            'hostel_allocation_id' => $allocation->id,
            'month' => null,
            'year' => $year,
            'amount' => $amount,
            'net_amount' => $netAmount,
            'balance' => $balance,
            'due_date' => $dueDate,
            'status' => $balance <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'pending'),
            'notes' => sprintf('Auto-synced one-time hostel fee from %s (%s).', $hostel->name, ucfirst($room->room_type)),
        ]);
    }

    private function ensureHostelFeeStructure(Organization $org, int $academicYearId, Student $student, Hostel $hostel, HostelRoom $room, HostelFeeStructure $hostelFee): FeeStructure
    {
        $roomLabel = ucfirst($room->room_type);
        $feeType = sprintf('Hostel Fee - %s / %s', $hostel->name, $roomLabel);

        $feeStructure = FeeStructure::firstOrNew([
            'organization_id' => $org->id,
            'academic_year_id' => $academicYearId,
            'class_id' => $student->class_id,
            'fee_type' => $feeType,
        ]);

        $feeStructure->fill([
            'amount' => $hostelFee->amount,
            'frequency' => 'one-time',
            'description' => $hostelFee->description ?: sprintf('Auto-synced one-time hostel fee for %s (%s).', $hostel->name, $roomLabel),
            'is_compulsory' => true,
            'status' => 'active',
        ]);
        $feeStructure->save();

        return $feeStructure;
    }

    private function findApplicableHostelFeeStructure(int $orgId, Hostel $hostel, HostelRoom $room): ?HostelFeeStructure
    {
        return HostelFeeStructure::where('organization_id', $orgId)
            ->where('hostel_id', $hostel->id)
            ->where('room_type', $room->room_type)
            ->where('status', 'active')
            ->latest('id')
            ->first();
    }

    private function getActiveAcademicYearId(Organization $organization): ?int
    {
        return AcademicYear::where('organization_id', $organization->id)
            ->where('is_current', true)
            ->value('id');
    }

    private function generateReceiptNumber(): string
    {
        do {
            $receipt = 'RCT-' . now()->format('Ymd') . '-' . random_int(1000, 9999);
        } while (FeePayment::where('receipt_number', $receipt)->exists());
        return $receipt;
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
