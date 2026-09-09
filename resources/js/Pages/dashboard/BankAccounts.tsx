import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    Banknote,
    Building2,
    Landmark,
    Pencil,
    Plus,
    ScrollText,
    Trash2,
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
import { Link } from '@inertiajs/react';

interface AccountRecord {
    id: string;
    accountName: string;
    bankName: string;
    branch: string | null;
    accountHolder: string;
    accountNumber: string;
    ifscCode: string | null;
    openingBalance: number;
    currentBalance: number;
    isDefault: boolean;
}

interface TransactionRecord {
    id: string;
    type: 'income' | 'expense' | 'fee_payment' | 'adjustment';
    amount: number;
    balanceAfter: number;
    description: string | null;
    date: string | null;
    account: string | null;
    createdBy: string;
}

type TransactionPagination = {
    data: TransactionRecord[];
    total: number;
    currentPage: number;
    lastPage: number;
    perPage: number;
};

interface BankAccountsProps {
    user: any;
    organization?: { id: number; name: string; logo?: string | null } | null;
    accounts: AccountRecord[];
    transactions: TransactionPagination;
    summary: { opening: number; income: number; expense: number; fees: number; balance: number };
    filters: { accountId?: number; type?: string; from?: string; to?: string };
}

type TransactionType = 'income' | 'expense' | 'fee_payment' | 'adjustment';

const emptyAccountForm = {
    accountName: '',
    bankName: '',
    branch: '',
    accountHolder: '',
    accountNumber: '',
    ifscCode: '',
    openingBalance: '0',
};

export default function BankAccounts({
    user,
    organization,
    accounts,
    transactions,
    summary,
    filters,
}: BankAccountsProps) {
    const { t } = useLanguage();
    const [showAccountDialog, setShowAccountDialog] = useState(false);
    const [showTransactionDialog, setShowTransactionDialog] = useState(false);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [accountForm, setAccountForm] = useState(emptyAccountForm);
    const [transactionForm, setTransactionForm] = useState({
        bankAccountId: '',
        type: 'income' as TransactionType,
        amount: '',
        description: '',
        transactionDate: new Date().toISOString().split('T')[0],
    });

    const [transactionAccountFilter, setTransactionAccountFilter] = useState(
        filters.accountId ? String(filters.accountId) : 'all',
    );
    const [transactionTypeFilter, setTransactionTypeFilter] = useState(filters.type ?? 'all');
    const [transactionFromFilter, setTransactionFromFilter] = useState(filters.from ?? '');
    const [transactionToFilter, setTransactionToFilter] = useState(filters.to ?? '');

    useEffect(() => {
        const flash = (usePage().props as any)?.flash ?? {};
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, []);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    const resetAccountForm = () => {
        setEditingAccountId(null);
        setAccountForm(emptyAccountForm);
    };

    const applyTransactionFilters = () => {
        const params = new URLSearchParams();
        if (transactionAccountFilter && transactionAccountFilter !== 'all')
            params.set('accountId', transactionAccountFilter);
        if (transactionTypeFilter && transactionTypeFilter !== 'all') params.set('type', transactionTypeFilter);
        if (transactionFromFilter) params.set('from', transactionFromFilter);
        if (transactionToFilter) params.set('to', transactionToFilter);
        router.get('/bank-accounts', Object.fromEntries(params), { preserveState: true, preserveScroll: true });
    };

    const resetTransactionFilters = () => {
        setTransactionAccountFilter('all');
        setTransactionTypeFilter('all');
        setTransactionFromFilter('');
        setTransactionToFilter('');
        router.get('/bank-accounts', {}, { preserveState: true, preserveScroll: true });
    };

    const buildQuery = (page?: number) => {
        const params = new URLSearchParams();
        if (transactionAccountFilter && transactionAccountFilter !== 'all')
            params.set('accountId', transactionAccountFilter);
        if (transactionTypeFilter && transactionTypeFilter !== 'all') params.set('type', transactionTypeFilter);
        if (transactionFromFilter) params.set('from', transactionFromFilter);
        if (transactionToFilter) params.set('to', transactionToFilter);
        if (page && page > 1) params.set('page', String(page));
        const query = params.toString();
        return query ? `?${query}` : '';
    };

    const handleCreateAccount = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!accountForm.accountName.trim() || !accountForm.bankName.trim()) {
            toast.error(t('Account name and bank name are required'));
            return;
        }

        if (editingAccountId) {
            router.patch(`/bank-accounts/${editingAccountId}`, accountForm, {
                preserveScroll: true,
                onSuccess: () => {
                    setShowAccountDialog(false);
                    resetAccountForm();
                },
            });
            return;
        }

        router.post('/bank-accounts', accountForm, {
            preserveScroll: true,
            onSuccess: () => {
                setShowAccountDialog(false);
                resetAccountForm();
            },
        });
    };

    const handleEditAccount = (account: AccountRecord) => {
        setEditingAccountId(account.id);
        setAccountForm({
            accountName: account.accountName,
            bankName: account.bankName,
            branch: account.branch ?? '',
            accountHolder: account.accountHolder,
            accountNumber: account.accountNumber,
            ifscCode: account.ifscCode ?? '',
            openingBalance: '0',
        });
        setShowAccountDialog(true);
    };

    const handleDeleteAccount = (accountId: string) => {
        if (!window.confirm(t('Delete this bank account?'))) {
            return;
        }

        router.delete(`/bank-accounts/${accountId}`, { preserveScroll: true });
    };

    const handleSetDefault = (accountId: string) => {
        router.post(`/bank-accounts/${accountId}/set-default`, {}, { preserveScroll: true });
    };

    const handleRecordTransaction = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const amount = Number(transactionForm.amount);
        if (!transactionForm.bankAccountId) {
            toast.error(t('Please select a bank account'));
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error(t('Enter a valid transaction amount'));
            return;
        }

        router.post('/bank-accounts/transactions', transactionForm, {
            preserveScroll: true,
            onSuccess: () => {
                setShowTransactionDialog(false);
                setTransactionForm({
                    bankAccountId: '',
                    type: 'income',
                    amount: '',
                    description: '',
                    transactionDate: new Date().toISOString().split('T')[0],
                });
            },
        });
    };

    const typeLabel = (type: TransactionType): string => {
        const labels: Record<TransactionType, string> = {
            income: t('Income') as string,
            expense: t('Expense') as string,
            fee_payment: t('Fee Collection') as string,
            adjustment: t('Adjustment') as string,
        };
        return labels[type];
    };

    const typeColor = (type: TransactionType): string => {
        if (type === 'income' || type === 'fee_payment') return 'bg-emerald-100 text-emerald-700';
        if (type === 'expense') return 'bg-red-100 text-red-700';
        return 'bg-amber-100 text-amber-700';
    };

    const layoutProps = {
        text: t('Bank Accounts'),
        subtext: t('Manage school bank accounts and the cash ledger'),
    };

    return (
        <DashboardLayout
            user={user}
            organization={organization}
            activeTab="bank-accounts"
            flash={undefined}
            layoutProps={layoutProps}
        >
            <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{t('Bank Accounts & Ledger')}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('Track account balances, fee collections, income, and expenses.')}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <ScrollText className="h-4 w-4" />
                                    {t('Record Transaction')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95vw] max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>{t('Record account transaction')}</DialogTitle>
                                    <DialogDescription>
                                        {t('Income and fee collections increase the balance; expenses reduce it.')}
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleRecordTransaction} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{t('Bank Account')}</Label>
                                        <Select
                                            value={transactionForm.bankAccountId}
                                            onValueChange={(value) =>
                                                setTransactionForm((current) => ({ ...current, bankAccountId: value }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select account')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts.map((account) => (
                                                    <SelectItem key={account.id} value={account.id}>
                                                        {account.accountName} - {account.bankName}
                                                        {account.isDefault ? ` (${t('Default')})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>{t('Type')}</Label>
                                            <Select
                                                value={transactionForm.type}
                                                onValueChange={(value) =>
                                                    setTransactionForm((current) => ({
                                                        ...current,
                                                        type: value as TransactionType,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="income">{t('Income')}</SelectItem>
                                                    <SelectItem value="expense">{t('Expense')}</SelectItem>
                                                    <SelectItem value="adjustment">{t('Adjustment')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="transaction-amount">{t('Amount')}</Label>
                                            <Input
                                                id="transaction-amount"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={transactionForm.amount}
                                                onChange={(event) =>
                                                    setTransactionForm((current) => ({
                                                        ...current,
                                                        amount: event.target.value,
                                                    }))
                                                }
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="transaction-date">{t('Date')}</Label>
                                        <Input
                                            id="transaction-date"
                                            type="date"
                                            value={transactionForm.transactionDate}
                                            onChange={(event) =>
                                                setTransactionForm((current) => ({
                                                    ...current,
                                                    transactionDate: event.target.value,
                                                }))
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="transaction-description">{t('Description')}</Label>
                                        <Input
                                            id="transaction-description"
                                            value={transactionForm.description}
                                            onChange={(event) =>
                                                setTransactionForm((current) => ({
                                                    ...current,
                                                    description: event.target.value,
                                                }))
                                            }
                                            placeholder={t('Purpose, voucher, or note for this entry')}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowTransactionDialog(false)}
                                        >
                                            {t('Cancel')}
                                        </Button>
                                        <Button type="submit" disabled={accounts.length === 0}>
                                            {t('Save Transaction')}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                        <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    {t('Add Account')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingAccountId ? t('Edit bank account') : t('Create bank account')}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {t(
                                            'The first account you create becomes the default account for fee collections.',
                                        )}
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateAccount} className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="account-name">{t('Account Name')}</Label>
                                            <Input
                                                id="account-name"
                                                value={accountForm.accountName}
                                                onChange={(event) =>
                                                    setAccountForm((current) => ({
                                                        ...current,
                                                        accountName: event.target.value,
                                                    }))
                                                }
                                                placeholder={t('Main School Account')}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="bank-name">{t('Bank Name')}</Label>
                                            <Input
                                                id="bank-name"
                                                value={accountForm.bankName}
                                                onChange={(event) =>
                                                    setAccountForm((current) => ({
                                                        ...current,
                                                        bankName: event.target.value,
                                                    }))
                                                }
                                                placeholder={t('State Bank of India')}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="branch">{t('Branch')}</Label>
                                            <Input
                                                id="branch"
                                                value={accountForm.branch}
                                                onChange={(event) =>
                                                    setAccountForm((current) => ({
                                                        ...current,
                                                        branch: event.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="account-holder">{t('Account Holder')}</Label>
                                            <Input
                                                id="account-holder"
                                                value={accountForm.accountHolder}
                                                onChange={(event) =>
                                                    setAccountForm((current) => ({
                                                        ...current,
                                                        accountHolder: event.target.value,
                                                    }))
                                                }
                                                placeholder={t('School name or trustee')}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="account-number">{t('Account Number')}</Label>
                                            <Input
                                                id="account-number"
                                                value={accountForm.accountNumber}
                                                onChange={(event) =>
                                                    setAccountForm((current) => ({
                                                        ...current,
                                                        accountNumber: event.target.value,
                                                    }))
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ifsc">{t('IFSC Code')}</Label>
                                            <Input
                                                id="ifsc"
                                                value={accountForm.ifscCode}
                                                onChange={(event) =>
                                                    setAccountForm((current) => ({
                                                        ...current,
                                                        ifscCode: event.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>
                                    {!editingAccountId && (
                                        <div className="space-y-2">
                                            <Label htmlFor="opening-balance">{t('Opening Balance')}</Label>
                                            <Input
                                                id="opening-balance"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={accountForm.openingBalance}
                                                onChange={(event) =>
                                                    setAccountForm((current) => ({
                                                        ...current,
                                                        openingBalance: event.target.value,
                                                    }))
                                                }
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t('Used as the starting balance for this account.')}
                                            </p>
                                        </div>
                                    )}
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setShowAccountDialog(false);
                                                resetAccountForm();
                                            }}
                                        >
                                            {t('Cancel')}
                                        </Button>
                                        <Button type="submit">
                                            {editingAccountId ? t('Update Account') : t('Save Account')}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {!organization && (
                    <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                            {t('No school organization is linked to your account yet.')}
                        </CardContent>
                    </Card>
                )}

                {organization && (
                    <>
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('Total Balance')}</p>
                                            <p className="mt-2 text-3xl font-semibold text-foreground">
                                                {formatCurrency(summary.balance)}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('Opening')} {formatCurrency(summary.opening)}
                                            </p>
                                        </div>
                                        <Landmark className="h-10 w-10 text-primary" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('Fee Collection')}</p>
                                            <p className="mt-2 text-3xl font-semibold text-emerald-600">
                                                {formatCurrency(summary.fees)}
                                            </p>
                                        </div>
                                        <Banknote className="h-10 w-10 text-emerald-500" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('Income')}</p>
                                            <p className="mt-2 text-3xl font-semibold text-sky-600">
                                                {formatCurrency(summary.income)}
                                            </p>
                                        </div>
                                        <ArrowUpCircle className="h-10 w-10 text-sky-500" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('Expenses')}</p>
                                            <p className="mt-2 text-3xl font-semibold text-red-600">
                                                {formatCurrency(summary.expense)}
                                            </p>
                                        </div>
                                        <ArrowDownCircle className="h-10 w-10 text-red-500" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader className="gap-4">
                                <div>
                                    <CardTitle>{t('Bank Accounts')}</CardTitle>
                                    <CardDescription>{t('All accounts linked to this school')}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {accounts.map((account) => (
                                        <div key={account.id} className="rounded-lg border border-border/80 p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-5 w-5 text-primary" />
                                                    <div>
                                                        <p className="font-semibold text-foreground">
                                                            {account.accountName}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {account.bankName}
                                                            {account.branch ? `, ${account.branch}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                {account.isDefault && <Badge>{t('Default')}</Badge>}
                                            </div>
                                            <div className="mt-4 space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">{t('Holder')}</span>
                                                    <span className="text-foreground">{account.accountHolder}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">{t('Account No.')}</span>
                                                    <span className="font-mono text-foreground">
                                                        {account.accountNumber}
                                                    </span>
                                                </div>
                                                {account.ifscCode && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">{t('IFSC')}</span>
                                                        <span className="font-mono text-foreground">
                                                            {account.ifscCode}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between border-t border-border/60 pt-2">
                                                    <span className="text-muted-foreground">{t('Balance')}</span>
                                                    <span className="font-semibold text-foreground">
                                                        {formatCurrency(account.currentBalance)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex gap-2">
                                                {!account.isDefault && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSetDefault(account.id)}
                                                    >
                                                        {t('Set Default')}
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditAccount(account)}
                                                >
                                                    <Pencil className="mr-1 h-3 w-3" />
                                                    {t('Edit')}
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteAccount(account.id)}
                                                >
                                                    <Trash2 className="mr-1 h-3 w-3" />
                                                    {t('Delete')}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {accounts.length === 0 && (
                                        <div className="col-span-full rounded-lg border border-dashed border-border/70 p-10 text-center text-sm text-muted-foreground">
                                            {t(
                                                'No bank accounts yet. Create your first account to start tracking the ledger.',
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
                                <div>
                                    <CardTitle>{t('Transaction Ledger')}</CardTitle>
                                    <CardDescription>
                                        {t('Every income, expense, and fee collection entry')}
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-end gap-2">
                                    <div className="grid gap-1">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            {t('Account')}
                                        </label>
                                        <Select
                                            value={transactionAccountFilter}
                                            onValueChange={setTransactionAccountFilter}
                                        >
                                            <SelectTrigger className="w-full md:w-44">
                                                <SelectValue placeholder={t('All Accounts')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Accounts')}</SelectItem>
                                                {accounts.map((account) => (
                                                    <SelectItem key={account.id} value={account.id}>
                                                        {account.accountName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-1">
                                        <label className="text-xs font-medium text-muted-foreground">{t('Type')}</label>
                                        <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                                            <SelectTrigger className="w-full md:w-40">
                                                <SelectValue placeholder={t('All Types')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Types')}</SelectItem>
                                                <SelectItem value="income">{t('Income')}</SelectItem>
                                                <SelectItem value="expense">{t('Expense')}</SelectItem>
                                                <SelectItem value="fee_payment">{t('Fee Collection')}</SelectItem>
                                                <SelectItem value="adjustment">{t('Adjustment')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-1">
                                        <label className="text-xs font-medium text-muted-foreground">{t('From')}</label>
                                        <Input
                                            type="date"
                                            value={transactionFromFilter}
                                            onChange={(event) => setTransactionFromFilter(event.target.value)}
                                            className="w-full md:w-40"
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <label className="text-xs font-medium text-muted-foreground">{t('To')}</label>
                                        <Input
                                            type="date"
                                            value={transactionToFilter}
                                            onChange={(event) => setTransactionToFilter(event.target.value)}
                                            className="w-full md:w-40"
                                        />
                                    </div>
                                    <Button variant="outline" size="sm" onClick={applyTransactionFilters}>
                                        {t('Apply Filters')}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={resetTransactionFilters}>
                                        {t('Reset')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Date')}</TableHead>
                                            <TableHead>{t('Account')}</TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>{t('Description')}</TableHead>
                                            <TableHead className="text-right">{t('Amount')}</TableHead>
                                            <TableHead className="text-right">{t('Balance')}</TableHead>
                                            <TableHead>{t('Recorded By')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.data.map((entry) => (
                                            <TableRow key={entry.id}>
                                                <TableCell>{entry.date}</TableCell>
                                                <TableCell>{entry.account ?? '-'}</TableCell>
                                                <TableCell>
                                                    <Badge className={typeColor(entry.type)}>
                                                        {typeLabel(entry.type)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{entry.description ?? '-'}</TableCell>
                                                <TableCell className="text-right font-medium text-foreground">
                                                    {entry.type === 'expense' ? '-' : '+'}
                                                    {formatCurrency(entry.amount)}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {formatCurrency(entry.balanceAfter)}
                                                </TableCell>
                                                <TableCell>{entry.createdBy}</TableCell>
                                            </TableRow>
                                        ))}
                                        {transactions.data.length === 0 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    className="py-10 text-center text-sm text-muted-foreground"
                                                >
                                                    {t('No transactions recorded yet.')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        {t('Showing {start} to {end} of {total} entries', {
                                            start:
                                                transactions.total === 0
                                                    ? 0
                                                    : (transactions.currentPage - 1) * transactions.perPage + 1,
                                            end: Math.min(
                                                transactions.currentPage * transactions.perPage,
                                                transactions.total,
                                            ),
                                            total: transactions.total,
                                        })}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {transactions.currentPage > 1 && (
                                            <Button variant="outline" size="sm" asChild>
                                                <Link
                                                    href={`/bank-accounts${buildQuery(transactions.currentPage - 1)}`}
                                                >
                                                    {t('Previous')}
                                                </Link>
                                            </Button>
                                        )}
                                        <span className="text-sm text-muted-foreground">
                                            {t('Page')} {transactions.currentPage} {t('of')}{' '}
                                            {transactions.lastPage || 1}
                                        </span>
                                        {transactions.currentPage < transactions.lastPage && (
                                            <Button variant="outline" size="sm" asChild>
                                                <Link
                                                    href={`/bank-accounts${buildQuery(transactions.currentPage + 1)}`}
                                                >
                                                    {t('Next')}
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
