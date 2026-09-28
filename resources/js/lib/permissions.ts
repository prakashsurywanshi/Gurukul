export type StaffPermissionMap = Record<string, Record<string, boolean>>;

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete';

export const PLATFORM_ROLES = ['super_admin', 'branch_admin'];

export const PORTAL_ROLES = ['student', 'parent'];

/**
 * Roles whose navigation is driven by the RBAC permission map. Every other
 * role (including custom roles created through Roles & Permissions) must be
 * granted a feature before it becomes visible or reachable.
 */
export const PERMISSION_GOVERNED_ROLES = [
    'admin',
    'teacher',
    'receptionist',
    'accountant',
    'librarian',
    'driver',
    'transport_manager',
];

export function isPlatformRole(role?: string | null): boolean {
    return !!role && PLATFORM_ROLES.includes(role);
}

export function isPortalRole(role?: string | null): boolean {
    return !!role && PORTAL_ROLES.includes(role);
}

export function isPermissionGovernedRole(role?: string | null): boolean {
    return !!role && PERMISSION_GOVERNED_ROLES.includes(role);
}

export function permissionFor(
    feature: string | undefined,
    staffPermissions?: StaffPermissionMap,
): Record<string, boolean> | undefined {
    if (!feature) return undefined;

    return staffPermissions?.[feature];
}

/**
 * Mirrors StaffPermissionService::allows(). Platform roles bypass RBAC, portal
 * roles are handled by their own dashboards, and everyone else must have an
 * explicit grant. Unknown actions fail closed.
 */
export function canPerform(
    role: string | undefined,
    feature: string | undefined,
    action: PermissionAction = 'view',
    staffPermissions?: StaffPermissionMap,
): boolean {
    if (isPlatformRole(role)) return true;
    if (isPortalRole(role)) return true;
    if (!feature) return false;

    const permission = permissionFor(feature, staffPermissions);

    if (!permission) return false;

    if (action === 'view') return Boolean(permission.view);

    return Boolean(permission[action]);
}

export function canView(
    role: string | undefined,
    feature: string | undefined,
    staffPermissions?: StaffPermissionMap,
): boolean {
    return canPerform(role, feature, 'view', staffPermissions);
}

export interface SidebarAccessGate {
    roles: string[];
    feature?: string;
    module?: string;
    moduleFlags?: Record<string, boolean>;
    orgType?: string | null;
    orgTypes?: string[];
    staffPermissions?: StaffPermissionMap;
}

/**
 * Single source of truth for sidebar visibility. Mirrors the backend
 * `staff.permission` checks: portal-only items are never shown to staff,
 * disabled modules hide their items, platform roles bypass RBAC, and every
 * other role needs an explicit `view` grant. Custom roles keep their role
 * allow-list until an administrator grants feature permissions.
 */
export function canAccessSidebarItem(role: string | undefined, gate: SidebarAccessGate): boolean {
    const { roles, feature, module, moduleFlags, orgType, orgTypes, staffPermissions } = gate;

    if (orgTypes && orgTypes.length > 0 && orgType && !orgTypes.includes(orgType)) {
        return false;
    }

    if (role === 'super_admin') {
        return roles.includes('super_admin');
    }

    if (module && moduleFlags?.[module] === false) {
        return false;
    }

    if (roles.length > 0 && roles.every((itemRole) => isPortalRole(itemRole))) {
        return false;
    }

    if (isPlatformRole(role) || isPortalRole(role)) {
        return true;
    }

    if (canView(role, feature, staffPermissions)) {
        return true;
    }

    // Custom roles keep their role allow-list until an administrator grants
    // explicit feature permissions.
    return !isPermissionGovernedRole(role) && roles.includes(role ?? '');
}


