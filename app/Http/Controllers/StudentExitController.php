<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Student;
use App\Models\StudentExit;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StudentExitController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $students = $this->upcomingStudents($organization);

        return Inertia::render('dashboard/StudentExits', [
            'user' => $user,
            'pendingExits' => $this->map($students->filter(fn (Student $student) =>
                $student->enrollment_status === 'active' && $student->latestExit?->status === 'pending')->values()),
            'register' => $this->map($students->filter(fn (Student $student) =>
                $student->latestExit?->status === 'exited')->values()),
            'exited' => $this->map($students->filter(fn (Student $student) =>
                $student->enrollment_status === 'exited')->values()),
            'onHold' => $this->map($students->filter(fn (Student $student) =>
                $student->enrollment_status === 'hold')->values()),
            'activeStudents' => $this->activeStudents($students),
            'reasons' => StudentExit::EXIT_REASONS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $this->validateExit($request, $organization);

        $student = $this->findStudent($organization, $validated['student_id']);

        $type = $validated['type'];

        StudentExit::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'type' => $type,
            'status' => $type === 'exit' ? 'exited' : 'held',
            'reason' => $validated['reason'] ?? null,
            'exit_date' => $validated['exit_date'] ?? null,
            'tc_number' => $validated['tc_number'] ?? null,
            'tc_issued_date' => $validated['tc_issued_date'] ?? null,
            'note' => $validated['note'] ?? null,
            'acted_by' => $user->id,
        ]);

        $student->update([
            'enrollment_status' => $type === 'exit' ? 'exited' : 'hold',
        ]);

        $message = $type === 'exit'
            ? 'Exit recorded successfully.'
            : 'Student put on hold.';

        return back()->with('success', $message);
    }

    public function markTcPrinted(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'student_id' => ['required', Rule::exists('students', 'id')],
            'tc_number' => ['nullable', 'string', 'max:255'],
            'tc_issued_date' => ['nullable', 'date'],
        ]);

        $student = $this->findStudent($organization, $validated['student_id']);

        $existing = $student->exits()
            ->where('type', 'exit')
            ->where('status', 'pending')
            ->latest()
            ->first();

        if ($existing) {
            $existing->update([
                'tc_number' => $validated['tc_number'],
                'tc_issued_date' => $validated['tc_issued_date'],
                'acted_by' => $user->id,
            ]);
        } else {
            StudentExit::query()->create([
                'organization_id' => $organization->id,
                'student_id' => $student->id,
                'type' => 'exit',
                'status' => 'pending',
                'tc_number' => $validated['tc_number'],
                'tc_issued_date' => $validated['tc_issued_date'],
                'acted_by' => $user->id,
            ]);
        }

        return back()->with('success', 'TC marked as printed.');
    }

    public function restore(Request $request, Student $student): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $student->organization_id === $organization->id, 404);

        $latestExit = $student->exits()->latest()->first();

        $student->update(['enrollment_status' => 'active']);

        if ($latestExit) {
            $latestExit->update(['status' => 'restored', 'acted_by' => $user->id]);
        }

        return back()->with('success', 'Student restored to the active roll.');
    }

    private function upcomingStudents(Organization $organization): Collection
    {
        return Student::query()
            ->with(['schoolClass', 'latestExit'])
            ->where('organization_id', $organization->id)
            ->get();
    }

    private function activeStudents(Collection $students): Collection
    {
        return $students
            ->filter(fn (Student $student) => $student->enrollment_status === 'active')
            ->sortBy('admission_no')
            ->values()
            ->map(fn (Student $student) => [
                'id' => $student->id,
                'name' => trim($student->first_name . ' ' . $student->middle_name . ' ' . $student->last_name),
                'admissionNo' => $student->admission_no,
                'className' => $student->schoolClass?->name,
            ]);
    }

    private function findStudent(Organization $organization, int $studentId): Student
    {
        return Student::query()
            ->where('organization_id', $organization->id)
            ->findOrFail($studentId);
    }

    private function validateExit(Request $request, Organization $organization): array
    {
        return $request->validate([
            'student_id' => ['required', Rule::exists('students', 'id')],
            'type' => ['required', Rule::in(StudentExit::TYPES)],
            'reason' => ['required_if:type,exit', 'nullable', Rule::in(StudentExit::EXIT_REASONS)],
            'exit_date' => ['required_if:type,exit', 'nullable', 'date'],
            'tc_number' => ['nullable', 'string', 'max:255'],
            'tc_issued_date' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:5000'],
        ]);
    }

    private function map(Collection $students): Collection
    {
        return $students->map(fn (Student $student) => [
            'id' => $student->id,
            'admissionNo' => $student->admission_no,
            'name' => trim($student->first_name . ' ' . $student->middle_name . ' ' . $student->last_name),
            'className' => $student->schoolClass?->name,
            'enrollmentStatus' => $student->enrollment_status,
            'latestExitId' => $student->latestExit?->id,
            'reason' => $student->latestExit?->reason,
            'exitDate' => optional($student->latestExit?->exit_date)->format('Y-m-d'),
            'tcNumber' => $student->latestExit?->tc_number,
            'tcIssuedDate' => optional($student->latestExit?->tc_issued_date)->format('Y-m-d'),
            'note' => $student->latestExit?->note,
            'status' => $student->latestExit?->status,
        ])->values();
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

        if (!$organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}