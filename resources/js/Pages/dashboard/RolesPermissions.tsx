import { useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Edit, Pencil, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useLanguage } from '../../i18n/LanguageProvider';

interface RolesPermissionsProps {
    user: any;
    rolePermissions?: RolePermissions | null;
    roleOptions?: string[];
    roleRecords?: RoleRecord[];
    permissionFeatures?: PermissionFeature[];
}

type PermissionAction = 'view' | 'add' | 'edit' | 'delete';

type PermissionFeature = {
    module: string;
    feature: string;
};

type RoleRecord = {
    id: number;
    name: string;
    slug: string;
    isSystemRole: boolean;
};

type RolePermissions = Record<string, Record<string, Record<PermissionAction, boolean>>>;
type StaffPermissions = Record<string, Partial<Record<PermissionAction, boolean>>>;

const permissionActions: PermissionAction[] = ['view', 'add', 'edit', 'delete'];
const permissionCheckboxClass =
    'data-[state=checked]:border-[#2563eb] data-[state=checked]:bg-[#2563eb] data-[state=checked]:text-white focus-visible:ring-[#93c5fd]';

const defaultPermissionFeatures: PermissionFeature[] = [
    { module: 'Dashboard', feature: 'Dashboard Home' },
    { module: 'Students', feature: 'Search Students' },
    { module: 'Students', feature: 'Student Details' },
    { module: 'Students', feature: 'Edit Student' },
    { module: 'Students', feature: 'Online Admission' },
    { module: 'Students', feature: 'Bulk Delete Students' },
    { module: 'Students', feature: 'Alumni Records' },
    { module: 'Staff', feature: 'User Management' },
    { module: 'Staff', feature: 'Staff Attendance' },
    { module: 'Staff', feature: 'Payroll Management' },
    { module: 'Staff', feature: 'Leave Management' },
    { module: 'Academics', feature: 'Class / Section' },
    { module: 'Academics', feature: 'Class Time Table' },
    { module: 'Academics', feature: 'Teachers Time Table' },
    { module: 'Academics', feature: 'Lesson Plan' },
    { module: 'Academics', feature: 'Homework' },
    { module: 'Academics', feature: 'Todo' },
    { module: 'Academics', feature: 'Subjects' },
    { module: 'Academics', feature: 'Promote Students' },
    { module: 'Front Office', feature: 'Admission Enquiry' },
    { module: 'Front Office', feature: 'Visitor Register' },
    { module: 'Front Office', feature: 'Phone Call Log' },
    { module: 'Front Office', feature: 'Postal Dispatch' },
    { module: 'Front Office', feature: 'Postal Delivery' },
    { module: 'Front Office', feature: 'Complains' },
    { module: 'Fees', feature: 'Fees Management' },
    { module: 'Fees', feature: 'Income Management' },
    { module: 'Fees', feature: 'Expense Management' },
    { module: 'Hostel', feature: 'Hostel Management' },
    { module: 'Hostel', feature: 'Hostel Fee Collection' },
    { module: 'Attendance', feature: 'Attendance Management' },
    { module: 'Exams', feature: 'Exam Management' },
    { module: 'Exams', feature: 'Hall Ticket' },
    { module: 'Exams', feature: 'Print Marksheet' },
    { module: 'Exams', feature: 'Online Exams' },
    { module: 'Certificates', feature: 'Certificate Management' },
    { module: 'Certificates', feature: 'Marksheet Management' },
    { module: 'Certificates', feature: 'Student ID Card Management' },
    { module: 'Library', feature: 'Library Management' },
    { module: 'Inventory', feature: 'Inventory Management' },
    { module: 'Communication', feature: 'Messages' },
    { module: 'Communication', feature: 'Send Whatsapp' },
    { module: 'Communication', feature: 'Notice Board' },
    { module: 'Communication', feature: 'Voice Calls' },
    { module: 'Communication', feature: 'Send Emails' },
    { module: 'Communication', feature: 'Download Center' },
    { module: 'Transport', feature: 'Transport Management' },
    { module: 'Transport', feature: 'Transport Fee Collection' },
    { module: 'Reports', feature: 'Reports & Analytics' },
    { module: 'Settings', feature: 'General Setting' },
    { module: 'Settings', feature: 'Communication Setting' },
    { module: 'Settings', feature: 'Roles & Permissions' },
    { module: 'Settings', feature: 'Sessions' },
    { module: 'Website', feature: 'Website CMS' },
    { module: 'Account', feature: 'Profile' },
    { module: 'Account', feature: 'Edit Profile' },
    { module: 'Account', feature: 'My Leaves' },
];

const featurePermissions = (
    view: boolean,
    add = false,
    edit = false,
    remove = false,
): Record<PermissionAction, boolean> => ({
    view,
    add,
    edit,
    delete: remove,
});

const createDefaultPermissions = (): RolePermissions => ({
    Admin: {
        'Dashboard Home': featurePermissions(true, false, false, false),
        'Search Students': featurePermissions(true, true, true, true),
        'Student Details': featurePermissions(true, false, false, false),
        'Edit Student': featurePermissions(true, false, true, false),
        'Online Admission': featurePermissions(true, true, true, true),
        'Bulk Delete Students': featurePermissions(true, false, false, true),
        'Alumni Records': featurePermissions(true, true, true, true),
        'User Management': featurePermissions(true, true, true, true),
        'Class / Section': featurePermissions(true, true, true, true),
        'Class Time Table': featurePermissions(true, true, true, true),
        'Teachers Time Table': featurePermissions(true, true, true, true),
        'Lesson Plan': featurePermissions(true, true, true, true),
        Subjects: featurePermissions(true, true, true, true),
        'Promote Students': featurePermissions(true, true, true, false),
        'Admission Enquiry': featurePermissions(true, true, true, true),
        'Visitor Register': featurePermissions(true, true, true, true),
        'Phone Call Log': featurePermissions(true, true, true, true),
        'Postal Dispatch': featurePermissions(true, true, true, true),
        'Postal Delivery': featurePermissions(true, true, true, true),
        Complains: featurePermissions(true, true, true, true),
        'Fees Management': featurePermissions(true, true, true, true),
        'Income Management': featurePermissions(true, true, true, true),
        'Expense Management': featurePermissions(true, true, true, true),
        'Hostel Management': featurePermissions(true, true, true, true),
        'Attendance Management': featurePermissions(true, true, true, true),
        'Exam Management': featurePermissions(true, true, true, true),
        'Online Exams': featurePermissions(true, true, true, true),
        'Certificate Management': featurePermissions(true, true, true, true),
        'Marksheet Management': featurePermissions(true, true, true, true),
        'Student ID Card Management': featurePermissions(true, true, true, true),
        'Library Management': featurePermissions(true, true, true, true),
        'Inventory Management': featurePermissions(true, true, true, true),
        Messages: featurePermissions(true, true, true, true),
        'Notice Board': featurePermissions(true, true, true, true),
        'Voice Calls': featurePermissions(true, true, true, true),
        'Send Emails': featurePermissions(true, true, true, true),
        'Download Center': featurePermissions(true, true, true, true),
        'Transport Management': featurePermissions(true, true, true, true),
        'Reports & Analytics': featurePermissions(true, false, false, false),
        'General Setting': featurePermissions(true, false, true, false),
        'Communication Setting': featurePermissions(true, false, true, false),
        'Roles & Permissions': featurePermissions(true, true, true, true),
        Sessions: featurePermissions(true, true, true, true),
        'Website CMS': featurePermissions(true, true, true, true),
        Profile: featurePermissions(true, false, true, false),
        'Edit Profile': featurePermissions(true, false, true, false),
    },
    Teacher: {
        'Dashboard Home': featurePermissions(true),
        'Search Students': featurePermissions(true, false, true, false),
        'Student Details': featurePermissions(true),
        'Edit Student': featurePermissions(false, false, false, false),
        'Online Admission': featurePermissions(true, true, false, false),
        'Bulk Delete Students': featurePermissions(false, false, false, false),
        'Alumni Records': featurePermissions(true, false, false, false),
        'User Management': featurePermissions(false, false, false, false),
        'Class / Section': featurePermissions(true, false, false, false),
        'Class Time Table': featurePermissions(true, true, true, false),
        'Teachers Time Table': featurePermissions(true, true, true, false),
        'Lesson Plan': featurePermissions(true, true, true, false),
        Subjects: featurePermissions(true, true, true, false),
        'Promote Students': featurePermissions(false, false, false, false),
        'Admission Enquiry': featurePermissions(false, false, false, false),
        'Visitor Register': featurePermissions(false, false, false, false),
        'Phone Call Log': featurePermissions(false, false, false, false),
        'Postal Dispatch': featurePermissions(false, false, false, false),
        'Postal Delivery': featurePermissions(false, false, false, false),
        Complains: featurePermissions(false, false, false, false),
        'Fees Management': featurePermissions(false, false, false, false),
        'Income Management': featurePermissions(false, false, false, false),
        'Expense Management': featurePermissions(false, false, false, false),
        'Hostel Management': featurePermissions(false, false, false, false),
        'Attendance Management': featurePermissions(true, true, true, false),
        'Exam Management': featurePermissions(true, true, true, false),
        'Online Exams': featurePermissions(true, true, true, false),
        'Certificate Management': featurePermissions(true, true, true, false),
        'Marksheet Management': featurePermissions(true, true, true, false),
        'Student ID Card Management': featurePermissions(true, true, true, false),
        'Library Management': featurePermissions(true, false, false, false),
        'Inventory Management': featurePermissions(false, false, false, false),
        Messages: featurePermissions(true, true, true, false),
        'Notice Board': featurePermissions(true, true, true, false),
        'Voice Calls': featurePermissions(true, true, false, false),
        'Send Emails': featurePermissions(true, true, false, false),
        'Download Center': featurePermissions(true, true, true, false),
        'Transport Management': featurePermissions(false, false, false, false),
        'Reports & Analytics': featurePermissions(false, false, false, false),
        'General Setting': featurePermissions(false, false, false, false),
        'Communication Setting': featurePermissions(false, false, false, false),
        'Roles & Permissions': featurePermissions(false, false, false, false),
        Sessions: featurePermissions(false, false, false, false),
        'Website CMS': featurePermissions(false, false, false, false),
        Profile: featurePermissions(true, false, true, false),
        'Edit Profile': featurePermissions(true, false, true, false),
    },
    Receptionist: {
        'Dashboard Home': featurePermissions(true),
        'Search Students': featurePermissions(true, true, false, false),
        'Student Details': featurePermissions(true),
        'Edit Student': featurePermissions(false, false, false, false),
        'Online Admission': featurePermissions(true, true, true, false),
        'Bulk Delete Students': featurePermissions(false, false, false, false),
        'Alumni Records': featurePermissions(true, true, false, false),
        'User Management': featurePermissions(false, false, false, false),
        'Class / Section': featurePermissions(false, false, false, false),
        'Class Time Table': featurePermissions(true, false, false, false),
        'Teachers Time Table': featurePermissions(true, false, false, false),
        'Lesson Plan': featurePermissions(false, false, false, false),
        Subjects: featurePermissions(false, false, false, false),
        'Promote Students': featurePermissions(false, false, false, false),
        'Admission Enquiry': featurePermissions(true, true, true, true),
        'Visitor Register': featurePermissions(true, true, true, true),
        'Phone Call Log': featurePermissions(true, true, true, true),
        'Postal Dispatch': featurePermissions(true, true, true, true),
        'Postal Delivery': featurePermissions(true, true, true, true),
        Complains: featurePermissions(true, true, true, true),
        'Fees Management': featurePermissions(true, true, false, false),
        'Income Management': featurePermissions(false, false, false, false),
        'Expense Management': featurePermissions(false, false, false, false),
        'Hostel Management': featurePermissions(false, false, false, false),
        'Attendance Management': featurePermissions(false, false, false, false),
        'Exam Management': featurePermissions(false, false, false, false),
        'Online Exams': featurePermissions(false, false, false, false),
        'Certificate Management': featurePermissions(false, false, false, false),
        'Marksheet Management': featurePermissions(false, false, false, false),
        'Student ID Card Management': featurePermissions(false, false, false, false),
        'Library Management': featurePermissions(false, false, false, false),
        'Inventory Management': featurePermissions(true, true, true, false),
        Messages: featurePermissions(true, true, true, false),
        'Notice Board': featurePermissions(true, false, false, false),
        'Voice Calls': featurePermissions(true, true, true, false),
        'Send Emails': featurePermissions(true, true, false, false),
        'Download Center': featurePermissions(true, true, true, false),
        'Transport Management': featurePermissions(true, true, true, true),
        'Reports & Analytics': featurePermissions(false, false, false, false),
        'General Setting': featurePermissions(false, false, false, false),
        'Communication Setting': featurePermissions(false, false, false, false),
        'Roles & Permissions': featurePermissions(false, false, false, false),
        Sessions: featurePermissions(false, false, false, false),
        'Website CMS': featurePermissions(false, false, false, false),
        Profile: featurePermissions(true, false, true, false),
        'Edit Profile': featurePermissions(true, false, true, false),
    },
    Accountant: {
        'Dashboard Home': featurePermissions(true),
        'Search Students': featurePermissions(true, false, false, false),
        'Student Details': featurePermissions(true),
        'Edit Student': featurePermissions(false, false, false, false),
        'Online Admission': featurePermissions(false, false, false, false),
        'Bulk Delete Students': featurePermissions(false, false, false, false),
        'Alumni Records': featurePermissions(false, false, false, false),
        'User Management': featurePermissions(false, false, false, false),
        'Class / Section': featurePermissions(false, false, false, false),
        'Class Time Table': featurePermissions(false, false, false, false),
        'Teachers Time Table': featurePermissions(false, false, false, false),
        'Lesson Plan': featurePermissions(false, false, false, false),
        Subjects: featurePermissions(false, false, false, false),
        'Promote Students': featurePermissions(false, false, false, false),
        'Admission Enquiry': featurePermissions(false, false, false, false),
        'Visitor Register': featurePermissions(false, false, false, false),
        'Phone Call Log': featurePermissions(false, false, false, false),
        'Postal Dispatch': featurePermissions(false, false, false, false),
        'Postal Delivery': featurePermissions(false, false, false, false),
        Complains: featurePermissions(false, false, false, false),
        'Fees Management': featurePermissions(true, true, true, true),
        'Income Management': featurePermissions(true, true, true, true),
        'Expense Management': featurePermissions(true, true, true, true),
        'Hostel Management': featurePermissions(false, false, false, false),
        'Attendance Management': featurePermissions(false, false, false, false),
        'Exam Management': featurePermissions(false, false, false, false),
        'Online Exams': featurePermissions(false, false, false, false),
        'Certificate Management': featurePermissions(false, false, false, false),
        'Marksheet Management': featurePermissions(false, false, false, false),
        'Student ID Card Management': featurePermissions(false, false, false, false),
        'Library Management': featurePermissions(false, false, false, false),
        'Inventory Management': featurePermissions(true, true, true, true),
        Messages: featurePermissions(false, false, false, false),
        'Notice Board': featurePermissions(false, false, false, false),
        'Voice Calls': featurePermissions(false, false, false, false),
        'Send Emails': featurePermissions(false, false, false, false),
        'Download Center': featurePermissions(false, false, false, false),
        'Transport Management': featurePermissions(false, false, false, false),
        'Reports & Analytics': featurePermissions(true, false, false, false),
        'General Setting': featurePermissions(false, false, false, false),
        'Communication Setting': featurePermissions(false, false, false, false),
        'Roles & Permissions': featurePermissions(false, false, false, false),
        Sessions: featurePermissions(false, false, false, false),
        'Website CMS': featurePermissions(false, false, false, false),
        Profile: featurePermissions(true, false, true, false),
        'Edit Profile': featurePermissions(true, false, true, false),
    },
    Librarian: {
        'Dashboard Home': featurePermissions(true, false, false, false),
        'Search Students': featurePermissions(true, false, false, false),
        'Student Details': featurePermissions(true, false, false, false),
        'Edit Student': featurePermissions(false, false, false, false),
        'Online Admission': featurePermissions(false, false, false, false),
        'Bulk Delete Students': featurePermissions(false, false, false, false),
        'Alumni Records': featurePermissions(false, false, false, false),
        'User Management': featurePermissions(false, false, false, false),
        'Class / Section': featurePermissions(false, false, false, false),
        'Class Time Table': featurePermissions(false, false, false, false),
        'Teachers Time Table': featurePermissions(false, false, false, false),
        'Lesson Plan': featurePermissions(false, false, false, false),
        Subjects: featurePermissions(false, false, false, false),
        'Promote Students': featurePermissions(false, false, false, false),
        'Admission Enquiry': featurePermissions(false, false, false, false),
        'Visitor Register': featurePermissions(false, false, false, false),
        'Phone Call Log': featurePermissions(false, false, false, false),
        'Postal Dispatch': featurePermissions(false, false, false, false),
        'Postal Delivery': featurePermissions(false, false, false, false),
        Complains: featurePermissions(false, false, false, false),
        'Fees Management': featurePermissions(false, false, false, false),
        'Income Management': featurePermissions(false, false, false, false),
        'Expense Management': featurePermissions(false, false, false, false),
        'Hostel Management': featurePermissions(false, false, false, false),
        'Attendance Management': featurePermissions(false, false, false, false),
        'Exam Management': featurePermissions(false, false, false, false),
        'Online Exams': featurePermissions(false, false, false, false),
        'Certificate Management': featurePermissions(false, false, false, false),
        'Marksheet Management': featurePermissions(false, false, false, false),
        'Student ID Card Management': featurePermissions(false, false, false, false),
        'Library Management': featurePermissions(true, true, true, true),
        'Inventory Management': featurePermissions(true, true, true, true),
        Messages: featurePermissions(false, false, false, false),
        'Notice Board': featurePermissions(true, false, false, false),
        'Voice Calls': featurePermissions(false, false, false, false),
        'Send Emails': featurePermissions(false, false, false, false),
        'Download Center': featurePermissions(true, false, false, false),
        'Transport Management': featurePermissions(false, false, false, false),
        'Reports & Analytics': featurePermissions(false, false, false, false),
        'General Setting': featurePermissions(false, false, false, false),
        'Communication Setting': featurePermissions(false, false, false, false),
        'Roles & Permissions': featurePermissions(false, false, false, false),
        Sessions: featurePermissions(false, false, false, false),
        'Website CMS': featurePermissions(false, false, false, false),
        Profile: featurePermissions(true, false, true, false),
        'Edit Profile': featurePermissions(true, false, true, false),
    },
});

export default function RolesPermissions({
    user,
    rolePermissions: initialRolePermissions,
    roleOptions: backendRoleOptions,
    roleRecords: backendRoleRecords,
    permissionFeatures: backendPermissionFeatures,
}: RolesPermissionsProps) {
    const pageProps = usePage().props as {
        flash?: { success?: string; error?: string };
        staffPermissions?: StaffPermissions;
    };
    const flash = pageProps.flash ?? {};
    const staffPermissions = pageProps.staffPermissions ?? {};
    const isSuperAdmin = user?.role === 'super_admin';
    const rolesPermissionsAccess = staffPermissions['Roles & Permissions'] ?? {};
    const canAddRolesPermissions = isSuperAdmin || Boolean(rolesPermissionsAccess.add);
    const canEditRolesPermissions = isSuperAdmin || Boolean(rolesPermissionsAccess.edit);
    const canDeleteRolesPermissions = isSuperAdmin || Boolean(rolesPermissionsAccess.delete);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedRole, setSelectedRole] = useState('Admin');
    const [newRoleName, setNewRoleName] = useState('');
    const [roleActionSaving, setRoleActionSaving] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
    const [editingRoleName, setEditingRoleName] = useState('');
    const [rolePermissions, setRolePermissions] = useState<RolePermissions>(createDefaultPermissions);
    const rolePermissionsRef = useRef<RolePermissions>(createDefaultPermissions());
    const permissionFeatures =
        backendPermissionFeatures && backendPermissionFeatures.length > 0
            ? backendPermissionFeatures
            : defaultPermissionFeatures;
    const { t } = useLanguage();
    const fallbackRoleOptions = useMemo(() => Object.keys(createDefaultPermissions()), []);

    const applyRolePermissions = (nextRolePermissions: RolePermissions) => {
        rolePermissionsRef.current = nextRolePermissions;
        setRolePermissions(nextRolePermissions);
    };

    useEffect(() => {
        if (initialRolePermissions && Object.keys(initialRolePermissions).length > 0) {
            applyRolePermissions(initialRolePermissions);
        }
    }, [initialRolePermissions]);

    useEffect(() => {
        if (flash.success) {
            setSuccessMessage(flash.success);
        }

        if (flash.error) {
            setErrorMessage(flash.error);
        }
    }, [flash.error, flash.success]);

    useEffect(() => {
        if (!canEditRolesPermissions && isEditing) {
            setIsEditing(false);
        }
    }, [canEditRolesPermissions, isEditing]);

    const groupedFeatures = useMemo(() => {
        return permissionFeatures.reduce<Record<string, PermissionFeature[]>>((accumulator, item) => {
            accumulator[item.module] = accumulator[item.module] || [];
            accumulator[item.module].push(item);
            return accumulator;
        }, {});
    }, [permissionFeatures]);

    const roleRecords = useMemo<RoleRecord[]>(() => {
        if (backendRoleRecords && backendRoleRecords.length > 0) {
            return backendRoleRecords;
        }

        const roles = backendRoleOptions && backendRoleOptions.length > 0 ? backendRoleOptions : fallbackRoleOptions;

        return roles.map((role, index) => ({
            id: index,
            name: role,
            slug: role,
            isSystemRole: true,
        }));
    }, [backendRoleOptions, backendRoleRecords, fallbackRoleOptions]);

    const roleOptions = useMemo(() => roleRecords.map((role) => role.slug), [roleRecords]);
    const selectedRoleRecord = roleRecords.find((role) => role.slug === selectedRole);

    useEffect(() => {
        if (roleOptions.length === 0) {
            return;
        }

        if (!roleOptions.includes(selectedRole)) {
            setSelectedRole(roleOptions[0]);
        }
    }, [roleOptions, selectedRole]);

    const persistRolePermissions = (
        nextRolePermissions: RolePermissions,
        successText: string,
        onSuccess?: () => void,
    ) => {
        setErrorMessage('');
        setIsSaving(true);

        router.patch(
            '/settings/roles-permissions',
            { rolePermissions: nextRolePermissions },
            {
                preserveScroll: true,
                onSuccess: () => {
                    applyRolePermissions(nextRolePermissions);
                    setSuccessMessage(successText);
                    onSuccess?.();
                },
                onError: () => {
                    setErrorMessage(t('Failed to update roles and permissions.'));
                },
                onFinish: () => {
                    setIsSaving(false);
                },
            },
        );
    };

    const togglePermission = (feature: string, action: PermissionAction, value: boolean) => {
        if (!canEditRolesPermissions) {
            return;
        }

        const current = rolePermissionsRef.current;
        const currentRolePermissions = current[selectedRole] || {};
        const nextRolePermissions = {
            ...current,
            [selectedRole]: {
                ...currentRolePermissions,
                [feature]: {
                    ...(currentRolePermissions[feature] || {
                        view: false,
                        add: false,
                        edit: false,
                        delete: false,
                    }),
                    [action]: value,
                },
            },
        };

        applyRolePermissions(nextRolePermissions);
    };

    const toggleGroupPermissions = (features: PermissionFeature[], value: boolean) => {
        if (!canEditRolesPermissions) {
            return;
        }

        const current = rolePermissionsRef.current;
        const nextSelectedRolePermissions = { ...current[selectedRole] };

        features.forEach((item) => {
            const currentFeaturePermissions = nextSelectedRolePermissions[item.feature] || {
                view: false,
                add: false,
                edit: false,
                delete: false,
            };

            nextSelectedRolePermissions[item.feature] = {
                ...currentFeaturePermissions,
                view: value,
                add: value,
                edit: value,
                delete: value,
            };
        });

        applyRolePermissions({
            ...current,
            [selectedRole]: nextSelectedRolePermissions,
        });
    };

    const handleSave = () => {
        if (!canEditRolesPermissions) {
            setErrorMessage(t('You do not have permission to edit roles and permissions.'));
            return;
        }

        persistRolePermissions(
            rolePermissionsRef.current,
            `${selectedRoleRecord?.name ?? selectedRole} ${t('permissions.updated.suffix')}`,
            () => {
                setIsEditing(false);
            },
        );
    };

    const handleCreateRole = () => {
        if (!canAddRolesPermissions) {
            setErrorMessage(t('You do not have permission to add roles.'));
            return;
        }

        const name = newRoleName.trim();

        if (!name) {
            setErrorMessage(t('Enter a role name before creating it.'));
            return;
        }

        setRoleActionSaving(true);
        setErrorMessage('');

        router.post(
            '/settings/roles',
            { name },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewRoleName('');
                    setSuccessMessage(t('Role created successfully.'));
                },
                onError: () => setErrorMessage(t('Failed to create role.')),
                onFinish: () => setRoleActionSaving(false),
            },
        );
    };

    const openRenameRole = (role: RoleRecord) => {
        if (!canEditRolesPermissions) {
            setErrorMessage(t('You do not have permission to edit roles.'));
            return;
        }

        setEditingRole(role);
        setEditingRoleName(role.name);
        setErrorMessage('');
    };

    const handleUpdateRole = () => {
        if (!canEditRolesPermissions) {
            setErrorMessage(t('You do not have permission to edit roles.'));
            return;
        }

        const name = editingRoleName.trim();

        if (!editingRole || !name) {
            setErrorMessage(t('Enter a role name before updating it.'));
            return;
        }

        setRoleActionSaving(true);
        setErrorMessage('');

        router.patch(
            `/settings/roles/${editingRole.id}`,
            { name },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingRole(null);
                    setEditingRoleName('');
                    setSuccessMessage(t('Role updated successfully.'));
                },
                onError: () => setErrorMessage(t('Failed to update role.')),
                onFinish: () => setRoleActionSaving(false),
            },
        );
    };

    const handleDeleteRole = (role: RoleRecord) => {
        if (!canDeleteRolesPermissions) {
            setErrorMessage(t('You do not have permission to delete roles.'));
            return;
        }

        if (role.isSystemRole) {
            setErrorMessage(t('Default system roles cannot be deleted.'));
            return;
        }

        if (!window.confirm(t('Delete role confirm').replace('{name}', role.name))) {
            return;
        }

        setRoleActionSaving(true);
        setErrorMessage('');

        router.delete(`/settings/roles/${role.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedRole === role.slug && roleRecords.length > 0) {
                    setSelectedRole(roleRecords[0].slug);
                }
                setSuccessMessage(t('Role deleted successfully.'));
            },
            onError: () => setErrorMessage(t('Failed to delete role.')),
            onFinish: () => setRoleActionSaving(false),
        });
    };

    return (
        <DashboardLayout user={user} activeTab="roles-permissions">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Roles & Permissions')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Create staff roles and assign module-wise permissions for each role.')}
                            </p>
                        </div>
                    </div>

                    {successMessage && (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                            {successMessage}
                        </div>
                    )}

                    {errorMessage && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            {errorMessage}
                        </div>
                    )}

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-200">
                            <CardTitle>{t('Manage Roles')}</CardTitle>
                            <CardDescription>
                                {t('Add new staff roles, rename existing roles, or remove custom roles.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-4">
                            {canAddRolesPermissions && (
                                <div className="flex flex-col gap-3 md:flex-row">
                                    <Input
                                        value={newRoleName}
                                        onChange={(event) => setNewRoleName(event.target.value)}
                                        placeholder={t('Role name')}
                                        className="md:max-w-sm"
                                    />
                                    <Button type="button" onClick={handleCreateRole} disabled={roleActionSaving}>
                                        <Plus className="h-4 w-4" />
                                        {t('Add Role')}
                                    </Button>
                                </div>
                            )}

                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                {roleRecords.map((role) => (
                                    <div
                                        key={role.slug}
                                        className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">{role.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {role.isSystemRole ? t('System role') : t('Custom role')}
                                            </p>
                                        </div>
                                        {(canEditRolesPermissions || canDeleteRolesPermissions) && (
                                            <div className="flex items-center gap-1">
                                                {canEditRolesPermissions && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openRenameRole(role)}
                                                        disabled={roleActionSaving}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {canDeleteRolesPermissions && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteRole(role)}
                                                        disabled={roleActionSaving || role.isSystemRole}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-200">
                            <div className="flex items-start justify-between gap-4 overflow-x-auto">
                                <div className="flex min-w-0 items-start gap-3">
                                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <CardTitle>
                                            {t('Assign Permission')} ({selectedRoleRecord?.name ?? selectedRole})
                                        </CardTitle>
                                        <CardDescription>
                                            {t(
                                                'Use the matrix below to manage feature-level access for the selected role.',
                                            )}
                                        </CardDescription>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-3">
                                    <div className="w-56">
                                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select role')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roleOptions.map((role) => (
                                                    <SelectItem key={role} value={role}>
                                                        {roleRecords.find((item) => item.slug === role)?.name ?? role}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        {canEditRolesPermissions && (
                            <div className="flex justify-end gap-2 border-b border-slate-200 bg-white p-4">
                                <Button
                                    type="button"
                                    variant={isEditing ? 'outline' : 'default'}
                                    onClick={() => {
                                        setSuccessMessage('');
                                        setErrorMessage('');
                                        if (isEditing) {
                                            applyRolePermissions(
                                                initialRolePermissions && Object.keys(initialRolePermissions).length > 0
                                                    ? initialRolePermissions
                                                    : createDefaultPermissions(),
                                            );
                                        }
                                        setIsEditing((current) => !current);
                                    }}
                                    disabled={isSaving}
                                >
                                    <Pencil className="h-4 w-4" />
                                    {isEditing ? t('Cancel Edit') : t('Edit Permissions')}
                                </Button>
                                {isEditing && (
                                    <Button
                                        type="button"
                                        onClick={handleSave}
                                        className="bg-blue-600 text-white hover:bg-blue-700"
                                        disabled={isSaving}
                                    >
                                        <Save className="h-4 w-4" />
                                        {isSaving ? t('Saving...') : t('Save Changes')}
                                    </Button>
                                )}
                            </div>
                        )}

                        <CardContent className="p-0">
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full min-w-[860px] border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                {t('Module')}
                                            </th>
                                            <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                {t('Feature')}
                                            </th>
                                            <th className="border-b border-slate-200 px-4 py-3 text-center text-sm font-semibold capitalize text-slate-700">
                                                {t('View')}
                                            </th>
                                            <th className="border-b border-slate-200 px-4 py-3 text-center text-sm font-semibold capitalize text-slate-700">
                                                {t('Add')}
                                            </th>
                                            <th className="border-b border-slate-200 px-4 py-3 text-center text-sm font-semibold capitalize text-slate-700">
                                                {t('Edit')}
                                            </th>
                                            <th className="border-b border-slate-200 px-4 py-3 text-center text-sm font-semibold capitalize text-slate-700">
                                                {t('Delete')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(groupedFeatures).map(([module, features]) =>
                                            features.map((item, index) => (
                                                <tr key={`${module}-${item.feature}`} className="bg-white">
                                                    {index === 0 && (
                                                        <td
                                                            rowSpan={features.length}
                                                            className="border-b border-slate-200 px-4 py-3 align-top text-sm font-semibold text-slate-800"
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <Checkbox
                                                                    className={permissionCheckboxClass}
                                                                    checked={features.every((featureItem) =>
                                                                        permissionActions.every((action) =>
                                                                            Boolean(
                                                                                rolePermissions[selectedRole]?.[
                                                                                    featureItem.feature
                                                                                ]?.[action],
                                                                            ),
                                                                        ),
                                                                    )}
                                                                    disabled={!isEditing || !canEditRolesPermissions}
                                                                    onCheckedChange={(checked) =>
                                                                        toggleGroupPermissions(
                                                                            features,
                                                                            checked === true,
                                                                        )
                                                                    }
                                                                />
                                                                <span>{t(module)}</span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                                                        {t(item.feature)}
                                                    </td>
                                                    {permissionActions.map((action) => (
                                                        <td
                                                            key={`${item.feature}-${action}`}
                                                            className="border-b border-slate-200 px-4 py-3 text-center"
                                                        >
                                                            <Checkbox
                                                                className={permissionCheckboxClass}
                                                                checked={Boolean(
                                                                    rolePermissions[selectedRole]?.[item.feature]?.[
                                                                        action
                                                                    ],
                                                                )}
                                                                disabled={!isEditing || !canEditRolesPermissions}
                                                                onCheckedChange={(checked) =>
                                                                    togglePermission(
                                                                        item.feature,
                                                                        action,
                                                                        checked === true,
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            )),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Dialog open={Boolean(editingRole)} onOpenChange={(open) => !open && setEditingRole(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('Update Role')}</DialogTitle>
                            </DialogHeader>
                            <Input
                                value={editingRoleName}
                                onChange={(event) => setEditingRoleName(event.target.value)}
                                placeholder={t('Role name')}
                            />
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingRole(null)}
                                    disabled={roleActionSaving}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button type="button" onClick={handleUpdateRole} disabled={roleActionSaving}>
                                    <Save className="h-4 w-4" />
                                    {roleActionSaving ? t('Saving...') : t('Save Role')}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </DashboardLayout>
    );
}
