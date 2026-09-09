import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Clock, ListChecks, RotateCcw, Save, ShieldAlert } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface ExamOption {
    id: number;
    name: string;
}

interface ClassOption {
    id: number;
    name: string;
    section: string;
}

interface ScheduleRow {
    id: number;
    subjectId: number;
    subject: string;
    code: string;
    examDate: string;
    startTime: string;
    endTime: string;
    roomNumber: string;
    maxMarks: number;
    passingMarks: number;
    scheduled: boolean;
}

interface EditableRow {
    subjectId: number;
    subject: string;
    code: string;
    examDate: string;
    startTime: string;
    endTime: string;
    roomNumber: string;
    maxMarks: string;
    passingMarks: string;
    scheduled: boolean;
}

export default function ExamScheduleSetup({
    user,
    exams,
    classes,
    selectedExamId,
    selectedClassId,
    rows,
    subjectsOutOfScope,
}: {
    user: any;
    exams: ExamOption[];
    classes: ClassOption[];
    selectedExamId: number | null;
    selectedClassId: number | null;
    rows: ScheduleRow[];
    subjectsOutOfScope: string[];
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [examId, setExamId] = useState<string>(selectedExamId ? String(selectedExamId) : '');
    const [classId, setClassId] = useState<string>(selectedClassId ? String(selectedClassId) : '');
    const [editable, setEditable] = useState<EditableRow[]>(
        rows.map((row) => ({
            subjectId: row.subjectId,
            subject: row.subject,
            code: row.code,
            examDate: row.examDate,
            startTime: row.startTime,
            endTime: row.endTime,
            roomNumber: row.roomNumber,
            maxMarks: String(row.maxMarks),
            passingMarks: String(row.passingMarks),
            scheduled: row.scheduled,
        })),
    );
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setEditable(
            rows.map((row) => ({
                subjectId: row.subjectId,
                subject: row.subject,
                code: row.code,
                examDate: row.examDate,
                startTime: row.startTime,
                endTime: row.endTime,
                roomNumber: row.roomNumber,
                maxMarks: String(row.maxMarks),
                passingMarks: String(row.passingMarks),
                scheduled: row.scheduled,
            })),
        );
    }, [rows]);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const applyFilter = (nextExamId: string, nextClassId: string) => {
        const params = new URLSearchParams();

        if (nextExamId) {
            params.set('exam', nextExamId);
        }

        if (nextClassId) {
            params.set('class', nextClassId);
        }

        router.get(`/exam-schedule${params.toString() ? `?${params.toString()}` : ''}`, {}, { preserveState: false });
    };

    const updateRow = (index: number, patch: Partial<EditableRow>) => {
        setEditable((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
    };

    const resetDefaults = () => {
        setEditable((current) =>
            current.map((row) => ({
                ...row,
                examDate: row.scheduled ? row.examDate : '',
                startTime: row.scheduled ? row.startTime : '',
                endTime: row.scheduled ? row.endTime : '',
                roomNumber: row.scheduled ? row.roomNumber : '',
                maxMarks: '100',
                passingMarks: '33',
            })),
        );
    };

    const save = () => {
        if (!examId || !classId) {
            toast.error('Select an exam and a class first.');
            return;
        }

        const body = editable.map((row) => ({
            subject_id: row.subjectId,
            exam_date: row.examDate || null,
            start_time: row.startTime || null,
            end_time: row.endTime || null,
            room_number: row.roomNumber || null,
            max_marks: Number(row.maxMarks),
            passing_marks: Number(row.passingMarks),
        }));

        setProcessing(true);
        router.post(
            '/exam-schedule',
            { exam_id: examId, class_id: classId, rows: body },
            {
                preserveScroll: true,
                onError: () => toast.error('Failed to save setup.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="exam-schedule-setup">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Schedule & Marks Setup')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Set exam dates, timings, rooms and marks for each subject of a class.')}
                            </p>
                        </div>
                        <Button onClick={save} disabled={processing || !examId || !classId} className="gap-2">
                            <Save className="h-4 w-4" />
                            {processing ? t('Saving...') : t('Save')}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('Select Exam & Class')}</CardTitle>
                            <CardDescription>
                                {t('Choose an exam and a class to configure subjects and marks.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <span className="text-sm font-medium leading-none">{t('Exam')}</span>
                                    <Select
                                        value={examId}
                                        onValueChange={(value) => {
                                            setExamId(value);
                                            applyFilter(value, classId);
                                        }}
                                    >
                                        <SelectTrigger id="exam-select-01">
                                            <SelectValue placeholder={t('Select exam')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {exams.map((exam) => (
                                                <SelectItem key={exam.id} value={String(exam.id)}>
                                                    {exam.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-sm font-medium leading-none">{t('Class')}</span>
                                    <Select
                                        value={classId}
                                        onValueChange={(value) => {
                                            setClassId(value);
                                            applyFilter(examId, value);
                                        }}
                                    >
                                        <SelectTrigger id="class-select-04">
                                            <SelectValue placeholder={t('Select class')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map((schoolClass) => (
                                                <SelectItem key={schoolClass.id} value={String(schoolClass.id)}>
                                                    {schoolClass.name}
                                                    {schoolClass.section ? ` - ${schoolClass.section}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {!examId || !classId ? (
                                <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                                    <ListChecks className="h-8 w-8 text-slate-400" />
                                    <p className="text-sm text-slate-500">
                                        {t('Select an exam and a class above to start configuring.')}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-slate-800">{t('Subjects')}</h3>
                                            <span className="text-xs text-slate-500">
                                                {editable.length} {t('subjects')} ·{' '}
                                                {editable.filter((row) => row.scheduled).length} {t('scheduled')}
                                            </span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={resetDefaults}
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                            {t('Reset')}
                                        </Button>
                                    </div>
                                    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-10">{t('#')}</TableHead>
                                                    <TableHead>{t('Subject')}</TableHead>
                                                    <TableHead>{t('Exam Date')}</TableHead>
                                                    <TableHead>{t('Start Time')}</TableHead>
                                                    <TableHead>{t('End Time')}</TableHead>
                                                    <TableHead>{t('Room')}</TableHead>
                                                    <TableHead>{t('Max Marks')}</TableHead>
                                                    <TableHead>{t('Passing Marks')}</TableHead>
                                                    <TableHead className="text-right">{t('Status')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {editable.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={9}
                                                            className="h-24 text-center text-slate-500"
                                                        >
                                                            {t(
                                                                'No subjects assigned to this class for this school year.',
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    editable.map((row, index) => (
                                                        <TableRow key={row.subjectId} className="align-top">
                                                            <TableCell className="text-sm text-slate-500">
                                                                {index + 1}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col items-start gap-1.5">
                                                                    <span className="font-medium text-slate-800">
                                                                        {row.subject}
                                                                    </span>
                                                                    {row.code ? (
                                                                        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">
                                                                            {row.code}
                                                                        </Badge>
                                                                    ) : null}
                                                                    {row.scheduled ? (
                                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                                            {t('Scheduled')}
                                                                        </Badge>
                                                                    ) : null}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <input
                                                                    type="date"
                                                                    className="h-9 w-[130px] rounded-md border border-slate-300 bg-slate-50 text-sm focus:ring-blue-500"
                                                                    value={row.examDate}
                                                                    onChange={(event) =>
                                                                        updateRow(index, {
                                                                            examDate: event.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <input
                                                                    type="time"
                                                                    className="h-9 w-[110px] rounded-md border border-slate-300 bg-slate-50 text-sm"
                                                                    value={row.startTime}
                                                                    onChange={(event) =>
                                                                        updateRow(index, {
                                                                            startTime: event.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <input
                                                                    type="time"
                                                                    className="h-9 w-[110px] rounded-md border border-slate-300 bg-slate-50 text-sm"
                                                                    value={row.endTime}
                                                                    onChange={(event) =>
                                                                        updateRow(index, {
                                                                            endTime: event.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <input
                                                                    type="text"
                                                                    className="h-9 w-[70px] rounded-md border border-slate-300 bg-slate-50 text-sm"
                                                                    placeholder={t('Room')}
                                                                    value={row.roomNumber}
                                                                    onChange={(event) =>
                                                                        updateRow(index, {
                                                                            roomNumber: event.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    className="h-9 w-[70px] rounded-md border border-slate-300 bg-slate-50 text-sm"
                                                                    value={row.maxMarks}
                                                                    onChange={(event) =>
                                                                        updateRow(index, {
                                                                            maxMarks: event.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    className="h-9 w-[70px] rounded-md border border-slate-300 bg-slate-50 text-sm"
                                                                    value={row.passingMarks}
                                                                    onChange={(event) =>
                                                                        updateRow(index, {
                                                                            passingMarks: event.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {row.scheduled ? (
                                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                                        {t('Scheduled')}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100">
                                                                        {t('Pending')}
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {subjectsOutOfScope.length > 0 && (
                                        <div className="mt-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                            <p>
                                                {t('Subjects not included in the current setup')}:{' '}
                                                {subjectsOutOfScope.join(', ')}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="mt-6 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>
                                    {t('Tips')}:{' '}
                                    {t(
                                        'Enter the exam date, timings and room for each subject. Max and passing marks are used when entering marks later. Date selection reflects in exam start/end dates automatically.',
                                    )}
                                </p>
                            </div>
                            <div className="mt-4">
                                <Link
                                    href="/exams/marks/entry"
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                >
                                    {t('Go to Enter Marks')} →
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
