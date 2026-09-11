<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AssignClassTeacherController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $sessionId = $request->integer('session') ?: null;

        $classes = SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get()
            ->map(function (SchoolClass $schoolClass) use ($organization) {
                $teacher = $schoolClass->teacher;

                return [
                    'id' => $schoolClass->id,
                    'name' => $schoolClass->name,
                    'section' => $schoolClass->section,
                    'roomNumber' => $schoolClass->room_number,
                    'studentsCount' => $schoolClass->studentAcademicHistories()->count(),
                    'teacherId' => $teacher?->id,
                    'teacherName' => $teacher ? $teacher->name : null,
                ];
            })
            ->values()
            ->all();

        $teachers = $this->getTeacherOptions($organization);

        return Inertia::render('dashboard/AssignClassTeacher', [
            'user' => $user,
            'classes' => $classes,
            'teachers' => $teachers,
            'academicYearLabel' => $organization->selectedAcademicYear()?->name,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'class_id' => ['required', 'integer'],
            'teacher_id' => ['nullable', 'integer'],
        ]);

        $class = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->find($validated['class_id']);

        if (!$class) {
            return back()->with('error', 'Class does not exist.');
        }

        $teacherId = $validated['teacher_id'] ?? null;

        if ($teacherId) {
            $teacher = User::query()
                ->where('organization_id', $organization->id)
                ->where('role', 'teacher')
                ->where('status', 'active')
                ->find($teacherId);

            if (!$teacher) {
                return back()->with('error', 'Selected teacher does not exist.');
            }
        }

        $class->update(['class_teacher_id' => $teacherId]);

        return back()->with('success', 'Class teacher assigned successfully.');
    }

    private function getTeacherOptions(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'teacher')
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $teacher) => [
                'id' => $teacher->id,
                'name' => trim($teacher->name),
            ])
            ->values()
            ->all();
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