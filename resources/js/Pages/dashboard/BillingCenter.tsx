import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    CalendarClock,
    CreditCard,
    IndianRupee,
    Loader2,
    Pencil,
    Receipt,
    ShieldCheck,
    Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface BillingOrganization {
    id: number;
    name: string;
    slug: string;
    email: string;
    type: string;
    plan: string;
    status: string;
    subscription_start_date: string | null;
    subscription_end_date: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
    activeAccess: boolean;
    students_count: number;
    staff_count: number;
    lastPayment: { amount: number; payment_date: string } | null;
}

interface BillingPayment {
    id: number;
    organization_id: number;
    organization_name: string;
    amount: number;
    plan_name: string;
    transaction_id: string | null;
    payment_method: string | null;
    status: string;
    payment_date: string | null;
    notes: string | null;
}

interface ExpiringOrg {
    id: number;
    name: string;
    end_date: string | null;
    daysRemaining: number | null;
}

interface BillingCenterProps {
    user: any;
    kpis: {
        totalOrgs: number;
        activeOrgs: number;
        expiringSoon: number;
        expiredOrgs: number;
        totalCollected: number;
        paymentCount: number;
        monthCollected: number;
    };
    organizations: BillingOrganization[];
    payments: BillingPayment[];
    expiringSoon: ExpiringOrg[];
    toggledOrganizationId: number | null;
}

const PLAN_LABELS: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    premium: 'Premium',
    enterprise: 'Enterprise',
};

const METHOD_LABELS: Record<string, string> = {
    upi: 'UPI',
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    cash: 'Cash',
    other: 'Other',
};

interface PaymentForm {
    organization_id: number | null;
    organization_name: string;
    amount: string;
    plan_name: string;
    transaction_id: string;
    payment_method: string;
    payment_date: string;
    renew_months: string;
    notes: string;
}

interface SubscriptionForm {
    organization_id: number | null;
    organization_name: string;
    plan: string;
    status: string;
    start_date: string;
    end_date: string;
    max_students: string;
    max_staff: string;
}

export default function BillingCenter({
    user,
    kpis,
    organizations,
    payments,
    expiringSoon,
    toggledOrganizationId,
}: BillingCenterProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    }>();
    const flash = page.props.flash ?? {};
    const errors = page.props.errors ?? {};

    const [paymentOpen, setPaymentOpen] = useState(false);
    const [subscriptionOpen, setSubscriptionOpen] = useState(false);
    const [toggling, setToggling] = useState<number | null>(null);
    const [paymentForm, setPaymentForm] = useState<PaymentForm>({
        organization_id: null,
        organization_name: '',
        amount: '',
        plan_name: '',
        transaction_id: '',
        payment_method: 'upi',
        payment_date: new Date().toISOString().slice(0, 10),
        renew_months: '',
        notes: '',
    });
    const [subscriptionForm, setSubscriptionForm] = useState<SubscriptionForm>({
        organization_id: null,
        organization_name: '',
        plan: 'basic',
        status: 'active',
        start_date: '',
        end_date: '',
        max_students: '100',
        max_staff: '10',
    });

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash.error, flash.success]);

    useEffect(() => {
        if (toggledOrganizationId) {
            setToggling(null);
        }
    }, [toggledOrganizationId]);

    const openPayment = (org: BillingOrganization) => {
        setPaymentForm({
            organization_id: org.id,
            organization_name: org.name,
            amount: '',
            plan_name: '',
            transaction_id: '',
            payment_method: 'upi',
            payment_date: new Date().toISOString().slice(0, 10),
            renew_months: '',
            notes: '',
        });
        setPaymentOpen(true);
    };

    const openSubscription = (org: BillingOrganization) => {
        setSubscriptionForm({
            organization_id: org.id,
            organization_name: org.name,
            plan: org.plan,
            status: org.status,
            start_date: org.subscription_start_date || '',
            end_date: org.subscription_end_date || '',
            max_students: String(org.students_count || 100),
            max_staff: String(org.staff_count || 10),
        });
        setSubscriptionOpen(true);
    };

    const submitPayment = () => {
        if (paymentForm.organization_id === null) return;
        router.post(
            `/billing-center/organizations/${paymentForm.organization_id}/payments`,
            {
                amount: paymentForm.amount,
                plan_name: paymentForm.plan_name || 'Renewal',
                transaction_id: paymentForm.transaction_id || null,
                payment_method: paymentForm.payment_method,
                payment_date: paymentForm.payment_date,
                renew_months: paymentForm.renew_months ? Number(paymentForm.renew_months) : null,
                notes: paymentForm.notes || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setPaymentOpen(false);
                },
            },
        );
    };

    const submitSubscription = () => {
        if (subscriptionForm.organization_id === null) return;
        router.patch(
            `/billing-center/organizations/${subscriptionForm.organization_id}`,
            {
                plan: subscriptionForm.plan,
                status: subscriptionForm.status,
                start_date: subscriptionForm.start_date,
                end_date: subscriptionForm.end_date,
                max_students: Number(subscriptionForm.max_students),
                max_staff: Number(subscriptionForm.max_staff),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSubscriptionOpen(false);
                },
            },
        );
    };

    const toggleStatus = (org: BillingOrganization) => {
        setToggling(org.id);
        router.post(
            `/billing-center/organizations/${org.id}/toggle-status`,
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    const statusBadge = (org: BillingOrganization) => {
        if (!org.activeAccess) {
            return <Badge variant="destructive">{org.isExpired ? t('Expired') : t(org.status)}</Badge>;
        }

        return <Badge variant="default">{t('Active')}</Badge>;
    };

    const kpiCards = [
        { label: t('Organizations'), value: kpis.totalOrgs, icon: Building2 },
        { label: t('Active'), value: kpis.activeOrgs, icon: ShieldCheck },
        { label: t('Expiring Soon'), value: kpis.expiringSoon, icon: CalendarClock },
        { label: t('Expired'), value: kpis.expiredOrgs, icon: AlertTriangle },
        {
            label: t('Total Collected'),
            value: `₹${kpis.totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            icon: IndianRupee,
        },
        {
            label: t('This Month'),
            value: `₹${kpis.monthCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            icon: Wallet,
        },
    ];

    return (
        <DashboardLayout user={user} activeTab="billing-center">
            <div className="p-6">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            <CreditCard className="mr-2 inline-block h-6 w-6 text-indigo-600" />
                            {t('Billing Center')}
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            {t('Platform-wide subscriptions, renewals and revenue analytics.')}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
                        {kpiCards.map((kpi) => (
                            <Card key={kpi.label}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <kpi.icon className="h-4 w-4 text-indigo-500" />
                                        {kpi.label}
                                    </div>
                                    <p className="mt-2 text-xl font-semibold text-slate-900">{kpi.value}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {expiringSoon.length > 0 && (
                        <Alert variant="destructive">
                            <CalendarClock className="h-4 w-4" />
                            <AlertDescription>
                                {expiringSoon.map((org) => (
                                    <span key={org.id} className="mr-4 inline-block">
                                        {org.name} — {t('expires in')} {org.daysRemaining} {t('days')}
                                    </span>
                                ))}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Organizations')}</CardTitle>
                            <CardDescription>
                                {t('Subscription status across all organizations on the platform.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Organization')}</TableHead>
                                            <TableHead>{t('Plan')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead>{t('Subscription Period')}</TableHead>
                                            <TableHead className="text-center">{t('Days Left')}</TableHead>
                                            <TableHead className="text-center">{t('Students')}</TableHead>
                                            <TableHead className="text-center">{t('Staff')}</TableHead>
                                            <TableHead className="text-right">{t('Last Payment')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {organizations.map((org) => (
                                            <TableRow key={org.id}>
                                                <TableCell className="font-medium text-slate-900">
                                                    {org.name}
                                                    <p className="text-xs font-normal text-slate-400">{org.email}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{PLAN_LABELS[org.plan] ?? org.plan}</Badge>
                                                </TableCell>
                                                <TableCell>{statusBadge(org)}</TableCell>
                                                <TableCell>
                                                    <p>{org.subscription_start_date ?? '—'}</p>
                                                    <p className="text-xs text-slate-400">
                                                        → {org.subscription_end_date ?? '—'}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {org.daysRemaining != null ? org.daysRemaining : '—'}
                                                </TableCell>
                                                <TableCell className="text-center">{org.students_count}</TableCell>
                                                <TableCell className="text-center">{org.staff_count}</TableCell>
                                                <TableCell className="text-right">
                                                    {org.lastPayment ? (
                                                        <>
                                                            <p>
                                                                ₹
                                                                {org.lastPayment.amount.toLocaleString('en-IN', {
                                                                    maximumFractionDigits: 0,
                                                                })}
                                                            </p>
                                                            <p className="text-xs text-slate-400">
                                                                {org.lastPayment.payment_date}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openPayment(org)}
                                                        >
                                                            <Receipt className="mr-1 h-3.5 w-3.5" />
                                                            {t('Payment')}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openSubscription(org)}
                                                        >
                                                            <Pencil className="mr-1 h-3.5 w-3.5" />
                                                            {t('Edit')}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={toggling !== null}
                                                            onClick={() => toggleStatus(org)}
                                                        >
                                                            {toggling === org.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : org.status === 'suspended' ? (
                                                                t('Activate')
                                                            ) : (
                                                                t('Suspend')
                                                            )}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Recent Payments')}</CardTitle>
                            <CardDescription>
                                {t('Latest recorded subscription payments across the platform.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Organization')}</TableHead>
                                            <TableHead>{t('Amount')}</TableHead>
                                            <TableHead>{t('Plan')}</TableHead>
                                            <TableHead>{t('Method')}</TableHead>
                                            <TableHead>{t('Date')}</TableHead>
                                            <TableHead>{t('Transaction ID')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-slate-400">
                                                    {t('No payments recorded yet.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            payments.map((payment) => (
                                                <TableRow key={payment.id}>
                                                    <TableCell className="font-medium">
                                                        {payment.organization_name}
                                                    </TableCell>
                                                    <TableCell>
                                                        ₹
                                                        {payment.amount.toLocaleString('en-IN', {
                                                            maximumFractionDigits: 0,
                                                        })}
                                                    </TableCell>
                                                    <TableCell>{payment.plan_name}</TableCell>
                                                    <TableCell>
                                                        {payment.payment_method
                                                            ? (METHOD_LABELS[payment.payment_method] ??
                                                              payment.payment_method)
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>{payment.payment_date ?? '—'}</TableCell>
                                                    <TableCell className="text-xs text-slate-400">
                                                        {payment.transaction_id ?? '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t('Record payment for')} {paymentForm.organization_name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Amount')}</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={paymentForm.amount}
                                    onChange={(event) => setPaymentForm((c) => ({ ...c, amount: event.target.value }))}
                                    placeholder="0.00"
                                />
                                {errors.amount && <p className="text-sm text-red-600">{errors.amount}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Payment method')}</Label>
                                <Select
                                    value={paymentForm.payment_method}
                                    onValueChange={(value) => setPaymentForm((c) => ({ ...c, payment_method: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(METHOD_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {t(label)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Plan name')}</Label>
                                <Input
                                    value={paymentForm.plan_name}
                                    onChange={(event) =>
                                        setPaymentForm((c) => ({ ...c, plan_name: event.target.value }))
                                    }
                                    placeholder={t('Premium Annual')}
                                />
                                {errors.plan_name && <p className="text-sm text-red-600">{errors.plan_name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Payment date')}</Label>
                                <Input
                                    type="date"
                                    value={paymentForm.payment_date}
                                    onChange={(event) =>
                                        setPaymentForm((c) => ({ ...c, payment_date: event.target.value }))
                                    }
                                />
                                {errors.payment_date && <p className="text-sm text-red-600">{errors.payment_date}</p>}
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Renew months')}</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={paymentForm.renew_months}
                                    onChange={(event) =>
                                        setPaymentForm((c) => ({ ...c, renew_months: event.target.value }))
                                    }
                                    placeholder={t('e.g. 12')}
                                />
                                <p className="text-xs text-slate-400">{t('Extends the subscription end date.')}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Transaction ID')}</Label>
                                <Input
                                    value={paymentForm.transaction_id}
                                    onChange={(event) =>
                                        setPaymentForm((c) => ({ ...c, transaction_id: event.target.value }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Notes')}</Label>
                            <Input
                                value={paymentForm.notes}
                                onChange={(event) => setPaymentForm((c) => ({ ...c, notes: event.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={submitPayment} className="bg-blue-600 text-white hover:bg-blue-700">
                            <Receipt className="mr-2 h-4 w-4" />
                            {t('Record payment')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
                <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t('Update subscription for')} {subscriptionForm.organization_name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Plan')}</Label>
                                <Select
                                    value={subscriptionForm.plan}
                                    onValueChange={(value) => setSubscriptionForm((c) => ({ ...c, plan: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(PLAN_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {t(label)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.plan && <p className="text-sm text-red-600">{errors.plan}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Status')}</Label>
                                <Select
                                    value={subscriptionForm.status}
                                    onValueChange={(value) => setSubscriptionForm((c) => ({ ...c, status: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                        <SelectItem value="suspended">{t('Suspended')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && <p className="text-sm text-red-600">{errors.status}</p>}
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Start date')}</Label>
                                <Input
                                    type="date"
                                    value={subscriptionForm.start_date}
                                    onChange={(event) =>
                                        setSubscriptionForm((c) => ({ ...c, start_date: event.target.value }))
                                    }
                                />
                                {errors.start_date && <p className="text-sm text-red-600">{errors.start_date}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('End date')}</Label>
                                <Input
                                    type="date"
                                    value={subscriptionForm.end_date}
                                    onChange={(event) =>
                                        setSubscriptionForm((c) => ({ ...c, end_date: event.target.value }))
                                    }
                                />
                                {errors.end_date && <p className="text-sm text-red-600">{errors.end_date}</p>}
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Max students')}</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={subscriptionForm.max_students}
                                    onChange={(event) =>
                                        setSubscriptionForm((c) => ({ ...c, max_students: event.target.value }))
                                    }
                                />
                                {errors.max_students && <p className="text-sm text-red-600">{errors.max_students}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Max staff')}</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={subscriptionForm.max_staff}
                                    onChange={(event) =>
                                        setSubscriptionForm((c) => ({ ...c, max_staff: event.target.value }))
                                    }
                                />
                                {errors.max_staff && <p className="text-sm text-red-600">{errors.max_staff}</p>}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSubscriptionOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={submitSubscription} className="bg-blue-600 text-white hover:bg-blue-700">
                            {t('Save changes')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
