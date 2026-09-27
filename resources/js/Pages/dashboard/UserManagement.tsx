import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Plus,
    Search,
    Edit,
    ExternalLink,
    Trash2,
    Users,
    UserCheck,
    UserX,
    Key,
    Mail,
    Shield,
    Eye,
    Phone,
    MapPin,
    Briefcase,
    Building2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '../ui/pagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';

type UserStatus = 'active' | 'inactive';

interface ManagedUser {
    id: number;
    name: string;
    email: string;
    role: string;
    phone?: string | null;
    address?: string | null;
    status: UserStatus;
    designation_id?: number | null;
    department_id?: number | null;
    designation_name?: string | null;
    department_name?: string | null;
}

interface OptionItem {
    id: number;
    name: string;
}

interface StaffProfileForm {
    aadhar_number: string;
    pan: string;
    national_teacher_id: string;
    employee_code: string;
    appointment_date: string;
    appointment_type: string;
    recruitment_type: string;
    post: string;
    pay_scale: string;
    basic_pay: string;
    government_service_join_date: string;
    qualification: string;
    teaching_qualification: string;
    tet_status: string;
    mother_tongue: string;
    religion: string;
    category: string;
    subjects_taught: string[];
    experience_years: string;
    training_received: string;
    teacher_type: string;
}

interface ManagedUser {
    id: number;
    name: string;
    email: string;
    role: string;
    phone?: string | null;
    address?: string | null;
    status: UserStatus;
    designation_id?: number | null;
    department_id?: number | null;
    designation_name?: string | null;
    department_name?: string | null;
    profile?: Partial<StaffProfileForm> | null;
}

interface RoleOption {
    id: number;
    name: string;
    slug: string;
    isSystemRole: boolean;
}

interface UserManagementProps {
    user: {
        id: number;
        role: string;
    };
    userRecords: ManagedUser[];
    roleOptions: RoleOption[];
    designations?: OptionItem[];
    departments?: OptionItem[];
}

const DEFAULT_FORM = {
    name: '',
    email: '',
    password: '',
    role: '',
    phone: '',
    address: '',
    status: 'active' as UserStatus,
    designation_id: '',
    department_id: '',
    profile: {},
};

const PROFILE_FIELDS: { key: keyof StaffProfileForm; label: string; subtotal?: 'date' | 'subjects' }[] = [
    { key: 'aadhar_number', label: 'Aadhaar Number' },
    { key: 'pan', label: 'PAN' },
    { key: 'national_teacher_id', label: 'National Teacher ID' },
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'appointment_date', label: 'Appointment Date', subtotal: 'date' },
    { key: 'appointment_type', label: 'Appointment Type' },
    { key: 'recruitment_type', label: 'Recruitment Type' },
    { key: 'post', label: 'Post' },
    { key: 'pay_scale', label: 'Pay Scale' },
    { key: 'basic_pay', label: 'Basic Pay' },
    { key: 'government_service_join_date', label: 'Govt. Service Join Date', subtotal: 'date' },
    { key: 'qualification', label: 'Qualification' },
    { key: 'teaching_qualification', label: 'Teaching Qualification' },
    { key: 'tet_status', label: 'TET Status' },
    { key: 'mother_tongue', label: 'Mother Tongue' },
    { key: 'religion', label: 'Religion' },
    { key: 'category', label: 'Category' },
    { key: 'subjects_taught', label: 'Subjects Taught', subtotal: 'subjects' },
    { key: 'experience_years', label: 'Experience (Years)' },
    { key: 'training_received', label: 'Training Received' },
    { key: 'teacher_type', label: 'Teacher Type' },
];

function StaffPortalSection({
    value,
    onChange,
}: {
    value: Partial<StaffProfileForm>;
    onChange: (patch: Partial<StaffProfileForm>) => void;
}) {
    const { t } = useLanguage();

    const setField = (key: keyof StaffProfileForm, fieldValue: string | string[]) => {
        onChange({ [key]: fieldValue } as Partial<StaffProfileForm>);
    };

    return (
        <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
                {t('UDISE / SARAL Staff Profile')}
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
                {PROFILE_FIELDS.map((field) => {
                    if (field.subtotal === 'subjects') {
                        return (
                            <div key={field.key} className="col-span-2 space-y-2">
                                <Label>{t(field.label)}</Label>
                                <Input
                                    value={Array.isArray(value.subjects_taught) ? value.subjects_taught.join(', ') : ''}
                                    onChange={(event) =>
                                        setField(
                                            field.key,
                                            event.target.value
                                                .split(',')
                                                .map((item) => item.trim())
                                                .filter(Boolean),
                                        )
                                    }
                                    placeholder={t('e.g. Mathematics, Science')}
                                />
                            </div>
                        );
                    }

                    return (
                        <div key={field.key} className="space-y-2">
                            <Label>{t(field.label)}</Label>
                            <Input
                                type={field.subtotal === 'date' ? 'date' : 'text'}
                                value={String(value[field.key] ?? '')}
                                onChange={(event) => setField(field.key, event.target.value)}
                            />
                        </div>
                    );
                })}
            </div>
        </details>
    );
}

export default function UserManagement({
    user,
    userRecords,
    roleOptions,
    designations = [],
    departments = [],
}: UserManagementProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const pageErrors = ((usePage().props as any).errors ?? {}) as Record<string, string | string[]>;
    const [users, setUsers] = useState<ManagedUser[]>(userRecords ?? []);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(DEFAULT_FORM);
    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [showCreateDesignation, setShowCreateDesignation] = useState(false);
    const [showCreateDepartment, setShowCreateDepartment] = useState(false);
    const [newDesignationName, setNewDesignationName] = useState('');
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const roleNameBySlug = useMemo(
        () => new Map((roleOptions ?? []).map((role) => [role.slug, role.name])),
        [roleOptions],
    );

    useEffect(() => {
        setUsers(userRecords ?? []);
        setLoading(false);
    }, [userRecords]);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const resetForm = () => {
        setFormData(DEFAULT_FORM);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        resetForm();
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setSelectedUser(null);
        resetForm();
    };

    const closeViewModal = () => {
        setShowViewModal(false);
        setSelectedUser(null);
    };

    const closeDeleteDialog = () => {
        setShowDeleteDialog(false);
        setSelectedUser(null);
    };

    const handleCreateUser = async () => {
        if (!formData.name || !formData.email || !formData.password || !formData.role) {
            toast.error('Please fill all required fields');
            return;
        }

        setLoading(true);
        router.post('/staff', formData, {
            preserveScroll: true,
            onSuccess: () => {
                closeCreateModal();
            },
            onError: (errors) => {
                setLoading(false);
                const message = Object.values(errors)[0];
                toast.error(Array.isArray(message) ? message[0] : message || 'Failed to create user');
            },
            onFinish: () => setLoading(false),
        });
    };

    const handleUpdateUser = async () => {
        if (!selectedUser || !formData.name || !formData.email || !formData.role) {
            toast.error('Please fill all required fields');
            return;
        }

        setLoading(true);
        router.patch(`/staff/${selectedUser.id}`, formData, {
            preserveScroll: true,
            onSuccess: () => {
                closeEditModal();
            },
            onError: () => {
                setLoading(false);
                toast.error('Failed to update user');
            },
            onFinish: () => setLoading(false),
        });
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) {
            return;
        }

        setLoading(true);
        router.delete(`/staff/${selectedUser.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                closeDeleteDialog();
            },
            onError: () => {
                setLoading(false);
                toast.error('Failed to delete user');
            },
            onFinish: () => setLoading(false),
        });
    };

    const handleCreateDesignation = () => {
        if (!newDesignationName.trim()) {
            toast.error('Please enter a designation name');
            return;
        }
        router.post(
            '/staff/designations',
            { name: newDesignationName.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowCreateDesignation(false);
                    setNewDesignationName('');
                    toast.success('Designation created');
                },
                onError: (errors) => {
                    const message = Object.values(errors)[0];
                    toast.error(Array.isArray(message) ? message[0] : message || 'Failed to create designation');
                },
            },
        );
    };

    const handleCreateDepartment = () => {
        if (!newDepartmentName.trim()) {
            toast.error('Please enter a department name');
            return;
        }
        router.post(
            '/staff/departments',
            { name: newDepartmentName.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowCreateDepartment(false);
                    setNewDepartmentName('');
                    toast.success('Department created');
                },
                onError: (errors) => {
                    const message = Object.values(errors)[0];
                    toast.error(Array.isArray(message) ? message[0] : message || 'Failed to create department');
                },
            },
        );
    };

    const handleToggleStatus = async (managedUser: ManagedUser) => {
        const newStatus = managedUser.status === 'active' ? 'inactive' : 'active';

        setLoading(true);
        router.patch(
            `/staff/${managedUser.id}/status`,
            { status: newStatus },
            {
                preserveScroll: true,
                onError: () => {
                    setLoading(false);
                    toast.error('Failed to update user status');
                },
                onFinish: () => setLoading(false),
            },
        );
    };

    const handleResetPassword = async (managedUser: ManagedUser) => {
        const confirmed = window.confirm(`Reset password for ${managedUser.name}?`);

        if (!confirmed) {
            return;
        }

        setLoading(true);
        router.post(
            `/staff/${managedUser.id}/reset-password`,
            {},
            {
                preserveScroll: true,
                onError: () => {
                    setLoading(false);
                    toast.error('Failed to reset password');
                },
                onFinish: () => setLoading(false),
            },
        );
    };

    const openEditModal = (managedUser: ManagedUser) => {
        setSelectedUser(managedUser);
        setFormData({
            name: managedUser.name,
            email: managedUser.email,
            password: '',
            role: managedUser.role,
            phone: managedUser.phone || '',
            address: managedUser.address || '',
            status: managedUser.status || 'active',
            designation_id: managedUser.designation_id?.toString() || '',
            department_id: managedUser.department_id?.toString() || '',
            profile: managedUser.profile ?? {},
        });
        setShowEditModal(true);
    };

    const openDeleteDialog = (managedUser: ManagedUser) => {
        setSelectedUser(managedUser);
        setShowDeleteDialog(true);
    };

    const openViewModal = (managedUser: ManagedUser) => {
        setSelectedUser(managedUser);
        setShowViewModal(true);
    };

    const filteredUsers = useMemo(() => {
        return users.filter((managedUser) => {
            const matchesSearch =
                managedUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                managedUser.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'all' || managedUser.role === roleFilter;
            const matchesStatus = statusFilter === 'all' || managedUser.status === statusFilter;

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [roleFilter, searchQuery, statusFilter, users]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
    const paginatedUsers = useMemo(
        () => filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
        [filteredUsers, currentPage],
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter, statusFilter]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const totalUsers = users.length;
    const activeUsers = users.filter((managedUser) => managedUser.status === 'active').length;
    const inactiveUsers = users.filter((managedUser) => managedUser.status === 'inactive').length;
    const adminUsers = users.filter((managedUser) => managedUser.role === 'admin').length;

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-100 text-purple-800';
            case 'teacher':
                return 'bg-blue-100 text-blue-800';
            case 'accountant':
                return 'bg-green-100 text-green-800';
            case 'librarian':
                return 'bg-yellow-100 text-yellow-800';
            case 'receptionist':
                return 'bg-pink-100 text-pink-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleDisplayName = (role: string) =>
        roleNameBySlug.get(role) ??
        role
            .split(/[-_]/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

    const canManageUsers = ['super_admin', 'admin'].includes(user.role);

    if (!canManageUsers) {
        return (
            <div className="p-6">
                <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>{t("You don't have permission to access user management.")}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <DashboardLayout user={user} activeTab="staff" onLogout={() => {}}>
            <div className="p-6 space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">{t('Staff Management')}</h1>
                        <p className="mt-1 text-gray-600">{t('Manage staff and user accounts')}</p>
                    </div>
                    <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {t('Add New User')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>{t('Total Users')}</CardDescription>
                            <CardTitle className="text-3xl">{totalUsers}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users className="h-4 w-4" />
                                {t('All staff members')}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>{t('Active Users')}</CardDescription>
                            <CardTitle className="text-3xl text-green-600">{activeUsers}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <UserCheck className="h-4 w-4" />
                                {t('Currently active')}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>{t('Inactive Users')}</CardDescription>
                            <CardTitle className="text-3xl text-red-600">{inactiveUsers}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <UserX className="h-4 w-4" />
                                {t('Not active')}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>{t('Administrators')}</CardDescription>
                            <CardTitle className="text-3xl text-purple-600">{adminUsers}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Shield className="h-4 w-4" />
                                {t('Admin access')}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Users')}</CardTitle>
                        <CardDescription>{t('Search and filter users')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-4 md:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder={t('Search by name or email...')}
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder={t('Filter by role')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Roles')}</SelectItem>
                                    {roleOptions.map((role) => (
                                        <SelectItem key={role.slug} value={role.slug}>
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder={t('Filter by status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Status')}</SelectItem>
                                    <SelectItem value="active">{t('Active')}</SelectItem>
                                    <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-20">{t('S.No.')}</TableHead>
                                        <TableHead>{t('Name')}</TableHead>
                                        <TableHead>{t('Email')}</TableHead>
                                        <TableHead>{t('Role')}</TableHead>
                                        <TableHead>{t('Phone')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead className="text-right">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                                                {t('No users found')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedUsers.map((managedUser, index) => (
                                            <TableRow key={managedUser.id}>
                                                <TableCell className="text-gray-600">
                                                    {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                                </TableCell>
                                                <TableCell className="font-medium">{managedUser.name}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-4 w-4 text-gray-400" />
                                                        {managedUser.email}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getRoleBadgeColor(managedUser.role)}>
                                                        {getRoleDisplayName(managedUser.role)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{managedUser.phone || t('N/A')}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            managedUser.status === 'active' ? 'default' : 'secondary'
                                                        }
                                                        className={
                                                            managedUser.status === 'active'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }
                                                    >
                                                        {managedUser.status === 'active' ? t('Active') : t('Inactive')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            asChild
                                                            variant="ghost"
                                                            size="sm"
                                                            title={t('Open Staff Hub')}
                                                        >
                                                            <Link href={`/staff/${managedUser.id}`}>
                                                                <ExternalLink className="h-4 w-4 text-blue-600" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openViewModal(managedUser)}
                                                            title={t('View staff')}
                                                            disabled={loading}
                                                        >
                                                            <Eye className="h-4 w-4 text-slate-600" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditModal(managedUser)}
                                                            title={t('Edit user')}
                                                            disabled={loading}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleToggleStatus(managedUser)}
                                                            title={
                                                                managedUser.status === 'active'
                                                                    ? t('Deactivate')
                                                                    : t('Activate')
                                                            }
                                                            disabled={loading}
                                                        >
                                                            {managedUser.status === 'active' ? (
                                                                <UserX className="h-4 w-4 text-red-600" />
                                                            ) : (
                                                                <UserCheck className="h-4 w-4 text-green-600" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openDeleteDialog(managedUser)}
                                                            title={t('Delete user')}
                                                            disabled={loading}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {filteredUsers.length > 0 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            {t('Showing {start} to {end} of {total} entries', {
                                start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                                end: Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length),
                                total: filteredUsers.length,
                            })}
                        </p>
                        <Pagination className="mx-0 w-auto justify-end">
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (currentPage > 1) setCurrentPage((p) => p - 1);
                                        }}
                                    />
                                </PaginationItem>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                                    <PaginationItem key={pageNumber}>
                                        <PaginationLink
                                            href="#"
                                            isActive={pageNumber === currentPage}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setCurrentPage(pageNumber);
                                            }}
                                        >
                                            {pageNumber}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}
                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (currentPage < totalPages) setCurrentPage((p) => p + 1);
                                        }}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}

                <Dialog
                    open={showCreateModal}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeCreateModal();
                            return;
                        }

                        setShowCreateModal(true);
                    }}
                >
                    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t('Create New User')}</DialogTitle>
                            <DialogDescription>{t('Add a new staff member or user to the system')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            {Object.keys(pageErrors).length > 0 && (
                                <Alert variant="destructive">
                                    <AlertDescription>
                                        {Array.isArray(Object.values(pageErrors)[0])
                                            ? Object.values(pageErrors)[0][0]
                                            : Object.values(pageErrors)[0]}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('Full Name *')}</Label>
                                    <Input
                                        id="name"
                                        placeholder={t('Enter full name')}
                                        value={formData.name}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                name: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">{t('Email *')}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={t('Enter email')}
                                        value={formData.email}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                email: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">{t('Password *')}</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder={t('Enter password')}
                                        value={formData.password}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                password: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">{t('Role *')}</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(value) =>
                                            setFormData({
                                                ...formData,
                                                role: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select role')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roleOptions.map((role) => (
                                                <SelectItem key={role.slug} value={role.slug}>
                                                    {role.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t('Phone Number')}</Label>
                                    <Input
                                        id="phone"
                                        placeholder={t('Enter phone number')}
                                        value={formData.phone}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                phone: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">{t('Status')}</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value: UserStatus) =>
                                            setFormData({
                                                ...formData,
                                                status: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="designation_id">{t('Designation')}</Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Select
                                                value={formData.designation_id}
                                                onValueChange={(value) =>
                                                    setFormData({
                                                        ...formData,
                                                        designation_id: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select designation')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {designations.map((d) => (
                                                        <SelectItem key={d.id} value={d.id.toString()}>
                                                            {d.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setShowCreateDesignation(true)}
                                            title={t('Add new designation')}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="department_id">{t('Department')}</Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Select
                                                value={formData.department_id}
                                                onValueChange={(value) =>
                                                    setFormData({
                                                        ...formData,
                                                        department_id: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select department')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {departments.map((d) => (
                                                        <SelectItem key={d.id} value={d.id.toString()}>
                                                            {d.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setShowCreateDepartment(true)}
                                            title={t('Add new department')}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">{t('Address')}</Label>
                                <Input
                                    id="address"
                                    placeholder={t('Enter address')}
                                    value={formData.address}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            address: event.target.value,
                                        })
                                    }
                                />
                            </div>

                            <StaffPortalSection
                                value={formData.profile}
                                onChange={(patch) =>
                                    setFormData({
                                        ...formData,
                                        profile: { ...formData.profile, ...patch },
                                    })
                                }
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={closeCreateModal}>
                                {t('Cancel')}
                            </Button>
                            <Button onClick={handleCreateUser} disabled={loading}>
                                {loading ? t('Creating...') : t('Create User')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={showViewModal}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeViewModal();
                            return;
                        }

                        setShowViewModal(true);
                    }}
                >
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>{t('Staff Details')}</DialogTitle>
                            <DialogDescription>
                                {t('Review staff member information in a read-only view.')}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedUser && (
                            <div className="space-y-5 py-2">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-semibold text-slate-900">
                                                {selectedUser.name}
                                            </h3>
                                            <p className="mt-1 text-sm text-slate-500">{selectedUser.email}</p>
                                        </div>
                                        <Badge className={getRoleBadgeColor(selectedUser.role)}>
                                            {getRoleDisplayName(selectedUser.role)}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                            {t('Status')}
                                        </p>
                                        <Badge
                                            variant={selectedUser.status === 'active' ? 'default' : 'secondary'}
                                            className={`mt-3 ${
                                                selectedUser.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}
                                        >
                                            {selectedUser.status === 'active' ? t('Active') : t('Inactive')}
                                        </Badge>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                            {t('Role')}
                                        </p>
                                        <p className="mt-3 text-sm font-medium text-slate-900">
                                            {getRoleDisplayName(selectedUser.role)}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                            {t('Designation')}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-900">
                                            <Briefcase className="h-4 w-4 text-slate-400" />
                                            <span>{selectedUser.designation_name || t('Not provided')}</span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                            {t('Department')}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-900">
                                            <Building2 className="h-4 w-4 text-slate-400" />
                                            <span>{selectedUser.department_name || t('Not provided')}</span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                            {t('Email')}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-900">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                            <span>{selectedUser.email}</span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                            {t('Phone')}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-900">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                            <span>{selectedUser.phone || t('Not provided')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-4">
                                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                        {t('Address')}
                                    </p>
                                    <div className="mt-3 flex items-start gap-2 text-sm text-slate-900">
                                        <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                                        <span>{selectedUser.address || t('Not provided')}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            {selectedUser && (
                                <Button
                                    variant="outline"
                                    onClick={() => handleResetPassword(selectedUser)}
                                    disabled={loading}
                                >
                                    <Key className="mr-2 h-4 w-4" />
                                    {loading ? t('Resetting...') : t('Reset Password')}
                                </Button>
                            )}
                            <Button variant="outline" onClick={closeViewModal}>
                                {t('Close')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={showEditModal}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeEditModal();
                            return;
                        }

                        setShowEditModal(true);
                    }}
                >
                    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t('Edit User')}</DialogTitle>
                            <DialogDescription>{t('Update user information')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">{t('Full Name *')}</Label>
                                    <Input
                                        id="edit-name"
                                        placeholder={t('Enter full name')}
                                        value={formData.name}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                name: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-email">{t('Email *')}</Label>
                                    <Input
                                        id="edit-email"
                                        type="email"
                                        placeholder={t('Enter email')}
                                        value={formData.email}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                email: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-role">{t('Role *')}</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(value) =>
                                            setFormData({
                                                ...formData,
                                                role: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select role')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roleOptions.map((role) => (
                                                <SelectItem key={role.slug} value={role.slug}>
                                                    {role.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-phone">{t('Phone Number')}</Label>
                                    <Input
                                        id="edit-phone"
                                        placeholder={t('Enter phone number')}
                                        value={formData.phone}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                phone: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-status">{t('Status')}</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value: UserStatus) =>
                                            setFormData({
                                                ...formData,
                                                status: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-address">{t('Address')}</Label>
                                    <Input
                                        id="edit-address"
                                        placeholder={t('Enter address')}
                                        value={formData.address}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                address: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('Designation')}</Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Select
                                                value={formData.designation_id}
                                                onValueChange={(value) =>
                                                    setFormData({
                                                        ...formData,
                                                        designation_id: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select designation')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {designations.map((d) => (
                                                        <SelectItem key={d.id} value={d.id.toString()}>
                                                            {d.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setShowCreateDesignation(true)}
                                            title={t('Add new designation')}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Department')}</Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Select
                                                value={formData.department_id}
                                                onValueChange={(value) =>
                                                    setFormData({
                                                        ...formData,
                                                        department_id: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select department')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {departments.map((d) => (
                                                        <SelectItem key={d.id} value={d.id.toString()}>
                                                            {d.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setShowCreateDepartment(true)}
                                            title={t('Add new department')}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <StaffPortalSection
                                value={formData.profile}
                                onChange={(patch) =>
                                    setFormData({
                                        ...formData,
                                        profile: { ...formData.profile, ...patch },
                                    })
                                }
                            />

                            <Alert>
                                <AlertDescription>
                                    {t(
                                        'Password resets are handled from the key action in the table and will generate a temporary password.',
                                    )}
                                </AlertDescription>
                            </Alert>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={closeEditModal}>
                                {t('Cancel')}
                            </Button>
                            <Button onClick={handleUpdateUser} disabled={loading}>
                                {loading ? t('Updating...') : t('Update User')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={showDeleteDialog}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeDeleteDialog();
                            return;
                        }

                        setShowDeleteDialog(true);
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('Delete User')}</DialogTitle>
                            <DialogDescription>
                                {t('Are you sure you want to delete')}
                                {selectedUser?.name}
                                {'? '}
                                {t('This action cannot be undone.')}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={closeDeleteDialog}>
                                {t('Cancel')}
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteUser} disabled={loading}>
                                {loading ? t('Deleting...') : t('Delete User')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={showCreateDesignation} onOpenChange={setShowCreateDesignation}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('Add New Designation')}</DialogTitle>
                            <DialogDescription>{t('Create a new designation for staff members.')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>{t('Designation Name')}</Label>
                                <Input
                                    placeholder={t('Enter designation name')}
                                    value={newDesignationName}
                                    onChange={(e) => setNewDesignationName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateDesignation();
                                    }}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowCreateDesignation(false);
                                    setNewDesignationName('');
                                }}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button onClick={handleCreateDesignation}>{t('Create')}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={showCreateDepartment} onOpenChange={setShowCreateDepartment}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('Add New Department')}</DialogTitle>
                            <DialogDescription>{t('Create a new department for staff members.')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>{t('Department Name')}</Label>
                                <Input
                                    placeholder={t('Enter department name')}
                                    value={newDepartmentName}
                                    onChange={(e) => setNewDepartmentName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateDepartment();
                                    }}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowCreateDepartment(false);
                                    setNewDepartmentName('');
                                }}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button onClick={handleCreateDepartment}>{t('Create')}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
