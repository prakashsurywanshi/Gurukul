<?php

namespace App\Http\Controllers;

use App\Models\ComplaintEntry;
use App\Models\FrontOfficeAdmissionEnquiry;
use App\Models\Organization;
use App\Models\PhoneCallLogEntry;
use App\Models\PostalDeliveryEntry;
use App\Models\PostalDispatchEntry;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Models\VisitorRegisterEntry;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FrontOfficeController extends Controller
{
    private const COMPLAINT_STAFF_ROLES = ['super_admin', 'admin', 'teacher', 'receptionist', 'accountant', 'librarian'];

    public function admissionEnquiry()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        try {
            $inquiries = FrontOfficeAdmissionEnquiry::query()
                ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
                ->latest()
                ->get()
                ->map(fn (FrontOfficeAdmissionEnquiry $inquiry) => [
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
            $tableReady = true;
        } catch (QueryException $exception) {
            $schemaNotReady = str_contains($exception->getMessage(), 'front_office_admission_enquiries');

            if (! $schemaNotReady) {
                throw $exception;
            }

            $inquiries = collect();
            $tableReady = false;
        }

        return inertia('dashboard/front-office/AdmissionEnquiry', [
            'user' => $user,
            'inquiries' => $inquiries,
            'tableReady' => $tableReady,
            'classOptions' => $organization ? $this->getClassOptions($organization->id) : [],
        ]);
    }

    public function storeAdmissionEnquiry(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        $validated = $this->validateAdmissionInquiry($request);

        FrontOfficeAdmissionEnquiry::query()->create([
            ...$validated,
            'organization_id' => $organization?->id,
        ]);

        return redirect()
            ->route('admission-enquiry')
            ->with('success', 'Admission enquiry created successfully.');
    }

    public function updateAdmissionEnquiry(Request $request, FrontOfficeAdmissionEnquiry $admissionInquiry): RedirectResponse
    {
        $this->ensureInquiryBelongsToUserOrganization($admissionInquiry, Auth::user());
        $validated = $this->validateAdmissionInquiry($request);

        $admissionInquiry->update($validated);

        return redirect()
            ->route('admission-enquiry')
            ->with('success', 'Admission enquiry updated successfully.');
    }

    public function destroyAdmissionEnquiry(FrontOfficeAdmissionEnquiry $admissionInquiry): RedirectResponse
    {
        $this->ensureInquiryBelongsToUserOrganization($admissionInquiry, Auth::user());

        $admissionInquiry->delete();

        return redirect()
            ->route('admission-enquiry')
            ->with('success', 'Admission enquiry deleted successfully.');
    }

    public function visitorRegister()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        try {
            $visitorEntries = VisitorRegisterEntry::query()
                ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
                ->latest()
                ->get()
                ->map(fn (VisitorRegisterEntry $entry) => [
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
            $tableReady = true;
        } catch (QueryException $exception) {
            $schemaNotReady = str_contains($exception->getMessage(), 'visitor_register_entries');

            if (! $schemaNotReady) {
                throw $exception;
            }

            $visitorEntries = collect();
            $tableReady = false;
        }

        return inertia('dashboard/front-office/VisitorRegister', [
            'user' => $user,
            'entries' => $visitorEntries,
            'tableReady' => $tableReady,
        ]);
    }

    public function storeVisitorRegister(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        $validated = $this->validateVisitorRegister($request);

        VisitorRegisterEntry::query()->create([
            ...$validated,
            'organization_id' => $organization?->id,
        ]);

        return redirect()
            ->route('visitor-register')
            ->with('success', 'Visitor entry created successfully.');
    }

    public function updateVisitorRegister(Request $request, VisitorRegisterEntry $visitorRegisterEntry): RedirectResponse
    {
        $this->ensureVisitorEntryBelongsToUserOrganization($visitorRegisterEntry, Auth::user());
        $validated = $this->validateVisitorRegister($request);

        $visitorRegisterEntry->update($validated);

        return redirect()
            ->route('visitor-register')
            ->with('success', 'Visitor entry updated successfully.');
    }

    public function destroyVisitorRegister(VisitorRegisterEntry $visitorRegisterEntry): RedirectResponse
    {
        $this->ensureVisitorEntryBelongsToUserOrganization($visitorRegisterEntry, Auth::user());

        $visitorRegisterEntry->delete();

        return redirect()
            ->route('visitor-register')
            ->with('success', 'Visitor entry deleted successfully.');
    }

    public function phoneCallLog()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        try {
            $callEntries = PhoneCallLogEntry::query()
                ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
                ->latest()
                ->get()
                ->map(fn (PhoneCallLogEntry $entry) => [
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
            $tableReady = true;
        } catch (QueryException $exception) {
            $schemaNotReady = str_contains($exception->getMessage(), 'phone_call_log_entries');

            if (! $schemaNotReady) {
                throw $exception;
            }

            $callEntries = collect();
            $tableReady = false;
        }

        return inertia('dashboard/front-office/PhoneCallLog', [
            'user' => $user,
            'entries' => $callEntries,
            'tableReady' => $tableReady,
        ]);
    }

    public function storePhoneCallLog(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        $validated = $this->validatePhoneCallLog($request);

        PhoneCallLogEntry::query()->create([
            ...$validated,
            'organization_id' => $organization?->id,
        ]);

        return redirect()
            ->route('phone-call-log')
            ->with('success', 'Phone call entry created successfully.');
    }

    public function updatePhoneCallLog(Request $request, PhoneCallLogEntry $phoneCallLogEntry): RedirectResponse
    {
        $this->ensurePhoneCallEntryBelongsToUserOrganization($phoneCallLogEntry, Auth::user());
        $validated = $this->validatePhoneCallLog($request);

        $phoneCallLogEntry->update($validated);

        return redirect()
            ->route('phone-call-log')
            ->with('success', 'Phone call entry updated successfully.');
    }

    public function destroyPhoneCallLog(PhoneCallLogEntry $phoneCallLogEntry): RedirectResponse
    {
        $this->ensurePhoneCallEntryBelongsToUserOrganization($phoneCallLogEntry, Auth::user());

        $phoneCallLogEntry->delete();

        return redirect()
            ->route('phone-call-log')
            ->with('success', 'Phone call entry deleted successfully.');
    }

    public function postalDispatch()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        try {
            $dispatchEntries = PostalDispatchEntry::query()
                ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
                ->latest()
                ->get()
                ->map(fn (PostalDispatchEntry $entry) => [
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
            $tableReady = true;
        } catch (QueryException $exception) {
            $schemaNotReady = str_contains($exception->getMessage(), 'postal_dispatch_entries');

            if (! $schemaNotReady) {
                throw $exception;
            }

            $dispatchEntries = collect();
            $tableReady = false;
        }

        return inertia('dashboard/front-office/PostalDispatch', [
            'user' => $user,
            'entries' => $dispatchEntries,
            'tableReady' => $tableReady,
        ]);
    }

    public function storePostalDispatch(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        $validated = $this->validatePostalDispatch($request);

        PostalDispatchEntry::query()->create([
            ...$validated,
            'organization_id' => $organization?->id,
        ]);

        return redirect()
            ->route('postal-dispatch')
            ->with('success', 'Postal dispatch entry created successfully.');
    }

    public function updatePostalDispatch(Request $request, PostalDispatchEntry $postalDispatchEntry): RedirectResponse
    {
        $this->ensurePostalDispatchBelongsToUserOrganization($postalDispatchEntry, Auth::user());
        $validated = $this->validatePostalDispatch($request);

        $postalDispatchEntry->update($validated);

        return redirect()
            ->route('postal-dispatch')
            ->with('success', 'Postal dispatch entry updated successfully.');
    }

    public function destroyPostalDispatch(PostalDispatchEntry $postalDispatchEntry): RedirectResponse
    {
        $this->ensurePostalDispatchBelongsToUserOrganization($postalDispatchEntry, Auth::user());

        $postalDispatchEntry->delete();

        return redirect()
            ->route('postal-dispatch')
            ->with('success', 'Postal dispatch entry deleted successfully.');
    }

    public function postalDelivery()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        try {
            $deliveryEntries = PostalDeliveryEntry::query()
                ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
                ->latest()
                ->get()
                ->map(fn (PostalDeliveryEntry $entry) => [
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
            $tableReady = true;
        } catch (QueryException $exception) {
            $schemaNotReady = str_contains($exception->getMessage(), 'postal_delivery_entries');

            if (! $schemaNotReady) {
                throw $exception;
            }

            $deliveryEntries = collect();
            $tableReady = false;
        }

        return inertia('dashboard/front-office/PostalDelivery', [
            'user' => $user,
            'entries' => $deliveryEntries,
            'tableReady' => $tableReady,
        ]);
    }

    public function storePostalDelivery(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        $validated = $this->validatePostalDelivery($request);

        PostalDeliveryEntry::query()->create([
            ...$validated,
            'organization_id' => $organization?->id,
        ]);

        return redirect()
            ->route('postal-delivery')
            ->with('success', 'Postal delivery entry created successfully.');
    }

    public function updatePostalDelivery(Request $request, PostalDeliveryEntry $postalDeliveryEntry): RedirectResponse
    {
        $this->ensurePostalDeliveryBelongsToUserOrganization($postalDeliveryEntry, Auth::user());
        $validated = $this->validatePostalDelivery($request);

        $postalDeliveryEntry->update($validated);

        return redirect()
            ->route('postal-delivery')
            ->with('success', 'Postal delivery entry updated successfully.');
    }

    public function destroyPostalDelivery(PostalDeliveryEntry $postalDeliveryEntry): RedirectResponse
    {
        $this->ensurePostalDeliveryBelongsToUserOrganization($postalDeliveryEntry, Auth::user());

        $postalDeliveryEntry->delete();

        return redirect()
            ->route('postal-delivery')
            ->with('success', 'Postal delivery entry deleted successfully.');
    }

    public function complains()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $user->role === 'student' ? $this->resolveStudentForUser($user, $organization) : null;

        abort_unless(
            $user->role === 'student' || in_array($user->role, self::COMPLAINT_STAFF_ROLES, true),
            403
        );

        try {
            $complaintEntries = ComplaintEntry::query()
                ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
                ->when(
                    $user->role === 'student',
                    fn ($query) => $query->where(function ($studentQuery) use ($user, $student) {
                        $studentQuery->where('submitted_by_user_id', $user->id);

                        if ($student) {
                            $studentQuery->orWhere('student_id', $student->id);
                        }
                    })
                )
                ->latest()
                ->get()
                ->map(fn (ComplaintEntry $entry) => [
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
            $tableReady = true;
        } catch (QueryException $exception) {
            $schemaNotReady = str_contains($exception->getMessage(), 'complaint_entries');

            if (! $schemaNotReady) {
                throw $exception;
            }

            $complaintEntries = collect();
            $tableReady = false;
        }

        if ($user->role === 'student') {
            return inertia('dashboard/StudentComplains', [
                'user' => $user,
                'entries' => $complaintEntries,
                'tableReady' => $tableReady,
                'studentRecord' => $student ? $this->serializeStudent($student) : null,
            ]);
        }

        return inertia('dashboard/front-office/Complains', [
            'user' => $user,
            'entries' => $complaintEntries,
            'tableReady' => $tableReady,
        ]);
    }

    public function storeComplaint(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($user->role === 'student' || in_array($user->role, self::COMPLAINT_STAFF_ROLES, true), 403);

        if ($user->role === 'student') {
            $student = $this->resolveStudentForUser($user, $organization);

            abort_unless($organization && $student, 403);

            $validated = $this->validateStudentComplaint($request);

            ComplaintEntry::query()->create([
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

            return redirect()
                ->route($request->input('return_to') === 'student-hostel' ? 'student.hostel' : 'complains')
                ->with('success', 'Complaint submitted successfully.');
        }

        $validated = $this->validateComplaint($request);

        ComplaintEntry::query()->create([
            ...$validated,
            'organization_id' => $organization?->id,
            'submitted_by_user_id' => $user->id,
        ]);

        return redirect()
            ->route('complains')
            ->with('success', 'Complaint entry created successfully.');
    }

    public function updateComplaint(Request $request, ComplaintEntry $complaintEntry): RedirectResponse
    {
        $user = Auth::user();

        abort_unless(in_array($user->role, self::COMPLAINT_STAFF_ROLES, true), 403);

        $this->ensureComplaintBelongsToUserOrganization($complaintEntry, $user);
        $validated = $this->validateComplaint($request);

        $complaintEntry->update($validated);

        return redirect()
            ->route('complains')
            ->with('success', 'Complaint entry updated successfully.');
    }

    public function destroyComplaint(ComplaintEntry $complaintEntry): RedirectResponse
    {
        $user = Auth::user();

        abort_unless(in_array($user->role, self::COMPLAINT_STAFF_ROLES, true), 403);

        $this->ensureComplaintBelongsToUserOrganization($complaintEntry, $user);

        $complaintEntry->delete();

        return redirect()
            ->route('complains')
            ->with('success', 'Complaint entry deleted successfully.');
    }

    private function validateAdmissionInquiry(Request $request): array
    {
        return $request->validate([
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
    }

    private function validateVisitorRegister(Request $request): array
    {
        return $request->validate([
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
    }

    private function validatePhoneCallLog(Request $request): array
    {
        return $request->validate([
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
    }

    private function validatePostalDispatch(Request $request): array
    {
        return $request->validate([
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
    }

    private function validatePostalDelivery(Request $request): array
    {
        return $request->validate([
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
    }

    private function validateComplaint(Request $request): array
    {
        return $request->validate([
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
    }

    private function validateStudentComplaint(Request $request): array
    {
        return $request->validate([
            'phone' => ['nullable', 'string', 'max:20'],
            'category' => ['required', 'string', 'max:100'],
            'complaint_date' => ['required', 'date'],
            'note' => ['required', 'string', 'max:1000'],
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

    private function ensureInquiryBelongsToUserOrganization(FrontOfficeAdmissionEnquiry $admissionInquiry, User $user): void
    {
        $organization = $this->resolveOrganizationForUser($user);

        if ($organization && $admissionInquiry->organization_id !== null && $admissionInquiry->organization_id !== $organization->id) {
            abort(403);
        }
    }

    private function ensureVisitorEntryBelongsToUserOrganization(VisitorRegisterEntry $visitorRegisterEntry, User $user): void
    {
        $organization = $this->resolveOrganizationForUser($user);

        if ($organization && $visitorRegisterEntry->organization_id !== null && $visitorRegisterEntry->organization_id !== $organization->id) {
            abort(403);
        }
    }

    private function ensurePhoneCallEntryBelongsToUserOrganization(PhoneCallLogEntry $phoneCallLogEntry, User $user): void
    {
        $organization = $this->resolveOrganizationForUser($user);

        if ($organization && $phoneCallLogEntry->organization_id !== null && $phoneCallLogEntry->organization_id !== $organization->id) {
            abort(403);
        }
    }

    private function ensurePostalDispatchBelongsToUserOrganization(PostalDispatchEntry $postalDispatchEntry, User $user): void
    {
        $organization = $this->resolveOrganizationForUser($user);

        if ($organization && $postalDispatchEntry->organization_id !== null && $postalDispatchEntry->organization_id !== $organization->id) {
            abort(403);
        }
    }

    private function ensurePostalDeliveryBelongsToUserOrganization(PostalDeliveryEntry $postalDeliveryEntry, User $user): void
    {
        $organization = $this->resolveOrganizationForUser($user);

        if ($organization && $postalDeliveryEntry->organization_id !== null && $postalDeliveryEntry->organization_id !== $organization->id) {
            abort(403);
        }
    }

    private function ensureComplaintBelongsToUserOrganization(ComplaintEntry $complaintEntry, User $user): void
    {
        $organization = $this->resolveOrganizationForUser($user);

        if ($organization && $complaintEntry->organization_id !== null && $complaintEntry->organization_id !== $organization->id) {
            abort(403);
        }
    }

    private function serializeStudent(Student $student): array
    {
        return [
            'id' => (string) $student->id,
            'admission_no' => $student->admission_no,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'phone' => $student->phone,
            'class' => $student->schoolClass?->name,
            'section' => $student->schoolClass?->section,
        ];
    }

    private function resolveStudentForUser(User $user, ?Organization $organization): ?Student
    {
        if (! $organization) {
            return null;
        }

        return Student::query()
            ->where('organization_id', $organization->id)
            ->where(function ($query) use ($user) {
                $query
                    ->where('user_id', $user->id)
                    ->orWhere('email', $user->email);
            })
            ->with('schoolClass:id,name,section')
            ->first();
    }

    private function getClassOptions(int $organizationId): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organizationId)
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => $schoolClass->id,
                'label' => trim($schoolClass->name),
                'value' => trim($schoolClass->name),
            ])
            ->unique('value')
            ->values()
            ->all();
    }
}
