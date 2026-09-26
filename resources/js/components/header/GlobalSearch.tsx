import { router } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, Users, School, Wallet, ShieldAlert, HeartPulse, Search } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';
import { buttonShineClasses } from '../../Pages/ui/button';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '../../Pages/ui/command';

interface SearchResult {
    id: string;
    type: string;
    name: string;
    subtitle: string;
    href: string;
}

type ResultGroups = Record<string, SearchResult[]>;

const GROUP_KEYS = ['students', 'staff', 'classes', 'fees', 'behavior', 'health'] as const;

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    student: GraduationCap,
    staff: Users,
    class: School,
    fee: Wallet,
    behavior: ShieldAlert,
    health: HeartPulse,
};

const GROUP_LABELS: Record<string, string> = {
    students: 'Students',
    staff: 'Staff',
    classes: 'Classes',
    fees: 'Fees',
    behavior: 'Behavior',
    health: 'Health',
};

const emptyGroups = (): ResultGroups => Object.fromEntries(GROUP_KEYS.map((k) => [k, []])) as ResultGroups;

export default function GlobalSearch() {
    const { t } = useLanguage();
    const [q, setQ] = useState('');
    const [results, setResults] = useState<ResultGroups>(emptyGroups);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const visit = useCallback((href: string) => {
        setOpen(false);
        setQ('');
        router.visit(href);
    }, []);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    useEffect(() => {
        const query = q.trim();

        if (!open || query.length < 1) {
            setResults(emptyGroups());
            setLoading(false);
            return;
        }

        setLoading(true);

        const timer = setTimeout(() => {
            fetch(`/global-search?q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } })
                .then((res) => res.json())
                .then((data) => {
                    setResults({
                        students: data.students ?? [],
                        staff: data.staff ?? [],
                        classes: data.classes ?? [],
                        fees: data.fees ?? [],
                        behavior: data.behavior ?? [],
                        health: data.health ?? [],
                    });
                })
                .catch(() => {
                    setResults(emptyGroups());
                })
                .finally(() => setLoading(false));
        }, 250);

        return () => clearTimeout(timer);
    }, [q, open]);

    const totalResults = GROUP_KEYS.reduce((sum, key) => sum + (results[key]?.length ?? 0), 0);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`dashboard-header-button ${buttonShineClasses} flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 shadow-sm transition md:w-64 lg:w-80`}
            >
                <Search className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                <span className="hidden w-full text-left text-sm text-[var(--muted-foreground)] md:inline">
                    {t('Search students / staff')}
                </span>
                <kbd className="pointer-events-none ml-auto hidden select-none rounded-md border border-[var(--border)] bg-[var(--background)] px-1.5 text-[10px] font-medium text-[var(--muted-foreground)] md:inline">
                    Ctrl+K
                </kbd>
            </button>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder={t('Search students / staff')} value={q} onValueChange={setQ} />
                <CommandList>
                    <CommandEmpty>{loading ? '' : t('No results found.')}</CommandEmpty>

                    {GROUP_KEYS.map((groupKey) => {
                        const items = results[groupKey];
                        if (!items?.length) return null;

                        const Icon = ICON_MAP[groupKey.replace(/s$/, '')] ?? Search;

                        return (
                            <CommandGroup key={groupKey} heading={t(GROUP_LABELS[groupKey])}>
                                {items.map((item) => (
                                    <CommandItem
                                        key={`${item.type}-${item.id}`}
                                        value={`${item.name} ${item.subtitle}`}
                                        onSelect={() => visit(item.href)}
                                    >
                                        <Icon className="h-4 w-4 shrink-0 opacity-60" />
                                        <span className="min-w-0 flex-1 truncate">
                                            <span className="font-medium text-[var(--foreground)]">{item.name}</span>
                                            {item.subtitle && (
                                                <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                                                    {item.subtitle}
                                                </span>
                                            )}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        );
                    })}
                </CommandList>
            </CommandDialog>
        </>
    );
}
