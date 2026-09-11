import { CalendarDays, CreditCard, Hash, Inbox, ReceiptText, Wifi } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface HistoryRecord {
    id: number;
    amount: string | number;
    plan_name: string | null;
    transaction_id: string | null;
    payment_method: string | null;
    status: string;
    payment_date: string | null;
    notes: string | null;
}

interface SubscriptionHistoryProps {
    user: any;
    history: HistoryRecord[];
}

const STATUS_BADGE: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function SubscriptionHistory(pageProps: SubscriptionHistoryProps) {
    const { user, history } = pageProps;
    const { t } = useLanguage();

    return (
        <DashboardLayout user={user}>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">{t('subscription.historyTitle')}</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ReceiptText className="h-5 w-5" />
                            {t('subscription.paymentHistory')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                <p className="mt-4 text-sm font-medium dark:text-white">
                                    {t('subscription.noHistory')}
                                </p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {t('subscription.noHistoryDesc')}
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('subscription.date')}</TableHead>
                                        <TableHead>{t('subscription.planLabel')}</TableHead>
                                        <TableHead>{t('subscription.amount')}</TableHead>
                                        <TableHead>{t('subscription.method')}</TableHead>
                                        <TableHead>{t('subscription.transaction')}</TableHead>
                                        <TableHead>{t('subscription.state')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>
                                                {record.payment_date ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <CalendarDays className="h-4 w-4 text-gray-400" />
                                                        {new Date(record.payment_date).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium dark:text-white">
                                                {record.plan_name ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center gap-1.5 font-medium dark:text-white">
                                                    <CreditCard className="h-4 w-4 text-gray-400" />₹{record.amount}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {record.payment_method ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Wifi className="h-4 w-4 text-gray-400" />
                                                        {record.payment_method}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {record.transaction_id ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Hash className="h-4 w-4 text-gray-400" />
                                                        {record.transaction_id}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={STATUS_BADGE[record.status] ?? STATUS_BADGE.completed}
                                                >
                                                    {t('subscription.payStatus.' + record.status)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
