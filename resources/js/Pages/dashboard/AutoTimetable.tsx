import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Plus, Sparkles, X } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ClassOption {
    id: string;
    label: string;
    room_number: string | null;
}

interface TimetableRow {
    day: string;
    period_order: number;
    subject_id: string | null;
    subject: string;
    teacher_id: string | null;
    teacher: string;
    start_time: string;
    end_time: string;
    period_type: string;
    room_number: string;
}

interface DayProposal {
    day: string;
    rows: TimetableRow[];
}

interface AutoTimetableProps {
    user: any;
    classes: ClassOption[];
}

const WEEKDAYS: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
};

const DAY_OPTIONS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const typeBadge: Record<string, string> = {
    lecture: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    lab: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    activity: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    break: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function AutoTimetable(pageProps: AutoTimetableProps) {
    const { t } = useLanguage();
    const user = pageProps.user;
    const classes = pageProps.classes ?? [];

    const [classId, setClassId] = useState('');
    const [days, setDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
    const [periodsPerDay, setPeriodsPerDay] = useState('8');
    const [periodMinutes, setPeriodMinutes] = useState('45');
    const [startTime, setStartTime] = useState('09:00');
    const [breakPeriod, setBreakPeriod] = useState('4');
    const [generating, setGenerating] = useState(false);
    const [applying, setApplying] = useState(false);
    const [proposal, setProposal] = useState<DayProposal[] | null>(null);
    const [warning, setWarning] = useState('');
    const [applied, setApplied] = useState(false);

    const toggleDay = (day: string) => {
        setDays((current) =>
            current.includes(day)
                ? current.filter((d) => d !== day)
                : [...current, day].sort((a, b) => DAY_OPTIONS.indexOf(a) - DAY_OPTIONS.indexOf(b)),
        );
    };

    const generate = async (e: FormEvent) => {
        e.preventDefault();
        if (!classId || days.length === 0) return;
        setGenerating(true);
        setWarning('');
        setApplied(false);
        try {
            const res = await fetch('/auto-timetable/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': (window as any).csrfToken ?? '',
                },
                body: JSON.stringify({
                    class_id: classId,
                    periods_per_day: Number(periodsPerDay),
                    period_minutes: Number(periodMinutes),
                    start_time: startTime,
                    break_period: Number(breakPeriod),
                    days,
                }),
            });
            const data = await res.json();
            setProposal(data.proposal ?? null);
            if (!data.proposal || data.proposal.length === 0) {
                setWarning(t('No subjects are assigned to this class. Assign subjects from the academic setup first.'));
            }
        } catch {
            setWarning(t('Generation failed. Please try again.'));
        } finally {
            setGenerating(false);
        }
    };

    const apply = async (e: FormEvent) => {
        e.preventDefault();
        if (!proposal) return;
        setApplying(true);
        const entries = proposal.flatMap((day) =>
            day.rows.map((row) => ({
                day: row.day,
                period_order: row.period_order,
                subject_id: row.subject_id ?? undefined,
                teacher_id: row.teacher_id ?? undefined,
                start_time: row.start_time,
                end_time: row.end_time,
                period_type: row.period_type,
                room_number: row.room_number || undefined,
            })),
        );
        try {
            const res = await fetch('/auto-timetable/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': (window as any).csrfToken ?? '',
                },
                body: JSON.stringify({ class_id: classId, entries }),
            });
            if (res.redirected) {
                setApplied(true);
                setWarning('');
            } else {
                setWarning(t('Could not apply the timetable.'));
            }
        } catch {
            setWarning(t('Could not apply the timetable.'));
        } finally {
            setApplying(false);
        }
    };

    const totalSlots = proposal
        ? proposal.reduce((sum, day) => sum + day.rows.filter((r) => r.period_type !== 'break').length, 0)
        : 0;
    const conflictFree = proposal
        ? proposal.every((day) => day.rows.every((r) => r.subject !== '' && r.subject !== 'Free'))
        : false;

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <header className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-600 text-white">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Auto Timetable Generator')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Generate a conflict-free weekly timetable automatically.')}
                        </p>
                    </div>
                </header>

                {warning && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {warning}
                    </div>
                )}

                {applied && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {t('Timetable applied successfully. Visit the class time table to review.')}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Generation Settings')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={generate} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="lg:col-span-2">
                                    <Label>{t('Class')} *</Label>
                                    <Select
                                        value={classId}
                                        onValueChange={(v) => {
                                            setClassId(v);
                                            setProposal(null);
                                            setWarning('');
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select class')} />
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
                                    <Label>{t('Periods / Day')}</Label>
                                    <Select value={periodsPerDay} onValueChange={setPeriodsPerDay}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[6, 7, 8, 9, 10].map((n) => (
                                                <SelectItem key={n} value={String(n)}>
                                                    {n}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Break Period')}</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={9}
                                        value={breakPeriod}
                                        onChange={(e) => setBreakPeriod(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>{t('Period Length (min)')}</Label>
                                    <Input
                                        type="number"
                                        min={25}
                                        max={90}
                                        value={periodMinutes}
                                        onChange={(e) => setPeriodMinutes(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>{t('First Period')}</Label>
                                    <Input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>{t('Working Days')}</Label>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {DAY_OPTIONS.map((day) => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(day)}
                                            className={`rounded-full px-3 py-1.5 text-sm transition ${days.includes(day) ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
                                        >
                                            {t(WEEKDAYS[day])}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" disabled={generating || !classId || days.length === 0}>
                                    {generating ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="mr-2 h-4 w-4" />
                                    )}
                                    {t('Generate Timetable')}
                                </Button>
                                {proposal && proposal.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="text-green-600"
                                        onClick={apply}
                                        disabled={applying}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Apply to Class')}
                                    </Button>
                                )}
                            </div>

                            <p className="text-xs text-gray-400">
                                {t('Applying will replace existing timetable entries for this class.')}
                            </p>
                        </form>
                    </CardContent>
                </Card>

                {proposal && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                {t('Proposed Timetable')}
                                <span className="text-sm font-normal text-gray-400">
                                    · {t('Total periods')}: {totalSlots}
                                </span>
                                {conflictFree && (
                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                        {t('No teacher conflicts')}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {proposal.map((day) => (
                                <div key={day.day}>
                                    <div className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        {t(WEEKDAYS[day.day] ?? day.day)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                        {day.rows.map((row) => (
                                            <div
                                                key={`${day.day}-${row.period_order}`}
                                                className="rounded-lg border p-2 dark:border-gray-800"
                                            >
                                                <div className="mb-1 flex items-center justify-between gap-1">
                                                    <span className="text-xs font-medium text-gray-500">
                                                        {row.start_time} - {row.end_time}
                                                    </span>
                                                    <Badge className={typeBadge[row.period_type] ?? typeBadge.activity}>
                                                        {t(
                                                            row.period_type.charAt(0).toUpperCase() +
                                                                row.period_type.slice(1),
                                                        )}
                                                    </Badge>
                                                </div>
                                                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                    {row.subject}
                                                </div>
                                                {row.period_type !== 'break' && row.teacher && (
                                                    <div className="truncate text-xs text-gray-500">{row.teacher}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-end">
                                <Button onClick={apply} disabled={applying}>
                                    {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('Apply to Class')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
