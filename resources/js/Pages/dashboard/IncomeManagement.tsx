import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowUpCircle, Download, IndianRupee, Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface IncomeManagementProps {
    user: any;
    activeSession?: string | null;
    sessions: {
        id: string;
        name: string;
        isCurrent: boolean;
    }[];
    entries: IncomeEntry[];
}

type IncomeEntry = {
    id: string;
    sessionId: string;
    sessionName: string;
    title: string;
    category: string;
    amount: number;
    date: string;
    paymentMode: string;
    receivedFrom: string;
    referenceNo: string;
    notes: string;
    status: 'received' | 'pending';
};

export default function IncomeManagement({ user, activeSession, sessions, entries }: IncomeManagementProps) {
    const { t } = useLanguage();
    const activeSessionName = activeSession ?? '';
    const activeSessionId = String(sessions.find((session) => session.name === activeSessionName)?.id ?? '');
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const flash = page.props.flash ?? {};
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sessionFilter, setSessionFilter] = useState(activeSession || 'all');
    const [dateFromFilter, setDateFromFilter] = useState('');
    const [dateToFilter, setDateToFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showDialog, setShowDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: '',
        category: '',
        amount: '',
        date: '',
        paymentMode: 'Cash',
        receivedFrom: '',
        referenceNo: '',
        notes: '',
        status: 'received',
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
        setSessionFilter(activeSession || 'all');
    }, [activeSession]);

    const filteredIncomes = useMemo(() => {
        const query = search.trim().toLowerCase();

        return entries.filter((income) => {
            const matchesSearch =
                !query ||
                [income.title, income.category, income.receivedFrom, income.referenceNo].some((value) =>
                    value.toLowerCase().includes(query),
                );
            const matchesCategory = categoryFilter === 'all' || income.category === categoryFilter;
            const matchesStatus = statusFilter === 'all' || income.status === statusFilter;
            const matchesSession = sessionFilter === 'all' || income.sessionName === sessionFilter;
            const matchesFromDate = !dateFromFilter || income.date >= dateFromFilter;
            const matchesToDate = !dateToFilter || income.date <= dateToFilter;

            return (
                matchesSearch && matchesCategory && matchesStatus && matchesSession && matchesFromDate && matchesToDate
            );
        });
    }, [categoryFilter, dateFromFilter, dateToFilter, entries, search, sessionFilter, statusFilter]);

    const incomeCategories = useMemo(
        () => Array.from(new Set(entries.map((income) => income.category))).sort(),
        [entries],
    );

    const totalIncome = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);
    const receivedIncome = filteredIncomes
        .filter((income) => income.status === 'received')
        .reduce((sum, income) => sum + income.amount, 0);
    const pendingIncome = filteredIncomes
        .filter((income) => income.status === 'pending')
        .reduce((sum, income) => sum + income.amount, 0);
    const rowsPerPage = 5;
    const totalPages = Math.max(1, Math.ceil(filteredIncomes.length / rowsPerPage));
    const paginatedIncomes = filteredIncomes.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, categoryFilter, statusFilter, sessionFilter, dateFromFilter, dateToFilter]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);

    const resetForm = () => {
        setEditingIncomeId(null);
        setForm({
            title: '',
            category: '',
            amount: '',
            date: '',
            paymentMode: 'Cash',
            receivedFrom: '',
            referenceNo: '',
            notes: '',
            status: 'received',
        });
    };

    const handleCreateIncome = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const amount = Number(form.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('Enter a valid income amount');
            return;
        }

        const payload: IncomeEntry = {
            id: editingIncomeId || '',
            sessionId: activeSessionId,
            sessionName: activeSessionName,
            title: form.title,
            category: form.category,
            amount,
            date: form.date,
            paymentMode: form.paymentMode,
            receivedFrom: form.receivedFrom,
            referenceNo: form.referenceNo,
            notes: form.notes,
            status: form.status as 'received' | 'pending',
        };

        if (editingIncomeId) {
            router.patch(`/income-management/${editingIncomeId}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setShowDialog(false);
                    resetForm();
                },
            });
            return;
        }

        router.post('/income-management', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setShowDialog(false);
                resetForm();
            },
        });
    };

    const handleEditIncome = (income: IncomeEntry) => {
        setEditingIncomeId(income.id);
        setForm({
            title: income.title,
            category: income.category,
            amount: String(income.amount),
            date: income.date,
            paymentMode: income.paymentMode,
            receivedFrom: income.receivedFrom,
            referenceNo: income.referenceNo,
            notes: income.notes,
            status: income.status,
        });
        setShowDialog(true);
    };

    const handleDeleteIncome = (incomeId: string) => {
        if (!window.confirm('Delete this income entry?')) {
            return;
        }

        router.delete(`/income-management/${incomeId}`, {
            preserveScroll: true,
        });
    };

    const handleExportIncome = () => {
        if (filteredIncomes.length === 0) {
            toast.error('No income entries available to export');
            return;
        }

        const headers = [
            'id',
            'title',
            'category',
            'amount',
            'date',
            'payment_mode',
            'received_from',
            'reference_no',
            'notes',
            'status',
        ];

        const escapeCsvValue = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const rows = filteredIncomes.map((income) =>
            [
                income.id,
                income.title,
                income.category,
                income.amount,
                income.date,
                income.paymentMode,
                income.receivedFrom,
                income.referenceNo,
                income.notes,
                income.status,
            ]
                .map(escapeCsvValue)
                .join(','),
        );

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `income_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        toast.success(`Exported ${filteredIncomes.length} income entries`);
    };

    const handleDownloadIncomeSample = () => {
        const headers = 'title,category,amount,date,payment_mode,received_from,reference_no,notes,status\n';
        const sampleRow =
            '"Sample Tuition Collection","Tuition Fee","15000","2026-04-01","UPI","Class 9 Parents","REF-001","Monthly collection batch","received"\n';
        const blob = new Blob([headers + sampleRow], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'income_sample_import.csv';
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const handleImportIncomeFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((line) => line.trim());

        if (lines.length < 2) {
            toast.error('Import file is empty');
            return;
        }

        const parseCsvLine = (line: string) =>
            line
                .split(/,(?=(?:(?:[^\"]*\"){2})*[^\"]*$)/)
                .map((value) => value.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

        const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
        const rows = lines.slice(1);
        const requiredHeaders = [
            'title',
            'category',
            'amount',
            'date',
            'payment_mode',
            'received_from',
            'reference_no',
            'notes',
            'status',
        ];

        const hasAllHeaders = requiredHeaders.every((header) => headers.includes(header));
        if (!hasAllHeaders) {
            toast.error('Invalid CSV format. Download the sample file and try again.');
            return;
        }

        const importedEntries: IncomeEntry[] = rows
            .map((line, index) => {
                const values = parseCsvLine(line);
                const row = Object.fromEntries(
                    headers.map((header, headerIndex) => [header, values[headerIndex] || '']),
                );
                const amount = Number(row.amount);

                if (!row.title || !row.category || !row.date || !Number.isFinite(amount) || amount <= 0) {
                    return null;
                }

                return {
                    id: `INC-IMP-${Date.now()}-${index}`,
                    sessionId: activeSessionId,
                    sessionName: activeSessionName,
                    title: row.title,
                    category: row.category,
                    amount,
                    date: row.date,
                    paymentMode: row.payment_mode || 'Cash',
                    receivedFrom: row.received_from || '',
                    referenceNo: row.reference_no || '',
                    notes: row.notes || '',
                    status: row.status === 'pending' ? 'pending' : 'received',
                } satisfies IncomeEntry;
            })
            .filter((entry): entry is IncomeEntry => entry !== null);

        if (importedEntries.length === 0) {
            toast.error('No valid income rows found in the CSV');
            return;
        }

        router.post(
            '/income-management/import',
            {
                entries: importedEntries.map((entry) => ({
                    title: entry.title,
                    category: entry.category,
                    amount: entry.amount,
                    date: entry.date,
                    paymentMode: entry.paymentMode,
                    receivedFrom: entry.receivedFrom,
                    referenceNo: entry.referenceNo,
                    notes: entry.notes,
                    status: entry.status,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowImportDialog(false);
                    event.target.value = '';
                },
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="income-management">
            <div className="space-y-6 p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('Income Management')}</h1>
                        <p className="mt-1 text-slate-600">
                            {t('Track school income, payment sources, and received versus pending entries.')}
                        </p>
                        <p className="mt-2 text-sm font-medium text-emerald-700">
                            {t('Current session for new entries:')}
                            {activeSession || t('No active session selected')}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <Download className="h-4 w-4" />
                                    {t('Import')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95vw] max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>{t('Import income entries')}</DialogTitle>
                                    <DialogDescription>
                                        {t('Upload a CSV file or download the sample template first.')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full gap-2"
                                        onClick={handleDownloadIncomeSample}
                                    >
                                        <Download className="h-4 w-4" />
                                        {t('Download Sample CSV')}
                                    </Button>
                                    <div className="space-y-2">
                                        <Label htmlFor="income-import-file">{t('Choose CSV File')}</Label>
                                        <Input
                                            id="income-import-file"
                                            type="file"
                                            accept=".csv"
                                            onChange={handleImportIncomeFile}
                                        />
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        {t(
                                            'Required columns: `title`, `category`, `amount`, `date`, `payment_mode`, `received_from`, `reference_no`, `notes`, `status`',
                                        )}
                                    </p>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={showDialog} onOpenChange={setShowDialog}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    {t('Add Income')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingIncomeId ? t('Edit income entry') : t('Create income entry')}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {editingIncomeId
                                            ? t('Update the selected income record.')
                                            : t('Add a new income record for school accounts.')}
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateIncome} className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="income-title">{t('Title')}</Label>
                                            <Input
                                                id="income-title"
                                                value={form.title}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        title: event.target.value,
                                                    }))
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="income-category">{t('Category')}</Label>
                                            <Input
                                                id="income-category"
                                                value={form.category}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        category: event.target.value,
                                                    }))
                                                }
                                                placeholder={t('Tuition Fee, Donation, Transport Fee')}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="income-amount">{t('Amount')}</Label>
                                            <Input
                                                id="income-amount"
                                                type="number"
                                                min="0"
                                                value={form.amount}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        amount: event.target.value,
                                                    }))
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="income-date">{t('Date')}</Label>
                                            <Input
                                                id="income-date"
                                                type="date"
                                                value={form.date}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        date: event.target.value,
                                                    }))
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Payment Mode')}</Label>
                                            <Select
                                                value={form.paymentMode}
                                                onValueChange={(value) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        paymentMode: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Cash">{t('Cash')}</SelectItem>
                                                    <SelectItem value="UPI">{t('UPI')}</SelectItem>
                                                    <SelectItem value="Card">{t('Card')}</SelectItem>
                                                    <SelectItem value="Bank Transfer">{t('Bank Transfer')}</SelectItem>
                                                    <SelectItem value="Cheque">{t('Cheque')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Status')}</Label>
                                            <Select
                                                value={form.status}
                                                onValueChange={(value) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        status: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="received">{t('Received')}</SelectItem>
                                                    <SelectItem value="pending">{t('Pending')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="income-from">{t('Received From')}</Label>
                                            <Input
                                                id="income-from"
                                                value={form.receivedFrom}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        receivedFrom: event.target.value,
                                                    }))
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="income-reference">{t('Reference No.')}</Label>
                                            <Input
                                                id="income-reference"
                                                value={form.referenceNo}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        referenceNo: event.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="income-notes">{t('Notes')}</Label>
                                        <Input
                                            id="income-notes"
                                            value={form.notes}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    notes: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setShowDialog(false);
                                                resetForm();
                                            }}
                                        >
                                            {t('Cancel')}
                                        </Button>
                                        <Button type="submit">
                                            {editingIncomeId ? t('Update Income') : t('Save Income')}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">{t('Total Income')}</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                                        {formatCurrency(totalIncome)}
                                    </p>
                                </div>
                                <Wallet className="h-10 w-10 text-emerald-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">{t('Received')}</p>
                                    <p className="mt-2 text-3xl font-semibold text-emerald-600">
                                        {formatCurrency(receivedIncome)}
                                    </p>
                                </div>
                                <ArrowUpCircle className="h-10 w-10 text-emerald-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">{t('Pending')}</p>
                                    <p className="mt-2 text-3xl font-semibold text-blue-600">
                                        {formatCurrency(pendingIncome)}
                                    </p>
                                </div>
                                <IndianRupee className="h-10 w-10 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
                        <div className="flex w-full items-start justify-between gap-3">
                            <div>
                                <CardTitle>{t('Income Register')}</CardTitle>
                                <CardDescription>
                                    {t('Review income entries saved for the current academic session.')}
                                </CardDescription>
                            </div>
                            <Button variant="outline" className="gap-2 shrink-0" onClick={handleExportIncome}>
                                <Download className="h-4 w-4" />
                                {t('Export')}
                            </Button>
                        </div>
                        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                            <div className="relative min-w-[260px]">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder={t('Search title, source or reference')}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={sessionFilter} onValueChange={setSessionFilter}>
                                <SelectTrigger className="w-full md:w-52">
                                    <SelectValue placeholder={t('All Sessions')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Sessions')}</SelectItem>
                                    {sessions.map((session) => (
                                        <SelectItem key={session.id} value={session.name}>
                                            {session.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-full md:w-48">
                                    <SelectValue placeholder={t('All Categories')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Categories')}</SelectItem>
                                    {incomeCategories.map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-40">
                                    <SelectValue placeholder={t('All Status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Status')}</SelectItem>
                                    <SelectItem value="received">{t('Received')}</SelectItem>
                                    <SelectItem value="pending">{t('Pending')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                value={dateFromFilter}
                                onChange={(event) => setDateFromFilter(event.target.value)}
                                className="w-full md:w-40"
                            />

                            <Input
                                type="date"
                                value={dateToFilter}
                                onChange={(event) => setDateToFilter(event.target.value)}
                                className="w-full md:w-40"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Title')}</TableHead>
                                    <TableHead>{t('Category')}</TableHead>
                                    <TableHead>{t('Amount')}</TableHead>
                                    <TableHead>{t('Date')}</TableHead>
                                    <TableHead>{t('Source')}</TableHead>
                                    <TableHead>{t('Mode')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedIncomes.map((income) => (
                                    <TableRow key={income.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-slate-900">{t(income.title)}</p>
                                                <p className="text-xs text-slate-500">
                                                    {income.referenceNo || t('No reference')}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{t(income.category)}</TableCell>
                                        <TableCell className="font-medium text-emerald-700">
                                            {formatCurrency(income.amount)}
                                        </TableCell>
                                        <TableCell>{income.date}</TableCell>
                                        <TableCell>{income.receivedFrom}</TableCell>
                                        <TableCell>{income.paymentMode}</TableCell>
                                        <TableCell>
                                            <Badge variant={income.status === 'received' ? 'default' : 'secondary'}>
                                                {t(income.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleEditIncome(income)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => handleDeleteIncome(income.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredIncomes.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">
                                            {t('No income entries found for the current filters.')}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm text-slate-500">
                                {t('Showing {start} to {end} of {total} entries', {
                                    start: filteredIncomes.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1,
                                    end: Math.min(currentPage * rowsPerPage, filteredIncomes.length),
                                    total: filteredIncomes.length,
                                })}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                >
                                    {t('Previous')}
                                </Button>
                                <span className="text-sm text-slate-600">
                                    {t('Page')}
                                    {currentPage}
                                    {t('of')}
                                    {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages || filteredIncomes.length === 0}
                                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                >
                                    {t('Next')}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
