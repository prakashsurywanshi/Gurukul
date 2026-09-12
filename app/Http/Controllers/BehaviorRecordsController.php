<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class BehaviorRecordsController extends Controller
{
    private const STATUSES = ['open', 'reviewed', 'resolved'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $studentFilter = $request->query('student_id');
        $statusFilter = $request->query('status');

        $query = Incident::query()
            ->where('organization_id', $organization->id)
            ->where('type', 'behavior')
            ->with('student:id,organization_id,first_name,last_name,class_id')
            ->with('creator:id,name')
            ->orderByDesc('incident_date')
            ->orderByDesc('id');

        if ($studentFilter) {
            $query->where('student_id', $studentFilter);
        }

        if ($statusFilter && in_array($statusFilter, self::STATUSES, true)) {
            $query->where('status', $statusFilter);
        }

        $records = $query->limit(200)->get()->map(fn (Incident $incident) => [
            'id' => (string) $incident->id,
            'title' => $incident->localized('title'),
            'description' => $incident->description,
            'incident_date' => $incident->incident_date->format('Y-m-d'),
            'status' => $incident->status,
            'action_taken' => $incident->action_taken,
            'student' => $incident->student ? [
                'id' => (string) $incident->student->id,
                'name' => trim(($incident->student->first_name ?? '').' '.($incident->student->last_name ?? '')),
                'class' => $incident->student->schoolClass?->name,
                'section' => $incident->student->schoolClass?->section,
            ] : null,
            'created_by' => $incident->creator?->name,
        ])->all();

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

        return inertia('dashboard/StudentBehavior', [
            'user' => $user,
            'organization' => $organization,
            'records' => $records,
            'classGroups' => $classGroups,
            'selectedStudentId' => $studentFilter ? (string) $studentFilter : null,
            'selectedStatus' => $statusFilter ?: null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'incident_date' => ['required', 'date'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'action_taken' => ['nullable', 'string', 'max:5000'],
        ]);

        $student = Student::query()->findOrFail($validated['student_id']);

        if ($student->organization_id !== $organization->id) {
            abort(403);
        }

        Incident::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'type' => 'behavior',
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'incident_date' => $validated['incident_date'],
            'status' => $validated['status'],
            'action_taken' => $validated['action_taken'] ?? null,
            'created_by' => $user->id,
        ]);

        return redirect()->route('student-behavior', [
            'student_id' => $student->id,
        ])->with('success', 'Behavior record added successfully.');
    }

    public function update(Request $request, Incident $incident): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $incident->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'incident_date' => ['required', 'date'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'action_taken' => ['nullable', 'string', 'max:5000'],
        ]);

        $incident->update([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'incident_date' => $validated['incident_date'],
            'status' => $validated['status'],
            'action_taken' => $validated['action_taken'] ?? null,
        ]);

        return redirect()->route('student-behavior', [
            'student_id' => $incident->student_id,
        ])->with('success', 'Behavior record updated successfully.');
    }

    public function destroy(Incident $incident): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $incident->organization_id === $organization->id, 403);

        $studentId = $incident->student_id;
        $incident->delete();

        return redirect()->route('student-behavior', [
            'student_id' => $studentId,
        ])->with('success', 'Behavior record deleted successfully.');
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