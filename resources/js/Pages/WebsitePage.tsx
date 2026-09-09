import { useLanguage } from '../i18n/LanguageProvider';
import { Head, Link } from '@inertiajs/react';
import { GraduationCap, ArrowLeft, Save, X, Pencil } from 'lucide-react';
import { useState, useCallback } from 'react';
import { normalizeWebsiteContent, WebsiteContent } from '../utils/websiteCmsContent';
import type { CurrentUser } from './Home';
import TemplateFiveLayout from './website/TemplateFiveLayout';
import TemplateFiveSections from './website/TemplateFiveSections';
import RichTextEditor from '../components/RichTextEditor';

interface WebsitePageProps {
    page: {
        id: number;
        title: string;
        slug: string;
        content:
            | string
            | {
                  sections?: Array<{
                      id: string;
                      type: string;
                      data: Record<string, any>;
                  }>;
              }
            | null;
        meta_title: string | null;
        meta_keywords: string | null;
        meta_description: string | null;
        featured_image: string | null;
        banner_image: string | null;
        short_description: string | null;
        template: string | null;
    };
    websiteContent?: Partial<WebsiteContent> | null;
    publishedPages?: Array<{ id?: number; title: string; slug: string }>;
    menuPages?: Array<{ id?: number; title: string; slug: string }>;
    schoolName?: string | null;
    schoolLogo?: string | null;
    user?: CurrentUser | null;
    editingPageId?: number | null;
}

function isStructuredContent(content: any): content is {
    sections: Array<{ id: string; type: string; data: Record<string, any> }>;
} {
    return content && typeof content === 'object' && Array.isArray(content.sections);
}

function isRichTextContent(content: any): boolean {
    return typeof content === 'string' && content.length > 0;
}

export default function WebsitePage({
    page,
    websiteContent,
    publishedPages,
    menuPages,
    schoolName,
    schoolLogo,
    user,
    editingPageId,
}: WebsitePageProps) {
    const { t } = useLanguage();
    const cmsContent = normalizeWebsiteContent(websiteContent);
    const displayName = schoolName || cmsContent.brandName || 'Gurukul Institution';
    const pageTitle = page.meta_title || page.title;
    const isTemplateFive = page.template === 'template5' || cmsContent.activeTemplate === 'template5';

    const hasStructuredSections = isStructuredContent(page.content);
    const hasRichText = isRichTextContent(page.content);
    const richTextContent = hasRichText ? (typeof page.content === 'string' ? page.content : '') : '';

    const [isEditing, setIsEditing] = useState(!!editingPageId);
    const [sections, setSections] = useState<Array<{ id: string; type: string; data: Record<string, any> }>>(
        hasStructuredSections ? page.content.sections : [],
    );
    const [richTextValue, setRichTextValue] = useState(richTextContent);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const handleToggleEditing = useCallback(() => {
        setIsEditing((prev) => !prev);
    }, []);

    const handleSectionUpdate = useCallback((index: number, data: Record<string, any>) => {
        setSections((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], data };
            return updated;
        });
        setHasChanges(true);
    }, []);

    const handleSectionRemove = useCallback((index: number) => {
        setSections((prev) => prev.filter((_, i) => i !== index));
        setHasChanges(true);
    }, []);

    const handleSectionMove = useCallback((index: number, direction: 'up' | 'down') => {
        setSections((prev) => {
            const updated = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= updated.length) return prev;
            [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
            return updated;
        });
        setHasChanges(true);
    }, []);

    const handleSectionAdd = useCallback((type: string, data: Record<string, any>) => {
        const newSection = {
            id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type,
            data,
        };
        setSections((prev) => [...prev, newSection]);
        setHasChanges(true);
    }, []);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const csrfToken = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '');

            if (hasStructuredSections) {
                const response = await fetch(`/pages-builder/${page.id}/sections`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify({ sections }),
                });
                if (response.ok) {
                    setHasChanges(false);
                    setIsEditing(false);
                }
            } else if (hasRichText) {
                const response = await fetch(`/pages-builder/${page.id}/content`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify({ content: richTextValue }),
                });
                if (response.ok) {
                    setHasChanges(false);
                    setIsEditing(false);
                }
            }
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    }, [sections, richTextValue, hasStructuredSections, hasRichText, page.id]);

    const handleCancel = useCallback(() => {
        setSections(hasStructuredSections ? page.content.sections : []);
        setRichTextValue(richTextContent);
        setIsEditing(false);
        setHasChanges(false);
    }, [page.content, hasStructuredSections, richTextContent]);

    if (isTemplateFive) {
        return (
            <>
                <Head>
                    <title>{pageTitle}</title>
                    {page.meta_keywords && <meta name="keywords" content={page.meta_keywords} />}
                    {page.meta_description && <meta name="description" content={page.meta_description} />}
                    <meta property="og:title" content={pageTitle} />
                    {page.meta_description && <meta property="og:description" content={page.meta_description} />}
                    {(page.featured_image || page.banner_image) && (
                        <meta property="og:image" content={page.banner_image || page.featured_image} />
                    )}
                </Head>

                <TemplateFiveLayout
                    cmsContent={cmsContent}
                    activePageSlug={page.slug}
                    activePageId={page.id}
                    publishedPages={publishedPages}
                    menuPages={menuPages}
                    user={user}
                    isEditing={isEditing}
                    onToggleEditing={handleToggleEditing}
                >
                    {page.banner_image && (
                        <div className="relative aspect-[21/9] w-full overflow-hidden">
                            <img src={page.banner_image} alt={page.title} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#002147]/60 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 px-5 py-10 sm:px-8">
                                <div className="mx-auto max-w-7xl">
                                    <h1 className="text-3xl font-extrabold text-white drop-shadow-lg sm:text-5xl">
                                        {t(page.title)}
                                    </h1>
                                    {page.short_description && (
                                        <p className="mt-3 max-w-2xl text-lg text-white/90 drop-shadow">
                                            {page.short_description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {!page.banner_image && page.featured_image && (
                        <div className="relative aspect-[21/9] w-full overflow-hidden">
                            <img src={page.featured_image} alt={page.title} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#002147]/40 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 px-5 py-10 sm:px-8">
                                <div className="mx-auto max-w-7xl">
                                    <h1 className="text-3xl font-extrabold text-white sm:text-5xl">{t(page.title)}</h1>
                                    {page.short_description && (
                                        <p className="mt-3 max-w-2xl text-lg text-white/90">{page.short_description}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {!page.banner_image && !page.featured_image && (
                        <div className="bg-[#002147] px-5 py-10 sm:px-8">
                            <div className="mx-auto max-w-7xl">
                                <h1 className="text-3xl font-extrabold text-white sm:text-5xl">{t(page.title)}</h1>
                                {page.short_description && (
                                    <p className="mt-3 max-w-2xl text-lg text-white/80">{page.short_description}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {hasStructuredSections && (
                        <TemplateFiveSections
                            sections={sections}
                            isEditing={isEditing}
                            onSectionUpdate={handleSectionUpdate}
                            onSectionRemove={handleSectionRemove}
                            onSectionMove={handleSectionMove}
                            onSectionAdd={handleSectionAdd}
                            isSaving={isSaving}
                        />
                    )}

                    {hasRichText && (
                        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
                            {page.featured_image && !page.banner_image && (
                                <div className="mb-8">
                                    <img
                                        src={page.featured_image}
                                        alt={page.title}
                                        className="w-full max-w-2xl rounded-xl shadow-lg"
                                    />
                                </div>
                            )}
                            {isEditing ? (
                                <div className="rounded-xl border border-blue-200 bg-white shadow-sm">
                                    <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-2">
                                        <span className="text-xs font-medium text-blue-700">
                                            {t('Editing page content')}
                                        </span>
                                    </div>
                                    <div className="p-4">
                                        <RichTextEditor
                                            value={richTextValue}
                                            onChange={(val) => {
                                                setRichTextValue(val);
                                                setHasChanges(true);
                                            }}
                                            placeholder={t('Start writing your page content here...')}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="prose prose-slate prose-lg max-w-none
                    [&_h1]:text-[#002147] [&_h1]:font-extrabold
                    [&_h2]:text-[#002147] [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4
                    [&_h3]:text-[#002147] [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3
                    [&_p]:text-slate-700 [&_p]:leading-relaxed [&_p]:mb-4
                    [&_img]:rounded-xl [&_img]:shadow-md [&_img]:my-6 [&_img]:max-w-full
                    [&_table]:w-full [&_table]:border-collapse [&_table]:my-6
                    [&_th]:bg-[#002147] [&_th]:text-white [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold
                    [&_td]:border [&_td]:border-slate-200 [&_td]:px-4 [&_td]:py-3
                    [&_a]:text-[#2563EB] [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-[#2563EB]/40 [&_a]:hover:text-[#002147]
                    [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4
                    [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4
                    [&_li]:mb-1
                    [&_blockquote]:border-l-4 [&_blockquote]:border-[#2563EB] [&_blockquote]:bg-[#2563EB]/5 [&_blockquote]:py-3 [&_blockquote]:pl-5 [&_blockquote]:pr-4 [&_blockquote]:italic [&_blockquote]:my-6
                    [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-6
                    [&_code]:text-sm [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded"

                                    dangerouslySetInnerHTML={{
                                        __html: richTextContent,
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {!hasStructuredSections && !hasRichText && (
                        <div className="mx-auto max-w-7xl px-5 py-16 text-center">
                            <p className="text-slate-400 italic">{t('This page has no content yet.')}</p>
                        </div>
                    )}
                </TemplateFiveLayout>

                {isEditing && (hasStructuredSections || hasRichText) && (
                    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-200 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] backdrop-blur-xl">
                        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-sm font-medium text-stone-700">
                                    {t('Editing: {page}', { page: page.title })}
                                    {hasChanges && (
                                        <span className="ml-2 text-xs text-amber-600">{t('unsaved changes')}</span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                                >
                                    <X className="h-4 w-4" />
                                    {t('Cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving || !hasChanges}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save className="h-4 w-4" />
                                    {isSaving ? t('Saving...') : t('Save Changes')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    /* Non-template5 fallback */
    const contentHtml = hasRichText ? richTextContent : '';

    return (
        <>
            <Head>
                <title>{pageTitle}</title>
                {page.meta_keywords && <meta name="keywords" content={page.meta_keywords} />}
                {page.meta_description && <meta name="description" content={page.meta_description} />}
                <meta property="og:title" content={pageTitle} />
                {page.meta_description && <meta property="og:description" content={page.meta_description} />}
                {page.featured_image && <meta property="og:image" content={page.featured_image} />}
            </Head>

            <div className="min-h-screen bg-[#F0F4F8]">
                <header className="sticky top-0 z-50 border-b border-[#002147]/10 bg-white/90 backdrop-blur-xl shadow-sm">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
                        <Link href="/" className="flex items-center gap-3 transition hover:opacity-80">
                            {schoolLogo ? (
                                <img
                                    src={schoolLogo}
                                    alt={displayName}
                                    className="h-10 w-10 rounded-lg object-contain"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#002147]">
                                    <GraduationCap className="h-5 w-5 text-[#2563EB]" />
                                </div>
                            )}
                            <span className="text-lg font-bold text-[#002147]">{displayName}</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            {user && (
                                <button
                                    type="button"
                                    onClick={handleToggleEditing}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
                                        isEditing
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                            : 'border-[#002147]/15 bg-white text-[#002147] hover:bg-[#002147] hover:text-white'
                                    }`}
                                >
                                    {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                                    {isEditing ? t('Done Editing') : t('Edit Page')}
                                </button>
                            )}
                            <Link
                                href="/"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#002147]/15 bg-white px-3.5 py-2 text-sm font-medium text-[#002147] transition hover:bg-[#002147] hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('Back to Home')}</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {page.banner_image && (
                    <div className="relative aspect-[21/9] w-full overflow-hidden">
                        <img src={page.banner_image} alt={page.title} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#002147]/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 px-5 py-10 sm:px-8">
                            <div className="mx-auto max-w-5xl">
                                <h1 className="text-3xl font-extrabold text-white sm:text-5xl">{t(page.title)}</h1>
                                {page.short_description && (
                                    <p className="mt-3 max-w-2xl text-lg text-white/90">{page.short_description}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
                    <article className="overflow-hidden rounded-2xl border border-[#002147]/8 bg-white shadow-[0_4px_24px_rgba(0,33,71,0.06)]">
                        {page.featured_image && !page.banner_image && (
                            <div className="relative aspect-[21/9] w-full overflow-hidden">
                                <img
                                    src={page.featured_image}
                                    alt={page.title}
                                    className="h-full w-full object-cover"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-[#002147]/20 to-transparent" />
                            </div>
                        )}
                        {!page.banner_image && (
                            <div className="px-6 py-8 sm:px-10 sm:py-12">
                                <h1 className="mb-2 text-3xl font-extrabold leading-tight text-[#002147] sm:text-4xl">
                                    {t(page.title)}
                                </h1>
                                {page.short_description && (
                                    <p className="mb-6 text-lg text-slate-500">{page.short_description}</p>
                                )}
                            </div>
                        )}
                        <div className={`${page.banner_image ? 'px-6 py-8 sm:px-10 sm:py-12' : ''}`}>
                            {isEditing ? (
                                <div className="rounded-xl border border-blue-200 bg-white shadow-sm mx-6 mb-6 sm:mx-10">
                                    <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-2">
                                        <span className="text-xs font-medium text-blue-700">
                                            {t('Editing page content')}
                                        </span>
                                    </div>
                                    <div className="p-4">
                                        <RichTextEditor
                                            value={richTextValue}
                                            onChange={(val) => {
                                                setRichTextValue(val);
                                                setHasChanges(true);
                                            }}
                                            placeholder={t('Start writing your page content here...')}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="prose prose-slate max-w-none
                    [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#002147]
                    [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[#002147]
                    [&_img]:my-6 [&_img]:rounded-xl [&_img]:shadow-md
                    [&_p]:mb-4 [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-slate-700
                    [&_table]:w-full [&_table]:border-collapse [&_table]:my-6
                    [&_th]:bg-[#002147] [&_th]:text-white [&_th]:px-4 [&_th]:py-3
                    [&_td]:border [&_td]:border-slate-200 [&_td]:px-4 [&_td]:py-3
                    [&_ul]:mb-4 [&_ul]:ml-5 [&_ul]:list-disc
                    [&_ol]:mb-4 [&_ol]:ml-5 [&_ol]:list-decimal
                    [&_li]:mb-1
                    [&_a]:font-medium [&_a]:text-[#2563EB] [&_a]:underline [&_a]:underline-offset-2
                    [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[#2563EB] [&_blockquote]:bg-[#2563EB]/5 [&_blockquote]:py-3 [&_blockquote]:pl-5 [&_blockquote]:pr-4 [&_blockquote]:italic [&_blockquote]:text-slate-600"

                                    dangerouslySetInnerHTML={{
                                        __html: contentHtml || '<p class="text-slate-400 italic">No content yet.</p>',
                                    }}
                                />
                            )}
                        </div>
                    </article>
                </main>

                <footer className="border-t border-[#002147]/8 bg-white">
                    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
                        <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
                            <span>
                                &copy; {new Date().getFullYear()} {displayName}
                                {'. '}
                                {t('All rights reserved.')}
                            </span>
                            <Link href="/" className="font-medium text-[#002147] underline-offset-2 hover:underline">
                                {t('Back to Home')}
                            </Link>
                        </div>
                    </div>
                </footer>
            </div>

            {isEditing && hasRichText && (
                <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-200 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] backdrop-blur-xl">
                    <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm font-medium text-stone-700">
                                {t('Editing: {page}', { page: page.title })}
                                {hasChanges && (
                                    <span className="ml-2 text-xs text-amber-600">{t('unsaved changes')}</span>
                                )}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                            >
                                <X className="h-4 w-4" />
                                {t('Cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving || !hasChanges}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="h-4 w-4" />
                                {isSaving ? t('Saving...') : t('Save Changes')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
