import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowRight, CalendarRange, FileSpreadsheet, Users, CheckCircle2, Circle } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface ExamRow {
    id: number;
    name: string;
    academicYear: string | null;
    publishStatus: string;
    startDate: string | null;
    endDate: string | null;
    classesInScope: number;
}

interface AcademicYearOption {
    id: number;
    name: string;
    isCurrent: boolean;
}

function formatDate(date: string | null): string {
    if (!date) {
        return '-';
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function Datesheets({
    user,
    exams,
    academicYears,
    selectedSessionId,
}: {
    user: any;
    exams: ExamRow[];
    academicYears: AcademicYearOption[];
    selectedSessionId: number | null;
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [session, setSession] = useState(selectedSessionId ? String(selectedSessionId) : '');

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const changeSession = (value: string) => {
        setSession(value);
        router.get('/datesheets', value ? { session: value } : {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <DashboardLayout user={user} activeTab="datesheets">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('Datesheets')}</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            {t('Publish exam schedules to the notice board and the parent app.')}
                        </p>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle>{t('Exam schedules')}</CardTitle>
                                <CardDescription>
                                    {t('Pick an exam to review its datesheet and publish it.')}
                                </CardDescription>
                            </div>
                            <div className="w-full md:w-64">
                                <Label className="mb-1 block text-xs text-slate-500">{t('Academic session')}</Label>
                                <Select value={session} onValueChange={changeSession}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All sessions')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All sessions')}</SelectItem>
                                        {academicYears.map((year) => (
                                            <SelectItem key={year.id} value={String(year.id)}>
                                                {year.name}
                                                {year.isCurrent ? ' *' : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Exam')}</TableHead>
                                            <TableHead>{t('Session')}</TableHead>
                                            <TableHead>{t('Dates')}</TableHead>
                                            <TableHead>{t('Classes in scope')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead className="text-right">{t('Action')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {exams.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                    {t('Nothing here yet. Create an exam and set its schedule first.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            exams.map((exam) => (
                                                <TableRow key={exam.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                                                <FileSpreadsheet className="h-5 w-5" />
                                                            </div>
                                                            <div className="font-medium text-slate-900">
                                                                {exam.name}
                                                            </div>
                                                            {exam.classesInScope === 0 && (
                                                                <span className="text-xs text-slate-400">
                                                                    {t('No schedule yet')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        <div className="flex items-center gap-1.5">
                                                            <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
                                                            {exam.academicYear ?? '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        {formatDate(exam.startDate)} - {formatDate(exam.endDate)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                            <Users className="h-3.5 w-3.5 text-slate-400" />
                                                            {exam.classesInScope} {t('classes')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {exam.publishStatus === 'published' ? (
                                                            <Badge className="gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                {t('Published')}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="gap-1">
                                                                <Circle className="h-3 w-3" />
                                                                {t('Not published')}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button asChild size="sm" variant="outline" className="gap-1.5">
                                                            <a href={`/datesheets/${exam.id}`}>
                                                                {t('Manage')}
                                                                <ArrowRight className="h-3.5 w-3.5" />
                                                            </a>
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
            </div>
        </DashboardLayout>
    );
}
