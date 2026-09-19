import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useMemo, useState } from 'react';
import { Award, FileText, GraduationCap, Loader2, Palette, Printer, Save, Sparkles } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import { orgTypeFeatures } from '../../lib/orgTypeConfig';
import type { RequestPayload } from '@inertiajs/core';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface GradeRow {
    grade: string;
    min: number;
    max: number;
    point: number;
    remark?: string | null;
}

interface AppearanceShape {
    primary_color: string;
    accent_color: string;
    font_size: 'small' | 'normal' | 'large';
    show_logo: boolean;
    show_grades: boolean;
}

interface ReportProps {
    user: any;
    organization?: any;
    appearance?: AppearanceShape | null;
    students?: Array<{
        id: string;
        first_name: string;
        last_name: string;
        class?: string | null;
        section?: string | null;
        roll_number?: string | null;
    }>;
    exams?: Array<{
        id: string;
        name: string;
        className?: string | null;
        section?: string | null;
        publishStatus?: string;
        subjectCount?: number;
    }>;
    gradeScale?: GradeRow[];
    selectedStudentId?: string | null;
    selectedExamId?: string | null;
    report?: any;
}

export default function ReportCard(pageProps: ReportProps) {
    const { t } = useLanguage();
    const orgType = usePage<{ orgType?: string }>().props.orgType;
    const orgFeatures = orgTypeFeatures(orgType);
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const organization = pageProps.organization;
    const students = pageProps.students ?? [];
    const exams = pageProps.exams ?? [];
    const initialScale = pageProps.gradeScale ?? [];
    const initialAppearance: AppearanceShape = pageProps.appearance ?? {
        primary_color: '#2563EB',
        accent_color: '#10B981',
        font_size: 'normal',
        show_logo: true,
        show_grades: true,
    };

    const canEditScale = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'teacher';

    const [studentId, setStudentId] = useState(pageProps.selectedStudentId ?? '');
    const [examId, setExamId] = useState(pageProps.selectedExamId ?? '');
    const [generating, setGenerating] = useState(false);
    const [scaleRows, setScaleRows] = useState<GradeRow[]>(initialScale);
    const [savingScale, setSavingScale] = useState(false);
    const [appearance, setAppearance] = useState<AppearanceShape>(initialAppearance);
    const [savingAppearance, setSavingAppearance] = useState(false);

    const reportFontSize =
        appearance.font_size === 'small' ? '13px' : appearance.font_size === 'large' ? '15.5px' : '14px';

    const selectedExam = useMemo(() => exams.find((exam) => exam.id === examId) ?? null, [exams, examId]);

    const eligibleStudents = useMemo(() => {
        if (!selectedExam?.className) {
            return students;
        }

        return students.filter(
            (student) => student.class === selectedExam.className && student.section === selectedExam.section,
        );
    }, [students, selectedExam]);

    const generateReport = () => {
        if (!examId || !studentId) {
            return;
        }

        setGenerating(true);
        router.get(
            '/exams/report-card',
            { exam: examId, student: studentId },
            {
                preserveScroll: true,
                onFinish: () => setGenerating(false),
            },
        );
    };

    const handleSaveScale = (event: FormEvent) => {
        event.preventDefault();

        setSavingScale(true);
        router.post('/exams/report-card/grading-scale', { rows: scaleRows } as unknown as RequestPayload, {
            preserveScroll: true,
            onFinish: () => setSavingScale(false),
        });
    };

    const updateScaleRow = (index: number, field: keyof GradeRow, value: string) => {
        setScaleRows((current) =>
            current.map((row, i) =>
                i === index ? { ...row, [field]: field === 'remark' ? value : Number(value) } : row,
            ),
        );
    };

    const saveAppearance = () => {
        setSavingAppearance(true);
        router.patch(
            '/exams/report-card/appearance',
            {
                primary_color: appearance.primary_color,
                accent_color: appearance.accent_color,
                font_size: appearance.font_size,
                show_logo: appearance.show_logo,
                show_grades: appearance.show_grades,
            } as unknown as RequestPayload,
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(t('Report card appearance saved.'));
                },
                onFinish: () => setSavingAppearance(false),
            },
        );
    };

    const report = pageProps.report;
    const overallPass = report?.result === 'Pass';

    const printReport = () => {
        window.print();
    };

    return (
        <DashboardLayout user={user}>
            <div data-print-root>
                <div className="no-print space-y-6 p-4 sm:p-6">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-bold text-slate-900">
                            <FileText className="mr-2 inline-block h-6 w-6 text-indigo-600" />
                            {t('Report Card')}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {t('Generate printable report cards with per-subject marks, grades, and rank.')}
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Generate Report Card')}</CardTitle>
                            <CardDescription>
                                {t('Choose an exam and a student to render the report card.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
                            <div className="w-full space-y-2 md:w-72">
                                <Label>{t('Exam')}</Label>
                                <Select value={examId} onValueChange={(value) => setExamId(value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select exam')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exams.map((exam) => (
                                            <SelectItem key={exam.id} value={exam.id}>
                                                {exam.name}
                                                {exam.className ? ` — ${exam.className} ${exam.section ?? ''}` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-full space-y-2 md:w-80">
                                <Label>{t('Student')}</Label>
                                <Select value={studentId} onValueChange={(value) => setStudentId(value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select student')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eligibleStudents.map((student) => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.first_name} {student.last_name}
                                                {student.class ? ` — ${student.class} ${student.section ?? ''}` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                type="button"
                                className="shrink-0"
                                disabled={!examId || !studentId || generating}
                                onClick={generateReport}
                            >
                                {generating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                {t('Generate Report')}
                            </Button>
                        </CardContent>
                    </Card>

                    {canEditScale ? (
                        <Card data-scale-editor>
                            <CardHeader>
                                <CardTitle>
                                    <Award className="mr-2 inline-block h-5 w-5 text-indigo-600" />
                                    {t('Grading Scale')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Configure grade boundaries, grade points, and remarks.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSaveScale} className="space-y-4">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('Grade')}</TableHead>
                                                    <TableHead>{t('Min %')}</TableHead>
                                                    <TableHead>{t('Max %')}</TableHead>
                                                    <TableHead>{t('Grade Point')}</TableHead>
                                                    <TableHead>{t('Remark')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {scaleRows.map((row, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <Input
                                                                className="w-24"
                                                                value={row.grade}
                                                                onChange={(event) =>
                                                                    updateScaleRow(index, 'grade', event.target.value)
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="w-24"
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                value={row.min}
                                                                onChange={(event) =>
                                                                    updateScaleRow(index, 'min', event.target.value)
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="w-24"
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                value={row.max}
                                                                onChange={(event) =>
                                                                    updateScaleRow(index, 'max', event.target.value)
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="w-24"
                                                                type="number"
                                                                step="0.1"
                                                                min={0}
                                                                max={10}
                                                                value={row.point}
                                                                onChange={(event) =>
                                                                    updateScaleRow(index, 'point', event.target.value)
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="w-56"
                                                                value={row.remark ?? ''}
                                                                onChange={(event) =>
                                                                    updateScaleRow(index, 'remark', event.target.value)
                                                                }
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {errors?.rows ? <p className="text-sm text-red-600">{errors.rows}</p> : null}

                                    <Button type="submit" disabled={savingScale}>
                                        {savingScale ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                        {t('Save Grading Scale')}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    ) : null}

                    {canEditScale ? (
                        <Card data-appearance-editor>
                            <CardHeader>
                                <CardTitle>
                                    <Palette className="mr-2 inline-block h-5 w-5 text-indigo-600" />
                                    {t('Report Card Appearance')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Customize the colors, font size and fields shown on the report card.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label>{t('Primary Color')}</Label>
                                        <div className="mt-1 flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={appearance.primary_color}
                                                onChange={(e) =>
                                                    setAppearance((a) => ({
                                                        ...a,
                                                        primary_color: e.target.value,
                                                    }))
                                                }
                                                className="h-9 w-12 rounded-md border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
                                            />
                                            <Input
                                                value={appearance.primary_color}
                                                onChange={(e) =>
                                                    setAppearance((a) => ({
                                                        ...a,
                                                        primary_color: e.target.value,
                                                    }))
                                                }
                                                className="h-9"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>{t('Accent Color')}</Label>
                                        <div className="mt-1 flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={appearance.accent_color}
                                                onChange={(e) =>
                                                    setAppearance((a) => ({
                                                        ...a,
                                                        accent_color: e.target.value,
                                                    }))
                                                }
                                                className="h-9 w-12 rounded-md border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
                                            />
                                            <Input
                                                value={appearance.accent_color}
                                                onChange={(e) =>
                                                    setAppearance((a) => ({
                                                        ...a,
                                                        accent_color: e.target.value,
                                                    }))
                                                }
                                                className="h-9"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full md:w-72">
                                    <Label>{t('Font Size')}</Label>
                                    <Select
                                        value={appearance.font_size}
                                        onValueChange={(value) =>
                                            setAppearance((a) => ({
                                                ...a,
                                                font_size: value as AppearanceShape['font_size'],
                                            }))
                                        }
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="small">{t('Small')}</SelectItem>
                                            <SelectItem value="normal">{t('Normal')}</SelectItem>
                                            <SelectItem value="large">{t('Large')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={appearance.show_logo}
                                            onChange={(e) =>
                                                setAppearance((a) => ({ ...a, show_logo: e.target.checked }))
                                            }
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm dark:text-white">{t('Show school logo')}</span>
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={appearance.show_grades}
                                            onChange={(e) =>
                                                setAppearance((a) => ({ ...a, show_grades: e.target.checked }))
                                            }
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm dark:text-white">{t('Show grades & points')}</span>
                                    </label>
                                </div>

                                <Button type="button" onClick={saveAppearance} disabled={savingAppearance}>
                                    {savingAppearance ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    {t('Save Appearance')}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>

                {report ? (
                    <div
                        data-report-card
                        className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:mt-0 print:rounded-none print:border-0 print:p-0 print:shadow-none"
                        style={{ fontSize: reportFontSize }}
                    >
                        <div className="flex flex-col items-center gap-1 border-b border-slate-200 pb-4 text-center print:border-b print:pb-3">
                            {appearance.show_logo ? (
                                organization?.logo ? (
                                    <img
                                        src={organization.logo}
                                        alt={t('School logo')}
                                        className="mb-1 h-16 w-16 rounded-full object-cover"
                                    />
                                ) : (
                                    <GraduationCap
                                        className="mb-1 h-10 w-10"
                                        style={{ color: appearance.primary_color }}
                                    />
                                )
                            ) : null}
                            <h3 className="text-xl font-bold" style={{ color: appearance.primary_color }}>
                                {organization?.name}
                            </h3>
                            {organization?.address ? (
                                <p className="text-sm text-slate-500">{organization.address}</p>
                            ) : null}
                            <p
                                className="mt-1 text-lg font-semibold uppercase tracking-wide"
                                style={{ color: appearance.accent_color }}
                            >
                                {t('Report Card')}
                            </p>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <p className="text-xs font-medium uppercase text-slate-400">{t('Student Name')}</p>
                                <p className="font-semibold text-slate-900">
                                    {report.student.first_name} {report.student.last_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase text-slate-400">{t('Admission No.')}</p>
                                <p className="font-semibold text-slate-900">{report.student.admission_no || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase text-slate-400">
                                    {t(orgFeatures.groupWordKey)}
                                </p>
                                <p className="font-semibold text-slate-900">
                                    {report.student.course ?? report.student.class ?? '—'}
                                    {report.student.batch
                                        ? ` · ${report.student.batch}`
                                        : report.student.section
                                          ? ` · ${report.student.section}`
                                          : ''}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase text-slate-400">{t('Exam')}</p>
                                <p className="font-semibold text-slate-900">
                                    {report.exam.name}
                                    {report.exam.semester ? ` · ${report.exam.semester}` : ''}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Subject')}</TableHead>
                                        {report.creditBased ? (
                                            <TableHead className="text-center">{t('Credits')}</TableHead>
                                        ) : null}
                                        <TableHead className="text-center">{t('Max')}</TableHead>
                                        <TableHead className="text-center">{t('Passing')}</TableHead>
                                        <TableHead className="text-center">{t('Obtained')}</TableHead>
                                        <TableHead className="text-center">{t('%')}</TableHead>
                                        {appearance.show_grades ? (
                                            <>
                                                <TableHead className="text-center">{t('Grade')}</TableHead>
                                                <TableHead className="text-center">{t('Point')}</TableHead>
                                            </>
                                        ) : null}
                                        <TableHead className="text-center">{t('Result')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.subjects.map((row: any) => {
                                        const subjectPass = row.isAbsent
                                            ? false
                                            : row.obtainedMarks >= row.passingMarks;

                                        return (
                                            <TableRow key={row.subject}>
                                                <TableCell className="font-medium">{row.subject}</TableCell>
                                                {report.creditBased ? (
                                                    <TableCell className="text-center">
                                                        {row.credits != null ? row.credits : '—'}
                                                    </TableCell>
                                                ) : null}
                                                <TableCell className="text-center">{row.maxMarks}</TableCell>
                                                <TableCell className="text-center">{row.passingMarks}</TableCell>
                                                <TableCell className="text-center">
                                                    {row.isAbsent ? '—' : row.obtainedMarks}
                                                </TableCell>
                                                <TableCell className="text-center">{row.percentage}</TableCell>
                                                {appearance.show_grades ? (
                                                    <>
                                                        <TableCell className="text-center">
                                                            <Badge variant={subjectPass ? 'default' : 'destructive'}>
                                                                {row.isAbsent ? t('Absent') : row.grade}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {row.isAbsent ? '—' : row.gradePoint}
                                                        </TableCell>
                                                    </>
                                                ) : null}
                                                <TableCell className="text-center">
                                                    <span className={subjectPass ? 'text-emerald-600' : 'text-red-600'}>
                                                        {row.isAbsent
                                                            ? t('Absent')
                                                            : subjectPass
                                                              ? t('Pass')
                                                              : t('Fail')}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="mt-5 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-x-8 gap-y-2">
                                <div>
                                    <p className="text-xs font-medium uppercase text-slate-400">{t('Total')}</p>
                                    <p className="font-semibold text-slate-900">
                                        {report.totalObtained} / {report.totalMax}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase text-slate-400">{t('Percentage')}</p>
                                    <p className="font-semibold text-slate-900">{report.percentage}%</p>
                                </div>
                                {appearance.show_grades ? (
                                    <div>
                                        <p className="text-xs font-medium uppercase text-slate-400">
                                            {t('Overall Grade')}
                                        </p>
                                        <p className="font-semibold text-slate-900">
                                            {report.overallGrade ?? '—'}{' '}
                                            {report.overallGradePoint ? `(${report.overallGradePoint})` : ''}
                                        </p>
                                    </div>
                                ) : null}
                                {report.creditBased ? (
                                    <div>
                                        <p className="text-xs font-medium uppercase text-slate-400">
                                            {t('SGPA / CGPA')}
                                        </p>
                                        <p className="font-semibold text-slate-900">
                                            {report.sgpa ?? '—'}
                                            {report.cgpa !== null && report.cgpa !== undefined
                                                ? ` / ${report.cgpa}`
                                                : ''}{' '}
                                            <span className="text-sm text-slate-500">
                                                ({t('Credits')}: {report.totalCredits})
                                            </span>
                                        </p>
                                    </div>
                                ) : null}
                                <div>
                                    <p className="text-xs font-medium uppercase text-slate-400">{t('Rank')}</p>
                                    <p className="font-semibold text-slate-900">
                                        {report.rank ? `#${report.rank}` : '—'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {report.overallRemark ? (
                                    <p className="text-sm italic text-slate-500">"{report.overallRemark}"</p>
                                ) : null}
                                <Badge variant={overallPass ? 'default' : 'destructive'} className="text-sm">
                                    {overallPass ? t('Pass') : t('Fail')}
                                </Badge>
                            </div>
                        </div>

                        <div className="no-print mt-5 flex justify-end">
                            <Button type="button" variant="outline" onClick={printReport}>
                                <Printer className="mr-2 h-4 w-4" />
                                {t('Print Report Card')}
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>
        </DashboardLayout>
    );
}
