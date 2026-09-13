import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Info, Save } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface ClassOption {
    id: number;
    name: string;
    section: string;
}

interface ExamOption {
    id: number;
    name: string;
}

interface SubjectOption {
    id: number;
    name: string;
}

interface StudentRow {
    id: string;
    name: string;
    admissionNo: string;
    rollNumber: string;
    classTeacherRemark: string;
    principalRemark: string;
    subjectRemark: string;
    isCurrent: boolean;
}

interface RemarkCell {
    classTeacher: string;
    principal: string;
    subject: string;
}

export default function EnterReportCardRemarks({
    user,
    classes,
    exams,
    subjects,
    selectedClassId,
    selectedExamId,
    selectedSubjectId,
    includePromoted,
    search,
    students,
}: {
    user: any;
    classes: ClassOption[];
    exams: ExamOption[];
    subjects: SubjectOption[];
    selectedClassId: number | null;
    selectedExamId: number | null;
    selectedSubjectId: number | null;
    includePromoted: boolean;
    search: string;
    students: StudentRow[];
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [classId, setClassId] = useState<string>(selectedClassId ? String(selectedClassId) : '');
    const [examId, setExamId] = useState<string>(selectedExamId ? String(selectedExamId) : '');
    const [subjectId, setSubjectId] = useState<string>(selectedSubjectId ? String(selectedSubjectId) : '');
    const [promoted, setPromoted] = useState<boolean>(includePromoted);
    const [query, setQuery] = useState<string>(search);
    const [saving, setSaving] = useState(false);

    const initialRows = useMemo(
        () =>
            students.map((student) => ({
                classTeacher: student.classTeacherRemark,
                principal: student.principalRemark,
                subject: student.subjectRemark,
            })),
        [students],
    );

    const [rows, setRows] = useState<RemarkCell[]>(initialRows);

    useEffect(() => {
        setRows(
            students.map((student) => ({
                classTeacher: student.classTeacherRemark,
                principal: student.principalRemark,
                subject: student.subjectRemark,
            })),
        );
    }, [students]);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const applyFilter = (
        nextClassId: string,
        nextExamId: string,
        nextSubjectId: string,
        nextPromoted: boolean,
        nextQuery: string,
    ) => {
        const params = new URLSearchParams();

        if (nextClassId) {
            params.set('class', nextClassId);
        }

        if (nextExamId) {
            params.set('exam', nextExamId);
        }

        if (nextSubjectId) {
            params.set('subject', nextSubjectId);
        }

        if (nextPromoted) {
            params.set('promoted', '1');
        }

        if (nextQuery.trim()) {
            params.set('q', nextQuery.trim());
        }

        router.get(
            `/marksheet-remarks${params.toString() ? `?${params.toString()}` : ''}`,
            {},
            { preserveState: false },
        );
    };

    const updateRemark = (studentIndex: number, patch: Partial<RemarkCell>) => {
        setRows((current) => current.map((row, rowIndex) => (rowIndex === studentIndex ? { ...row, ...patch } : row)));
    };

    const saveAll = () => {
        if (!classId) {
            toast.error(t('Select a class first.'));
            return;
        }

        setSaving(true);
        router.post(
            '/marksheet-remarks',
            {
                class_id: Number(classId),
                exam_id: examId ? Number(examId) : null,
                subject_id: subjectId ? Number(subjectId) : null,
                promoted: promoted,
                students: students.map((student, studentIndex) => ({
                    student_id: student.id,
                    class_teacher_remark: rows[studentIndex]?.classTeacher ?? '',
                    principal_remark: rows[studentIndex]?.principal ?? '',
                    subject_remark: rows[studentIndex]?.subject ?? '',
                })),
            },
            {
                preserveScroll: true,
                onError: () => toast.error(t('Failed to save remarks.')),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="marksheet-remarks">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('Teacher Remarks')}</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            {t('Personalized qualitative feedback printed at the bottom of report cards.')}
                        </p>
                    </div>

                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm text-blue-900">
                                <Info className="h-4 w-4" />
                                {t('How Remarks Work')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs text-blue-900/80">
                            <p>
                                <strong>{t('Class Teacher')}:</strong>{' '}
                                {t('Daily behavioral and academic observations.')}
                            </p>
                            <p>
                                <strong>{t('Principal')}:</strong> {t('High-level, official school endorsements.')}
                            </p>
                            <p>
                                {t(
                                    'Select a specific Term to print remarks only on that term report card, or leave it blank to apply at the session level (year-end report cards).',
                                )}
                            </p>
                            <p>{t('Leave a row blank to skip the remarks section for that student.')}</p>
                            <p>{t('Select a subject above to also enter subject-wise remarks per student.')}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('Select Class & Term')}</CardTitle>
                            <CardDescription>{t('Pick a class to load the student grid.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid items-end gap-4 md:grid-cols-5">
                                <div className="space-y-2">
                                    <span className="text-sm font-medium leading-none">{t('Class')}</span>
                                    <Select
                                        value={classId}
                                        onValueChange={(value) => {
                                            setClassId(value);
                                            applyFilter(value, examId, subjectId, promoted, query);
                                        }}
                                    >
                                        <SelectTrigger id="remark-class-select">
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
                                <div className="space-y-2">
                                    <span className="text-sm font-medium leading-none">{t('Term (Exam)')}</span>
                                    <Select
                                        value={examId}
                                        onValueChange={(value) => {
                                            setExamId(value);
                                            applyFilter(classId, value, subjectId, promoted, query);
                                        }}
                                    >
                                        <SelectTrigger id="remark-exam-select">
                                            <SelectValue placeholder={t('Session Level (Final / All Terms)')} />
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
                                    <span className="text-sm font-medium leading-none">{t('Subject')}</span>
                                    <Select
                                        value={subjectId}
                                        onValueChange={(value) => {
                                            setSubjectId(value);
                                            applyFilter(classId, examId, value, promoted, query);
                                        }}
                                    >
                                        <SelectTrigger id="remark-subject-select">
                                            <SelectValue placeholder={t('General (Report Card)')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjects.map((subject) => (
                                                <SelectItem key={subject.id} value={String(subject.id)}>
                                                    {subject.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2 pb-1">
                                    <Checkbox
                                        id="include-promoted"
                                        checked={promoted}
                                        onCheckedChange={(checked) => {
                                            const next = checked === true;
                                            setPromoted(next);
                                            applyFilter(classId, examId, subjectId, next, query);
                                        }}
                                    />
                                    <label
                                        htmlFor="include-promoted"
                                        className="text-sm font-medium leading-none text-slate-700"
                                    >
                                        {t('Full register (incl. promoted)')}
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-sm font-medium leading-none">{t('Search')}</span>
                                    <Input
                                        value={query}
                                        placeholder={t('Search students...')}
                                        onChange={(event) => setQuery(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                applyFilter(classId, examId, subjectId, promoted, query);
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {!classId ? (
                                <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                                    <p className="text-sm text-slate-500">
                                        {t('Choose a class to load the remarks grid.')}
                                    </p>
                                </div>
                            ) : students.length === 0 ? (
                                <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                                    {t('No students found for the selected class and session.')}
                                </div>
                            ) : (
                                <div className="mt-6 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-xs text-slate-500">
                                            {students.length} {t('students')}
                                        </span>
                                        <Button onClick={saveAll} disabled={saving} className="gap-2">
                                            <Save className="h-4 w-4" />
                                            {saving ? t('Saving...') : t('Save Remarks')}
                                        </Button>
                                    </div>
                                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                                        <Table className="min-w-[720px]">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-16">{t('Roll')}</TableHead>
                                                    <TableHead className="min-w-[220px]">{t('Student')}</TableHead>
                                                    <TableHead className="min-w-[280px]">
                                                        {t('Class Teacher Remark')}
                                                    </TableHead>
                                                    {subjectId ? (
                                                        <TableHead className="min-w-[280px]">
                                                            {t('Subject Remark')}
                                                        </TableHead>
                                                    ) : null}
                                                    <TableHead className="min-w-[280px]">
                                                        {t('Principal Remark')}
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {students.map((student, studentIndex) => (
                                                    <TableRow key={student.id}>
                                                        <TableCell className="align-top font-medium text-slate-700">
                                                            {student.rollNumber || '-'}
                                                        </TableCell>
                                                        <TableCell className="align-top">
                                                            <div className="font-medium text-slate-900">
                                                                {student.name}
                                                            </div>
                                                            <div className="mt-0.5 flex items-center gap-2">
                                                                <span className="text-xs text-slate-500">
                                                                    {student.admissionNo}
                                                                </span>
                                                                {!student.isCurrent ? (
                                                                    <Badge variant="secondary" className="text-[10px]">
                                                                        {t('Promoted')}
                                                                    </Badge>
                                                                ) : null}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="align-top">
                                                            <Input
                                                                value={rows[studentIndex]?.classTeacher ?? ''}
                                                                placeholder={t('Class teacher remark...')}
                                                                onChange={(event) =>
                                                                    updateRemark(studentIndex, {
                                                                        classTeacher: event.target.value,
                                                                    })
                                                                }
                                                            />
                                                        </TableCell>
                                                        {subjectId ? (
                                                            <TableCell className="align-top">
                                                                <Input
                                                                    value={rows[studentIndex]?.subject ?? ''}
                                                                    placeholder={t('Subject remark...')}
                                                                    onChange={(event) =>
                                                                        updateRemark(studentIndex, {
                                                                            subject: event.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </TableCell>
                                                        ) : null}
                                                        <TableCell className="align-top">
                                                            <Input
                                                                value={rows[studentIndex]?.principal ?? ''}
                                                                placeholder={t('Principal remark...')}
                                                                onChange={(event) =>
                                                                    updateRemark(studentIndex, {
                                                                        principal: event.target.value,
                                                                    })
                                                                }
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
