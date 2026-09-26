import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ChevronRight, Clock3, Flag, Inbox, ListTodo } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';
import { Badge } from '../../Pages/ui/badge';
import { buttonShineClasses } from '../../Pages/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../Pages/ui/popover';

interface UpcomingTodo {
    id: string;
    title: string;
    dueDate: string;
    priority: 'Low' | 'Medium' | 'High';
}

interface TodoSummary {
    total: number;
    active: number;
    completed: number;
    dueToday: number;
    overdue: number;
    highPriority: number;
    upcoming: UpcomingTodo[];
}

interface TodoBellProps {
    active: boolean;
}

const priorityBadgeClass: Record<string, string> = {
    Low: 'bg-emerald-100 text-emerald-700',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-rose-100 text-rose-700',
};

function formatDate(dateKey: string): string {
    if (!dateKey) return '';
    try {
        return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
        });
    } catch {
        return dateKey;
    }
}

export default function TodoBell({ active }: TodoBellProps) {
    const { t } = useLanguage();
    const [summary, setSummary] = useState<TodoSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const refresh = () => {
        setLoading(true);
        fetch('/todo/summary', { headers: { Accept: 'application/json' } })
            .then((res) => (res.ok ? res.json() : Promise.resolve(null)))
            .then((data) => setSummary(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!open) return;
        refresh();
    }, [open]);

    const openTodo = () => {
        setOpen(false);
        router.visit('/todo');
    };

    const activeCount = summary?.active ?? 0;

    const insights = [
        { label: t('Total'), value: summary?.total ?? '—', active: false },
        { label: t('Pending'), value: activeCount, active: activeCount > 0 },
        { label: t('Completed'), value: summary?.completed ?? '—', active: false },
        { label: t('Due Today'), value: summary?.dueToday ?? '—', active: (summary?.dueToday ?? 0) > 0 },
        { label: t('Overdue'), value: summary?.overdue ?? '—', active: (summary?.overdue ?? 0) > 0 },
        { label: t('High Priority'), value: summary?.highPriority ?? '—', active: (summary?.highPriority ?? 0) > 0 },
    ];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={`dashboard-header-button ${buttonShineClasses} inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm shadow-sm transition ${
                        active
                            ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                            : 'bg-[var(--secondary)] text-[var(--foreground)]'
                    }`}
                    title={t('TO DO')}
                    aria-label={t('TO DO')}
                >
                    <ListTodo className="h-4 w-4" />
                    {activeCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                            {activeCount > 99 ? '99+' : activeCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent align="start" sideOffset={8} className="w-[calc(100vw-2rem)] max-w-sm p-0">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                        <ListTodo className="h-4 w-4 text-[var(--primary)]" />
                        {t('TO DO')}
                    </p>
                    <span className="text-xs text-[var(--muted-foreground)]">
                        {activeCount > 0 ? `${activeCount} ${t('Pending')}` : t('All caught up')}
                    </span>
                </div>

                <div className="max-h-80 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-2 px-4 py-4">
                        {insights.map((insight) => (
                            <div
                                key={insight.label}
                                className={`rounded-xl border border-[var(--border)] px-3 py-2 text-center ${
                                    insight.active ? 'bg-[var(--accent)]' : 'bg-[var(--card)]'
                                }`}
                            >
                                <p className="text-lg font-bold text-[var(--foreground)]">{insight.value}</p>
                                <p className="mt-0.5 truncate text-[11px] text-[var(--muted-foreground)]">
                                    {insight.label}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-[var(--border)] px-4 pb-2 pt-3">
                        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                            <Inbox className="h-3.5 w-3.5" />
                            {t('Upcoming')}
                        </p>

                        {loading && !summary ? (
                            <div className="px-2 py-4 text-center text-sm text-[var(--muted-foreground)]">…</div>
                        ) : summary && summary.upcoming.length > 0 ? (
                            summary.upcoming.map((todo) => (
                                <button
                                    key={todo.id}
                                    type="button"
                                    onClick={openTodo}
                                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[var(--accent)]"
                                >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--secondary)]">
                                        {todo.priority === 'High' ? (
                                            <Flag className="h-4 w-4 text-rose-500" />
                                        ) : (
                                            <Clock3 className="h-4 w-4 text-[var(--primary)]" />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                                            {todo.title}
                                        </span>
                                        <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                                            {formatDate(todo.dueDate)}
                                        </span>
                                    </span>
                                    <Badge className={`${priorityBadgeClass[todo.priority] ?? ''}`}>
                                        {todo.priority}
                                    </Badge>
                                </button>
                            ))
                        ) : (
                            <div className="px-2 py-4 text-center text-sm text-[var(--muted-foreground)]">
                                {t('No upcoming tasks.')}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={openTodo}
                    className="flex w-full items-center justify-center gap-1 border-t border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--primary)] transition hover:bg-[var(--accent)]"
                >
                    {t('Open Todo')}
                    <ChevronRight className="h-4 w-4" />
                </button>
            </PopoverContent>
        </Popover>
    );
}
