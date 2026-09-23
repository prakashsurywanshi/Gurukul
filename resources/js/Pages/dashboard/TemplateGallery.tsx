import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';
import { Copy, FileText, LayoutGrid, Palette, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import {
    type TemplateCategory,
    type TemplateDesignSummary,
    thumbnailSrc,
    twinPreviewDocWithSamples,
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

interface PaginationInfo {
    page: number;
    perPage: number;
    total: number;
    lastPage: number;
}

interface TemplateGalleryProps {
    user: any;
    schoolName: string;
    categories: TemplateCategory[];
    templates: TemplateDesignSummary[];
    pagination: PaginationInfo;
    filters: { category: string | null; search: string };
    placeholderGroups: unknown;
    cardSizePresets: Record<string, [number, number] | null>;
    standins: { avatar: string; qr: string; logo: string };
}

export default function TemplateGallery(pageProps: TemplateGalleryProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const user = pageProps.user;
    const categories = pageProps.categories ?? [];
    const templates = pageProps.templates ?? [];
    const pagination = pageProps.pagination ?? { page: 1, perPage: 10, total: 0, lastPage: 1 };
    const filters = pageProps.filters ?? { category: null, search: '' };

    const [activeCategory, setActiveCategory] = useState<string | null>(filters.category);
    const [search, setSearch] = useState(filters.search);
    const [preview, setPreview] = useState<TemplateDesignSummary | null>(null);
    const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
    const [confirmDelete, setConfirmDelete] = useState<TemplateDesignSummary | null>(null);
    const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight });

    useEffect(() => {
        const onResize = () => setWin({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const totals = useMemo(
        () => ({ total: pagination.total ?? 0, last: pagination.lastPage ?? 1 }),
        [pagination],
    );

    const applyFilters = (category: string | null, term: string, page = 1) => {
        const params: Record<string, string> = { page: String(page) };
        if (category) params.category = category;
        if (term.trim()) params.search = term.trim();
        router.get('/template-gallery', params, { preserveState: true, replace: true });
    };

    const selectCategory = (key: string | null) => {
        setActiveCategory(key);
        applyFilters(key, search);
    };

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(activeCategory, search);
    };

    const useTemplate = (template: TemplateDesignSummary) => {
        router.post(`/template-gallery/use/${template.id}`, {}, {
            preserveScroll: true,
            onSuccess: () => setPreview(null),
        });
    };

    const isFlowTemplate = (template: TemplateDesignSummary): boolean =>
        template.editorType === 'flow' ||
        (!!template.content && !template.content.includes('cd-page'));

    const openInDesigner = (template: TemplateDesignSummary) => {
        // Flow templates edit in the rich-text Customize editor (and fall
        // back to a twin check for rows saved before editor_type existed).
        if (isFlowTemplate(template)) {
            router.visit(`/flow-editor/${template.id}`);
            return;
        }
        router.visit(`/canvas-designer/${template.id}`);
    };

    const duplicateTemplate = (template: TemplateDesignSummary) => {
        router.post(
            isFlowTemplate(template)
                ? `/flow-editor/${template.id}/duplicate`
                : `/canvas-designer/${template.id}/duplicate`,
            {},
            { preserveScroll: true },
        );
    };

    const deleteTemplate = (template: TemplateDesignSummary) => {
        router.delete(`/canvas-designer/${template.id}`, {
            onSuccess: () => setConfirmDelete(null),
        });
    };

    const thumb = (template: TemplateDesignSummary) => thumbnailSrc(template);

    const openPreview = (template: TemplateDesignSummary) => {
        setPreviewSide('front');
        setPreview(template);
    };

    const previewTwin = preview ? (previewSide === 'back' && preview.backContent ? preview.backContent : preview.content) : null;
    // Skip the iframe for genuinely empty skeletons (an empty page renders a
    // confusing blank document) and for back faces that have no twin.
    const twinHasContent = (twin: string | null | undefined): boolean => {
        if (!twin) return false;
        const inner = twin
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<(script|head|meta|link)\b[\s\S]*?(<\/\1>|>)/gi, '');
        return /<img\b/i.test(inner) || inner.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length > 0;
    };
    const showPreviewTwin = twinHasContent(previewTwin);
    const previewW = Math.round((preview?.cardWidthMm ?? 54) * (96 / 25.4));
    const previewH = Math.round((preview?.cardHeightMm ?? 85.6) * (96 / 25.4));
    // Size the preview to fill the popup (leave room for the dialog chrome and
    // the action buttons below), never upscaling past the page's natural size.
    const previewScale = Math.max(
        0.1,
        Math.min(
            Math.min(win.w - 340, 460) / previewW,
            Math.min(win.h - 270, 640) / previewH,
            1,
        ),
    );
    const frameW = Math.round(previewW * previewScale);
    const frameH = Math.round(previewH * previewScale);
    // Wrap the twin in an auto-fit container so the whole design is always
    // visible: any page that overflows the card size (or the preview box) is
    // scaled down to fit instead of showing scrollbars inside the frame.
    const previewSrcDoc = showPreviewTwin
        ? twinPreviewDocWithSamples(previewTwin, pageProps.standins).replace(
              '</body>',
              '</div><script>(function(){var fit=function(){var d=document.documentElement,p=document.getElementById("pv");if(!p)return;var s=Math.min(d.clientWidth/p.scrollWidth,d.clientHeight/p.scrollHeight,1);if(s<1){p.style.width=p.scrollWidth+"px";p.style.height=p.scrollHeight+"px";p.style.zoom=s;}d.style.overflow="hidden";document.body.style.overflow="hidden";};if(document.readyState==="complete")fit();else window.addEventListener("load",fit);setTimeout(fit,60);setTimeout(fit,350);}());<\/script></body>',
          ).replace('<body>', '<body><div id="pv">')
        : ''

    return (
        <DashboardLayout user={user}>
            <div className="min-h-full bg-slate-50 p-6 dark:bg-slate-950">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                <LayoutGrid className="h-6 w-6 text-indigo-500" />
                                {t('Template Gallery')}
                            </h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {t('Pick a pre-built design, or start fresh. Every template can be adjusted in the Canvas Designer or the Flow Editor and then assigned as a default across your school.')}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => router.visit('/template-assignments')}>
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                {t('Default Templates')}
                            </Button>
                            <Button variant="outline" onClick={() => router.visit('/flow-editor')}>
                                <FileText className="mr-2 h-4 w-4" />
                                {t('Flow Editor')}
                            </Button>
                            <Button onClick={() => router.visit('/canvas-designer')}>
                                <Palette className="mr-2 h-4 w-4" />
                                {t('Canvas Designer')}
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                        <button
                            onClick={() => selectCategory(null)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                                activeCategory === null
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                        >
                            {t('All')}
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category.key}
                                onClick={() => selectCategory(category.key)}
                                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                                    activeCategory === category.key
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                            >
                                {category.label}
                                <span className="ml-1.5 opacity-70">{category.count}</span>
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submitSearch} className="flex items-center gap-2">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('Search templates')}
                                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                            />
                        </div>
                        <Button type="submit" variant="outline">{t('Search')}</Button>
                    </form>

                    {templates.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500">{t('No templates match your search.')}</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <Button variant="outline" onClick={() => router.visit('/flow-editor')}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    {t('Flow Editor')}
                                </Button>
                                <Button onClick={() => router.visit('/canvas-designer')}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('Canvas Designer')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {templates.map((template) => (
                                <Card key={template.id} className="group overflow-hidden">
                                    <CardContent className="p-0">
<button
                                                    onClick={() => openPreview(template)}
                                                    className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800"
                                                >
                                            {thumb(template) ? (
                                                <img
                                                    src={thumb(template)!}
                                                    alt={template.title}
                                                    onError={thumbWithFallback}
                                                    className="h-full w-full object-contain"
                                                />
                                            ) : (
                                                <span className="text-xs text-slate-400">Preview</span>
                                            )}
                                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/0 text-xs font-medium text-white opacity-0 transition group-hover:bg-slate-900/30 group-hover:opacity-100">
                                                {t('Click to preview')}
                                            </span>
                                        </button>
                                        <div className="space-y-2 p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="truncate text-sm font-medium text-gray-900 dark:text-white" title={template.title}>
                                                    {template.title}
                                                </p>
                                                <span
                                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                                        template.isSystem
                                                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200'
                                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                                                    }`}
                                                >
                                                    {template.isSystem ? t('System') : t('My Templates')}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-slate-400">{template.categoryLabel ?? template.category}</span>
                                                <div className="flex items-center gap-1">
                                                    <Button size="sm" variant="default" onClick={() => useTemplate(template)}>
                                                        {t('Use this template')}
                                                    </Button>
                                                    {!template.isSystem && (
                                                        <>
                                                            <Button size="sm" variant="outline" onClick={() => openInDesigner(template)}>
                                                                {t('Edit')}
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                title={t('Duplicate')}
                                                                onClick={() => duplicateTemplate(template)}
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => setConfirmDelete(template)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {totals.last > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <Button
                                variant="outline"
                                disabled={pagination.page <= 1}
                                onClick={() => applyFilters(activeCategory, search, pagination.page - 1)}
                            >
                                ‹ {t('Prev')}
                            </Button>
                            <span className="text-sm text-slate-500">
                                {pagination.page} / {totals.last}
                            </span>
                            <Button
                                variant="outline"
                                disabled={pagination.page >= totals.last}
                                onClick={() => applyFilters(activeCategory, search, pagination.page + 1)}
                            >
                                {t('Next')} ›
                            </Button>
                        </div>
                    )}
                </div>

                <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
                    <DialogContent
                        className="sm:max-w-xl"
                        style={{ maxWidth: Math.min(win.w - 48, Math.max(420, Math.min(704, frameW + 240))) }}
                    >
                        <DialogHeader>
                            <DialogTitle>{t('Template Preview')}</DialogTitle>
                            <DialogDescription>
                                {preview?.title}
                                {preview?.categoryLabel ?? preview?.category
                                    ? ` · ${preview.categoryLabel ?? preview.category}`
                                    : ''}
                                {preview?.cardWidthMm && preview?.cardHeightMm
                                    ? ` · ${preview.cardWidthMm} × ${preview.cardHeightMm} mm`
                                    : ''}
                            </DialogDescription>
                        </DialogHeader>
                        {preview && (
                            <div className="flex flex-col items-center gap-4">
                                {preview.backContent && (
                                    <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                        {(['front', 'back'] as const).map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setPreviewSide(s)}
                                                className={`px-3 py-1 text-xs font-semibold ${
                                                    previewSide === s
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300'
                                                }`}
                                            >
                                                {s === 'front' ? t('Front') : t('Back')}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="mx-auto w-fit min-w-0 max-w-full overflow-hidden rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70 dark:bg-slate-800/60 dark:ring-slate-700">
                                    {showPreviewTwin ? (
                                        <div
                                            className="relative shrink-0 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                                            style={{ width: Math.max(1, frameW), height: Math.max(1, frameH) }}
                                        >
                                            <iframe
                                                title={`${preview.title} design preview`}
                                                srcDoc={previewSrcDoc}
                                                sandbox="allow-scripts"
                                                style={{ width: previewW, height: previewH, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}
                                                className="absolute left-0 top-0 block border-0"
                                            />
                                        </div>
                                    ) : thumb(preview) ? (
                                        <img
                                            src={thumb(preview)!}
                                            alt={preview.title}
                                            onError={thumbWithFallback}
                                            className="max-h-[60vh] w-auto max-w-[65vw] object-contain"
                                        />
                                    ) : (
                                        <span className="px-6 py-10 text-sm text-slate-400">No preview</span>
                                    )}
                                </div>
                                <div className="flex w-full flex-wrap justify-center gap-2">
                                    <Button variant="outline" onClick={() => openInDesigner(preview)}>
                                        {t('Edit')}
                                    </Button>
                                    <Button onClick={() => useTemplate(preview)}>{t('Use this template')}</Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('Delete template')}</DialogTitle>
                            <DialogDescription>
                                {t('Are you sure you want to delete')} “{confirmDelete?.title}”?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                                {t('Cancel')}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => confirmDelete && deleteTemplate(confirmDelete)}
                            >
                                {t('Delete')}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}