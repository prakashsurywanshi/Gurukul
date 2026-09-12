import { useLanguage } from '../../i18n/LanguageProvider';
import { BookOpenCheck, ClipboardList, GraduationCap, Users } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

type LessonPlanReportsProps = {
    user: any;
    entries: {
        lessonDate: string;
        lessonTitle: string;
        classId: string;
        subject: string;
        teacherName: string;
        status: string;
    }[];
    summary: {
        total: number;
        byStatus: Record<string, number>;
        byTeacher: Record<string, number>;
        bySubject: Record<string, number>;
        byClass: Record<string, number>;
    };
};

const STATUS_HUMAN: Record<string, string> = {
    planned: 'Planned',
    in_progress: 'In Progress',
    completed: 'Completed',
    carried_forward: 'Carried Forward',
};

function BreakdownTable({ title, rows }: { title: string; rows: [string, number][] }) {
    const { t } = useLanguage();

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Category')}</TableHead>
                                <TableHead>{t('Plans')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-16 text-center text-slate-500">
                                        {t('No data')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map(([key, value]) => (
                                    <TableRow key={key}>
                                        <TableCell className="text-slate-700 dark:text-gray-200">{key}</TableCell>
                                        <TableCell className="font-medium">{value}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

export default function LessonPlanReports({ user, entries, summary }: LessonPlanReportsProps) {
    const { t } = useLanguage();

    return (
        <DashboardLayout user={user} pageTitle={t('Lesson Plan Reports')}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <BookOpenCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('Lesson Plan Reports')}</CardTitle>
                                <CardDescription>
                                    {t('Summary of lesson planning activity by status, teacher and subject.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                                <ClipboardList className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    {summary.total}
                                </div>
                                <div className="text-xs text-slate-500">{t('Total Plans')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                <BookOpenCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    {summary.byStatus.completed ?? 0}
                                </div>
                                <div className="text-xs text-slate-500">{t('Completed')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    {Object.keys(summary.byTeacher).length}
                                </div>
                                <div className="text-xs text-slate-500">{t('Teachers')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    {Object.keys(summary.bySubject).length}
                                </div>
                                <div className="text-xs text-slate-500">{t('Subjects')}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <BreakdownTable
                        title={t('Plans by Status')}
                        rows={Object.entries(summary.byStatus).map(([key, value]) => [STATUS_HUMAN[key] ?? key, value])}
                    />
                    <BreakdownTable title={t('Plans by Teacher')} rows={Object.entries(summary.byTeacher)} />
                    <BreakdownTable title={t('Plans by Subject')} rows={Object.entries(summary.bySubject)} />
                    <BreakdownTable title={t('Plans by Class')} rows={Object.entries(summary.byClass)} />
                </div>

                <Card>
                    <CardContent>
                        <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Date')}</TableHead>
                                        <TableHead>{t('Lesson')}</TableHead>
                                        <TableHead>{t('Subject')}</TableHead>
                                        <TableHead>{t('Teacher')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                                {t('No lesson plans recorded yet.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        entries.map((entry) => (
                                            <TableRow key={`${entry.lessonDate}-${entry.lessonTitle}-${entry.subject}`}>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {entry.lessonDate}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                    {entry.lessonTitle}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {entry.subject}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {entry.teacherName}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-sky-50 text-sky-700">
                                                        {STATUS_HUMAN[entry.status] ?? entry.status}
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
