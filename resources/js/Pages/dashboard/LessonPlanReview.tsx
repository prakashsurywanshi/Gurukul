import { useLanguage } from '../../i18n/LanguageProvider';
import { FileText, ShieldCheck, UserCheck } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

type PlanEntry = {
    id: string;
    timetableEntryId: string;
    classId: string;
    day: string;
    periodId: string;
    subject: string;
    teacherName: string;
    room: string;
    startTime: string;
    endTime: string;
    lessonDate: string;
    lessonTitle: string;
    topic: string;
    status: string;
    approvedByName: string | null;
    approvedAt: string | null;
};

type LessonPlanReviewProps = {
    user: any;
    entries: PlanEntry[];
};

const STATUS_TONES: Record<string, string> = {
    planned: 'bg-sky-50 text-sky-700',
    in_progress: 'bg-amber-50 text-amber-700',
    completed: 'bg-emerald-50 text-emerald-700',
    carried_forward: 'bg-violet-50 text-violet-700',
};

export default function LessonPlanReview({ user, entries }: LessonPlanReviewProps) {
    const { t } = useLanguage();
    const pending = entries.filter((entry) => !entry.approvedByName).length;

    return (
        <DashboardLayout user={user} pageTitle={t('Lesson Plan Review')}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <UserCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('Lesson Plan Review')}</CardTitle>
                                <CardDescription>
                                    {t('Review lesson plan status and approval details across subjects.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">{pending}</div>
                            <div className="text-xs text-slate-500">{t('Awaiting Approval')}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Date')}</TableHead>
                                        <TableHead>{t('Lesson')}</TableHead>
                                        <TableHead>{t('Class')}</TableHead>
                                        <TableHead>{t('Subject')}</TableHead>
                                        <TableHead>{t('Teacher')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead>{t('Approved By')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                                {t('No lesson plans recorded yet.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        entries.map((entry) => (
                                            <TableRow key={entry.id}>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {entry.lessonDate}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                    {entry.lessonTitle}
                                                    <span className="block text-xs text-slate-500">{entry.topic}</span>
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {entry.day}
                                                    {entry.startTime ? ` · ${entry.startTime}` : ''}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {entry.subject}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {entry.teacherName}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={STATUS_TONES[entry.status] ?? ''}
                                                    >
                                                        {entry.status === 'in_progress'
                                                            ? t('In Progress')
                                                            : entry.status === 'carried_forward'
                                                              ? t('Carried Forward')
                                                              : t(
                                                                    entry.status.charAt(0).toUpperCase() +
                                                                        entry.status.slice(1),
                                                                )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {entry.approvedByName ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            <FileText className="h-3 w-3" />
                                                            {entry.approvedByName}
                                                            <span className="text-xs text-slate-400">
                                                                {entry.approvedAt}
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-600">{t('Pending')}</span>
                                                    )}
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
