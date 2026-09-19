import { useLanguage } from '../../i18n/LanguageProvider';
import { BadgeIndianRupee, HandCoins, Percent, WalletCards } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

type MyLoanRow = {
    id: number;
    reason: string;
    principal: number;
    interestRate: number;
    tenureMonths: number;
    monthlyEmi: number;
    startDate: string;
    paidEmis: number;
    remainingEmis: number;
    outstanding: number;
    status: string;
    approvedBy: string | null;
};

type MyLoansProps = {
    user: any;
    loans: MyLoanRow[];
    summary: { openLoans: number; outstandingTotal: number; emisPaid: number };
};

export default function MyLoans({ user, loans, summary }: MyLoansProps) {
    const { t } = useLanguage();

    return (
        <DashboardLayout user={user} pageTitle={t('My Loans & Advances')}>
            <div className="space-y-6 p-4 sm:p-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <HandCoins className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('My Loans & Advances')}</CardTitle>
                                <CardDescription>
                                    {t('View your salary advances, EMIs paid and outstanding balances.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                                <HandCoins className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    {summary.openLoans}
                                </div>
                                <div className="text-xs text-slate-500">{t('Active Loans')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                                <BadgeIndianRupee className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    ₹{summary.outstandingTotal.toFixed(2)}
                                </div>
                                <div className="text-xs text-slate-500">{t('Outstanding')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                <WalletCards className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    {summary.emisPaid}
                                </div>
                                <div className="text-xs text-slate-500">{t('EMIs Paid')}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardContent>
                        <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Reason')}</TableHead>
                                        <TableHead>{t('Principal')}</TableHead>
                                        <TableHead>{t('Rate')}</TableHead>
                                        <TableHead>{t('Monthly EMI')}</TableHead>
                                        <TableHead>{t('Start')}</TableHead>
                                        <TableHead>{t('EMIs Paid')}</TableHead>
                                        <TableHead>{t('Remaining')}</TableHead>
                                        <TableHead>{t('Outstanding')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loans.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                                                {t('No loans or advances recorded for you yet.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        loans.map((loan) => (
                                            <TableRow key={loan.id}>
                                                <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                    {loan.reason}
                                                </TableCell>
                                                <TableCell>₹{loan.principal.toFixed(2)}</TableCell>
                                                <TableCell className="flex items-center gap-1 text-slate-600 dark:text-gray-300">
                                                    <Percent className="h-3 w-3" />
                                                    {loan.interestRate}
                                                </TableCell>
                                                <TableCell>₹{loan.monthlyEmi.toFixed(2)}</TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {loan.startDate}
                                                </TableCell>
                                                <TableCell>
                                                    {loan.paidEmis}/{loan.tenureMonths}
                                                </TableCell>
                                                <TableCell>{loan.remainingEmis}</TableCell>
                                                <TableCell className="font-semibold text-rose-600">
                                                    ₹{loan.outstanding.toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            loan.status === 'active'
                                                                ? 'bg-sky-50 text-sky-700'
                                                                : 'bg-emerald-50 text-emerald-700'
                                                        }
                                                    >
                                                        {loan.status === 'active' ? t('Active') : t('Completed')}
                                                    </Badge>
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
        </DashboardLayout>
    );
}
