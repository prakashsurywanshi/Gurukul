<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComplaintEntry;
use App\Models\FrontOfficeAdmissionEnquiry;
use App\Models\Organization;
use App\Models\PhoneCallLogEntry;
use App\Models\PostalDeliveryEntry;
use App\Models\PostalDispatchEntry;
use App\Models\Student;
use App\Models\User;
use App\Models\VisitorRegisterEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FrontOfficeApiController extends Controller
{
    private const COMPLAINT_STAFF_ROLES = ['super_admin', 'admin', 'teacher', 'receptionist', 'accountant', 'librarian'];

    public function indexAdmissionEnquiries(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $inquiries = FrontOfficeAdmissionEnquiry::query()
            ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
            ->latest()
            ->get()
            ->map(fn ($inquiry) => [
                'id' => $inquiry->id,
                'full_name' => $inquiry->full_name,
                'guardian_name' => $inquiry->guardian_name,
                'email' => $inquiry->email,
                'phone' => $inquiry->phone,
                'class_interested' => $inquiry->class_interested,
                'enquiry_date' => optional($inquiry->enquiry_date)->format('Y-m-d'),
                'source' => $inquiry->source,
                'status' => $inquiry->status,
                'notes' => $inquiry->notes,
                'created_at' => optional($inquiry->created_at)->format('Y-m-d H:i:s'),
            ]);

        return response()->json([
            'success' => true,
            'data' => $inquiries,
        ]);
    }

    public function storeAdmissionEnquiry(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'class_interested' => ['required', 'string', 'max:120'],
            'enquiry_date' => ['required', 'date'],
            'source' => ['required', 'in:walk_in,phone,email,reference,website,other'],
            'status' => ['required', 'in:pending,follow_up,closed'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $inquiry = FrontOfficeAdmissionEnquiry::create([
            ...$validated,
            'organization_id' => $organization?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Admission enquiry created successfully',
            'data' => [
                'id' => $inquiry->id,
                'full_name' => $inquiry->full_name,
                'phone' => $inquiry->phone,
                'class_interested' => $inquiry->class_interested,
                'enquiry_date' => optional($inquiry->enquiry_date)->format('Y-m-d'),
                'status' => $inquiry->status,
            ],
        ], 201);
    }

    public function updateAdmissionEnquiry(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $inquiry = FrontOfficeAdmissionEnquiry::findOrFail($id);
        $this->ensureBelongsToUserOrganization($inquiry, $user);

        $validated = $request->validate([
            'full_name' => ['sometimes', 'string', 'max:255'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:20'],
            'class_interested' => ['sometimes', 'string', 'max:120'],
            'enquiry_date' => ['sometimes', 'date'],
            'source' => ['sometimes', 'in:walk_in,phone,email,reference,website,other'],
            'status' => ['sometimes', 'in:pending,follow_up,closed'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $inquiry->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Admission enquiry updated successfully',
            'data' => [
                'id' => $inquiry->id,
                'full_name' => $inquiry->full_name,
                'phone' => $inquiry->phone,
                'status' => $inquiry->status,
            ],
        ]);
    }

    public function destroyAdmissionEnquiry(int $id): JsonResponse
    {
        $user = Auth::user();
        $inquiry = FrontOfficeAdmissionEnquiry::findOrFail($id);
        $this->ensureBelongsToUserOrganization($inquiry, $user);

        $inquiry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Admission enquiry deleted successfully',
        ]);
    }

    public function indexVisitors(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $entries = VisitorRegisterEntry::query()
            ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
            ->latest()
            ->get()
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'visitor_name' => $entry->visitor_name,
                'purpose' => $entry->purpose,
                'person_to_meet' => $entry->person_to_meet,
                'contact' => $entry->contact,
                'id_proof' => $entry->id_proof,
                'entry_date' => optional($entry->entry_date)->format('Y-m-d'),
                'entry_time' => $entry->entry_time,
                'exit_time' => $entry->exit_time,
                'note' => $entry->note,
                'created_at' => optional($entry->created_at)->format('Y-m-d H:i:s'),
            ]);

        return response()->json([
            'success' => true,
            'data' => $entries,
        ]);
    }

    public function storeVisitor(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $validated = $request->validate([
            'visitor_name' => ['required', 'string', 'max:255'],
            'purpose' => ['required', 'string', 'max:255'],
            'person_to_meet' => ['nullable', 'string', 'max:255'],
            'contact' => ['nullable', 'string', 'max:20'],
            'id_proof' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['required', 'date'],
            'entry_time' => ['nullable', 'string', 'max:20'],
            'exit_time' => ['nullable', 'string', 'max:20'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry = VisitorRegisterEntry::create([
            ...$validated,
            'organization_id' => $organization?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Visitor entry created successfully',
            'data' => [
                'id' => $entry->id,
                'visitor_name' => $entry->visitor_name,
                'purpose' => $entry->purpose,
                'entry_date' => optional($entry->entry_date)->format('Y-m-d'),
                'entry_time' => $entry->entry_time,
            ],
        ], 201);
    }

    public function updateVisitor(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $entry = VisitorRegisterEntry::findOrFail($id);
        $this->ensureBelongsToUserOrganization($entry, $user);

        $validated = $request->validate([
            'visitor_name' => ['sometimes', 'string', 'max:255'],
            'purpose' => ['sometimes', 'string', 'max:255'],
            'person_to_meet' => ['nullable', 'string', 'max:255'],
            'contact' => ['nullable', 'string', 'max:20'],
            'id_proof' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['sometimes', 'date'],
            'entry_time' => ['nullable', 'string', 'max:20'],
            'exit_time' => ['nullable', 'string', 'max:20'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Visitor entry updated successfully',
            'data' => [
                'id' => $entry->id,
                'visitor_name' => $entry->visitor_name,
                'purpose' => $entry->purpose,
            ],
        ]);
    }

    public function destroyVisitor(int $id): JsonResponse
    {
        $user = Auth::user();
        $entry = VisitorRegisterEntry::findOrFail($id);
        $this->ensureBelongsToUserOrganization($entry, $user);

        $entry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Visitor entry deleted successfully',
        ]);
    }

    public function indexPhoneCalls(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $entries = PhoneCallLogEntry::query()
            ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
            ->latest()
            ->get()
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'caller_name' => $entry->caller_name,
                'phone' => $entry->phone,
                'call_type' => $entry->call_type,
                'purpose' => $entry->purpose,
                'call_date' => optional($entry->call_date)->format('Y-m-d'),
                'call_time' => $entry->call_time,
                'duration' => $entry->duration,
                'follow_up_date' => optional($entry->follow_up_date)->format('Y-m-d'),
                'note' => $entry->note,
                'created_at' => optional($entry->created_at)->format('Y-m-d H:i:s'),
            ]);

        return response()->json([
            'success' => true,
            'data' => $entries,
        ]);
    }

    public function storePhoneCall(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $validated = $request->validate([
            'caller_name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'call_type' => ['required', 'in:incoming,outgoing'],
            'purpose' => ['required', 'string', 'max:255'],
            'call_date' => ['required', 'date'],
            'call_time' => ['nullable', 'string', 'max:20'],
            'duration' => ['nullable', 'string', 'max:50'],
            'follow_up_date' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry = PhoneCallLogEntry::create([
            ...$validated,
            'organization_id' => $organization?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Phone call entry created successfully',
            'data' => [
                'id' => $entry->id,
                'caller_name' => $entry->caller_name,
                'phone' => $entry->phone,
                'call_type' => $entry->call_type,
                'call_date' => optional($entry->call_date)->format('Y-m-d'),
                'status' => 'completed',
            ],
        ], 201);
    }

    public function updatePhoneCall(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $entry = PhoneCallLogEntry::findOrFail($id);
        $this->ensureBelongsToUserOrganization($entry, $user);

        $validated = $request->validate([
            'caller_name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'call_type' => ['sometimes', 'in:incoming,outgoing'],
            'purpose' => ['sometimes', 'string', 'max:255'],
            'call_date' => ['sometimes', 'date'],
            'call_time' => ['nullable', 'string', 'max:20'],
            'duration' => ['nullable', 'string', 'max:50'],
            'follow_up_date' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Phone call entry updated successfully',
            'data' => [
                'id' => $entry->id,
                'caller_name' => $entry->caller_name,
                'purpose' => $entry->purpose,
            ],
        ]);
    }

    public function destroyPhoneCall(int $id): JsonResponse
    {
        $user = Auth::user();
        $entry = PhoneCallLogEntry::findOrFail($id);
        $this->ensureBelongsToUserOrganization($entry, $user);

        $entry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Phone call entry deleted successfully',
        ]);
    }

    public function indexPostalDispatches(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $entries = PostalDispatchEntry::query()
            ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
            ->latest()
            ->get()
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'reference_no' => $entry->reference_no,
                'to_title' => $entry->to_title,
                'address' => $entry->address,
                'from_title' => $entry->from_title,
                'dispatch_type' => $entry->dispatch_type,
                'dispatch_date' => optional($entry->dispatch_date)->format('Y-m-d'),
                'tracking_no' => $entry->tracking_no,
                'status' => $entry->status,
                'note' => $entry->note,
                'created_at' => optional($entry->created_at)->format('Y-m-d H:i:s'),
            ]);

        return response()->json([
            'success' => true,
            'data' => $entries,
        ]);
    }

    public function storePostalDispatch(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $validated = $request->validate([
            'reference_no' => ['nullable', 'string', 'max:255'],
            'to_title' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'from_title' => ['nullable', 'string', 'max:255'],
            'dispatch_type' => ['required', 'string', 'max:100'],
            'dispatch_date' => ['required', 'date'],
            'tracking_no' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:sent,courier_booked,delivered,pending'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry = PostalDispatchEntry::create([
            ...$validated,
            'organization_id' => $organization?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Postal dispatch entry created successfully',
            'data' => [
                'id' => $entry->id,
                'to_title' => $entry->to_title,
                'dispatch_date' => optional($entry->dispatch_date)->format('Y-m-d'),
                'status' => $entry->status,
            ],
        ], 201);
    }

    public function updatePostalDispatch(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $entry = PostalDispatchEntry::findOrFail($id);
        $this->ensureBelongsToUserOrganization($entry, $user);

        $validated = $request->validate([
            'reference_no' => ['nullable', 'string', 'max:255'],
            'to_title' => ['sometimes', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'from_title' => ['nullable', 'string', 'max:255'],
            'dispatch_type' => ['sometimes', 'string', 'max:100'],
            'dispatch_date' => ['sometimes', 'date'],
            'tracking_no' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'in:sent,courier_booked,delivered,pending'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Postal dispatch entry updated successfully',
            'data' => [
                'id' => $entry->id,
                'to_title' => $entry->to_title,
                'status' => $entry->status,
            ],
        ]);
    }

    public function destroyPostalDispatch(int $id): JsonResponse
    {
        $user = Auth::user();
        $entry = PostalDispatchEntry::findOrFail($id);
        $this->ensureBelongsToUserOrganization($entry, $user);

        $entry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Postal dispatch entry deleted successfully',
        ]);
    }

    public function indexPostalDeliveries(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $entries = PostalDeliveryEntry::query()
            ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
            ->latest()
            ->get()
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'reference_no' => $entry->reference_no,
                'from_title' => $entry->from_title,
                'address' => $entry->address,
                'delivery_type' => $entry->delivery_type,
                'received_by' => $entry->received_by,
                'delivery_date' => optional($entry->delivery_date)->format('Y-m-d'),
                'tracking_no' => $entry->tracking_no,
                'status' => $entry->status,
                'note' => $entry->note,
                'created_at' => optional($entry->created_at)->format('Y-m-d H:i:s'),
            ]);

        return response()->json([
            'success' => true,
            'data' => $entries,
        ]);
    }

    public function storePostalDelivery(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $validated = $request->validate([
            'reference_no' => ['nullable', 'string', 'max:255'],
            'from_title' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'delivery_type' => ['required', 'string', 'max:100'],
            'received_by' => ['nullable', 'string', 'max:255'],
            'delivery_date' => ['required', 'date'],
            'tracking_no' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:received,in_process,distributed,pending'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry = PostalDeliveryEntry::create([
            ...$validated,
            'organization_id' => $organization?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Postal delivery entry created successfully',
            'data' => [
                'id' => $entry->id,
                'from_title' => $entry->from_title,
                'delivery_date' => optional($entry->delivery_date)->format('Y-m-d'),
                'status' => $entry->status,
            ],
        ], 201);
    }

    public function updatePostalDelivery(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $entry = PostalDeliveryEntry::findOrFail($id);
        $this->ensureBelongsToUserOrganization($entry, $user);

        $validated = $request->validate([
            'reference_no' => ['nullable', 'string', 'max:255'],
            'from_title' => ['sometimes', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'delivery_type' => ['sometimes', 'string', 'max:100'],
            'received_by' => ['nullable', 'string', 'max:255'],
            'delivery_date' => ['sometimes', 'date'],
            'tracking_no' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'in:received,in_process,distributed,pending'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Postal delivery entry updated successfully',
            'data' => [
                'id' => $entry->id,
                'from_title' => $entry->from_title,
                'status' => $entry->status,
            ],
        ]);
    }

    public function destroyPostalDelivery(int $id): JsonResponse
    {
        $user = Auth::user();
        $entry = PostalDeliveryEntry::findOrFail($id);
        $this->ensureBelongsToUserOrganization($entry, $user);

        $entry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Postal delivery entry deleted successfully',
        ]);
    }

    public function indexComplaints(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless(
            $user->role === 'student' || in_array($user->role, self::COMPLAINT_STAFF_ROLES, true),
            403
        );

        $entries = ComplaintEntry::query()
            ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
            ->when(
                $user->role === 'student',
                fn ($query) => $query->where(function ($q) use ($user, $organization) {
                    $q->where('submitted_by_user_id', $user->id);
                    if ($organization) {
                        $student = Student::query()
                            ->where('organization_id', $organization->id)
                            ->where(function ($sq) use ($user) {
                                $sq->where('user_id', $user->id)->orWhere('email', $user->email);
                            })
                            ->first();
                        if ($student) {
                            $q->orWhere('student_id', $student->id);
                        }
                    }
                })
            )
            ->latest()
            ->get()
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'student_id' => $entry->student_id ? (string) $entry->student_id : null,
                'complainant_name' => $entry->complainant_name,
                'phone' => $entry->phone,
                'source' => $entry->source,
                'category' => $entry->category,
                'assigned_to' => $entry->assigned_to,
                'complaint_date' => optional($entry->complaint_date)->format('Y-m-d'),
                'status' => $entry->status,
                'note' => $entry->note,
                'action_taken' => $entry->action_taken,
                'created_at' => optional($entry->created_at)->format('Y-m-d H:i:s'),
            ]);

        return response()->json([
            'success' => true,
            'data' => $entries,
        ]);
    }

    public function storeComplaint(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless(
            $user->role === 'student' || in_array($user->role, self::COMPLAINT_STAFF_ROLES, true),
            403
        );

        if ($user->role === 'student') {
            abort_unless($organization, 403);

            $student = Student::query()
                ->where('organization_id', $organization->id)
                ->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id)->orWhere('email', $user->email);
                })
                ->first();

            abort_unless($student, 403);

            $validated = $request->validate([
                'phone' => ['nullable', 'string', 'max:20'],
                'category' => ['required', 'string', 'max:100'],
                'complaint_date' => ['required', 'date'],
                'note' => ['required', 'string', 'max:1000'],
            ]);

            $entry = ComplaintEntry::create([
                'organization_id' => $organization->id,
                'student_id' => $student->id,
                'submitted_by_user_id' => $user->id,
                'complainant_name' => trim($student->first_name . ' ' . $student->last_name),
                'phone' => $validated['phone'] ?: ($student->phone ?: null),
                'source' => 'student',
                'category' => $validated['category'],
                'assigned_to' => null,
                'complaint_date' => $validated['complaint_date'],
                'status' => 'open',
                'note' => $validated['note'] ?: null,
                'action_taken' => null,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Complaint submitted successfully',
                'data' => [
                    'id' => $entry->id,
                    'complainant_name' => $entry->complainant_name,
                    'category' => $entry->category,
                    'status' => $entry->status,
                ],
            ], 201);
        }

        $validated = $request->validate([
            'complainant_name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'source' => ['required', 'in:walk_in,phone,email,student,parent,staff,other'],
            'category' => ['required', 'string', 'max:100'],
            'assigned_to' => ['nullable', 'string', 'max:255'],
            'complaint_date' => ['required', 'date'],
            'status' => ['required', 'in:open,in_review,resolved,closed'],
            'note' => ['nullable', 'string', 'max:1000'],
            'action_taken' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry = ComplaintEntry::create([
            ...$validated,
            'organization_id' => $organization?->id,
            'submitted_by_user_id' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Complaint entry created successfully',
            'data' => [
                'id' => $entry->id,
                'complainant_name' => $entry->complainant_name,
                'category' => $entry->category,
                'status' => $entry->status,
            ],
        ], 201);
    }

    public function updateComplaint(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();

        abort_unless(in_array($user->role, self::COMPLAINT_STAFF_ROLES, true), 403);

        $entry = ComplaintEntry::findOrFail($id);
        $this->ensureBelongsToUserOrganization($entry, $user);

        $validated = $request->validate([
            'complainant_name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'source' => ['sometimes', 'in:walk_in,phone,email,student,parent,staff,other'],
            'category' => ['sometimes', 'string', 'max:100'],
            'assigned_to' => ['nullable', 'string', 'max:255'],
            'complaint_date' => ['sometimes', 'date'],
            'status' => ['sometimes', 'in:open,in_review,resolved,closed'],
            'note' => ['nullable', 'string', 'max:1000'],
            'action_taken' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Complaint entry updated successfully',
            'data' => [
                'id' => $entry->id,
                'complainant_name' => $entry->complainant_name,
                'status' => $entry->status,
            ],
        ]);
    }

    public function destroyComplaint(int $id): JsonResponse
    {
        $user = Auth::user();

        abort_unless(in_array($user->role, self::COMPLAINT_STAFF_ROLES, true), 403);

        $entry = ComplaintEntry::findOrFail($id);
        $this->ensureBelongsToUserOrganization($entry, $user);

        $entry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Complaint entry deleted successfully',
        ]);
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

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

        if (! $organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }

    private function ensureBelongsToUserOrganization(Model $model, User $user): void
    {
        $organization = $this->resolveOrganizationForUser($user);

        if ($organization && $model->organization_id !== null && $model->organization_id !== $organization->id) {
            abort(403);
        }
    }
}
