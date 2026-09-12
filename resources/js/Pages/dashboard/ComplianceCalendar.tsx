import { useLanguage } from '../../i18n/LanguageProvider';
import { useMemo, useState } from 'react';
import {
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    FileClock,
    ListChecks,
    ShieldCheck,
} from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

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

    const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
        new Date(cursor.year, cursor.month, 1),
    );

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
            <div className="max-w-7xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        <CalendarDays className="mr-2 inline-block h-6 w-6 text-primary" />
                        {t('Compliance Calendar')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('View compliance deadlines and upcoming renewals on a calendar.')}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Compliance Items')}</p>
                                <p className="text-2xl font-bold">{summary.events}</p>
                            </div>
                            <ListChecks className="h-5 w-5 text-primary" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Overdue')}</p>
                                <p className="text-2xl font-bold text-rose-600">{summary.overdue}</p>
                            </div>
                            <FileClock className="h-5 w-5 text-rose-600" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Due This Month')}</p>
                                <p className="text-2xl font-bold">{summary.dueThisMonth}</p>
                            </div>
                            <ShieldCheck className="h-5 w-5 text-amber-600" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Upcoming Deadlines')}</p>
                                <p className="text-2xl font-bold">{upcoming.length}</p>
                            </div>
                            <Clock className="h-5 w-5 text-emerald-600" />
                        </CardContent>
                    </Card>
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
                                        onClick={() =>
                                            setCursor({ year: today.getFullYear(), month: today.getMonth() })
                                        }
                                    >
                                        {t('Today')}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => changeMonth(1)}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
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
                                                            className={`truncate rounded px-1 py-0.5 text-[11px] leading-tight ${
                                                                event.status === 'compliant'
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                                    : event.overdue
                                                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                                                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                                            }`}
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

                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Upcoming Deadlines')}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {upcoming.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        {t('No compliance items due.')}
                                    </p>
                                ) : (
                                    <ul className="space-y-3">
                                        {upcoming.map((event) => (
                                            <li key={event.id} className="rounded-lg border p-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-sm font-medium">{event.title}</p>
                                                    <Badge variant="outline">{event.dueDate}</Badge>
                                                </div>
                                                {event.pack && (
                                                    <p className="mt-1 text-xs text-muted-foreground">{event.pack}</p>
                                                )}
                                                {event.status === 'compliant' && (
                                                    <Badge variant="default" className="mt-2">
                                                        <CheckCircle2 className="mr-1 h-3 w-3" /> {t('Compliant')}
                                                    </Badge>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
