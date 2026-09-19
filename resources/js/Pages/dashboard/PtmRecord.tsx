import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { router } from '@inertiajs/react';
import { CalendarCheck, CheckCircle2, ClipboardCheck, Save } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

type AppointmentRow = {
    id: number;
    slot_time: string | null;
    parent_name: string | null;
    status: string;
    remarks: string | null;
    follow_up_required: boolean;
    follow_up_due: string | null;
    student: { id: string; name: string; class?: string; section?: string } | null;
};

type SessionRow = {
    id: number;
    title: string;
    date: string;
    start_time: string | null;
    status: string;
    appointmentCount: number;
    appointments: AppointmentRow[];
};

type PtmRecordProps = {
    user: any;
    sessions: SessionRow[];
};

const STATUSES = ['booked', 'checked_in', 'completed', 'absent'];

export default function PtmRecord({ user, sessions }: PtmRecordProps) {
    const { t } = useLanguage();
    const [edits, setEdits] = useState<Record<number, { status: string; remarks: string }>>({});
    const [savingId, setSavingId] = useState<number | null>(null);

    const valueFor = (appointment: AppointmentRow) =>
        edits[appointment.id] ?? { status: appointment.status, remarks: appointment.remarks ?? '' };

    const save = (appointment: AppointmentRow) => {
        const next = valueFor(appointment);
        setSavingId(appointment.id);
        router.patch(
            `/ptm/appointments/${appointment.id}/record`,
            { status: next.status, remarks: next.remarks },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(t('Attendance recorded.'));
                    setEdits((current) => {
                        const copy = { ...current };
                        delete copy[appointment.id];
                        return copy;
                    });
                },
                onFinish: () => setSavingId(null),
            },
        );
    };

    return (
        <DashboardLayout user={user} pageTitle={t('PTM Attendance & Remarks')}>
            <div className="space-y-6 p-4 sm:p-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <ClipboardCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('PTM Attendance & Remarks')}</CardTitle>
                                <CardDescription>
                                    {t('Record parent attendance and meeting remarks for each appointment.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {sessions.length === 0 ? (
                    <Card>
                        <CardContent className="flex h-40 items-center justify-center text-slate-500">
                            {t('No scheduled meetings yet.')}
                        </CardContent>
                    </Card>
                ) : (
                    sessions.map((session) => (
                        <Card key={session.id}>
                            <CardHeader>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <CalendarCheck className="h-5 w-5 text-indigo-500" />
                                        <CardTitle className="text-base">{session.title}</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-500">
                                            {session.date}
                                            {session.start_time ? ` · ${session.start_time}` : ''}
                                        </span>
                                        <Badge variant="outline" className="bg-sky-50 text-sky-700">
                                            {t('Appointments')}: {session.appointmentCount}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Student')}</TableHead>
                                                <TableHead>{t('Parent')}</TableHead>
                                                <TableHead>{t('Slot')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                                <TableHead>{t('Remarks')}</TableHead>
                                                <TableHead>{t('Action')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {session.appointments.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                        {t('No appointments for this meeting.')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                session.appointments.map((appointment) => {
                                                    const current = valueFor(appointment);
                                                    return (
                                                        <TableRow key={appointment.id}>
                                                            <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                                {appointment.student?.name ?? t('Unassigned')}
                                                                {appointment.student?.class ? (
                                                                    <span className="block text-xs text-slate-500">
                                                                        {appointment.student.class}
                                                                        {appointment.student.section
                                                                            ? ` / ${appointment.student.section}`
                                                                            : ''}
                                                                    </span>
                                                                ) : null}
                                                            </TableCell>
                                                            <TableCell className="text-slate-600 dark:text-gray-300">
                                                                {appointment.parent_name ?? '-'}
                                                            </TableCell>
                                                            <TableCell className="text-slate-600 dark:text-gray-300">
                                                                {appointment.slot_time ?? '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Select
                                                                    value={current.status}
                                                                    onValueChange={(status) =>
                                                                        setEdits((prev) => ({
                                                                            ...prev,
                                                                            [appointment.id]: { ...current, status },
                                                                        }))
                                                                    }
                                                                >
                                                                    <SelectTrigger className="w-36">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {STATUSES.map((status) => (
                                                                            <SelectItem key={status} value={status}>
                                                                                {status === 'checked_in'
                                                                                    ? t('Checked In')
                                                                                    : t(
                                                                                          status
                                                                                              .charAt(0)
                                                                                              .toUpperCase() +
                                                                                              status.slice(1),
                                                                                      )}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Textarea
                                                                    value={current.remarks}
                                                                    onChange={(e) =>
                                                                        setEdits((prev) => ({
                                                                            ...prev,
                                                                            [appointment.id]: {
                                                                                ...current,
                                                                                remarks: e.target.value,
                                                                            },
                                                                        }))
                                                                    }
                                                                    rows={2}
                                                                    className="min-w-48"
                                                                />
                                                                {appointment.follow_up_required ? (
                                                                    <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        {t('Follow-up')}{' '}
                                                                        {appointment.follow_up_due ?? ''}
                                                                    </div>
                                                                ) : null}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => save(appointment)}
                                                                    disabled={
                                                                        savingId === appointment.id ||
                                                                        (current.status === appointment.status &&
                                                                            current.remarks ===
                                                                                (appointment.remarks ?? ''))
                                                                    }
                                                                >
                                                                    <Save className="mr-1 h-4 w-4" />
                                                                    {t('Save')}
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </DashboardLayout>
    );
}
