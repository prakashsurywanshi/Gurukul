import { useState } from 'react';
import { BadgeCheck, Ban, CheckCircle2, Landmark, Loader2, Search, Wallet } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useLanguage } from '../../i18n/LanguageProvider';

type PaymentRow = {
    id: string;
    receipt_number: string;
    batch_reference: string | null;
    amount: string;
    payment_method: string;
    transaction_id: string | null;
    cheque_number: string | null;
    cheque_date: string | null;
    bank_name: string | null;
    payment_date: string | null;
    status: string;
    collected_by: string | null;
    reconciled_at: string | null;
    reconciled_by: string | null;
    student: {
        name: string;
        admission_no: string;
        class: string | null;
    } | null;
};

interface FeePaymentReconciliationProps {
    user: any;
    payments: PaymentRow[];
    summary: { total: number; reconciled: number; pending: number };
    filters: { method: string | null };
}

const methods = ['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'online'];

export default function FeePaymentReconciliation({ user, payments, summary, filters }: FeePaymentReconciliationProps) {
    const { t } = useLanguage();
    const [query, setQuery] = useState('');
    const [method, setMethod] = useState(filters.method ?? '');
    const [busyId, setBusyId] = useState<string | null>(null);

    const filtered = payments.filter((payment) => {
        const needle = query.trim().toLowerCase();
        if (!needle) return true;
        return (
            payment.receipt_number.toLowerCase().includes(needle) ||
            (payment.student?.name.toLowerCase().includes(needle) ?? false) ||
            (payment.student?.admission_no.toLowerCase().includes(needle) ?? false) ||
            (payment.transaction_id?.toLowerCase().includes(needle) ?? false) ||
            (payment.cheque_number?.toLowerCase().includes(needle) ?? false)
        );
    });

    const toggle = (payment: PaymentRow) => {
        setBusyId(payment.id);
        router.patch(
            `/fees/payments/${payment.id}/reconcile`,
            { reconciled: !payment.reconciled_at },
            {
                preserveScroll: true,
                onFinish: () => setBusyId(null),
            },
        );
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-6 lg:p-8">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        <Landmark className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />{t('Payment Reconciliation')}</h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('Mark collected fee payments as reconciled once they are confirmed in the bank or ledger. Refunded payments are excluded.')}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('Total payments')}</CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('Reconciled')}</CardTitle>
                            <BadgeCheck className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{summary.reconciled}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('Pending reconciliation')}</CardTitle>
                            <Ban className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{summary.pending}</div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Payments')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder={t('Search receipt, student, transaction or cheque…')}
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                />
                            </div>
                            <div>
                                <Label className="sr-only" htmlFor="method-filter">
                                    {t('Payment method')}</Label>
                                <select
                                    id="method-filter"
                                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    value={method}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setMethod(value);
                                        router.visit('/fees/payments/reconciliation', {
                                            preserveState: true,
                                            preserveScroll: true,
                                            data: value ? { method: value } : {},
                                        });
                                    }}
                                >
                                    <option value="">{t('All methods')}</option>
                                    {methods.map((m) => (
                                        <option key={m} value={m}>
                                            {m.replace('_', ' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">{t('No payments match the current filters.')}</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                                            <th className="pb-2 pr-4">{t('Receipt')}</th>
                                            <th className="pb-2 pr-4">{t('Student')}</th>
                                            <th className="pb-2 pr-4">{t('Date')}</th>
                                            <th className="pb-2 pr-4">{t('Method')}</th>
                                            <th className="pb-2 pr-4">{t('Amount')}</th>
                                            <th className="pb-2 pr-4">{t('Reference')}</th>
                                            <th className="pb-2 pr-4">{t('Status')}</th>
                                            <th className="pb-2 text-right">{t('Stake')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((payment) => {
                                            const isRefunded = payment.status === 'refunded';
                                            return (
                                                <tr key={payment.id} className="border-b last:border-0">
                                                    <td className="py-2.5 pr-4 font-medium">
                                                        {payment.receipt_number}
                                                    </td>
                                                    <td className="py-2.5 pr-4">
                                                        <p>{payment.student?.name ?? '—'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {payment.student?.admission_no}
                                                            {payment.student?.class
                                                                ? ` · ${payment.student.class}`
                                                                : ''}
                                                        </p>
                                                    </td>
                                                    <td className="py-2.5 pr-4">{payment.payment_date ?? '—'}</td>
                                                    <td className="py-2.5 pr-4">
                                                        <Badge variant="outline">
                                                            {payment.payment_method.replace('_', ' ')}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-2.5 pr-4 font-medium">₹{payment.amount}</td>
                                                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                                                        {payment.cheque_number
                                                            ? `${payment.cheque_number} (${payment.bank_name ?? 'Bank'})`
                                                            : (payment.transaction_id ?? '—')}
                                                    </td>
                                                    <td className="py-2.5 pr-4">
                                                        {isRefunded ? (
                                                            <Badge variant="outline" className="text-red-500">
                                                                Refunded
                                                            </Badge>
                                                        ) : payment.reconciled_at ? (
                                                            <span
                                                                title={`By ${payment.reconciled_by} on ${payment.reconciled_at}`}
                                                            >
                                                                <Badge className="bg-emerald-500 text-white">
                                                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                                                    {t('Reconciled')}</Badge>
                                                            </span>
                                                        ) : (
                                                            <Badge variant="secondary">{t('Unreconciled')}</Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 text-right">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant={payment.reconciled_at ? 'outline' : 'default'}
                                                            disabled={isRefunded || busyId === payment.id}
                                                            onClick={() => toggle(payment)}
                                                        >
                                                            {busyId === payment.id ? (
                                                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                                            ) : null}
                                                            {payment.reconciled_at ? t('Undo') : t('Reconcile')}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
