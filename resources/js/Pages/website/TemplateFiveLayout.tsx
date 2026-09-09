import { useLanguage } from '../../i18n/LanguageProvider';
import { Link } from '@inertiajs/react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import {
    Award,
    ChevronDown,
    ChevronRight,
    Facebook,
    GraduationCap,
    Instagram,
    Check,
    Mail,
    MapPin,
    Menu,
    Pencil,
    Phone,
    Plus,
    Send,
    X,
    Twitter,
    Youtube,
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import { WebsiteContent, WebsiteMenuItem } from '../../utils/websiteCmsContent';
import type { CurrentUser } from '../Home';

interface TemplateFiveLayoutProps {
    cmsContent: WebsiteContent;
    children: ReactNode;
    activePageSlug?: string;
    activePageId?: number;
    publishedPages?: Array<{ title: string; slug: string }>;
    menuPages?: Array<{ title: string; slug: string }>;
    user?: CurrentUser | null;
    isEditing?: boolean;
    onToggleEditing?: () => void;
}

function resolveMenuItemUrl(item: WebsiteMenuItem, publishedPages: Array<{ title: string; slug: string }>): string {
    if (item.pageSlug) {
        const pageExists = publishedPages.some((p) => p.slug === item.pageSlug);
        return pageExists ? `/pages/${item.pageSlug}` : '#';
    }
    return item.url;
}

function MenuItemDropdown({
    item,
    activePageSlug,
    publishedPages,
}: {
    item: WebsiteMenuItem;
    activePageSlug?: string;
    publishedPages: Array<{ title: string; slug: string }>;
}) {
    const [open, setOpen] = useState(false);
    const href = resolveMenuItemUrl(item, publishedPages);

    if (!item.children || item.children.length === 0) {
        const isPageLink = href.startsWith('/pages/');
        const slug = isPageLink ? href.replace('/pages/', '') : null;
        const isActive = slug && slug === activePageSlug;
        const isInternal = href.startsWith('/');

        if (isInternal) {
            return (
                <Link
                    href={href}
                    className={`inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold transition ${
                        isActive ? 'text-[#002147] bg-white/30' : 'text-white hover:text-[#002147]'
                    }`}
                >
                    {item.label}
                </Link>
            );
        }
        return (
            <a
                href={href}
                className={`inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold transition ${
                    isActive ? 'text-[#002147] bg-white/30' : 'text-white hover:text-[#002147]'
                }`}
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
                        const childHref = resolveMenuItemUrl(child, publishedPages);
                        const isPageLink = childHref.startsWith('/pages/');
                        const slug = isPageLink ? childHref.replace('/pages/', '') : null;
                        const isActive = slug && slug === activePageSlug;
                        const isInternal = childHref.startsWith('/');
                        if (isInternal) {
                            return (
                                <Link
                                    key={child.label}
                                    href={childHref}
                                    className={`block px-4 py-2.5 text-sm transition ${
                                        isActive
                                            ? 'bg-[#2563EB]/20 text-[#002147] font-semibold'
                                            : 'text-stone-700 hover:bg-[#2563EB]/10 hover:text-[#002147]'
                                    }`}
                                >
                                    {child.label}
                                </Link>
                            );
                        }
                        return (
                            <a
                                key={child.label}
                                href={childHref}
                                className={`block px-4 py-2.5 text-sm transition ${
                                    isActive
                                        ? 'bg-[#2563EB]/20 text-[#002147] font-semibold'
                                        : 'text-stone-700 hover:bg-[#2563EB]/10 hover:text-[#002147]'
                                }`}
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

export default function TemplateFiveLayout({
    cmsContent,
    children,
    activePageSlug,
    activePageId,
    publishedPages = [],
    menuPages = [],
    user,
    isEditing,
    onToggleEditing,
}: TemplateFiveLayoutProps) {
    const { t } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const menuItems = cmsContent.templateFiveMainMenuItems;

    return (
        <div className="min-h-screen bg-[#F0F4F8] text-stone-900">
            {/* Top Utility Bar */}
            <div className="bg-[#002147] text-white text-xs">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-2 sm:px-8">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {cmsContent.templateFiveTopPhone}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {cmsContent.templateFiveTopEmail}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {cmsContent.templateFiveTopAddress}
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

            {/* Header */}
            <header className="bg-white border-b border-stone-200">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
                    <Link href="/" className="flex items-center gap-4">
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
                        {cmsContent.templateFiveShowAccreditedBadge !== false && (
                            <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-[#F0F4F8] px-3 py-1.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#002147] text-white">
                                    <Award className="h-4 w-4" />
                                </div>
                                <div className="pr-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#002147]">
                                        {cmsContent.templateFiveAccreditedBadgeLabel || 'Accredited'}
                                    </p>
                                    <p className="text-[10px] text-stone-500">
                                        {cmsContent.templateFiveAccreditedBadgeGrade || 'NAAC A+ Grade'}
                                    </p>
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

            {/* Main Navigation Bar */}
            <nav className="bg-[#2563EB] sticky top-0 z-30 shadow-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8">
                    <div className="hidden lg:flex items-center">
                        {menuItems.map((item) => (
                            <MenuItemDropdown
                                key={item.label}
                                item={item}
                                activePageSlug={activePageSlug}
                                publishedPages={publishedPages}
                            />
                        ))}
                        {menuPages
                            .filter((page) => !menuItems.some((item) => item.pageSlug === page.slug))
                            .map((page) => {
                                const isActive = page.slug === activePageSlug;
                                return (
                                    <Link
                                        key={page.slug}
                                        href={`/pages/${page.slug}`}
                                        className={`inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold transition ${isActive ? 'text-[#002147] bg-white/30' : 'text-white hover:text-[#002147]'}`}
                                    >
                                        {page.title}
                                    </Link>
                                );
                            })}
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
                {mobileMenuOpen && (
                    <div className="lg:hidden border-t border-[#2563EB]/50 bg-white">
                        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-1">
                            {menuItems.map((item) => {
                                const itemHref = resolveMenuItemUrl(item, publishedPages);
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
                                                    const childHref = resolveMenuItemUrl(child, publishedPages);
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
                            {menuPages
                                .filter((page) => !menuItems.some((item) => item.pageSlug === page.slug))
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

            {/* Marquee */}
            {cmsContent.templateFiveMarqueeItems.length > 0 && (
                <div className="bg-[#002147] border-b border-[#2563EB]/30 overflow-hidden">
                    <div className="mx-auto flex max-w-7xl items-center">
                        <span className="shrink-0 bg-[#2563EB] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#002147]">
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

            <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 25s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
      `}</style>

            <main>{children}</main>

            {/* Footer */}
            <footer className="bg-[#002147] text-white">
                <div className="h-1 bg-[#2563EB]" />
                <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {cmsContent.templateFiveFooterColumns.map((col) => (
                            <div key={col.title}>
                                <h4 className="font-serif text-base font-bold text-[#2563EB]">{col.title}</h4>
                                <ul className="mt-4 space-y-2">
                                    {col.links.map((link) => (
                                        <li key={link.label}>
                                            <a
                                                href={link.url}
                                                className="text-sm text-white/60 transition hover:text-[#2563EB]"
                                            >
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
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
    );
}
