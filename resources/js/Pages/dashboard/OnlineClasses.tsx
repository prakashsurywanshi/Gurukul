import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { Calendar, ExternalLink, Loader2, Pencil, Play, Plus, Trash2, Video, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface OnlineClass {
    id: string;
    title: string;
    class?: string | null;
    subject?: string | null;
    provider: string;
    meeting_url?: string | null;
    meeting_id?: string | null;
    passcode?: string | null;
    starts_at: string;
    ends_at?: string | null;
    status: string;
    notes?: string | null;
    created_by?: string | null;
}

interface OptionItem {
    id: string;
    label: string;
}

interface OnlineClassesProps {
    user: any;
    organization?: any;
    onlineClasses: OnlineClass[];
    classes: OptionItem[];
    subjects: OptionItem[];
    selectedStatus?: string | null;
    selectedClassId?: string | null;
}

const STATUS_STYLE: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    live: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    completed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const PROVIDER_LABEL: Record<string, string> = {
    zoom: 'Zoom',
    google_meet: 'Google Meet',
    microsoft_teams: 'Microsoft Teams',
    custom: 'Custom',
};

export default function OnlineClasses(pageProps: OnlineClassesProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const onlineClasses = pageProps.onlineClasses ?? [];
    const classes = pageProps.classes ?? [];
    const subjects = pageProps.subjects ?? [];

    const [selectedStatus, setSelectedStatus] = useState(pageProps.selectedStatus ?? '');
    const [selectedClassId, setSelectedClassId] = useState(pageProps.selectedClassId ?? '');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<OnlineClass | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: '',
        class_id: '',
        subject_id: '',
        provider: 'google_meet',
        meeting_url: '',
        meeting_id: '',
        passcode: '',
        starts_at: '',
        ends_at: '',
        notes: '',
        status: 'scheduled',
    });

    const canManage = ['admin', 'super_admin', 'teacher'].includes(user?.role);

    const filter = (data: Record<string, string>) => {
        const next = { status: selectedStatus, class_id: selectedClassId, ...data };
        if ('status' in data) setSelectedStatus(data.status);
        if ('class_id' in data) setSelectedClassId(data.class_id);
        router.visit('/online-classes', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: next,
            only: ['onlineClasses'],
        });
    };

    const openCreate = () => {
        setEditing(null);
        setForm({
            title: '',
            class_id: '',
            subject_id: '',
            provider: 'google_meet',
            meeting_url: '',
            meeting_id: '',
            passcode: '',
            starts_at: '',
            ends_at: '',
            notes: '',
            status: 'scheduled',
        });
        setShowModal(true);
    };

    const openEdit = (onlineClass: OnlineClass) => {
        setEditing(onlineClass);
        setForm({
            title: onlineClass.title,
            class_id: '',
            subject_id: '',
            provider: onlineClass.provider,
            meeting_url: onlineClass.meeting_url ?? '',
            meeting_id: onlineClass.meeting_id ?? '',
            passcode: onlineClass.passcode ?? '',
            starts_at: toLocalInput(onlineClass.starts_at),
            ends_at: onlineClass.ends_at ? toLocalInput(onlineClass.ends_at) : '',
            notes: onlineClass.notes ?? '',
            status: onlineClass.status,
        });
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const data: Record<string, string> = {
            title: form.title,
            provider: form.provider,
            starts_at: form.starts_at,
            ends_at: form.ends_at,
            status: form.status,
        };
        if (form.class_id) data.class_id = form.class_id;
        if (form.subject_id) data.subject_id = form.subject_id;
        if (form.meeting_url) data.meeting_url = form.meeting_url;
        if (form.meeting_id) data.meeting_id = form.meeting_id;
        if (form.passcode) data.passcode = form.passcode;
        if (form.notes) data.notes = form.notes;

        router[editing ? 'patch' : 'post'](editing ? `/online-classes/${editing.id}` : '/online-classes', data, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false),
            onFinish: () => setSaving(false),
        });
    };

    const setStatus = (onlineClass: OnlineClass, status: string) => {
        router.patch(`/online-classes/${onlineClass.id}/status`, { status }, { preserveScroll: true });
    };

    const remove = (onlineClass: OnlineClass) => {
        if (!window.confirm(t('Delete this online class?'))) return;
        setDeletingId(onlineClass.id);
        router.delete(`/online-classes/${onlineClass.id}`, {
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
                            {t('Live Online Classes')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Schedule Zoom, Google Meet, or Teams sessions for your classes.')}
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Schedule Class')}
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            {t('Filter')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label>{t('Status')}</Label>
                                <Select value={selectedStatus} onValueChange={(v) => filter({ status: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All statuses')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="scheduled">{t('Scheduled')}</SelectItem>
                                        <SelectItem value="live">{t('Live')}</SelectItem>
                                        <SelectItem value="completed">{t('Completed')}</SelectItem>
                                        <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Class')}</Label>
                                <Select value={selectedClassId} onValueChange={(v) => filter({ class_id: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All classes')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {onlineClasses.length === 0 ? (
                    <Card>
                        <CardContent>
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                <Video className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                {t('No online classes scheduled.')}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {onlineClasses.map((onlineClass) => (
                            <Card key={onlineClass.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <Badge className={STATUS_STYLE[onlineClass.status] ?? ''}>
                                            {t(i18nStatus(onlineClass.status))}
                                        </Badge>
                                        {canManage && (
                                            <div className="flex gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => openEdit(onlineClass)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-red-500"
                                                    onClick={() => remove(onlineClass)}
                                                    disabled={deletingId === onlineClass.id}
                                                >
                                                    {deletingId === onlineClass.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <CardTitle className="text-base">{onlineClass.title}</CardTitle>
                                    <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                                        <span>{PROVIDER_LABEL[onlineClass.provider] ?? onlineClass.provider}</span>
                                        {onlineClass.class && (
                                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                {onlineClass.class}
                                            </span>
                                        )}
                                        {onlineClass.subject && (
                                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                {onlineClass.subject}
                                            </span>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            {formatDate(onlineClass.starts_at)}
                                        </div>
                                        {onlineClass.meeting_id && (
                                            <div className="mt-1 text-xs text-gray-500">
                                                {t('Meeting ID')}: {onlineClass.meeting_id}
                                            </div>
                                        )}
                                        {onlineClass.passcode && (
                                            <div className="text-xs text-gray-500">
                                                {t('Passcode')}: {onlineClass.passcode}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {onlineClass.meeting_url && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(onlineClass.meeting_url, '_blank')}
                                            >
                                                <ExternalLink className="mr-1 h-4 w-4" />
                                                {t('Join')}
                                            </Button>
                                        )}
                                        {onlineClass.status === 'scheduled' && canManage && (
                                            <Button size="sm" onClick={() => setStatus(onlineClass, 'live')}>
                                                <Play className="mr-1 h-4 w-4" />
                                                {t('Start Class')}
                                            </Button>
                                        )}
                                        {onlineClass.status === 'live' && canManage && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setStatus(onlineClass, 'completed')}
                                            >
                                                {t('Mark Completed')}
                                            </Button>
                                        )}
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
                                {editing ? t('Edit Online Class') : t('Schedule Class')}
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
                                <Label>{t('Title')} *</Label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Class')}</Label>
                                    <Select
                                        value={form.class_id}
                                        onValueChange={(v) => setForm({ ...form, class_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All classes')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Subject')}</Label>
                                    <Select
                                        value={form.subject_id}
                                        onValueChange={(v) => setForm({ ...form, subject_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All subjects')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjects.map((sub) => (
                                                <SelectItem key={sub.id} value={sub.id}>
                                                    {sub.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>{t('Platform')} *</Label>
                                <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="google_meet">Google Meet</SelectItem>
                                        <SelectItem value="zoom">Zoom</SelectItem>
                                        <SelectItem value="microsoft_teams">Microsoft Teams</SelectItem>
                                        <SelectItem value="custom">{t('Custom')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Starts At')} *</Label>
                                    <Input
                                        type="datetime-local"
                                        value={form.starts_at}
                                        onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>{t('Ends At')}</Label>
                                    <Input
                                        type="datetime-local"
                                        value={form.ends_at}
                                        onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('Meeting URL')}</Label>
                                <Input
                                    type="url"
                                    value={form.meeting_url}
                                    onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
                                    placeholder="https://"
                                />
                            </div>
                            {editing && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label>{t('Meeting ID')}</Label>
                                        <Input
                                            value={form.meeting_id}
                                            onChange={(e) => setForm({ ...form, meeting_id: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>{t('Passcode')}</Label>
                                        <Input
                                            value={form.passcode}
                                            onChange={(e) => setForm({ ...form, passcode: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                            <div>
                                <Label>{t('Notes')}</Label>
                                <Textarea
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editing ? t('Save Changes') : t('Schedule Class')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

function toLocalInput(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}

function i18nStatus(status: string): string {
    const map: Record<string, string> = {
        scheduled: 'Scheduled',
        live: 'Live',
        completed: 'Completed',
        cancelled: 'Cancelled',
    };
    return map[status] ?? status;
}
