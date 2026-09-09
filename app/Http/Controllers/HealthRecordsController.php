<?php

namespace App\Http\Controllers;

use App\Models\HealthRecord;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Throwable;

class HealthRecordsController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $studentFilter = $request->query('student_id');

        $query = HealthRecord::query()
            ->where('organization_id', $organization->id)
            ->with('student:id,organization_id,first_name,last_name,class_id')
            ->with('recorder:id,name')
            ->orderByDesc('record_date')
            ->orderByDesc('id');

        if ($studentFilter) {
            $query->where('student_id', $studentFilter);
        }

        $records = $query->limit(300)->get()->map(fn (HealthRecord $record) => [
            'id' => (string) $record->id,
            'record_date' => $record->record_date->format('Y-m-d'),
            'blood_group' => $record->blood_group,
            'height_cm' => $record->height_cm,
            'weight_kg' => $record->weight_kg,
            'blood_pressure' => $record->blood_pressure,
            'pulse' => $record->pulse,
            'allergies' => $record->localized('allergies'),
            'medical_conditions' => $record->localized('medical_conditions'),
            'medications' => $record->localized('medications'),
            'remarks' => $record->localized('remarks'),
            'student' => $record->student ? [
                'id' => (string) $record->student->id,
                'name' => trim(($record->student->first_name ?? '').' '.($record->student->last_name ?? '')),
                'class' => $record->student->schoolClass?->name,
                'section' => $record->student->schoolClass?->section,
            ] : null,
            'recorded_by' => $record->recorder?->name,
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

        return inertia('dashboard/StudentHealth', [
            'user' => $user,
            'organization' => $organization,
            'records' => $records,
            'classGroups' => $classGroups,
            'selectedStudentId' => $studentFilter ? (string) $studentFilter : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate($this->rules());

        $student = Student::query()->findOrFail($validated['student_id']);

        if ($student->organization_id !== $organization->id) {
            abort(403);
        }

        HealthRecord::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'record_date' => $validated['record_date'],
            'blood_group' => $validated['blood_group'] ?? null,
            'height_cm' => $validated['height_cm'] ?? null,
            'weight_kg' => $validated['weight_kg'] ?? null,
            'blood_pressure' => $validated['blood_pressure'] ?? null,
            'pulse' => $validated['pulse'] ?? null,
            'allergies' => $validated['allergies'] ?? null,
            'medical_conditions' => $validated['medical_conditions'] ?? null,
            'medications' => $validated['medications'] ?? null,
            'remarks' => $validated['remarks'] ?? null,
            'recorded_by' => $user->id,
        ]);

        return redirect()->route('student-health', [
            'student_id' => $student->id,
        ])->with('success', 'Health record added successfully.');
    }

    public function update(Request $request, HealthRecord $healthRecord): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $healthRecord->organization_id === $organization->id, 403);

        $validated = $request->validate($this->rules());

        $healthRecord->update([
            'record_date' => $validated['record_date'],
            'blood_group' => $validated['blood_group'] ?? null,
            'height_cm' => $validated['height_cm'] ?? null,
            'weight_kg' => $validated['weight_kg'] ?? null,
            'blood_pressure' => $validated['blood_pressure'] ?? null,
            'pulse' => $validated['pulse'] ?? null,
            'allergies' => $validated['allergies'] ?? null,
            'medical_conditions' => $validated['medical_conditions'] ?? null,
            'medications' => $validated['medications'] ?? null,
            'remarks' => $validated['remarks'] ?? null,
        ]);

        return redirect()->route('student-health', [
            'student_id' => $healthRecord->student_id,
        ])->with('success', 'Health record updated successfully.');
    }

    public function destroy(HealthRecord $healthRecord): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $healthRecord->organization_id === $organization->id, 403);

        $studentId = $healthRecord->student_id;
        $healthRecord->delete();

        return redirect()->route('student-health', [
            'student_id' => $studentId,
        ])->with('success', 'Health record deleted successfully.');
    }

    private function rules(): array
    {
        return [
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'record_date' => ['required', 'date'],
            'blood_group' => ['nullable', 'string', 'max:10'],
            'height_cm' => ['nullable', 'numeric', 'min:0', 'max:250'],
            'weight_kg' => ['nullable', 'numeric', 'min:0', 'max:300'],
            'blood_pressure' => ['nullable', 'string', 'max:20'],
            'pulse' => ['nullable', 'string', 'max:20'],
            'allergies' => ['nullable', 'string', 'max:2000'],
            'medical_conditions' => ['nullable', 'string', 'max:2000'],
            'medications' => ['nullable', 'string', 'max:2000'],
            'remarks' => ['nullable', 'string', 'max:2000'],
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