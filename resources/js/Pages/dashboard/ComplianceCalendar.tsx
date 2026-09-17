import { useLanguage } from '../../i18n/LanguageProvider';
import { useMemo, useState } from 'react';
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    FileClock,
    ListChecks,
    ShieldCheck,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PageHeader } from '../ui/page-header';
import { StatCard } from '../ui/stat-card';
import { EmptyState } from '../ui/empty-state';

interface CalendarEvent {
    id: number;
    title: string;
    pack: string | null;
    category: string | null;
    dueDate: string;
    status: string;
    overdue: boolean;
}

interface ComplianceCalendarProps {
    user: any;
    events: CalendarEvent[];
    upcoming: CalendarEvent[];
    summary: { events: number; overdue: number; dueThisMonth: number };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function eventToneClass(event: CalendarEvent): string {
    if (event.status === 'compliant') {
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
    }
    if (event.overdue) {
        return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300';
    }
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
}

export default function ComplianceCalendar({ user, events, upcoming, summary }: ComplianceCalendarProps) {
    const { t } = useLanguage();
    const today = useMemo(() => new Date(), []);
    const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        events.forEach((event) => {
            if (!map[event.dueDate]) {
                map[event.dueDate] = [];
            }
            map[event.dueDate].push(event);
        });
        return map;
    }, [events]);

    const grid = useMemo(() => {
        const firstDay = new Date(cursor.year, cursor.month, 1);
        const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
        const startOffset = firstDay.getDay();
        const cells: (number | null)[] = [];
        for (let index = 0; index < startOffset; index += 1) {
            cells.push(null);
        }
        for (let day = 1; day <= daysInMonth; day += 1) {
            cells.push(day);
        }
        return cells;
    }, [cursor]);

    const isToday = (day: number) =>
        cursor.year === today.getFullYear() && cursor.month === today.getMonth() && day === today.getDate();

    const changeMonth = (delta: number) => {
        setCursor((current) => {
            const next = new Date(current.year, current.month + delta, 1);
            return { year: next.getFullYear(), month: next.getMonth() };
        });
    };

    return (
        <DashboardLayout user={user} activeTab="compliance-calendar">
            <div className="space-y-6">
                <PageHeader
                    title={t('Compliance Calendar')}
                    description={t('View compliance deadlines and upcoming renewals on a calendar.')}
                    actions={
                        <Button variant="outline" onClick={() => router.visit('/compliance/export')}>
                            <Download className="mr-1 h-4 w-4" /> {t('Export')}
                        </Button>
                    }
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label={t('Compliance Items')} value={summary.events} icon={ListChecks} tone="info" />
                    <StatCard label={t('Overdue')} value={summary.overdue} icon={FileClock} tone="danger" />
                    <StatCard label={t('Due This Month')} value={summary.dueThisMonth} icon={ShieldCheck} tone="warning" />
                    <StatCard label={t('Upcoming Deadlines')} value={upcoming.length} icon={Clock} tone="success" />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <CardTitle className="text-lg">
                                    {new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
                                        new Date(cursor.year, cursor.month, 1),
                                    )}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => changeMonth(-1)}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}
                                    >
                                        {t('Today')}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => changeMonth(1)}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500/80" /> {t('Compliant')}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-rose-500/80" /> {t('Overdue')}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-amber-500/80" /> {t('Pending')}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-7 gap-px rounded-lg border bg-muted">
                                {DAY_NAMES.map((day) => (
                                    <div
                                        key={day}
                                        className="bg-background px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                                    >
                                        {day}
                                    </div>
                                ))}
                                {grid.map((day, index) => {
                                    if (day === null) {
                                        return <div key={`empty-${index}`} className="min-h-20 bg-background" />;
                                    }
                                    const dateKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const dayEvents = eventsByDate[dateKey] ?? [];
                                    return (
                                        <div
                                            key={day}
                                            className={`min-h-20 space-y-1 bg-background p-1.5 ${
                                                isToday(day) ? 'ring-1 ring-inset ring-primary' : ''
                                            }`}
                                        >
                                            <span
                                                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                                                    isToday(day)
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                {day}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <div className="space-y-1">
                                                    {dayEvents.slice(0, 3).map((event) => (
                                                        <div
                                                            key={event.id}
                                                            title={event.title}
                                                            className={`truncate rounded px-1 py-0.5 text-[11px] leading-tight ${eventToneClass(event)}`}
                                                        >
                                                            {event.title}
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 3 && (
                                                        <p className="px-1 text-[11px] text-muted-foreground">
                                                            +{dayEvents.length - 3} {t('more')}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Upcoming Deadlines')}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {upcoming.length === 0 ? (
                                <EmptyState title={t('No compliance items due.')} icon={CheckCircle2} />
                            ) : (
                                <ul className="space-y-3">
                                    {upcoming.map((event) => (
                                        <li key={event.id} className="rounded-lg border p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-sm font-medium">{event.title}</p>
                                                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                    {event.dueDate}
                                                </span>
                                            </div>
                                            {event.pack && (
                                                <p className="mt-1 text-xs text-muted-foreground">{event.pack}</p>
                                            )}
                                            {event.status === 'compliant' && (
                                                <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle2 className="mr-1 inline h-3 w-3" /> {t('Compliant')}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}