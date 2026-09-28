import { useLanguage } from '../../i18n/LanguageProvider';
import { router, usePage } from '@inertiajs/react';
import { canPerform, type PermissionAction, type StaffPermissionMap } from '../../lib/permissions';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BusFront, Download, IndianRupee, RefreshCw, Search, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDate } from '../ui/utils';

interface TransportFeeCollectionProps {
    user: any;
    sessions: SessionRecord[];
    selectedSessionId?: string | null;
    selectedSessionName?: string | null;
    classRecords: ClassRecord[];
    transportFeeRecords: TransportFeeRecord[];
}

type SessionRecord = {
    id: string;
    name: string;
    isCurrent: boolean;
};

type ClassRecord = {
    id: number;
    name: string;
    section: string;
};

type TransportFeePaymentEntry = {
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod?: string | null;
    transactionId?: string | null;
    receiptNumber?: string | null;
    batchReference?: string | null;
    collectedBy?: string | null;
    status: string;
    revertedAt?: string | null;
    revertReason?: string | null;
};

type TransportFeeRecord = {
    id: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    class: string;
    section: string;
    routeName: string;
    pickupStop: string;
    vehicleNumber: string;
    month: string;
    year: number;
    feeType: string;
    amount: number;
    paidAmount: number;
    dueAmount: number;
    status: string;
    dueDate: string;
    latestPaymentId?: string | null;
    latestPaymentAmount?: number | null;
    latestPaymentDate?: string | null;
    latestPaymentMethod?: string | null;
    latestTransactionId?: string | null;
    latestReceiptNumber?: string | null;
    latestBatchReference?: string | null;
    latestCollectedBy?: string | null;
    payments: TransportFeePaymentEntry[];
};

const paymentStatusTone: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    partial: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    paid: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    overdue: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
    waived: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
};

export default function TransportFeeCollection({
    user,
    sessions,
    selectedSessionId,
    selectedSessionName,
    classRecords,
    transportFeeRecords,
}: TransportFeeCollectionProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: { success?: string; error?: string };
        staffPermissions?: StaffPermissionMap;
    }>();
    const flash = page.props.flash ?? {};
    const can = (action: PermissionAction) =>
        canPerform(user?.role, 'Transport Fee Collection', action, page.props.staffPermissions);
    const [classFilter, setClassFilter] = useState('all');
    const [sectionFilter, setSectionFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [routeFilter, setRouteFilter] = useState('all');
    const [stopFilter, setStopFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sessionFilter, setSessionFilter] = useState(selectedSessionId || sessions[0]?.id || '');
    const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([]);
    const [showCollectDialog, setShowCollectDialog] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [showRevertDialog, setShowRevertDialog] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<TransportFeeRecord | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<TransportFeePaymentEntry | null>(null);
    const [collectForm, setCollectForm] = useState({
        payment_method: 'cash',
        transaction_id: '',
    });
    const [revertForm, setRevertForm] = useState({
        reason: '',
        scope: 'payment',
    });

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    useEffect(() => {
        setSessionFilter(selectedSessionId || sessions[0]?.id || '');
    }, [selectedSessionId, sessions]);

    useEffect(() => {
        setSelectedFeeIds((current) => current.filter((id) => transportFeeRecords.some((record) => record.id === id)));
    }, [transportFeeRecords]);

    const classOptions = useMemo(
        () =>
            Array.from(new Set(classRecords.map((record) => record.name)))
                .filter((value) => value.trim() !== '')
                .sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
        [classRecords],
    );

    const sectionOptions = useMemo(() => {
        if (classFilter === 'all') {
            return [];
        }

        return Array.from(
            new Set(classRecords.filter((record) => record.name === classFilter).map((record) => record.section)),
        )
            .filter((value) => value.trim() !== '')
            .sort();
    }, [classFilter, classRecords]);

    const routeOptions = useMemo(
        () =>
            Array.from(new Set(transportFeeRecords.map((record) => record.routeName)))
                .filter((value) => value.trim() !== '')
                .sort(),
        [transportFeeRecords],
    );

    const stopOptions = useMemo(() => {
        const source =
            routeFilter === 'all'
                ? transportFeeRecords
                : transportFeeRecords.filter((record) => record.routeName === routeFilter);

        return Array.from(new Set(source.map((record) => record.pickupStop)))
            .filter((value) => value.trim() !== '')
            .sort();
    }, [routeFilter, transportFeeRecords]);

    const monthOptions = useMemo(
        () =>
            Array.from(new Set(transportFeeRecords.map((record) => `${record.month} ${record.year}`)))
                .filter((value) => value.trim() !== '')
                .sort((left, right) => new Date(`1 ${left}`).getTime() - new Date(`1 ${right}`).getTime()),
        [transportFeeRecords],
    );

    const filteredRecords = useMemo(
        () =>
            transportFeeRecords.filter((record) => {
                const matchesClass = classFilter === 'all' || record.class === classFilter;
                const matchesSection = sectionFilter === 'all' || record.section === sectionFilter;
                const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
                const matchesRoute = routeFilter === 'all' || record.routeName === routeFilter;
                const matchesStop = stopFilter === 'all' || record.pickupStop === stopFilter;
                const matchesMonth = monthFilter === 'all' || `${record.month} ${record.year}` === monthFilter;
                const query = searchQuery.trim().toLowerCase();
                const matchesSearch =
                    !query ||
                    [
                        record.studentName,
                        record.admissionNumber,
                        record.class,
                        record.section,
                        record.routeName,
                        record.pickupStop,
                        record.vehicleNumber,
                        record.month,
                        record.year,
                    ].some((value) =>
                        String(value || '')
                            .toLowerCase()
                            .includes(query),
                    );

                return (
                    matchesClass &&
                    matchesSection &&
                    matchesStatus &&
                    matchesRoute &&
                    matchesStop &&
                    matchesMonth &&
                    matchesSearch
                );
            }),
        [
            classFilter,
            monthFilter,
            routeFilter,
            searchQuery,
            sectionFilter,
            statusFilter,
            stopFilter,
            transportFeeRecords,
        ],
    );

    const filteredRecordIds = filteredRecords.map((record) => record.id);
    const allFilteredSelected =
        filteredRecordIds.length > 0 && filteredRecordIds.every((id) => selectedFeeIds.includes(id));
    const selectedRecords = transportFeeRecords.filter((record) => selectedFeeIds.includes(record.id));
    const selectedDueTotal = selectedRecords.reduce((sum, record) => sum + record.dueAmount, 0);
    const filteredTotal = filteredRecords.reduce((sum, record) => sum + record.amount, 0);
    const filteredPaid = filteredRecords.reduce((sum, record) => sum + record.paidAmount, 0);
    const filteredBalance = filteredRecords.reduce((sum, record) => sum + record.dueAmount, 0);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);

    const toggleSelectAllFiltered = (checked: boolean) => {
        if (checked) {
            setSelectedFeeIds(Array.from(new Set([...selectedFeeIds, ...filteredRecordIds])));
            return;
        }

        setSelectedFeeIds(selectedFeeIds.filter((id) => !filteredRecordIds.includes(id)));
    };

    const toggleFeeSelection = (feeId: string, checked: boolean) => {
        setSelectedFeeIds((current) =>
            checked ? Array.from(new Set([...current, feeId])) : current.filter((id) => id !== feeId),
        );
    };

    const refreshPayments = (showToast = true) => {
        router.reload({
            only: ['transportFeeRecords'],
            onSuccess: () => {
                if (showToast) {
                    toast.success('Transport fee records refreshed');
                }
            },
        });
    };

    const handleSessionChange = (value: string) => {
        setSessionFilter(value);
        setSelectedFeeIds([]);
        setSelectedRecord(null);
        setSelectedPayment(null);
        setMonthFilter('all');
        setShowCollectDialog(false);
        setShowDetailsDialog(false);
        setShowRevertDialog(false);

        router.get(
            '/transport-fee-collection',
            { session: value },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const openCollectDialog = () => {
        if (selectedRecords.length === 0) {
            toast.error('Select at least one monthly fee record');
            return;
        }

        if (selectedDueTotal <= 0) {
            toast.error('Selected records do not have any pending balance');
            return;
        }

        setCollectForm({
            payment_method: 'cash',
            transaction_id: '',
        });
        setShowCollectDialog(true);
    };

    const handleCollectFees = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.post(
            '/transport-management/fee-payments/bulk',
            {
                fee_ids: selectedFeeIds.map((id) => Number(id)),
                payment_method: collectForm.payment_method,
                transaction_id: collectForm.transaction_id.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedFeeIds([]);
                    setShowCollectDialog(false);
                },
            },
        );
    };

    const openDetailsDialog = (record: TransportFeeRecord) => {
        setSelectedRecord(record);
        setShowDetailsDialog(true);
    };

    const openRevertDialog = (record: TransportFeeRecord, payment: TransportFeePaymentEntry) => {
        setSelectedRecord(record);
        setSelectedPayment(payment);
        setRevertForm({
            reason: '',
            scope: payment.batchReference ? 'batch' : 'payment',
        });
        setShowRevertDialog(true);
    };

    const handleRevertPayment = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedPayment?.id) {
            toast.error('No payment selected');
            return;
        }

        if (!revertForm.reason.trim()) {
            toast.error('Enter a reason to revert the payment');
            return;
        }

        router.post(
            `/transport-management/fee-payments/${selectedPayment.id}/revert`,
            {
                reason: revertForm.reason.trim(),
                scope: revertForm.scope,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowRevertDialog(false);
                    setSelectedPayment(null);
                    refreshPayments(false);
                },
            },
        );
    };

    const exportRecords = () => {
        const csvRows = [
            [
                'Student',
                'Admission No.',
                'Class',
                'Section',
                'Route',
                'Pickup Stop',
                'Vehicle',
                'Month',
                'Amount',
                'Paid',
                'Balance',
                'Due Date',
                'Status',
            ],

            ...filteredRecords.map((record) => [
                record.studentName,
                record.admissionNumber || '-',
                record.class || '-',
                record.section || '-',
                record.routeName || '-',
                record.pickupStop || '-',
                record.vehicleNumber || '-',
                `${record.month} ${record.year}`,
                String(record.amount),
                String(record.paidAmount),
                String(record.dueAmount),
                record.dueDate || '-',
                record.status,
            ]),
        ];

        const csvContent = csvRows
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'transport-fee-collection.csv';
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success('Transport fee records exported successfully');
    };

    return (
        <DashboardLayout user={user} activeTab="transport-fee-collection">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Transport Fee Collection')}</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                {t(
                                    'Collect monthly transport fees route-wise, stop-wise, and in bulk for multiple months.',
                                )}
                            </p>
                            {selectedSessionName && (
                                <p className="mt-2 text-sm font-medium text-slate-700">
                                    {t('Active session:')}
                                    {selectedSessionName}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={() => router.get('/transport-management')}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {t('Back to Transport')}
                            </Button>
                            <Button type="button" variant="outline" className="gap-2" onClick={() => refreshPayments()}>
                                <RefreshCw className="h-4 w-4" />
                                {t('Refresh')}
                            </Button>
                            <Button type="button" variant="outline" className="gap-2" onClick={exportRecords}>
                                <Download className="h-4 w-4" />
                                {t('Export')}
                            </Button>
                            {can('add') && (
                                <Button
                                    type="button"
                                    className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
                                    onClick={openCollectDialog}
                                >
                                    <Wallet className="h-4 w-4" />
                                    {t('Collect Selected')}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Total Demand')}</CardDescription>
                                <CardTitle className="text-2xl">{formatCurrency(filteredTotal)}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Collected')}</CardDescription>
                                <CardTitle className="text-2xl">{formatCurrency(filteredPaid)}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Pending Balance')}</CardDescription>
                                <CardTitle className="text-2xl">{formatCurrency(filteredBalance)}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Selected for Bulk Pay')}</CardDescription>
                                <CardTitle className="text-2xl">
                                    {selectedRecords.length}
                                    {t('month')}
                                    {selectedRecords.length === 1 ? '' : 's'}
                                </CardTitle>
                                <p className="text-sm text-slate-500">
                                    {formatCurrency(selectedDueTotal)}
                                    {t('due')}
                                </p>
                            </CardHeader>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Monthly Transport Fee Ledger')}</CardTitle>
                            <CardDescription>
                                {t(
                                    'Filter by session, route, stop, class, and month before collecting multiple dues together.',
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                                <div className="space-y-2">
                                    <Label>{t('Session')}</Label>
                                    <Select value={sessionFilter} onValueChange={handleSessionChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select session')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sessions.map((session) => (
                                                <SelectItem key={session.id} value={session.id}>
                                                    {session.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Class')}</Label>
                                    <Select
                                        value={classFilter}
                                        onValueChange={(value) => {
                                            setClassFilter(value);
                                            setSectionFilter('all');
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All classes')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All classes')}</SelectItem>
                                            {classOptions.map((className) => (
                                                <SelectItem key={className} value={className}>
                                                    {className}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Section')}</Label>
                                    <Select
                                        value={sectionFilter}
                                        onValueChange={setSectionFilter}
                                        disabled={classFilter === 'all'}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All sections')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All sections')}</SelectItem>
                                            {sectionOptions.map((section) => (
                                                <SelectItem key={section} value={section}>
                                                    {t('Section')}
                                                    {section}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Route')}</Label>
                                    <Select
                                        value={routeFilter}
                                        onValueChange={(value) => {
                                            setRouteFilter(value);
                                            setStopFilter('all');
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All routes')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All routes')}</SelectItem>
                                            {routeOptions.map((route) => (
                                                <SelectItem key={route} value={route}>
                                                    {route}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Pickup Stop')}</Label>
                                    <Select value={stopFilter} onValueChange={setStopFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All stops')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All stops')}</SelectItem>
                                            {stopOptions.map((stop) => (
                                                <SelectItem key={stop} value={stop}>
                                                    {stop}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Month')}</Label>
                                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All months')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All months')}</SelectItem>
                                            {monthOptions.map((month) => (
                                                <SelectItem key={month} value={month}>
                                                    {month}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-[220px_220px_minmax(0,1fr)]">
                                <div className="space-y-2">
                                    <Label>{t('Status')}</Label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All statuses')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All statuses')}</SelectItem>
                                            <SelectItem value="pending">{t('Pending')}</SelectItem>
                                            <SelectItem value="partial">{t('Partial')}</SelectItem>
                                            <SelectItem value="paid">{t('Paid')}</SelectItem>
                                            <SelectItem value="overdue">{t('Overdue')}</SelectItem>
                                            <SelectItem value="waived">{t('Waived')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                            setClassFilter('all');
                                            setSectionFilter('all');
                                            setStatusFilter('all');
                                            setRouteFilter('all');
                                            setStopFilter('all');
                                            setMonthFilter('all');
                                            setSearchQuery('');
                                        }}
                                    >
                                        {t('Reset Filters')}
                                    </Button>
                                </div>
                                <div className="relative flex items-center">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        placeholder={t('Search student, route, stop, vehicle, or month')}
                                        className="h-10 pl-10"
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                                {t(
                                    'Bulk collection works month-wise. Select any mix of pending monthly transport dues, then collect them together in one action.',
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={allFilteredSelected}
                                                    onCheckedChange={(checked) =>
                                                        toggleSelectAllFiltered(Boolean(checked))
                                                    }
                                                />
                                            </TableHead>
                                            <TableHead>{t('Student')}</TableHead>
                                            <TableHead>{t('Route')}</TableHead>
                                            <TableHead>{t('Stop')}</TableHead>
                                            <TableHead>{t('Vehicle')}</TableHead>
                                            <TableHead>{t('Month')}</TableHead>
                                            <TableHead>{t('Total')}</TableHead>
                                            <TableHead>{t('Paid')}</TableHead>
                                            <TableHead>{t('Balance')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead>{t('Due Date')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRecords.map((record) => (
                                            <TableRow key={record.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedFeeIds.includes(record.id)}
                                                        onCheckedChange={(checked) =>
                                                            toggleFeeSelection(record.id, Boolean(checked))
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-medium text-slate-900">{record.studentName}</p>
                                                    <p className="text-sm text-slate-500">
                                                        {record.admissionNumber || '-'} | {record.class || '-'}{' '}
                                                        {record.section || ''}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <BusFront className="h-4 w-4 text-slate-400" />
                                                        <span>{record.routeName || '-'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{record.pickupStop || '-'}</TableCell>
                                                <TableCell>{record.vehicleNumber || '-'}</TableCell>
                                                <TableCell>
                                                    {record.month} {record.year}
                                                </TableCell>
                                                <TableCell>{formatCurrency(record.amount)}</TableCell>
                                                <TableCell>{formatCurrency(record.paidAmount)}</TableCell>
                                                <TableCell>{formatCurrency(record.dueAmount)}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            paymentStatusTone[record.status] ||
                                                            paymentStatusTone.pending
                                                        }
                                                    >
                                                        {t(record.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{formatDate(record.dueDate, '-')}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openDetailsDialog(record)}
                                                    >
                                                        {t('History')}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredRecords.length === 0 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={12}
                                                    className="py-8 text-center text-sm text-slate-500"
                                                >
                                                    {t('No transport fee records found for the selected filters.')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={showCollectDialog} onOpenChange={setShowCollectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Collect Transport Fees in Bulk')}</DialogTitle>
                        <DialogDescription>
                            {t('Collect full pending balance for')}
                            {selectedRecords.length}
                            {t('selected month')}
                            {selectedRecords.length === 1 ? '' : 's'}.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleCollectFees}>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            <p>
                                {t('Total pending amount:')}{' '}
                                <span className="font-semibold text-slate-900">{formatCurrency(selectedDueTotal)}</span>
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Payment Method')}</Label>
                            <Select
                                value={collectForm.payment_method}
                                onValueChange={(value) =>
                                    setCollectForm((current) => ({
                                        ...current,
                                        payment_method: value,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">{t('Cash')}</SelectItem>
                                    <SelectItem value="card">{t('Card')}</SelectItem>
                                    <SelectItem value="upi">{t('UPI')}</SelectItem>
                                    <SelectItem value="cheque">{t('Cheque')}</SelectItem>
                                    <SelectItem value="bank_transfer">{t('Bank Transfer')}</SelectItem>
                                    <SelectItem value="online">{t('Online')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Transaction ID')}</Label>
                            <Input
                                value={collectForm.transaction_id}
                                onChange={(event) =>
                                    setCollectForm((current) => ({
                                        ...current,
                                        transaction_id: event.target.value,
                                    }))
                                }
                                placeholder={t('Optional reference for non-cash payments')}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCollectDialog(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                                <IndianRupee className="h-4 w-4" />
                                {t('Collect Full Due')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{t('Transport Fee History')}</DialogTitle>
                        <DialogDescription>
                            {selectedRecord
                                ? `${selectedRecord.studentName} • ${selectedRecord.month} ${selectedRecord.year}`
                                : t('Transport fee payment details')}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRecord && (
                        <div className="space-y-4">
                            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{t('Route')}</p>
                                    <p className="font-medium text-slate-900">{selectedRecord.routeName || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{t('Pickup Stop')}</p>
                                    <p className="font-medium text-slate-900">{selectedRecord.pickupStop || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{t('Vehicle')}</p>
                                    <p className="font-medium text-slate-900">{selectedRecord.vehicleNumber || '-'}</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Receipt')}</TableHead>
                                            <TableHead>{t('Batch')}</TableHead>
                                            <TableHead>{t('Method')}</TableHead>
                                            <TableHead>{t('Date')}</TableHead>
                                            <TableHead>{t('Amount')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead>{t('Collected By')}</TableHead>
                                            <TableHead className="text-right">{t('Action')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedRecord.payments.map((payment) => (
                                            <TableRow key={payment.id}>
                                                <TableCell>{payment.receiptNumber || '-'}</TableCell>
                                                <TableCell>{payment.batchReference || '-'}</TableCell>
                                                <TableCell>
                                                    {payment.paymentMethod
                                                        ? payment.paymentMethod.replace('_', ' ')
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>{payment.paymentDate || '-'}</TableCell>
                                                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            payment.status === 'refunded'
                                                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                                                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                                        }
                                                    >
                                                        {t(payment.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{payment.collectedBy || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    {payment.status === 'refunded' && (
                                                        <span className="text-xs text-slate-500">
                                                            {payment.revertReason || t('Reverted')}
                                                        </span>
                                                    )}
                                                    {payment.status !== 'refunded' && can('edit') && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openRevertDialog(selectedRecord, payment)}
                                                        >
                                                            {t('Revert')}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {selectedRecord.payments.length === 0 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={8}
                                                    className="py-6 text-center text-sm text-slate-500"
                                                >
                                                    {t('No payment history found for this month.')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Revert Transport Fee Payment')}</DialogTitle>
                        <DialogDescription>
                            {selectedPayment?.batchReference
                                ? t('You can revert only this payment or the full bulk batch.')
                                : t('This will revert the selected monthly payment.')}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleRevertPayment}>
                        {selectedPayment?.batchReference && (
                            <div className="space-y-2">
                                <Label>{t('Revert Scope')}</Label>
                                <Select
                                    value={revertForm.scope}
                                    onValueChange={(value) =>
                                        setRevertForm((current) => ({
                                            ...current,
                                            scope: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="batch">{t('Entire Batch')}</SelectItem>
                                        <SelectItem value="payment">{t('Only This Payment')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>{t('Reason')}</Label>
                            <Input
                                value={revertForm.reason}
                                onChange={(event) =>
                                    setRevertForm((current) => ({
                                        ...current,
                                        reason: event.target.value,
                                    }))
                                }
                                placeholder={t('Enter reason for reverting the payment')}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowRevertDialog(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" variant="destructive">
                                {t('Revert Payment')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
