<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Student;
use App\Models\SupportTicket;
use App\Models\SupportTicketReply;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class HelpdeskController extends Controller
{
    private const DEPARTMENTS = ['academics', 'fees', 'transport', 'hostel', 'library', 'other'];
    private const PRIORITIES = ['low', 'medium', 'high'];
    private const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $isStaff = in_array($user->role, ['super_admin', 'admin', 'accountant', 'teacher', 'receptionist', 'librarian'], true);

        if ($isStaff) {
            abort_unless($this->allows($user, 'view'), 403);
        }

        $status = $request->query('status');
        $department = $request->query('department');

        $query = SupportTicket::query()
            ->where('organization_id', $organization->id)
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($department, fn ($q) => $q->where('department', $department))
            ->with([
                'student:id,user_id,admission_no',
                'student.user:id,name',
                'student.schoolClass:id,name',
                'assignee:id,name',
                'creator:id,name',
                'replies' => fn ($q) => $q->orderByDesc('created_at')->limit(50)->with('user:id,name,role'),
            ]);

        if (!$isStaff) {
            $student = Student::query()->where('user_id', $user->id)->first();
            abort_unless($student, 403);
            $query->where('student_id', $student->id);
        }

        $tickets = $query->orderByDesc('created_at')->limit(200)->get()
            ->map(fn (SupportTicket $ticket) => [
                'id' => (string) $ticket->id,
                'subject' => $ticket->subject,
                'department' => $ticket->department,
                'priority' => $ticket->priority,
                'status' => $ticket->status,
                'student' => $ticket->student?->user?->name ?? '—',
                'class' => $ticket->student?->schoolClass?->name ?? '—',
                'created_at' => $ticket->created_at?->toIso8601String(),
                'resolved_at' => $ticket->resolved_at?->toIso8601String(),
                'assignee' => $ticket->assignee?->name,
                'creator_role' => $ticket->creator?->role,
                'replies' => $ticket->replies->map(fn (SupportTicketReply $reply) => [
                    'id' => (string) $reply->id,
                    'message' => $reply->message,
                    'user' => $reply->user?->name ?? '—',
                    'role' => $reply->user?->role,
                    'created_at' => $reply->created_at?->toIso8601String(),
                ])->values()->all(),
            ])
            ->all();

        $staffMembers = $isStaff
            ? User::query()
                ->where('organization_id', $organization->id)
                ->whereIn('role', ['admin', 'accountant', 'teacher', 'receptionist', 'librarian'])
                ->orderBy('name')
                ->limit(300)
                ->get(['id', 'name', 'role'])
                ->map(fn (User $staff) => ['id' => (string) $staff->id, 'label' => $staff->name])
                ->values()
                ->all()
            : [];

        return inertia('dashboard/Helpdesk', [
            'user' => $user,
            'organization' => ['id' => $organization->id, 'name' => $organization->name],
            'tickets' => $tickets,
            'staffMembers' => $staffMembers,
            'isStaff' => $isStaff,
            'canManage' => $isStaff && $this->allows($user, 'edit'),
            'selectedStatus' => $status ? (string) $status : null,
            'selectedDepartment' => $department ? (string) $department : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $isStaff = $this->isStaff($user);

        if ($isStaff) {
            abort_unless($this->allows($user, 'add'), 403);
        } else {
            abort_unless($this->allowsStudentCreate($user, $organization), 403);
        }

        $validated = $request->validate([
            'student_id' => $isStaff ? ['required', 'integer', 'exists:students,id'] : ['nullable', 'integer'],
            'subject' => ['required', 'string', 'max:255'],
            'department' => ['required', Rule::in(self::DEPARTMENTS)],
            'priority' => ['nullable', Rule::in(self::PRIORITIES)],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $studentId = (int) ($validated['student_id'] ?? $this->studentIdForUser($user));
        abort_unless($studentId, 422);

        $ticket = SupportTicket::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $studentId,
            'subject' => $validated['subject'],
            'department' => $validated['department'],
            'priority' => $validated['priority'] ?? 'medium',
            'status' => 'open',
            'assigned_to' => null,
            'created_by' => $user->id,
        ]);

        SupportTicketReply::query()->create([
            'organization_id' => $organization->id,
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'message' => $validated['message'],
        ]);

        return redirect()->route('helpdesk')->with('success', 'Support ticket created.');
    }

    public function reply(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $ticket->organization_id === $organization->id, 403);

        $isOwn = $user->role === 'student' && $ticket->student_id === $this->studentIdForUser($user);
        $isStaff = $this->isStaff($user);

        abort_unless($isOwn || ($isStaff && $this->allows($user, 'edit')), 403);

        $validated = $request->validate(['message' => ['required', 'string', 'max:5000']]);

        SupportTicketReply::query()->create([
            'organization_id' => $organization->id,
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'message' => $validated['message'],
        ]);

        if ($isStaff && $ticket->status === 'open') {
            $ticket->update(['status' => 'in_progress']);
        }

        return redirect()->route('helpdesk')->with('success', 'Reply posted.');
    }

    public function update(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $ticket->organization_id === $organization->id && $this->allows($user, 'edit'), 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(self::STATUSES)],
            'priority' => ['nullable', Rule::in(self::PRIORITIES)],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $ticket->update([
            'status' => $validated['status'],
            'priority' => $validated['priority'] ?? $ticket->priority,
            'assigned_to' => $validated['assigned_to'] ?? null,
            'resolved_at' => in_array($validated['status'], ['resolved', 'closed'], true) ? now() : null,
        ]);

        return redirect()->route('helpdesk')->with('success', 'Ticket updated.');
    }

    private function allows(User $user, string $action): bool
    {
        return app(\App\Services\StaffPermissionService::class)->allows($user, 'Parent Helpdesk', $action);
    }

    private function isStaff(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'accountant', 'teacher', 'receptionist', 'librarian'], true);
    }

    private function allowsStudentCreate(User $user, Organization $organization): bool
    {
        return Student::query()
            ->where('user_id', $user->id)
            ->where('organization_id', $organization->id)
            ->exists();
    }

    private function studentIdForUser(User $user): ?int
    {
        return Student::query()->where('user_id', $user->id)->value('id');
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
        }

        if ($user->role !== 'admin') {
            return null;
        }

        try {
            $organization = Organization::query()->firstOrFail();
            $user->organization_id = $organization->id;
            $user->save();

            return $organization;
        } catch (Throwable) {
            return null;
        }
    }
}