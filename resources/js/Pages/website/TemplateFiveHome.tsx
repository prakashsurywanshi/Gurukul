import { useLanguage } from '../../i18n/LanguageProvider';
import { Head, Link, router } from '@inertiajs/react';
import {
    BookOpen,
    CalendarRange,
    ExternalLink,
    Facebook,
    Globe,
    GraduationCap,
    Image as ImageIcon,
    Instagram,
    Mail,
    MapPin,
    Menu,
    Pencil,
    Phone,
    Plus,
    Quote,
    Send,
    Sparkles,
    Star,
    Trash2,
    Twitter,
    Users2,
    X,
    Youtube,
    Award,
    ChevronDown,
    ChevronRight,
    Check,
} from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { WebsiteContent, WebsiteMenuItem } from '../../utils/websiteCmsContent';
import type { PublishedPage, CurrentUser } from '../Home';
import InlineEditField from '../../components/website/InlineEditField';
import InlineArrayEditor, { ArrayItem } from '../../components/website/InlineArrayEditor';
import SectionEditBar from '../../components/website/SectionEditBar';
import ImageUpload from '../../components/website/ImageUpload';
import ImageLightbox from '../../components/website/ImageLightbox';
import LanguageSwitcher from '../../components/LanguageSwitcher';

interface TemplateFiveHomeProps {
    cmsContent: WebsiteContent;
    user?: CurrentUser | null;
    publishedPages?: PublishedPage[];
    menuPages?: PublishedPage[];
    isEditing?: boolean;
    onToggleEditing?: () => void;
    onFieldChange?: (key: string, value: string) => void;
    onArrayChange?: (key: string, items: Array<Record<string, string>>) => void;
    translations?: Record<string, Record<string, string>>;
    onTranslationChange?: (fieldKey: string, locale: string, value: string) => void;
    onSaveSection?: (sectionKey: string, data: Record<string, any>) => void;
    onPublishedPagesChange?: (pages: PublishedPage[]) => void;
    dirtyFields?: Record<string, any>;
    isSaving?: boolean;
}

const whyChooseIcons = [Star, Award, BookOpen, Globe];
const contactIcons = [Phone, Mail, MapPin];

function resolveMenuItemUrl(item: WebsiteMenuItem, publishedPages: PublishedPage[], isEditing: boolean): string {
    if (item.pageSlug) {
        const page = publishedPages.find((p) => p.slug === item.pageSlug);
        if (page) {
            if (isEditing && page.id) {
                return `/pages-builder/${page.id}/edit`;
            }
            return `/pages/${item.pageSlug}`;
        }
        return '#';
    }
    return item.url;
}

function MenuItemDropdown({
    item,
    publishedPages,
    isEditing,
}: {
    item: WebsiteMenuItem;
    publishedPages: PublishedPage[];
    isEditing: boolean;
}) {
    const [open, setOpen] = useState(false);
    const href = resolveMenuItemUrl(item, publishedPages, isEditing);
    const isPageLink = href.startsWith('/pages/') || href.startsWith('/pages-builder');
    const isInternal = href.startsWith('/');

    if (!item.children || item.children.length === 0) {
        if (isInternal) {
            return (
                <Link
                    href={href}
                    className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white transition hover:text-[#002147]"
                >
                    {item.label}
                </Link>
            );
        }
        return (
            <a
                href={href}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white transition hover:text-[#002147]"
            >
                {item.label}
            </a>
        );
    }

    return (
        <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white transition hover:text-[#002147]"
            >
                {item.label}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-[#002147]/10 bg-white shadow-xl">
                    {item.children.map((child) => {
                        const childHref = resolveMenuItemUrl(child, publishedPages, isEditing);
                        const childIsInternal = childHref.startsWith('/');
                        if (childIsInternal) {
                            return (
                                <Link
                                    key={child.label}
                                    href={childHref}
                                    className="block px-4 py-2.5 text-sm text-stone-700 transition hover:bg-[#2563EB]/10 hover:text-[#002147]"
                                >
                                    {child.label}
                                </Link>
                            );
                        }
                        return (
                            <a
                                key={child.label}
                                href={childHref}
                                className="block px-4 py-2.5 text-sm text-stone-700 transition hover:bg-[#2563EB]/10 hover:text-[#002147]"
                            >
                                {child.label}
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface NavigationMenuEditorProps {
    cmsContent: WebsiteContent;
    publishedPages: PublishedPage[];
    onArrayChange?: (key: string, items: Array<Record<string, string>>) => void;
    onPublishedPagesChange?: (pages: PublishedPage[]) => void;
}

function NavigationMenuEditor({
    cmsContent,
    publishedPages,
    onArrayChange,
    onPublishedPagesChange,
}: NavigationMenuEditorProps) {
    const { t } = useLanguage();
    const [creatingPage, setCreatingPage] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreatePage = useCallback(async () => {
        if (!newPageTitle.trim()) return;
        setIsCreating(true);
        try {
            const response = await fetch('/pages-builder/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ''),
                },
                body: JSON.stringify({
                    title: newPageTitle.trim(),
                    is_published: true,
                }),
            });
            if (response.ok) {
                const page = await response.json();
                const updatedPages = [...publishedPages, page];
                onPublishedPagesChange?.(updatedPages);
                setNewPageTitle('');
                setCreatingPage(false);
            }
        } catch (error) {
            console.error('Failed to create page:', error);
        } finally {
            setIsCreating(false);
        }
    }, [newPageTitle, publishedPages, onPublishedPagesChange]);

    return (
        <div className="relative z-40 border-b-2 border-dashed border-amber-300 bg-amber-50/50">
            <div className="mx-auto max-w-7xl px-5 sm:px-8 py-3">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                        {t('Navigation Menu Editor')}
                    </p>
                    <button
                        type="button"
                        onClick={() => setCreatingPage(!creatingPage)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                    >
                        <Plus className="h-3 w-3" />
                        Create New Page
                    </button>
                </div>

                {creatingPage && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-green-200 bg-white p-3">
                        <input
                            type="text"
                            value={newPageTitle}
                            onChange={(e) => setNewPageTitle(e.target.value)}
                            placeholder={t('Enter page title (e.g. About Us)')}
                            className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreatePage()}
                        />

                        <button
                            type="button"
                            onClick={handleCreatePage}
                            disabled={isCreating || !newPageTitle.trim()}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                            {isCreating ? 'Creating...' : 'Create & Link'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setCreatingPage(false);
                                setNewPageTitle('');
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                            {t('Cancel')}
                        </button>
                    </div>
                )}

                <InlineArrayEditor
                    items={cmsContent.templateFiveMainMenuItems as unknown as ArrayItem[]}
                    isEditing={true}
                    onChange={(items) => onArrayChange?.('templateFiveMainMenuItems', items)}
                    newItemDefaults={{
                        label: '',
                        url: '#',
                        pageSlug: '',
                        children: '',
                    }}
                    addLabel="Add Menu Item"
                    emptyLabel="No menu items"
                    renderItem={(item, index, isEditingItem, onFieldChange) => {
                        const { t } = useLanguage();
                        return (
                            <div className="flex items-center gap-3">
                                {isEditingItem ? (
                                    <div className="flex flex-1 flex-col gap-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={item.label || ''}
                                                onChange={(e) => onFieldChange('label', e.target.value)}
                                                placeholder={t('Label')}
                                                className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
                                            />

                                            <select
                                                value={item.pageSlug || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    onFieldChange('pageSlug', val);
                                                    if (val) {
                                                        onFieldChange('url', `/pages/${val}`);
                                                    }
                                                }}
                                                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                                            >
                                                <option value="">{t('Custom URL')}</option>
                                                {publishedPages.map((page) => (
                                                    <option key={page.slug} value={page.slug}>
                                                        {page.title} (/
                                                        {page.slug})
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={item.url || ''}
                                                onChange={(e) => onFieldChange('url', e.target.value)}
                                                placeholder={t('URL')}
                                                className="w-48 rounded border border-slate-300 px-2 py-1.5 text-sm"
                                                disabled={!!item.pageSlug}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-sm font-medium text-slate-700">
                                        {item.label}{' '}
                                        <span className="text-xs text-slate-400">
                                            → {item.pageSlug ? `/pages/${item.pageSlug}` : item.url}
                                        </span>
                                    </span>
                                )}
                            </div>
                        );
                    }}
                />
            </div>
        </div>
    );
}

export default function TemplateFiveHome({
    cmsContent,
    user,
    publishedPages = [],
    menuPages,
    isEditing = false,
    onToggleEditing,
    onFieldChange,
    onArrayChange,
    translations,
    onTranslationChange,
    onSaveSection,
    onPublishedPagesChange,
    dirtyFields = {},
    isSaving = false,
}: TemplateFiveHomeProps) {
    const { t } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [galleryLightboxAlbum, setGalleryLightboxAlbum] = useState<string | null>(null);
    const [galleryLightboxIndex, setGalleryLightboxIndex] = useState<number | null>(null);
    const navPages = menuPages ?? publishedPages;
    const galleryImages =
        cmsContent.sliderImages.length > 0 ? cmsContent.sliderImages : Array.from({ length: 6 }, () => null);

    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [sectionDrafts, setSectionDrafts] = useState<Record<string, Record<string, any>>>({});

    const updateDraft = (sectionKey: string, field: string, value: any) => {
        setSectionDrafts((prev) => ({
            ...prev,
            [sectionKey]: {
                ...(prev[sectionKey] || {}),
                [field]: value,
            },
        }));
        onFieldChange?.(field, value);
    };

    const saveSection = (sectionKey: string) => {
        const draft = sectionDrafts[sectionKey];
        if (draft && onSaveSection) {
            onSaveSection(sectionKey, draft);
        }
        setActiveSection(null);
    };

    return (
        <>
            <Head title={`${cmsContent.seoTitle} | Template 5`} />

            <div className="min-h-screen bg-[#F0F4F8] text-stone-900">
                {/* ── 1. Top Utility Bar ── */}
                <div className={`relative ${activeSection === 'topBar' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
                    {isEditing && activeSection === 'topBar' && (
                        <SectionEditBar
                            sectionName="Top Utility Bar"
                            isDirty={Object.keys(sectionDrafts.topBar || {}).length > 0}
                            isSaving={isSaving}
                            onSave={() => saveSection('topBar')}
                            onDiscard={() => {
                                setSectionDrafts((p) => {
                                    const n = { ...p };
                                    delete n.topBar;
                                    return n;
                                });
                                setActiveSection(null);
                            }}
                        />
                    )}
                    {isEditing && (
                        <button
                            type="button"
                            onClick={() => setActiveSection(activeSection === 'topBar' ? null : 'topBar')}
                            className="absolute -top-8 right-4 z-50 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-lg hover:bg-blue-700"
                        >
                            {activeSection === 'topBar' ? 'Close' : 'Edit Top Bar'}
                        </button>
                    )}
                    <div className="bg-[#002147] text-white text-xs">
                        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-2 sm:px-8">
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="inline-flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5" />
                                    {isEditing ? (
                                        <InlineEditField
                                            value={cmsContent.templateFiveTopPhone}
                                            onChange={(v) => updateDraft('topBar', 'templateFiveTopPhone', v)}
                                            isEditing={isEditing}
                                            className="text-white bg-transparent border-none"
                                            fieldKey="templateFiveTopPhone"
                                            translations={translations?.['templateFiveTopPhone']}
                                            onTranslationChange={(locale, v) =>
                                                onFieldChange?.(`templateFiveTopPhone_${locale}`, v)
                                            }
                                        />
                                    ) : (
                                        cmsContent.templateFiveTopPhone
                                    )}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5" />
                                    {isEditing ? (
                                        <InlineEditField
                                            value={cmsContent.templateFiveTopEmail}
                                            onChange={(v) => updateDraft('topBar', 'templateFiveTopEmail', v)}
                                            isEditing={isEditing}
                                            className="text-white bg-transparent border-none"
                                            fieldKey="templateFiveTopEmail"
                                            translations={translations?.['templateFiveTopEmail']}
                                            onTranslationChange={(locale, v) =>
                                                onFieldChange?.(`templateFiveTopEmail_${locale}`, v)
                                            }
                                        />
                                    ) : (
                                        cmsContent.templateFiveTopEmail
                                    )}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {isEditing ? (
                                        <InlineEditField
                                            value={cmsContent.templateFiveTopAddress}
                                            onChange={(v) => updateDraft('topBar', 'templateFiveTopAddress', v)}
                                            isEditing={isEditing}
                                            className="text-white bg-transparent border-none"
                                            fieldKey="templateFiveTopAddress"
                                            translations={translations?.['templateFiveTopAddress']}
                                            onTranslationChange={(locale, v) =>
                                                onFieldChange?.(`templateFiveTopAddress_${locale}`, v)
                                            }
                                        />
                                    ) : (
                                        cmsContent.templateFiveTopAddress
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                {cmsContent.templateFiveSocialFacebook && (
                                    <a
                                        href={cmsContent.templateFiveSocialFacebook}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="transition hover:text-[#2563EB]"
                                    >
                                        <Facebook className="h-3.5 w-3.5" />
                                    </a>
                                )}
                                {cmsContent.templateFiveSocialTwitter && (
                                    <a
                                        href={cmsContent.templateFiveSocialTwitter}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="transition hover:text-[#2563EB]"
                                    >
                                        <Twitter className="h-3.5 w-3.5" />
                                    </a>
                                )}
                                {cmsContent.templateFiveSocialYoutube && (
                                    <a
                                        href={cmsContent.templateFiveSocialYoutube}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="transition hover:text-[#2563EB]"
                                    >
                                        <Youtube className="h-3.5 w-3.5" />
                                    </a>
                                )}
                                {cmsContent.templateFiveSocialInstagram && (
                                    <a
                                        href={cmsContent.templateFiveSocialInstagram}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="transition hover:text-[#2563EB]"
                                    >
                                        <Instagram className="h-3.5 w-3.5" />
                                    </a>
                                )}
                                <span className="hidden h-4 w-px bg-white/20 sm:block" />
                                <LanguageSwitcher
                                    variant="site"
                                    className="border-white/25 bg-transparent px-2 py-1 text-white hover:bg-white/10"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 2. Header ── */}
                <header className="bg-white border-b border-stone-200">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
                        <Link href="/" className="flex items-center gap-4">
                            <div className="relative group/logo">
                                <div
                                    className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-[#2563EB] text-[#002147] ${cmsContent.brandLogo ? 'bg-white' : 'bg-[#F0F4F8]'}`}
                                >
                                    {cmsContent.brandLogo ? (
                                        <img
                                            src={cmsContent.brandLogo}
                                            alt={`${cmsContent.brandName} logo`}
                                            className="max-h-full max-w-full object-contain p-1"
                                        />
                                    ) : (
                                        <GraduationCap className="h-8 w-8" />
                                    )}
                                </div>
                                {isEditing && (
                                    <>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id="brand-logo-upload"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const fd = new FormData();
                                                fd.append('image', file);
                                                fd.append('folder', 'brand');
                                                fetch('/upload/image', {
                                                    method: 'POST',
                                                    body: fd,
                                                })
                                                    .then((r) => r.json())
                                                    .then((d) => {
                                                        if (d.url) onFieldChange?.('brandLogo', d.url);
                                                    })
                                                    .catch(() => alert('Upload failed'));
                                                e.target.value = '';
                                            }}
                                        />
                                        <label
                                            htmlFor="brand-logo-upload"
                                            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover/logo:opacity-100 cursor-pointer transition"
                                        >
                                            <ImageIcon className="h-5 w-5 text-white" />
                                        </label>
                                    </>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-serif text-2xl font-bold tracking-wide text-[#002147]">
                                    {cmsContent.brandName}
                                </p>
                                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                                    {cmsContent.brandSubtitle}
                                </p>
                                <p className="mt-0.5 text-[10px] text-stone-400">
                                    {t('Affiliated to Maharashtra State Board')}
                                </p>
                            </div>
                        </Link>

                        <div className="hidden lg:flex items-center gap-3">
                            {isEditing && (
                                <>
                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-[#F0F4F8] px-3 py-2 text-xs font-medium text-[#002147] transition hover:bg-stone-100">
                                        <input
                                            type="checkbox"
                                            checked={cmsContent.templateFiveShowAccreditedBadge !== false}
                                            onChange={(e) =>
                                                updateDraft(
                                                    'header',
                                                    'templateFiveShowAccreditedBadge',
                                                    e.target.checked,
                                                )
                                            }
                                            className="h-3.5 w-3.5 rounded border-stone-300 text-[#002147] accent-[#002147]"
                                        />
                                        Show Badge
                                    </label>
                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-[#F0F4F8] px-3 py-2 text-xs font-medium text-[#002147] transition hover:bg-stone-100">
                                        <input
                                            type="checkbox"
                                            checked={cmsContent.templateFiveShowAdmissionButton !== false}
                                            onChange={(e) =>
                                                updateDraft(
                                                    'header',
                                                    'templateFiveShowAdmissionButton',
                                                    e.target.checked,
                                                )
                                            }
                                            className="h-3.5 w-3.5 rounded border-stone-300 text-[#002147] accent-[#002147]"
                                        />
                                        Show Admission
                                    </label>
                                </>
                            )}
                            {cmsContent.templateFiveShowAccreditedBadge !== false && (
                                <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-[#F0F4F8] px-3 py-1.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#002147] text-white">
                                        <Award className="h-4 w-4" />
                                    </div>
                                    <div className="pr-2">
                                        {isEditing ? (
                                            <>
                                                <InlineEditField
                                                    value={cmsContent.templateFiveAccreditedBadgeLabel || 'Accredited'}
                                                    onChange={(v) =>
                                                        updateDraft('header', 'templateFiveAccreditedBadgeLabel', v)
                                                    }
                                                    isEditing={isEditing}
                                                    className="text-[10px] font-semibold uppercase tracking-wider text-[#002147] bg-transparent border-none"
                                                    placeholder={t('Accredited')}
                                                    fieldKey="templateFiveAccreditedBadgeLabel"
                                                    translations={translations?.['templateFiveAccreditedBadgeLabel']}
                                                    onTranslationChange={(locale, v) =>
                                                        onFieldChange?.(`templateFiveAccreditedBadgeLabel_${locale}`, v)
                                                    }
                                                />

                                                <InlineEditField
                                                    value={
                                                        cmsContent.templateFiveAccreditedBadgeGrade || 'NAAC A+ Grade'
                                                    }
                                                    onChange={(v) =>
                                                        updateDraft('header', 'templateFiveAccreditedBadgeGrade', v)
                                                    }
                                                    isEditing={isEditing}
                                                    className="text-[10px] text-stone-500 bg-transparent border-none"
                                                    placeholder={t('NAAC A+ Grade')}
                                                    fieldKey="templateFiveAccreditedBadgeGrade"
                                                    translations={translations?.['templateFiveAccreditedBadgeGrade']}
                                                    onTranslationChange={(locale, v) =>
                                                        onFieldChange?.(`templateFiveAccreditedBadgeGrade_${locale}`, v)
                                                    }
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#002147]">
                                                    {cmsContent.templateFiveAccreditedBadgeLabel || 'Accredited'}
                                                </p>
                                                <p className="text-[10px] text-stone-500">
                                                    {cmsContent.templateFiveAccreditedBadgeGrade || 'NAAC A+ Grade'}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#002147]/20 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#002147] transition hover:bg-[#002147] hover:text-white"
                            >
                                {cmsContent.loginLabel}
                            </Link>
                            {cmsContent.templateFiveShowAdmissionButton !== false && (
                                <Link
                                    href="/admissions/apply"
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#1d4ed8]"
                                >
                                    <Send className="h-3 w-3" />
                                    {cmsContent.applyNowLabel}
                                </Link>
                            )}
                            {user && (
                                <button
                                    type="button"
                                    onClick={onToggleEditing}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                                        isEditing
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                            : 'border-[#002147]/20 bg-white text-[#002147] hover:bg-[#002147] hover:text-white'
                                    }`}
                                >
                                    {isEditing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                                    {isEditing ? 'Done Editing' : 'Edit Page'}
                                </button>
                            )}
                            {user && (
                                <Link
                                    href="/pages-builder"
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#1d4ed8]"
                                >
                                    <Plus className="h-3 w-3" />
                                    Create Page
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* ── 3. Main Navigation Bar ── */}
                <nav className="bg-[#2563EB] sticky top-0 z-30 shadow-md">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8">
                        <div className="hidden lg:flex items-center">
                            {cmsContent.templateFiveMainMenuItems.map((item) => (
                                <MenuItemDropdown
                                    key={item.label}
                                    item={item}
                                    publishedPages={navPages}
                                    isEditing={isEditing}
                                />
                            ))}
                            {navPages
                                .filter(
                                    (page) =>
                                        !cmsContent.templateFiveMainMenuItems.some(
                                            (item) => item.pageSlug === page.slug,
                                        ),
                                )
                                .map((page) => (
                                    <Link
                                        key={page.slug}
                                        href={`/pages/${page.slug}`}
                                        className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white transition hover:text-[#002147]"
                                    >
                                        {page.title}
                                    </Link>
                                ))}
                        </div>

                        <div className="flex w-full items-center justify-between py-3 lg:hidden">
                            <span className="font-serif text-sm font-bold text-[#002147]">{t('Menu')}</span>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="text-[#002147]"
                            >
                                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile sidebar */}
                    {mobileMenuOpen && (
                        <div className="lg:hidden border-t border-[#2563EB]/50 bg-white">
                            <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-1">
                                {cmsContent.templateFiveMainMenuItems.map((item) => {
                                    const itemHref = resolveMenuItemUrl(item, navPages, isEditing);
                                    const itemIsInternal = itemHref.startsWith('/');
                                    return (
                                        <div key={item.label}>
                                            {itemIsInternal ? (
                                                <Link
                                                    href={itemHref}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#002147] hover:bg-[#2563EB]/10"
                                                >
                                                    {item.label}
                                                </Link>
                                            ) : (
                                                <a
                                                    href={itemHref}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#002147] hover:bg-[#2563EB]/10"
                                                >
                                                    {item.label}
                                                </a>
                                            )}
                                            {item.children && item.children.length > 0 && (
                                                <div className="pl-4">
                                                    {item.children.map((child) => {
                                                        const childHref = resolveMenuItemUrl(
                                                            child,
                                                            navPages,
                                                            isEditing,
                                                        );
                                                        const childIsInternal = childHref.startsWith('/');
                                                        return childIsInternal ? (
                                                            <Link
                                                                key={child.label}
                                                                href={childHref}
                                                                onClick={() => setMobileMenuOpen(false)}
                                                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-stone-600 hover:bg-[#2563EB]/10 hover:text-[#002147]"
                                                            >
                                                                <ChevronRight className="h-3 w-3" />
                                                                {child.label}
                                                            </Link>
                                                        ) : (
                                                            <a
                                                                key={child.label}
                                                                href={childHref}
                                                                onClick={() => setMobileMenuOpen(false)}
                                                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-stone-600 hover:bg-[#2563EB]/10 hover:text-[#002147]"
                                                            >
                                                                <ChevronRight className="h-3 w-3" />
                                                                {child.label}
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {navPages
                                    .filter(
                                        (page) =>
                                            !cmsContent.templateFiveMainMenuItems.some(
                                                (item) => item.pageSlug === page.slug,
                                            ),
                                    )
                                    .map((page) => (
                                        <Link
                                            key={page.slug}
                                            href={`/pages/${page.slug}`}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#002147] hover:bg-[#2563EB]/10"
                                        >
                                            {page.title}
                                        </Link>
                                    ))}
                                <div className="border-t border-stone-200 pt-3 mt-3 space-y-2">
                                    <Link
                                        href="/login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-center border border-[#002147]/20 text-[#002147] hover:bg-[#002147]/5"
                                    >
                                        {cmsContent.loginLabel}
                                    </Link>
                                    {cmsContent.templateFiveShowAdmissionButton !== false && (
                                        <Link
                                            href="/admissions/apply"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-center bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
                                        >
                                            {cmsContent.applyNowLabel}
                                        </Link>
                                    )}
                                    {user && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onToggleEditing?.();
                                                setMobileMenuOpen(false);
                                            }}
                                            className={`block w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-center transition ${
                                                isEditing
                                                    ? 'border border-emerald-300 bg-emerald-50 text-emerald-700'
                                                    : 'border border-[#002147]/20 text-[#002147] hover:bg-[#002147]/5'
                                            }`}
                                        >
                                            {isEditing ? 'Done Editing' : 'Edit Page'}
                                        </button>
                                    )}
                                    {user && (
                                        <Link
                                            href="/pages-builder"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-center bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
                                        >
                                            {t('Create Page')}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </nav>

                {isEditing && (
                    <NavigationMenuEditor
                        cmsContent={cmsContent}
                        publishedPages={publishedPages}
                        onArrayChange={onArrayChange}
                        onPublishedPagesChange={onPublishedPagesChange}
                    />
                )}

                {/* ── 4. News Ticker / Marquee ── */}
                {cmsContent.templateFiveMarqueeItems.length > 0 && (
                    <div className="bg-[#002147] border-b border-[#2563EB]/30 overflow-hidden">
                        <div className="mx-auto flex max-w-7xl items-center">
                            <span className="shrink-0 bg-[#2563EB] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">
                                {t('Updates')}
                            </span>
                            <div className="overflow-hidden flex-1">
                                <div className="flex animate-marquee whitespace-nowrap py-2">
                                    {cmsContent.templateFiveMarqueeItems.map((item, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-2 px-6 text-xs text-white/90"
                                        >
                                            <span className="h-1 w-1 rounded-full bg-[#2563EB]" />
                                            {item.url ? (
                                                <a
                                                    href={item.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="hover:text-[#2563EB] transition"
                                                >
                                                    {item.text}
                                                </a>
                                            ) : (
                                                item.text
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {isEditing && (
                    <InlineArrayEditor
                        items={cmsContent.templateFiveMarqueeItems}
                        isEditing={isEditing}
                        onChange={(items) => onArrayChange?.('templateFiveMarqueeItems', items)}
                        newItemDefaults={{ text: '', url: '' }}
                        addLabel="Add News Ticker Item"
                        emptyLabel="No ticker items"
                        renderItem={(item, index, isEditingItem, onFieldChange) => (
                            <div className="flex items-center gap-3">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" />
                                {isEditingItem ? (
                                    <div className="flex flex-1 gap-2">
                                        <InlineEditField
                                            value={item.text}
                                            onChange={(v) => onFieldChange('text', v)}
                                            isEditing={isEditingItem}
                                            className="flex-1 text-sm text-stone-700 bg-transparent border-none"
                                            placeholder={t('News text')}
                                        />

                                        <InlineEditField
                                            value={item.url}
                                            onChange={(v) => onFieldChange('url', v)}
                                            isEditing={isEditingItem}
                                            className="w-48 text-xs text-stone-400 bg-transparent border-none"
                                            placeholder={t('Link URL (optional)')}
                                        />
                                    </div>
                                ) : (
                                    <span className="text-sm text-stone-700">{item.text}</span>
                                )}
                            </div>
                        )}
                    />
                )}

                {/* Marquee keyframes injected via style tag */}
                <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 25s linear infinite;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
        `}</style>

                <main>
                    {/* ── 5. Hero Section ── */}
                    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#002147_0%,#001530_50%,#000d1f_100%)]">
                        {cmsContent.sliderImages[0] && (
                            <img
                                src={cmsContent.sliderImages[0]}
                                alt={cmsContent.brandName}
                                className="absolute inset-0 h-full w-full object-cover opacity-20"
                            />
                        )}
                        {isEditing && (
                            <div className="absolute top-4 right-4 z-20">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    id="hero-bg-upload"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const fd = new FormData();
                                        fd.append('image', file);
                                        fd.append('folder', 'template5/hero');
                                        fetch('/upload/image', {
                                            method: 'POST',
                                            body: fd,
                                        })
                                            .then((r) => r.json())
                                            .then((d) => {
                                                if (d.url) {
                                                    const images = [...cmsContent.sliderImages];
                                                    images[0] = d.url;
                                                    onArrayChange?.('sliderImages', images as any);
                                                }
                                            })
                                            .catch(() => alert('Upload failed'));
                                        e.target.value = '';
                                    }}
                                />
                                <label
                                    htmlFor="hero-bg-upload"
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/60"
                                >
                                    <ImageIcon className="h-3 w-3" />{' '}
                                    {cmsContent.sliderImages[0] ? 'Change Hero Image' : 'Add Hero Image'}
                                </label>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,33,71,0.92),rgba(0,21,48,0.85))]" />
                        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-[#2563EB]/10 blur-3xl" />
                        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#2563EB]/5 blur-3xl" />

                        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:py-36">
                            <div className="max-w-3xl">
                                <h1 className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                                    {isEditing ? (
                                        <InlineEditField
                                            value={cmsContent.templateFiveHeroTitle}
                                            onChange={(v) => updateDraft('hero', 'templateFiveHeroTitle', v)}
                                            isEditing={isEditing}
                                            as="h1"
                                            className="text-5xl font-bold text-white bg-transparent border-none"
                                        />
                                    ) : (
                                        cmsContent.templateFiveHeroTitle
                                    )}
                                </h1>
                                <p className="mt-4 text-lg font-semibold text-[#2563EB] sm:text-xl">
                                    {isEditing ? (
                                        <InlineEditField
                                            value={cmsContent.templateFiveHeroSubtitle}
                                            onChange={(v) => updateDraft('hero', 'templateFiveHeroSubtitle', v)}
                                            isEditing={isEditing}
                                            as="h2"
                                            className="text-2xl font-semibold text-[#2563EB] bg-transparent border-none"
                                        />
                                    ) : (
                                        cmsContent.templateFiveHeroSubtitle
                                    )}
                                </p>
                                <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
                                    {isEditing ? (
                                        <InlineEditField
                                            value={cmsContent.templateFiveHeroDescription}
                                            onChange={(v) => updateDraft('hero', 'templateFiveHeroDescription', v)}
                                            isEditing={isEditing}
                                            as="p"
                                            multiline
                                            rows={3}
                                            className="text-lg text-gray-200 bg-transparent border-none"
                                        />
                                    ) : (
                                        cmsContent.templateFiveHeroDescription
                                    )}
                                </p>

                                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                                    <Link
                                        href="/admissions/apply"
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-[#1d4ed8]"
                                    >
                                        <Send className="h-4 w-4" />
                                        {cmsContent.applyNowLabel}
                                    </Link>
                                    <a
                                        href="#about"
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition hover:border-[#2563EB] hover:text-[#2563EB]"
                                    >
                                        Learn More
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── 6. Achievements Counter Bar ── */}
                    {cmsContent.templateFiveAchievements.length > 0 && (
                        <section className="bg-[#2563EB]">
                            <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
                                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                                    {cmsContent.templateFiveAchievements.map((item) => (
                                        <div key={item.label} className="text-center">
                                            <p className="font-serif text-3xl font-bold text-white sm:text-4xl">
                                                {item.value}
                                            </p>
                                            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/70 sm:text-sm">
                                                {item.label}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                    {isEditing && (
                        <div className="relative">
                            <InlineArrayEditor
                                items={cmsContent.templateFiveAchievements}
                                isEditing={isEditing}
                                onChange={(items) => onArrayChange?.('templateFiveAchievements', items)}
                                newItemDefaults={{ value: '', label: '' }}
                                addLabel="Add Achievement"
                                emptyLabel="No achievements yet"
                                renderItem={(item, index, isEditingItem, onFieldChange) => (
                                    <div className="text-center">
                                        {isEditingItem ? (
                                            <>
                                                <InlineEditField
                                                    value={item.value}
                                                    onChange={(v) => onFieldChange('value', v)}
                                                    isEditing={isEditingItem}
                                                    className="text-3xl font-black text-[#002147] bg-transparent border-none text-center"
                                                    placeholder="3200+"
                                                />

                                                <InlineEditField
                                                    value={item.label}
                                                    onChange={(v) => onFieldChange('label', v)}
                                                    isEditing={isEditingItem}
                                                    className="text-sm text-[#002147]/70 bg-transparent border-none text-center"
                                                    placeholder={t('Students Enrolled')}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-3xl font-black text-[#002147]">{item.value}</p>
                                                <p className="text-sm text-[#002147]/70">{item.label}</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            />
                        </div>
                    )}

                    {/* ── 7. Principal & Secretary Messages ── */}
                    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                        <div className="grid gap-8 lg:grid-cols-2">
                            {/* Secretary */}
                            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-lg sm:p-8">
                                <div className="flex items-start gap-5">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#2563EB] bg-[#F0F4F8]">
                                            {cmsContent.templateFiveSecretaryImage ? (
                                                <img
                                                    src={cmsContent.templateFiveSecretaryImage}
                                                    alt={cmsContent.templateFiveSecretaryName}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <Users2 className="h-8 w-8 text-[#002147]/40" />
                                            )}
                                        </div>
                                        {isEditing && (
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                id="secretary-photo"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const fd = new FormData();
                                                    fd.append('image', file);
                                                    fd.append('folder', 'template5/secretary');
                                                    fetch('/upload/image', {
                                                        method: 'POST',
                                                        body: fd,
                                                    })
                                                        .then((r) => r.json())
                                                        .then((d) => {
                                                            if (d.url)
                                                                onFieldChange?.('templateFiveSecretaryImage', d.url);
                                                        })
                                                        .catch(() => alert('Upload failed'));
                                                    e.target.value = '';
                                                }}
                                            />
                                        )}
                                        {isEditing && (
                                            <label
                                                htmlFor="secretary-photo"
                                                className="cursor-pointer text-[10px] font-medium text-[#2563EB]/70 hover:text-[#2563EB]"
                                            >
                                                {t('Change Photo')}
                                            </label>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-serif text-xl font-bold text-[#002147]">
                                            {isEditing ? (
                                                <InlineEditField
                                                    value={cmsContent.templateFiveSecretaryName}
                                                    onChange={(v) =>
                                                        updateDraft('secretary', 'templateFiveSecretaryName', v)
                                                    }
                                                    isEditing={isEditing}
                                                    className="text-xl font-bold text-[#002147] bg-transparent border-none"
                                                />
                                            ) : (
                                                cmsContent.templateFiveSecretaryName
                                            )}
                                        </h3>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
                                            {isEditing ? (
                                                <InlineEditField
                                                    value={cmsContent.templateFiveSecretaryDesignation}
                                                    onChange={(v) =>
                                                        updateDraft('secretary', 'templateFiveSecretaryDesignation', v)
                                                    }
                                                    isEditing={isEditing}
                                                    className="text-sm text-[#2563EB] bg-transparent border-none"
                                                />
                                            ) : (
                                                cmsContent.templateFiveSecretaryDesignation
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="relative mt-5 pl-4 border-l-4 border-[#2563EB]/40">
                                    <Quote className="absolute -left-3 -top-1 h-6 w-6 text-[#2563EB]/30" />
                                    <p className="text-sm leading-7 text-stone-600">
                                        {isEditing ? (
                                            <InlineEditField
                                                value={cmsContent.templateFiveSecretaryMessage}
                                                onChange={(v) =>
                                                    updateDraft('secretary', 'templateFiveSecretaryMessage', v)
                                                }
                                                isEditing={isEditing}
                                                multiline
                                                rows={5}
                                                className="text-gray-600 bg-transparent border-none"
                                            />
                                        ) : (
                                            cmsContent.templateFiveSecretaryMessage
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Principal */}
                            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-lg sm:p-8">
                                <div className="flex items-start gap-5">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#2563EB] bg-[#F0F4F8]">
                                            {cmsContent.templateFivePrincipalImage ? (
                                                <img
                                                    src={cmsContent.templateFivePrincipalImage}
                                                    alt={cmsContent.templateFivePrincipalName}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <GraduationCap className="h-8 w-8 text-[#002147]/40" />
                                            )}
                                        </div>
                                        {isEditing && (
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                id="principal-photo"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const fd = new FormData();
                                                    fd.append('image', file);
                                                    fd.append('folder', 'template5/principal');
                                                    fetch('/upload/image', {
                                                        method: 'POST',
                                                        body: fd,
                                                    })
                                                        .then((r) => r.json())
                                                        .then((d) => {
                                                            if (d.url)
                                                                onFieldChange?.('templateFivePrincipalImage', d.url);
                                                        })
                                                        .catch(() => alert('Upload failed'));
                                                    e.target.value = '';
                                                }}
                                            />
                                        )}
                                        {isEditing && (
                                            <label
                                                htmlFor="principal-photo"
                                                className="cursor-pointer text-[10px] font-medium text-[#2563EB]/70 hover:text-[#2563EB]"
                                            >
                                                {t('Change Photo')}
                                            </label>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-serif text-xl font-bold text-[#002147]">
                                            {isEditing ? (
                                                <InlineEditField
                                                    value={cmsContent.templateFivePrincipalName}
                                                    onChange={(v) =>
                                                        updateDraft('principal', 'templateFivePrincipalName', v)
                                                    }
                                                    isEditing={isEditing}
                                                    className="text-xl font-bold text-[#002147] bg-transparent border-none"
                                                />
                                            ) : (
                                                cmsContent.templateFivePrincipalName
                                            )}
                                        </h3>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
                                            {isEditing ? (
                                                <InlineEditField
                                                    value={cmsContent.templateFivePrincipalDesignation}
                                                    onChange={(v) =>
                                                        updateDraft('principal', 'templateFivePrincipalDesignation', v)
                                                    }
                                                    isEditing={isEditing}
                                                    className="text-sm text-[#2563EB] bg-transparent border-none"
                                                />
                                            ) : (
                                                cmsContent.templateFivePrincipalDesignation
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="relative mt-5 pl-4 border-l-4 border-[#2563EB]/40">
                                    <Quote className="absolute -left-3 -top-1 h-6 w-6 text-[#2563EB]/30" />
                                    <p className="text-sm leading-7 text-stone-600">
                                        {isEditing ? (
                                            <InlineEditField
                                                value={cmsContent.templateFivePrincipalMessage}
                                                onChange={(v) =>
                                                    updateDraft('principal', 'templateFivePrincipalMessage', v)
                                                }
                                                isEditing={isEditing}
                                                multiline
                                                rows={5}
                                                className="text-gray-600 bg-transparent border-none"
                                            />
                                        ) : (
                                            cmsContent.templateFivePrincipalMessage
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── 8. About Section ── */}
                    <section id="about" className="bg-white">
                        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2563EB]">
                                        {t('About Us')}
                                    </p>
                                    <h2 className="mt-3 font-serif text-3xl font-bold text-[#002147] sm:text-4xl">
                                        {isEditing ? (
                                            <InlineEditField
                                                value={cmsContent.templateFiveAboutTitle}
                                                onChange={(v) => updateDraft('about', 'templateFiveAboutTitle', v)}
                                                isEditing={isEditing}
                                                as="h2"
                                                className="text-3xl font-bold text-[#002147] bg-transparent border-none"
                                            />
                                        ) : (
                                            cmsContent.templateFiveAboutTitle
                                        )}
                                    </h2>
                                    <p className="mt-5 text-sm leading-7 text-stone-600 sm:text-base">
                                        {isEditing ? (
                                            <InlineEditField
                                                value={cmsContent.templateFiveAboutDescription}
                                                onChange={(v) =>
                                                    updateDraft('about', 'templateFiveAboutDescription', v)
                                                }
                                                isEditing={isEditing}
                                                multiline
                                                rows={5}
                                                className="text-gray-600 bg-transparent border-none"
                                            />
                                        ) : (
                                            cmsContent.templateFiveAboutDescription
                                        )}
                                    </p>
                                    <a
                                        href="#"
                                        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#002147] transition hover:text-[#2563EB]"
                                    >
                                        Read More <ChevronRight className="h-4 w-4" />
                                    </a>
                                </div>
                                <div className="overflow-hidden rounded-xl">
                                    {isEditing ? (
                                        <div className="relative">
                                            {cmsContent.templateFiveAboutImage ? (
                                                <img
                                                    src={cmsContent.templateFiveAboutImage}
                                                    alt={cmsContent.templateFiveAboutTitle}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-64 items-center justify-center bg-[linear-gradient(135deg,#002147,#003366)] sm:h-80">
                                                    <GraduationCap className="h-16 w-16 text-[#2563EB]/40" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-2 right-2">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    id="about-photo"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const fd = new FormData();
                                                        fd.append('image', file);
                                                        fd.append('folder', 'template5/about');
                                                        fetch('/upload/image', {
                                                            method: 'POST',
                                                            body: fd,
                                                        })
                                                            .then((r) => r.json())
                                                            .then((d) => {
                                                                if (d.url)
                                                                    onFieldChange?.('templateFiveAboutImage', d.url);
                                                            })
                                                            .catch(() => alert('Upload failed'));
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <label
                                                    htmlFor="about-photo"
                                                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/70"
                                                >
                                                    <ImageIcon className="h-3 w-3" /> Change Image
                                                </label>
                                            </div>
                                        </div>
                                    ) : cmsContent.templateFiveAboutImage ? (
                                        <img
                                            src={cmsContent.templateFiveAboutImage}
                                            alt={cmsContent.templateFiveAboutTitle}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-64 items-center justify-center bg-[linear-gradient(135deg,#002147,#003366)] sm:h-80">
                                            <GraduationCap className="h-16 w-16 text-[#2563EB]/40" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── 9. Why Choose Us ── */}
                    <section className="bg-[#F0F4F8]">
                        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                            <div className="text-center">
                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2563EB]">
                                    {t('Why Choose Us')}
                                </p>
                                <h2 className="mt-3 font-serif text-3xl font-bold text-[#002147] sm:text-4xl">
                                    {t('What makes us different')}
                                </h2>
                            </div>

                            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                {cmsContent.templateFiveWhyChooseUs.map((item, index) => {
                                    const Icon = whyChooseIcons[index % whyChooseIcons.length];
                                    return (
                                        <div
                                            key={item.title}
                                            className="rounded-xl border border-stone-200 bg-white p-6 text-center shadow-md transition hover:shadow-lg"
                                        >
                                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#002147] text-[#2563EB]">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <h3 className="mt-5 font-serif text-lg font-bold text-[#002147]">
                                                {item.title}
                                            </h3>
                                            <p className="mt-3 text-sm leading-6 text-stone-600">{item.description}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {isEditing && (
                            <InlineArrayEditor
                                items={cmsContent.templateFiveWhyChooseUs}
                                isEditing={isEditing}
                                onChange={(items) => onArrayChange?.('templateFiveWhyChooseUs', items)}
                                newItemDefaults={{ title: '', description: '' }}
                                addLabel="Add Feature"
                                emptyLabel="No features yet"
                                renderItem={(item, index, isEditingItem, onFieldChange) => {
                                    const Icon = whyChooseIcons[index % whyChooseIcons.length];
                                    return (
                                        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center shadow-md">
                                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#002147] text-[#2563EB]">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            {isEditingItem ? (
                                                <>
                                                    <InlineEditField
                                                        value={item.title}
                                                        onChange={(v) => onFieldChange('title', v)}
                                                        isEditing={isEditingItem}
                                                        className="mt-5 font-serif text-lg font-bold text-[#002147] bg-transparent border-none text-center"
                                                        placeholder={t('Feature title')}
                                                    />

                                                    <InlineEditField
                                                        value={item.description}
                                                        onChange={(v) => onFieldChange('description', v)}
                                                        isEditing={isEditingItem}
                                                        multiline
                                                        rows={3}
                                                        className="mt-3 text-sm leading-6 text-stone-600 bg-transparent border-none text-center"
                                                        placeholder={t('Feature description...')}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <h3 className="mt-5 font-serif text-lg font-bold text-[#002147]">
                                                        {item.title}
                                                    </h3>
                                                    <p className="mt-3 text-sm leading-6 text-stone-600">
                                                        {item.description}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                        )}
                    </section>

                    {/* ── 10. Departments ── */}
                    <section id="departments" className="bg-white">
                        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                            <div className="text-center">
                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2563EB]">
                                    {t('Academics')}
                                </p>
                                <h2 className="mt-3 font-serif text-3xl font-bold text-[#002147] sm:text-4xl">
                                    {t('Our Departments')}
                                </h2>
                            </div>

                            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {cmsContent.templateFiveDepartments.map((dept) => (
                                    <div
                                        key={dept.title}
                                        className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-md transition hover:shadow-lg"
                                    >
                                        <div className="bg-[#002147] px-6 py-4">
                                            <h3 className="font-serif text-lg font-bold text-white">{dept.title}</h3>
                                        </div>
                                        <div className="px-6 py-5">
                                            <p className="text-sm leading-6 text-stone-600">{dept.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {isEditing && (
                            <InlineArrayEditor
                                items={cmsContent.templateFiveDepartments}
                                isEditing={isEditing}
                                onChange={(items) => onArrayChange?.('templateFiveDepartments', items)}
                                newItemDefaults={{ title: '', description: '' }}
                                addLabel="Add Department"
                                emptyLabel="No departments yet"
                                renderItem={(item, index, isEditingItem, onFieldChange) => (
                                    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-md">
                                        <div className="bg-[#002147] px-6 py-4">
                                            {isEditingItem ? (
                                                <InlineEditField
                                                    value={item.title}
                                                    onChange={(v) => onFieldChange('title', v)}
                                                    isEditing={isEditingItem}
                                                    className="font-serif text-lg font-bold text-white bg-transparent border-none"
                                                    placeholder={t('Department Name')}
                                                />
                                            ) : (
                                                <h3 className="font-serif text-lg font-bold text-white">
                                                    {item.title}
                                                </h3>
                                            )}
                                        </div>
                                        <div className="px-6 py-5">
                                            {isEditingItem ? (
                                                <InlineEditField
                                                    value={item.description}
                                                    onChange={(v) => onFieldChange('description', v)}
                                                    isEditing={isEditingItem}
                                                    multiline
                                                    rows={4}
                                                    className="text-sm leading-6 text-stone-600 bg-transparent border-none"
                                                    placeholder={t('Department description...')}
                                                />
                                            ) : (
                                                <p className="text-sm leading-6 text-stone-600">{item.description}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            />
                        )}
                    </section>

                    {/* ── 11. Events & News (two-column) ── */}
                    <section className="bg-[#F0F4F8]">
                        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                            <div className="grid gap-8 lg:grid-cols-2">
                                {/* Events */}
                                <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md sm:p-8">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#002147] text-[#2563EB]">
                                            <CalendarRange className="h-5 w-5" />
                                        </div>
                                        <h3 className="font-serif text-xl font-bold text-[#002147]">{t('Events')}</h3>
                                    </div>
                                    <div className="mt-6 space-y-4">
                                        {cmsContent.templateFiveEvents.map((event) => (
                                            <div key={event.title} className="border-l-4 border-[#2563EB] pl-4">
                                                <h4 className="text-sm font-bold text-[#002147]">{event.title}</h4>
                                                <p className="mt-1 text-xs leading-5 text-stone-500">{event.detail}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* News */}
                                <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md sm:p-8">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB] text-white">
                                            <BookOpen className="h-5 w-5" />
                                        </div>
                                        <h3 className="font-serif text-xl font-bold text-[#002147]">{t('News')}</h3>
                                    </div>
                                    <div className="mt-6 space-y-4">
                                        {cmsContent.templateFiveNews.map((news) => (
                                            <div key={news.title} className="border-l-4 border-[#002147] pl-4">
                                                <h4 className="text-sm font-bold text-[#002147]">{news.title}</h4>
                                                <p className="mt-1 text-xs leading-5 text-stone-500">{news.detail}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {isEditing && (
                            <div className="space-y-4">
                                <InlineArrayEditor
                                    items={cmsContent.templateFiveEvents}
                                    isEditing={isEditing}
                                    onChange={(items) => onArrayChange?.('templateFiveEvents', items)}
                                    newItemDefaults={{ title: '', detail: '' }}
                                    addLabel="Add Event"
                                    emptyLabel="No events yet"
                                    renderItem={(item, index, isEditingItem, onFieldChange) => (
                                        <div className="border-l-4 border-[#2563EB] pl-4">
                                            {isEditingItem ? (
                                                <>
                                                    <InlineEditField
                                                        value={item.title}
                                                        onChange={(v) => onFieldChange('title', v)}
                                                        isEditing={isEditingItem}
                                                        className="text-sm font-bold text-[#002147] bg-transparent border-none"
                                                        placeholder={t('Event title')}
                                                    />

                                                    <InlineEditField
                                                        value={item.detail}
                                                        onChange={(v) => onFieldChange('detail', v)}
                                                        isEditing={isEditingItem}
                                                        multiline
                                                        rows={2}
                                                        className="mt-1 text-xs leading-5 text-stone-500 bg-transparent border-none"
                                                        placeholder={t('Event details...')}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <h4 className="text-sm font-bold text-[#002147]">{item.title}</h4>
                                                    <p className="mt-1 text-xs leading-5 text-stone-500">
                                                        {item.detail}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                />

                                <InlineArrayEditor
                                    items={cmsContent.templateFiveNews}
                                    isEditing={isEditing}
                                    onChange={(items) => onArrayChange?.('templateFiveNews', items)}
                                    newItemDefaults={{ title: '', detail: '' }}
                                    addLabel="Add News"
                                    emptyLabel="No news yet"
                                    renderItem={(item, index, isEditingItem, onFieldChange) => (
                                        <div className="border-l-4 border-[#002147] pl-4">
                                            {isEditingItem ? (
                                                <>
                                                    <InlineEditField
                                                        value={item.title}
                                                        onChange={(v) => onFieldChange('title', v)}
                                                        isEditing={isEditingItem}
                                                        className="text-sm font-bold text-[#002147] bg-transparent border-none"
                                                        placeholder={t('News title')}
                                                    />

                                                    <InlineEditField
                                                        value={item.detail}
                                                        onChange={(v) => onFieldChange('detail', v)}
                                                        isEditing={isEditingItem}
                                                        multiline
                                                        rows={2}
                                                        className="mt-1 text-xs leading-5 text-stone-500 bg-transparent border-none"
                                                        placeholder={t('News details...')}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <h4 className="text-sm font-bold text-[#002147]">{item.title}</h4>
                                                    <p className="mt-1 text-xs leading-5 text-stone-500">
                                                        {item.detail}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                />
                            </div>
                        )}
                    </section>

                    {/* ── 12. Gallery ── */}
                    <section id="gallery" className="bg-white">
                        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                            <div className="text-center">
                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2563EB]">
                                    {t('Gallery')}
                                </p>
                                <h2 className="mt-3 font-serif text-3xl font-bold text-[#002147] sm:text-4xl">
                                    {isEditing ? (
                                        <InlineEditField
                                            value={cmsContent.templateFiveGalleryTitle}
                                            onChange={(v) => updateDraft('gallery', 'templateFiveGalleryTitle', v)}
                                            isEditing={isEditing}
                                            as="h2"
                                            className="text-3xl font-bold text-[#002147] bg-transparent border-none"
                                        />
                                    ) : (
                                        cmsContent.templateFiveGalleryTitle
                                    )}
                                </h2>
                                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-stone-600">
                                    {isEditing ? (
                                        <InlineEditField
                                            value={cmsContent.templateFiveGalleryDescription}
                                            onChange={(v) =>
                                                updateDraft('gallery', 'templateFiveGalleryDescription', v)
                                            }
                                            isEditing={isEditing}
                                            multiline
                                            rows={3}
                                            className="text-gray-600 bg-transparent border-none"
                                        />
                                    ) : (
                                        cmsContent.templateFiveGalleryDescription
                                    )}
                                </p>
                            </div>

                            {!isEditing ? (
                                (() => {
                                    const homeAlbumMap = new Map<string, typeof cmsContent.templateFiveGalleryItems>();
                                    cmsContent.templateFiveGalleryItems.forEach((item, idx) => {
                                        const cat = item.category || '';
                                        if (!homeAlbumMap.has(cat)) homeAlbumMap.set(cat, []);
                                        homeAlbumMap.get(cat)!.push(item);
                                    });
                                    const homeAlbumNames = [...homeAlbumMap.keys()];

                                    return (
                                        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                            {homeAlbumNames.map((albumName) => {
                                                const albumItems = homeAlbumMap.get(albumName) || [];
                                                const coverItem = albumItems.find((it) => it.image) || albumItems[0];
                                                const coverImage =
                                                    coverItem?.image ||
                                                    galleryImages[
                                                        cmsContent.templateFiveGalleryItems.indexOf(coverItem) %
                                                            galleryImages.length
                                                    ] ||
                                                    '';
                                                const imageCount = albumItems.filter((it) => it.image).length;

                                                return (
                                                    <article
                                                        key={albumName || '__unassigned'}
                                                        className="group/album cursor-pointer overflow-hidden rounded-xl border border-stone-200 bg-white shadow-md transition hover:shadow-xl"
                                                        onClick={() => {
                                                            setGalleryLightboxAlbum(albumName);
                                                            setGalleryLightboxIndex(0);
                                                        }}
                                                    >
                                                        <div className="relative h-56 w-full overflow-hidden">
                                                            {coverImage ? (
                                                                <img
                                                                    src={coverImage}
                                                                    alt={albumName}
                                                                    className="h-full w-full object-cover transition duration-500 group-hover/album:scale-110"
                                                                />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#002147,#003366)]">
                                                                    <ImageIcon className="h-12 w-12 text-[#2563EB]/30" />
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                                            {imageCount > 0 && (
                                                                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-[10px] font-bold text-white">
                                                                    <ImageIcon className="h-3 w-3" />
                                                                    {imageCount} image
                                                                    {imageCount !== 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                            <div className="absolute bottom-0 left-0 right-0 p-5">
                                                                <h3 className="font-serif text-xl font-bold text-white drop-shadow-lg">
                                                                    {albumName || 'Album'}
                                                                </h3>
                                                            </div>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {cmsContent.templateFiveGalleryItems.map((item, index) => {
                                        const displayImage =
                                            item.image || galleryImages[index % galleryImages.length] || '';
                                        return (
                                            <article
                                                key={item.title + index}
                                                className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-md transition hover:shadow-lg"
                                            >
                                                <div className="relative h-48 w-full group/gallery">
                                                    {displayImage ? (
                                                        <img
                                                            src={displayImage}
                                                            alt={item.title}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#002147,#003366)]">
                                                            <ImageIcon className="h-10 w-10 text-[#2563EB]/40" />
                                                        </div>
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        id={`gallery-upload-${index}`}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const fd = new FormData();
                                                            fd.append('image', file);
                                                            fd.append('folder', 'template5/gallery');
                                                            fetch('/upload/image', {
                                                                method: 'POST',
                                                                body: fd,
                                                            })
                                                                .then((r) => r.json())
                                                                .then((d) => {
                                                                    if (d.url) {
                                                                        const updated = [
                                                                            ...cmsContent.templateFiveGalleryItems,
                                                                        ];
                                                                        updated[index] = {
                                                                            ...updated[index],
                                                                            image: d.url,
                                                                        };
                                                                        onArrayChange?.(
                                                                            'templateFiveGalleryItems',
                                                                            updated as any,
                                                                        );
                                                                    }
                                                                })
                                                                .catch(() => alert('Upload failed'));
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={`gallery-upload-${index}`}
                                                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/gallery:opacity-100 cursor-pointer transition"
                                                    >
                                                        <span className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow hover:bg-slate-50">
                                                            <ImageIcon className="h-3 w-3" /> Change Image
                                                        </span>
                                                    </label>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#2563EB] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                                                        <ImageIcon className="h-3 w-3" />
                                                        {item.category}
                                                    </span>
                                                </div>
                                                <div className="p-5">
                                                    <h3 className="font-serif text-lg font-bold text-[#002147]">
                                                        {item.title}
                                                    </h3>
                                                    <p className="mt-2 text-sm leading-6 text-stone-600">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {isEditing && (
                            <InlineArrayEditor
                                items={cmsContent.templateFiveGalleryItems}
                                isEditing={isEditing}
                                onChange={(items) => onArrayChange?.('templateFiveGalleryItems', items)}
                                newItemDefaults={{
                                    title: '',
                                    category: '',
                                    description: '',
                                    image: '',
                                }}
                                addLabel="Add Gallery Item"
                                emptyLabel="No gallery items yet"
                                renderItem={(item, index, isEditingItem, onFieldChange) => (
                                    <div className="grid grid-cols-[200px_1fr] gap-4">
                                        <div className="relative h-32 overflow-hidden rounded-lg group/gallery-item">
                                            {item.image || galleryImages[index % galleryImages.length] ? (
                                                <img
                                                    src={
                                                        item.image || galleryImages[index % galleryImages.length] || ''
                                                    }
                                                    alt={item.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#002147,#003366)]">
                                                    <ImageIcon className="h-8 w-8 text-[#2563EB]/40" />
                                                </div>
                                            )}
                                            {isEditingItem && (
                                                <>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        id={`gallery-inline-upload-${index}`}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const fd = new FormData();
                                                            fd.append('image', file);
                                                            fd.append('folder', 'template5/gallery');
                                                            fetch('/upload/image', {
                                                                method: 'POST',
                                                                body: fd,
                                                            })
                                                                .then((r) => r.json())
                                                                .then((d) => {
                                                                    if (d.url) {
                                                                        const updated = [
                                                                            ...cmsContent.templateFiveGalleryItems,
                                                                        ];
                                                                        updated[index] = {
                                                                            ...updated[index],
                                                                            image: d.url,
                                                                        };
                                                                        onArrayChange?.(
                                                                            'templateFiveGalleryItems',
                                                                            updated as any,
                                                                        );
                                                                    }
                                                                })
                                                                .catch(() => alert('Upload failed'));
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={`gallery-inline-upload-${index}`}
                                                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/gallery-item:opacity-100 cursor-pointer transition"
                                                    >
                                                        <span className="text-[10px] font-medium text-white bg-black/50 rounded px-2 py-1">
                                                            {t('Change')}
                                                        </span>
                                                    </label>
                                                    {(item.image || galleryImages[index % galleryImages.length]) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = [
                                                                    ...cmsContent.templateFiveGalleryItems,
                                                                ];
                                                                updated[index] = {
                                                                    ...updated[index],
                                                                    image: '',
                                                                };
                                                                onArrayChange?.(
                                                                    'templateFiveGalleryItems',
                                                                    updated as any,
                                                                );
                                                            }}
                                                            className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white opacity-0 group-hover/gallery-item:opacity-100 transition text-xs"
                                                            title={t('Remove image')}
                                                        >
                                                            &times;
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            {isEditingItem ? (
                                                <>
                                                    <div className="mb-2">
                                                        <InlineEditField
                                                            value={item.category}
                                                            onChange={(v) => onFieldChange('category', v)}
                                                            isEditing={isEditingItem}
                                                            className="inline-block rounded-full bg-[#2563EB] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-transparent border-dashed border-[#2563EB]"
                                                            placeholder={t('Event / Category name')}
                                                        />
                                                    </div>
                                                    <InlineEditField
                                                        value={item.title}
                                                        onChange={(v) => onFieldChange('title', v)}
                                                        isEditing={isEditingItem}
                                                        as="h3"
                                                        className="font-serif text-lg font-bold text-[#002147] bg-transparent border-none"
                                                        placeholder={t('Gallery item title')}
                                                    />

                                                    <InlineEditField
                                                        value={item.description}
                                                        onChange={(v) => onFieldChange('description', v)}
                                                        isEditing={isEditingItem}
                                                        multiline
                                                        rows={2}
                                                        className="mt-2 text-sm leading-6 text-stone-600 bg-transparent border-none"
                                                        placeholder={t('Description...')}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <span className="inline-flex items-center gap-1 self-start rounded-full bg-[#2563EB] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                                                        <ImageIcon className="h-3 w-3" />
                                                        {item.category}
                                                    </span>
                                                    <h3 className="mt-2 font-serif text-lg font-bold text-[#002147]">
                                                        {item.title}
                                                    </h3>
                                                    <p className="mt-2 text-sm leading-6 text-stone-600">
                                                        {item.description}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            />
                        )}
                    </section>

                    {galleryLightboxAlbum !== null &&
                        (() => {
                            const albumItems = cmsContent.templateFiveGalleryItems.filter(
                                (it) => (it.category || '') === galleryLightboxAlbum,
                            );
                            const lightboxImages = albumItems
                                .map((it) => it.image || '')
                                .filter(Boolean)
                                .map((url, idx) => ({
                                    url,
                                    title: albumItems[idx]?.title || '',
                                    caption: albumItems[idx]?.description || '',
                                }));
                            return lightboxImages.length > 0 ? (
                                <ImageLightbox
                                    images={lightboxImages}
                                    initialIndex={galleryLightboxIndex || 0}
                                    onClose={() => {
                                        setGalleryLightboxAlbum(null);
                                        setGalleryLightboxIndex(null);
                                    }}
                                    albumTitle={galleryLightboxAlbum || undefined}
                                />
                            ) : null;
                        })()}

                    {/* ── 13. Testimonials ── */}
                    <section className="bg-[#F0F4F8]">
                        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                            <div className="text-center">
                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2563EB]">
                                    {t('Testimonials')}
                                </p>
                                <h2 className="mt-3 font-serif text-3xl font-bold text-[#002147] sm:text-4xl">
                                    {t('What people say about us')}
                                </h2>
                            </div>

                            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {cmsContent.templateFiveTestimonials.map((item) => (
                                    <div
                                        key={item.name}
                                        className="rounded-xl border border-stone-200 bg-white p-6 shadow-md"
                                    >
                                        <Quote className="h-8 w-8 text-[#2563EB]/40" />
                                        <p className="mt-4 text-sm leading-7 text-stone-600">{item.quote}</p>
                                        <div className="mt-5 border-t border-stone-100 pt-4">
                                            <p className="font-serif text-sm font-bold text-[#002147]">{item.name}</p>
                                            <p className="text-xs text-stone-500">{item.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {isEditing && (
                            <InlineArrayEditor
                                items={cmsContent.templateFiveTestimonials}
                                isEditing={isEditing}
                                onChange={(items) => onArrayChange?.('templateFiveTestimonials', items)}
                                newItemDefaults={{
                                    quote: '',
                                    name: '',
                                    role: '',
                                }}
                                addLabel="Add Testimonial"
                                emptyLabel="No testimonials yet"
                                renderItem={(item, index, isEditingItem, onFieldChange) => (
                                    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md">
                                        <Quote className="h-8 w-8 text-[#2563EB]/40" />
                                        {isEditingItem ? (
                                            <>
                                                <InlineEditField
                                                    value={item.quote}
                                                    onChange={(v) => onFieldChange('quote', v)}
                                                    isEditing={isEditingItem}
                                                    multiline
                                                    rows={3}
                                                    className="mt-4 text-sm leading-7 text-stone-600 bg-transparent border-none"
                                                    placeholder={t('What they said...')}
                                                />

                                                <div className="mt-5 border-t border-stone-100 pt-4">
                                                    <InlineEditField
                                                        value={item.name}
                                                        onChange={(v) => onFieldChange('name', v)}
                                                        isEditing={isEditingItem}
                                                        className="font-serif text-sm font-bold text-[#002147] bg-transparent border-none"
                                                        placeholder={t("Person's name")}
                                                    />

                                                    <InlineEditField
                                                        value={item.role}
                                                        onChange={(v) => onFieldChange('role', v)}
                                                        isEditing={isEditingItem}
                                                        className="text-xs text-stone-500 bg-transparent border-none"
                                                        placeholder={t('Role / Class')}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="mt-4 text-sm leading-7 text-stone-600">{item.quote}</p>
                                                <div className="mt-5 border-t border-stone-100 pt-4">
                                                    <p className="font-serif text-sm font-bold text-[#002147]">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-xs text-stone-500">{item.role}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            />
                        )}
                    </section>

                    {/* ── 14. Online Admission CTA ── */}
                    <section id="admissions" className="bg-[linear-gradient(135deg,#002147_0%,#001530_100%)]">
                        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
                            <div className="grid gap-8 items-center lg:grid-cols-[1.1fr_0.9fr]">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2563EB]">
                                        {t('Admissions')}
                                    </p>
                                    <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
                                        {t('Online Admission')}
                                    </h2>
                                    <p className="mt-5 max-w-lg text-sm leading-7 text-white/70">
                                        {t(
                                            "Begin your child's journey with us through our simple and transparent online admission process. Our team is here to guide you at every step.",
                                        )}
                                    </p>

                                    <ul className="mt-6 space-y-3">
                                        {[
                                            'Transparent and merit-based selection',
                                            'Scholarship support available',
                                            'Dedicated admissions counselling',
                                        ].map((point) => (
                                            <li key={point} className="flex items-center gap-3 text-sm text-white/80">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-bold text-white">
                                                    ✓
                                                </span>
                                                {point}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-8">
                                        <Link
                                            href="/admissions/apply"
                                            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-[#1d4ed8]"
                                        >
                                            <Send className="h-4 w-4" />
                                            {cmsContent.applyNowLabel}
                                        </Link>
                                    </div>
                                </div>

                                <div className="hidden lg:block">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                                        <GraduationCap className="mx-auto h-20 w-20 text-[#2563EB]/30" />
                                        <p className="mt-6 text-center font-serif text-lg text-white/50">
                                            {t('Your future starts here')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── 15. Contact Section ── */}
                    <section id="contact" className="bg-white">
                        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                            <div className="text-center">
                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2563EB]">
                                    {t('Get in Touch')}
                                </p>
                                <h2 className="mt-3 font-serif text-3xl font-bold text-[#002147] sm:text-4xl">
                                    {isEditing ? (
                                        <InlineEditField
                                            value={cmsContent.templateFiveContactTitle}
                                            onChange={(v) => updateDraft('contact', 'templateFiveContactTitle', v)}
                                            isEditing={isEditing}
                                            as="h2"
                                            className="text-3xl font-bold text-[#002147] bg-transparent border-none"
                                        />
                                    ) : (
                                        cmsContent.templateFiveContactTitle
                                    )}
                                </h2>
                            </div>

                            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {cmsContent.templateFiveContactItems.map((item, index) => {
                                    const Icon = contactIcons[index % contactIcons.length];
                                    return (
                                        <div
                                            key={item.title}
                                            className="rounded-xl border border-stone-200 bg-[#F0F4F8] p-6 text-center shadow-md"
                                        >
                                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#002147] text-[#2563EB]">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-stone-500">
                                                {item.title}
                                            </p>
                                            <p className="mt-2 font-serif text-lg font-bold text-[#002147]">
                                                {item.value}
                                            </p>
                                            <p className="mt-2 text-sm leading-6 text-stone-500">{item.description}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {cmsContent.templateFiveMapEmbedUrl && (
                                <div className="mt-10 overflow-hidden rounded-xl border border-stone-200 shadow-md">
                                    <iframe
                                        src={cmsContent.templateFiveMapEmbedUrl}
                                        title={`${cmsContent.brandName} map`}
                                        className="h-64 w-full border-0 sm:h-80"
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        allowFullScreen
                                    />
                                </div>
                            )}
                        </div>
                        {isEditing && (
                            <InlineArrayEditor
                                items={cmsContent.templateFiveContactItems}
                                isEditing={isEditing}
                                onChange={(items) => onArrayChange?.('templateFiveContactItems', items)}
                                newItemDefaults={{
                                    title: '',
                                    value: '',
                                    description: '',
                                }}
                                addLabel="Add Contact Item"
                                emptyLabel="No contact items yet"
                                renderItem={(item, index, isEditingItem, onFieldChange) => {
                                    const Icon = contactIcons[index % contactIcons.length];
                                    return (
                                        <div className="rounded-xl border border-stone-200 bg-[#F0F4F8] p-6 text-center shadow-md">
                                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#002147] text-[#2563EB]">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            {isEditingItem ? (
                                                <>
                                                    <InlineEditField
                                                        value={item.title}
                                                        onChange={(v) => onFieldChange('title', v)}
                                                        isEditing={isEditingItem}
                                                        className="mt-4 text-xs font-bold uppercase tracking-wider text-stone-500 bg-transparent border-none text-center"
                                                        placeholder={t('Phone')}
                                                    />

                                                    <InlineEditField
                                                        value={item.value}
                                                        onChange={(v) => onFieldChange('value', v)}
                                                        isEditing={isEditingItem}
                                                        className="mt-2 font-serif text-lg font-bold text-[#002147] bg-transparent border-none text-center"
                                                        placeholder="+91 98765 43210"
                                                    />

                                                    <InlineEditField
                                                        value={item.description}
                                                        onChange={(v) => onFieldChange('description', v)}
                                                        isEditing={isEditingItem}
                                                        multiline
                                                        rows={2}
                                                        className="mt-2 text-sm leading-6 text-stone-500 bg-transparent border-none text-center"
                                                        placeholder={t('Contact description...')}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <p className="mt-4 text-xs font-bold uppercase tracking-wider text-stone-500">
                                                        {item.title}
                                                    </p>
                                                    <p className="mt-2 font-serif text-lg font-bold text-[#002147]">
                                                        {item.value}
                                                    </p>
                                                    <p className="mt-2 text-sm leading-6 text-stone-500">
                                                        {item.description}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                        )}
                    </section>
                </main>

                {/* ── 16. Footer ── */}
                <footer className="bg-[#002147] text-white">
                    <div className="h-1 bg-[#2563EB]" />

                    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                            {cmsContent.templateFiveFooterColumns.map((col, colIndex) => (
                                <div key={col.title}>
                                    {isEditing ? (
                                        <InlineEditField
                                            value={col.title}
                                            onChange={(v) => {
                                                const updated = cmsContent.templateFiveFooterColumns.map((c, i) =>
                                                    i === colIndex
                                                        ? {
                                                              ...c,
                                                              title: v,
                                                          }
                                                        : c,
                                                );
                                                onArrayChange?.('templateFiveFooterColumns', updated as any);
                                            }}
                                            isEditing={isEditing}
                                            className="font-serif text-base font-bold text-[#2563EB] bg-transparent border-none"
                                            placeholder={t('Column title')}
                                        />
                                    ) : (
                                        <h4 className="font-serif text-base font-bold text-[#2563EB]">{col.title}</h4>
                                    )}
                                    <ul className="mt-4 space-y-2">
                                        {col.links.map((link, linkIndex) => (
                                            <li key={link.label} className="group/link flex items-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <InlineEditField
                                                            value={link.label}
                                                            onChange={(v) => {
                                                                const updated =
                                                                    cmsContent.templateFiveFooterColumns.map((c, i) => {
                                                                        if (i !== colIndex) return c;
                                                                        return {
                                                                            ...c,
                                                                            links: c.links.map((l, li) =>
                                                                                li === linkIndex
                                                                                    ? {
                                                                                          ...l,
                                                                                          label: v,
                                                                                      }
                                                                                    : l,
                                                                            ),
                                                                        };
                                                                    });
                                                                onArrayChange?.(
                                                                    'templateFiveFooterColumns',
                                                                    updated as any,
                                                                );
                                                            }}
                                                            isEditing={isEditing}
                                                            className="flex-1 text-sm text-white/60 bg-transparent border-none"
                                                            placeholder={t('Link text')}
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated =
                                                                    cmsContent.templateFiveFooterColumns.map((c, i) => {
                                                                        if (i !== colIndex) return c;
                                                                        return {
                                                                            ...c,
                                                                            links: c.links.filter(
                                                                                (_, li) => li !== linkIndex,
                                                                            ),
                                                                        };
                                                                    });
                                                                onArrayChange?.(
                                                                    'templateFiveFooterColumns',
                                                                    updated as any,
                                                                );
                                                            }}
                                                            className="text-red-400 opacity-0 group-hover/link:opacity-100 hover:text-red-300"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <a
                                                        href={link.url}
                                                        className="text-sm text-white/60 transition hover:text-[#2563EB]"
                                                    >
                                                        {link.label}
                                                    </a>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = cmsContent.templateFiveFooterColumns.map((c, i) => {
                                                    if (i !== colIndex) return c;
                                                    return {
                                                        ...c,
                                                        links: [
                                                            ...c.links,
                                                            {
                                                                label: 'New Link',
                                                                url: '#',
                                                            },
                                                        ],
                                                    };
                                                });
                                                onArrayChange?.('templateFiveFooterColumns', updated as any);
                                            }}
                                            className="mt-2 text-xs text-[#2563EB]/60 hover:text-[#2563EB]"
                                        >
                                            {'+ '}
                                            {t('Add link')}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={() => {
                                    const updated = [
                                        ...cmsContent.templateFiveFooterColumns,
                                        {
                                            title: 'New Column',
                                            links: [{ label: 'Link', url: '#' }],
                                        },
                                    ];

                                    onArrayChange?.('templateFiveFooterColumns', updated as any);
                                }}
                                className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#2563EB]/40 px-4 py-2 text-xs font-medium text-[#2563EB]/70 transition hover:border-[#2563EB] hover:text-[#2563EB]"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add Footer Column
                            </button>
                        )}
                    </div>

                    <div className="border-t border-white/10">
                        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
                            <div>
                                <p className="text-xs text-white/50">{cmsContent.templateFiveFooterCopyright}</p>
                                <p className="mt-1 text-[10px] text-white/30">{cmsContent.templateFiveFooterTagline}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {cmsContent.templateFiveSocialFacebook && (
                                    <a
                                        href={cmsContent.templateFiveSocialFacebook}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:border-[#2563EB] hover:text-[#2563EB]"
                                    >
                                        <Facebook className="h-3.5 w-3.5" />
                                    </a>
                                )}
                                {cmsContent.templateFiveSocialTwitter && (
                                    <a
                                        href={cmsContent.templateFiveSocialTwitter}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:border-[#2563EB] hover:text-[#2563EB]"
                                    >
                                        <Twitter className="h-3.5 w-3.5" />
                                    </a>
                                )}
                                {cmsContent.templateFiveSocialYoutube && (
                                    <a
                                        href={cmsContent.templateFiveSocialYoutube}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:border-[#2563EB] hover:text-[#2563EB]"
                                    >
                                        <Youtube className="h-3.5 w-3.5" />
                                    </a>
                                )}
                                {cmsContent.templateFiveSocialInstagram && (
                                    <a
                                        href={cmsContent.templateFiveSocialInstagram}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:border-[#2563EB] hover:text-[#2563EB]"
                                    >
                                        <Instagram className="h-3.5 w-3.5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
