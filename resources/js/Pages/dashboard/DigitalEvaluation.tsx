import { FormEvent, useState } from 'react';
import { CheckCircle2, ClipboardList, Pencil, Plus, RefreshCw, ScanText, Search, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface ClassOption {
    id: number;
    name: string;
}

interface SubjectOption {
    id: number;
    name: string;
}

interface EvaluationRow {
    id: number;
    title: string;
    class: string | null;
    subject: string | null;
    total_marks: string;
    total_scripts: number;
    evaluated_scripts: number;
    status: string;
    due_date: string | null;
    evaluator_name: string | null;
    notes: string | null;
}

interface DigitalEvaluationProps {
    user: any;
    classes: ClassOption[];
    subjects: SubjectOption[];
    evaluations: EvaluationRow[];
    filters: { search: string; status: string };
    stats: { pending: number; inProgress: number; completed: number };
}

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    in_progress: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
};

const emptyForm = {
    title: '',
    class_id: '',
    subject_id: '',
    total_marks: '',
    total_scripts: '',
    status: 'pending',
    due_date: '',
    evaluator_name: '',
    notes: '',
};

export default function DigitalEvaluation(pageProps: DigitalEvaluationProps) {
    const { t } = useLanguage();
    const { user, classes, subjects, evaluations, filters, stats } = pageProps;
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<EvaluationRow | null>(null);
    const [progressFor, setProgressFor] = useState<EvaluationRow | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [progressValue, setProgressValue] = useState(0);
    const [progressStatus, setProgressStatus] = useState('pending');

    const applyFilters = () => {
        router.get(
            '/digital-evaluation',
            { search: search || undefined, status: status || undefined },
            { preserveState: true, preserveScroll: true },
        );
    };

    const openCreate = () => {
        setForm(emptyForm);
        setCreating(true);
        setEditing(null);
    };

    const openEdit = (evaluation: EvaluationRow) => {
        setForm({
            title: evaluation.title,
            class_id: evaluation.class ? (classes.find((c) => c.name === evaluation.class)?.id.toString() ?? '') : '',
            subject_id: evaluation.subject
                ? (subjects.find((s) => s.name === evaluation.subject)?.id.toString() ?? '')
                : '',
            total_marks: evaluation.total_marks,
            total_scripts: String(evaluation.total_scripts),
            status: evaluation.status,
            due_date: evaluation.due_date ?? '',
            evaluator_name: evaluation.evaluator_name ?? '',
            notes: evaluation.notes ?? '',
        });
        setEditing(evaluation);
        setCreating(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);

        const payload = {
            ...form,
            class_id: form.class_id ? Number(form.class_id) : null,
            subject_id: form.subject_id ? Number(form.subject_id) : null,
            total_marks: parseFloat(form.total_marks) || 0,
            total_scripts: parseInt(form.total_scripts, 10) || 0,
        };

        if (editing) {
            router.patch(`/digital-evaluation/${editing.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setCreating(false);
                    setEditing(null);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            });
        } else {
            router.post('/digital-evaluation', payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setCreating(false);
                    setEditing(null);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            });
        }
    };

    const submitProgress = (event: FormEvent) => {
        event.preventDefault();
        if (!progressFor) {
            return;
        }
        setSaving(true);
        router.patch(
            `/digital-evaluation/${progressFor.id}/progress`,
            {
                evaluated_scripts: progressValue,
                status: progressStatus,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setProgressFor(null);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            },
        );
    };

    const openProgress = (evaluation: EvaluationRow) => {
        setProgressFor(evaluation);
        setProgressValue(evaluation.evaluated_scripts);
        setProgressStatus(evaluation.status);
    };

    const confirmDelete = (evaluation: EvaluationRow) => {
        if (!window.confirm(`Delete evaluation "${evaluation.title}"?`)) {
            return;
        }
        router.delete(`/digital-evaluation/${evaluation.id}`, { preserveScroll: true });
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            <ScanText className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            {t('Digital Evaluation')}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {t('Online subjective answer script marking and moderation.')}
                        </p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('New Evaluation')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <ClipboardList className="h-8 w-8 text-amber-500" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Pending')}</p>
                                <p className="text-lg font-semibold">{stats.pending}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <ScanText className="h-8 w-8 text-sky-500" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('In Progress')}</p>
                                <p className="text-lg font-semibold">{stats.inProgress}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Completed')}</p>
                                <p className="text-lg font-semibold">{stats.completed}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            {t('Evaluations (')}
                            {evaluations.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="relative lg:col-span-2">
                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    className="pl-9"
                                    placeholder={t('Search evaluation…')}
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            applyFilters();
                                        }
                                    }}
                                />
                            </div>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('All statuses')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="select-all-null">{t('All statuses')}</SelectItem>
                                    <SelectItem value="pending">{t('Pending')}</SelectItem>
                                    <SelectItem value="in_progress">{t('In Progress')}</SelectItem>
                                    <SelectItem value="completed">{t('Completed')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-end">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setSearch('');
                                    setStatus('');
                                    router.get(
                                        '/digital-evaluation',
                                        {},
                                        { preserveState: true, preserveScroll: true },
                                    );
                                }}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {t('Reset')}
                            </Button>
                            <Button onClick={applyFilters}>
                                <Search className="mr-2 h-4 w-4" />
                                {t('Apply')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Title')}</TableHead>
                                    <TableHead>{t('Class')}</TableHead>
                                    <TableHead>{t('Subject')}</TableHead>
                                    <TableHead className="text-right">{t('Marks')}</TableHead>
                                    <TableHead>{t('Scripts')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead>{t('Due Date')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evaluations.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-10 text-center text-gray-400">
                                            {t('No evaluations found.')}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {evaluations.map((evaluation) => {
                                    const { t } = useLanguage();
                                    const percent =
                                        evaluation.total_scripts > 0
                                            ? Math.round(
                                                  (evaluation.evaluated_scripts / evaluation.total_scripts) * 100,
                                              )
                                            : 0;
                                    return (
                                        <TableRow key={evaluation.id}>
                                            <TableCell className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {evaluation.title}
                                                {evaluation.evaluator_name && (
                                                    <p className="text-xs text-gray-400">
                                                        {t('by')}
                                                        {evaluation.evaluator_name}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">{evaluation.class ?? '—'}</TableCell>
                                            <TableCell className="text-sm">{evaluation.subject ?? '—'}</TableCell>
                                            <TableCell className="text-right text-sm">
                                                {evaluation.total_marks}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="w-32">
                                                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                                                        <span>
                                                            {evaluation.evaluated_scripts}/{evaluation.total_scripts}
                                                        </span>
                                                        <span>{percent}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                        <div
                                                            className="h-full rounded-full bg-indigo-500"
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={STATUS_STYLES[evaluation.status] ?? ''}>
                                                    {STATUS_LABELS[evaluation.status] ?? evaluation.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{evaluation.due_date ?? '—'}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openProgress(evaluation)}
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        <span className="sr-only">{t('Progress')}</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEdit(evaluation)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                        <span className="sr-only">{t('Edit')}</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-rose-500 hover:text-rose-600"
                                                        onClick={() => confirmDelete(evaluation)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">{t('Delete')}</span>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog
                    open={creating}
                    onOpenChange={(open) => {
                        if (!open) {
                            setCreating(false);
                            setEditing(null);
                        }
                    }}
                >
                    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editing ? t('Edit Evaluation') : t('New Evaluation')}</DialogTitle>
                            <DialogDescription>{t('Set up an online subjective evaluation batch.')}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <Label>{t('Title *')}</Label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label>{t('Class')}</Label>
                                <Select
                                    value={form.class_id}
                                    onValueChange={(value) => setForm({ ...form, class_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All classes')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="select-all-null">{t('All classes')}</SelectItem>
                                        {classes.map((classItem) => (
                                            <SelectItem key={classItem.id} value={String(classItem.id)}>
                                                {classItem.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Subject')}</Label>
                                <Select
                                    value={form.subject_id}
                                    onValueChange={(value) => setForm({ ...form, subject_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All subjects')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="select-all-null">{t('All subjects')}</SelectItem>
                                        {subjects.map((subject) => (
                                            <SelectItem key={subject.id} value={String(subject.id)}>
                                                {subject.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Total Marks')}</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.total_marks}
                                    onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>{t('Total Scripts')}</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.total_scripts}
                                    onChange={(e) => setForm({ ...form, total_scripts: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>{t('Status *')}</Label>
                                <Select
                                    value={form.status}
                                    onValueChange={(value) => setForm({ ...form, status: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">{t('Pending')}</SelectItem>
                                        <SelectItem value="in_progress">{t('In Progress')}</SelectItem>
                                        <SelectItem value="completed">{t('Completed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Due Date')}</Label>
                                <Input
                                    type="date"
                                    value={form.due_date}
                                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>{t('Evaluator')}</Label>
                                <Input
                                    value={form.evaluator_name}
                                    onChange={(e) => setForm({ ...form, evaluator_name: e.target.value })}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label>{t('Notes')}</Label>
                                <Textarea
                                    rows={3}
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 sm:col-span-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setCreating(false);
                                        setEditing(null);
                                    }}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {editing ? t('Save Changes') : t('Create Evaluation')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={progressFor !== null} onOpenChange={(open) => !open && setProgressFor(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('Update Progress')}</DialogTitle>
                            <DialogDescription>{progressFor?.title}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitProgress} className="grid grid-cols-1 gap-4">
                            <div>
                                <Label>{t('Scripts Evaluated')}</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max={progressFor?.total_scripts ?? 0}
                                    value={progressValue}
                                    onChange={(event) => setProgressValue(parseInt(event.target.value, 10) || 0)}
                                />
                            </div>
                            <div>
                                <Label>{t('Status *')}</Label>
                                <Select value={progressStatus} onValueChange={setProgressStatus}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">{t('Pending')}</SelectItem>
                                        <SelectItem value="in_progress">{t('In Progress')}</SelectItem>
                                        <SelectItem value="completed">{t('Completed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setProgressFor(null)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {t('Save Progress')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
