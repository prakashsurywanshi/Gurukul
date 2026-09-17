import { FormEvent, useMemo, useState } from 'react';
import {
    Award,
    BookOpenCheck,
    CheckCircle2,
    ClipboardCheck,
    FileStack,
    Gauge,
    GraduationCap,
    Plus,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface Sheet {
    id: number;
    classId: number | null;
    classLabel: string | null;
    subject: string | null;
    sheetsCount: number;
    evaluatedCount: number;
}

interface Session {
    id: number;
    name: string;
    term: string;
    status: string;
    notes: string | null;
    classLabel: string | null;
    subject: string | null;
    sheetsCount: number;
    sheetsTotal: number;
    evaluated: number;
    evaluationCount: number;
    createdAt: string | null;
    sheets: Sheet[];
}

interface EvaluationRow {
    id: number;
    session: string | null;
    term: string | null;
    sheetId: number;
    subject: string | null;
    student: string;
    admissionNo: string | null;
    score: number | null;
    gradeLevel: string | null;
    feedback: string | null;
    status: string;
    evaluatedBy: string | null;
    evaluatedAt: string | null;
    moderatedBy: string | null;
    moderatedAt: string | null;
}

interface PendingModeration {
    id: number;
    session: string | null;
    term: string | null;
    subject: string | null;
    student: string;
    admissionNo: string | null;
    score: number | null;
    gradeLevel: string | null;
    feedback: string | null;
    evaluatedBy: string | null;
    evaluatedAt: string | null;
}

interface ClassOption {
    id: number;
    label: string;
}

interface StudentOption {
    id: number;
    name: string;
    admission_no: string;
    class_id: number | null;
}

interface OsmProps {
    user: any;
    tab: string;
    sessions: Session[];
    evaluations: EvaluationRow[];
    pendingModeration: PendingModeration[];
    classOptions: ClassOption[];
    students: StudentOption[];
    statusOptions: string[];
    summary: {
        sessions: number;
        sheets: number;
        evaluations: number;
        pendingModeration: number;
        averageScore: number;
        statusCounts: Record<string, number>;
        sheetsTotal: number;
        evaluatedTotal: number;
        studentsAssessed: number;
    };
}

type Tab = 'dashboard' | 'sessions' | 'evaluate' | 'reports' | 'guide' | 'moderation';

const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    uploading: 'Uploading',
    ready: 'Ready',
    evaluating: 'Evaluating',
    moderation: 'Moderation',
    completed: 'Completed',
    archived: 'Archived',
};

const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
    uploading: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    ready: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    evaluating: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    moderation: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    archived: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300',
};

export default function Osm(pageProps: OsmProps) {
    const { t } = useLanguage();
    const { user, tab, sessions, evaluations, pendingModeration, classOptions, students, statusOptions, summary } =
        pageProps;
    const [activeTab, setActiveTab] = useState<Tab>(tab as Tab);
    const [statusFilter, setStatusFilter] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [sessionForm, setSessionForm] = useState({ name: '', term: 'Term1', status: 'draft', notes: '' });
    const [sheetForm, setSheetForm] = useState({ osm_session_id: '', class_id: '', subject: '', sheets_count: '0' });
    const [evaluateSheetId, setEvaluateSheetId] = useState('');
    const [rowForms, setRowForms] = useState<Record<number, { score: string; feedback: string }>>({});
    const [expandedSheet, setExpandedSheet] = useState<{ sessionId: number; sheet: Sheet } | null>(null);

    const switchTab = (next: Tab) => {
        setActiveTab(next);
        router.get('/osm', { tab: next }, { preserveState: true, preserveScroll: true });
    };

    const statusFilterSelect = (value: string) => setStatusFilter(value === 'select-all-null' ? '' : value);
    const classFilterSelect = (value: string) => setClassFilter(value === 'select-all-null' ? '' : value);

    const filteredSessions = useMemo(() => {
        return sessions.filter((session) => {
            if (statusFilter && session.status !== statusFilter) return false;
            if (classFilter && !session.sheets.some((sheet) => sheet.classId === Number(classFilter))) return false;
            return true;
        });
    }, [sessions, statusFilter, classFilter]);

    const submitSession = (event: FormEvent) => {
        event.preventDefault();
        router.post('/osm/sessions', sessionForm, {
            preserveScroll: true,
            onSuccess: () => setSessionForm({ name: '', term: 'Term1', status: 'draft', notes: '' }),
        });
    };

    const submitSheet = (event: FormEvent) => {
        event.preventDefault();
        if (!sheetForm.osm_session_id) return;
        router.post(
            '/osm/sheets',
            {
                osm_session_id: Number(sheetForm.osm_session_id),
                class_id: sheetForm.class_id ? Number(sheetForm.class_id) : null,
                subject: sheetForm.subject,
                sheets_count: Number(sheetForm.sheets_count) || 0,
            },
            {
                preserveScroll: true,
                onSuccess: () => setSheetForm({ osm_session_id: '', class_id: '', subject: '', sheets_count: '0' }),
            },
        );
    };

    const openEvaluate = (sheet: Sheet, sessionId: number) => {
        setExpandedSheet({ sessionId, sheet });
        setEvaluateSheetId(String(sheet.id));
        const classId = sheet.classId;
        const initial: Record<number, { score: string; feedback: string }> = {};
        students
            .filter((student) => !classId || student.class_id === classId)
            .forEach((student) => {
                initial[student.id] = { score: '', feedback: '' };
            });
        setRowForms(initial);
    };

    const submitEvaluations = (event: FormEvent) => {
        event.preventDefault();
        if (!evaluateSheetId) return;
        const rows = Object.entries(rowForms)
            .filter(([, value]) => value.score !== '' || value.feedback !== '')
            .map(([studentId, value]) => ({
                student_id: Number(studentId),
                score: value.score === '' ? null : Number(value.score),
                feedback: value.feedback,
            }));
        if (rows.length === 0) return;
        router.post(
            '/osm/evaluate',
            { osm_sheet_id: Number(evaluateSheetId), rows },
            {
                preserveScroll: true,
                onSuccess: () => setExpandedSheet(null),
            },
        );
    };

    const moderate = (id: number, status: 'ok' | 'rejected') => {
        router.post(`/osm/moderation/${id}`, { status: String(status) }, { preserveScroll: true });
    };

    const maxStatus = Math.max(1, ...Object.values(summary.statusCounts ?? {}).map(Number));

    const tabBtns: { key: Tab; label: string; icon: typeof Gauge }[] = [
        { key: 'dashboard', label: 'Dashboard', icon: Gauge },
        { key: 'sessions', label: 'Sessions', icon: FileStack },
        { key: 'evaluate', label: 'Evaluate', icon: ClipboardCheck },
        { key: 'reports', label: 'Reports', icon: Award },
        { key: 'moderation', label: 'Moderation', icon: ShieldCheck },
        { key: 'guide', label: 'Guide', icon: BookOpenCheck },
    ];

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        <GraduationCap className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        OSM Assessment
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Objective Sheet Marking — sessions, evaluation sheets, moderation and reports.
                    </p>
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
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Sessions')}</p>
                                    <p className="text-2xl font-bold">{summary.sessions}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Sheets')}</p>
                                    <p className="text-2xl font-bold">
                                        {summary.evaluatedTotal} / {summary.sheetsTotal}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Evaluations')}</p>
                                    <p className="text-2xl font-bold">{summary.evaluations}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Pending Moderation')}</p>
                                    <p className="text-2xl font-bold text-purple-600">{summary.pendingModeration}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Avg Score')}</p>
                                    <p className="text-2xl font-bold">{summary.averageScore}</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Status Distribution')}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-3">
                                    {statusOptions.map((status) => {
                                        const count = summary.statusCounts?.[status] ?? 0;
                                        return (
                                            <div key={status}>
                                                <div className="mb-1 flex items-center justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-300">
                                                        {STATUS_LABELS[status] ?? status}
                                                    </span>
                                                    <span className="text-gray-400">{count}</span>
                                                </div>
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                    <div
                                                        className="h-full rounded-full bg-indigo-500"
                                                        style={{ width: `${(count / maxStatus) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {summary.studentsAssessed} students assessed across {summary.sessions} sessions.
                                        Averages recommended when sessions reach{' '}
                                        <Badge className="ml-1">{t('Moderation')}</Badge> stage.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Sessions ({filteredSessions.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex flex-wrap gap-3">
                                    <Select
                                        value={statusFilter || 'select-all-null'}
                                        onValueChange={statusFilterSelect}
                                    >
                                        <SelectTrigger className="w-44">
                                            <SelectValue placeholder={t('All statuses')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="select-all-null">{t('All statuses')}</SelectItem>
                                            {statusOptions.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {STATUS_LABELS[status] ?? status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={classFilter || 'select-all-null'} onValueChange={classFilterSelect}>
                                        <SelectTrigger className="w-44">
                                            <SelectValue placeholder={t('All classes')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="select-all-null">{t('All classes')}</SelectItem>
                                            {classOptions.map((option) => (
                                                <SelectItem key={option.id} value={String(option.id)}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Session')}</TableHead>
                                                <TableHead>Class · Subject</TableHead>
                                                <TableHead>{t('Sheets')}</TableHead>
                                                <TableHead>{t('Progress')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                                <TableHead>{t('Term')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSessions.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="py-10 text-center text-gray-400">
                                                        No sessions found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {filteredSessions.map((session) => (
                                                <TableRow key={session.id}>
                                                    <TableCell>
                                                        <p className="text-sm font-medium">{session.name}</p>
                                                        <p className="text-xs text-gray-400">
                                                            {session.createdAt ?? '—'}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {session.classLabel ?? '—'}{' '}
                                                        {session.subject ? `· ${session.subject}` : ''}
                                                    </TableCell>
                                                    <TableCell className="text-sm">{session.sheetsTotal}</TableCell>
                                                    <TableCell className="text-sm">
                                                        {session.evaluated} / {session.sheetsTotal}
                                                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                            <div
                                                                className="h-full rounded-full bg-emerald-500"
                                                                style={{
                                                                    width: `${session.sheetsTotal > 0 ? (session.evaluated / session.sheetsTotal) * 100 : 0}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={STATUS_STYLES[session.status] ?? ''}>
                                                            {STATUS_LABELS[session.status] ?? session.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{session.term}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {activeTab === 'sessions' && (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Create Session')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={submitSession}
                                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
                                >
                                    <Input
                                        placeholder="Session name *"
                                        required
                                        value={sessionForm.name}
                                        onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
                                    />
                                    <Input
                                        placeholder="Term (e.g. Term1)"
                                        value={sessionForm.term}
                                        onChange={(e) => setSessionForm({ ...sessionForm, term: e.target.value })}
                                    />
                                    <Select
                                        value={sessionForm.status}
                                        onValueChange={(value) => setSessionForm({ ...sessionForm, status: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {STATUS_LABELS[status] ?? status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder={t('Notes')}
                                        value={sessionForm.notes}
                                        onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                                    />
                                    <Button type="submit">
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Create')}</Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Add Class · Subject Sheet</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={submitSheet}
                                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
                                >
                                    <div className="space-y-1">
                                        <Label>Session *</Label>
                                        <Select
                                            value={sheetForm.osm_session_id}
                                            onValueChange={(value) =>
                                                setSheetForm({ ...sheetForm, osm_session_id: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select session')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sessions.map((session) => (
                                                    <SelectItem key={session.id} value={String(session.id)}>
                                                        {session.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>{t('Class')}</Label>
                                        <Select
                                            value={sheetForm.class_id}
                                            onValueChange={(value) => setSheetForm({ ...sheetForm, class_id: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Optional')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {classOptions.map((option) => (
                                                    <SelectItem key={option.id} value={String(option.id)}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>{t('Subject')}</Label>
                                        <Input
                                            value={sheetForm.subject}
                                            onChange={(e) => setSheetForm({ ...sheetForm, subject: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>{t('Sheets Count')}</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={sheetForm.sheets_count}
                                            onChange={(e) =>
                                                setSheetForm({ ...sheetForm, sheets_count: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="flex items-end lg:col-span-2">
                                        <Button type="submit">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Sheet
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {sessions.map((session) => (
                            <Card key={session.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">
                                            {session.name}{' '}
                                            <Badge className={STATUS_STYLES[session.status] ?? ''}>
                                                {STATUS_LABELS[session.status] ?? session.status}
                                            </Badge>
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={session.status}
                                                onValueChange={(value) =>
                                                    router.put(`/osm/sessions/${session.id}`, { status: value })
                                                }
                                            >
                                                <SelectTrigger className="w-40">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statusOptions.map((status) => (
                                                        <SelectItem key={status} value={status}>
                                                            {STATUS_LABELS[status] ?? status}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-rose-500 hover:text-rose-600"
                                                onClick={() => {
                                                    if (window.confirm(`Delete session "${session.name}"?`)) {
                                                        router.delete(`/osm/sessions/${session.id}`, {
                                                            preserveScroll: true,
                                                        });
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">{t('Delete')}</span>
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {t('Term')}{session.term} · {session.evaluated}/{session.sheetsTotal} evaluated
                                    </p>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Class')}</TableHead>
                                                <TableHead>{t('Subject')}</TableHead>
                                                <TableHead className="text-right">{t('Sheets')}</TableHead>
                                                <TableHead className="text-right">{t('Evaluated')}</TableHead>
                                                <TableHead className="text-right">{t('Progress')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {session.sheets.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="py-8 text-center text-gray-400">
                                                        No sheets yet for this session.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {session.sheets.map((sheet) => (
                                                <TableRow key={sheet.id}>
                                                    <TableCell className="text-sm">{sheet.classLabel ?? '—'}</TableCell>
                                                    <TableCell className="text-sm">{sheet.subject ?? '—'}</TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        {sheet.sheetsCount}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        {sheet.evaluatedCount}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        {sheet.sheetsCount > 0
                                                            ? Math.round(
                                                                  (sheet.evaluatedCount / sheet.sheetsCount) * 100,
                                                              )
                                                            : 0}
                                                        %
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ))}
                    </>
                )}

                {activeTab === 'evaluate' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Evaluate Sheets')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {sessions.length === 0 && (
                                <p className="py-8 text-center text-sm text-gray-400">{t('Create a session first.')}</p>
                            )}
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                                >
                                    <p className="mb-2 text-sm font-medium">
                                        {session.name}{' '}
                                        <Badge className={STATUS_STYLES[session.status] ?? ''}>
                                            {STATUS_LABELS[session.status] ?? session.status}
                                        </Badge>
                                    </p>
                                    {session.sheets.length === 0 ? (
                                        <p className="text-xs text-gray-400">{t('No sheets.')}</p>
                                    ) : (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {session.sheets.map((sheet) => (
                                                <div key={sheet.id} className="flex items-center justify-between py-2">
                                                    <div>
                                                        <p className="text-sm">
                                                            {sheet.classLabel ?? '—'}{' '}
                                                            {sheet.subject ? `· ${sheet.subject}` : ''}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {sheet.evaluatedCount}/{sheet.sheetsCount} evaluated
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openEvaluate(sheet, session.id)}
                                                    >
                                                        <ClipboardCheck className="mr-2 h-4 w-4" />
                                                        {t('Evaluate')}</Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {expandedSheet && expandedSheet.sessionId === session.id && (
                                        <form onSubmit={submitEvaluations} className="mt-3 space-y-3">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Student')}</TableHead>
                                                        <TableHead className="w-28">Score (0-25)</TableHead>
                                                        <TableHead>{t('Feedback')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {Object.entries(rowForms).map(([studentId, value]) => {
                                                        const student = students.find(
                                                            (s) => s.id === Number(studentId),
                                                        );
                                                        if (!student) return null;
                                                        return (
                                                            <TableRow key={studentId}>
                                                                <TableCell>
                                                                    <p className="text-sm font-medium">
                                                                        {student.name}
                                                                    </p>
                                                                    {student.admission_no && (
                                                                        <p className="text-xs text-gray-400">
                                                                            {student.admission_no}
                                                                        </p>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        max={25}
                                                                        step="0.25"
                                                                        value={value.score}
                                                                        onChange={(e) =>
                                                                            setRowForms((current) => ({
                                                                                ...current,
                                                                                [Number(studentId)]: {
                                                                                    ...current[Number(studentId)],
                                                                                    score: e.target.value,
                                                                                },
                                                                            }))
                                                                        }
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        value={value.feedback}
                                                                        onChange={(e) =>
                                                                            setRowForms((current) => ({
                                                                                ...current,
                                                                                [Number(studentId)]: {
                                                                                    ...current[Number(studentId)],
                                                                                    feedback: e.target.value,
                                                                                },
                                                                            }))
                                                                        }
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() => setExpandedSheet(null)}
                                                >
                                                    {t('Cancel')}</Button>
                                                <Button type="submit">
                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    Submit Evaluations
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'reports' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('OSM Reports')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Sessions')}</p>
                                        <p className="text-2xl font-bold">{summary.sessions}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Sheets')}</p>
                                        <p className="text-2xl font-bold">{summary.sheets}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Evaluations')}</p>
                                        <p className="text-2xl font-bold">{summary.evaluations}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Avg Score')}</p>
                                        <p className="text-2xl font-bold">{summary.averageScore}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div>
                                <p className="mb-2 text-sm font-medium">{t('Session Progress')}</p>
                                {sessions.map((session) => (
                                    <div key={session.id} className="mb-2">
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-300">
                                                {session.name} ({session.term})
                                            </span>
                                            <span className="text-gray-400">
                                                {session.evaluated}/{session.sheetsTotal} · {session.evaluationCount}{' '}
                                                evaluations
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div
                                                className="h-full rounded-full bg-indigo-500"
                                                style={{
                                                    width: `${session.sheetsTotal > 0 ? (session.evaluated / session.sheetsTotal) * 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Student')}</TableHead>
                                            <TableHead>{t('Session')}</TableHead>
                                            <TableHead>{t('Subject')}</TableHead>
                                            <TableHead className="text-right">{t('Score')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead>{t('Assessed')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {evaluations.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-10 text-center text-gray-400">
                                                    {t('No evaluations recorded yet.')}</TableCell>
                                            </TableRow>
                                        )}
                                        {evaluations.map((evaluation) => (
                                            <TableRow key={evaluation.id}>
                                                <TableCell>
                                                    <p className="text-sm font-medium">{evaluation.student}</p>
                                                    {evaluation.admissionNo && (
                                                        <p className="text-xs text-gray-400">
                                                            {evaluation.admissionNo}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">{evaluation.session ?? '—'}</TableCell>
                                                <TableCell className="text-sm">{evaluation.subject ?? '—'}</TableCell>
                                                <TableCell className="text-right text-sm font-medium">
                                                    {evaluation.score ?? '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            evaluation.status === 'ok'
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                                : evaluation.status === 'rejected'
                                                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                                                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                                        }
                                                    >
                                                        {evaluation.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500">
                                                    {evaluation.evaluatedBy ?? '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'moderation' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Pending Moderation ({pendingModeration.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Student')}</TableHead>
                                        <TableHead>{t('Session')}</TableHead>
                                        <TableHead>{t('Subject')}</TableHead>
                                        <TableHead className="text-right">{t('Score')}</TableHead>
                                        <TableHead>{t('Evaluated By')}</TableHead>
                                        <TableHead className="text-right">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingModeration.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-10 text-center text-gray-400">
                                                Nothing pending moderation.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {pendingModeration.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <p className="text-sm font-medium">{item.student}</p>
                                                {item.admissionNo && (
                                                    <p className="text-xs text-gray-400">{item.admissionNo}</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">{item.session ?? '—'}</TableCell>
                                            <TableCell className="text-sm">{item.subject ?? '—'}</TableCell>
                                            <TableCell className="text-right text-sm font-medium">
                                                {item.score ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {item.evaluatedBy ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button size="sm" onClick={() => moderate(item.id, 'ok')}>
                                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                                        {t('Approve')}</Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-rose-500 hover:text-rose-600"
                                                        onClick={() => moderate(item.id, 'rejected')}
                                                    >
                                                        {t('Reject')}</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'guide' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('OSM Guide')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex gap-3">
                                <Badge className="h-6 w-6 rounded-full">1</Badge>
                                <p>
                                    <strong>{t('Create a session')}</strong> for a term (e.g. Term1). Give it a meaningful name
                                    such as <em>OSM — English (Class I)</em>.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Badge className="h-6 w-6 rounded-full">2</Badge>
                                <p>
                                    <strong>Add class · subject sheets</strong> to a session. Each sheet tracks how many
                                    answer sheets exist (<em>{t('Sheets')}</em>) and how many have been evaluated (
                                    <em>{t('Evaluated')}</em>).
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Badge className="h-6 w-6 rounded-full">3</Badge>
                                <p>
                                    <strong>{t('Evaluate')}</strong> students of a sheet's class with a score (0-25) and
                                    optional feedback. Once a session has evaluations it moves to{' '}
                                    <Badge>{t('Evaluating')}</Badge> automatically.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Badge className="h-6 w-6 rounded-full">4</Badge>
                                <p>
                                    <strong>{t('Moderation')}</strong> — a moderator reviews pending evaluations and approves
                                    or rejects them.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Badge className="h-6 w-6 rounded-full">5</Badge>
                                <p>
                                    When marking finishes, move the session status to <Badge>{t('Completed')}</Badge> or{' '}
                                    <Badge>{t('Archived')}</Badge> from the Sessions tab. Track completion via the Dashboard
                                    and Reports tabs.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
