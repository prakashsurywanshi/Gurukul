import { useLanguage } from '../../i18n/LanguageProvider';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { Globe, Eye, Loader2, Save, AlertTriangle } from 'lucide-react';
import { Component, ErrorInfo, ReactNode, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import TemplateTwoHome from '../website/TemplateTwoHome';
import TemplateThreeHome from '../website/TemplateThreeHome';
import TemplateFourHome from '../website/TemplateFourHome';
import TemplateFiveHome from '../website/TemplateFiveHome';
import TemplateOneHome from '../website/TemplateOneHome';
import {
    normalizeWebsiteContent,
    normalizeWebsiteCmsContent,
    WebsiteCmsContent,
    WebsiteContent,
} from '../../utils/websiteCmsContent';

class TemplateErrorBoundary extends Component<
    { children: ReactNode; fallback: ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: ReactNode; fallback: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Template rendering error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

interface WebsiteCmsEditorProps {
    user: any;
    websiteContent?: Partial<WebsiteContent> | Partial<WebsiteCmsContent> | null;
    publishedPages?: Array<{ id?: number; title: string; slug: string }>;
}

export default function WebsiteCmsEditor({ user, websiteContent, publishedPages = [] }: WebsiteCmsEditorProps) {
    const { t, settings } = useLanguage();
    const [content, setContent] = useState<WebsiteCmsContent>(() => {
        return normalizeWebsiteCmsContent(websiteContent);
    });

    const [isEditing, setIsEditing] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [pages, setPages] = useState(publishedPages);

    const cmsContent = useMemo(() => normalizeWebsiteContent(content), [content]);

    const activeTemplate = content.activeTemplate || 'template1';
    const templateKey = activeTemplate as keyof Pick<
        WebsiteCmsContent,
        'template1' | 'template2' | 'template3' | 'template4' | 'template5'
    >;

    const translationLocales = Object.keys(settings?.languages ?? {}).filter((code) => code !== 'en');

    const templateTranslations = useMemo(() => {
        const group = content[templateKey] as Record<string, unknown> | undefined;
        if (!group || typeof group !== 'object') {
            return {};
        }

        const map: Record<string, Record<string, string>> = {};
        Object.entries(group).forEach(([key, value]) => {
            translationLocales.forEach((locale) => {
                const suffix = `_${locale}`;
                if (key.endsWith(suffix) && typeof value === 'string') {
                    const baseKey = key.slice(0, -suffix.length);
                    map[baseKey] = { ...(map[baseKey] ?? {}), [locale]: value };
                }
            });
        });
        return map;
    }, [content, templateKey, translationLocales]);

    const handleTranslationChange = useCallback(
        (fieldKey: string, locale: string, value: string) => {
            setContent((prev) => ({
                ...prev,
                [templateKey]: {
                    ...((prev[templateKey] as Record<string, unknown>) || {}),
                    [`${fieldKey}_${locale}`]: value,
                },
            }));
            setHasChanges(true);
        },
        [templateKey],
    );

    const handleFieldChange = useCallback(
        (key: string, value: string) => {
            setContent((prev) => ({
                ...prev,
                [templateKey]: {
                    ...((prev[templateKey] as Record<string, any>) || {}),
                    [key]: value,
                },
            }));
            setHasChanges(true);
        },
        [templateKey],
    );

    const handleArrayChange = useCallback(
        (key: string, items: Array<Record<string, string>>) => {
            setContent((prev) => ({
                ...prev,
                [templateKey]: {
                    ...((prev[templateKey] as Record<string, any>) || {}),
                    [key]: items,
                },
            }));
            setHasChanges(true);
        },
        [templateKey],
    );

    const handleSaveSection = useCallback(async (sectionKey: string, data: Record<string, any>) => {
        setIsSaving(true);
        try {
            await axios.patch('/website-cms/section', {
                section: sectionKey,
                data,
            });
            toast.success(`Section saved successfully.`);
            setHasChanges(false);
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to save section.';
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    }, []);

    const handleSaveAll = useCallback(async () => {
        setIsSaving(true);
        try {
            router.patch('/website-cms', content, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('All changes saved successfully.');
                    setHasChanges(false);
                },
                onError: () => {
                    toast.error('Failed to save changes.');
                },
                onFinish: () => {
                    setIsSaving(false);
                },
            });
        } catch {
            toast.error('Failed to save changes.');
            setIsSaving(false);
        }
    }, [content]);

    const editingProps = {
        isEditing,
        onFieldChange: handleFieldChange,
        onArrayChange: handleArrayChange,
        onSaveSection: handleSaveSection,
        isSaving,
        publishedPages: pages,
        onPublishedPagesChange: setPages,
        translations: templateTranslations,
        onTranslationChange: handleTranslationChange,
    };

    const renderTemplate = () => {
        switch (activeTemplate) {
            case 'template2':
                return <TemplateTwoHome cmsContent={cmsContent} {...editingProps} />;
            case 'template3':
                return <TemplateThreeHome cmsContent={cmsContent} {...editingProps} />;
            case 'template4':
                return <TemplateFourHome cmsContent={cmsContent} {...editingProps} />;
            case 'template5':
                return <TemplateFiveHome cmsContent={cmsContent} {...editingProps} />;
            default:
                return <TemplateOneHome cmsContent={cmsContent} {...editingProps} />;
        }
    };

    return (
        <DashboardLayout user={user} activeTab="website-cms">
            <Head title={t('Website CMS Editor')} />

            {/* Floating toolbar */}
            <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-[var(--border)] dark:bg-[var(--card)]">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 border-r border-slate-200 pr-3 dark:border-[var(--border)]">
                        <Globe className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-slate-900 dark:text-[var(--foreground)]">
                            {t('CMS Editor —')}
                            {activeTemplate.replace('template', 'Template ')}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            isEditing
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        <Eye className="h-4 w-4" />
                        {isEditing ? t('Editing') : t('Preview')}
                    </button>

                    {hasChanges && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {t('Unsaved')}
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={handleSaveAll}
                        disabled={!hasChanges || isSaving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {isSaving ? t('Saving...') : t('Save All')}
                    </button>
                </div>
            </div>

            {/* Template preview */}
            <div className="min-h-screen bg-slate-50 dark:bg-[var(--background)]">
                <TemplateErrorBoundary
                    fallback={
                        <div className="flex min-h-screen items-center justify-center p-8">
                            <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
                                <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                                <h2 className="mb-2 text-lg font-bold text-slate-900">
                                    {t('Template Rendering Error')}
                                </h2>
                                <p className="mb-4 text-sm text-slate-600">
                                    {t('The')}
                                    {activeTemplate.replace('template', 'Template ')}
                                    {t(
                                        'component failed to render. Try switching to a different template or check the browser console for details.',
                                    )}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    {t('Reload Page')}
                                </button>
                            </div>
                        </div>
                    }
                >
                    {renderTemplate()}
                </TemplateErrorBoundary>
            </div>
        </DashboardLayout>
    );
}
