import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';

interface SchoolEvent {
    id: string;
    title: string;
    description?: string | null;
    type: string;
    start_date: string;
    end_date: string;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    color?: string;
    is_holiday: boolean;
}

interface EventsProps {
    user: any;
    organization?: any;
    events: SchoolEvent[];
    selectedMonth: number;
    selectedYear: number;
}

const TYPE_COLORS: Record<string, string> = {
    holiday: '#ef4444',
    exam: '#8b5cf6',
    sports: '#f59e0b',
    cultural: '#ec4899',
    meeting: '#10b981',
    other: '#3b82f6',
};

const TYPE_LABELS: Record<string, string> = {
    holiday: 'Holiday',
    exam: 'Exam',
    sports: 'Sports',
    cultural: 'Cultural',
    meeting: 'Meeting',
    other: 'Other',
};

export default function EventsCalendar(pageProps: EventsProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const events = pageProps.events ?? [];
    const [month, setMonth] = useState(pageProps.selectedMonth ?? new Date().getMonth() + 1);
    const [year, setYear] = useState(pageProps.selectedYear ?? new Date().getFullYear());

    const canManage = ['admin', 'super_admin', 'teacher', 'receptionist'].includes(user?.role);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<SchoolEvent | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '',
        type: 'other',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        location: '',
        color: '',
        is_holiday: false,
        description: '',
    });

    const openCreate = () => {
        setEditing(null);
        setForm({
            title: '',
            type: 'other',
            start_date: `${year}-${String(month).padStart(2, '0')}-01`,
            end_date: '',
            start_time: '',
            end_time: '',
            location: '',
            color: TYPE_COLORS.other,
            is_holiday: false,
            description: '',
        });
        setShowModal(true);
    };

    const openEdit = (event: SchoolEvent) => {
        setEditing(event);
        setForm({
            title: event.title,
            type: event.type,
            start_date: event.start_date,
            end_date: event.end_date || event.start_date,
            start_time: event.start_time ?? '',
            end_time: event.end_time ?? '',
            location: event.location ?? '',
            color: event.color || TYPE_COLORS[event.type] || TYPE_COLORS.other,
            is_holiday: event.is_holiday,
            description: event.description ?? '',
        });
        setShowModal(true);
    };

    const changeMonth = (delta: number) => {
        const target = new Date(year, month - 1 + delta, 1);
        setMonth(target.getMonth() + 1);
        setYear(target.getFullYear());
        refresh(target.getMonth() + 1, target.getFullYear());
    };

    const refresh = (m?: number, y?: number) => {
        router.visit('/events', {
            method: 'get',
            data: {
                month: m ?? month,
                year: y ?? year,
            },
            preserveState: true,
            preserveScroll: true,
            only: ['events', 'selectedMonth', 'selectedYear'],
        });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = { ...form, end_date: form.end_date || form.start_date };
        if (editing) {
            router.patch(`/events/${editing.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => setShowModal(false),
                onFinish: () => setSaving(false),
            });
        } else {
            router.post('/events', payload, {
                preserveScroll: true,
                onSuccess: () => setShowModal(false),
                onFinish: () => setSaving(false),
            });
        }
    };

    const remove = (event: SchoolEvent) => {
        if (!window.confirm(t('Delete this event?'))) return;
        setDeletingId(event.id);
        router.delete(`/events/${event.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const byDate = useMemo(() => {
        const map: Record<string, SchoolEvent[]> = {};
        for (const ev of events) {
            for (const day of daysBetween(ev.start_date, ev.end_date)) {
                map[day] = map[day] ?? [];
                map[day].push(ev);
            }
        }
        return map;
    }, [events]);

    const grid = useMemo(() => buildGrid(month, year), [month, year]);

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Events & Holidays')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Plan and manage school holidays, exams, events and meetings.')}
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Add Event')}
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-lg capitalize">
                            {new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" onClick={() => changeMonth(-1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setMonth(new Date().getMonth() + 1);
                                    setYear(new Date().getFullYear());
                                    refresh(new Date().getMonth() + 1, new Date().getFullYear());
                                }}
                            >
                                {t('Today')}
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => changeMonth(1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                                <div key={d} className="py-2">
                                    {d}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {grid.map((cell, idx) => {
                                const dayEvents = cell.date ? (byDate[cell.date] ?? []) : [];
                                const isToday = cell.date === today();
                                return (
                                    <div
                                        key={idx}
                                        className={`min-h-20 rounded-lg border p-1.5 ${
                                            cell.inMonth
                                                ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                                                : 'border-transparent bg-gray-50 dark:bg-gray-900'
                                        } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                                    >
                                        {cell.date && (
                                            <>
                                                <div className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                    {cell.day}
                                                </div>
                                                <div className="space-y-1">
                                                    {dayEvents.map((ev) => (
                                                        <button
                                                            key={ev.id}
                                                            type="button"
                                                            onClick={() => canManage && openEdit(ev)}
                                                            className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight text-white"
                                                            style={{
                                                                backgroundColor: ev.color || TYPE_COLORS[ev.type],
                                                            }}
                                                            title={ev.title}
                                                        >
                                                            {ev.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-blue-500" />
                            {t('Upcoming Events')}
                        </CardTitle>
                        <CardDescription>{t('All events in this month with their date and time.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {events.length === 0 && (
                            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                {t('No events scheduled this month.')}
                            </p>
                        )}
                        {events.map((ev) => (
                            <div
                                key={ev.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="h-10 w-1.5 rounded-full"
                                        style={{ backgroundColor: ev.color || TYPE_COLORS[ev.type] }}
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900 dark:text-white">{ev.title}</p>
                                            <Badge variant="secondary">{t(TYPE_LABELS[ev.type] ?? 'Other')}</Badge>
                                            {ev.is_holiday && (
                                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                                    {t('Holiday')}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatRange(ev.start_date, ev.end_date, ev.start_time, ev.end_time)}
                                            {ev.location ? ` · ${ev.location}` : ''}
                                        </p>
                                    </div>
                                </div>
                                {canManage && (
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline" onClick={() => openEdit(ev)}>
                                            <Pencil className="mr-1 h-3.5 w-3.5" />
                                            {t('Edit')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => remove(ev)}
                                            disabled={deletingId === ev.id}
                                        >
                                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                                            {t('Delete')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editing ? t('Edit Event') : t('Add Event')}
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
                                <Label>{t('Title')}</Label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder={t('e.g. Annual Sports Day')}
                                    required
                                />
                                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Type')}</Label>
                                    <Select
                                        value={form.type}
                                        onValueChange={(v) => setForm({ ...form, type: v, color: TYPE_COLORS[v] })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select type')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(TYPE_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {t(label)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Color')}</Label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={form.color || TYPE_COLORS[form.type]}
                                            onChange={(e) => setForm({ ...form, color: e.target.value })}
                                            className="h-9 w-12 cursor-pointer rounded border border-gray-200 dark:border-gray-700"
                                        />
                                        <span className="text-sm text-gray-500">{t('Display color')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Start Date')}</Label>
                                    <Input
                                        type="date"
                                        value={form.start_date}
                                        onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>{t('End Date')}</Label>
                                    <Input
                                        type="date"
                                        value={form.end_date}
                                        onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                        min={form.start_date}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Start Time')}</Label>
                                    <Input
                                        type="time"
                                        value={form.start_time}
                                        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>{t('End Time')}</Label>
                                    <Input
                                        type="time"
                                        value={form.end_time}
                                        onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('Location')}</Label>
                                <Input
                                    value={form.location}
                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    placeholder={t('e.g. School Ground')}
                                />
                            </div>
                            <div>
                                <Label>{t('Description')}</Label>
                                <Textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                <span className="text-sm text-gray-700 dark:text-gray-300">{t('Mark as holiday')}</span>
                                <Switch
                                    checked={form.is_holiday}
                                    onCheckedChange={(v) => setForm({ ...form, is_holiday: v })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? t('Saving...') : editing ? t('Save Changes') : t('Save Event')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

function today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function daysBetween(start: string, end?: string): string[] {
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end ?? start}T00:00:00`);
    const days: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    }
    return days;
}

function buildGrid(month: number, year: number): Array<{ date: string | null; day: number | null; inMonth: boolean }> {
    const first = new Date(year, month - 1, 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: Array<{ date: string | null; day: number | null; inMonth: boolean }> = [];
    for (let i = 0; i < mondayOffset; i++) {
        cells.push({ date: null, day: null, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ date: `${year}-${pad(month)}-${pad(d)}`, day: d, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
        cells.push({ date: null, day: null, inMonth: false });
    }
    return cells;
}

function formatRange(start: string, end?: string, startTime?: string | null, endTime?: string | null): string {
    const fmt = (d: string) => {
        const [y, m, day] = d.split('-');
        return `${day}/${m}/${y}`;
    };
    if (end && end !== start) {
        return `${fmt(start)} – ${fmt(end)}`;
    }
    if (startTime && endTime) {
        return `${fmt(start)} · ${startTime} – ${endTime}`;
    }
    if (startTime) {
        return `${fmt(start)} · ${startTime}`;
    }
    return fmt(start);
}
