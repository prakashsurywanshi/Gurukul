import { useLanguage } from '../../i18n/LanguageProvider';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Save } from 'lucide-react';
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

interface SubjectColumn {
    scheduleId: number;
    subject: string;
    examDate: string;
    startTime: string;
    endTime: string;
    room: string;
    maxMarks: number;
    passingMarks: number;
}

interface StudentMark {
    marks: number;
    grade: string;
    isAbsent: boolean;
}

interface StudentRow {
    id: string;
    name: string;
    rollNumber: string;
    marks: (StudentMark | null)[];
}

interface MarkCell {
    marks: string;
    absent: boolean;
}

export default function EnterMarks({
    user,
    exams,
    classes,
    selectedExamId,
    selectedClassId,
    subjects,
    students,
}: {
    user: any;
    exams: ExamOption[];
    classes: ClassOption[];
    selectedExamId: number | null;
    selectedClassId: number | null;
    subjects: SubjectColumn[];
    students: StudentRow[];
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [examId, setExamId] = useState<string>(selectedExamId ? String(selectedExamId) : '');
    const [classId, setClassId] = useState<string>(selectedClassId ? String(selectedClassId) : '');
    const [savingSchedule, setSavingSchedule] = useState<number | null>(null);

    const initialGrid = useMemo(() => {
        const grid: MarkCell[][] = students.map((student) =>
            subjects.map((_, subjectIndex) => {
                const mark = student.marks[subjectIndex];
                return { marks: mark?.marks != null ? String(mark.marks) : '', absent: mark?.isAbsent ?? false };
            }),
        );
        return grid;
    }, [students, subjects]);

    const [grid, setGrid] = useState<MarkCell[][]>(initialGrid);

    useEffect(() => {
        setGrid(
            students.map((student) =>
                subjects.map((_, subjectIndex) => {
                    const mark = student.marks[subjectIndex];
                    return { marks: mark?.marks != null ? String(mark.marks) : '', absent: mark?.isAbsent ?? false };
                }),
            ),
        );
    }, [students, subjects]);

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

        router.get(
            `/exams/marks/entry${params.toString() ? `?${params.toString()}` : ''}`,
            {},
            { preserveState: false },
        );
    };

    const updateCell = useCallback((studentIndex: number, subjectIndex: number, patch: Partial<MarkCell>) => {
        setGrid((current) =>
            current.map((row, rowIndex) =>
                rowIndex === studentIndex
                    ? row.map((cell, cellIndex) => (cellIndex === subjectIndex ? { ...cell, ...patch } : cell))
                    : row,
            ),
        );
    }, []);

    const saveSubject = useCallback(
        (subjectIndex: number) => {
            const scheduleId = subjects[subjectIndex]?.scheduleId;

            if (!scheduleId) {
                toast.error('No schedule found for this subject.');
                return;
            }

            const values = students.map((student, studentIndex) => {
                const cell = grid[studentIndex][subjectIndex];
                return {
                    student_id: student.id,
                    marks_obtained: cell.absent ? null : Number(cell.marks),
                    is_absent: cell.absent,
                };
            });

            setSavingSchedule(scheduleId);
            router.post(
                '/exams/marks/save',
                { schedule_id: scheduleId, values },
                {
                    preserveScroll: true,
                    onError: () =>
                        toast.error(`Failed to save marks for ${subjects[subjectIndex]?.subject ?? 'subject'}.`),
                    onFinish: () => setSavingSchedule(null),
                },
            );
        },
        [subjects, students, grid],
    );

    return (
        <DashboardLayout user={user} activeTab="enter-marks">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('Enter Marks')}</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            {t('Select an exam and class to start entering marks. Save subject-wise.')}
                        </p>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('Select Exam & Class')}</CardTitle>
                            <CardDescription>{t('Pick the exam and class to enter marks for.')}</CardDescription>
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
                                        <SelectTrigger id="exam-select-05">
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
                                        <SelectTrigger id="class-select-06">
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
                                    <p className="text-sm text-slate-500">
                                        {t('Choose an exam and a class to start entering marks.')}
                                    </p>
                                </div>
                            ) : students.length === 0 ? (
                                <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                                    {t('No active students found for the selected class and session.')}
                                </div>
                            ) : subjects.length === 0 ? (
                                <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                                    {t('No schedules found for this class and exam. Set up schedules first.')}
                                </div>
                            ) : (
                                <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
                                    <Table className="min-w-[1100px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="sticky left-0 z-20 w-[220px] bg-slate-50">
                                                    {t('Student')}
                                                </TableHead>
                                                {subjects.map((subject, subjectIndex) => (
                                                    <TableHead
                                                        key={subject.scheduleId}
                                                        className="min-w-[140px] border-l border-slate-200 bg-slate-50"
                                                    >
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-semibold">{subject.subject}</span>
                                                            <span className="text-xs text-slate-500">
                                                                {subject.examDate} · {subject.room}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                Max:{' '}
                                                                <strong className="font-semibold text-slate-700">
                                                                    {subject.maxMarks}
                                                                </strong>
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                className="mt-1 w-[110px] gap-1 text-xs"
                                                                disabled={savingSchedule === subject.scheduleId}
                                                                onClick={() => saveSubject(subjectIndex)}
                                                            >
                                                                <Save className="h-3 w-3" />
                                                                {savingSchedule === subject.scheduleId
                                                                    ? t('Saving...')
                                                                    : t('Save')}
                                                            </Button>
                                                        </div>
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {students.map((student, studentIndex) => (
                                                <TableRow key={student.id}>
                                                    <TableCell className="sticky left-0 z-10 border-r border-slate-200 bg-white">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-medium text-slate-800">
                                                                {student.name}
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                {student.rollNumber
                                                                    ? `${t('Roll')} ${student.rollNumber}`
                                                                    : '—'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    {subjects.map((subject, subjectIndex) => {
                                                        const cell = grid[studentIndex]?.[subjectIndex] ?? {
                                                            marks: '',
                                                            absent: false,
                                                        };
                                                        const maxMarks = Number(subject.maxMarks);
                                                        const marksNum = cell.absent ? 0 : Number(cell.marks);
                                                        const markStatus = cell.absent
                                                            ? 'Absent'
                                                            : Number.isFinite(marksNum) &&
                                                                marksNum >= Number(subject.passingMarks)
                                                              ? 'Pass'
                                                              : marksNum > 0 || cell.marks
                                                                ? 'Fail'
                                                                : '';

                                                        return (
                                                            <TableCell
                                                                key={subject.scheduleId}
                                                                className="min-w-[140px] border-l border-slate-200"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        max={maxMarks}
                                                                        className="h-9 w-[70px] rounded-md border border-slate-300 bg-slate-50 text-sm"
                                                                        placeholder={String(maxMarks)}
                                                                        value={cell.marks}
                                                                        disabled={cell.absent}
                                                                        onChange={(event) =>
                                                                            updateCell(studentIndex, subjectIndex, {
                                                                                marks: event.target.value,
                                                                            })
                                                                        }
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="h-5 w-5 rounded border border-red-300 bg-red-50 text-[10px] font-bold leading-none text-red-600 hover:bg-red-100"
                                                                        title={t('Mark absent')}
                                                                        onClick={() =>
                                                                            updateCell(studentIndex, subjectIndex, {
                                                                                absent: !cell.absent,
                                                                                marks: !cell.absent ? '' : cell.marks,
                                                                            })
                                                                        }
                                                                    >
                                                                        {cell.absent ? '✓' : 'A'}
                                                                    </button>
                                                                    {markStatus ? (
                                                                        <Badge
                                                                            className={`w-10 justify-center text-[10px] ${
                                                                                markStatus === 'Absent'
                                                                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                                                                    : markStatus === 'Pass'
                                                                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                                                                      : 'bg-red-100 text-red-700 hover:bg-red-100'
                                                                            }`}
                                                                        >
                                                                            {markStatus}
                                                                        </Badge>
                                                                    ) : null}
                                                                </div>
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
