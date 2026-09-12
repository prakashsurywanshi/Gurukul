<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AssignSubjectsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $classId = $request->integer('class') ?: null;

        $classes = SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => $schoolClass->id,
                'name' => $schoolClass->name,
                'section' => $schoolClass->section,
            ])
            ->values()
            ->all();

        $rows = [];

        if ($classId) {
            $class = $this->findClass($organization, $classId);

            if ($class) {
                $rows = DB::table('class_subject')
                    ->where('class_subject.class_id', $class->id)
                    ->join('subjects', 'subjects.id', '=', 'class_subject.subject_id')
                    ->leftJoin('users', 'users.id', '=', 'class_subject.teacher_id')
                    ->select(
                        'subjects.id as subject_id',
                        'subjects.name',
                        'subjects.code',
                        'subjects.type',
                        'class_subject.teacher_id as teacher_id',
                        'users.name as teacher_name'
                    )
                    ->orderBy('subjects.name')
                    ->get()
                    ->map(fn ($row) => [
                        'subjectId' => (int) $row->subject_id,
                        'name' => $row->name,
                        'code' => $row->code,
                        'type' => $row->type,
                        'teacherId' => $row->teacher_id ? (int) $row->teacher_id : null,
                        'teacherName' => $row->teacher_name,
                    ])
                    ->values()
                    ->all();
            }
        }

        return Inertia::render('dashboard/AssignSubjects', [
            'user' => $user,
            'classes' => $classes,
            'selectedClassId' => $classId,
            'unassignedSubjects' => $this->getUnassignedSubjects($organization, $classId),
            'teachers' => $this->getTeacherOptions($organization),
            'rows' => $rows,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'class_id' => ['required', 'integer'],
            'rows' => ['present', 'array'],
            'rows.*.subject_id' => [
                'required',
                Rule::exists('subjects', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'rows.*.teacher_id' => ['nullable', 'integer'],
        ]);

        $class = $this->findClass($organization, (int) $validated['class_id']);

        if (!$class) {
            return back()->with('error', 'Class does not exist.');
        }

        $teacherIds = array_values(array_filter(array_map(
            fn ($row) => (int) ($row['teacher_id'] ?? 0),
            $validated['rows']
        )));

        $validTeachers = User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'teacher')
            ->whereIn('id', $teacherIds)
            ->pluck('id')
            ->all();

        if (count($validTeachers) !== count($teacherIds)) {
            return back()->with('error', 'One or more selected teachers are not valid.');
        }

        DB::transaction(function () use ($class, $validated) {
            DB::table('class_subject')->where('class_id', $class->id)->delete();

            foreach ($validated['rows'] as $row) {
                DB::table('class_subject')->insert([
                    'class_id' => $class->id,
                    'subject_id' => (int) $row['subject_id'],
                    'teacher_id' => isset($row['teacher_id']) && $row['teacher_id'] !== null && $row['teacher_id'] !== '' ? (int) $row['teacher_id'] : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        return back()->with('success', 'Subjects assigned successfully.');
    }

    private function getUnassignedSubjects(Organization $organization, ?int $classId): array
    {
        if (!$classId) {
            return [];
        }

        $assigned = DB::table('class_subject')
            ->where('class_id', $classId)
            ->pluck('subject_id');

        return Subject::query()
            ->where('organization_id', $organization->id)
            ->when($assigned->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $assigned))
            ->orderBy('name')
            ->get(['id', 'name', 'code'])
            ->map(fn (Subject $subject) => [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
            ])
            ->values()
            ->all();
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
                'id' => (int) $teacher->id,
                'name' => trim($teacher->name),
            ])
            ->values()
            ->all();
    }

    private function findClass(Organization $organization, int $classId): ?SchoolClass
    {
        return SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->find($classId);
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