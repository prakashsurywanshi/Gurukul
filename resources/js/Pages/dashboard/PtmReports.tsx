import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import {
    BarChart3,
    CalendarCheck,
    CalendarX2,
    CheckCircle2,
    ClipboardList,
    Handshake,
    UserCheck,
    Users,
} from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface SummaryBlock {
    key: string;
    value: string | number;
    label: string;
    icon: any;
    tone: string;
}

interface SessionRow {
    id: string;
    title: string;
    date: string;
    start_time?: string;
    status: string;
    total: number;
    present: number;
    absent: number;
    remarks: number;
    followUps: number;
}

interface PtmReportsProps {
    user: any;
    summary: {
        sessions: number;
        completedSessions: number;
        appointments: number;
        present: number;
        absent: number;
        attendanceRate: number;
        remarks: number;
        pendingFollowUps: number;
    };
    sessions: SessionRow[];
}

export default function PtmReports({ user, summary, sessions }: PtmReportsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const cards: SummaryBlock[] = [
        {
            key: 'sessions',
            value: summary.sessions,
            label: t('Scheduled Meetings'),
            icon: CalendarCheck,
            tone: 'bg-sky-50 text-sky-600',
        },
        {
            key: 'completed',
            value: summary.completedSessions,
            label: t('Completed Meetings'),
            icon: CheckCircle2,
            tone: 'bg-emerald-50 text-emerald-600',
        },
        {
            key: 'appointments',
            value: summary.appointments,
            label: t('Appointments'),
            icon: Users,
            tone: 'bg-indigo-50 text-indigo-600',
        },
        {
            key: 'present',
            value: summary.present,
            label: t('Present'),
            icon: UserCheck,
            tone: 'bg-green-50 text-green-600',
        },
        {
            key: 'absent',
            value: summary.absent,
            label: t('Absent'),
            icon: CalendarX2,
            tone: 'bg-rose-50 text-rose-600',
        },
        {
            key: 'rate',
            value: `${summary.attendanceRate}%`,
            label: t('Attendance Rate'),
            icon: BarChart3,
            tone: 'bg-amber-50 text-amber-600',
        },
        {
            key: 'remarks',
            value: summary.remarks,
            label: t('Remarks Recorded'),
            icon: ClipboardList,
            tone: 'bg-violet-50 text-violet-600',
        },
        {
            key: 'followUps',
            value: summary.pendingFollowUps,
            label: t('Pending Follow-ups'),
            icon: Handshake,
            tone: 'bg-orange-50 text-orange-600',
        },
    ];

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('PTM Reports')}</CardTitle>
                                <CardDescription>
                                    {t('Attendance, remarks and follow-up summary across all parent-teacher meetings.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {cards.map((card) => (
                        <Card key={card.key}>
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className={`rounded-lg p-2 ${card.tone}`}>
                                    <card.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                        {card.value}
                                    </div>
                                    <div className="text-xs text-slate-500">{card.label}</div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Meeting-wise Summary')}</CardTitle>
                        <CardDescription>
                            {t('Per-meeting breakdown of attendance, remarks and pending follow-ups.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Meeting')}</TableHead>
                                        <TableHead>{t('Date')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead>{t('Appointments')}</TableHead>
                                        <TableHead>{t('Present')}</TableHead>
                                        <TableHead>{t('Absent')}</TableHead>
                                        <TableHead>{t('Remarks')}</TableHead>
                                        <TableHead>{t('Follow-ups')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                                {t('No meetings recorded yet.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sessions.map((session) => (
                                            <TableRow key={session.id}>
                                                <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                    {session.title}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {session.date}
                                                    {session.start_time ? ` · ${session.start_time}` : ''}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            session.status === 'completed'
                                                                ? 'bg-green-50 text-green-700'
                                                                : session.status === 'cancelled'
                                                                  ? 'bg-rose-50 text-rose-700'
                                                                  : 'bg-sky-50 text-sky-700'
                                                        }
                                                    >
                                                        {session.status === 'completed'
                                                            ? t('Completed')
                                                            : session.status === 'cancelled'
                                                              ? t('Cancelled')
                                                              : t('Scheduled')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{session.total}</TableCell>
                                                <TableCell className="text-green-600">{session.present}</TableCell>
                                                <TableCell className="text-rose-600">{session.absent}</TableCell>
                                                <TableCell>{session.remarks}</TableCell>
                                                <TableCell>{session.followUps}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
