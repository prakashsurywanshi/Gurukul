<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Designation;
use App\Models\User;
use App\Models\Organization;
use App\Support\RolePermissionCatalog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StaffDirectoryController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $query = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', RolePermissionCatalog::staffRoleSlugs())
            ->whereNull('deleted_at')
            ->with('department:id,organization_id,name')
            ->with('designation:id,organization_id,name');

        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('employee_id', 'like', "%{$search}%");
            });
        }

        if ($departmentId = (int) $request->query('department_id')) {
            $query->where('department_id', $departmentId);
        }

        if ($designationId = (int) $request->query('designation_id')) {
            $query->where('designation_id', $designationId);
        }

        if ($role = (string) $request->query('role')) {
            $query->where('role', $role);
        }

        if ($status = (string) $request->query('status')) {
            $query->where('status', $status);
        } else {
            $query->where('status', 'active');
        }

        $staff = $query->orderBy('name')->get()->map(fn ($user) => [
            'id' => $user->id,
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'employeeId' => $user->employee_id,
            'role' => $user->role,
            'roleLabel' => RolePermissionCatalog::displayNameForSlug($user->role) ?? ucfirst($user->role),
            'department' => $user->department?->name,
            'designation' => $user->designation?->name,
            'joiningDate' => $user->joining_date ? Carbon::parse($user->joining_date)->toDateString() : null,
            'status' => $user->status,
        ]);

        return Inertia::render('dashboard/StaffDirectory', [
            'user' => $user,
            'staff' => $staff,
            'filters' => [
                'search' => (string) $request->query('search'),
                'department_id' => $departmentId ?: null,
                'designation_id' => $designationId ?: null,
                'role' => $role ?: null,
                'status' => $status ?: 'active',
            ],
            'departmentOptions' => Department::query()->where('organization_id', $organization->id)->orderBy('name')->get(['id', 'name']),
            'designationOptions' => Designation::query()->where('organization_id', $organization->id)->orderBy('name')->get(['id', 'name']),
            'roleOptions' => collect(RolePermissionCatalog::staffRoleSlugs())->map(fn ($slug) => [
                'value' => $slug,
                'label' => RolePermissionCatalog::displayNameForSlug($slug) ?? ucfirst($slug),
            ])->values(),
            'summary' => [
                'total' => User::query()->where('organization_id', $organization->id)->whereIn('role', RolePermissionCatalog::staffRoleSlugs())->whereNull('deleted_at')->where('status', 'active')->count(),
                'active' => User::query()->where('organization_id', $organization->id)->whereIn('role', RolePermissionCatalog::staffRoleSlugs())->whereNull('deleted_at')->where('status', 'active')->count(),
                'teachers' => User::query()->where('organization_id', $organization->id)->where('role', 'teacher')->whereNull('deleted_at')->where('status', 'active')->count(),
            ],
        ]);
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