<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\PtmAppointment;
use App\Models\PtmSession;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class PtmController extends Controller
{
    private const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled'];
    private const APPOINTMENT_STATUSES = ['booked', 'checked_in', 'completed', 'absent'];
    private const FOLLOWUP_FILTERS = ['pending', 'completed', 'all'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $sessionId = $request->query('session_id');

        $sessions = PtmSession::query()
            ->where('organization_id', $organization->id)
            ->withCount('appointments')
            ->orderByDesc('date')
            ->limit(100)
            ->get()
            ->map(fn (PtmSession $session) => [
                'id' => (string) $session->id,
                'title' => $session->localized('title'),
                'description' => $session->description,
                'date' => $session->date->format('Y-m-d'),
                'start_time' => $session->start_time,
                'end_time' => $session->end_time,
                'location' => $session->location,
                'status' => $session->status,
                'appointment_count' => (int) $session->appointments_count,
            ])
            ->all();

        $selectedSession = null;

        if ($sessionId) {
            $ptmSession = PtmSession::query()
                ->where('organization_id', $organization->id)
                ->with([
                    'appointments.student:id,organization_id,first_name,last_name,class_id',
                    'appointments.creator:id,name',
                ])
                ->find($sessionId);

            if ($ptmSession) {
                $selectedSession = [
                    'id' => (string) $ptmSession->id,
                    'title' => $ptmSession->localized('title'),
                    'description' => $ptmSession->description,
                    'date' => $ptmSession->date->format('Y-m-d'),
                    'start_time' => $ptmSession->start_time,
                    'end_time' => $ptmSession->end_time,
                    'location' => $ptmSession->location,
                    'status' => $ptmSession->status,
                    'appointments' => $ptmSession->appointments->map(fn (PtmAppointment $appointment) => [
                        'id' => (string) $appointment->id,
                        'slot_time' => $appointment->slot_time,
                        'parent_name' => $appointment->parent_name,
                        'parent_contact' => $appointment->parent_contact,
                        'notes' => $appointment->notes,
                        'remarks' => $appointment->remarks,
                        'follow_up_required' => $appointment->follow_up_required,
                        'follow_up_due' => optional($appointment->follow_up_due)->format('Y-m-d'),
                        'follow_up_completed_at' => optional($appointment->follow_up_completed_at)->format('Y-m-d H:i'),
                        'status' => $appointment->status,
                        'student' => $appointment->student ? [
                            'id' => (string) $appointment->student->id,
                            'name' => trim(($appointment->student->first_name ?? '').' '.($appointment->student->last_name ?? '')),
                            'class' => $appointment->student->schoolClass?->name,
                            'section' => $appointment->student->schoolClass?->section,
                        ] : null,
                        'created_by' => $appointment->creator?->name,
                    ])->values()->all(),
                ];
            }
        }

        $classGroups = Student::query()
            ->forCurrentSession($organization->id)
            ->with('schoolClass:id,name,section')
            ->get()
            ->groupBy(fn (Student $student) => ($student->schoolClass?->name ?? 'Unassigned').' - '.($student->schoolClass?->section ?? '-'))
            ->map(fn ($group, $label) => [
                'label' => $label,
                'students' => $group->map(fn (Student $student) => [
                    'id' => (string) $student->id,
                    'name' => trim(($student->first_name ?? '').' '.($student->last_name ?? '')),
                ])->values()->all(),
            ])
            ->values()
            ->all();

        return inertia('dashboard/PtmSessions', [
            'user' => $user,
            'organization' => $organization,
            'sessions' => $sessions,
            'selectedSession' => $selectedSession,
            'classGroups' => $classGroups,
        ]);
    }

    public function guide()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/PtmGuide', ['user' => $user]);
    }

    public function record(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $sessions = PtmSession::query()
            ->where('organization_id', $organization->id)
            ->where('status', '!=', 'cancelled')
            ->with('appointments.student:id,organization_id,first_name,last_name,class_id')
            ->orderByDesc('date')
            ->limit(60)
            ->get()
            ->map(function (PtmSession $session) {
                $appointments = $session->appointments;

                return [
                    'id' => $session->id,
                    'title' => $session->localized('title'),
                    'date' => $session->date->format('Y-m-d'),
                    'start_time' => $session->start_time,
                    'status' => $session->status,
                    'appointmentCount' => $appointments->count(),
                    'appointments' => $appointments->map(fn (PtmAppointment $appointment) => [
                        'id' => $appointment->id,
                        'slot_time' => $appointment->slot_time,
                        'parent_name' => $appointment->parent_name,
                        'status' => $appointment->status,
                        'remarks' => $appointment->remarks,
                        'follow_up_required' => $appointment->follow_up_required,
                        'follow_up_due' => optional($appointment->follow_up_due)->format('Y-m-d'),
                        'student' => $appointment->student ? [
                            'id' => (string) $appointment->student->id,
                            'name' => trim(($appointment->student->first_name ?? '').' '.($appointment->student->last_name ?? '')),
                            'class' => $appointment->student->schoolClass?->name,
                            'section' => $appointment->student->schoolClass?->section,
                        ] : null,
                    ])->sortBy('slot_time')->values()->all(),
                ];
            })
            ->values()
            ->all();

        return inertia('dashboard/PtmRecord', [
            'user' => $user,
            'sessions' => $sessions,
        ]);
    }

    public function followups(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $filter = in_array($request->query('status'), self::FOLLOWUP_FILTERS, true)
            ? $request->query('status')
            : 'pending';

        $appointments = PtmAppointment::query()
            ->where('organization_id', $organization->id)
            ->where('follow_up_required', true)
            ->when($filter === 'pending', fn ($query) => $query->whereNull('follow_up_completed_at'))
            ->when($filter === 'completed', fn ($query) => $query->whereNotNull('follow_up_completed_at'))
            ->with('student:id,organization_id,first_name,last_name,class_id')
            ->with('session')
            ->orderBy('follow_up_due')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn (PtmAppointment $appointment) => [
                'id' => $appointment->id,
                'status' => $appointment->status,
                'remarks' => $appointment->remarks,
                'follow_up_due' => optional($appointment->follow_up_due)->format('Y-m-d'),
                'follow_up_completed_at' => optional($appointment->follow_up_completed_at)->format('Y-m-d H:i'),
                'session_title' => $appointment->session?->localized('title'),
                'session_date' => optional($appointment->session?->date)->format('Y-m-d'),
                'student' => $appointment->student ? [
                    'id' => (string) $appointment->student->id,
                    'name' => trim(($appointment->student->first_name ?? '').' '.($appointment->student->last_name ?? '')),
                    'class' => $appointment->student->schoolClass?->name,
                    'section' => $appointment->student->schoolClass?->section,
                ] : null,
            ])
            ->values()
            ->all();

        $pendingCount = PtmAppointment::query()
            ->where('organization_id', $organization->id)
            ->where('follow_up_required', true)
            ->whereNull('follow_up_completed_at')
            ->count();

        $completedCount = PtmAppointment::query()
            ->where('organization_id', $organization->id)
            ->where('follow_up_required', true)
            ->whereNotNull('follow_up_completed_at')
            ->count();

        return inertia('dashboard/PtmFollowups', [
            'user' => $user,
            'appointments' => $appointments,
            'filter' => $filter,
            'summary' => [
                'pending' => $pendingCount,
                'completed' => $completedCount,
            ],
        ]);
    }

    public function reports(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $sessions = PtmSession::query()
            ->where('organization_id', $organization->id)
            ->with('appointments:id,ptm_session_id,remarks,follow_up_required,follow_up_completed_at,status')
            ->orderByDesc('date')
            ->limit(200)
            ->get();

        $appointments = $sessions->flatMap(fn (PtmSession $session) => $session->appointments);

        $present = $appointments->whereIn('status', ['checked_in', 'completed'])->count();
        $absent = $appointments->where('status', 'absent')->count();
        $pendingFollowUps = $appointments
            ->filter(fn (PtmAppointment $appointment) => $appointment->follow_up_required && $appointment->follow_up_completed_at === null)
            ->count();

        $sessionRows = $sessions->map(function (PtmSession $session) {
            $apps = $session->appointments;
            $present = $apps->whereIn('status', ['checked_in', 'completed'])->count();
            $absent = $apps->where('status', 'absent')->count();
            $remarks = $apps->filter(fn (PtmAppointment $appointment) => $appointment->remarks !== null && $appointment->remarks !== '')->count();
            $followUps = $apps->filter(fn (PtmAppointment $appointment) => $appointment->follow_up_required && $appointment->follow_up_completed_at === null)->count();

            return [
                'id' => (string) $session->id,
                'title' => $session->localized('title'),
                'date' => $session->date->format('Y-m-d'),
                'start_time' => $session->start_time,
                'status' => $session->status,
                'total' => $apps->count(),
                'present' => $present,
                'absent' => $absent,
                'remarks' => $remarks,
                'followUps' => $followUps,
            ];
        })->values()->all();

        $totalAppointments = $appointments->count();
        $attendanceRate = $totalAppointments > 0 ? round((100 * $present) / $totalAppointments) : 0;

        return inertia('dashboard/PtmReports', [
            'user' => $user,
            'summary' => [
                'sessions' => (int) $sessions->count(),
                'completedSessions' => (int) $sessions->where('status', 'completed')->count(),
                'appointments' => (int) $totalAppointments,
                'present' => $present,
                'absent' => $absent,
                'attendanceRate' => $attendanceRate,
                'remarks' => (int) $appointments->filter(fn (PtmAppointment $appointment) => $appointment->remarks !== null && $appointment->remarks !== '')->count(),
                'pendingFollowUps' => $pendingFollowUps,
            ],
            'sessions' => $sessionRows,
        ]);
    }

    public function storeSession(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate($this->sessionRules());

        PtmSession::query()->create([
            'organization_id' => $organization->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'date' => $validated['date'],
            'start_time' => $validated['start_time'] ?? null,
            'end_time' => $validated['end_time'] ?? null,
            'location' => $validated['location'] ?? null,
            'status' => $validated['status'],
            'created_by' => $user->id,
        ]);

        return redirect()->route('ptm')->with('success', 'Meeting scheduled successfully.');
    }

    public function updateSession(Request $request, PtmSession $ptmSession): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $ptmSession->organization_id === $organization->id, 403);

        $validated = $request->validate($this->sessionRules());

        $ptmSession->update([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'date' => $validated['date'],
            'start_time' => $validated['start_time'] ?? null,
            'end_time' => $validated['end_time'] ?? null,
            'location' => $validated['location'] ?? null,
            'status' => $validated['status'],
        ]);

        return redirect()->route('ptm', ['session_id' => $ptmSession->id])->with('success', 'Meeting updated successfully.');
    }

    public function destroySession(PtmSession $ptmSession): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $ptmSession->organization_id === $organization->id, 403);

        $ptmSession->delete();

        return redirect()->route('ptm')->with('success', 'Meeting deleted successfully.');
    }

    public function storeAppointment(Request $request, PtmSession $ptmSession): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $ptmSession->organization_id === $organization->id, 403);

        $validated = $request->validate($this->appointmentRules());

        $student = Student::query()->findOrFail($validated['student_id']);

        if ($student->organization_id !== $organization->id) {
            abort(403);
        }

        $exists = PtmAppointment::query()
            ->where('ptm_session_id', $ptmSession->id)
            ->where('student_id', $validated['student_id'])
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'This student is already scheduled for this meeting.');
        }

        PtmAppointment::query()->create([
            'organization_id' => $organization->id,
            'ptm_session_id' => $ptmSession->id,
            'student_id' => $validated['student_id'],
            'parent_name' => $validated['parent_name'] ?? null,
            'parent_contact' => $validated['parent_contact'] ?? null,
            'slot_time' => $validated['slot_time'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'remarks' => $validated['remarks'] ?? null,
            'follow_up_required' => $validated['follow_up_required'] ?? false,
            'follow_up_due' => $validated['follow_up_due'] ?? null,
            'status' => $validated['status'],
            'created_by' => $user->id,
        ]);

        return redirect()->route('ptm', ['session_id' => $ptmSession->id])->with('success', 'Appointment added successfully.');
    }

    public function updateAppointment(Request $request, PtmAppointment $ptmAppointment): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $ptmAppointment->organization_id === $organization->id, 403);

        $validated = $request->validate($this->appointmentRules());

        $ptmAppointment->update([
            'parent_name' => $validated['parent_name'] ?? null,
            'parent_contact' => $validated['parent_contact'] ?? null,
            'slot_time' => $validated['slot_time'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'remarks' => $validated['remarks'] ?? null,
            'follow_up_required' => $validated['follow_up_required'] ?? false,
            'follow_up_due' => $validated['follow_up_due'] ?? null,
            'status' => $validated['status'],
        ]);

        if (!$validated['follow_up_required'] ?? false) {
            $ptmAppointment->update(['follow_up_completed_at' => null]);
        }

        return redirect()->route('ptm', ['session_id' => $ptmAppointment->ptm_session_id])->with('success', 'Appointment updated successfully.');
    }

    public function recordAppointment(Request $request, PtmAppointment $ptmAppointment): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $ptmAppointment->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(self::APPOINTMENT_STATUSES)],
            'remarks' => ['nullable', 'string', 'max:2000'],
        ]);

        $ptmAppointment->update([
            'status' => $validated['status'],
            'remarks' => $validated['remarks'] ?? $ptmAppointment->remarks,
        ]);

        return back()->with('success', 'Attendance recorded.');
    }

    public function toggleAppointmentFollowUp(Request $request, PtmAppointment $ptmAppointment): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $ptmAppointment->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'done' => ['required', 'boolean'],
        ]);

        $ptmAppointment->update([
            'follow_up_completed_at' => $validated['done'] ? now() : null,
        ]);

        return back()->with('success', 'Follow-up updated successfully.');
    }

    public function destroyAppointment(PtmAppointment $ptmAppointment): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $ptmAppointment->organization_id === $organization->id, 403);

        $sessionId = $ptmAppointment->ptm_session_id;
        $ptmAppointment->delete();

        return redirect()->route('ptm', ['session_id' => $sessionId])->with('success', 'Appointment removed successfully.');
    }

    private function sessionRules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'date' => ['required', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(self::SESSION_STATUSES)],
        ];
    }

    private function appointmentRules(): array
    {
        return [
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'parent_name' => ['nullable', 'string', 'max:255'],
            'parent_contact' => ['nullable', 'string', 'max:20'],
            'slot_time' => ['nullable', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'remarks' => ['nullable', 'string', 'max:2000'],
            'follow_up_required' => ['sometimes', 'boolean'],
            'follow_up_due' => ['nullable', 'date'],
            'status' => ['required', Rule::in(self::APPOINTMENT_STATUSES)],
        ];
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