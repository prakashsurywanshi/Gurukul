import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    CalendarDays,
    CalendarX,
    CheckCircle2,
    Clock3,
    Edit,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
    Users,
    XCircle,
} from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

type LeaveType = 'casual' | 'sick' | 'vacation' | 'emergency' | 'other';
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface StaffRecord {
    id: number;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
}

interface LeaveRequest {
    id: number;
    staffId: number;
    type: LeaveType;
    fromDate: string;
    toDate: string;
    days: number;
    reason: string;
    status: LeaveStatus;
    appliedOn: string;
}

interface LeaveBalance {
    leaveType: LeaveType;
    year: number;
    entitled: number;
    used: number;
    remaining: number;
}

interface StaffLeaveBalance {
    staffId: number;
    name: string;
    balances: LeaveBalance[];
}

interface StaffLeaveManagementProps {
    user: any;
    staffRecords: StaffRecord[];
    leaveRequests: LeaveRequest[];
    leaveBalances: StaffLeaveBalance[] | null;
    leaveYear: number;
}

const today = new Date().toISOString().slice(0, 10);

const leaveTypeLabels: Record<LeaveType, string> = {
    casual: 'Casual Leave',
    sick: 'Sick Leave',
    vacation: 'Vacation Leave',
    emergency: 'Emergency Leave',
    other: 'Other Leave',
};

const statusStyles: Record<LeaveStatus, string> = {
    pending: 'border-blue-200 bg-blue-50 text-blue-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-red-200 bg-red-50 text-red-700',
    cancelled: 'border-slate-200 bg-slate-50 text-slate-600',
};

const defaultForm = {
    staffId: '',
    type: 'casual' as LeaveType,
    fromDate: today,
    toDate: today,
    reason: '',
};

const pageSizeOptions = [10, 25, 50];

const formatRole = (role: string) => role.replace(/_/g, ' ');

const formatDisplayDate = (value: string) => {
    const [year, month, day] = value.split('-');

    return day && month && year ? `${day}-${month}-${year}` : value;
};

const calculateDays = (fromDate: string, toDate: string) => {
    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T00:00:00`);
    const diff = end.getTime() - start.getTime();

    if (Number.isNaN(diff) || diff < 0) {
        return 0;
    }

    return Math.floor(diff / 86400000) + 1;
};

export default function StaffLeaveManagement({
    user,
    staffRecords,
    leaveRequests,
    leaveBalances,
    leaveYear,
}: StaffLeaveManagementProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const activeStaff = useMemo(
        () => (staffRecords ?? []).filter((staff) => staff.status === 'active'),
        [staffRecords],
    );
    const staffById = useMemo(() => new Map(activeStaff.map((staff) => [staff.id, staff])), [activeStaff]);
    const balanceById = useMemo(() => {
        const map = new Map<number, Record<LeaveType, LeaveBalance>>();

        (leaveBalances ?? []).forEach((entry) => {
            map.set(
                entry.staffId,
                Object.fromEntries(entry.balances.map((balance) => [balance.leaveType, balance])) as Record<
                    LeaveType,
                    LeaveBalance
                >,
            );
        });

        return map;
    }, [leaveBalances]);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showAdjustDialog, setShowAdjustDialog] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [formData, setFormData] = useState(defaultForm);
    const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
    const [adjustForm, setAdjustForm] = useState({
        staffId: '',
        leaveType: 'casual' as LeaveType,
        entitledDays: '12',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const filteredRequests = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return leaveRequests.filter((request) => {
            const staff = staffById.get(request.staffId);
            const matchesSearch =
                !query ||
                [staff?.name, staff?.email, staff?.role, request.reason]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(query));
            const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
            const matchesType = typeFilter === 'all' || request.type === typeFilter;

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [leaveRequests, searchQuery, staffById, statusFilter, typeFilter]);

    const totals = useMemo(() => {
        return leaveRequests.reduce(
            (summary, request) => ({
                pending: summary.pending + (request.status === 'pending' ? 1 : 0),
                approved: summary.approved + (request.status === 'approved' ? 1 : 0),
                rejected: summary.rejected + (request.status === 'rejected' ? 1 : 0),
                approvedDays: summary.approvedDays + (request.status === 'approved' ? request.days : 0),
            }),
            { pending: 0, approved: 0, rejected: 0, approvedDays: 0 },
        );
    }, [leaveRequests]);

    const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
    const paginatedRequests = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;

        return filteredRequests.slice(startIndex, startIndex + pageSize);
    }, [currentPage, filteredRequests, pageSize]);
    const paginationStart = filteredRequests.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const paginationEnd = Math.min(currentPage * pageSize, filteredRequests.length);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, typeFilter, pageSize]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const resetForm = () => {
        setFormData(defaultForm);
    };

    const closeCreateDialog = () => {
        setShowCreateDialog(false);
        setEditingRequest(null);
        resetForm();
    };

    const openCreateDialog = () => {
        setEditingRequest(null);
        resetForm();
        setShowCreateDialog(true);
    };

    const openEditDialog = (request: LeaveRequest) => {
        setEditingRequest(request);
        setFormData({
            staffId: String(request.staffId),
            type: request.type,
            fromDate: request.fromDate,
            toDate: request.toDate,
            reason: request.reason,
        });
        setShowCreateDialog(true);
    };

    const saveLeaveRequest = () => {
        const days = calculateDays(formData.fromDate, formData.toDate);

        if (!formData.staffId || !formData.reason.trim()) {
            toast.error('Select staff and enter a leave reason.');
            return;
        }

        if (days <= 0) {
            toast.error('To date must be after or equal to from date.');
            return;
        }

        setProcessing(true);
        const payload = {
            staff_id: Number(formData.staffId),
            leave_type: formData.type,
            from_date: formData.fromDate,
            to_date: formData.toDate,
            reason: formData.reason.trim(),
        };
        const options = {
            preserveScroll: true,
            onSuccess: closeCreateDialog,
            onError: () =>
                toast.error(editingRequest ? 'Failed to update leave request.' : 'Failed to create leave request.'),
            onFinish: () => setProcessing(false),
        };

        if (editingRequest) {
            router.patch(`/staff/leave-management/${editingRequest.id}`, payload, options);
            return;
        }

        router.post('/staff/leave-management', payload, options);
    };

    const updateLeaveStatus = (requestId: number, status: LeaveStatus) => {
        setProcessing(true);
        router.patch(
            `/staff/leave-management/${requestId}/status`,
            { status },
            {
                preserveScroll: true,
                onError: () => toast.error('Failed to update leave request status.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const deleteLeaveRequest = (request: LeaveRequest) => {
        if (
            !window.confirm(`Delete leave request for ${staffById.get(request.staffId)?.name ?? 'this staff member'}?`)
        ) {
            return;
        }

        setProcessing(true);
        router.delete(`/staff/leave-management/${request.id}`, {
            preserveScroll: true,
            onError: () => toast.error('Failed to delete leave request.'),
            onFinish: () => setProcessing(false),
        });
    };

    const openAdjustDialog = (staffId?: number) => {
        const currentBalance = staffId ? balanceById.get(staffId)?.casual : undefined;

        setAdjustForm({
            staffId: staffId ? String(staffId) : '',
            leaveType: 'casual',
            entitledDays: currentBalance ? String(currentBalance.entitled) : '12',
        });
        setShowAdjustDialog(true);
    };

    const changeAdjustField = (patch: Partial<{ staffId: string; leaveType: LeaveType; entitledDays: string }>) => {
        const next = { ...adjustForm, ...patch };

        if (patch.staffId || patch.leaveType) {
            const staffId = next.staffId ? Number(next.staffId) : null;
            const type = next.leaveType;
            const existing = staffId ? balanceById.get(staffId)?.[type] : undefined;

            next.entitledDays = existing ? String(existing.entitled) : '12';
        }

        setAdjustForm(next);
    };

    const saveLeaveBalances = () => {
        const entitledDays = Number(adjustForm.entitledDays);

        if (!adjustForm.staffId || (!adjustForm.entitledDays && entitledDays !== 0) || Number.isNaN(entitledDays)) {
            toast.error('Select staff and enter a valid entitled days value.');
            return;
        }

        setProcessing(true);
        router.post(
            '/staff/leave-management/balances',
            {
                year: leaveYear,
                entries: [
                    {
                        staffId: Number(adjustForm.staffId),
                        leaveType: adjustForm.leaveType,
                        entitledDays,
                    },
                ],
            },
            {
                preserveScroll: true,
                onSuccess: () => setShowAdjustDialog(false),
                onError: () => toast.error('Failed to update leave balances.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const formattedDays = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

    const balanceTone = (balance: LeaveBalance | undefined) => {
        if (!balance || balance.entitled <= 0) {
            return 'text-slate-400';
        }

        if (balance.remaining <= 0) {
            return 'text-red-600';
        }

        if (balance.remaining / balance.entitled <= 0.2) {
            return 'text-amber-600';
        }

        return 'text-emerald-600';
    };

    return (
        <DashboardLayout user={user} activeTab="leave-management">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Leave Management')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Track staff leave requests and approvals.')}
                            </p>
                        </div>
                        <Button onClick={openCreateDialog} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t('Add Leave Request')}
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-5">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Active Staff')}</CardDescription>
                                <CardTitle className="text-2xl">{activeStaff.length}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">
                                <Users className="mr-2 inline h-4 w-4" />
                                {t('Eligible staff')}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Pending')}</CardDescription>
                                <CardTitle className="text-2xl text-blue-600">{totals.pending}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">
                                <Clock3 className="mr-2 inline h-4 w-4" />
                                {t('Awaiting action')}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Approved')}</CardDescription>
                                <CardTitle className="text-2xl text-emerald-600">{totals.approved}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">
                                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                                {t('Requests')}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Rejected')}</CardDescription>
                                <CardTitle className="text-2xl text-red-600">{totals.rejected}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">
                                <XCircle className="mr-2 inline h-4 w-4" />
                                {t('Requests')}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Approved Days')}</CardDescription>
                                <CardTitle className="text-2xl text-blue-600">{totals.approvedDays}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">
                                <CalendarDays className="mr-2 inline h-4 w-4" />
                                {t('This workspace')}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4 overflow-x-auto">
                                <div className="shrink-0">
                                    <CardTitle>{t('Leave Balances')}</CardTitle>
                                    <CardDescription>
                                        {t('Entitlement and usage per staff for {year}', { year: leaveYear })}
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="shrink-0 gap-2"
                                    onClick={() => openAdjustDialog()}
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                    {t('Adjust Balance')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Staff')}</TableHead>
                                            {(Object.keys(leaveTypeLabels) as LeaveType[]).map((type) => (
                                                <TableHead key={type}>
                                                    <span className="flex items-center gap-1">
                                                        <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
                                                        {leaveTypeLabels[type]}
                                                    </span>
                                                </TableHead>
                                            ))}
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activeStaff.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-20 text-center text-slate-500">
                                                    {t('No staff available')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            activeStaff.map((staff) => {
                                                const balances = balanceById.get(staff.id) ?? {};

                                                return (
                                                    <TableRow key={staff.id}>
                                                        <TableCell>
                                                            <div className="font-medium text-slate-900">
                                                                {staff.name}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {formatRole(staff.role)}
                                                            </div>
                                                        </TableCell>
                                                        {(Object.keys(leaveTypeLabels) as LeaveType[]).map((type) => {
                                                            const balance = balances[type];

                                                            return (
                                                                <TableCell key={type} className={balanceTone(balance)}>
                                                                    <div className="font-medium">
                                                                        {balance
                                                                            ? `${formattedDays(balance.remaining)} / ${formattedDays(balance.entitled)}`
                                                                            : '-'}
                                                                    </div>
                                                                    <div className="text-xs opacity-70">
                                                                        {t('Used')}:{' '}
                                                                        {balance ? formattedDays(balance.used) : '-'}
                                                                    </div>
                                                                </TableCell>
                                                            );
                                                        })}
                                                        <TableCell className="text-right">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={processing}
                                                                onClick={() => openAdjustDialog(staff.id)}
                                                                className="gap-1.5"
                                                            >
                                                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                                                {t('Adjust')}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4 overflow-x-auto">
                                <div className="shrink-0">
                                    <CardTitle>{t('Leave Requests')}</CardTitle>
                                    <CardDescription>{t('Review and update staff leave approvals.')}</CardDescription>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <div className="relative w-72">
                                        <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={searchQuery}
                                            onChange={(event) => setSearchQuery(event.target.value)}
                                            placeholder={t('Search staff or reason...')}
                                            className="h-10 !pl-14"
                                        />
                                    </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-36">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Status')}</SelectItem>
                                            <SelectItem value="pending">{t('Pending')}</SelectItem>
                                            <SelectItem value="approved">{t('Approved')}</SelectItem>
                                            <SelectItem value="rejected">{t('Rejected')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Types')}</SelectItem>
                                            {(Object.keys(leaveTypeLabels) as LeaveType[]).map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {leaveTypeLabels[type]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Staff')}</TableHead>
                                            <TableHead>{t('Leave Type')}</TableHead>
                                            <TableHead>{t('Duration')}</TableHead>
                                            <TableHead>{t('Reason')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRequests.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                    {t('No leave requests found')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedRequests.map((request) => {
                                                const staff = staffById.get(request.staffId);

                                                return (
                                                    <TableRow key={request.id}>
                                                        <TableCell>
                                                            <div className="font-medium text-slate-900">
                                                                {staff?.name ?? t('Unknown Staff')}
                                                            </div>
                                                            <div className="text-xs text-slate-500">{staff?.email}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">
                                                                {leaveTypeLabels[request.type]}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium text-slate-900">
                                                                {request.days}
                                                                {t('day(s)')}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {formatDisplayDate(request.fromDate)}
                                                                {t('to')}
                                                                {formatDisplayDate(request.toDate)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="max-w-64">
                                                            <p className="line-clamp-2 text-sm text-slate-700">
                                                                {request.reason}
                                                            </p>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                {t('Applied')}
                                                                {formatDisplayDate(request.appliedOn)}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={statusStyles[request.status]}
                                                            >
                                                                {t(request.status)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    disabled={processing}
                                                                    onClick={() => openEditDialog(request)}
                                                                    className="h-8 w-8"
                                                                    title={t('Edit leave request')}
                                                                    aria-label={t('Edit leave request')}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={
                                                                        processing || request.status === 'approved'
                                                                    }
                                                                    onClick={() =>
                                                                        updateLeaveStatus(request.id, 'approved')
                                                                    }
                                                                    className="border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:text-emerald-800"
                                                                >
                                                                    {t('Approve')}
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={
                                                                        processing || request.status === 'rejected'
                                                                    }
                                                                    onClick={() =>
                                                                        updateLeaveStatus(request.id, 'rejected')
                                                                    }
                                                                    className="border-red-200 text-red-700 hover:border-red-300 hover:text-red-800"
                                                                >
                                                                    {t('Reject')}
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    disabled={processing}
                                                                    onClick={() => deleteLeaveRequest(request)}
                                                                    className="h-8 w-8 border-red-200 text-red-700 hover:border-red-300 hover:text-red-800"
                                                                    title={t('Delete leave request')}
                                                                    aria-label={t('Delete leave request')}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm text-slate-600">
                                    {t('Showing {start} to {end} of {total} leave requests', {
                                        start: paginationStart,
                                        end: paginationEnd,
                                        total: filteredRequests.length,
                                    })}
                                </div>
                                <div className="flex items-center gap-3">
                                    <Select
                                        value={String(pageSize)}
                                        onValueChange={(value) => setPageSize(Number(value))}
                                    >
                                        <SelectTrigger className="h-9 w-28">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pageSizeOptions.map((option) => (
                                                <SelectItem key={option} value={String(option)}>
                                                    {option}
                                                    {'/ '}
                                                    {t('page')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                        >
                                            {t('Previous')}
                                        </Button>
                                        <span className="min-w-20 text-center text-sm text-slate-600">
                                            {currentPage} / {totalPages}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                        >
                                            {t('Next')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Dialog
                    open={showCreateDialog}
                    onOpenChange={(open) => (open ? setShowCreateDialog(true) : closeCreateDialog())}
                >
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRequest ? t('Edit Leave Request') : t('Add Leave Request')}
                            </DialogTitle>
                            <DialogDescription>
                                {editingRequest
                                    ? t('Update staff leave request details.')
                                    : t('Create a staff leave request for approval tracking.')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Staff')}</Label>
                                <Select
                                    value={formData.staffId}
                                    onValueChange={(value) =>
                                        setFormData((current) => ({
                                            ...current,
                                            staffId: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select staff')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeStaff.map((staff) => (
                                            <SelectItem key={staff.id} value={String(staff.id)}>
                                                {staff.name} - {formatRole(staff.role)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Leave Type')}</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) =>
                                        setFormData((current) => ({
                                            ...current,
                                            type: value as LeaveType,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(leaveTypeLabels) as LeaveType[]).map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {leaveTypeLabels[type]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('From Date')}</Label>
                                <Input
                                    type="date"
                                    value={formData.fromDate}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            fromDate: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('To Date')}</Label>
                                <Input
                                    type="date"
                                    value={formData.toDate}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            toDate: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t('Reason')}</Label>
                                <Textarea
                                    value={formData.reason}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            reason: event.target.value,
                                        }))
                                    }
                                    rows={4}
                                    placeholder={t('Enter leave reason')}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                    <CalendarX className="h-4 w-4 text-slate-500" />
                                    {t('Duration: {days} day(s)', {
                                        days: calculateDays(formData.fromDate, formData.toDate),
                                    })}
                                </div>
                                {formData.staffId && (
                                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                                        <BarChart3
                                            className={`h-4 w-4 ${balanceTone(balanceById.get(Number(formData.staffId))?.[formData.type])}`}
                                        />
                                        {balanceById.get(Number(formData.staffId))?.[formData.type] ? (
                                            <span
                                                className={balanceTone(
                                                    balanceById.get(Number(formData.staffId))?.[formData.type],
                                                )}
                                            >
                                                {t('Available {type} for {year}: {remaining} / {entitled} day(s)', {
                                                    type: leaveTypeLabels[formData.type],
                                                    year: leaveYear,
                                                    remaining: formattedDays(
                                                        balanceById.get(Number(formData.staffId))![formData.type]
                                                            .remaining,
                                                    ),
                                                    entitled: formattedDays(
                                                        balanceById.get(Number(formData.staffId))![formData.type]
                                                            .entitled,
                                                    ),
                                                })}
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">
                                                {t('Balance not available for {type}.', {
                                                    type: leaveTypeLabels[formData.type],
                                                })}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeCreateDialog}>
                                {t('Cancel')}
                            </Button>
                            <Button type="button" onClick={saveLeaveRequest} disabled={processing}>
                                {processing ? t('Saving...') : editingRequest ? t('Update Request') : t('Save Request')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>{t('Adjust Leave Balance')}</DialogTitle>
                            <DialogDescription>
                                {t('Set the entitled leave days for {year}.', { year: leaveYear })}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Staff')}</Label>
                                <Select
                                    value={adjustForm.staffId}
                                    onValueChange={(value) => changeAdjustField({ staffId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select staff')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeStaff.map((staff) => (
                                            <SelectItem key={staff.id} value={String(staff.id)}>
                                                {staff.name} - {formatRole(staff.role)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Leave Type')}</Label>
                                <Select
                                    value={adjustForm.leaveType}
                                    onValueChange={(value) => changeAdjustField({ leaveType: value as LeaveType })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(leaveTypeLabels) as LeaveType[]).map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {leaveTypeLabels[type]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t('Entitled Days')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={365}
                                    step="0.5"
                                    value={adjustForm.entitledDays}
                                    onChange={(event) => changeAdjustField({ entitledDays: event.target.value })}
                                />
                                <p className="text-xs text-slate-500">
                                    {t('Year')}: {leaveYear}
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowAdjustDialog(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="button" onClick={saveLeaveBalances} disabled={processing}>
                                {processing ? t('Saving...') : t('Update Balance')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
