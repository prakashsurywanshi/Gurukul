import { AlarmClock, Building2, CalendarDays, CheckCircle2, CreditCard, Rocket, XCircle } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useLanguage } from '../../i18n/LanguageProvider';

interface SubscriptionData {
    plan: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
    days_remaining: number | null;
    org_name: string;
}

interface SubscriptionProps {
    user: any;
    subscription: SubscriptionData;
}

export default function Subscription(pageProps: SubscriptionProps) {
    const { user, subscription } = pageProps;
    const { t } = useLanguage();

    const badges: Record<string, string> = {
        active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        expired: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        unknown: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    };

    const formatPlan = (plan: string) =>
        t('plans.' + plan) === 'plans.' + plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : t('plans.' + plan);

    return (
        <DashboardLayout user={user}>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">{t('subscription.title')}</h1>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Rocket className="h-5 w-5" />
                                {t('subscription.currentPlan')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-semibold dark:text-white">
                                        {formatPlan(subscription.plan)}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{subscription.org_name}</p>
                                </div>
                                {subscription.status && (
                                    <Badge className={badges[subscription.status] ?? badges.unknown}>
                                        {t('subscription.status.' + subscription.status)}
                                    </Badge>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-lg border p-4 dark:border-gray-700">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <CalendarDays className="h-4 w-4" />
                                        {t('subscription.startDate')}
                                    </div>
                                    <p className="mt-1 font-medium dark:text-white">
                                        {subscription.start_date
                                            ? new Date(subscription.start_date).toLocaleDateString()
                                            : '—'}
                                    </p>
                                </div>
                                <div className="rounded-lg border p-4 dark:border-gray-700">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <AlarmClock className="h-4 w-4" />
                                        {t('subscription.endDate')}
                                    </div>
                                    <p className="mt-1 font-medium dark:text-white">
                                        {subscription.end_date
                                            ? new Date(subscription.end_date).toLocaleDateString()
                                            : '—'}
                                    </p>
                                </div>
                                <div className="rounded-lg border p-4 dark:border-gray-700">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <AlarmClock className="h-4 w-4" />
                                        {t('subscription.daysRemaining')}
                                    </div>
                                    <p className="mt-1 font-medium dark:text-white">
                                        {subscription.days_remaining !== null &&
                                        subscription.days_remaining !== undefined
                                            ? subscription.days_remaining
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                {t('subscription.billing')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-2">
                                {subscription.status === 'active' ? (
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                                ) : (
                                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                                )}
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {subscription.status === 'active'
                                        ? t('subscription.billingActive')
                                        : t('subscription.billingInactive')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Building2 className="h-4 w-4" />
                                {subscription.org_name}
                            </div>
                            <Button variant="outline" onClick={() => window.location.assign('/payment-history')}>
                                {t('subscription.viewHistory')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
