import { Head, Link } from '@inertiajs/react';
import { useCallback, useMemo, useState } from 'react';
import { localizeWebsiteContent, WebsiteContent, websiteThemes } from '../utils/websiteCmsContent';
import { useLanguage } from '../i18n/LanguageProvider';
import TemplateFourHome from './website/TemplateFourHome';
import TemplateFiveHome from './website/TemplateFiveHome';
import TemplateOneHome from './website/TemplateOneHome';
import TemplateTwoHome from './website/TemplateTwoHome';
import TemplateThreeHome from './website/TemplateThreeHome';

export interface PublishedPage {
    id: number;
    title: string;
    slug: string;
}

export interface CurrentUser {
    id: number;
    name: string;
    email: string;
    role?: string;
    organization_id?: number;
}

interface HomeProps {
    websiteContent?: Partial<WebsiteContent> | null;
    user?: CurrentUser | null;
    publishedPages?: PublishedPage[];
    menuPages?: PublishedPage[];
}

export default function Home({ websiteContent, user, publishedPages, menuPages }: HomeProps) {
    const { locale } = useLanguage();
    const cmsContent = useMemo(() => localizeWebsiteContent(websiteContent, locale), [websiteContent, locale]);
    const pages = publishedPages ?? [];
    const navPages = menuPages ?? pages;

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [dirtyFields, setDirtyFields] = useState<Record<string, any>>({});
    const [draftCms, setDraftCms] = useState<Partial<WebsiteContent>>({});

    const handleFieldChange = useCallback((field: string, value: any) => {
        setDraftCms((prev) => ({ ...prev, [field]: value }));
        setDirtyFields((prev) => ({ ...prev, [field]: true }));
    }, []);

    const remapForLocale = useCallback(
        (data: Record<string, any>): Record<string, any> => {
            if (locale === 'en') return data;
            const next: Record<string, any> = {};
            Object.keys(data).forEach((key) => {
                next[`${key}_${locale}`] = data[key];
            });
            return next;
        },
        [locale],
    );

    const handleArrayChange = useCallback((key: string, items: Array<Record<string, string>>) => {
        setDraftCms((prev) => ({ ...prev, [key]: items }));
        setDirtyFields((prev) => ({ ...prev, [key]: true }));
    }, []);

    const handleSaveSection = useCallback(
        async (sectionKey: string, data: Record<string, any>) => {
            setIsSaving(true);
            try {
                const csrfToken = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '');
                await fetch('/website-cms/section', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify({
                        section: sectionKey,
                        data: remapForLocale(data),
                    }),
                });
                setDirtyFields((prev) => {
                    const next = { ...prev };
                    delete next[sectionKey];
                    return next;
                });
            } catch (error) {
                console.error('Failed to save section:', error);
            } finally {
                setIsSaving(false);
            }
        },
        [remapForLocale],
    );

    const handleSaveAll = useCallback(async () => {
        const keys = Object.keys(dirtyFields);
        if (keys.length === 0) return;
        setIsSaving(true);
        try {
            const csrfToken = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '');
            await Promise.all(
                keys.map((sectionKey) => {
                    const data: Record<string, any> = {};
                    Object.keys(dirtyFields).forEach((k) => {
                        if (k === sectionKey || k in (draftCms as any)) {
                            data[k] = (draftCms as any)[k];
                        }
                    });
                    const payload = dirtyFields[sectionKey] === true ? draftCms : data;
                    return fetch('/website-cms/section', {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-XSRF-TOKEN': csrfToken,
                        },
                        body: JSON.stringify({
                            section: sectionKey,
                            data: remapForLocale(payload as Record<string, any>),
                        }),
                    });
                }),
            );
            setDirtyFields({});
            setDraftCms({});
            setIsEditing(false);
            window.location.reload();
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    }, [dirtyFields, draftCms, remapForLocale]);

    const handleDiscardAll = useCallback(() => {
        setDraftCms({});
        setDirtyFields({});
        setIsEditing(false);
    }, []);

    const hasDirtyFields = Object.keys(dirtyFields).length > 0;

    if (cmsContent.activeTemplate === 'template2') {
        return <TemplateTwoHome cmsContent={cmsContent} user={user} publishedPages={navPages} />;
    }

    if (cmsContent.activeTemplate === 'template3') {
        return <TemplateThreeHome cmsContent={cmsContent} user={user} publishedPages={navPages} />;
    }

    if (cmsContent.activeTemplate === 'template4') {
        return <TemplateFourHome cmsContent={cmsContent} user={user} publishedPages={navPages} />;
    }

    if (cmsContent.activeTemplate === 'template5') {
        const editingCms = { ...cmsContent, ...draftCms } as WebsiteContent;
        return (
            <>
                <TemplateFiveHome
                    cmsContent={editingCms}
                    user={user}
                    publishedPages={pages}
                    menuPages={navPages}
                    isEditing={isEditing}
                    onToggleEditing={() => setIsEditing((prev) => !prev)}
                    onFieldChange={handleFieldChange}
                    onArrayChange={handleArrayChange}
                    onSaveSection={handleSaveSection}
                    dirtyFields={dirtyFields}
                    isSaving={isSaving}
                />

                {isEditing && (
                    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-200 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] backdrop-blur-xl">
                        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-sm font-medium text-stone-700">
                                    {t('Editing Homepage')}

                                    {hasDirtyFields && (
                                        <span className="ml-2 text-xs text-amber-600">{t('unsaved changes')}</span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleDiscardAll}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                                >
                                    {t('Cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveAll}
                                    disabled={isSaving || !hasDirtyFields}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return <TemplateOneHome cmsContent={cmsContent} user={user} publishedPages={navPages} />;
}
