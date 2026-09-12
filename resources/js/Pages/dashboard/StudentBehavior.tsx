import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { AlertTriangle, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';

interface BehaviorRecord {
    id: string;
    title: string;
    description?: string | null;
    incident_date: string;
    status: string;
    action_taken?: string | null;
    student?: {
        id: string;
        name: string;
        class?: string | null;
        section?: string | null;
    } | null;
    created_by?: string | null;
}

interface ClassGroup {
    label: string;
    students: Array<{ id: string; name: string }>;
}

interface StudentBehaviorProps {
    user: any;
    organization?: any;
    records: BehaviorRecord[];
    classGroups: ClassGroup[];
    selectedStudentId?: string | null;
    selectedStatus?: string | null;
}

const STATUS_STYLE: Record<string, string> = {
    open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

const STATUS_LABELS: Record<string, string> = {
    open: 'Open',
    reviewed: 'Reviewed',
    resolved: 'Resolved',
};

export default function StudentBehavior(pageProps: StudentBehaviorProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const records = pageProps.records ?? [];
    const classGroups = pageProps.classGroups ?? [];

    const canManage = ['admin', 'super_admin', 'teacher'].includes(user?.role);

    const [studentId, setStudentId] = useState<string>(pageProps.selectedStudentId ?? 'all');
    const [status, setStatus] = useState<string>(pageProps.selectedStatus ?? 'all');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<BehaviorRecord | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        student_id: '',
        title: '',
        description: '',
        incident_date: new Date().toISOString().slice(0, 10),
        status: 'open',
        action_taken: '',
    });

    const filter = (s = studentId, st = status) => {
        setStudentId(s);
        setStatus(st);
        router.visit('/student-behavior', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            only: ['records', 'selectedStudentId', 'selectedStatus'],
            data: {
                student_id: s !== 'all' ? s : undefined,
                status: st !== 'all' ? st : undefined,
            },
        });
    };

    const openCreate = () => {
        setEditing(null);
        setForm({
            student_id: studentId !== 'all' ? studentId : '',
            title: '',
            description: '',
            incident_date: new Date().toISOString().slice(0, 10),
            status: 'open',
            action_taken: '',
        });
        setShowModal(true);
    };

    const openEdit = (record: BehaviorRecord) => {
        setEditing(record);
        setForm({
            student_id: record.student?.id ?? '',
            title: record.title,
            description: record.description ?? '',
            incident_date: record.incident_date,
            status: record.status,
            action_taken: record.action_taken ?? '',
        });
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        if (editing) {
            router.patch(`/student-behavior/${editing.id}`, form, {
                preserveScroll: true,
                onSuccess: () => setShowModal(false),
                onFinish: () => setSaving(false),
            });
        } else {
            router.post('/student-behavior', form, {
                preserveScroll: true,
                onSuccess: () => setShowModal(false),
                onFinish: () => setSaving(false),
            });
        }
    };

    const remove = (record: BehaviorRecord) => {
        if (!window.confirm(t('Delete this behavior record?'))) return;
        setDeletingId(record.id);
        router.delete(`/student-behavior/${record.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Behavior Records')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Record and track student behavior records and the actions taken.')}
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Add Record')}
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                        <CardTitle>{t('Behavior Records')}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={studentId} onValueChange={(v) => filter(v, status)}>
                                <SelectTrigger className="w-60">
                                    <SelectValue placeholder={t('All Students')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Students')}</SelectItem>
                                    {classGroups.map((group) => (
                                        <div key={group.label}>
                                            <p className="px-2 py-1 text-xs font-semibold text-gray-400">
                                                {group.label}
                                            </p>
                                            {group.students.map((student) => (
                                                <SelectItem key={student.id} value={student.id}>
                                                    {student.name}
                                                </SelectItem>
                                            ))}
                                        </div>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={status} onValueChange={(v) => filter(studentId, v)}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder={t('All Statuses')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                    <SelectItem value="open">{t('Open')}</SelectItem>
                                    <SelectItem value="reviewed">{t('Reviewed')}</SelectItem>
                                    <SelectItem value="resolved">{t('Resolved')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {records.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                                {t('No behavior records found.')}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Student')}</TableHead>
                                        <TableHead>{t('Record')}</TableHead>
                                        <TableHead>{t('Date')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead>{t('Recorded By')}</TableHead>
                                        {canManage && <TableHead className="text-right">{t('Actions')}</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {record.student?.name ?? '—'}
                                                </p>
                                                {record.student?.class && (
                                                    <p className="text-xs text-gray-500">
                                                        {record.student.class}
                                                        {record.student.section ? ` ${record.student.section}` : ''}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {record.title}
                                                </p>
                                                {record.description && (
                                                    <p className="line-clamp-2 max-w-xs text-xs text-gray-500">
                                                        {record.description}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm">
                                                {record.incident_date}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={STATUS_STYLE[record.status] ?? ''}>
                                                    {t(STATUS_LABELS[record.status] ?? record.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {record.created_by ?? '—'}
                                            </TableCell>
                                            {canManage && (
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => openEdit(record)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => remove(record)}
                                                            disabled={deletingId === record.id}
                                                        >
                                                            {deletingId === record.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4 text-red-500" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editing ? `${t('Edit')} ${t('Behavior Record')}` : t('Add Behavior Record')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submit} className="space-y-4">
                            {editing ? (
                                <div>
                                    <Label>{t('Student')}</Label>
                                    <Input value={form.student_id} disabled className="bg-gray-50" />
                                </div>
                            ) : (
                                <div>
                                    <Label>{t('Student')} *</Label>
                                    <Select
                                        value={form.student_id}
                                        onValueChange={(v) => setForm({ ...form, student_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select student')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classGroups.map((group) => (
                                                <div key={group.label}>
                                                    <p className="px-2 py-1 text-xs font-semibold text-gray-400">
                                                        {group.label}
                                                    </p>
                                                    {group.students.map((student) => (
                                                        <SelectItem key={student.id} value={student.id}>
                                                            {student.name}
                                                        </SelectItem>
                                                    ))}
                                                </div>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.student_id && (
                                        <p className="mt-1 text-xs text-red-500">{errors.student_id}</p>
                                    )}
                                </div>
                            )}
                            <div>
                                <Label>{t('Behavior Title')}</Label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder={t('e.g. Helping a classmate with assignments')}
                                    required
                                />
                                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Date')}</Label>
                                    <Input
                                        type="date"
                                        value={form.incident_date}
                                        onChange={(e) => setForm({ ...form, incident_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>{t('Status')}</Label>
                                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="open">{t('Open')}</SelectItem>
                                            <SelectItem value="reviewed">{t('Reviewed')}</SelectItem>
                                            <SelectItem value="resolved">{t('Resolved')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>{t('Description')}</Label>
                                <Textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={3}
                                    placeholder={t('e.g. What was observed and any context.')}
                                />
                            </div>
                            <div>
                                <Label>{t('Action Taken')}</Label>
                                <Textarea
                                    value={form.action_taken}
                                    onChange={(e) => setForm({ ...form, action_taken: e.target.value })}
                                    rows={2}
                                    placeholder={t('e.g. Positive reinforcement discussed with class teacher.')}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editing ? t('Save Changes') : t('Save Record')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
