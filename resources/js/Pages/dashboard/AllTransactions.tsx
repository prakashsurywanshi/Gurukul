import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { ArrowLeftRight, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface Transaction {
    id: string;
    type: string;
    date?: string | null;
    title: string;
    category: string;
    amount: number;
    method: string;
    reference: string;
    student?: string | null;
}

interface Summary {
    income: number;
    expenses: number;
    fees: number;
    net: number;
}

interface AllTransactionsProps {
    user: any;
    organization?: { id: number; name: string } | null;
    transactions: Transaction[];
    summary: Summary;
}

const TYPE_OPTIONS = ['all', 'income', 'expense', 'fee'] as const;
const TYPE_COLORS: Record<string, string> = {
    income: 'bg-emerald-100 text-emerald-800',
    expense: 'bg-red-100 text-red-800',
    fee: 'bg-blue-100 text-blue-800',
};

const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function AllTransactions({ user, organization, transactions, summary }: AllTransactionsProps) {
    const { t } = useLanguage();
    const [typeFilter, setTypeFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const filtered = transactions.filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            const haystack = [tx.title, tx.category, tx.reference, tx.student || ''].join(' ').toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        return true;
    });

    return (
        <DashboardLayout user={user} activeTab="all-transactions">
            <div className="p-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">{t('All Transactions')}</h1>
                    <p className="text-gray-600 mt-1">{t('Consolidated ledger of payments and receipts')}</p>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            <div>
                                <div className="text-xl font-bold">{fmt(summary.income)}</div>
                                <div className="text-xs text-gray-500">{t('Income')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <TrendingDown className="w-5 h-5 text-red-600" />
                            <div>
                                <div className="text-xl font-bold">{fmt(summary.expenses)}</div>
                                <div className="text-xs text-gray-500">{t('Expenses')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                            <div>
                                <div className="text-xl font-bold">{fmt(summary.fees)}</div>
                                <div className="text-xs text-gray-500">{t('Fees Collected')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <Wallet className="w-5 h-5 text-violet-600" />
                            <div>
                                <div className="text-xl font-bold">{fmt(summary.net)}</div>
                                <div className="text-xs text-gray-500">{t('Net')}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{t('Transactions')}</CardTitle>
                        <div className="flex items-center gap-3">
                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-40"
                                placeholder={t('From')}
                            />
                            <Input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-40"
                                placeholder={t('To')}
                            />
                            <Input
                                placeholder={t('Search...')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-48"
                            />
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TYPE_OPTIONS.map((tp) => (
                                        <SelectItem key={tp} value={tp}>
                                            {t(tp.charAt(0).toUpperCase() + tp.slice(1))}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Date')}</TableHead>
                                    <TableHead>{t('Type')}</TableHead>
                                    <TableHead>{t('Title')}</TableHead>
                                    <TableHead>{t('Category')}</TableHead>
                                    <TableHead>{t('Amount')}</TableHead>
                                    <TableHead>{t('Method')}</TableHead>
                                    <TableHead>{t('Reference')}</TableHead>
                                    {transactions.some((tx) => tx.student) && <TableHead>{t('Student')}</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-sm">{tx.date || '-'}</TableCell>
                                        <TableCell>
                                            <Badge className={`${TYPE_COLORS[tx.type] || ''} text-xs`}>{tx.type}</Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{tx.title}</TableCell>
                                        <TableCell className="text-sm">{tx.category}</TableCell>
                                        <TableCell
                                            className={`font-medium text-sm ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                                        >
                                            {tx.amount >= 0 ? '+' : ''}
                                            {fmt(tx.amount)}
                                        </TableCell>
                                        <TableCell className="text-sm">{tx.method}</TableCell>
                                        <TableCell className="text-sm">{tx.reference}</TableCell>
                                        {transactions.some((tx2) => tx2.student) && (
                                            <TableCell className="text-sm">{tx.student || '-'}</TableCell>
                                        )}
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                                            {t('No records found.')}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
