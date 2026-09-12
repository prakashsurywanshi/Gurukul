import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { BookOpen, Plus, Save, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
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

interface ElectiveRow {
    subjectId: number;
    name: string;
    code: string;
    type: string;
    isElective: boolean;
}

export default function AssignElectives({
    user,
    classes,
    selectedClassId,
    unassignedSubjects,
    rows,
}: {
    user: any;
    classes: ClassOption[];
    selectedClassId: number | null;
    unassignedSubjects: UnassignedSubject[];
    rows: ElectiveRow[];
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [classId, setClassId] = useState<string>(selectedClassId ? String(selectedClassId) : '');
    const [electives, setElectives] = useState<Record<number, boolean>>(() =>
        Object.fromEntries(rows.map((row) => [row.subjectId, row.isElective])),
    );
    const [pending, setPending] = useState<UnassignedSubject[]>([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setElectives(Object.fromEntries(rows.map((row) => [row.subjectId, row.isElective])));
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
        router.get(`/assign-electives${value ? `?class=${value}` : ''}`, {}, { preserveState: false });
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

    const removePending = (subjectId: number) => {
        setPending((current) => current.filter((item) => item.id !== subjectId));
    };

    const removeRow = (subjectId: number) => {
        setElectives((current) => {
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
                isElective: false,
            })),
        ].map((row) => ({
            subject_id: row.subjectId,
            is_elective: electives[row.subjectId] ?? false,
        }));

        if (bodyRows.length === 0) {
            toast.error('Assign at least one subject.');
            return;
        }

        setProcessing(true);
        router.post(
            '/assign-electives',
            { class_id: classId, rows: bodyRows },
            {
                preserveScroll: true,
                onError: () => toast.error('Failed to save elective subjects.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="assign-electives">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Assign Elective Subjects')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t(
                                    'Mark which subjects of a class are electives, and add optional subjects to a class.',
                                )}
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
                            <CardDescription>{t('Choose a class to assign its elective subjects.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-w-md">
                                <Select value={classId} onValueChange={applyFilter}>
                                    <SelectTrigger id="class-select-08">
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
                                        {t('Select a class to start assigning elective subjects.')}
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
                                                    {t('All subjects are already added to this class.')}
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
                                                    <TableHead>{t('Type')}</TableHead>
                                                    <TableHead>{t('Is Elective')}</TableHead>
                                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rows.length === 0 && pending.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={6}
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
                                                            isElective: false,
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
                                                            <TableCell className="capitalize text-sm text-slate-500">
                                                                {row.type ?? 'theory'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setElectives((current) => ({
                                                                            ...current,
                                                                            [row.subjectId]: !(
                                                                                current[row.subjectId] ?? false
                                                                            ),
                                                                        }))
                                                                    }
                                                                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                                                                        (electives[row.subjectId] ?? false)
                                                                            ? 'bg-blue-600'
                                                                            : 'bg-slate-300'
                                                                    }`}
                                                                    role="switch"
                                                                    aria-checked={electives[row.subjectId] ?? false}
                                                                >
                                                                    <span
                                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                                                            (electives[row.subjectId] ?? false)
                                                                                ? 'translate-x-6'
                                                                                : 'translate-x-1'
                                                                        }`}
                                                                    />
                                                                </button>
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
                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                                {pending.length} {t('new')} {t('pending')}
                                            </Badge>
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
