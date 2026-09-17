import { FormEvent, useMemo, useState } from 'react';
import {
    Award,
    BarChart3,
    BookOpenCheck,
    CheckCircle2,
    ClipboardList,
    Gauge,
    ListChecks,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    Users,
} from 'lucide-react';
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

interface AssessmentRow {
    id: number;
    name: string;
    class: string | null;
    class_id: number | null;
    subject: string | null;
    subject_id: number | null;
    term: string | null;
    assessment_type: string;
    weightage: string;
    total_marks: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
    description: string | null;
}

interface AssessmentProps {
    user: any;
    tab: string;
    classes: ClassOption[];
    subjects: SubjectOption[];
    assessments: AssessmentRow[];
    filters: { search: string; status: string };
    stats: { active: number; completed: number; totalWeightage: number };
}

const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300',
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    completed: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
};

const TYPE_LABELS: Record<string, string> = {
    continuous: 'Continuous',
    term: 'Term',
};

const emptyForm = {
    name: '',
    class_id: '',
    subject_id: '',
    term: '',
    assessment_type: 'continuous',
    weightage: '',
    total_marks: '',
    start_date: '',
    end_date: '',
    status: 'active',
    description: '',
};

type Tab = 'dashboard' | 'assessments' | 'analytics' | 'student-report' | 'rank-list' | 'guide';

export default function Assessment(pageProps: AssessmentProps) {
    const { t } = useLanguage();
    const { user, tab, classes, subjects, assessments, filters, stats } = pageProps;
    const [activeTab, setActiveTab] = useState<Tab>(tab as Tab);
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<AssessmentRow | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [reportClass, setReportClass] = useState('');
    const [reportSubject, setReportSubject] = useState('');
    const [reportStatus, setReportStatus] = useState('');

    const switchTab = (next: Tab) => {
        setActiveTab(next);
        router.get('/assessment', { tab: next }, { preserveState: true, preserveScroll: true });
    };

    const applyFilters = () => {
        router.get(
            '/assessment',
            { tab: activeTab, search: search || undefined, status: status || undefined },
            { preserveState: true, preserveScroll: true },
        );
    };

    const openCreate = () => {
        setForm(emptyForm);
        setCreating(true);
        setEditing(null);
    };

    const openEdit = (assessment: AssessmentRow) => {
        setForm({
            name: assessment.name,
            class_id: assessment.class_id ? String(assessment.class_id) : '',
            subject_id: assessment.subject_id ? String(assessment.subject_id) : '',
            term: assessment.term ?? '',
            assessment_type: assessment.assessment_type,
            weightage: assessment.weightage,
            total_marks: assessment.total_marks,
            start_date: assessment.start_date ?? '',
            end_date: assessment.end_date ?? '',
            status: assessment.status,
            description: assessment.description ?? '',
        });
        setEditing(assessment);
        setCreating(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);

        const payload = {
            ...form,
            class_id: form.class_id ? Number(form.class_id) : null,
            subject_id: form.subject_id ? Number(form.subject_id) : null,
            weightage: parseFloat(form.weightage) || 0,
            total_marks: parseFloat(form.total_marks) || 0,
        };

        if (editing) {
            router.patch(`/assessment/${editing.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setCreating(false);
                    setEditing(null);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            });
        } else {
            router.post('/assessment', payload, {
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

    const confirmDelete = (assessment: AssessmentRow) => {
        if (!window.confirm(`Delete assessment "${assessment.name}"?`)) {
            return;
        }

        router.delete(`/assessment/${assessment.id}`, {
            preserveScroll: true,
            onSuccess: () => setCreating(false),
        });
    };

    const analytics = useMemo(() => {
        const byType: Record<string, { count: number; weightage: number; marks: number }> = {};
        const byTerm: Record<string, { count: number; weightage: number }> = {};
        const byStatus: Record<string, number> = {};
        let totalMarks = 0;

        for (const assessment of assessments) {
            byType[assessment.assessment_type] = byType[assessment.assessment_type] ?? {
                count: 0,
                weightage: 0,
                marks: 0,
            };
            byType[assessment.assessment_type].count += 1;
            byType[assessment.assessment_type].weightage += parseFloat(assessment.weightage) || 0;
            byType[assessment.assessment_type].marks += parseFloat(assessment.total_marks) || 0;

            const term = assessment.term ?? 'Unassigned';
            byTerm[term] = byTerm[term] ?? { count: 0, weightage: 0 };
            byTerm[term].count += 1;
            byTerm[term].weightage += parseFloat(assessment.weightage) || 0;

            byStatus[assessment.status] = (byStatus[assessment.status] ?? 0) + 1;
            totalMarks += parseFloat(assessment.total_marks) || 0;
        }

        const termTotal = Object.values(byTerm).reduce((acc, current) => acc + current.weightage, 0) || 1;

        return { byType, byTerm, byStatus, totalMarks, termTotal };
    }, [assessments]);

    const reportRows = useMemo(() => {
        return assessments.filter((assessment) => {
            if (reportClass && String(assessment.class_id) !== reportClass) return false;
            if (reportSubject && String(assessment.subject_id) !== reportSubject) return false;
            if (reportStatus && assessment.status !== reportStatus) return false;
            return true;
        });
    }, [assessments, reportClass, reportSubject, reportStatus]);

    const ranked = useMemo(() => {
        return [...assessments].sort((a, b) => (parseFloat(b.weightage) || 0) - (parseFloat(a.weightage) || 0));
    }, [assessments]);

    const maxTypeWeightage = Math.max(1, ...Object.values(analytics.byType).map((entry) => entry.weightage));

    const tabBtns: { key: Tab; label: string; icon: typeof Gauge }[] = [
        { key: 'dashboard', label: 'Dashboard', icon: Gauge },
        { key: 'assessments', label: 'Assessments', icon: ListChecks },
        { key: 'analytics', label: 'Analytics', icon: BarChart3 },
        { key: 'student-report', label: 'Student Report', icon: Users },
        { key: 'rank-list', label: 'Rank List', icon: Award },
        { key: 'guide', label: 'Guide', icon: BookOpenCheck },
    ];

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            <ListChecks className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            {t('Assessment')}</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Plan continuous and term-based assessments with weightage.')}</p>
                    </div>
                    {activeTab === 'assessments' && (
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('New Assessment')}
                        </Button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {tabBtns.map((tabItem) => {
                        const Icon = tabItem.icon;
                        return (
                            <Button
                                key={tabItem.key}
                                variant={activeTab === tabItem.key ? 'default' : 'outline'}
                                onClick={() => switchTab(tabItem.key)}
                            >
                                <Icon className="mr-2 h-4 w-4" />
                                {tabItem.label}
                            </Button>
                        );
                    })}
                </div>

                {activeTab === 'dashboard' && (
                    <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                            <Card>
                                <CardContent className="flex items-center gap-3 p-4">
                                    <ClipboardList className="h-8 w-8 text-indigo-500" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Assessments')}</p>
                                        <p className="text-lg font-semibold">{assessments.length}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="flex items-center gap-3 p-4">
                                    <ListChecks className="h-8 w-8 text-emerald-500" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Active')}</p>
                                        <p className="text-lg font-semibold">{stats.active}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="flex items-center gap-3 p-4">
                                    <CheckCircle2 className="h-8 w-8 text-sky-500" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Completed')}</p>
                                        <p className="text-lg font-semibold">{stats.completed}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="flex items-center gap-3 p-4">
                                    <Gauge className="h-8 w-8 text-amber-500" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Active Weightage')}</p>
                                        <p className="text-lg font-semibold">{stats.totalWeightage}%</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Recent Assessments')}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Title')}</TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>Class · Subject</TableHead>
                                            <TableHead className="text-right">{t('Weightage')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assessments.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-10 text-center text-gray-400">{t('No assessments found. Create one from the Assessments tab.')}</TableCell>
                                            </TableRow>
                                        )}
                                        {assessments.slice(0, 8).map((assessment) => (
                                            <TableRow key={assessment.id}>
                                                <TableCell className="text-sm font-medium">{assessment.name}</TableCell>
                                                <TableCell>
                                                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300">
                                                        {TYPE_LABELS[assessment.assessment_type] ??
                                                            assessment.assessment_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {assessment.class ?? 'All classes'}
                                                    {assessment.subject ? ` · ${assessment.subject}` : ''}
                                                </TableCell>
                                                <TableCell className="text-right text-sm">
                                                    {assessment.weightage}%
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={STATUS_STYLES[assessment.status] ?? ''}>
                                                        {assessment.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </>
                )}

                {activeTab === 'assessments' && (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Assessments (')}{assessments.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    <div className="relative lg:col-span-2">
                                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <Input
                                            className="pl-9"
                                            placeholder={t('Search assessment…')}
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    applyFilters();
                                                }
                                            }}
                                        />
                                    </div>
                                    <Select
                                        value={status || 'select-all-null'}
                                        onValueChange={(value) => setStatus(value === 'select-all-null' ? '' : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All statuses')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="select-all-null">{t('All statuses')}</SelectItem>
                                            <SelectItem value="draft">{t('Draft')}</SelectItem>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
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
                                                '/assessment',
                                                { tab: 'assessments' },
                                                { preserveState: true, preserveScroll: true },
                                            );
                                        }}
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        {t('Reset')}</Button>
                                    <Button onClick={applyFilters}>
                                        <Search className="mr-2 h-4 w-4" />
                                        {t('Apply')}</Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>{t('Class')}</TableHead>
                                            <TableHead>{t('Subject')}</TableHead>
                                            <TableHead className="text-right">{t('Weightage')}</TableHead>
                                            <TableHead className="text-right">{t('Marks')}</TableHead>
                                            <TableHead>{t('Period')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assessments.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={9} className="py-10 text-center text-gray-400">{t('No assessments found.')}</TableCell>
                                            </TableRow>
                                        )}
                                        {assessments.map((assessment) => (
                                            <TableRow key={assessment.id}>
                                                <TableCell className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {assessment.name}
                                                    {assessment.term && (
                                                        <p className="text-xs text-gray-400">{assessment.term}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm capitalize">
                                                    {assessment.assessment_type}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {assessment.class ?? 'All classes'}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {assessment.subject ?? 'All subjects'}
                                                </TableCell>
                                                <TableCell className="text-right text-sm">
                                                    {assessment.weightage}%
                                                </TableCell>
                                                <TableCell className="text-right text-sm">
                                                    {assessment.total_marks}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {assessment.start_date ?? '—'}{' '}
                                                    {assessment.end_date ? `→ ${assessment.end_date}` : ''}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={STATUS_STYLES[assessment.status] ?? ''}>
                                                        {assessment.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEdit(assessment)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                            <span className="sr-only">{t('Edit')}</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-rose-500 hover:text-rose-600"
                                                            onClick={() => confirmDelete(assessment)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="sr-only">{t('Delete')}</span>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </>
                )}

                {activeTab === 'analytics' && (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('By Assessment Type')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {Object.keys(analytics.byType).length === 0 && (
                                    <p className="py-8 text-center text-sm text-gray-400">{t('No assessment data yet.')}</p>
                                )}
                                {Object.entries(analytics.byType).map(([type, entry]) => (
                                    <div key={type}>
                                        <div className="mb-1 flex items-center justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-300">
                                                {TYPE_LABELS[type] ?? type}
                                                <span className="ml-2 text-xs text-gray-400">
                                                    {entry.count} assessment{entry.count === 1 ? '' : 's'} ·{' '}
                                                    {entry.marks} marks
                                                </span>
                                            </span>
                                            <span className="text-gray-400">{entry.weightage}% wt</span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div
                                                className="h-full rounded-full bg-indigo-500"
                                                style={{ width: `${(entry.weightage / maxTypeWeightage) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Weightage by Term')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {Object.keys(analytics.byTerm).length === 0 && (
                                    <p className="py-8 text-center text-sm text-gray-400">{t('No assessment data yet.')}</p>
                                )}
                                {Object.entries(analytics.byTerm)
                                    .sort((a, b) => b[1].weightage - a[1].weightage)
                                    .map(([term, entry]) => (
                                        <div key={term}>
                                            <div className="mb-1 flex items-center justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-300">
                                                    {term}
                                                    <span className="ml-2 text-xs text-gray-400">
                                                        {entry.count} assessments
                                                    </span>
                                                </span>
                                                <span className="text-gray-400">
                                                    {Math.round((entry.weightage / analytics.termTotal) * 100)}%
                                                </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                <div
                                                    className="h-full rounded-full bg-emerald-500"
                                                    style={{
                                                        width: `${(entry.weightage / analytics.termTotal) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Status Breakdown')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-3">
                                    {Object.entries(analytics.byStatus).map(([statusKey, count]) => (
                                        <Card key={statusKey}>
                                            <CardContent className="p-4 text-center">
                                                <p className="text-2xl font-bold">{count}</p>
                                                <p className="text-xs capitalize text-gray-500 dark:text-gray-400">
                                                    {statusKey}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'student-report' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Student Report — Applicable Assessments</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <Select
                                    value={reportClass}
                                    onValueChange={(value) => setReportClass(value === 'select-all-null' ? '' : value)}
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
                                <Select
                                    value={reportSubject}
                                    onValueChange={(value) =>
                                        setReportSubject(value === 'select-all-null' ? '' : value)
                                    }
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
                                <Select
                                    value={reportStatus}
                                    onValueChange={(value) => setReportStatus(value === 'select-all-null' ? '' : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All statuses')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="select-all-null">{t('All statuses')}</SelectItem>
                                        <SelectItem value="draft">{t('Draft')}</SelectItem>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="completed">{t('Completed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Assessment')}</TableHead>
                                        <TableHead>{t('Term')}</TableHead>
                                        <TableHead>{t('Type')}</TableHead>
                                        <TableHead className="text-right">{t('Weightage')}</TableHead>
                                        <TableHead className="text-right">{t('Marks')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportRows.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-10 text-center text-gray-400">{t('No assessments match these filters.')}</TableCell>
                                        </TableRow>
                                    )}
                                    {reportRows.map((assessment) => (
                                        <TableRow key={assessment.id}>
                                            <TableCell className="text-sm font-medium">{assessment.name}</TableCell>
                                            <TableCell className="text-sm">{assessment.term ?? '—'}</TableCell>
                                            <TableCell className="text-sm capitalize">
                                                {assessment.assessment_type}
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                {assessment.weightage}%
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                {assessment.total_marks}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={STATUS_STYLES[assessment.status] ?? ''}>
                                                    {assessment.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'rank-list' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Assessment Standings (by weightage)')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">{t('Rank')}</TableHead>
                                        <TableHead>{t('Assessment')}</TableHead>
                                        <TableHead>Class · Subject</TableHead>
                                        <TableHead className="text-right">{t('Weightage')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ranked.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-10 text-center text-gray-400">{t('No assessments to rank yet.')}</TableCell>
                                        </TableRow>
                                    )}
                                    {ranked.map((assessment, index) => (
                                        <TableRow key={assessment.id}>
                                            <TableCell>
                                                <span
                                                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                                                        index === 0
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                                            : index === 1
                                                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300'
                                                              : index === 2
                                                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
                                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400'
                                                    }`}
                                                >
                                                    {index + 1}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm font-medium">{assessment.name}</p>
                                                <p className="text-xs text-gray-400">{assessment.term ?? '—'}</p>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {assessment.class ?? 'All classes'}
                                                {assessment.subject ? ` · ${assessment.subject}` : ''}
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-medium">
                                                {assessment.weightage}%
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={STATUS_STYLES[assessment.status] ?? ''}>
                                                    {assessment.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <p className="p-4 text-xs text-gray-400">
                                Student score rankings are published after exam marks are entered. This standings view
                                ranks assessment plans by weightage to guide prioritisation.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'guide' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Assessment Guide')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex gap-3">
                                <Badge className="h-6 w-6 rounded-full">1</Badge>
                                <p>
                                    <strong>{t('Create plans')}</strong> under the Assessments tab — choose continuous or term
                                    type, assign a class/subject, weightage (%) and total marks.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Badge className="h-6 w-6 rounded-full">2</Badge>
                                <p>
                                    <strong>{t('Weightage')}</strong> controls how much each assessment contributes to the
                                    final score. The Analytics tab shows how weight is distributed across types and
                                    terms.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Badge className="h-6 w-6 rounded-full">3</Badge>
                                <p>
                                    <strong>{t('Status')}</strong> — draft while preparing, active once students sit the
                                    assessment, completed when marking finishes and results are finalised.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Badge className="h-6 w-6 rounded-full">4</Badge>
                                <p>
                                    <strong>{t('Student Report')}</strong> filters which assessments apply to a class/subject
                                    so parents and students see exactly what counts towards the term.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Badge className="h-6 w-6 rounded-full">5</Badge>
                                <p>
                                    <strong>{t('Marks & ranks')}</strong> are entered via the Exam Marks entry module; once
                                    published, rankings and analytics surface here automatically.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

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
                            <DialogTitle>{editing ? t('Edit Assessment') : t('New Assessment')}</DialogTitle>
                            <DialogDescription>{t('Define an assessment plan, weightage and timeline.')}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <Label>Assessment Name *</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                                <Label>Type *</Label>
                                <Select
                                    value={form.assessment_type}
                                    onValueChange={(value) => setForm({ ...form, assessment_type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="continuous">{t('Continuous')}</SelectItem>
                                        <SelectItem value="term">{t('Term')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Term')}</Label>
                                <Input
                                    value={form.term}
                                    onChange={(e) => setForm({ ...form, term: e.target.value })}
                                    placeholder={t('e.g. Term 1')}
                                />
                            </div>
                            <div>
                                <Label>Weightage (%)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={form.weightage}
                                    onChange={(e) => setForm({ ...form, weightage: e.target.value })}
                                />
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
                                <Label>{t('Start Date')}</Label>
                                <Input
                                    type="date"
                                    value={form.start_date}
                                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>{t('End Date')}</Label>
                                <Input
                                    type="date"
                                    value={form.end_date}
                                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Status *</Label>
                                <Select
                                    value={form.status}
                                    onValueChange={(value) => setForm({ ...form, status: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">{t('Draft')}</SelectItem>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="completed">{t('Completed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="sm:col-span-2">
                                <Label>{t('Description')}</Label>
                                <Textarea
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                                    {t('Cancel')}</Button>
                                <Button type="submit" disabled={saving}>
                                    {editing ? t('Save Changes') : t('Create Assessment')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
