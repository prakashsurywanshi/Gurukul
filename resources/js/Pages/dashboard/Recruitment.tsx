import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { Briefcase, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface Position {
    id: string;
    title: string;
    department: string;
    position_type: string;
    vacancies: number;
    description: string | null;
    requirements: string | null;
    salary_range: string | null;
    qualifications: string | null;
    status: string;
    application_deadline: string | null;
    created_by: string | null;
    created_at?: string | null;
}

interface Metrics {
    open: number;
    vacancies: number;
    total: number;
}

interface RecruitmentProps {
    user: any;
    positions: Position[];
    metrics: Metrics;
}

const TYPES = ['full-time', 'part-time', 'contract', 'internship'];
const STATUSES = ['open', 'closed', 'draft'];

function typeLabel(type: string): string {
    const map: Record<string, string> = {
        'full-time': 'Full Time',
        'part-time': 'Part Time',
        contract: 'Contract',
        internship: 'Internship',
    };
    return map[type] ?? type;
}

export default function Recruitment(pageProps: RecruitmentProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;
    const user = pageProps.user;
    const positions = pageProps.positions ?? [];
    const metrics = pageProps.metrics ?? { open: 0, vacancies: 0, total: 0 };

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Position | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: '',
        department: '',
        position_type: 'full-time',
        vacancies: '1',
        salary_range: '',
        qualifications: '',
        description: '',
        requirements: '',
        status: 'open',
        application_deadline: '',
    });

    const openCreate = () => {
        setEditing(null);
        setForm({
            title: '',
            department: '',
            position_type: 'full-time',
            vacancies: '1',
            salary_range: '',
            qualifications: '',
            description: '',
            requirements: '',
            status: 'open',
            application_deadline: '',
        });
        setShowModal(true);
    };

    const openEdit = (position: Position) => {
        setEditing(position);
        setForm({
            title: position.title,
            department: position.department,
            position_type: position.position_type,
            vacancies: String(position.vacancies),
            salary_range: position.salary_range ?? '',
            qualifications: position.qualifications ?? '',
            description: position.description ?? '',
            requirements: position.requirements ?? '',
            status: position.status,
            application_deadline: position.application_deadline ?? '',
        });
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const data = {
            ...form,
            vacancies: form.vacancies ? Number(form.vacancies) : undefined,
            application_deadline: form.application_deadline || undefined,
        };
        router[editing ? 'patch' : 'post'](editing ? `/recruitment/${editing.id}` : '/recruitment', data, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false),
            onFinish: () => setSaving(false),
        });
    };

    const toggleStatus = (position: Position, status: string) => {
        router.patch(`/recruitment/${position.id}/status`, { status }, { preserveScroll: true });
    };

    const remove = (position: Position) => {
        if (!window.confirm(t('Delete this position?'))) return;
        setDeletingId(position.id);
        router.delete(`/recruitment/${position.id}`, { preserveScroll: true, onFinish: () => setDeletingId(null) });
    };

    const statusColor: Record<string, string> = {
        open: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        closed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        draft: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Recruitment & Hiring')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Manage job openings and hiring pipelines.')}
                        </p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('Add Position')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{metrics.open}</div>
                            <div className="text-sm text-gray-500">{t('Open Positions')}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {metrics.vacancies}
                            </div>
                            <div className="text-sm text-gray-500">{t('Total Vacancies')}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-3xl font-bold text-gray-700 dark:text-gray-200">{metrics.total}</div>
                            <div className="text-sm text-gray-500">{t('All Positions')}</div>
                        </CardContent>
                    </Card>
                </div>

                {positions.length === 0 ? (
                    <Card>
                        <CardContent>
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                <Briefcase className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                {t('No positions created yet.')}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {positions.map((position) => (
                            <Card key={position.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex flex-wrap items-start gap-2">
                                        <div className="min-w-0">
                                            <CardTitle className="text-base">{position.title}</CardTitle>
                                            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                {position.department} · {typeLabel(position.position_type)} ·{' '}
                                                {position.vacancies}{' '}
                                                {position.vacancies === 1 ? t('Vacancy') : t('Vacancies')}
                                            </div>
                                        </div>
                                        <div className="ml-auto flex gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() => openEdit(position)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-red-500"
                                                onClick={() => remove(position)}
                                                disabled={deletingId === position.id}
                                            >
                                                {deletingId === position.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex flex-wrap gap-2">
                                        <Badge className={statusColor[position.status]}>
                                            {t(position.status.charAt(0).toUpperCase() + position.status.slice(1))}
                                        </Badge>
                                        {position.salary_range && (
                                            <Badge variant="outline">{position.salary_range}</Badge>
                                        )}
                                        {position.application_deadline && (
                                            <Badge variant="outline">Deadline: {position.application_deadline}</Badge>
                                        )}
                                    </div>
                                    {position.description && (
                                        <p className="text-gray-600 dark:text-gray-300">{position.description}</p>
                                    )}
                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                                        <div className="mb-1 font-semibold text-gray-700 dark:text-gray-200">
                                            {t('Requirements')}
                                        </div>
                                        <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                                            {position.requirements || t('Not specified')}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between border-t pt-2 dark:border-gray-800">
                                        <span className="text-xs text-gray-400">
                                            {position.created_by ? `${t('Posted by')} ${position.created_by}` : ''}
                                        </span>
                                        <div className="flex gap-2">
                                            {position.status !== 'open' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-green-600"
                                                    onClick={() => toggleStatus(position, 'open')}
                                                >
                                                    {t('Open')}
                                                </Button>
                                            )}
                                            {position.status !== 'closed' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-red-600"
                                                    onClick={() => toggleStatus(position, 'closed')}
                                                >
                                                    {t('Close')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editing ? t('Edit Position') : t('Add Position')}
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
                            <div>
                                <Label>{t('Position Title')} *</Label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                                {errors.title && <div className="mt-1 text-xs text-red-500">{errors.title}</div>}
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Department')} *</Label>
                                    <Input
                                        value={form.department}
                                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>{t('Position Type')} *</Label>
                                    <Select
                                        value={form.position_type}
                                        onValueChange={(v) => setForm({ ...form, position_type: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {typeLabel(type)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <Label>{t('Vacancies')}</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={form.vacancies}
                                        onChange={(e) => setForm({ ...form, vacancies: e.target.value })}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label>{t('Salary Range')}</Label>
                                    <Input
                                        placeholder={t('e.g. ₹30,000 - ₹40,000')}
                                        value={form.salary_range}
                                        onChange={(e) => setForm({ ...form, salary_range: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('Qualifications')}</Label>
                                <Input
                                    value={form.qualifications}
                                    onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>{t('Description')}</Label>
                                <Textarea
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>{t('Requirements')}</Label>
                                <Textarea
                                    rows={3}
                                    value={form.requirements}
                                    onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Status')}</Label>
                                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUSES.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {t(status.charAt(0).toUpperCase() + status.slice(1))}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Application Deadline')}</Label>
                                    <Input
                                        type="date"
                                        value={form.application_deadline}
                                        onChange={(e) => setForm({ ...form, application_deadline: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editing ? t('Save Changes') : t('Add Position')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
