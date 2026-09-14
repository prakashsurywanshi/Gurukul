<?php

namespace App\Http\Controllers;

use App\Models\HealthRecord;
use App\Models\Incident;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use App\Services\StaffPermissionService;
use App\Support\RolePermissionCatalog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class GlobalSearchController extends Controller
{
    private const RESULT_LIMIT = 6;

    public function __construct(
        private readonly StaffPermissionService $permissions
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json($this->emptyResult(), 401);
        }

        $q = trim((string) $request->query('q', ''));

        if (Str::length($q) < 1) {
            return response()->json($this->emptyResult());
        }

        $organization = $this->permissions->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json($this->emptyResult());
        }

        return response()->json([
            'students' => $this->students($organization, $q),
            'staff' => $this->staff($organization, $user, $q),
            'classes' => $this->gated($user, 'Class / Section', fn () => $this->classes($organization, $q)),
            'fees' => $this->gated($user, 'Fees Management', fn () => $this->fees($organization, $q)),
            'behavior' => $this->gated($user, 'Discipline', fn () => $this->behavior($organization, $q)),
            'health' => $this->gated($user, 'Student Health', fn () => $this->health($organization, $q)),
        ]);
    }

    private function emptyResult(): array
    {
        return ['students' => [], 'staff' => [], 'classes' => [], 'fees' => [], 'behavior' => [], 'health' => []];
    }

    private function gated(User $user, string $feature, callable $build): array
    {
        if (!$this->permissions->allows($user, $feature, 'view')) {
            return [];
        }

        return $build();
    }

    private function nameNeedle(string $q): string
    {
        return '%' . $q . '%';
    }

    private function studentNameMatches(Builder $query, string $q): Builder
    {
        $needle = $this->nameNeedle($q);

        return $query->where(function ($query) use ($q, $needle) {
            $query->where('first_name', 'like', $needle)
                ->orWhere('middle_name', 'like', $needle)
                ->orWhere('last_name', 'like', $needle)
                ->orWhere('admission_no', 'like', $needle)
                ->orWhere('roll_number', 'like', $needle)
                ->orWhereRaw(
                    "concat_ws(' ', coalesce(first_name, ''), coalesce(middle_name, ''), coalesce(last_name, '')) like ?",
                    [$needle]
                )
                ->orWhereRaw(
                    "concat_ws('', coalesce(first_name, ''), coalesce(last_name, '')) like ?",
                    [str_replace(' ', '', $q)]
                );
        });
    }

    private function studentSubtitle(Student $student): string
    {
        return trim(implode(' · ', array_filter([
            $student->admission_no,
            $student->schoolClass?->name,
        ])));
    }

    private function students(Organization $organization, string $q): array
    {
        return Student::query()
            ->where('organization_id', $organization->id)
            ->tap(fn (Builder $query) => $this->studentNameMatches($query, $q))
            ->orderBy('admission_no')
            ->limit(self::RESULT_LIMIT)
            ->get()
            ->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'type' => 'student',
                'name' => collect([$student->first_name, $student->middle_name, $student->last_name])
                    ->filter()
                    ->implode(' '),
                'subtitle' => $this->studentSubtitle($student),
                'href' => '/students/' . $student->id,
            ])
            ->all();
    }

    private function staff(Organization $organization, User $user, string $q): array
    {
        if (!$this->permissions->allows($user, 'User Management', 'view') || $user->role === 'super_admin') {
            return [];
        }

        $needle = $this->nameNeedle($q);

        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', RolePermissionCatalog::staffRoleSlugs())
            ->where(function (Builder $query) use ($q, $needle) {
                $query->where('name', 'like', $needle)
                    ->orWhere('email', 'like', $needle);
            })
            ->orderBy('name')
            ->limit(self::RESULT_LIMIT)
            ->get(['id', 'name', 'email', 'role'])
            ->map(fn (User $member) => [
                'id' => (string) $member->id,
                'type' => 'staff',
                'name' => $member->name,
                'subtitle' => trim(implode(' · ', array_filter([
                    RolePermissionCatalog::displayNameForSlug($member->role) ?? $member->role,
                    $member->email,
                ]))),
                'href' => '/staff/' . $member->id,
            ])
            ->all();
    }

    private function classes(Organization $organization, string $q): array
    {
        $needle = $this->nameNeedle($q);

        return SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where(function (Builder $query) use ($q, $needle) {
                $query->where('name', 'like', $needle)
                    ->orWhere('section', 'like', $needle)
                    ->orWhere('room_number', 'like', $needle);
            })
            ->orderBy('name')
            ->orderBy('section')
            ->limit(self::RESULT_LIMIT)
            ->get()
            ->map(fn (SchoolClass $class) => [
                'id' => (string) $class->id,
                'type' => 'class',
                'name' => trim($class->name . ' - ' . $class->section),
                'subtitle' => trim(implode(' · ', array_filter([$class->room_number, $class->capacity]))),
                'href' => '/classes/' . $class->id,
            ])
            ->all();
    }

    private function fees(Organization $organization, string $q): array
    {
        return StudentFee::query()
            ->where('student_fees.organization_id', $organization->id)
            ->whereHas('student', fn (Builder $query) => $this->studentNameMatches($query, $q))
            ->with('student:id,first_name,middle_name,last_name,admission_no,class_id')
            ->with('student.schoolClass:id,name,section')
            ->get()
            ->map(fn (StudentFee $fee) => [
                'id' => (string) $fee->student_id,
                'type' => 'fee',
                'name' => collect([
                    $fee->student?->first_name,
                    $fee->student?->middle_name,
                    $fee->student?->last_name,
                ])->filter()->implode(' '),
                'subtitle' => trim(implode(' · ', array_filter([
                    $fee->student?->admission_no,
                    $fee->student?->schoolClass?->name,
                    $fee->status,
                ]))),
                'href' => '/students/' . $fee->student_id . '?tab=fees',
            ])
            ->unique('id')
            ->values()
            ->all();
    }

    private function behavior(Organization $organization, string $q): array
    {
        return Incident::query()
            ->where('incidents.organization_id', $organization->id)
            ->where('incidents.type', 'behavior')
            ->whereHas('student', fn (Builder $query) => $this->studentNameMatches($query, $q))
            ->with('student:id,first_name,middle_name,last_name,admission_no,class_id')
            ->orderByDesc('incident_date')
            ->limit(self::RESULT_LIMIT)
            ->get()
            ->map(fn (Incident $incident) => [
                'id' => (string) $incident->student_id,
                'type' => 'behavior',
                'name' => collect([
                    $incident->student?->first_name,
                    $incident->student?->middle_name,
                    $incident->student?->last_name,
                ])->filter()->implode(' '),
                'subtitle' => trim(implode(' · ', array_filter([
                    $incident->title,
                    $incident->status,
                ]))),
                'href' => '/student-behavior?student_id=' . $incident->student_id,
            ])
            ->unique('id')
            ->values()
            ->all();
    }

    private function health(Organization $organization, string $q): array
    {
        return HealthRecord::query()
            ->where('health_records.organization_id', $organization->id)
            ->whereHas('student', fn (Builder $query) => $this->studentNameMatches($query, $q))
            ->with('student:id,first_name,middle_name,last_name,admission_no,class_id')
            ->orderByDesc('record_date')
            ->limit(self::RESULT_LIMIT)
            ->get()
            ->map(fn (HealthRecord $record) => [
                'id' => (string) $record->student_id,
                'type' => 'health',
                'name' => collect([
                    $record->student?->first_name,
                    $record->student?->middle_name,
                    $record->student?->last_name,
                ])->filter()->implode(' '),
                'subtitle' => trim(implode(' · ', array_filter([
                    $record->record_date?->format('Y-m-d'),
                    $record->blood_group,
                ]))),
                'href' => '/student-health?student_id=' . $record->student_id,
            ])
            ->unique('id')
            ->values()
            ->all();
    }
}