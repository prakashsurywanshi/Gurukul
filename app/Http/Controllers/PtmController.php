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
            'status' => $validated['status'],
        ]);

        return redirect()->route('ptm', ['session_id' => $ptmAppointment->ptm_session_id])->with('success', 'Appointment updated successfully.');
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