import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { FileClock } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Link } from '@inertiajs/react';

interface AuditLogEntry {
    id: string;
    action: string;
    amount: number | null;
    userName: string;
    studentName: string | null;
    meta: Record<string, any>;
    ipAddress: string | null;
    createdAt: string;
}

interface FeeAuditProps {
    user: any;
    organization?: { id: number; name: string; logo?: string | null } | null;
    auditLogs: {
        data: AuditLogEntry[];
        total: number;
        currentPage: number;
        lastPage: number;
        perPage: number;
    };
    actions: string[];
    filters: { action?: string; from?: string; to?: string };
}

export default function FeeAudit({ user, organization, auditLogs, actions, filters }: FeeAuditProps) {
    const { t } = useLanguage();
    const [action, setAction] = useState(filters.action ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');

    if (!organization) {
        return <DashboardLayout user={user}>{null}</DashboardLayout>;
    }

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

    const actionLabel = (value: string): string => {
        const labels: Record<string, string> = {
            'fee_type.created': t('Fee Type Created') as string,
            'fee_type.updated': t('Fee Type Updated') as string,
            'fee_type.deleted': t('Fee Type Deleted') as string,
            'fee_structure.created': t('Fee Structure Created') as string,
            'fee_structure.updated': t('Fee Structure Updated') as string,
            'fee_structure.deleted': t('Fee Structure Deleted') as string,
            'fee.assigned': t('Fee Assigned') as string,
            'fee.imported': t('Fee Imported') as string,
            'fee.carried_forward': t('Fees Carried Forward') as string,
            'payment.collected': t('Payment Collected') as string,
            'payment.reverted': t('Payment Reverted') as string,
            'payment.approved': t('Online Payment Approved') as string,
        };
        return labels[value] ?? value;
    };

    const actionColor = (value: string): string => {
        if (value.includes('deleted') || value.includes('reverted')) return 'bg-red-100 text-red-700';
        if (value.includes('payment.collected') || value.includes('payment.approved'))
            return 'bg-emerald-100 text-emerald-700';
        if (value.includes('created') || value.includes('assigned')) return 'bg-sky-100 text-sky-700';
        return 'bg-amber-100 text-amber-700';
    };

    const buildQuery = (page?: number) => {
        const params = new URLSearchParams();
        if (action) params.set('action', action);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (page && page > 1) params.set('page', String(page));
        const query = params.toString();
        return query ? `?${query}` : '';
    };

    const layoutProps = { text: `${t('Audit Log')}`, subtext: t('Track every fee and payment change') };

    return (
        <DashboardLayout user={user} organization={organization} flash={undefined} layoutProps={layoutProps}>
            <div className="space-y-6 p-4 sm:p-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileClock className="h-5 w-5 text-primary" />
                            {t('Fee Audit Log')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex flex-wrap items-end gap-2">
                            <div className="grid gap-1">
                                <label className="text-xs font-medium text-muted-foreground">{t('Action')}</label>
                                <Select
                                    value={action}
                                    onValueChange={(value) => setAction(value === 'all' ? '' : value)}
                                >
                                    <SelectTrigger className="w-52">
                                        <SelectValue placeholder={t('All Actions')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Actions')}</SelectItem>
                                        {actions.map((item) => (
                                            <SelectItem key={item} value={item}>
                                                {actionLabel(item)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1">
                                <label className="text-xs font-medium text-muted-foreground">{t('From')}</label>
                                <Input
                                    type="date"
                                    value={from}
                                    onChange={(event) => setFrom(event.target.value)}
                                    className="w-40"
                                />
                            </div>
                            <div className="grid gap-1">
                                <label className="text-xs font-medium text-muted-foreground">{t('To')}</label>
                                <Input
                                    type="date"
                                    value={to}
                                    onChange={(event) => setTo(event.target.value)}
                                    className="w-40"
                                />
                            </div>
                            <Button asChild>
                                <Link href={buildQuery()}>{t('Apply Filters')}</Link>
                            </Button>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Date & Time')}</TableHead>
                                        <TableHead>{t('Action')}</TableHead>
                                        <TableHead>{t('Performed By')}</TableHead>
                                        <TableHead>{t('Student')}</TableHead>
                                        <TableHead>{t('Amount')}</TableHead>
                                        <TableHead>{t('Details')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {auditLogs.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                                {t('No audit records found')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        auditLogs.data.map((entry) => (
                                            <TableRow key={entry.id}>
                                                <TableCell className="whitespace-nowrap text-sm">
                                                    {new Date(entry.createdAt).toLocaleString('en-IN')}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={actionColor(entry.action)} variant="secondary">
                                                        {actionLabel(entry.action)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">{entry.userName}</TableCell>
                                                <TableCell className="text-sm">{entry.studentName ?? '—'}</TableCell>
                                                <TableCell className="text-sm font-medium">
                                                    {entry.amount !== null ? formatCurrency(entry.amount) : '—'}
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                                                    {JSON.stringify(
                                                        entry.meta && Object.keys(entry.meta).length
                                                            ? entry.meta
                                                            : entry.meta,
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {auditLogs.lastPage > 1 && (
                            <div className="mt-4 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    {t('Page')} {auditLogs.currentPage} {t('of')} {auditLogs.lastPage} ·{' '}
                                    {auditLogs.total} {t('records')}
                                </span>
                                <div className="flex gap-2">
                                    {auditLogs.currentPage > 1 && (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={buildQuery(auditLogs.currentPage - 1)}>{t('Previous')}</Link>
                                        </Button>
                                    )}
                                    {auditLogs.currentPage < auditLogs.lastPage && (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={buildQuery(auditLogs.currentPage + 1)}>{t('Next')}</Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
