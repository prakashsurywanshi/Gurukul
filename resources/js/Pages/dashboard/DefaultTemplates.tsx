import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';
import { Check, Palette, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import {
    type TemplateCategory,
    type TemplateDesignSummary,
    type TemplateSlot,
    thumbnailSrc,
} from '../../components/designer/templateTypes';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';

const FALLBACK_THUMB =
    'data:image/svg+xml;base64,' +
    btoa('<svg xmlns="http://www.w3.org/2000/svg" width="210" height="297" viewBox="0 0 210 297"><rect width="210" height="297" fill="#f1f5f9"/><rect x="20" y="90" width="170" height="8" rx="4" fill="#cbd5e1"/><rect x="20" y="110" width="120" height="8" rx="4" fill="#e2e8f0"/><rect x="20" y="130" width="150" height="8" rx="4" fill="#e2e8f0"/></svg>');

function thumbWithFallback(onErrorTarget: React.SyntheticEvent<HTMLImageElement>) {
    const img = onErrorTarget.currentTarget;
    if (img.currentSrc !== FALLBACK_THUMB) img.src = FALLBACK_THUMB;
}

interface DefaultTemplatesProps {
    user: any;
    schoolName: string;
    slots: TemplateSlot[];
    ownTemplates: TemplateDesignSummary[];
    libraryTemplates: TemplateDesignSummary[];
    categories: TemplateCategory[];
}

export default function DefaultTemplates(pageProps: DefaultTemplatesProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const user = pageProps.user;
    const slots = pageProps.slots ?? [];
    const ownTemplates = pageProps.ownTemplates ?? [];
    const libraryTemplates = pageProps.libraryTemplates ?? [];
    const categories = pageProps.categories ?? [];

    const [pickerSlot, setPickerSlot] = useState<TemplateSlot | null>(null);
    const [pickerFilter, setPickerFilter] = useState<string | 'all' | 'mine'>('all');
    const [pickerSearch, setPickerSearch] = useState('');

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const pickerItems = useMemo(() => {
        const term = pickerSearch.trim().toLowerCase();
        let items = pickerFilter === 'mine' ? ownTemplates : [...ownTemplates, ...libraryTemplates];
        if (pickerFilter !== 'all' && pickerFilter !== 'mine') {
            items = items.filter((item) => item.category === pickerFilter);
        }
        if (term) {
            items = items.filter(
                (item) =>
                    (item.title ?? '').toLowerCase().includes(term) ||
                    (item.categoryLabel ?? item.category ?? '').toLowerCase().includes(term),
            );
        }
        return items;
    }, [pickerFilter, pickerSearch, ownTemplates, libraryTemplates]);

    const assign = (slot: TemplateSlot, template: TemplateDesignSummary) => {
        router.post('/template-assignments/assign', { slot: slot.key, template_id: template.id }, {
            preserveScroll: true,
            onSuccess: () => setPickerSlot(null),
        });
    };

    const reset = (slot: TemplateSlot) => {
        router.post('/template-assignments/reset', { slot: slot.key }, {
            preserveScroll: true,
        });
    };

    const thumb = (template: TemplateDesignSummary | null | undefined) =>
        template ? thumbnailSrc(template) : null;

    return (
        <DashboardLayout user={user}>
            <div className="min-h-full bg-slate-50 p-6 dark:bg-slate-950">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            <SlidersHorizontal className="h-6 w-6 text-indigo-500" />
                            {t('Default Templates')}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {t(
                                'Assign a design to every printable in your school. Unassigned outputs keep the system default.',
                            )}
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {slots.map((slot) => {
                            const template = slot.template ?? null;
                            const src = thumb(template);
                            return (
                                <Card key={slot.key} className="overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                                    {slot.label}
                                                </h3>
                                                <p className="mt-0.5 text-xs text-slate-400">{slot.module} · {slot.description}</p>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                                                {slot.category}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex items-center gap-4">
                                            <div className="flex aspect-[4/3] w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                                                {template && src ? (
                                                    <img src={src} alt={template.title} className="h-full w-full object-contain" />
                                                ) : (
                                                    <span className="px-2 text-center text-[11px] text-slate-400">
                                                        {t('Currently assigned')}: {t('No template assigned')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                {template ? (
                                                    <>
                                                        <p className="truncate font-medium text-gray-900 dark:text-white">{template.title}</p>
                                                        <p className="text-xs text-slate-400">
                                                            {template.categoryLabel ?? template.category}
                                                            {template.isSystem ? ' · System' : ' · School'}
                                                            {template.cardWidthMm ? ` · ${template.cardWidthMm}×${template.cardHeightMm} mm` : ''}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-slate-500">{t('No template assigned')}</p>
                                                )}
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Button size="sm" variant="default" onClick={() => setPickerSlot(slot)}>
                                                        {template ? t('Change') : t('Choose from gallery')}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            router.visit(`/canvas-designer?category=${slot.category}`)
                                                        }
                                                    >
                                                        <Palette className="mr-1.5 h-4 w-4" />
                                                        {t('Design new')}
                                                    </Button>
                                                    {template && (
                                                        <Button size="sm" variant="ghost" onClick={() => reset(slot)}>
                                                            <RotateCcw className="mr-1.5 h-4 w-4" />
                                                            {t('Reset to system default')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                <Dialog open={pickerSlot !== null} onOpenChange={(open) => !open && setPickerSlot(null)}>
                    <DialogContent className="sm:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>{pickerSlot?.label} — {t('Choose from gallery')}</DialogTitle>
                            <DialogDescription>
                                {pickerSlot?.description}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => setPickerFilter('all')}
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                                        pickerFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                >
                                    {t('All')}
                                </button>
                                <button
                                    onClick={() => setPickerFilter('mine')}
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                                        pickerFilter === 'mine' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                >
                                    {t('My Templates')}
                                </button>
                                {categories.map((category) => (
                                    <button
                                        key={category.key}
                                        onClick={() => setPickerFilter(category.key)}
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                                            pickerFilter === category.key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                        }`}
                                    >
                                        {category.label}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={pickerSearch}
                                    onChange={(e) => setPickerSearch(e.target.value)}
                                    placeholder={t('Search templates…')}
                                    className="h-8 w-48 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs dark:border-slate-700 dark:bg-slate-900"
                                />
                            </div>
                        </div>

                        <p className="pb-1 text-xs text-slate-400">
                            {pickerItems.length} {t('templates')}
                        </p>

                        <div className="grid max-h-[55vh] grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 overflow-y-auto pr-1">
                            {pickerItems.map((template) => {
                                const src = thumb(template);
                                const assigned = pickerSlot?.template?.id === template.id;
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => pickerSlot && assign(pickerSlot, template)}
                                        className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-400"
                                    >
                                        <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800">
                                            {src ? (
                                                <img
                                                    src={src}
                                                    alt={template.title}
                                                    loading="lazy"
                                                    onError={thumbWithFallback}
                                                    className="h-full w-full object-contain p-1"
                                                />
                                            ) : (
                                                <span className="text-[10px] text-slate-400">{t('Preview')}</span>
                                            )}
                                            <span
                                                className={`absolute left-1 top-1 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                                                    template.editorType === 'flow'
                                                        ? 'bg-indigo-600 text-white'
                                                        : template.editorType === 'fabric'
                                                          ? 'bg-amber-500 text-white'
                                                          : 'bg-slate-500 text-white'
                                                }`}
                                            >
                                                {template.editorType === 'flow'
                                                    ? t('Flow')
                                                    : template.editorType === 'fabric'
                                                      ? t('Canvas')
                                                      : t('Legacy')}
                                            </span>
                                        </div>
                                        <div className="flex flex-1 flex-col justify-between gap-1 p-2">
                                            <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-100" title={template.title}>
                                                {template.title}
                                            </p>
                                            <p className="truncate text-[10px] text-slate-400">
                                                {template.categoryLabel ?? template.category}
                                                {template.cardWidthMm ? ` · ${template.cardWidthMm}×${template.cardHeightMm} mm` : ''}
                                            </p>
                                        </div>
                                        {assigned && (
                                            <>
                                                <span className="absolute right-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                                                    {t('Default')}
                                                </span>
                                                <span className="absolute bottom-2 right-2">
                                                    <Check className="h-4 w-4 text-emerald-500" />
                                                </span>
                                            </>
                                        )}
                                    </button>
                                );
                            })}
                            {pickerItems.length === 0 && (
                                <p className="col-span-full flex flex-col items-center gap-2 py-8 text-center text-sm text-slate-500">
                                    {t('No templates match your search.')}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            router.visit(`/canvas-designer?category=${pickerSlot?.category ?? ''}`)
                                        }
                                    >
                                        {t('Design new')}
                                    </Button>
                                </p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}