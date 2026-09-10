import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { CalendarClock, Clock3, Loader2, MapPin, Pencil, Phone, Plus, Trash2, UserRound, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';

interface Appointment {
    id: string;
    slot_time?: string | null;
    parent_name?: string | null;
    parent_contact?: string | null;
    notes?: string | null;
    remarks?: string | null;
    follow_up_required?: boolean;
    follow_up_due?: string | null;
    follow_up_completed_at?: string | null;
    status: string;
    student?: {
        id: string;
        name: string;
        class?: string | null;
        section?: string | null;
    } | null;
    created_by?: string | null;
}

interface PtmSession {
    id: string;
    title: string;
    description?: string | null;
    date: string;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    status: string;
    appointment_count?: number;
    appointments?: Appointment[];
}

interface ClassGroup {
    label: string;
    students: Array<{ id: string; name: string }>;
}

interface PtmProps {
    user: any;
    organization?: any;
    sessions: PtmSession[];
    selectedSession?: PtmSession | null;
    classGroups: ClassGroup[];
}

const SESSION_STATUS_STYLE: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const APPOINTMENT_STATUS_STYLE: Record<string, string> = {
    booked: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    checked_in: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    absent: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

export default function PtmSessions(pageProps: PtmProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const sessions = pageProps.sessions ?? [];
    const selected = pageProps.selectedSession ?? null;
    const classGroups = pageProps.classGroups ?? [];

    const canManage = ['admin', 'super_admin', 'teacher'].includes(user?.role);

    const [showSessionModal, setShowSessionModal] = useState(false);
    const [editingSession, setEditingSession] = useState<PtmSession | null>(null);
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [sessionForm, setSessionForm] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().slice(0, 10),
        start_time: '',
        end_time: '',
        location: '',
        status: 'scheduled',
    });

    const [appointmentForm, setAppointmentForm] = useState({
        student_id: '',
        parent_name: '',
        parent_contact: '',
        slot_time: '',
        notes: '',
        remarks: '',
        follow_up_required: false,
        follow_up_due: '',
        status: 'booked',
    });

    const selectSession = (session: PtmSession) => {
        router.visit('/ptm', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: { session_id: session.id },
            only: ['selectedSession'],
        });
    };

    const openCreateSession = () => {
        setEditingSession(null);
        setSessionForm({
            title: '',
            description: '',
            date: new Date().toISOString().slice(0, 10),
            start_time: '',
            end_time: '',
            location: '',
            status: 'scheduled',
        });
        setShowSessionModal(true);
    };

    const openEditSession = (session: PtmSession) => {
        setEditingSession(session);
        setSessionForm({
            title: session.title,
            description: session.description ?? '',
            date: session.date,
            start_time: session.start_time ?? '',
            end_time: session.end_time ?? '',
            location: session.location ?? '',
            status: session.status,
        });
        setShowSessionModal(true);
    };

    const submitSession = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        if (editingSession) {
            router.patch(`/ptm/${editingSession.id}`, sessionForm, {
                preserveScroll: true,
                onSuccess: () => setShowSessionModal(false),
                onFinish: () => setSaving(false),
            });
        } else {
            router.post('/ptm', sessionForm, {
                preserveScroll: true,
                onSuccess: () => setShowSessionModal(false),
                onFinish: () => setSaving(false),
            });
        }
    };

    const removeSession = (session: PtmSession) => {
        if (!window.confirm(t('Delete this meeting?'))) return;
        setDeletingId(session.id);
        router.delete(`/ptm/${session.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const openCreateAppointment = () => {
        setEditingAppointment(null);
        setAppointmentForm({
            student_id: '',
            parent_name: '',
            parent_contact: '',
            slot_time: '',
            notes: '',
            remarks: '',
            follow_up_required: false,
            follow_up_due: '',
            status: 'booked',
        });
        setShowAppointmentModal(true);
    };

    const openEditAppointment = (appointment: Appointment) => {
        setEditingAppointment(appointment);
        setAppointmentForm({
            student_id: appointment.student?.id ?? '',
            parent_name: appointment.parent_name ?? '',
            parent_contact: appointment.parent_contact ?? '',
            slot_time: appointment.slot_time ?? '',
            notes: appointment.notes ?? '',
            remarks: appointment.remarks ?? '',
            follow_up_required: appointment.follow_up_required ?? false,
            follow_up_due: appointment.follow_up_due ?? '',
            status: appointment.status,
        });
        setShowAppointmentModal(true);
    };

    const submitAppointment = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        if (editingAppointment) {
            router.patch(`/ptm/appointments/${editingAppointment.id}`, appointmentForm, {
                preserveScroll: true,
                onSuccess: () => setShowAppointmentModal(false),
                onFinish: () => setSaving(false),
            });
        } else if (selected) {
            router.post(`/ptm/${selected.id}/appointments`, appointmentForm, {
                preserveScroll: true,
                onSuccess: () => setShowAppointmentModal(false),
                onFinish: () => setSaving(false),
            });
        }
    };

    const removeAppointment = (appointment: Appointment) => {
        if (!window.confirm(t('Remove this appointment?'))) return;
        setDeletingId(appointment.id);
        router.delete(`/ptm/appointments/${appointment.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const toggleFollowUp = (appointment: Appointment) => {
        setDeletingId(appointment.id);
        const done = !appointment.follow_up_completed_at;
        router.patch(
            `/ptm/appointments/${appointment.id}/follow-up`,
            { done },
            {
                preserveScroll: true,
                onFinish: () => setDeletingId(null),
            },
        );
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Parent-Teacher Meeting')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Schedule parent-teacher meetings and manage appointment slots for each session.')}
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={openCreateSession}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Schedule Meeting')}
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarClock className="h-5 w-5 text-blue-500" />
                                {t('Meetings')}
                            </CardTitle>
                            <CardDescription>{t('Select a meeting to manage its appointments.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {sessions.length === 0 && (
                                <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                    {t('No meetings scheduled yet.')}
                                </p>
                            )}
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className={`group cursor-pointer rounded-lg border p-3 transition-colors ${
                                        selected?.id === session.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                    onClick={() => selectSession(session)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{session.title}</p>
                                            <p className="mt-0.5 text-xs text-gray-500">
                                                {session.date}
                                                {session.start_time ? ` · ${session.start_time}` : ''}
                                            </p>
                                            {session.location && (
                                                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                                                    <MapPin className="h-3 w-3" />
                                                    {session.location}
                                                </p>
                                            )}
                                        </div>
                                        <Badge className={SESSION_STATUS_STYLE[session.status] ?? ''}>
                                            {t(i18nSessionStatus(session.status))}
                                        </Badge>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                        <span>
                                            {session.appointment_count} {t('appointments')}
                                        </span>
                                        {canManage && (
                                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditSession(session);
                                                    }}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-red-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeSession(session);
                                                    }}
                                                    disabled={deletingId === session.id}
                                                >
                                                    {deletingId === session.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {selected ? (
                        <Card>
                            <CardHeader className="flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle>{selected.title}</CardTitle>
                                    <CardDescription className="mt-1 flex flex-wrap items-center gap-3">
                                        <span className="flex items-center gap-1">
                                            <CalendarClock className="h-3.5 w-3.5" />
                                            {selected.date}
                                        </span>
                                        {selected.start_time && (
                                            <span className="flex items-center gap-1">
                                                <Clock3 className="h-3.5 w-3.5" />
                                                {selected.start_time}
                                                {selected.end_time ? ` – ${selected.end_time}` : ''}
                                            </span>
                                        )}
                                        {selected.location && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {selected.location}
                                            </span>
                                        )}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={SESSION_STATUS_STYLE[selected.status] ?? ''}>
                                        {t(i18nSessionStatus(selected.status))}
                                    </Badge>
                                    {canManage && (
                                        <Button size="sm" onClick={openCreateAppointment}>
                                            <Plus className="mr-1 h-4 w-4" />
                                            {t('Add Appointment')}
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {selected.description && (
                                    <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                                        {selected.description}
                                    </p>
                                )}
                                {!selected.appointments || selected.appointments.length === 0 ? (
                                    <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        <UserRound className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                                        {t('No appointments yet.')}
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Student')}</TableHead>
                                                <TableHead>{t('Parent')}</TableHead>
                                                <TableHead>{t('Slot')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                                <TableHead>{t('Remarks & Follow-up')}</TableHead>
                                                {canManage && (
                                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selected.appointments.map((appointment) => (
                                                <TableRow key={appointment.id}>
                                                    <TableCell>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {appointment.student?.name ?? '—'}
                                                        </p>
                                                        {appointment.student?.class && (
                                                            <p className="text-xs text-gray-500">
                                                                {appointment.student.class}
                                                                {appointment.student.section
                                                                    ? ` ${appointment.student.section}`
                                                                    : ''}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {appointment.parent_name && (
                                                            <p className="text-sm font-medium">
                                                                {appointment.parent_name}
                                                            </p>
                                                        )}
                                                        {appointment.parent_contact && (
                                                            <p className="flex items-center gap-1 text-xs text-gray-500">
                                                                <Phone className="h-3 w-3" />
                                                                {appointment.parent_contact}
                                                            </p>
                                                        )}
                                                        {!appointment.parent_name && !appointment.parent_contact && (
                                                            <span className="text-sm text-gray-400">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap text-sm">
                                                        {appointment.slot_time ?? '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={
                                                                APPOINTMENT_STATUS_STYLE[appointment.status] ?? ''
                                                            }
                                                        >
                                                            {t(i18nAppointmentStatus(appointment.status))}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-[260px]">
                                                        {appointment.remarks && (
                                                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                                                {appointment.remarks}
                                                            </p>
                                                        )}
                                                        {appointment.follow_up_required && (
                                                            <div className="mt-1 flex items-center gap-1.5">
                                                                <Badge
                                                                    className={
                                                                        appointment.follow_up_completed_at
                                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                                    }
                                                                >
                                                                    {appointment.follow_up_completed_at
                                                                        ? t('Follow-up completed')
                                                                        : t('Follow-up required')}
                                                                </Badge>
                                                                {appointment.follow_up_due && (
                                                                    <span className="text-xs text-gray-500">
                                                                        {t('Follow-up due')}:{' '}
                                                                        {appointment.follow_up_due}
                                                                    </span>
                                                                )}
                                                                {canManage && (
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-6 px-1.5 text-xs"
                                                                        disabled={deletingId === appointment.id}
                                                                        onClick={() => toggleFollowUp(appointment)}
                                                                    >
                                                                        {deletingId === appointment.id ? (
                                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                                        ) : appointment.follow_up_completed_at ? (
                                                                            t('Reopen')
                                                                        ) : (
                                                                            t('Mark done')
                                                                        )}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                        {!appointment.remarks && !appointment.follow_up_required && (
                                                            <span className="text-sm text-gray-400">—</span>
                                                        )}
                                                    </TableCell>
                                                    {canManage && (
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => openEditAppointment(appointment)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => removeAppointment(appointment)}
                                                                    disabled={deletingId === appointment.id}
                                                                >
                                                                    {deletingId === appointment.id ? (
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
                    ) : (
                        <Card>
                            <CardContent>
                                <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                                    <UserRound className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                    {t('Select a meeting from the list to manage its appointments.')}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {showSessionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingSession ? t('Edit Meeting') : t('Schedule Meeting')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowSessionModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submitSession} className="space-y-4">
                            <div>
                                <Label>{t('Title')}</Label>
                                <Input
                                    value={sessionForm.title}
                                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                                    placeholder={t('e.g. Term 1 Parent-Teacher Meeting')}
                                    required
                                />
                                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                            </div>
                            <div>
                                <Label>{t('Date')}</Label>
                                <Input
                                    type="date"
                                    value={sessionForm.date}
                                    onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Start Time')}</Label>
                                    <Input
                                        type="time"
                                        value={sessionForm.start_time}
                                        onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>{t('End Time')}</Label>
                                    <Input
                                        type="time"
                                        value={sessionForm.end_time}
                                        onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('Location')}</Label>
                                <Input
                                    value={sessionForm.location}
                                    onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                                    placeholder={t('e.g. Classroom 2B')}
                                />
                            </div>
                            <div>
                                <Label>{t('Status')}</Label>
                                <Select
                                    value={sessionForm.status}
                                    onValueChange={(v) => setSessionForm({ ...sessionForm, status: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="scheduled">{t('Scheduled')}</SelectItem>
                                        <SelectItem value="completed">{t('Completed')}</SelectItem>
                                        <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Description')}</Label>
                                <Textarea
                                    value={sessionForm.description}
                                    onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowSessionModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingSession ? t('Save Changes') : t('Save Meeting')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAppointmentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingAppointment ? t('Edit Appointment') : t('Add Appointment')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowAppointmentModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submitAppointment} className="space-y-4">
                            {editingAppointment ? (
                                <div>
                                    <Label>{t('Student')}</Label>
                                    <Input value={appointmentForm.student_id} disabled className="bg-gray-50" />
                                </div>
                            ) : (
                                <div>
                                    <Label>{t('Student')} *</Label>
                                    <Select
                                        value={appointmentForm.student_id}
                                        onValueChange={(v) => setAppointmentForm({ ...appointmentForm, student_id: v })}
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
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Parent Name')}</Label>
                                    <Input
                                        value={appointmentForm.parent_name}
                                        onChange={(e) =>
                                            setAppointmentForm({ ...appointmentForm, parent_name: e.target.value })
                                        }
                                        placeholder={t('e.g. Ramesh Patil')}
                                    />
                                </div>
                                <div>
                                    <Label>{t('Parent Contact')}</Label>
                                    <Input
                                        value={appointmentForm.parent_contact}
                                        onChange={(e) =>
                                            setAppointmentForm({ ...appointmentForm, parent_contact: e.target.value })
                                        }
                                        placeholder={t('e.g. +91 98765 43210')}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('Slot Time')}</Label>
                                <Input
                                    type="time"
                                    value={appointmentForm.slot_time}
                                    onChange={(e) =>
                                        setAppointmentForm({ ...appointmentForm, slot_time: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <Label>{t('Status')}</Label>
                                <Select
                                    value={appointmentForm.status}
                                    onValueChange={(v) => setAppointmentForm({ ...appointmentForm, status: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="booked">{t('Booked')}</SelectItem>
                                        <SelectItem value="checked_in">{t('Checked In')}</SelectItem>
                                        <SelectItem value="completed">{t('Completed')}</SelectItem>
                                        <SelectItem value="absent">{t('Absent')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Notes')}</Label>
                                <Textarea
                                    value={appointmentForm.notes}
                                    onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div>
                                <Label>{t('Remarks')}</Label>
                                <Textarea
                                    value={appointmentForm.remarks}
                                    onChange={(e) =>
                                        setAppointmentForm({ ...appointmentForm, remarks: e.target.value })
                                    }
                                    rows={2}
                                    placeholder={t('Post-meeting remarks')}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <Label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={appointmentForm.follow_up_required}
                                        onCheckedChange={(value) =>
                                            setAppointmentForm({
                                                ...appointmentForm,
                                                follow_up_required: value === true,
                                            })
                                        }
                                    />
                                    {t('Follow-up required')}
                                </Label>
                                {appointmentForm.follow_up_required && (
                                    <Input
                                        type="date"
                                        value={appointmentForm.follow_up_due}
                                        onChange={(e) =>
                                            setAppointmentForm({ ...appointmentForm, follow_up_due: e.target.value })
                                        }
                                        className="w-44"
                                    />
                                )}
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowAppointmentModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingAppointment ? t('Save Changes') : t('Save Appointment')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

function i18nSessionStatus(status: string): string {
    const map: Record<string, string> = { scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled' };
    return map[status] ?? status;
}

function i18nAppointmentStatus(status: string): string {
    const map: Record<string, string> = {
        booked: 'Booked',
        checked_in: 'Checked In',
        completed: 'Completed',
        absent: 'Absent',
    };
    return map[status] ?? status;
}
