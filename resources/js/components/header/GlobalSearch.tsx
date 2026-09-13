import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Loader2, Search, GraduationCap, Users } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';
import { Popover, PopoverContent, PopoverTrigger } from '../../Pages/ui/popover';

interface SearchResult {
    id: string;
    type: 'student' | 'staff';
    name: string;
    subtitle: string;
    href: string;
}

type ResultGroups = { students: SearchResult[]; staff: SearchResult[] };

export default function GlobalSearch() {
    const { t } = useLanguage();
    const [q, setQ] = useState('');
    const [results, setResults] = useState<ResultGroups>({ students: [], staff: [] });
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const query = q.trim();

        if (query.length < 1) {
            setResults({ students: [], staff: [] });
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
                    });
                })
                .catch(() => {
                    setResults({ students: [], staff: [] });
                })
                .finally(() => setLoading(false));
        }, 250);

        return () => clearTimeout(timer);
    }, [q]);

    useEffect(() => {
        setOpen(q.trim().length >= 1);
    }, [q]);

    const visit = (href: string) => {
        setOpen(false);
        setQ('');
        router.visit(href);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const first = results.students[0] ?? results.staff[0];
        if (first) {
            visit(first.href);
        }
    };

    const hasResults = results.students.length > 0 || results.staff.length > 0;

    const renderResult = (item: SearchResult) => (
        <button
            key={item.type + item.id}
            type="button"
            onClick={() => visit(item.href)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[var(--accent)]"
        >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--secondary)] text-[var(--primary)]">
                {item.type === 'student' ? <GraduationCap className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </span>
            <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[var(--foreground)]">{item.name}</span>
                <span className="block truncate text-xs text-[var(--muted-foreground)]">{item.subtitle}</span>
            </span>
        </button>
    );

    return (
        <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild>
                <form
                    onSubmit={submit}
                    className="flex w-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 shadow-sm transition hover:bg-[var(--accent)] md:w-64 lg:w-80"
                >
                    <Search className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onFocus={() => setOpen(true)}
                        placeholder={t('Search students / staff')}
                        aria-label={t('Search students / staff')}
                        className="hidden w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] md:block"
                    />
                </form>
            </PopoverTrigger>

            <PopoverContent align="end" sideOffset={8} className="w-[calc(100vw-2rem)] max-w-md p-2">
                <div className="space-y-1">
                    <div className="md:hidden">
                        <form
                            onSubmit={submit}
                            className="flex items-center gap-2 rounded-lg bg-[var(--secondary)] px-3 py-2"
                        >
                            <Search className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                            <input
                                type="text"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder={t('Search students / staff')}
                                autoFocus
                                className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                            />
                        </form>
                    </div>

                    {loading && (
                        <div className="flex items-center gap-2 px-3 py-3 text-sm text-[var(--muted-foreground)]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                    )}

                    {!loading && q.trim().length >= 1 && !hasResults && (
                        <div className="px-3 py-4 text-center text-sm text-[var(--muted-foreground)]">
                            {t('No results found.')}
                        </div>
                    )}

                    {!loading && results.students.length > 0 && (
                        <div>
                            <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                                {t('Students')}
                            </p>
                            {results.students.map(renderResult)}
                        </div>
                    )}

                    {!loading && results.staff.length > 0 && (
                        <div>
                            <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                                {t('Staff')}
                            </p>
                            {results.staff.map(renderResult)}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
