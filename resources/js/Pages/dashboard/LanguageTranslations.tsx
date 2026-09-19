import { Link, router } from '@inertiajs/react';
import { ArrowLeft, Loader2, Save, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import en from '../../i18n/en';
import hi from '../../i18n/hi';
import mr from '../../i18n/mr';
import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

const DICTIONARIES: Record<string, Record<string, string>> = { en, mr, hi };
const EDITABLE_LOCALES = ['en', 'mr', 'hi'] as const;
const PAGE_SIZE = 100;

interface LanguageTranslationsProps {
    user: any;
    languageSettings?: {
        languages?: Record<string, string>;
        manual_translations?: Record<string, Record<string, string>>;
    } | null;
}

interface EditEntry {
    en?: string;
    mr?: string;
    hi?: string;
}

export default function LanguageTranslations({ user, languageSettings }: LanguageTranslationsProps) {
    const { t } = useLanguage();
    const overrides = languageSettings?.manual_translations ?? {};
    const languages = languageSettings?.languages ?? { en: 'English', mr: 'मराठी (Marathi)', hi: 'हिन्दी (Hindi)' };

    const [edits, setEdits] = useState<Record<string, EditEntry>>({});
    const [query, setQuery] = useState('');
    const [missingOnly, setMissingOnly] = useState(false);
    const [page, setPage] = useState(0);
    const [saving, setSaving] = useState(false);

    const rows = useMemo(() => {
        return Object.keys(en)
            .sort((a, b) => a.localeCompare(b))
            .map((key) => ({
                key,
                values: {
                    en: overrides.en?.[key] ?? en[key] ?? key,
                    mr: overrides.mr?.[key] ?? mr[key] ?? '',
                    hi: overrides.hi?.[key] ?? hi[key] ?? '',
                },
            }));
    }, [overrides]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return rows.filter((row) => {
            if (missingOnly) {
                const missing = EDITABLE_LOCALES.some((locale) => row.values[locale] === '');
                if (!missing) return false;
            }
            if (!needle) return true;
            return [row.key, row.values.en, row.values.mr, row.values.hi].some((value) =>
                value.toLowerCase().includes(needle),
            );
        });
    }, [rows, query, missingOnly]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const visibleRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
    const rangeStart = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
    const rangeEnd = Math.min((safePage + 1) * PAGE_SIZE, filtered.length);
    const modifiedCount = Object.values(edits).reduce((count, entry) => {
        return (
            count +
            (entry.en !== undefined ? 1 : 0) +
            (entry.mr !== undefined ? 1 : 0) +
            (entry.hi !== undefined ? 1 : 0)
        );
    }, 0);

    useEffect(() => {
        setPage(0);
    }, [query, missingOnly]);

    const setEdit = (key: string, locale: (typeof EDITABLE_LOCALES)[number], value: string) => {
        setEdits((current) => {
            const next = { ...(current[key] ?? {}), [locale]: value };
            return { ...current, [key]: next };
        });
    };

    const displayValue = (key: string, locale: (typeof EDITABLE_LOCALES)[number]): string => {
        return edits[key]?.[locale] ?? overrides[locale]?.[key] ?? DICTIONARIES[locale][key] ?? '';
    };

    const isModified = (key: string, locale: (typeof EDITABLE_LOCALES)[number]): boolean =>
        edits[key]?.[locale] !== undefined;

    const saveTranslations = () => {
        const changes: { locale: string; key: string; value: string }[] = [];

        Object.entries(edits).forEach(([key, entry]) => {
            EDITABLE_LOCALES.forEach((locale) => {
                const editValue = (entry[locale] ?? '').trim();
                const defaultValue = DICTIONARIES[locale][key] ?? (locale === 'en' ? key : '');
                const overrideValue = overrides[locale]?.[key];
                const baseValue = overrideValue !== undefined ? overrideValue : defaultValue;
                const hasOverride = overrideValue !== undefined;

                if (editValue === baseValue) {
                    return;
                }
                if (editValue === defaultValue) {
                    if (hasOverride) {
                        changes.push({ locale, key, value: '' });
                    }
                    return;
                }
                changes.push({ locale, key, value: editValue });
            });
        });

        if (changes.length === 0) {
            toast.error(t('No changes to save.'));
            return;
        }

        setSaving(true);
        router.post(
            '/settings/language-translations',
            { translations: changes },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEdits({});
                    toast.success(t('Translations saved successfully.'));
                },
                onError: () => {
                    toast.error(t('Failed to save translations.'));
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="settings">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-6xl space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <Button asChild variant="outline" className="mb-4 gap-2">
                                <Link href="/settings">
                                    <ArrowLeft className="h-4 w-4" />
                                    {t('Back to Settings')}
                                </Link>
                            </Button>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Language Manual Entry')}</h1>
                            <p className="mt-1 max-w-2xl text-sm text-slate-600">
                                {t(
                                    'Add, edit or fix translations for the dashboard languages. English words are the keys and the other columns hold the translations.',
                                )}
                            </p>
                        </div>

                        <Button onClick={saveTranslations} disabled={saving || modifiedCount === 0} className="gap-2">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {t('Save Translations')}
                        </Button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-5">
                                <span className="text-sm text-slate-600">
                                    {t('Total Keys')}: <strong>{rows.length}</strong>
                                </span>
                                <span className="text-sm text-slate-600">
                                    {t('Modified')}: <strong>{modifiedCount}</strong>
                                </span>
                            </div>

                            <label className="flex w-fit items-center gap-2 text-sm text-slate-700">
                                <Checkbox
                                    checked={missingOnly}
                                    onCheckedChange={(checked) => setMissingOnly(Boolean(checked))}
                                />
                                {t('Show only missing translations')}
                            </label>
                        </div>

                        <div className="relative w-full sm:max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={t('Search')}
                                className="h-10 w-full pl-10 pr-9"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 transition"
                                    aria-label={t('Clear search')}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-900">
                                        <TableHead className="w-[22%] px-4 py-3">{t('KEYs')}</TableHead>
                                        {EDITABLE_LOCALES.map((locale) => (
                                            <TableHead key={locale} className="px-4 py-3">
                                                {languages[locale] ?? locale}
                                                <span className="ml-1 font-normal text-slate-400">
                                                    ({overrides[locale] ? Object.keys(overrides[locale]).length : 0})
                                                </span>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="px-4 py-10 text-center text-slate-500">
                                                {t('No translations found.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        visibleRows.map((row) => (
                                            <TableRow key={row.key}>
                                                <TableCell className="px-4 py-2 align-top">
                                                    <div
                                                        title={row.key}
                                                        className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-300"
                                                    >
                                                        {row.key}
                                                    </div>
                                                </TableCell>
                                                {EDITABLE_LOCALES.map((locale) => {
                                                    const modified = isModified(row.key, locale);
                                                    const baseIsMissing =
                                                        (overrides[locale]?.[row.key] ??
                                                            DICTIONARIES[locale][row.key] ??
                                                            '') === '';
                                                    return (
                                                        <TableCell key={locale} className="px-2 py-2">
                                                            <Input
                                                                value={displayValue(row.key, locale)}
                                                                onChange={(event) =>
                                                                    setEdit(row.key, locale, event.target.value)
                                                                }
                                                                placeholder={baseIsMissing ? '—' : undefined}
                                                                className={`h-8 ${
                                                                    modified
                                                                        ? 'border-blue-500 ring-1 ring-blue-500'
                                                                        : baseIsMissing
                                                                          ? 'border-dashed border-orange-300'
                                                                          : ''
                                                                }`}
                                                            />
                                                            {!modified && baseIsMissing && (
                                                                <div className="mt-0.5 text-[10px] text-orange-400">
                                                                    {t('Missing')}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {filtered.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <Label className="text-sm text-slate-500">
                                {t('Showing {start}-{end} of {total} keys', {
                                    start: rangeStart,
                                    end: rangeEnd,
                                    total: filtered.length,
                                })}
                            </Label>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={safePage === 0}
                                    onClick={() => setPage(safePage - 1)}
                                >
                                    {t('Previous')}
                                </Button>
                                <span className="text-sm text-slate-600">
                                    {safePage + 1}/{totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={safePage >= totalPages - 1}
                                    onClick={() => setPage(safePage + 1)}
                                >
                                    {t('Next')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
