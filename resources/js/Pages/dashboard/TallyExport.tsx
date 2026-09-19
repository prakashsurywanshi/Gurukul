import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { Download, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface Receipt {
    receipt_number: string;
    payment_date: string;
    method: string;
    student: string;
    class: string;
    amount: number;
}

interface TallyExportProps {
    user: any;
    organization?: any;
    receipts: Receipt[];
    from: string;
    to: string;
    totalCollected: number;
    receiptCount: number;
    settings: {
        receipts_account: string;
        cash_ledger: string;
        bank_ledger: string;
    };
}

export default function TallyExport(pageProps: TallyExportProps) {
    const { t } = useLanguage();
    const { props } = usePage();

    const user = pageProps.user;
    const receipts = pageProps.receipts ?? [];
    const settings = pageProps.settings;

    const [from, setFrom] = useState(pageProps.from);
    const [to, setTo] = useState(pageProps.to);
    const [loading, setLoading] = useState<string | null>(null);

    const exportUrl = (format: 'csv' | 'xml') => `/tally/${format}?from=${from}&to=${to}`;

    const download = (format: 'csv' | 'xml') => {
        setLoading(format);
        window.open(exportUrl(format), '_blank');
        setTimeout(() => setLoading(null), 1500);
    };

    const METHOD_BADGE: Record<string, string> = {
        cash: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        card: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        upi: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        cheque: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        bank_transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        online: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Tally Export')}
                        </h1>
                        {pageProps.organization && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{pageProps.organization.name}</p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Export fee receipts to Tally-compatible CSV or XML format.')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => download('csv')} disabled={loading !== null}>
                            {loading === 'csv' ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FileDown className="mr-2 h-4 w-4" />
                            )}
                            {t('Download CSV')}
                        </Button>
                        <Button onClick={() => download('xml')} disabled={loading !== null} variant="outline">
                            {loading === 'xml' ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            {t('Download XML')}
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                            {t('Date Range')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                                <Label>{t('From')}</Label>
                                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                            </div>
                            <div>
                                <Label>{t('To')}</Label>
                                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={() =>
                                        router.visit('/tally', {
                                            method: 'get',
                                            data: { from, to },
                                            preserveState: true,
                                            only: ['receipts', 'from', 'to', 'totalCollected', 'receiptCount'],
                                        })
                                    }
                                >
                                    {t('Refresh')}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t('Summary')}</CardTitle>
                        <CardDescription>
                            {t('{count} receipts totaling ₹{total}', {
                                count: pageProps.receiptCount,
                                total: Number(pageProps.totalCollected ?? 0).toLocaleString(),
                            })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border bg-gray-50 p-4 text-sm dark:bg-gray-900/40">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <span className="text-gray-500">{t('Receipts Account')}</span>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {settings.receipts_account}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('Cash Ledger')}</span>
                                    <p className="font-medium text-gray-900 dark:text-white">{settings.cash_ledger}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('Bank Ledger')}</span>
                                    <p className="font-medium text-gray-900 dark:text-white">{settings.bank_ledger}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Fee Receipts')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {receipts.length === 0 ? (
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                <FileSpreadsheet className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                {t('No receipts found for this period.')}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Date')}</TableHead>
                                            <TableHead>{t('Receipt #')}</TableHead>
                                            <TableHead>{t('Student')}</TableHead>
                                            <TableHead>{t('Class')}</TableHead>
                                            <TableHead>{t('Method')}</TableHead>
                                            <TableHead className="text-right">{t('Amount')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {receipts.map((receipt) => (
                                            <TableRow key={receipt.receipt_number}>
                                                <TableCell className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                    {receipt.payment_date}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm font-mono text-gray-600 dark:text-gray-300">
                                                    {receipt.receipt_number}
                                                </TableCell>
                                                <TableCell className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {receipt.student}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                                                    {receipt.class}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={METHOD_BADGE[receipt.method] ?? ''}>
                                                        {t(receipt.method)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-semibold text-gray-900 dark:text-white">
                                                    ₹{receipt.amount.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
