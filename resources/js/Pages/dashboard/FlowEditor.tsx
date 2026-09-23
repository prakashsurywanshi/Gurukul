import { useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { ArrowLeft, Eye, FileText, Save, Sparkles } from 'lucide-react';
import {
    type PlaceholderGroup,
    type TemplateCategory,
    type TemplateDesignSummary,
    twinPreviewDocWithSamples,
} from '../../components/designer/templateTypes';
import FlowContentEditor, { type FlowEditorApi } from '../../components/FlowContentEditor';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

const PX_PER_MM = 96 / 25.4;

interface FlowEditorProps {
    user: any;
    schoolName: string;
    template: TemplateDesignSummary | null;
    categories: TemplateCategory[];
    cardSizePresets: Record<string, [number, number] | null>;
    placeholderGroups: PlaceholderGroup[];
    standins: { avatar: string; qr: string; logo: string };
    editorTypes: string[];
    cardWidthMm: number;
    cardHeightMm: number;
    selectedCategory: string | null;
}

const PRESET_LABELS: Record<string, string> = {
    '': 'None (page flow)',
    cr80_portrait: 'CR80 Portrait (54 × 85.6 mm)',
    cr80_landscape: 'CR80 Landscape (85.6 × 54 mm)',
    a7_portrait: 'A7 Portrait (74 × 105 mm)',
    a7_landscape: 'A7 Landscape (105 × 74 mm)',
    a6_portrait: 'A6 Portrait (105 × 148 mm)',
    a6_landscape: 'A6 Landscape (148 × 105 mm)',
    a5_portrait: 'A5 Portrait (148 × 210 mm)',
    a5_landscape: 'A5 Landscape (210 × 148 mm)',
    a4_portrait: 'A4 Portrait (210 × 297 mm)',
    a4_landscape: 'A4 Landscape (297 × 210 mm)',
    a3_portrait: 'A3 Portrait (297 × 420 mm)',
    a3_landscape: 'A3 Landscape (420 × 297 mm)',
    custom: 'Custom size',
};

function detectPreset(
    width: number | null | undefined,
    height: number | null | undefined,
    presets: Record<string, [number, number] | null>,
): string {
    if (width == null || height == null) return '';
    for (const [key, dims] of Object.entries(presets)) {
        if (!dims) continue;
        if (Math.abs(dims[0] - width) < 0.6 && Math.abs(dims[1] - height) < 0.6) return key;
    }
    return 'custom';
}

export default function FlowEditor(pageProps: FlowEditorProps) {
    const flash = (usePage().props as any).flash ?? {};
    const template = pageProps.template;
    const presets = pageProps.cardSizePresets ?? {};
    const groups = pageProps.placeholderGroups ?? [];
    const standins = pageProps.standins;
    const categories = pageProps.categories ?? [];

    const editorApi = useRef<FlowEditorApi | null>(null);

    const [title, setTitle] = useState(template?.title ?? '');
    const [category, setCategory] = useState(template?.category ?? pageProps.selectedCategory ?? 'general');
    const [description, setDescription] = useState(template?.description ?? '');
    const [content, setContent] = useState(template?.content ?? '');

    const initialPreset = useMemo(
        () => (template ? detectPreset(template.cardWidthMm, template.cardHeightMm, presets) : 'a4_portrait'),
        [template, presets],
    );
    const [presetKey, setPresetKey] = useState(initialPreset);
    const [customW, setCustomW] = useState<number>(template?.cardWidthMm ?? pageProps.cardWidthMm);
    const [customH, setCustomH] = useState<number>(template?.cardHeightMm ?? pageProps.cardHeightMm);

    const [showPreview, setShowPreview] = useState(false);
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

    const resolvedSize = (): { width: number | null; height: number | null } => {
        if (presetKey === '') return { width: null, height: null };
        if (presetKey === 'custom') return { width: customW, height: customH };
        const dims = presets[presetKey];
        return dims ? { width: dims[0], height: dims[1] } : { width: customW, height: customH };
    };

    const size = resolvedSize();

    const previewW = Math.round((size.width ?? 210) * PX_PER_MM);
    const previewH = Math.round((size.height ?? 297) * PX_PER_MM);
    const previewScale = Math.max(
        0.1,
        Math.min(
            Math.min(win.w - 340, 560) / previewW,
            Math.min(win.h - 270, 720) / previewH,
            1,
        ),
    );
    const frameW = Math.round(previewW * previewScale);
    const frameH = Math.round(previewH * previewScale);

    const previewSrcDoc = useMemo(() => {
        const doc = twinPreviewDocWithSamples(content, standins);
        if (!doc) return '';
        return doc
            .replace(
                '</body>',
                '</div><script>(function(){var fit=function(){var d=document.documentElement,p=document.getElementById("pv");if(!p)return;var s=Math.min(d.clientWidth/p.scrollWidth,d.clientHeight/p.scrollHeight,1);if(s<1){p.style.width=p.scrollWidth+"px";p.style.height=p.scrollHeight+"px";p.style.zoom=s;}d.style.overflow="hidden";document.body.style.overflow="hidden";};if(document.readyState==="complete")fit();else window.addEventListener("load",fit);setTimeout(fit,60);setTimeout(fit,350);}());<\/script></body>',
            )
            .replace('<body>', '<body><div id="pv">');
    }, [content, standins]);

    const tokenCount = useMemo(() => (content.match(/\{\{[a-zA-Z0-9_]+\}\}/g) ?? []).length, [content]);

    const save = () => {
        router.post(
            template ? `/flow-editor/${template.id}` : '/flow-editor',
            {
                title,
                category,
                description: description || '',
                content,
                card_width_mm: size.width,
                card_height_mm: size.height,
                card_size_preset: presetKey,
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    const first = Object.values(errors)[0];
                    if (first) toast.error(String(first));
                },
            },
        );
    };

    const insertToken = (token: string) => editorApi.current?.insertToken(token);

    return (
        <DashboardLayout user={pageProps.user}>
            <div className="min-h-full bg-slate-50 p-6 dark:bg-slate-950">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                <FileText className="h-6 w-6 text-indigo-500" />
                                {template ? 'Customize Template' : 'New Flow Template'}
                            </h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Design your template in the rich-text editor below — the full page design with{' '}
                                <code className="rounded bg-slate-200 px-1 text-xs dark:bg-slate-800">{'{{token}}'}</code>{' '}
                                placeholders. {tokenCount} placeholder{tokenCount === 1 ? '' : 's'} currently in use.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => router.visit('/template-gallery')}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to gallery
                            </Button>
                            <Button variant="outline" onClick={() => setShowPreview(true)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                            </Button>
                            <Button onClick={save}>
                                <Save className="mr-2 h-4 w-4" />
                                {template ? 'Save' : 'Create'}
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                        <Card>
                            <CardContent className="space-y-4 p-5">
                                <div className="space-y-2">
                                    <Label htmlFor="tpl-title">Template Name</Label>
                                    <Input
                                        id="tpl-title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Template name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tpl-category">Category</Label>
                                    <select
                                        id="tpl-category"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                                    >
                                        {categories.map((c) => (
                                            <option key={c.key} value={c.key}>
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tpl-size">Physical Card Size</Label>
                                    <select
                                        id="tpl-size"
                                        value={presetKey}
                                        onChange={(e) => setPresetKey(e.target.value)}
                                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                                    >
                                        <option value="">{PRESET_LABELS['']}</option>
                                        {Object.keys(presets)
                                            .filter((k) => k !== 'custom')
                                            .map((k) => (
                                                <option key={k} value={k}>
                                                    {PRESET_LABELS[k] ?? k}
                                                </option>
                                            ))}
                                        <option value="custom">{PRESET_LABELS.custom}</option>
                                    </select>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {size.width == null
                                            ? 'No fixed size — prints as a page flow (like A4 paper).'
                                            : `Size: ${size.width} × ${size.height} mm`}
                                    </p>
                                </div>

                                {presetKey === 'custom' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="tpl-w">Width (mm)</Label>
                                            <Input
                                                id="tpl-w"
                                                type="number"
                                                min={20}
                                                max={600}
                                                value={customW}
                                                onChange={(e) => setCustomW(Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tpl-h">Height (mm)</Label>
                                            <Input
                                                id="tpl-h"
                                                type="number"
                                                min={20}
                                                max={600}
                                                value={customH}
                                                onChange={(e) => setCustomH(Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="tpl-desc">Description</Label>
                                    <Textarea
                                        id="tpl-desc"
                                        value={description ?? ''}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Short description shown in the gallery"
                                    />
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                                        <Sparkles className="h-4 w-4 text-indigo-500" />
                                        Available Placeholders
                                    </div>
                                    <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                                        {groups.map((group) => (
                                            <div key={group.group}>
                                                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                    {group.group}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {group.items.map((item) => (
                                                        <button
                                                            key={item.tag}
                                                            type="button"
                                                            onClick={() => insertToken(item.token)}
                                                            title={`Insert ${item.token}`}
                                                            className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                                        >
                                                            {item.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-5">
                                <FlowContentEditor
                                    value={content}
                                    onChange={setContent}
                                    apiRef={editorApi}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Preview — {title}</DialogTitle>
                        </DialogHeader>
                        {previewSrcDoc ? (
                            <div className="flex justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
                                <iframe
                                    title="Template preview"
                                    srcDoc={previewSrcDoc}
                                    style={{ width: frameW, height: frameH, border: 0, background: '#fff' }}
                                />
                            </div>
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-500">No content to preview yet.</p>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}