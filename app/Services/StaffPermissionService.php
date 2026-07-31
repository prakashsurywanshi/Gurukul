<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use App\Support\RolePermissionCatalog;
use Illuminate\Support\Str;

class StaffPermissionService
{
    private const ADMIN_SAFE_FEATURES = [
        'Profile',
        'Edit Profile',
    ];

    private const STUDENT_ALLOWED_ACTIONS = [
        'Dashboard Home' => ['view'],
        'Class Time Table' => ['view'],
        'Lesson Plan' => ['view'],
        'Homework' => ['view'],
        'Fees Management' => ['view'],
        'Online Exams' => ['view'],
        'Feedback Management' => ['view'],
        'Messages' => ['view'],
        'Notice Board' => ['view'],
        'Download Center' => ['view'],
        'Complains' => ['view', 'add'],
        'Profile' => ['view'],
        'Edit Profile' => ['view', 'edit'],
    ];

    public function roleOptions(): array
    {
        return array_values(RolePermissionCatalog::staffRoles());
    }

    public function roleRecords(Organization $organization): array
    {
        $this->ensureRolesExist($organization);

        $systemSlugs = RolePermissionCatalog::staffRoleSlugs();

        return Role::query()
            ->where('organization_id', $organization->id)
            ->orderByRaw(
                'case when slug in ('.implode(',', array_fill(0, count($systemSlugs), '?')).') then 0 else 1 end',
                $systemSlugs
            )
            ->orderBy('name')
            ->get(['id', 'name', 'slug'])
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'slug' => $role->slug,
                'isSystemRole' => in_array($role->slug, $systemSlugs, true),
            ])
            ->values()
            ->all();
    }

    public function roleSlugsForOrganization(Organization $organization): array
    {
        $this->ensureRolesExist($organization);

        return Role::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->pluck('slug')
            ->values()
            ->all();
    }

    public function permissionFeatures(): array
    {
        return RolePermissionCatalog::features();
    }

    public function landingPathFor(?User $user): string
    {
        if (!$user) {
            return '/login';
        }

        if ($user->role === 'super_admin') {
            return '/dashboard';
        }

        if ($user->role === 'student') {
            return '/dashboard';
        }

        $featureRoutes = [
            'Dashboard Home' => '/dashboard',
            'Search Students' => '/search_students',
            'Online Admission' => '/online-admission',
            'Class / Section' => '/classes',
            'Attendance Management' => '/attendance',
            'Fees Management' => '/students',
            'Income Management' => '/income-management',
            'Expense Management' => '/expense-management',
            'User Management' => '/staff',
            'Staff Attendance' => '/staff/daily-attendance',
            'Payroll Management' => '/staff/payroll-management',
            'Leave Management' => '/staff/leave-management',
            'Exam Management' => '/exams',
            'Hall Ticket' => '/exams/hall-ticket',
            'Print Marksheet' => '/exams/print-marksheet',
            'Online Exams' => '/online-exams',
            'Feedback Management' => '/feedback',
            'Messages' => '/communication',
            'Send Whatsapp' => '/communication/send-whatsapp',
            'Download Center' => '/communication/download-center',
            'Hostel Management' => '/hostel-management',
            'Hostel Fee Collection' => '/hostel-fee-collection',
            'Transport Management' => '/transport-management',
            'Transport Fee Collection' => '/transport-fee-collection',
            'Certificate Management' => '/certificates',
            'Library Management' => '/library',
            'Inventory Management' => '/inventory',
            'Reports & Analytics' => '/reports',
            'Knowledge Base' => '/knowledge-base',
            'General Setting' => '/settings',
            'Communication Setting' => '/settings/communication',
            'Roles & Permissions' => '/settings/roles-permissions',
            'Sessions' => '/sessions',
            'Website CMS' => '/website-cms',
            'Website Pages' => '/pages-builder',
            'Profile' => '/profile',
            'Edit Profile' => '/profile/edit',
            'My Leaves' => '/my-leaves',
        ];

        foreach ($featureRoutes as $feature => $path) {
            if ($this->allows($user, $feature, 'view')) {
                return $path;
            }
        }

        return '/profile';
    }

    public function allows(?User $user, string $feature, string $action = 'view'): bool
    {
        if (!$user) {
            return false;
        }

        if ($user->role === 'super_admin') {
            return true;
        }

        if ($user->role === 'student') {
            return $this->allowsStudentFeature($feature, $action);
        }

        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return !$this->isManagedStaffRole($user->role);
        }

        $role = $this->resolveRoleForUser($organization, $user);

        if (!$role) {
            return false;
        }

        $permission = RolePermission::query()
            ->where('role_id', $role->id)
            ->where('feature', $feature)
            ->first();

        if (!$permission) {
            return $user->role === 'admin' && in_array($feature, self::ADMIN_SAFE_FEATURES, true);
        }

        $allowed = match ($action) {
            'add' => (bool) $permission->can_add,
            'edit' => (bool) $permission->can_edit,
            'delete' => (bool) $permission->can_delete,
            default => (bool) $permission->can_view,
        };

        if ($allowed) {
            return true;
        }

        return $user->role === 'admin' && in_array($feature, self::ADMIN_SAFE_FEATURES, true);
    }

    private function allowsStudentFeature(string $feature, string $action): bool
    {
        return in_array($action, self::STUDENT_ALLOWED_ACTIONS[$feature] ?? [], true);
    }

    public function featurePermissionsFor(?User $user): array
    {
        if (!$user || $user->role === 'super_admin') {
            return [];
        }

        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return [];
        }

        $role = $this->resolveRoleForUser($organization, $user);

        if (!$role) {
            return [];
        }

        $permissions = RolePermission::query()
            ->where('role_id', $role->id)
            ->get()
            ->mapWithKeys(fn (RolePermission $permission) => [
                $permission->feature => [
                    'view' => (bool) $permission->can_view,
                    'add' => (bool) $permission->can_add,
                    'edit' => (bool) $permission->can_edit,
                    'delete' => (bool) $permission->can_delete,
                ],
            ])
            ->all();

        if ($user->role === 'admin') {
            foreach (self::ADMIN_SAFE_FEATURES as $feature) {
                $permissions[$feature] = [
                    'view' => true,
                    'add' => false,
                    'edit' => true,
                    'delete' => false,
                ];
            }
        }

        return $permissions;
    }

    public function resolveOrganizationForUser(User $user): ?Organization
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

    public function isManagedStaffRole(?string $role): bool
    {
        return in_array($role, RolePermissionCatalog::staffRoleSlugs(), true);
    }

    public function ensureRolesExist(Organization $organization): void
    {
        $defaults = RolePermissionCatalog::defaults();
        $featureMap = RolePermissionCatalog::featureMap();

        foreach (RolePermissionCatalog::staffRoles() as $slug => $roleName) {
            $role = Role::query()->firstOrCreate(
                [
                    'organization_id' => $organization->id,
                    'slug' => $slug,
                ],
                [
                    'name' => $roleName,
                ]
            );

            $permissions = $defaults[$roleName] ?? RolePermissionCatalog::emptyPermissions();

            foreach ($permissions as $feature => $actions) {
                if (!isset($featureMap[$feature])) {
                    continue;
                }

                RolePermission::query()->firstOrCreate(
                    [
                        'role_id' => $role->id,
                        'feature' => $feature,
                    ],
                    [
                        'module' => $featureMap[$feature]['module'],
                        'can_view' => (bool) ($actions['view'] ?? false),
                        'can_add' => (bool) ($actions['add'] ?? false),
                        'can_edit' => (bool) ($actions['edit'] ?? false),
                        'can_delete' => (bool) ($actions['delete'] ?? false),
                    ]
                );
            }
        }
    }

    public function createRole(Organization $organization, string $name): Role
    {
        $slug = $this->uniqueRoleSlug($organization, $name);

        $role = Role::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'slug' => $slug,
        ]);

        $this->ensurePermissionsForRole($role);

        return $role;
    }

    public function updateRole(Organization $organization, Role $role, string $name): Role
    {
        $this->ensureRoleBelongsToOrganization($organization, $role);

        if (in_array($role->slug, RolePermissionCatalog::staffRoleSlugs(), true)) {
            $role->update(['name' => $name]);

            return $role;
        }

        $oldSlug = $role->slug;
        $newSlug = $this->uniqueRoleSlug($organization, $name, $role);

        $role->update([
            'name' => $name,
            'slug' => $newSlug,
        ]);

        User::query()
            ->where('organization_id', $organization->id)
            ->where('role', $oldSlug)
            ->update(['role' => $newSlug]);

        return $role;
    }

    public function deleteRole(Organization $organization, Role $role): bool
    {
        $this->ensureRolesExist($organization);
        $this->ensureRoleBelongsToOrganization($organization, $role);

        if (in_array($role->slug, RolePermissionCatalog::staffRoleSlugs(), true)) {
            return false;
        }

        User::query()
            ->where('organization_id', $organization->id)
            ->where('role', $role->slug)
            ->update(['role' => 'teacher']);

        $role->delete();

        return true;
    }

    public function syncPermissions(Organization $organization, array $rolePermissions): void
    {
        $featureMap = RolePermissionCatalog::featureMap();
        $this->ensureRolesExist($organization);

        $roles = Role::query()
            ->where('organization_id', $organization->id)
            ->get();

        foreach ($roles as $role) {
            $permissions = $rolePermissions[$role->slug]
                ?? $rolePermissions[$role->name]
                ?? RolePermissionCatalog::emptyPermissions();

            foreach (RolePermissionCatalog::features() as $item) {
                $feature = $item['feature'];
                $actions = $permissions[$feature] ?? [];

                RolePermission::query()->updateOrCreate(
                    [
                        'role_id' => $role->id,
                        'feature' => $feature,
                    ],
                    [
                        'module' => $featureMap[$feature]['module'],
                        'can_view' => (bool) ($actions['view'] ?? false),
                        'can_add' => (bool) ($actions['add'] ?? false),
                        'can_edit' => (bool) ($actions['edit'] ?? false),
                        'can_delete' => (bool) ($actions['delete'] ?? false),
                    ]
                );
            }
        }
    }

    public function buildRolePermissionsPayload(Organization $organization): array
    {
        $this->ensureRolesExist($organization);

        $roles = Role::query()
            ->where('organization_id', $organization->id)
            ->with('permissions')
            ->get()
            ->keyBy('slug');

        $emptyPermissions = RolePermissionCatalog::emptyPermissions();

        return $roles
            ->mapWithKeys(function (Role $role) use ($emptyPermissions) {
                $permissions = $emptyPermissions;

                foreach ($role->permissions as $permission) {
                    $permissions[$permission->feature] = [
                        'view' => (bool) $permission->can_view,
                        'add' => (bool) $permission->can_add,
                        'edit' => (bool) $permission->can_edit,
                        'delete' => (bool) $permission->can_delete,
                    ];
                }

                return [$role->slug => $permissions];
            })
            ->all();
    }

    public function normalizeRolePermissions(Organization $organization, array $rolePermissions): array
    {
        $this->ensureRolesExist($organization);

        $normalized = [];
        $emptyPermissions = RolePermissionCatalog::emptyPermissions();
        $roles = Role::query()
            ->where('organization_id', $organization->id)
            ->get();

        foreach ($roles as $role) {
            $permissions = $emptyPermissions;
            $incomingPermissions = $rolePermissions[$role->slug]
                ?? $rolePermissions[$role->name]
                ?? [];

            foreach (RolePermissionCatalog::features() as $item) {
                $feature = $item['feature'];
                $actions = is_array($incomingPermissions[$feature] ?? null) ? $incomingPermissions[$feature] : [];

                $permissions[$feature] = [
                    'view' => (bool) ($actions['view'] ?? false),
                    'add' => (bool) ($actions['add'] ?? false),
                    'edit' => (bool) ($actions['edit'] ?? false),
                    'delete' => (bool) ($actions['delete'] ?? false),
                ];
            }

            $normalized[$role->slug] = $permissions;
        }

        return $normalized;
    }

    public function ensurePermissionsForRole(Role $role): void
    {
        $featureMap = RolePermissionCatalog::featureMap();

        foreach (RolePermissionCatalog::features() as $item) {
            RolePermission::query()->firstOrCreate(
                [
                    'role_id' => $role->id,
                    'feature' => $item['feature'],
                ],
                [
                    'module' => $featureMap[$item['feature']]['module'],
                    'can_view' => false,
                    'can_add' => false,
                    'can_edit' => false,
                    'can_delete' => false,
                ]
            );
        }
    }

    private function resolveRoleForUser(Organization $organization, User $user): ?Role
    {
        $this->ensureRolesExist($organization);

        return Role::query()
            ->where('organization_id', $organization->id)
            ->where('slug', $user->role)
            ->first();
    }

    private function ensureRoleBelongsToOrganization(Organization $organization, Role $role): void
    {
        abort_unless($role->organization_id === $organization->id, 403);
    }

    private function uniqueRoleSlug(Organization $organization, string $name, ?Role $ignoreRole = null): string
    {
        $baseSlug = Str::slug($name) ?: 'role';
        $slug = $baseSlug;
        $counter = 2;

        while (Role::query()
            ->where('organization_id', $organization->id)
            ->where('slug', $slug)
            ->when($ignoreRole, fn ($query) => $query->whereKeyNot($ignoreRole->id))
            ->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
