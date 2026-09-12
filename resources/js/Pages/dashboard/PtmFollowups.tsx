import { useLanguage } from '../../i18n/LanguageProvider';
import { router } from '@inertiajs/react';
import { CheckCircle2, Handshake, ListChecks, RefreshCcw } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

type FollowupRow = {
    id: number;
    status: string;
    remarks: string | null;
    follow_up_due: string | null;
    follow_up_completed_at: string | null;
    session_title: string | null;
    session_date: string | null;
    student: { id: string; name: string; class?: string; section?: string } | null;
};

type PtmFollowupsProps = {
    user: any;
    appointments: FollowupRow[];
    filter: string;
    summary: { pending: number; completed: number };
};

export default function PtmFollowups({ user, appointments, filter, summary }: PtmFollowupsProps) {
    const { t } = useLanguage();

    const toggle = (row: FollowupRow) =>
        router.patch(
            `/ptm/appointments/${row.id}/follow-up`,
            { done: !row.follow_up_completed_at },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(t('Follow-up updated successfully.')),
            },
        );

    const setFilter = (next: string) =>
        router.get('/ptm/followups', next === 'pending' ? {} : { status: next }, { replace: true });

    return (
        <DashboardLayout user={user} pageTitle={t('PTM Follow-ups')}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <Handshake className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('PTM Follow-ups')}</CardTitle>
                                <CardDescription>
                                    {t('Track parent-teacher follow-up actions across all meetings.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-2 gap-4 md:w-1/2">
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                                <ListChecks className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    {summary.pending}
                                </div>
                                <div className="text-xs text-slate-500">{t('Pending')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    {summary.completed}
                                </div>
                                <div className="text-xs text-slate-500">{t('Completed')}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex gap-2">
                    {['pending', 'completed', 'all'].map((value) => (
                        <Button
                            key={value}
                            variant={filter === value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter(value)}
                        >
                            {value === 'pending' ? t('Pending') : value === 'completed' ? t('Completed') : t('All')}
                        </Button>
                    ))}
                </div>

                <Card>
                    <CardContent>
                        <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Student')}</TableHead>
                                        <TableHead>{t('Meeting')}</TableHead>
                                        <TableHead>{t('Follow-up Due')}</TableHead>
                                        <TableHead>{t('Remarks')}</TableHead>
                                        <TableHead>{t('Completed At')}</TableHead>
                                        <TableHead>{t('Action')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {appointments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                {filter === 'completed'
                                                    ? t('No completed follow-ups.')
                                                    : t('No pending follow-ups.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        appointments.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                    {row.student?.name ?? '-'}
                                                    {row.student?.class ? (
                                                        <span className="block text-xs text-slate-500">
                                                            {row.student.class}
                                                            {row.student.section ? ` / ${row.student.section}` : ''}
                                                        </span>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {row.session_title ?? '-'}
                                                    {row.session_date ? (
                                                        <span className="block text-xs text-slate-500">
                                                            {row.session_date}
                                                        </span>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell>
                                                    {row.follow_up_due ? (
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                row.follow_up_completed_at
                                                                    ? 'bg-emerald-50 text-emerald-700'
                                                                    : 'bg-amber-50 text-amber-700'
                                                            }
                                                        >
                                                            {row.follow_up_due}
                                                        </Badge>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-64 text-slate-600 dark:text-gray-300">
                                                    {row.remarks ?? '-'}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {row.follow_up_completed_at ?? '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        variant={row.follow_up_completed_at ? 'outline' : 'default'}
                                                        onClick={() => toggle(row)}
                                                    >
                                                        {row.follow_up_completed_at ? (
                                                            <>
                                                                <RefreshCcw className="mr-1 h-4 w-4" />
                                                                {t('Reopen')}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                                                {t('Mark Done')}
                                                            </>
                                                        )}
                                                    </Button>
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
