<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class GlobalSearchController extends Controller
{
    private const STUDENT_RESULT_LIMIT = 8;
    private const STAFF_RESULT_LIMIT = 8;

    public function __construct(
        private readonly StaffPermissionService $permissions
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['students' => [], 'staff' => []], 401);
        }

        $q = trim((string) $request->query('q', ''));

        if (Str::length($q) < 1) {
            return response()->json(['students' => [], 'staff' => []]);
        }

        $organization = $this->permissions->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['students' => [], 'staff' => []]);
        }

        return response()->json([
            'students' => $this->students($organization, $q),
            'staff' => $this->staff($organization, $user, $q),
        ]);
    }

    private function students(Organization $organization, string $q): array
    {
        $needle = '%' . $q . '%';

        return Student::query()
            ->where('organization_id', $organization->id)
            ->where(function ($query) use ($q, $needle) {
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
            })
            ->orderBy('admission_no')
            ->limit(self::STUDENT_RESULT_LIMIT)
            ->get()
            ->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'type' => 'student',
                'name' => collect([$student->first_name, $student->middle_name, $student->last_name])
                    ->filter()
                    ->implode(' '),
                'subtitle' => trim(implode(' · ', array_filter([
                    $student->admission_no,
                    $student->schoolClass?->name,
                ]))),
                'href' => '/students/' . $student->id,
            ])
            ->all();
    }

    private function staff(Organization $organization, User $user, string $q): array
    {
        if (!$this->permissions->allows($user, 'User Management', 'view')) {
            return [];
        }

        if ($user->role === 'super_admin') {
            return [];
        }

        $needle = '%' . $q . '%';

        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', \App\Support\RolePermissionCatalog::staffRoleSlugs())
            ->where(function ($query) use ($q, $needle) {
                $query->where('name', 'like', $needle)
                    ->orWhere('email', 'like', $needle);
            })
            ->orderBy('name')
            ->limit(self::STAFF_RESULT_LIMIT)
            ->get(['id', 'name', 'email', 'role'])
            ->map(fn (User $member) => [
                'id' => (string) $member->id,
                'type' => 'staff',
                'name' => $member->name,
                'subtitle' => trim(implode(' · ', array_filter([
                    \App\Support\RolePermissionCatalog::displayNameForSlug($member->role) ?? $member->role,
                    $member->email,
                ]))),
                'href' => '/staff',
            ])
            ->all();
    }
}