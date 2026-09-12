import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { BookOpen, Plus, Save, Trash2, UserCog } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface ClassOption {
    id: number;
    name: string;
    section: string;
}

interface UnassignedSubject {
    id: number;
    name: string;
    code: string;
}

interface TeacherOption {
    id: number;
    name: string;
}

interface SubjectRow {
    subjectId: number;
    name: string;
    code: string;
    type: string;
    teacherId: number | null;
    teacherName?: string | null;
}

export default function AssignSubjects({
    user,
    classes,
    selectedClassId,
    unassignedSubjects,
    teachers,
    rows,
}: {
    user: any;
    classes: ClassOption[];
    selectedClassId: number | null;
    unassignedSubjects: UnassignedSubject[];
    teachers: TeacherOption[];
    rows: SubjectRow[];
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [classId, setClassId] = useState<string>(selectedClassId ? String(selectedClassId) : '');
    const [teacherIds, setTeacherIds] = useState<Record<number, number | ''>>(() =>
        Object.fromEntries(rows.map((row) => [row.subjectId, row.teacherId ?? ''])),
    );
    const [pending, setPending] = useState<UnassignedSubject[]>([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setTeacherIds(Object.fromEntries(rows.map((row) => [row.subjectId, row.teacherId ?? ''])));
        setPending([]);
    }, [rows, classId]);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const applyFilter = (value: string) => {
        setClassId(value);
        router.get(`/assign-subjects${value ? `?class=${value}` : ''}`, {}, { preserveState: false });
    };

    const addSubject = (subjectId: number) => {
        const subject = unassignedSubjects.find((item) => item.id === subjectId);

        if (!subject) {
            return;
        }

        setPending((current) => {
            if (current.some((item) => item.id === subject.id)) {
                return current;
            }
            return [...current, subject];
        });
    };

    const removeRow = (subjectId: number) => {
        setTeacherIds((current) => {
            const next = { ...current };
            delete next[subjectId];
            return next;
        });
        setPending((current) => current.filter((item) => item.id !== subjectId));
    };

    const save = () => {
        if (!classId) {
            toast.error('Select a class first.');
            return;
        }

        const bodyRows = [
            ...rows,
            ...pending.map((s) => ({
                subjectId: s.id,
                name: s.name,
                code: s.code,
                type: 'theory' as const,
                teacherId: null as number | null,
            })),
        ].map((row) => ({
            subject_id: row.subjectId,
            teacher_id: teacherIds[row.subjectId] ? Number(teacherIds[row.subjectId]) : null,
        }));

        if (bodyRows.length === 0) {
            toast.error('Assign at least one subject.');
            return;
        }

        setProcessing(true);
        router.post(
            '/assign-subjects',
            { class_id: classId, rows: bodyRows },
            {
                preserveScroll: true,
                onError: () => toast.error('Failed to save subject assignments.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="assign-subjects">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Assign Subjects')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Assign subjects to a class and set the teacher for each subject.')}
                            </p>
                        </div>
                        <Button onClick={save} disabled={processing || !classId} className="gap-2">
                            <Save className="h-4 w-4" />
                            {processing ? t('Saving...') : t('Save')}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('Select Class')}</CardTitle>
                            <CardDescription>{t('Choose a class to assign its subjects.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-w-md">
                                <Select value={classId} onValueChange={applyFilter}>
                                    <SelectTrigger id="class-select-09">
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
                            {!classId ? (
                                <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                                    <BookOpen className="h-8 w-8 text-slate-400" />
                                    <p className="text-sm text-slate-500">
                                        {t('Select a class to start assigning subjects.')}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="mt-6 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <span className="text-sm font-medium text-slate-700">{t('Add subjects')}:</span>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {unassignedSubjects.map((subject) => (
                                                <Button
                                                    key={subject.id}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5"
                                                    onClick={() => addSubject(subject.id)}
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    {subject.name}
                                                    {subject.code ? ` (${subject.code})` : ''}
                                                </Button>
                                            ))}
                                            {unassignedSubjects.length === 0 && pending.length === 0 ? (
                                                <span className="text-sm text-slate-500">
                                                    {t('All subjects are already assigned to this class.')}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>{t('Subject')}</TableHead>
                                                    <TableHead>{t('Code')}</TableHead>
                                                    <TableHead>{t('Teacher')}</TableHead>
                                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rows.length === 0 && pending.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={5}
                                                            className="h-24 text-center text-slate-500"
                                                        >
                                                            {t('No subjects assigned to this class yet.')}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    [
                                                        ...rows,
                                                        ...pending.map((s) => ({
                                                            subjectId: s.id,
                                                            name: s.name,
                                                            code: s.code,
                                                            type: 'theory' as const,
                                                            teacherId: null as number | null,
                                                        })),
                                                    ].map((row, index) => (
                                                        <TableRow key={row.subjectId}>
                                                            <TableCell className="text-sm text-slate-500">
                                                                {index + 1}
                                                            </TableCell>
                                                            <TableCell className="font-medium text-slate-800">
                                                                {row.name}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-slate-500">
                                                                {row.code || <span className="text-slate-400">-</span>}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <UserCog className="h-4 w-4 shrink-0 text-slate-400" />
                                                                    <Select
                                                                        value={
                                                                            teacherIds[row.subjectId] !== undefined
                                                                                ? String(teacherIds[row.subjectId])
                                                                                : row.teacherId
                                                                                  ? String(row.teacherId)
                                                                                  : ''
                                                                        }
                                                                        onValueChange={(value) =>
                                                                            setTeacherIds((current) => ({
                                                                                ...current,
                                                                                [row.subjectId]: value as number | '',
                                                                            }))
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="w-52">
                                                                            <SelectValue
                                                                                placeholder={t('No teacher')}
                                                                            />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="">
                                                                                {t('No teacher')}
                                                                            </SelectItem>
                                                                            {teachers.map((teacher) => (
                                                                                <SelectItem
                                                                                    key={teacher.id}
                                                                                    value={String(teacher.id)}
                                                                                >
                                                                                    {teacher.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex justify-end">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-red-600 hover:bg-red-50"
                                                                        onClick={() => removeRow(row.subjectId)}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                        {t('Remove')}
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {pending.length > 0 ? (
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                                                {pending.length} {t('new')} {t('pending')}
                                            </span>
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
