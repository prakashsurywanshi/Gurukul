import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    ArrowDownCircle,
    Download,
    Pencil,
    Plus,
    Printer,
    ReceiptIndianRupee,
    Search,
    Trash2,
    WalletCards,
} from 'lucide-react';
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

interface ExpenseManagementProps {
    user: any;
    activeSession?: string | null;
    sessions: {
        id: string;
        name: string;
        isCurrent: boolean;
    }[];
    entries: ExpenseEntry[];
}

type ExpenseEntry = {
    id: string;
    sessionId: string;
    sessionName: string;
    title: string;
    category: string;
    amount: number;
    date: string;
    paymentMode: string;
    paidTo: string;
    voucherNo: string;
    notes: string;
    status: 'paid' | 'due';
};

export default function ExpenseManagement({ user, activeSession, sessions, entries }: ExpenseManagementProps) {
    const { t } = useLanguage();
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
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: '',
        category: '',
        amount: '',
        date: '',
        paymentMode: 'Cash',
        paidTo: '',
        voucherNo: '',
        notes: '',
        status: 'paid',
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

    const filteredExpenses = useMemo(() => {
        const query = search.trim().toLowerCase();

        return entries.filter((expense) => {
            const matchesSearch =
                !query ||
                [expense.title, expense.category, expense.paidTo, expense.voucherNo].some((value) =>
                    value.toLowerCase().includes(query),
                );
            const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
            const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
            const matchesSession = sessionFilter === 'all' || expense.sessionName === sessionFilter;
            const matchesFromDate = !dateFromFilter || expense.date >= dateFromFilter;
            const matchesToDate = !dateToFilter || expense.date <= dateToFilter;

            return (
                matchesSearch && matchesCategory && matchesStatus && matchesSession && matchesFromDate && matchesToDate
            );
        });
    }, [categoryFilter, dateFromFilter, dateToFilter, entries, search, sessionFilter, statusFilter]);

    const expenseCategories = useMemo(
        () => Array.from(new Set(entries.map((expense) => expense.category))).sort(),
        [entries],
    );

    const totalExpense = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const paidExpense = filteredExpenses
        .filter((expense) => expense.status === 'paid')
        .reduce((sum, expense) => sum + expense.amount, 0);
    const dueExpense = filteredExpenses
        .filter((expense) => expense.status === 'due')
        .reduce((sum, expense) => sum + expense.amount, 0);
    const rowsPerPage = 5;
    const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / rowsPerPage));
    const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
        setEditingExpenseId(null);
        setForm({
            title: '',
            category: '',
            amount: '',
            date: '',
            paymentMode: 'Cash',
            paidTo: '',
            voucherNo: '',
            notes: '',
            status: 'paid',
        });
    };

    const handleCreateExpense = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const amount = Number(form.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('Enter a valid expense amount');
            return;
        }

        const payload: ExpenseEntry = {
            id: editingExpenseId || '',
            title: form.title,
            category: form.category,
            amount,
            date: form.date,
            paymentMode: form.paymentMode,
            paidTo: form.paidTo,
            voucherNo: form.voucherNo,
            notes: form.notes,
            status: form.status as 'paid' | 'due',
        };

        if (editingExpenseId) {
            router.patch(`/expense-management/${editingExpenseId}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setShowDialog(false);
                    resetForm();
                },
            });
            return;
        }

        router.post('/expense-management', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setShowDialog(false);
                resetForm();
            },
        });
    };

    const handleEditExpense = (expense: ExpenseEntry) => {
        setEditingExpenseId(expense.id);
        setForm({
            title: expense.title,
            category: expense.category,
            amount: String(expense.amount),
            date: expense.date,
            paymentMode: expense.paymentMode,
            paidTo: expense.paidTo,
            voucherNo: expense.voucherNo,
            notes: expense.notes,
            status: expense.status,
        });
        setShowDialog(true);
    };

    const handleDeleteExpense = (expenseId: string) => {
        if (!window.confirm('Delete this expense entry?')) {
            return;
        }

        router.delete(`/expense-management/${expenseId}`, {
            preserveScroll: true,
        });
    };

    const handlePrintReceipt = (expense: ExpenseEntry) => {
        const receiptWindow = window.open('', '_blank', 'width=900,height=700');

        if (!receiptWindow) {
            toast.error('Popup blocked. Please allow popups to print the expense receipt.');
            return;
        }

        receiptWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Expense Receipt ${expense.voucherNo || expense.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 32px;
              color: #0f172a;
              background: #f8fafc;
            }
            .receipt {
              max-width: 760px;
              margin: 0 auto;
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 16px;
              padding: 32px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 18px;
              margin-bottom: 24px;
            }
            .title {
              margin: 0;
              font-size: 28px;
            }
            .subtitle {
              margin: 6px 0 0;
              color: #475569;
            }
            .status {
              display: inline-block;
              padding: 8px 14px;
              border-radius: 999px;
              background: ${expense.status === 'paid' ? '#fee2e2' : '#dbeafe'};
              color: ${expense.status === 'paid' ? '#b91c1c' : '#1e3a8a'};
              font-weight: 700;
              font-size: 13px;
              text-transform: uppercase;
            }
            .section {
              margin-top: 24px;
            }
            .section h2 {
              font-size: 16px;
              margin: 0 0 12px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px 24px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              padding: 10px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .row span {
              color: #475569;
            }
            .amount-box {
              margin-top: 24px;
              padding: 18px 20px;
              border-radius: 14px;
              background: #fff1f2;
              border: 1px solid #fecdd3;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .amount-box strong {
              font-size: 24px;
            }
            .footer {
              margin-top: 30px;
              color: #64748b;
              font-size: 13px;
              text-align: center;
            }
            @media print {
              body {
                background: #ffffff;
                padding: 0;
              }
              .receipt {
                border: none;
                border-radius: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div>
                <h1 class="title">Payment Receipt</h1>
                <p class="subtitle">Voucher No: ${expense.voucherNo || expense.id}</p>
              </div>
              <div class="status">${expense.status}</div>
            </div>

            <div class="section">
              <h2>Payment To</h2>
              <div class="grid">
                <div class="row">
                  <span>Paid To</span>
                  <strong>${expense.paidTo}</strong>
                </div>
                <div class="row">
                  <span>Payment Date</span>
                  <strong>${expense.date}</strong>
                </div>
                <div class="row">
                  <span>Payment Mode</span>
                  <strong>${expense.paymentMode}</strong>
                </div>
                <div class="row">
                  <span>Category</span>
                  <strong>${expense.category}</strong>
                </div>
              </div>
            </div>

            <div class="section">
              <h2>Expense Details</h2>
              <div class="grid">
                <div class="row">
                  <span>Title</span>
                  <strong>${expense.title}</strong>
                </div>
                <div class="row">
                  <span>Status</span>
                  <strong>${expense.status}</strong>
                </div>
                <div class="row">
                  <span>Voucher No.</span>
                  <strong>${expense.voucherNo || '-'}</strong>
                </div>
                <div class="row">
                  <span>Prepared By</span>
                  <strong>${user?.name || '-'}</strong>
                </div>
              </div>
            </div>

            <div class="section">
              <h2>Notes</h2>
              <div class="row">
                <span>Remarks</span>
                <strong>${expense.notes || '-'}</strong>
              </div>
            </div>

            <div class="amount-box">
              <span>Amount Paid</span>
              <strong>${formatCurrency(expense.amount)}</strong>
            </div>

            <div class="footer">
              This is a system-generated expense payment receipt.
            </div>
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

        receiptWindow.document.close();
    };

    const handleExportExpenses = () => {
        if (filteredExpenses.length === 0) {
            toast.error('No expense entries available to export');
            return;
        }

        const headers = [
            'id',
            'title',
            'category',
            'amount',
            'date',
            'payment_mode',
            'paid_to',
            'voucher_no',
            'notes',
            'status',
        ];

        const escapeCsvValue = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const rows = filteredExpenses.map((expense) =>
            [
                expense.id,
                expense.title,
                expense.category,
                expense.amount,
                expense.date,
                expense.paymentMode,
                expense.paidTo,
                expense.voucherNo,
                expense.notes,
                expense.status,
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
        link.download = `expense_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        toast.success(`Exported ${filteredExpenses.length} expense entries`);
    };

    const handleDownloadExpenseSample = () => {
        const headers = 'title,category,amount,date,payment_mode,paid_to,voucher_no,notes,status\n';
        const sampleRow =
            '"Sample Transport Vendor Payment","Transport","22000","2026-04-03","Cash","Highway Fuel Station","VCH-1001","Weekly fuel settlement","paid"\n';
        const blob = new Blob([headers + sampleRow], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'expense_sample_import.csv';
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const handleImportExpenseFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
            'paid_to',
            'voucher_no',
            'notes',
            'status',
        ];

        const hasAllHeaders = requiredHeaders.every((header) => headers.includes(header));
        if (!hasAllHeaders) {
            toast.error('Invalid CSV format. Download the sample file and try again.');
            return;
        }

        const importedEntries: ExpenseEntry[] = rows
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
                    id: `EXP-IMP-${Date.now()}-${index}`,
                    title: row.title,
                    category: row.category,
                    amount,
                    date: row.date,
                    paymentMode: row.payment_mode || 'Cash',
                    paidTo: row.paid_to || '',
                    voucherNo: row.voucher_no || '',
                    notes: row.notes || '',
                    status: row.status === 'due' ? 'due' : 'paid',
                } satisfies ExpenseEntry;
            })
            .filter((entry): entry is ExpenseEntry => entry !== null);

        if (importedEntries.length === 0) {
            toast.error('No valid expense rows found in the CSV');
            return;
        }

        router.post(
            '/expense-management/import',
            {
                entries: importedEntries.map((entry) => ({
                    title: entry.title,
                    category: entry.category,
                    amount: entry.amount,
                    date: entry.date,
                    paymentMode: entry.paymentMode,
                    paidTo: entry.paidTo,
                    voucherNo: entry.voucherNo,
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
        <DashboardLayout user={user} activeTab="expense-management">
            <div className="space-y-6 p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('Expense Management')}</h1>
                        <p className="mt-1 text-slate-600">
                            {t('Monitor operational spending, vendor payments, and due liabilities.')}
                        </p>
                        <p className="mt-2 text-sm font-medium text-rose-700">
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
                                    <DialogTitle>{t('Import expense entries')}</DialogTitle>
                                    <DialogDescription>
                                        {t('Upload a CSV file or download the sample template first.')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full gap-2"
                                        onClick={handleDownloadExpenseSample}
                                    >
                                        <Download className="h-4 w-4" />
                                        {t('Download Sample CSV')}
                                    </Button>
                                    <div className="space-y-2">
                                        <Label htmlFor="expense-import-file">{t('Choose CSV File')}</Label>
                                        <Input
                                            id="expense-import-file"
                                            type="file"
                                            accept=".csv"
                                            onChange={handleImportExpenseFile}
                                        />
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        {t(
                                            'Required columns: `title`, `category`, `amount`, `date`, `payment_mode`, `paid_to`, `voucher_no`, `notes`, `status`',
                                        )}
                                    </p>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={showDialog} onOpenChange={setShowDialog}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    {t('Add Expense')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingExpenseId ? t('Edit expense entry') : t('Create expense entry')}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {editingExpenseId
                                            ? t('Update the selected expense record.')
                                            : t('Add a new outgoing payment or payable record.')}
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateExpense} className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="expense-title">{t('Title')}</Label>
                                            <Input
                                                id="expense-title"
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
                                            <Label htmlFor="expense-category">{t('Category')}</Label>
                                            <Input
                                                id="expense-category"
                                                value={form.category}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        category: event.target.value,
                                                    }))
                                                }
                                                placeholder={t('Maintenance, Salary, Utility, Transport')}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="expense-amount">{t('Amount')}</Label>
                                            <Input
                                                id="expense-amount"
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
                                            <Label htmlFor="expense-date">{t('Date')}</Label>
                                            <Input
                                                id="expense-date"
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
                                                    <SelectItem value="paid">{t('Paid')}</SelectItem>
                                                    <SelectItem value="due">{t('Due')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="expense-paid-to">{t('Paid To')}</Label>
                                            <Input
                                                id="expense-paid-to"
                                                value={form.paidTo}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        paidTo: event.target.value,
                                                    }))
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="expense-voucher">{t('Voucher No.')}</Label>
                                            <Input
                                                id="expense-voucher"
                                                value={form.voucherNo}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        voucherNo: event.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="expense-notes">{t('Notes')}</Label>
                                        <Input
                                            id="expense-notes"
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
                                            {editingExpenseId ? t('Update Expense') : t('Save Expense')}
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
                                    <p className="text-sm text-slate-500">{t('Total Expense')}</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                                        {formatCurrency(totalExpense)}
                                    </p>
                                </div>
                                <WalletCards className="h-10 w-10 text-rose-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">{t('Paid')}</p>
                                    <p className="mt-2 text-3xl font-semibold text-rose-600">
                                        {formatCurrency(paidExpense)}
                                    </p>
                                </div>
                                <ArrowDownCircle className="h-10 w-10 text-rose-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">{t('Due')}</p>
                                    <p className="mt-2 text-3xl font-semibold text-blue-600">
                                        {formatCurrency(dueExpense)}
                                    </p>
                                </div>
                                <ReceiptIndianRupee className="h-10 w-10 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
                        <div className="flex w-full items-start justify-between gap-3">
                            <div>
                                <CardTitle>{t('Expense Register')}</CardTitle>
                                <CardDescription>
                                    {t('Track expense entries saved for the current academic session.')}
                                </CardDescription>
                            </div>
                            <Button variant="outline" className="gap-2 shrink-0" onClick={handleExportExpenses}>
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
                                    placeholder={t('Search title, vendor or voucher')}
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
                                    {expenseCategories.map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-36">
                                    <SelectValue placeholder={t('All Status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Status')}</SelectItem>
                                    <SelectItem value="paid">{t('Paid')}</SelectItem>
                                    <SelectItem value="due">{t('Due')}</SelectItem>
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
                                    <TableHead>{t('Paid To')}</TableHead>
                                    <TableHead>{t('Mode')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedExpenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-slate-900">{t(expense.title)}</p>
                                                <p className="text-xs text-slate-500">
                                                    {expense.voucherNo || t('No voucher')}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{t(expense.category)}</TableCell>
                                        <TableCell className="font-medium text-rose-700">
                                            {formatCurrency(expense.amount)}
                                        </TableCell>
                                        <TableCell>{expense.date}</TableCell>
                                        <TableCell>{expense.paidTo}</TableCell>
                                        <TableCell>{expense.paymentMode}</TableCell>
                                        <TableCell>
                                            <Badge variant={expense.status === 'paid' ? 'default' : 'secondary'}>
                                                {t(expense.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handlePrintReceipt(expense)}
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleEditExpense(expense)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => handleDeleteExpense(expense.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredExpenses.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">
                                            {t('No expense entries found for the current filters.')}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm text-slate-500">
                                {t('Showing {start} to {end} of {total} entries', {
                                    start: filteredExpenses.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1,
                                    end: Math.min(currentPage * rowsPerPage, filteredExpenses.length),
                                    total: filteredExpenses.length,
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
                                    disabled={currentPage === totalPages || filteredExpenses.length === 0}
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
