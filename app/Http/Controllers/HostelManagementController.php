<?php

namespace App\Http\Controllers;

use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelBed;
use App\Models\HostelFeeStructure;
use App\Models\HostelLostFoundItem;
use App\Models\HostelNotice;
use App\Models\HostelRoom;
use App\Models\HostelRoomType;
use App\Models\AcademicYear;
use App\Models\ComplaintEntry;
use App\Models\FeePayment;
use App\Models\FeeStructure;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class HostelManagementController extends Controller
{
    private const HOSTEL_FEE_DELETED_NOTE = '[HOSTEL_FEE_DELETED]';

    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if ($organization) {
            $this->syncOrganizationHostelFees($organization);
        }

        return inertia('dashboard/HostelManagement', [
            'user' => $user,
            'organization' => $organization ? [
                'name' => $organization->name,
                'address' => $organization->address,
                'phone' => $organization->phone,
                'email' => $organization->email,
            ] : null,
            'students' => $organization ? $this->getStudents($organization) : [],
            'classRecords' => $organization ? $this->getClassRecords($organization) : [],
            'staffRecords' => $organization ? $this->getStaffRecords($organization) : [],
            'hostels' => $organization ? $this->getHostels($organization) : [],
            'rooms' => $organization ? $this->getRooms($organization) : [],
            'beds' => $organization ? $this->getBeds($organization) : [],
            'feeStructures' => $organization ? $this->getFeeStructures($organization) : [],
            'hostelComplaints' => $organization ? $this->getHostelComplaints($organization) : [],
            'hostelNotices' => $organization ? $this->getHostelNotices($organization) : [],
            'lostFoundItems' => $organization ? $this->getHostelLostFoundItems($organization) : [],
        ]);
    }

    public function roomTypes()
    {
        $organization = $this->requireOrganization();

        $systemNames = array_column(HostelRoomType::SYSTEM_DEFAULTS, 'name');

        $roomTypes = HostelRoomType::query()
            ->where('organization_id', $organization->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (HostelRoomType $type) => [
                'id' => (string) $type->id,
                'name' => $type->name,
                'label' => $type->label,
                'capacity' => (int) $type->default_capacity,
                'fee' => (float) $type->default_fee,
                'status' => (bool) $type->status,
            ])
            ->all();

        $usage = HostelRoom::query()
            ->whereHas('hostel', fn ($query) => $query->where('organization_id', $organization->id))
            ->selectRaw('room_type, count(*) as total')
            ->groupBy('room_type')
            ->pluck('total', 'room_type')
            ->all();

        return inertia('dashboard/HostelRoomTypes', [
            'user' => Auth::user(),
            'organization' => [
                'name' => $organization->name,
                'address' => $organization->address,
                'phone' => $organization->phone,
                'email' => $organization->email,
            ],
            'systemNames' => $systemNames,
            'defaults' => HostelRoomType::SYSTEM_DEFAULTS,
            'roomTypes' => $roomTypes,
            'usage' => $usage,
        ]);
    }

    public function storeRoomType(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:64', 'regex:/^[a-z0-9_-]+$/'],
            'label' => ['nullable', 'string', 'max:255'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:255'],
            'fee' => ['nullable', 'numeric', 'min:0'],
        ]);

        $systemNames = array_column(HostelRoomType::SYSTEM_DEFAULTS, 'name');

        $exists = in_array($validated['name'], $systemNames, true) || HostelRoomType::query()
            ->where('organization_id', $organization->id)
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return back()->withErrors(['name' => 'A room type with this name already exists.'])->onlyInput('name');
        }

        HostelRoomType::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'label' => $validated['label'] ?: null,
            'default_capacity' => $validated['capacity'] ?? 2,
            'default_fee' => $validated['fee'] ?? 0,
            'status' => true,
        ]);

        return back()->with('success', 'Room type added.');
    }

    public function updateRoomType(Request $request, HostelRoomType $hostelRoomType): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless((int) $hostelRoomType->organization_id === $organization->id && ! $hostelRoomType->is_system, 403);

        $validated = $request->validate([
            'label' => ['nullable', 'string', 'max:255'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:255'],
            'fee' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'boolean'],
        ]);

        $hostelRoomType->update([
            'label' => $validated['label'] ?? $hostelRoomType->label,
            'default_capacity' => $validated['capacity'] ?? $hostelRoomType->default_capacity,
            'default_fee' => array_key_exists('fee', $validated) ? $validated['fee'] : $hostelRoomType->default_fee,
            'status' => array_key_exists('status', $validated) ? (bool) $validated['status'] : $hostelRoomType->status,
        ]);

        return back()->with('success', 'Room type updated.');
    }

    public function destroyRoomType(HostelRoomType $hostelRoomType): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless((int) $hostelRoomType->organization_id === $organization->id && ! $hostelRoomType->is_system, 403);

        $hostelRoomType->delete();

        return back()->with('success', 'Room type deleted.');
    }

    public function studentAllocation()
    {
        $organization = $this->requireOrganization();
        $user = Auth::user();

        $allocations = HostelAllocation::query()
            ->where('status', 'active')
            ->whereHas('hostel', fn ($query) => $query->where('organization_id', $organization->id))
            ->with(['student.schoolClass:id,name,section', 'hostel:id,name', 'room:id,room_number,floor', 'bed:id,bed_number'])
            ->orderByDesc('allocation_date')
            ->get();

        $allocatedStudentIds = $allocations
            ->map(fn (HostelAllocation $allocation) => (string) $allocation->student_id)
            ->unique()
            ->values()
            ->all();

        return inertia('dashboard/HostelAllocations', [
            'user' => $user,
            'allocations' => $allocations->map(function (HostelAllocation $allocation) {
                $student = $allocation->student;

                return [
                    'id' => (string) $allocation->id,
                    'studentId' => (string) $allocation->student_id,
                    'studentName' => $student ? trim(($student->first_name ?? '') . ' ' . ($student->last_name ?? '')) : '—',
                    'admissionNo' => $student?->admission_no,
                    'class' => $student?->schoolClass?->name,
                    'section' => $student?->schoolClass?->section,
                    'hostelName' => $allocation->hostel?->name ?? '—',
                    'roomNumber' => $allocation->room?->room_number ?? '—',
                    'floor' => $allocation->room?->floor,
                    'bedNumber' => $allocation->bed?->bed_number,
                    'allocationDate' => optional($allocation->allocation_date)->format('Y-m-d'),
                    'remarks' => $allocation->remarks,
                ];
            })->all(),
            'allocatedStudentIds' => $allocatedStudentIds,
            'students' => collect($this->getStudents($organization))
                ->map(fn (array $student) => [
                    'id' => $student['id'],
                    'name' => trim(($student['first_name'] ?? '') . ' ' . ($student['last_name'] ?? '')),
                    'admissionNo' => $student['admission_no'],
                    'class' => $student['class'],
                    'section' => $student['section'],
                ])
                ->values()
                ->all(),
            'hostels' => collect($this->getHostels($organization))
                ->map(fn (array $hostel) => ['id' => $hostel['id'], 'name' => $hostel['name']])
                ->values()
                ->all(),
            'rooms' => collect($this->getRooms($organization))
                ->map(fn (array $room) => [
                    'id' => $room['id'],
                    'hostelId' => $room['hostelId'],
                    'roomNumber' => $room['roomNumber'],
                    'floor' => $room['floor'],
                    'roomType' => $room['roomType'],
                    'capacity' => $room['capacity'],
                    'occupied' => $room['occupied'],
                    'status' => $room['status'],
                ])
                ->values()
                ->all(),
            'beds' => collect($this->getBeds($organization))
                ->map(fn (array $bed) => [
                    'id' => $bed['id'],
                    'roomId' => $bed['roomId'],
                    'bedNumber' => $bed['bedNumber'],
                    'status' => $bed['status'],
                    'assignedStudentId' => $bed['assignedStudentId'],
                ])
                ->values()
                ->all(),
        ]);
    }

    public function allocateStudent(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'studentId' => ['required', 'integer'],
            'hostelId' => ['required', 'integer'],
            'roomId' => ['required', 'integer'],
            'bedId' => ['required', 'integer'],
            'allocationDate' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $bed = HostelBed::query()
            ->where('id', $validated['bedId'])
            ->where('room_id', $validated['roomId'])
            ->where('hostel_id', $validated['hostelId'])
            ->whereHas('hostel', fn ($query) => $query->where('organization_id', $organization->id))
            ->firstOrFail();

        $student = Student::query()
            ->forCurrentSession($organization->id)
            ->findOrFail($validated['studentId']);

        if ($bed->status === 'occupied') {
            return back()->withErrors(['bedId' => 'The selected bed is already occupied.']);
        }

        $this->syncBedAllocation($bed, $student->id, $validated['remarks'] ?? null, $validated['allocationDate'] ?? null);

        return back()->with('success', 'Student allocated successfully.');
    }

    public function releaseAllocation(HostelAllocation $hostelAllocation): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostelAllocation->hostel && $hostelAllocation->hostel->organization_id === $organization->id, 403);

        $this->vacateAllocation($hostelAllocation);

        return back()->with('success', 'Allocation released.');
    }

    public function feeCollection(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $selectedAcademicYear = $organization
            ? $this->resolveSelectedAcademicYear($organization, $request->input('session'))
            : null;

        if ($organization && $selectedAcademicYear) {
            $this->syncOrganizationHostelFees($organization);
        }

        return inertia('dashboard/HostelFeeCollection', [
            'user' => $user,
            'sessions' => $organization ? $this->getAcademicSessions($organization) : [],
            'selectedSessionId' => $selectedAcademicYear ? (string) $selectedAcademicYear->id : null,
            'selectedSessionName' => $selectedAcademicYear?->name,
            'classRecords' => $organization ? $this->getClassRecords($organization, $selectedAcademicYear?->id) : [],
            'hostelFeeRecords' => $organization ? $this->getHostelFeeRecords($organization, $selectedAcademicYear?->id) : [],
        ]);
    }

    public function studentHostel()
    {
        $user = Auth::user();
        abort_unless($user?->role === 'student', 403);

        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $student = $this->resolveStudentForUser($user, $organization);
        abort_unless($student, 404);

        return inertia('dashboard/StudentHostel', [
            'user' => $user,
            'student' => [
                'id' => (string) $student->id,
                'name' => trim($student->first_name . ' ' . $student->last_name),
                'admissionNo' => $student->admission_no,
                'phone' => $student->phone,
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
                'rollNumber' => $student->roll_number,
            ],
            'allocation' => $allocation = $this->getStudentHostelAllocation($student),
            'hostelFees' => $this->getStudentHostelFees($student),
            'hostelComplaints' => $this->getStudentHostelComplaints($student),
            'hostelNotices' => $this->getStudentHostelNotices($student, $allocation),
            'lostFoundItems' => $this->getStudentHostelLostFoundItems($student, $allocation),
        ]);
    }

    public function collectFeePayment(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'fee_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', Rule::in(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'online'])],
            'transaction_id' => ['nullable', 'string', 'max:255'],
        ]);

        $studentFee = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'like', 'Hostel Fee%'))
            ->find($validated['fee_id']);

        if (!$studentFee) {
            return redirect()->back()->with('error', 'Hostel fee record not found.');
        }

        $currentBalance = (float) $studentFee->balance;
        $paymentAmount = (float) $validated['amount'];

        if ($paymentAmount > $currentBalance) {
            return redirect()->back()->with('error', 'Payment amount cannot exceed pending balance.');
        }

        DB::transaction(function () use ($studentFee, $paymentAmount, $validated, $user, $organization) {
            FeePayment::query()->create([
                'organization_id' => $organization->id,
                'student_fee_id' => $studentFee->id,
                'student_id' => $studentFee->student_id,
                'receipt_number' => $this->generateReceiptNumber(),
                'amount' => $paymentAmount,
                'payment_method' => $validated['payment_method'],
                'transaction_id' => $validated['transaction_id'] ?: null,
                'payment_date' => now()->toDateString(),
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

        return redirect()->back()->with('success', 'Hostel fee collected successfully.');
    }

    public function revertFeePayment(Request $request, FeePayment $feePayment): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->requireOrganization();
        abort_unless($feePayment->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        if ($feePayment->status === 'refunded') {
            return redirect()->back()->with('error', 'Payment has already been reverted.');
        }

        $studentFee = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'like', 'Hostel Fee%'))
            ->find($feePayment->student_fee_id);

        if (!$studentFee) {
            return redirect()->back()->with('error', 'Associated hostel fee record not found.');
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
                'reverted_at' => now()->toDateString(),
                'revert_reason' => $validated['reason'],
                'remarks' => $validated['reason'],
            ]);
        });

        return redirect()->back()->with('success', 'Hostel fee payment reverted successfully.');
    }

    public function destroyFeeRecord(StudentFee $studentFee): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->requireOrganization();

        abort_unless($user && $user->role === 'admin', 403);
        abort_unless($studentFee->organization_id === $organization->id, 403);

        $isHostelFee = $studentFee->feeStructure()
            ->where('fee_type', 'like', 'Hostel Fee%')
            ->exists();

        abort_unless($isHostelFee, 404);

        DB::transaction(function () use ($studentFee) {
            FeePayment::query()
                ->where('student_fee_id', $studentFee->id)
                ->delete();

            $existingNotes = trim((string) $studentFee->notes);
            $deletionNote = self::HOSTEL_FEE_DELETED_NOTE . ' Cancelled by admin from hostel fee collection.';

            $studentFee->update([
                'paid_amount' => 0,
                'balance' => 0,
                'status' => 'waived',
                'notes' => $existingNotes !== ''
                    ? $existingNotes . ' ' . $deletionNote
                    : $deletionNote,
            ]);
        });

        return redirect()->back()->with('success', 'Hostel fee record deleted successfully.');
    }

    public function updateComplaintStatus(Request $request, ComplaintEntry $complaintEntry): RedirectResponse
    {
        $organization = $this->requireOrganization();

        abort_unless($complaintEntry->organization_id === $organization->id, 403);
        abort_unless(strcasecmp((string) $complaintEntry->category, 'Hostel') === 0, 404);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['open', 'in_review', 'resolved', 'closed'])],
        ]);

        $complaintEntry->update([
            'status' => $validated['status'],
        ]);

        return redirect()
            ->route('hostel-management')
            ->with('success', 'Hostel complaint status updated successfully.');
    }

    public function storeComplaint(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'studentId' => ['nullable', 'integer'],
            'complainantName' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'assignedTo' => ['nullable', 'string', 'max:255'],
            'complaintDate' => ['required', 'date'],
            'status' => ['required', Rule::in(['open', 'in_review', 'resolved', 'closed'])],
            'note' => ['required', 'string', 'max:3000'],
            'actionTaken' => ['nullable', 'string', 'max:3000'],
        ]);

        $student = null;

        if (! empty($validated['studentId'])) {
            $student = Student::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($validated['studentId']);
        }

        ComplaintEntry::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student?->id,
            'submitted_by_user_id' => $user?->id,
            'complainant_name' => $validated['complainantName'],
            'phone' => $validated['phone'] ?? $student?->phone,
            'source' => 'staff',
            'category' => 'Hostel',
            'assigned_to' => $validated['assignedTo'] ?? null,
            'complaint_date' => $validated['complaintDate'],
            'status' => $validated['status'],
            'note' => $validated['note'],
            'action_taken' => $validated['actionTaken'] ?? null,
        ]);

        return redirect()->route('hostel-management')->with('success', 'Hostel complaint created successfully.');
    }

    public function storeNotice(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->requireOrganization();
        $validated = $this->validateNoticePayload($request, $organization);

        HostelNotice::query()->create([
            'organization_id' => $organization->id,
            'hostel_id' => $validated['hostelId'],
            'created_by_user_id' => $user?->id,
            'title' => $validated['title'],
            'message' => $validated['message'],
            'publish_date' => $validated['publishDate'],
            'status' => $validated['status'],
        ]);

        return redirect()->route('hostel-management')->with('success', 'Hostel notice created successfully.');
    }

    public function updateNotice(Request $request, HostelNotice $hostelNotice): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostelNotice->organization_id === $organization->id, 403);

        $validated = $this->validateNoticePayload($request, $organization);

        $hostelNotice->update([
            'hostel_id' => $validated['hostelId'],
            'title' => $validated['title'],
            'message' => $validated['message'],
            'publish_date' => $validated['publishDate'],
            'status' => $validated['status'],
        ]);

        return redirect()->route('hostel-management')->with('success', 'Hostel notice updated successfully.');
    }

    public function destroyNotice(HostelNotice $hostelNotice): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostelNotice->organization_id === $organization->id, 403);

        $hostelNotice->delete();

        return redirect()->route('hostel-management')->with('success', 'Hostel notice deleted successfully.');
    }

    public function storeLostFound(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->requireOrganization();
        $validated = $this->validateLostFoundPayload($request, $organization);

        HostelLostFoundItem::query()->create([
            'organization_id' => $organization->id,
            'hostel_id' => $validated['hostelId'],
            'student_id' => $validated['studentId'],
            'reported_by_user_id' => $user?->id,
            'item_type' => $validated['itemType'],
            'item_name' => $validated['itemName'],
            'location' => $validated['location'] ?? null,
            'reported_date' => $validated['reportedDate'],
            'description' => $validated['description'] ?? null,
            'contact' => $validated['contact'] ?? null,
            'status' => $validated['status'],
            'resolution_note' => $validated['resolutionNote'] ?? null,
        ]);

        return redirect()->route('hostel-management')->with('success', 'Lost and found item created successfully.');
    }

    public function updateLostFound(Request $request, HostelLostFoundItem $hostelLostFoundItem): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostelLostFoundItem->organization_id === $organization->id, 403);

        $validated = $this->validateLostFoundPayload($request, $organization);

        $hostelLostFoundItem->update([
            'hostel_id' => $validated['hostelId'],
            'student_id' => $validated['studentId'],
            'item_type' => $validated['itemType'],
            'item_name' => $validated['itemName'],
            'location' => $validated['location'] ?? null,
            'reported_date' => $validated['reportedDate'],
            'description' => $validated['description'] ?? null,
            'contact' => $validated['contact'] ?? null,
            'status' => $validated['status'],
            'resolution_note' => $validated['resolutionNote'] ?? null,
        ]);

        return redirect()->route('hostel-management')->with('success', 'Lost and found item updated successfully.');
    }

    public function updateLostFoundStatus(Request $request, HostelLostFoundItem $hostelLostFoundItem): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostelLostFoundItem->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['open', 'claimed', 'resolved'])],
            'resolutionNote' => ['nullable', 'string', 'max:1000'],
        ]);

        $hostelLostFoundItem->update([
            'status' => $validated['status'],
            'resolution_note' => $validated['resolutionNote'] ?? $hostelLostFoundItem->resolution_note,
        ]);

        return redirect()->route('hostel-management')->with('success', 'Lost and found status updated successfully.');
    }

    public function destroyLostFound(HostelLostFoundItem $hostelLostFoundItem): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostelLostFoundItem->organization_id === $organization->id, 403);

        $hostelLostFoundItem->delete();

        return redirect()->route('hostel-management')->with('success', 'Lost and found item deleted successfully.');
    }

    public function storeStudentLostFound(Request $request): RedirectResponse
    {
        $user = Auth::user();
        abort_unless($user?->role === 'student', 403);

        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $student = $this->resolveStudentForUser($user, $organization);
        abort_unless($student, 404);

        $allocation = HostelAllocation::query()
            ->where('student_id', $student->id)
            ->where('status', 'active')
            ->latest('allocation_date')
            ->latest('id')
            ->first();

        $validated = $request->validate([
            'itemType' => ['required', Rule::in(['lost', 'found'])],
            'itemName' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'reportedDate' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:2000'],
            'contact' => ['nullable', 'string', 'max:255'],
        ]);

        HostelLostFoundItem::query()->create([
            'organization_id' => $organization->id,
            'hostel_id' => $allocation?->hostel_id,
            'student_id' => $student->id,
            'reported_by_user_id' => $user->id,
            'item_type' => $validated['itemType'],
            'item_name' => $validated['itemName'],
            'location' => $validated['location'] ?? null,
            'reported_date' => $validated['reportedDate'],
            'description' => $validated['description'] ?? null,
            'contact' => $validated['contact'] ?? $student->phone,
            'status' => 'open',
        ]);

        return redirect()->route('student.hostel')->with('success', 'Lost and found report submitted successfully.');
    }

    public function storeHostel(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['boys', 'girls', 'mixed'])],
            'address' => ['required', 'string'],
            'wardenStaffId' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'warden' => ['nullable', 'string', 'max:255'],
            'contact' => ['nullable', 'string', 'max:50'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $warden = $this->resolveWardenStaff($organization, $validated['wardenStaffId'] ?? null);

        Hostel::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'address' => $validated['address'],
            'warden_name' => $warden?->name,
            'warden_phone' => $warden?->phone,
            'status' => $validated['status'],
        ]);

        return redirect()->route('hostel-management')->with('success', 'Hostel created successfully.');
    }

    public function updateHostel(Request $request, Hostel $hostel): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostel->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['boys', 'girls', 'mixed'])],
            'address' => ['required', 'string'],
            'wardenStaffId' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'warden' => ['nullable', 'string', 'max:255'],
            'contact' => ['nullable', 'string', 'max:50'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $warden = $this->resolveWardenStaff($organization, $validated['wardenStaffId'] ?? null);

        $hostel->update([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'address' => $validated['address'],
            'warden_name' => $warden?->name,
            'warden_phone' => $warden?->phone,
            'status' => $validated['status'],
        ]);

        return redirect()->route('hostel-management')->with('success', 'Hostel updated successfully.');
    }

    public function destroyHostel(Hostel $hostel): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostel->organization_id === $organization->id, 403);

        $studentIds = HostelAllocation::query()
            ->where('hostel_id', $hostel->id)
            ->pluck('student_id')
            ->unique()
            ->all();

        $hostel->delete();

        foreach ($studentIds as $studentId) {
            $student = Student::query()->find($studentId);

            if ($student) {
                $this->syncStudentHostelRoom($student);
            }
        }

        return redirect()->route('hostel-management')->with('success', 'Hostel deleted successfully.');
    }

    public function storeRoom(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization();

        $validated = $request->validate([
            'hostelId' => ['required', 'integer'],
            'roomNumber' => ['required', 'string', 'max:255'],
            'floor' => ['nullable', 'string', 'max:255'],
            'roomType' => ['required', Rule::in(HostelRoomType::resolvedNames($organization->id))],
            'capacity' => ['required', 'integer', 'min:1'],
            'monthlyFee' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['available', 'full', 'maintenance'])],
        ]);

        $hostel = Hostel::query()
            ->where('organization_id', $organization->id)
            ->findOrFail($validated['hostelId']);

        $room = HostelRoom::query()->create([
            'hostel_id' => $hostel->id,
            'room_number' => $validated['roomNumber'],
            'floor' => $validated['floor'] ?? null,
            'room_type' => $validated['roomType'],
            'capacity' => $validated['capacity'],
            'monthly_fee' => $validated['monthlyFee'] ?? 0,
            'status' => $validated['status'],
        ]);

        $this->syncHostelRoomCount($hostel);
        $this->syncRoomOccupancy($room->fresh());

        return redirect()->route('hostel-management')->with('success', 'Room created successfully.');
    }

    public function updateRoom(Request $request, HostelRoom $hostelRoom): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostelRoom->hostel && $hostelRoom->hostel->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'hostelId' => ['required', 'integer'],
            'roomNumber' => ['required', 'string', 'max:255'],
            'floor' => ['nullable', 'string', 'max:255'],
            'roomType' => ['required', Rule::in(HostelRoomType::resolvedNames($organization->id))],
            'capacity' => ['required', 'integer', 'min:1'],
            'monthlyFee' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['available', 'full', 'maintenance'])],
        ]);

        $hostel = Hostel::query()
            ->where('organization_id', $organization->id)
            ->findOrFail($validated['hostelId']);

        $previousHostelId = $hostelRoom->hostel_id;

        $hostelRoom->update([
            'hostel_id' => $hostel->id,
            'room_number' => $validated['roomNumber'],
            'floor' => $validated['floor'] ?? null,
            'room_type' => $validated['roomType'],
            'capacity' => $validated['capacity'],
            'monthly_fee' => $validated['monthlyFee'] ?? 0,
            'status' => $validated['status'],
        ]);

        if ($previousHostelId !== $hostel->id) {
            HostelBed::query()->where('room_id', $hostelRoom->id)->update(['hostel_id' => $hostel->id]);
            HostelAllocation::query()->where('room_id', $hostelRoom->id)->update(['hostel_id' => $hostel->id]);
            $previousHostel = Hostel::query()->find($previousHostelId);

            if ($previousHostel) {
                $this->syncHostelRoomCount($previousHostel);
            }
        }

        $this->syncHostelRoomCount($hostel);
        $this->syncRoomOccupancy($hostelRoom->fresh());

        return redirect()->route('hostel-management')->with('success', 'Room updated successfully.');
    }

    public function destroyRoom(HostelRoom $hostelRoom): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostelRoom->hostel && $hostelRoom->hostel->organization_id === $organization->id, 403);

        $hostel = $hostelRoom->hostel;
        $studentIds = HostelAllocation::query()
            ->where('room_id', $hostelRoom->id)
            ->pluck('student_id')
            ->unique()
            ->all();

        $hostelRoom->delete();
        $this->syncHostelRoomCount($hostel);

        foreach ($studentIds as $studentId) {
            $student = Student::query()->find($studentId);

            if ($student) {
                $this->syncStudentHostelRoom($student);
            }
        }

        return redirect()->route('hostel-management')->with('success', 'Room deleted successfully.');
    }

    public function storeBed(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization();
        $validated = $this->validateBedPayload($request, $organization);

        DB::transaction(function () use ($validated, $organization) {
            $room = $this->resolveRoomForOrganization($organization, (int) $validated['roomId']);
            abort_unless($room, 404);

            $existingBedCount = HostelBed::query()->where('room_id', $room->id)->count();

            if ($existingBedCount >= $room->capacity) {
                throw ValidationException::withMessages([
                    'roomId' => 'Room capacity reached. Edit an existing bed or increase room capacity first.',
                ]);
            }

            $bed = HostelBed::query()->create([
                'hostel_id' => $room->hostel_id,
                'room_id' => $room->id,
                'bed_number' => $validated['bedNumber'],
                'status' => $validated['assignedStudentId'] ? 'occupied' : $validated['status'],
            ]);

            $this->syncBedAllocation($bed, $validated['assignedStudentId'] ? (int) $validated['assignedStudentId'] : null, $validated['remarks'] ?? null);
        });

        return redirect()->route('hostel-management')->with('success', 'Bed created successfully.');
    }

    public function updateBed(Request $request, HostelBed $hostelBed): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostelBed->hostel && $hostelBed->hostel->organization_id === $organization->id, 403);
        $validated = $this->validateBedPayload($request, $organization);

        DB::transaction(function () use ($validated, $organization, $hostelBed) {
            $room = $this->resolveRoomForOrganization($organization, (int) $validated['roomId']);
            abort_unless($room, 404);

            $hostelBed->update([
                'hostel_id' => $room->hostel_id,
                'room_id' => $room->id,
                'bed_number' => $validated['bedNumber'],
                'status' => $validated['assignedStudentId'] ? 'occupied' : $validated['status'],
            ]);

            $this->syncBedAllocation($hostelBed->fresh(), $validated['assignedStudentId'] ? (int) $validated['assignedStudentId'] : null, $validated['remarks'] ?? null);
        });

        return redirect()->route('hostel-management')->with('success', 'Bed updated successfully.');
    }

    public function destroyBed(HostelBed $hostelBed): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostelBed->hostel && $hostelBed->hostel->organization_id === $organization->id, 403);

        $studentIds = HostelAllocation::query()
            ->where('bed_id', $hostelBed->id)
            ->pluck('student_id')
            ->unique()
            ->all();
        $room = $hostelBed->room;

        $hostelBed->delete();

        if ($room) {
            $this->syncRoomOccupancy($room->fresh());
        }

        foreach ($studentIds as $studentId) {
            $student = Student::query()->find($studentId);

            if ($student) {
                $this->syncStudentHostelRoom($student);
            }
        }

        return redirect()->route('hostel-management')->with('success', 'Bed deleted successfully.');
    }

    public function storeFeeStructure(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization();
        $validated = $this->validateFeePayload($request, $organization);

        HostelFeeStructure::query()->create([
            'organization_id' => $organization->id,
            'hostel_id' => $validated['hostelId'],
            'room_type' => $validated['roomType'],
            'amount' => $validated['amount'],
            'frequency' => $validated['frequency'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
        ]);

        return redirect()->route('hostel-management')->with('success', 'Fee structure created successfully.');
    }

    public function updateFeeStructure(Request $request, HostelFeeStructure $hostelFeeStructure): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostelFeeStructure->organization_id === $organization->id, 403);
        $validated = $this->validateFeePayload($request, $organization);

        $hostelFeeStructure->update([
            'hostel_id' => $validated['hostelId'],
            'room_type' => $validated['roomType'],
            'amount' => $validated['amount'],
            'frequency' => $validated['frequency'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
        ]);

        return redirect()->route('hostel-management')->with('success', 'Fee structure updated successfully.');
    }

    public function destroyFeeStructure(HostelFeeStructure $hostelFeeStructure): RedirectResponse
    {
        $organization = $this->requireOrganization();
        abort_unless($hostelFeeStructure->organization_id === $organization->id, 403);

        $hostelFeeStructure->delete();

        return redirect()->route('hostel-management')->with('success', 'Fee structure deleted successfully.');
    }

    private function validateBedPayload(Request $request, Organization $organization): array
    {
        $validated = $request->validate([
            'hostelId' => ['required', 'integer'],
            'roomId' => ['required', 'integer'],
            'bedNumber' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(['available', 'occupied', 'maintenance'])],
            'assignedStudentId' => ['nullable', 'integer'],
            'remarks' => ['nullable', 'string'],
        ]);

        $hostel = Hostel::query()
            ->where('organization_id', $organization->id)
            ->findOrFail($validated['hostelId']);

        $room = HostelRoom::query()
            ->where('hostel_id', $hostel->id)
            ->findOrFail($validated['roomId']);

        if (!empty($validated['assignedStudentId'])) {
            Student::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($validated['assignedStudentId']);
        }

        $validated['hostelId'] = $hostel->id;
        $validated['roomId'] = $room->id;

        return $validated;
    }

    private function validateFeePayload(Request $request, Organization $organization): array
    {
        $validated = $request->validate([
            'hostelId' => ['required', 'integer'],
            'roomType' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'frequency' => ['required', Rule::in(['monthly', 'quarterly', 'yearly'])],
            'description' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        Hostel::query()
            ->where('organization_id', $organization->id)
            ->findOrFail($validated['hostelId']);

        return $validated;
    }

    private function validateNoticePayload(Request $request, Organization $organization): array
    {
        $validated = $request->validate([
            'hostelId' => ['nullable', 'integer'],
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:3000'],
            'publishDate' => ['required', 'date'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        if (! empty($validated['hostelId'])) {
            Hostel::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($validated['hostelId']);
        }

        $validated['hostelId'] = ! empty($validated['hostelId']) ? (int) $validated['hostelId'] : null;

        return $validated;
    }

    private function validateLostFoundPayload(Request $request, Organization $organization): array
    {
        $validated = $request->validate([
            'hostelId' => ['nullable', 'integer'],
            'studentId' => ['nullable', 'integer'],
            'itemType' => ['required', Rule::in(['lost', 'found'])],
            'itemName' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'reportedDate' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:2000'],
            'contact' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['open', 'claimed', 'resolved'])],
            'resolutionNote' => ['nullable', 'string', 'max:1000'],
        ]);

        if (! empty($validated['hostelId'])) {
            Hostel::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($validated['hostelId']);
        }

        if (! empty($validated['studentId'])) {
            Student::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($validated['studentId']);
        }

        $validated['hostelId'] = ! empty($validated['hostelId']) ? (int) $validated['hostelId'] : null;
        $validated['studentId'] = ! empty($validated['studentId']) ? (int) $validated['studentId'] : null;

        return $validated;
    }

    private function syncBedAllocation(HostelBed $bed, ?int $studentId, ?string $remarks = null, ?string $allocationDate = null): void
    {
        $existingActiveAllocations = HostelAllocation::query()
            ->where('bed_id', $bed->id)
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

        HostelAllocation::query()
            ->where('student_id', $studentId)
            ->where('status', 'active')
            ->where(function ($query) use ($bed) {
                $query->where('bed_id', '!=', $bed->id)->orWhereNull('bed_id');
            })
            ->get()
            ->each(fn (HostelAllocation $allocation) => $this->vacateAllocation($allocation));

        $allocation = HostelAllocation::query()
            ->where('student_id', $studentId)
            ->where('bed_id', $bed->id)
            ->where('status', 'active')
            ->first();

        if (!$allocation) {
            $allocation = HostelAllocation::query()->create([
                'student_id' => $studentId,
                'hostel_id' => $bed->hostel_id,
                'room_id' => $bed->room_id,
                'bed_id' => $bed->id,
                'allocation_date' => $allocationDate ?: now()->toDateString(),
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
        $activeAllocation = HostelAllocation::query()
            ->where('student_id', $student->id)
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
        if (!$room) {
            return;
        }

        $occupied = HostelAllocation::query()
            ->where('room_id', $room->id)
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
            'total_rooms' => HostelRoom::query()->where('hostel_id', $hostel->id)->count(),
        ]);
    }

    private function getHostels(Organization $organization): array
    {
        return Hostel::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get()
            ->map(fn (Hostel $hostel) => [
                'id' => (string) $hostel->id,
                'name' => $hostel->name,
                'type' => $hostel->type,
                'address' => $hostel->address,
                'warden' => $hostel->warden_name ?? '',
                'contact' => $hostel->warden_phone ?? '',
                'status' => $hostel->status,
            ])
            ->all();
    }

    private function getStaffRecords(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->whereNotIn('role', ['super_admin', 'student', 'parent'])
            ->orderBy('name')
            ->get()
            ->map(fn (User $staff) => [
                'id' => $staff->id,
                'name' => $staff->name,
                'phone' => $staff->phone,
                'role' => $staff->role,
                'status' => $staff->status === 'inactive' ? 'inactive' : 'active',
            ])
            ->values()
            ->all();
    }

    private function resolveWardenStaff(Organization $organization, mixed $staffId): ?User
    {
        if (!$staffId) {
            return null;
        }

        return User::query()
            ->where('organization_id', $organization->id)
            ->whereNotIn('role', ['super_admin', 'student', 'parent'])
            ->where('status', '!=', 'inactive')
            ->findOrFail($staffId);
    }

    private function getRooms(Organization $organization): array
    {
        return HostelRoom::query()
            ->whereHas('hostel', fn ($query) => $query->where('organization_id', $organization->id))
            ->orderBy('hostel_id')
            ->orderBy('room_number')
            ->get()
            ->map(fn (HostelRoom $room) => [
                'id' => (string) $room->id,
                'hostelId' => (string) $room->hostel_id,
                'roomNumber' => $room->room_number,
                'floor' => $room->floor ?? '',
                'roomType' => $room->room_type,
                'capacity' => (int) $room->capacity,
                'occupied' => (int) $room->occupied,
                'monthlyFee' => (float) $room->monthly_fee,
                'status' => $room->status,
            ])
            ->all();
    }

    private function getBeds(Organization $organization): array
    {
        $activeAllocations = HostelAllocation::query()
            ->where('status', 'active')
            ->whereHas('hostel', fn ($query) => $query->where('organization_id', $organization->id))
            ->with(['student.schoolClass:id,name,section'])
            ->get()
            ->keyBy('bed_id');

        return HostelBed::query()
            ->whereHas('hostel', fn ($query) => $query->where('organization_id', $organization->id))
            ->orderBy('hostel_id')
            ->orderBy('room_id')
            ->orderBy('bed_number')
            ->get()
            ->map(function (HostelBed $bed) use ($activeAllocations) {
                $allocation = $activeAllocations->get($bed->id);

                return [
                    'id' => (string) $bed->id,
                    'hostelId' => (string) $bed->hostel_id,
                    'roomId' => (string) $bed->room_id,
                    'bedNumber' => $bed->bed_number,
                    'status' => $bed->status,
                    'assignedStudentId' => $allocation ? (string) $allocation->student_id : null,
                    'assignedStudentName' => $allocation?->student
                        ? trim(($allocation->student->first_name ?? '') . ' ' . ($allocation->student->last_name ?? ''))
                        : null,
                    'assignedStudentAdmissionNo' => $allocation?->student?->admission_no,
                    'assignedStudentRollNumber' => $allocation?->student?->roll_number,
                    'assignedStudentClass' => $allocation?->student?->schoolClass?->name,
                    'assignedStudentSection' => $allocation?->student?->schoolClass?->section,
                    'allocationDate' => $allocation?->allocation_date?->format('Y-m-d'),
                ];
            })
            ->all();
    }

    private function getFeeStructures(Organization $organization): array
    {
        return HostelFeeStructure::query()
            ->where('organization_id', $organization->id)
            ->orderBy('hostel_id')
            ->orderBy('room_type')
            ->get()
            ->map(fn (HostelFeeStructure $structure) => [
                'id' => (string) $structure->id,
                'hostelId' => (string) $structure->hostel_id,
                'roomType' => $structure->room_type,
                'amount' => (float) $structure->amount,
                'frequency' => $structure->frequency,
                'description' => $structure->description ?? '',
                'status' => $structure->status,
            ])
            ->all();
    }

    private function getHostelComplaints(Organization $organization): array
    {
        $entries = ComplaintEntry::query()
            ->where('organization_id', $organization->id)
            ->where('category', 'Hostel')
            ->with(['student.schoolClass:id,name,section'])
            ->latest('complaint_date')
            ->latest('id')
            ->get();

        $allocationsByStudentId = HostelAllocation::query()
            ->whereIn('student_id', $entries->pluck('student_id')->filter()->unique())
            ->where('status', 'active')
            ->with('hostel:id,name')
            ->latest('allocation_date')
            ->latest('id')
            ->get()
            ->unique('student_id')
            ->keyBy('student_id');

        return $entries
            ->map(function (ComplaintEntry $entry) use ($allocationsByStudentId) {
                $allocation = $entry->student_id ? $allocationsByStudentId->get($entry->student_id) : null;

                return [
                'id' => (string) $entry->id,
                'studentId' => $entry->student_id ? (string) $entry->student_id : null,
                'hostelId' => $allocation?->hostel_id ? (string) $allocation->hostel_id : null,
                'hostelName' => $allocation?->hostel?->name,
                'complainantName' => $entry->complainant_name,
                'phone' => $entry->phone,
                'source' => $entry->source,
                'category' => $entry->category,
                'assignedTo' => $entry->assigned_to,
                'complaintDate' => optional($entry->complaint_date)->format('Y-m-d'),
                'status' => $entry->status,
                'note' => $entry->note,
                'actionTaken' => $entry->action_taken,
                'studentName' => $entry->student
                    ? trim(($entry->student->first_name ?? '') . ' ' . ($entry->student->last_name ?? ''))
                    : null,
                'admissionNumber' => $entry->student?->admission_no,
                'class' => $entry->student?->schoolClass?->name,
                'section' => $entry->student?->schoolClass?->section,
                'createdAt' => optional($entry->created_at)->format('Y-m-d H:i:s'),
                ];
            })
            ->all();
    }

    private function getHostelNotices(Organization $organization): array
    {
        return HostelNotice::query()
            ->where('organization_id', $organization->id)
            ->with(['hostel:id,name', 'creator:id,name'])
            ->latest('publish_date')
            ->latest('id')
            ->get()
            ->map(fn (HostelNotice $notice) => $this->serializeHostelNotice($notice))
            ->all();
    }

    private function getHostelLostFoundItems(Organization $organization): array
    {
        return HostelLostFoundItem::query()
            ->where('organization_id', $organization->id)
            ->with(['hostel:id,name', 'student.schoolClass:id,name,section', 'reporter:id,name'])
            ->latest('reported_date')
            ->latest('id')
            ->get()
            ->map(fn (HostelLostFoundItem $item) => $this->serializeLostFoundItem($item))
            ->all();
    }

    private function getStudentHostelAllocation(Student $student): ?array
    {
        $allocation = HostelAllocation::query()
            ->where('student_id', $student->id)
            ->where('status', 'active')
            ->with([
                'hostel:id,name,type,address,warden_name,warden_phone,status',
                'room:id,room_number,floor,room_type,capacity,status',
                'bed:id,bed_number,status',
            ])
            ->latest('allocation_date')
            ->latest('id')
            ->first();

        if (! $allocation) {
            return null;
        }

        return [
            'id' => (string) $allocation->id,
            'hostelId' => $allocation->hostel_id ? (string) $allocation->hostel_id : null,
            'hostelName' => $allocation->hostel?->name,
            'hostelType' => $allocation->hostel?->type,
            'hostelAddress' => $allocation->hostel?->address,
            'hostelStatus' => $allocation->hostel?->status,
            'wardenName' => $allocation->hostel?->warden_name,
            'wardenPhone' => $allocation->hostel?->warden_phone,
            'roomNumber' => $allocation->room?->room_number,
            'roomType' => $allocation->room?->room_type,
            'roomFloor' => $allocation->room?->floor,
            'roomCapacity' => $allocation->room?->capacity,
            'roomStatus' => $allocation->room?->status,
            'bedNumber' => $allocation->bed?->bed_number,
            'bedStatus' => $allocation->bed?->status,
            'allocationDate' => optional($allocation->allocation_date)->format('Y-m-d'),
            'status' => $allocation->status,
            'remarks' => $allocation->remarks,
        ];
    }

    private function getStudentHostelFees(Student $student): array
    {
        return StudentFee::query()
            ->where('student_id', $student->id)
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'like', 'Hostel Fee%'))
            ->where(function ($query) {
                $query
                    ->whereNull('notes')
                    ->orWhere('notes', 'not like', '%' . self::HOSTEL_FEE_DELETED_NOTE . '%');
            })
            ->with('feeStructure:id,fee_type,fee_type_mr,fee_type_hi')
            ->orderByDesc('due_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (StudentFee $fee) => [
                'id' => (string) $fee->id,
                'feeType' => ($fee->feeStructure?->localized('fee_type') ?: 'Hostel Fee'),
                'amount' => (float) $fee->amount,
                'netAmount' => (float) $fee->net_amount,
                'paidAmount' => (float) $fee->paid_amount,
                'balance' => (float) $fee->balance,
                'status' => $fee->status,
                'dueDate' => optional($fee->due_date)->format('Y-m-d'),
            ])
            ->all();
    }

    private function getStudentHostelComplaints(Student $student): array
    {
        return ComplaintEntry::query()
            ->where('student_id', $student->id)
            ->where('category', 'Hostel')
            ->latest('complaint_date')
            ->latest('id')
            ->get()
            ->map(fn (ComplaintEntry $entry) => [
                'id' => (string) $entry->id,
                'complaintDate' => optional($entry->complaint_date)->format('Y-m-d'),
                'status' => $entry->status,
                'note' => $entry->note,
                'actionTaken' => $entry->action_taken,
                'assignedTo' => $entry->assigned_to,
                'createdAt' => optional($entry->created_at)->format('Y-m-d H:i:s'),
            ])
            ->all();
    }

    private function getStudentHostelNotices(Student $student, ?array $allocation): array
    {
        $hostelId = $allocation['id'] ?? null;

        if ($allocation && isset($allocation['hostelId'])) {
            $hostelId = $allocation['hostelId'];
        }

        return HostelNotice::query()
            ->where('organization_id', $student->organization_id)
            ->where('status', 'active')
            ->whereDate('publish_date', '<=', now()->toDateString())
            ->where(function ($query) use ($hostelId) {
                $query->whereNull('hostel_id');

                if ($hostelId) {
                    $query->orWhere('hostel_id', (int) $hostelId);
                }
            })
            ->with(['hostel:id,name', 'creator:id,name'])
            ->latest('publish_date')
            ->latest('id')
            ->get()
            ->map(fn (HostelNotice $notice) => $this->serializeHostelNotice($notice))
            ->all();
    }

    private function getStudentHostelLostFoundItems(Student $student, ?array $allocation): array
    {
        $hostelId = $allocation['hostelId'] ?? null;

        return HostelLostFoundItem::query()
            ->where('organization_id', $student->organization_id)
            ->where(function ($query) use ($student, $hostelId) {
                $query->where('student_id', $student->id);

                if ($hostelId) {
                    $query->orWhere('hostel_id', (int) $hostelId);
                }

                $query->orWhereNull('hostel_id');
            })
            ->with(['hostel:id,name', 'student.schoolClass:id,name,section', 'reporter:id,name'])
            ->latest('reported_date')
            ->latest('id')
            ->get()
            ->map(fn (HostelLostFoundItem $item) => $this->serializeLostFoundItem($item))
            ->all();
    }

    private function serializeHostelNotice(HostelNotice $notice): array
    {
        return [
            'id' => (string) $notice->id,
            'hostelId' => $notice->hostel_id ? (string) $notice->hostel_id : null,
            'hostelName' => $notice->hostel?->name,
            'title' => $notice->title,
            'message' => $notice->message,
            'publishDate' => optional($notice->publish_date)->format('Y-m-d'),
            'status' => $notice->status,
            'createdBy' => $notice->creator?->name,
            'createdAt' => optional($notice->created_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function serializeLostFoundItem(HostelLostFoundItem $item): array
    {
        return [
            'id' => (string) $item->id,
            'hostelId' => $item->hostel_id ? (string) $item->hostel_id : null,
            'hostelName' => $item->hostel?->name,
            'studentId' => $item->student_id ? (string) $item->student_id : null,
            'studentName' => $item->student
                ? trim(($item->student->first_name ?? '') . ' ' . ($item->student->last_name ?? ''))
                : null,
            'admissionNumber' => $item->student?->admission_no,
            'class' => $item->student?->schoolClass?->name,
            'section' => $item->student?->schoolClass?->section,
            'reportedBy' => $item->reporter?->name,
            'itemType' => $item->item_type,
            'itemName' => $item->item_name,
            'location' => $item->location,
            'reportedDate' => optional($item->reported_date)->format('Y-m-d'),
            'description' => $item->description,
            'contact' => $item->contact,
            'status' => $item->status,
            'resolutionNote' => $item->resolution_note,
            'createdAt' => optional($item->created_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function getHostelFeeRecords(Organization $organization, ?int $academicYearId = null): array
    {
        return StudentFee::query()
            ->where('organization_id', $organization->id)
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId))
            ->whereHas('feeStructure', fn ($query) => $query->where('fee_type', 'like', 'Hostel Fee%'))
            ->where(function ($query) {
                $query->whereNull('notes')
                    ->orWhere('notes', 'not like', '%' . self::HOSTEL_FEE_DELETED_NOTE . '%');
            })
            ->with([
                'student.schoolClass:id,name,section',
                'feeStructure:id,fee_type,fee_type_mr,fee_type_hi',
                'payments' => fn ($query) => $query->with('collector:id,name')->orderByDesc('payment_date')->orderByDesc('id'),
            ])
            ->orderByDesc('due_date')
            ->orderByDesc('id')
            ->get()
            ->map(function (StudentFee $fee) {
                $latestActivePayment = $fee->payments->firstWhere('status', 'success');

                return [
                    'id' => (string) $fee->id,
                    'studentId' => (string) $fee->student_id,
                    'studentName' => trim(($fee->student?->first_name ?? '') . ' ' . ($fee->student?->last_name ?? '')),
                    'admissionNumber' => $fee->student?->admission_no ?? '',
                    'class' => $fee->student?->schoolClass?->name ?? '',
                    'section' => $fee->student?->schoolClass?->section ?? '',
                    'hostelRoom' => $fee->student?->hostel_room ?? '',
                    'feeType' => ($fee->feeStructure?->localized('fee_type') ?: 'Hostel Fee'),
                    'amount' => (float) $fee->amount,
                    'paidAmount' => (float) $fee->paid_amount,
                    'dueAmount' => (float) $fee->balance,
                    'status' => $fee->status,
                    'dueDate' => optional($fee->due_date)->format('Y-m-d'),
                    'latestPaymentId' => $latestActivePayment ? (string) $latestActivePayment->id : null,
                    'latestPaymentAmount' => $latestActivePayment ? (float) $latestActivePayment->amount : null,
                    'latestPaymentDate' => $latestActivePayment?->payment_date ? $latestActivePayment->payment_date->format('Y-m-d') : null,
                    'latestPaymentMethod' => $latestActivePayment?->payment_method,
                    'latestTransactionId' => $latestActivePayment?->transaction_id,
                    'latestReceiptNumber' => $latestActivePayment?->receipt_number,
                    'latestCollectedBy' => $latestActivePayment?->collector?->name,
                    'payments' => $fee->payments
                        ->values()
                        ->map(fn (FeePayment $payment) => [
                            'id' => (string) $payment->id,
                            'amount' => (float) $payment->amount,
                            'paymentDate' => optional($payment->payment_date)->format('Y-m-d'),
                            'paymentMethod' => $payment->payment_method,
                            'transactionId' => $payment->transaction_id,
                            'receiptNumber' => $payment->receipt_number,
                            'collectedBy' => $payment->collector?->name,
                            'status' => $payment->status === 'refunded' ? 'reverted' : 'active',
                            'revertedAt' => optional($payment->reverted_at)->format('Y-m-d'),
                            'revertReason' => $payment->revert_reason,
                        ])
                        ->all(),
                ];
            })
            ->all();
    }

    private function getStudents(Organization $organization): array
    {
        return Student::query()
            ->forCurrentSession($organization->id)
            ->with('schoolClass:id,name,section')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'admission_no' => $student->admission_no,
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
                'roll_number' => $student->roll_number,
                'hostel_required' => (bool) $student->hostel_required,
                'status' => $student->status,
            ])
            ->all();
    }

    private function getClassRecords(Organization $organization, ?int $academicYearId = null): array
    {
        return SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId))
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => $schoolClass->id,
                'name' => $schoolClass->name,
                'section' => $schoolClass->section,
            ])
            ->all();
    }

    private function resolveRoomForOrganization(Organization $organization, int $roomId): ?HostelRoom
    {
        return HostelRoom::query()
            ->whereHas('hostel', fn ($query) => $query->where('organization_id', $organization->id))
            ->find($roomId);
    }

    private function requireOrganization(): Organization
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization, 403);

        return $organization;
    }

    private function syncOrganizationHostelFees(Organization $organization): void
    {
        $activeAcademicYearId = $this->getActiveAcademicYearId($organization);

        if (!$activeAcademicYearId) {
            return;
        }

        HostelAllocation::query()
            ->where('status', 'active')
            ->whereHas('hostel', fn ($query) => $query->where('organization_id', $organization->id))
            ->with(['hostel', 'room', 'student'])
            ->get()
            ->each(fn (HostelAllocation $allocation) => $this->syncHostelFeeForAllocation($allocation, $activeAcademicYearId));
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

        if (!$hostelFeeStructure) {
            return;
        }

        $amount = (float) $hostelFeeStructure->amount;

        if ($amount <= 0) {
            return;
        }

        $organization = Organization::query()->find($student->organization_id);

        if (!$organization) {
            return;
        }

        $academicYearId ??= $this->getActiveAcademicYearId($organization);

        if (!$academicYearId) {
            return;
        }

        $feeStructure = $this->ensureHostelFeeStructure($organization, $academicYearId, $student, $hostel, $room, $hostelFeeStructure);
        $allocationDate = $allocation->allocation_date ? $allocation->allocation_date->copy() : now();
        $year = (int) $allocationDate->format('Y');
        $dueDate = $allocationDate->toDateString();

        $studentFee = StudentFee::query()
            ->where('hostel_allocation_id', $allocation->id)
            ->first();

        if ($studentFee && str_contains((string) $studentFee->notes, self::HOSTEL_FEE_DELETED_NOTE)) {
            return;
        }

        $paidAmount = (float) ($studentFee?->paid_amount ?? 0);
        $discount = (float) ($studentFee?->discount ?? 0);
        $fine = (float) ($studentFee?->fine ?? 0);
        $netAmount = max(0, $amount - $discount + $fine);
        $balance = max(0, $netAmount - $paidAmount);

        if (!$studentFee) {
            StudentFee::query()->create([
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

    private function ensureHostelFeeStructure(Organization $organization, int $academicYearId, Student $student, Hostel $hostel, HostelRoom $room, HostelFeeStructure $hostelFeeStructure): FeeStructure
    {
        $roomLabel = ucfirst($room->room_type);
        $feeType = sprintf('Hostel Fee - %s / %s', $hostel->name, $roomLabel);

        $feeStructure = FeeStructure::query()->firstOrNew([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'class_id' => $student->class_id,
            'fee_type' => $feeType,
        ]);

        $feeStructure->fill([
            'amount' => $hostelFeeStructure->amount,
            'frequency' => 'one-time',
            'description' => $hostelFeeStructure->description ?: sprintf('Auto-synced one-time hostel fee for %s (%s).', $hostel->name, $roomLabel),
            'is_compulsory' => true,
            'status' => 'active',
        ]);
        $feeStructure->save();

        return $feeStructure;
    }

    private function findApplicableHostelFeeStructure(int $organizationId, Hostel $hostel, HostelRoom $room): ?HostelFeeStructure
    {
        return HostelFeeStructure::query()
            ->where('organization_id', $organizationId)
            ->where('hostel_id', $hostel->id)
            ->where('room_type', $room->room_type)
            ->where('status', 'active')
            ->latest('id')
            ->first();
    }

    private function getActiveAcademicYearId(Organization $organization): ?int
    {
        return $organization->selectedAcademicYear()?->id;
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

    private function generateReceiptNumber(): string
    {
        do {
            $receipt = 'RCT-' . now()->format('Ymd') . '-' . random_int(1000, 9999);
        } while (FeePayment::query()->where('receipt_number', $receipt)->exists());

        return $receipt;
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'student') {
            $studentOrganizationId = Student::query()
                ->where(function ($query) use ($user) {
                    $query
                        ->where('user_id', $user->id)
                        ->orWhere('email', $user->email);
                })
                ->value('organization_id');

            if ($studentOrganizationId) {
                $user->forceFill(['organization_id' => $studentOrganizationId])->save();
                $user->organization_id = $studentOrganizationId;

                return Organization::query()->find($studentOrganizationId);
            }
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

    private function resolveStudentForUser(User $user, ?Organization $organization): ?Student
    {
        if (! $organization) {
            return null;
        }

        return Student::query()
            ->with('schoolClass:id,name,section')
            ->where('organization_id', $organization->id)
            ->where(function ($query) use ($user) {
                $query
                    ->where('user_id', $user->id)
                    ->orWhere('email', $user->email);
            })
            ->first();
    }
}
