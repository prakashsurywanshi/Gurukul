import { useLanguage } from '../../i18n/LanguageProvider';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import {
    ArrowRight,
    Award,
    BookOpen,
    Bus,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    FlaskConical,
    Globe,
    GraduationCap,
    HeartHandshake,
    LibraryBig,
    MapPin,
    Quote,
    Rocket,
    Shield,
    ShieldCheck,
    Sparkles,
    Star,
    Trophy,
    Users,
} from 'lucide-react';
import { WebsiteContent, websiteThemes } from '../../utils/websiteCmsContent';
import type { PublishedPage, CurrentUser } from '../Home';
import InlineEditField from '../../components/website/InlineEditField';
import InlineArrayEditor from '../../components/website/InlineArrayEditor';
import SectionEditBar from '../../components/website/SectionEditBar';
import TopWebsite3DImageSlider from './TopWebsite3DImageSlider';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import OrgSwitchLink from '../../components/OrgSwitchLink';

const featureIcons = [BookOpen, FlaskConical, LibraryBig, Globe];
const pillarIcons = [ShieldCheck, Bus, Trophy, HeartHandshake];
const outcomeIcons = [Award, Rocket, Shield, Users];

interface TemplateOneHomeProps {
    cmsContent: WebsiteContent;
    user?: CurrentUser | null;
    publishedPages?: PublishedPage[];
    isEditing?: boolean;
    onFieldChange?: (key: string, value: string) => void;
    onArrayChange?: (key: string, items: any[]) => void;
    translations?: Record<string, Record<string, string>>;
    onTranslationChange?: (fieldKey: string, locale: string, value: string) => void;
    onSaveSection?: (sectionKey: string, data: Record<string, any>) => void;
    isSaving?: boolean;
}

export default function TemplateOneHome({
    cmsContent,
    user,
    publishedPages = [],
    isEditing = false,
    onFieldChange,
    onArrayChange,
    translations,
    onTranslationChange,
    onSaveSection,
    isSaving = false,
}: TemplateOneHomeProps) {
    const { t } = useLanguage();
    const theme = websiteThemes[cmsContent.theme];
    const isLightTheme = true;
    const pageTextClass = isLightTheme ? 'text-slate-900' : 'text-slate-100';
    const headingTextClass = isLightTheme ? 'text-slate-950' : 'text-white';
    const bodyTextClass = isLightTheme ? 'text-slate-600' : 'text-slate-300';
    const softTextClass = isLightTheme ? 'text-slate-500' : 'text-slate-400';
    const borderClass = isLightTheme ? 'border-slate-200/80' : 'border-white/10';
    const glassClass = isLightTheme
        ? 'bg-white/88 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl'
        : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] shadow-[0_25px_60px_rgba(8,15,30,0.28)] backdrop-blur-2xl';
    const secondaryLinkClass = isLightTheme
        ? 'border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300 hover:bg-white'
        : 'border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10';

    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [sectionDrafts, setSectionDrafts] = useState<Record<string, Record<string, any>>>({});

    const updateDraft = (sectionKey: string, field: string, value: string) => {
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

    const renderEditOrText = (
        key: string,
        value: string,
        sectionKey: string,
        className: string,
        options?: {
            as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
            multiline?: boolean;
            rows?: number;
            placeholder?: string;
        },
    ) => {
        if (isEditing) {
            return (
                <InlineEditField
                    value={value}
                    onChange={(v) => updateDraft(sectionKey, key, v)}
                    isEditing={isEditing}
                    className={`${className} bg-transparent border-none`}
                    as={options?.as}
                    multiline={options?.multiline}
                    rows={options?.rows}
                    placeholder={options?.placeholder}
                    fieldKey={key}
                    translations={translations?.[key]}
                    onTranslationChange={(locale, v) => onFieldChange?.(`${key}_${locale}`, v)}
                />
            );
        }
        const Tag = options?.as || 'p';
        return <Tag className={className}>{value}</Tag>;
    };

    return (
        <>
            <Head title={cmsContent.seoTitle} />

            <div className={`min-h-screen ${pageTextClass} ${theme.pageBackground}`}>
                <div className="relative overflow-hidden">
                    <div className={`absolute inset-0 -z-10 ${theme.ambientBackground}`} />
                    <div
                        className={`absolute left-[-8rem] top-24 -z-10 h-64 w-64 rounded-full blur-3xl ${theme.leftGlow}`}
                    />
                    <div
                        className={`absolute right-[-6rem] top-12 -z-10 h-80 w-80 rounded-full blur-3xl ${theme.rightGlow}`}
                    />
                    <div
                        className={`absolute inset-x-0 top-0 -z-10 h-[46rem] ${isLightTheme ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0))]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]'}`}
                    />
                    <div
                        className={`absolute left-[10%] top-32 -z-10 h-40 w-40 rotate-12 rounded-[3rem] border blur-sm ${isLightTheme ? 'border-slate-200/70 bg-white/70' : 'border-white/10 bg-white/5'}`}
                    />
                    <div
                        className={`absolute right-[14%] top-44 -z-10 h-24 w-24 rounded-full border ${isLightTheme ? 'border-slate-200/70 bg-white/80' : 'border-white/10 bg-white/5'}`}
                    />

                    {/* Header */}
                    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
                        <Link href="/" className="flex items-center gap-3">
                            <div
                                className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 bg-white/92 shadow-[0_18px_45px_rgba(37,99,235,0.12)]' : 'border-white/10 bg-white/10 shadow-[0_18px_45px_rgba(14,165,233,0.18)]'} ${theme.logoBadgeText}`}
                            >
                                {cmsContent.brandLogo ? (
                                    <img
                                        src={cmsContent.brandLogo}
                                        alt={`${cmsContent.brandName} logo`}
                                        className="max-h-full max-w-full object-contain p-1"
                                    />
                                ) : (
                                    <GraduationCap className="h-6 w-6" />
                                )}
                            </div>
                            <div>
                                <p className={`text-lg font-black tracking-[0.12em] uppercase ${headingTextClass}`}>
                                    {renderEditOrText(
                                        'brandName',
                                        cmsContent.brandName,
                                        'header',
                                        `text-lg font-black tracking-[0.12em] uppercase ${headingTextClass}`,
                                    )}
                                </p>
                                <p className={`text-xs font-medium tracking-[0.3em] uppercase ${softTextClass}`}>
                                    {renderEditOrText(
                                        'brandSubtitle',
                                        cmsContent.brandSubtitle,
                                        'header',
                                        `text-xs font-medium tracking-[0.3em] uppercase ${softTextClass}`,
                                    )}
                                </p>
                            </div>
                        </Link>

                        <nav
                            className={`hidden items-center gap-8 rounded-full border px-6 py-3 text-sm font-semibold backdrop-blur-xl lg:flex ${isLightTheme ? 'border-slate-200/80 bg-white/85 text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'}`}
                        >
                            <a
                                href="#about"
                                className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}
                            >
                                {cmsContent.navAbout}
                            </a>
                            <a
                                href="#programs"
                                className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}
                            >
                                {cmsContent.navPrograms}
                            </a>
                            <a
                                href="#campus"
                                className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}
                            >
                                {cmsContent.navCampus}
                            </a>
                            <Link
                                href="/admissions/apply"
                                className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}
                            >
                                {cmsContent.navAdmissions}
                            </Link>
                            {publishedPages.map((page) => (
                                <Link
                                    key={page.slug}
                                    href={`/pages/${page.slug}`}
                                    className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}
                                >
                                    {page.title}
                                </Link>
                            ))}
                        </nav>

                        <div className="flex items-center gap-3">
                            <LanguageSwitcher
                                variant="site"
                                className={`${isLightTheme ? 'border-slate-200 bg-white/85 text-slate-800 hover:border-slate-300 hover:bg-white' : 'border-white/15 bg-white/5 text-slate-100 hover:border-white/30 hover:bg-white/10'}`}
                            />

                            <OrgSwitchLink
                                user={user}
                                className={isLightTheme ? 'text-slate-700 hover:text-indigo-600' : 'text-slate-200 hover:text-white'}
                            />
                            <Link
                                href="/login"
                                className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-xl transition ${isLightTheme ? 'border-slate-200 bg-white/85 text-slate-800 hover:border-slate-300 hover:bg-white' : 'border-white/15 bg-white/5 text-slate-100 hover:border-white/30 hover:bg-white/10'}`}
                            >
                                {cmsContent.loginLabel}
                            </Link>
                            <Link
                                href="/admissions/apply"
                                className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition hover:brightness-110 ${theme.topActionButton}`}
                            >
                                {cmsContent.applyNowLabel}
                            </Link>
                        </div>
                    </header>

                    <main>
                        <TopWebsite3DImageSlider
                            slides={cmsContent.templateTwoSlides}
                            sliderImages={cmsContent.sliderImages}
                            isLightTheme={isLightTheme}
                        />

                        {/* Hero Section */}
                        <div
                            className={`relative ${activeSection === 'hero' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        >
                            {isEditing && activeSection === 'hero' && (
                                <SectionEditBar
                                    sectionName="Hero Section"
                                    isDirty={Object.keys(sectionDrafts.hero || {}).length > 0}
                                    isSaving={isSaving}
                                    onSave={() => saveSection('hero')}
                                    onDiscard={() => {
                                        setSectionDrafts((p) => {
                                            const n = { ...p };
                                            delete n.hero;
                                            return n;
                                        });
                                        setActiveSection(null);
                                    }}
                                />
                            )}
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setActiveSection(activeSection === 'hero' ? null : 'hero')}
                                    className="absolute -top-8 right-4 z-50 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-lg hover:bg-blue-700"
                                >
                                    {activeSection === 'hero' ? 'Close' : 'Edit Hero'}
                                </button>
                            )}
                            <section className="mx-auto grid max-w-7xl gap-14 px-5 pb-18 pt-8 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:pb-24 lg:pt-12">
                                <div className="max-w-2xl">
                                    <div
                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-xl ${theme.heroBadge}`}
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        {renderEditOrText(
                                            'heroBadge',
                                            cmsContent.heroBadge,
                                            'hero',
                                            `inline items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-xl ${theme.heroBadge}`,
                                        )}
                                    </div>

                                    <h1
                                        className={`mt-6 text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl ${headingTextClass}`}
                                    >
                                        {renderEditOrText(
                                            'heroTitleLineOne',
                                            cmsContent.heroTitleLineOne,
                                            'hero',
                                            `text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl ${headingTextClass}`,
                                            { as: 'span' },
                                        )}
                                        <span
                                            className={`block bg-clip-text text-transparent ${isLightTheme ? 'bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_45%,#2563EB_100%)]' : 'bg-[linear-gradient(135deg,#67e8f9_0%,#f9a8d4_45%,#bfdbfe_100%)]'}`}
                                        >
                                            {renderEditOrText(
                                                'heroTitleAccent',
                                                cmsContent.heroTitleAccent,
                                                'hero',
                                                `block bg-clip-text text-transparent ${isLightTheme ? 'bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_45%,#2563EB_100%)]' : 'bg-[linear-gradient(135deg,#67e8f9_0%,#f9a8d4_45%,#bfdbfe_100%)]'}`,
                                                { as: 'span' },
                                            )}
                                        </span>
                                    </h1>

                                    {(() => {
                                        const orgType = cmsContent.type ?? '';
                                        if (orgType === 'school' || orgType === '') return null;
                                        const labelKey = orgType === 'coaching' ? 'Coaching Center' : orgType === 'university' ? 'University' : orgType === 'college' ? 'College' : 'School';
                                        return (
                                            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sky-300/40 bg-sky-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:border-slate-700 dark:bg-slate-800/90 dark:text-sky-300">
                                                {t(labelKey)}
                                            </span>
                                        );
                                    })()}

                                    <p className={`mt-6 max-w-xl text-lg leading-8 sm:text-xl ${bodyTextClass}`}>
                                        {renderEditOrText(
                                            'heroDescription',
                                            cmsContent.heroDescription,
                                            'hero',
                                            `mt-6 max-w-xl text-lg leading-8 sm:text-xl ${bodyTextClass}`,
                                            { multiline: true, rows: 3 },
                                        )}
                                    </p>

                                    <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                                        <a
                                            href="#programs"
                                            className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold transition hover:scale-[1.02] ${theme.primaryButton}`}
                                        >
                                            {cmsContent.heroPrimaryCta}
                                            <ArrowRight className="h-4 w-4" />
                                        </a>
                                        <Link
                                            href="/login"
                                            className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold shadow-sm backdrop-blur-xl transition ${theme.secondaryButton}`}
                                        >
                                            {cmsContent.heroSecondaryCta}
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </div>

                                    {/* Highlights */}
                                    {isEditing ? (
                                        <div className="mt-10">
                                            <InlineArrayEditor
                                                items={cmsContent.highlights}
                                                isEditing={isEditing}
                                                onChange={(items) => onArrayChange?.('highlights', items)}
                                                newItemDefaults={{
                                                    value: '',
                                                    label: '',
                                                }}
                                                addLabel="Add Highlight"
                                                emptyLabel="No highlights yet"
                                                renderItem={(item, index, isEditingItem, onFieldChange) => (
                                                    <div
                                                        className={`rounded-3xl border p-5 ${borderClass} ${glassClass}`}
                                                    >
                                                        {isEditingItem ? (
                                                            <>
                                                                <InlineEditField
                                                                    value={item.value}
                                                                    onChange={(v) => onFieldChange('value', v)}
                                                                    isEditing={isEditingItem}
                                                                    className={`text-3xl font-black ${headingTextClass} bg-transparent border-none`}
                                                                    placeholder="3,200+"
                                                                />

                                                                <InlineEditField
                                                                    value={item.label}
                                                                    onChange={(v) => onFieldChange('label', v)}
                                                                    isEditing={isEditingItem}
                                                                    className={`mt-2 text-sm font-medium ${bodyTextClass} bg-transparent border-none`}
                                                                    placeholder={t('Label')}
                                                                />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <p
                                                                    className={`text-3xl font-black ${headingTextClass}`}
                                                                >
                                                                    {item.value}
                                                                </p>
                                                                <p
                                                                    className={`mt-2 text-sm font-medium ${bodyTextClass}`}
                                                                >
                                                                    {item.label}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    ) : (
                                        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                            {cmsContent.highlights.map((item) => (
                                                <div
                                                    key={item.label}
                                                    className={`rounded-3xl border p-5 ${borderClass} ${glassClass}`}
                                                >
                                                    <p className={`text-3xl font-black ${headingTextClass}`}>
                                                        {item.value}
                                                    </p>
                                                    <p className={`mt-2 text-sm font-medium ${bodyTextClass}`}>
                                                        {item.label}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="relative min-h-[34rem] [perspective:1400px]">
                                    <div
                                        className={`absolute right-8 top-2 h-40 w-40 rounded-[2.5rem] border blur-sm ${isLightTheme ? 'border-sky-200/80 bg-sky-200/50' : 'border-cyan-300/15 bg-cyan-300/10'}`}
                                    />
                                    <div
                                        className={`absolute left-6 top-14 h-24 w-24 rounded-[2rem] border ${isLightTheme ? 'border-blue-200/80 bg-blue-100/70' : 'border-fuchsia-300/15 bg-fuchsia-400/10'}`}
                                    />
                                    <div
                                        className={`absolute left-10 top-20 hidden h-28 w-28 rounded-[2rem] border shadow-xl backdrop-blur lg:block [transform:translateZ(40px)_rotate(-8deg)] ${isLightTheme ? 'border-slate-200/80 bg-white/85' : 'border-white/10 bg-white/6'}`}
                                    />
                                    <div
                                        className={`absolute right-0 top-12 h-[28rem] w-full max-w-[34rem] rounded-[2.2rem] border p-6 shadow-[0_40px_90px_rgba(3,8,20,0.12)] backdrop-blur-2xl [transform:rotateY(-16deg)_rotateX(10deg)] sm:p-8 ${isLightTheme ? 'border-slate-200/80 text-slate-900' : 'border-white/12 text-white'} ${theme.spotlightPanel}`}
                                    >
                                        <div
                                            className={`absolute inset-4 rounded-[1.6rem] border ${isLightTheme ? 'border-slate-200/70 bg-[radial-gradient(circle_at_top_right,rgba(147,197,253,0.28),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(253,224,71,0.2),transparent_35%)]' : 'border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.14),transparent_35%)]'}`}
                                        />
                                        <div
                                            className={`relative rounded-[1.5rem] border p-6 ${isLightTheme ? 'border-slate-200/80' : 'border-white/10'} ${theme.spotlightInner}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p
                                                        className={`text-sm uppercase tracking-[0.28em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                                    >
                                                        {cmsContent.featureEyebrow}
                                                    </p>
                                                    <h2 className="mt-3 text-3xl font-bold">
                                                        {cmsContent.featureTitle}
                                                    </h2>
                                                </div>
                                                <div
                                                    className={`rounded-2xl border p-3 backdrop-blur ${isLightTheme ? 'border-slate-200 bg-white/85' : 'border-white/10 bg-white/10'}`}
                                                >
                                                    <Star
                                                        className={`h-6 w-6 ${isLightTheme ? 'text-blue-500' : 'text-blue-200'}`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Features grid - always visible within spotlight */}
                                            {cmsContent.features.map((feature, index) => {
                                                const Icon = featureIcons[index] || BookOpen;
                                                return (
                                                    <div key={feature.title} className="mt-4">
                                                        <div className="grid gap-4 sm:grid-cols-2">
                                                            <div
                                                                className={`rounded-[1.4rem] border p-5 shadow-[0_20px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 bg-white/88' : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.06))]'}`}
                                                            >
                                                                <div
                                                                    className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg ${theme.featureIcon}`}
                                                                >
                                                                    <Icon className="h-5 w-5" />
                                                                </div>
                                                                <h3 className="mt-4 text-lg font-semibold">
                                                                    {feature.title}
                                                                </h3>
                                                                <p
                                                                    className={`mt-2 text-sm leading-6 ${bodyTextClass}`}
                                                                >
                                                                    {feature.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            <div
                                                className={`mt-6 rounded-[1.4rem] border p-5 backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80' : 'border-white/10'} ${theme.openHousePanel}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <CalendarDays
                                                        className={`h-5 w-5 ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                                    />
                                                    <p className="font-semibold">{cmsContent.openHouseLabel}</p>
                                                </div>
                                                <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>
                                                    {cmsContent.openHouseDescription}
                                                </p>
                                                <p className={`mt-3 text-base font-semibold ${headingTextClass}`}>
                                                    {cmsContent.openHouseDate}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className={`absolute bottom-4 left-0 hidden w-56 rounded-[1.6rem] border p-5 shadow-[0_25px_70px_rgba(0,0,0,0.14)] backdrop-blur-2xl lg:block [transform:translateZ(80px)_rotate(-8deg)] ${isLightTheme ? 'border-slate-200/80 text-slate-900' : 'border-white/12 text-white'} ${theme.liveOverviewCard}`}
                                    >
                                        <p
                                            className={`text-xs font-semibold uppercase tracking-[0.28em] ${bodyTextClass}`}
                                        >
                                            {t('Live Overview')}
                                        </p>
                                        <p className="mt-3 text-3xl font-black">{cmsContent.liveOverviewValue}</p>
                                        <p className={`mt-1 text-sm ${bodyTextClass}`}>
                                            {cmsContent.liveOverviewLabel}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* About Section */}
                        <div
                            className={`relative ${activeSection === 'about' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        >
                            {isEditing && activeSection === 'about' && (
                                <SectionEditBar
                                    sectionName="About Section"
                                    isDirty={Object.keys(sectionDrafts.about || {}).length > 0}
                                    isSaving={isSaving}
                                    onSave={() => saveSection('about')}
                                    onDiscard={() => {
                                        setSectionDrafts((p) => {
                                            const n = { ...p };
                                            delete n.about;
                                            return n;
                                        });
                                        setActiveSection(null);
                                    }}
                                />
                            )}
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setActiveSection(activeSection === 'about' ? null : 'about')}
                                    className="absolute -top-8 right-4 z-50 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-lg hover:bg-blue-700"
                                >
                                    {activeSection === 'about' ? 'Close' : 'Edit About'}
                                </button>
                            )}
                            <section id="about" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
                                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                                    <div
                                        className={`rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 text-slate-900' : 'border-white/10 text-white'} ${theme.aboutPanel}`}
                                    >
                                        <p
                                            className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                        >
                                            {renderEditOrText(
                                                'aboutEyebrow',
                                                cmsContent.aboutEyebrow,
                                                'about',
                                                `text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`,
                                            )}
                                        </p>
                                        <h2 className={`mt-4 text-3xl font-bold ${headingTextClass}`}>
                                            {renderEditOrText(
                                                'aboutTitle',
                                                cmsContent.aboutTitle,
                                                'about',
                                                `mt-4 text-3xl font-bold ${headingTextClass}`,
                                                { as: 'h2' },
                                            )}
                                        </h2>
                                        <p className={`mt-4 text-base leading-7 ${bodyTextClass}`}>
                                            {renderEditOrText(
                                                'aboutDescription',
                                                cmsContent.aboutDescription,
                                                'about',
                                                `mt-4 text-base leading-7 ${bodyTextClass}`,
                                                { multiline: true, rows: 4 },
                                            )}
                                        </p>
                                    </div>

                                    {isEditing ? (
                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <InlineArrayEditor
                                                items={cmsContent.pillars}
                                                isEditing={isEditing}
                                                onChange={(items) => onArrayChange?.('pillars', items)}
                                                newItemDefaults={{
                                                    title: '',
                                                    text: '',
                                                }}
                                                addLabel="Add Pillar"
                                                emptyLabel="No pillars yet"
                                                renderItem={(item, index, isEditingItem, onFieldChange) => {
                                                    const Icon = pillarIcons[index] || ShieldCheck;
                                                    return (
                                                        <div
                                                            className={`rounded-[2rem] border p-6 shadow-[0_25px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl transition hover:-translate-y-1 ${borderClass} ${glassClass}`}
                                                        >
                                                            <div
                                                                className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${theme.pillarIcon}`}
                                                            >
                                                                <Icon className="h-5 w-5" />
                                                            </div>
                                                            {isEditingItem ? (
                                                                <>
                                                                    <InlineEditField
                                                                        value={item.title}
                                                                        onChange={(v) => onFieldChange('title', v)}
                                                                        isEditing={isEditingItem}
                                                                        className={`mt-5 text-xl font-bold ${headingTextClass} bg-transparent border-none`}
                                                                        placeholder={t('Pillar title')}
                                                                    />

                                                                    <InlineEditField
                                                                        value={item.text}
                                                                        onChange={(v) => onFieldChange('text', v)}
                                                                        isEditing={isEditingItem}
                                                                        multiline
                                                                        rows={3}
                                                                        className={`mt-2 text-sm leading-6 ${bodyTextClass} bg-transparent border-none`}
                                                                        placeholder={t('Pillar description...')}
                                                                    />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <h3
                                                                        className={`mt-5 text-xl font-bold ${headingTextClass}`}
                                                                    >
                                                                        {item.title}
                                                                    </h3>
                                                                    <p
                                                                        className={`mt-2 text-sm leading-6 ${bodyTextClass}`}
                                                                    >
                                                                        {item.text}
                                                                    </p>
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid gap-5 sm:grid-cols-2">
                                            {cmsContent.pillars.map((pillar, index) => {
                                                const Icon = pillarIcons[index] || ShieldCheck;
                                                return (
                                                    <div
                                                        key={pillar.title}
                                                        className={`rounded-[2rem] border p-6 shadow-[0_25px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl transition hover:-translate-y-1 ${borderClass} ${glassClass}`}
                                                    >
                                                        <div
                                                            className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${theme.pillarIcon}`}
                                                        >
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        <h3 className={`mt-5 text-xl font-bold ${headingTextClass}`}>
                                                            {pillar.title}
                                                        </h3>
                                                        <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>
                                                            {pillar.text}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Programs Section */}
                        <div
                            className={`relative ${activeSection === 'programs' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        >
                            {isEditing && activeSection === 'programs' && (
                                <SectionEditBar
                                    sectionName="Programs Section"
                                    isDirty={Object.keys(sectionDrafts.programs || {}).length > 0}
                                    isSaving={isSaving}
                                    onSave={() => saveSection('programs')}
                                    onDiscard={() => {
                                        setSectionDrafts((p) => {
                                            const n = { ...p };
                                            delete n.programs;
                                            return n;
                                        });
                                        setActiveSection(null);
                                    }}
                                />
                            )}
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setActiveSection(activeSection === 'programs' ? null : 'programs')}
                                    className="absolute -top-8 right-4 z-50 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-lg hover:bg-blue-700"
                                >
                                    {activeSection === 'programs' ? 'Close' : 'Edit Programs'}
                                </button>
                            )}
                            <section id="programs" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
                                <div className="max-w-3xl">
                                    <p
                                        className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                    >
                                        {renderEditOrText(
                                            'programsEyebrow',
                                            cmsContent.programsEyebrow,
                                            'programs',
                                            `text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`,
                                        )}
                                    </p>
                                    <h2 className={`mt-3 text-4xl font-black tracking-tight ${headingTextClass}`}>
                                        {renderEditOrText(
                                            'programsTitle',
                                            cmsContent.programsTitle,
                                            'programs',
                                            `mt-3 text-4xl font-black tracking-tight ${headingTextClass}`,
                                            { as: 'h2' },
                                        )}
                                    </h2>
                                    <p className={`mt-4 text-base leading-7 ${bodyTextClass}`}>
                                        {renderEditOrText(
                                            'programsDescription',
                                            cmsContent.programsDescription,
                                            'programs',
                                            `mt-4 text-base leading-7 ${bodyTextClass}`,
                                            { multiline: true, rows: 3 },
                                        )}
                                    </p>
                                </div>

                                {isEditing ? (
                                    <div className="mt-8">
                                        <InlineArrayEditor
                                            items={cmsContent.programs}
                                            isEditing={isEditing}
                                            onChange={(items) => onArrayChange?.('programs', items)}
                                            newItemDefaults={{
                                                title: '',
                                                age: '',
                                                description: '',
                                            }}
                                            addLabel="Add Program"
                                            emptyLabel="No programs yet"
                                            renderItem={(item, index, isEditingItem, onFieldChange) => (
                                                <div
                                                    className={`rounded-[2rem] border p-6 shadow-[0_28px_65px_rgba(0,0,0,0.12)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_35px_75px_rgba(0,0,0,0.16)] ${
                                                        index % 2 === 0 ? theme.programEven : theme.programOdd
                                                    }`}
                                                >
                                                    {isEditingItem ? (
                                                        <>
                                                            <InlineEditField
                                                                value={item.age}
                                                                onChange={(v) => onFieldChange('age', v)}
                                                                isEditing={isEditingItem}
                                                                className={`text-sm font-semibold uppercase tracking-[0.24em] ${softTextClass} bg-transparent border-none`}
                                                                placeholder={t('Age range')}
                                                            />

                                                            <InlineEditField
                                                                value={item.title}
                                                                onChange={(v) => onFieldChange('title', v)}
                                                                isEditing={isEditingItem}
                                                                className={`mt-4 text-2xl font-bold ${headingTextClass} bg-transparent border-none`}
                                                                placeholder={t('Program title')}
                                                            />

                                                            <InlineEditField
                                                                value={item.description}
                                                                onChange={(v) => onFieldChange('description', v)}
                                                                isEditing={isEditingItem}
                                                                multiline
                                                                rows={3}
                                                                className={`mt-3 text-sm leading-7 ${bodyTextClass} bg-transparent border-none`}
                                                                placeholder={t('Program description...')}
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p
                                                                className={`text-sm font-semibold uppercase tracking-[0.24em] ${softTextClass}`}
                                                            >
                                                                {item.age}
                                                            </p>
                                                            <h3
                                                                className={`mt-4 text-2xl font-bold ${headingTextClass}`}
                                                            >
                                                                {item.title}
                                                            </h3>
                                                            <p className={`mt-3 text-sm leading-7 ${bodyTextClass}`}>
                                                                {item.description}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-8 grid gap-5 lg:grid-cols-4">
                                        {cmsContent.programs.map((program, index) => (
                                            <div
                                                key={program.title}
                                                className={`rounded-[2rem] border p-6 shadow-[0_28px_65px_rgba(0,0,0,0.12)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_35px_75px_rgba(0,0,0,0.16)] ${
                                                    index % 2 === 0 ? theme.programEven : theme.programOdd
                                                }`}
                                            >
                                                <p
                                                    className={`text-sm font-semibold uppercase tracking-[0.24em] ${softTextClass}`}
                                                >
                                                    {program.age}
                                                </p>
                                                <h3 className={`mt-4 text-2xl font-bold ${headingTextClass}`}>
                                                    {program.title}
                                                </h3>
                                                <p className={`mt-3 text-sm leading-7 ${bodyTextClass}`}>
                                                    {program.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Campus Section */}
                        <div
                            className={`relative ${activeSection === 'campus' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        >
                            {isEditing && activeSection === 'campus' && (
                                <SectionEditBar
                                    sectionName="Campus Section"
                                    isDirty={Object.keys(sectionDrafts.campus || {}).length > 0}
                                    isSaving={isSaving}
                                    onSave={() => saveSection('campus')}
                                    onDiscard={() => {
                                        setSectionDrafts((p) => {
                                            const n = { ...p };
                                            delete n.campus;
                                            return n;
                                        });
                                        setActiveSection(null);
                                    }}
                                />
                            )}
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setActiveSection(activeSection === 'campus' ? null : 'campus')}
                                    className="absolute -top-8 right-4 z-50 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-lg hover:bg-blue-700"
                                >
                                    {activeSection === 'campus' ? 'Close' : 'Edit Campus'}
                                </button>
                            )}
                            <section id="campus" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
                                <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
                                    <div
                                        className={`rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 text-slate-900' : 'border-white/10 text-white'} ${theme.campusPanel}`}
                                    >
                                        <p
                                            className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-blue-600' : 'text-blue-200'}`}
                                        >
                                            {renderEditOrText(
                                                'campusEyebrow',
                                                cmsContent.campusEyebrow,
                                                'campus',
                                                `text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-blue-600' : 'text-blue-200'}`,
                                            )}
                                        </p>
                                        <h2 className="mt-4 text-4xl font-black tracking-tight">
                                            {renderEditOrText(
                                                'campusTitle',
                                                cmsContent.campusTitle,
                                                'campus',
                                                'mt-4 text-4xl font-black tracking-tight',
                                                { as: 'h2' },
                                            )}
                                        </h2>
                                        <p className={`mt-4 max-w-2xl text-base leading-7 ${bodyTextClass}`}>
                                            {renderEditOrText(
                                                'campusDescription',
                                                cmsContent.campusDescription,
                                                'campus',
                                                `mt-4 max-w-2xl text-base leading-7 ${bodyTextClass}`,
                                                { multiline: true, rows: 3 },
                                            )}
                                        </p>

                                        {isEditing ? (
                                            <div className="mt-8">
                                                <InlineArrayEditor
                                                    items={cmsContent.campusStats}
                                                    isEditing={isEditing}
                                                    onChange={(items) => onArrayChange?.('campusStats', items)}
                                                    newItemDefaults={{
                                                        value: '',
                                                        label: '',
                                                    }}
                                                    addLabel="Add Campus Stat"
                                                    emptyLabel="No stats yet"
                                                    renderItem={(item, index, isEditingItem, onFieldChange) => (
                                                        <div
                                                            className={`rounded-[1.5rem] border p-5 backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 bg-white/86' : 'border-white/10 bg-white/10'}`}
                                                        >
                                                            {isEditingItem ? (
                                                                <>
                                                                    <InlineEditField
                                                                        value={item.value}
                                                                        onChange={(v) => onFieldChange('value', v)}
                                                                        isEditing={isEditingItem}
                                                                        className="text-3xl font-black bg-transparent border-none"
                                                                        placeholder="12+"
                                                                    />

                                                                    <InlineEditField
                                                                        value={item.label}
                                                                        onChange={(v) => onFieldChange('label', v)}
                                                                        isEditing={isEditingItem}
                                                                        className={`mt-2 text-sm font-medium ${bodyTextClass} bg-transparent border-none`}
                                                                        placeholder={t('Label')}
                                                                    />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <p className="text-3xl font-black">{item.value}</p>
                                                                    <p
                                                                        className={`mt-2 text-sm font-medium ${bodyTextClass}`}
                                                                    >
                                                                        {item.label}
                                                                    </p>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        ) : (
                                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                                {cmsContent.campusStats.map((item) => (
                                                    <div
                                                        key={item.label}
                                                        className={`rounded-[1.5rem] border p-5 backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 bg-white/86' : 'border-white/10 bg-white/10'}`}
                                                    >
                                                        <p className="text-3xl font-black">{item.value}</p>
                                                        <p className={`mt-2 text-sm font-medium ${bodyTextClass}`}>
                                                            {item.label}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className={`rounded-[2rem] border p-8 shadow-[0_25px_65px_rgba(0,0,0,0.12)] backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80' : 'border-white/10'} ${theme.newsPanel}`}
                                    >
                                        <p
                                            className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                        >
                                            {renderEditOrText(
                                                'newsEyebrow',
                                                cmsContent.newsEyebrow,
                                                'campus',
                                                `text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`,
                                            )}
                                        </p>
                                        {isEditing ? (
                                            <div className="mt-6">
                                                <InlineArrayEditor
                                                    items={cmsContent.news}
                                                    isEditing={isEditing}
                                                    onChange={(items) => onArrayChange?.('news', items)}
                                                    newItemDefaults={{
                                                        title: '',
                                                        detail: '',
                                                    }}
                                                    addLabel="Add News Item"
                                                    emptyLabel="No news yet"
                                                    renderItem={(item, index, isEditingItem, onFieldChange) => (
                                                        <div
                                                            className={`rounded-[1.5rem] border p-5 backdrop-blur ${isLightTheme ? 'border-slate-200/80 bg-white/90' : 'border-white/10 bg-white/6'}`}
                                                        >
                                                            {isEditingItem ? (
                                                                <>
                                                                    <InlineEditField
                                                                        value={item.title}
                                                                        onChange={(v) => onFieldChange('title', v)}
                                                                        isEditing={isEditingItem}
                                                                        className={`text-lg font-bold ${headingTextClass} bg-transparent border-none`}
                                                                        placeholder={t('News title')}
                                                                    />

                                                                    <InlineEditField
                                                                        value={item.detail}
                                                                        onChange={(v) => onFieldChange('detail', v)}
                                                                        isEditing={isEditingItem}
                                                                        multiline
                                                                        rows={2}
                                                                        className={`mt-2 text-sm leading-6 ${bodyTextClass} bg-transparent border-none`}
                                                                        placeholder={t('News details...')}
                                                                    />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <h3
                                                                        className={`text-lg font-bold ${headingTextClass}`}
                                                                    >
                                                                        {item.title}
                                                                    </h3>
                                                                    <p
                                                                        className={`mt-2 text-sm leading-6 ${bodyTextClass}`}
                                                                    >
                                                                        {item.detail}
                                                                    </p>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        ) : (
                                            <div className="mt-6 space-y-5">
                                                {cmsContent.news.map((item) => (
                                                    <div
                                                        key={item.title}
                                                        className={`rounded-[1.5rem] border p-5 backdrop-blur ${isLightTheme ? 'border-slate-200/80 bg-white/90' : 'border-white/10 bg-white/6'}`}
                                                    >
                                                        <h3 className={`text-lg font-bold ${headingTextClass}`}>
                                                            {item.title}
                                                        </h3>
                                                        <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>
                                                            {item.detail}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Admissions Section */}
                        <div
                            className={`relative ${activeSection === 'admissions' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        >
                            {isEditing && activeSection === 'admissions' && (
                                <SectionEditBar
                                    sectionName="Admissions Section"
                                    isDirty={Object.keys(sectionDrafts.admissions || {}).length > 0}
                                    isSaving={isSaving}
                                    onSave={() => saveSection('admissions')}
                                    onDiscard={() => {
                                        setSectionDrafts((p) => {
                                            const n = { ...p };
                                            delete n.admissions;
                                            return n;
                                        });
                                        setActiveSection(null);
                                    }}
                                />
                            )}
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setActiveSection(activeSection === 'admissions' ? null : 'admissions')
                                    }
                                    className="absolute -top-8 right-4 z-50 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-lg hover:bg-blue-700"
                                >
                                    {activeSection === 'admissions' ? 'Close' : 'Edit Admissions'}
                                </button>
                            )}
                            <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
                                <div
                                    className={`rounded-[2.25rem] border px-6 py-10 shadow-[0_35px_90px_rgba(0,0,0,0.12)] backdrop-blur-2xl sm:px-10 ${isLightTheme ? 'border-slate-200/80 text-slate-900' : 'border-white/10 text-white'} ${theme.admissionsPanel}`}
                                >
                                    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                                        <div>
                                            <p
                                                className={`text-sm font-semibold uppercase tracking-[0.32em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                            >
                                                {renderEditOrText(
                                                    'admissionsEyebrow',
                                                    cmsContent.admissionsEyebrow,
                                                    'admissions',
                                                    `text-sm font-semibold uppercase tracking-[0.32em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`,
                                                )}
                                            </p>
                                            <h2 className="mt-4 text-4xl font-black tracking-tight">
                                                {renderEditOrText(
                                                    'admissionsTitle',
                                                    cmsContent.admissionsTitle,
                                                    'admissions',
                                                    'mt-4 text-4xl font-black tracking-tight',
                                                    { as: 'h2' },
                                                )}
                                            </h2>
                                            <p className={`mt-4 max-w-2xl text-base leading-7 ${bodyTextClass}`}>
                                                {renderEditOrText(
                                                    'admissionsDescription',
                                                    cmsContent.admissionsDescription,
                                                    'admissions',
                                                    `mt-4 max-w-2xl text-base leading-7 ${bodyTextClass}`,
                                                    {
                                                        multiline: true,
                                                        rows: 3,
                                                    },
                                                )}
                                            </p>
                                        </div>

                                        <div
                                            className={`rounded-[1.8rem] border p-6 backdrop-blur-2xl ${isLightTheme ? 'border-slate-200/80 bg-white/88' : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))]'}`}
                                        >
                                            <div
                                                className={`space-y-4 text-sm ${isLightTheme ? 'text-slate-600' : 'text-slate-200'}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Users
                                                        className={`mt-0.5 h-5 w-5 ${isLightTheme ? 'text-blue-500' : 'text-blue-300'}`}
                                                    />
                                                    <p>{cmsContent.admissionsPointOne}</p>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <Award
                                                        className={`mt-0.5 h-5 w-5 ${isLightTheme ? 'text-blue-500' : 'text-blue-300'}`}
                                                    />
                                                    <p>{cmsContent.admissionsPointTwo}</p>
                                                </div>
                                            </div>

                                            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                                <Link
                                                    href="/admissions/apply"
                                                    className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-110 ${theme.admissionsButton}`}
                                                >
                                                    {cmsContent.admissionsFormTitle}
                                                </Link>
                                                <Link
                                                    href="/login"
                                                    className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition ${secondaryLinkClass}`}
                                                >
                                                    {cmsContent.admissionsPortalButton}
                                                </Link>
                                            </div>
                                        </div>

                                        <div
                                            className={`rounded-[1.8rem] border p-6 shadow-[0_25px_70px_rgba(0,0,0,0.12)] backdrop-blur-2xl ${isLightTheme ? 'border-slate-200/80 bg-white/92' : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))]'}`}
                                        >
                                            <h3 className={`text-2xl font-bold ${headingTextClass}`}>
                                                {renderEditOrText(
                                                    'admissionsFormTitle',
                                                    cmsContent.admissionsFormTitle,
                                                    'admissions',
                                                    `text-2xl font-bold ${headingTextClass}`,
                                                    { as: 'h3' },
                                                )}
                                            </h3>
                                            <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>
                                                {renderEditOrText(
                                                    'admissionsFormIntro',
                                                    cmsContent.admissionsFormIntro,
                                                    'admissions',
                                                    `mt-2 text-sm leading-6 ${bodyTextClass}`,
                                                    {
                                                        multiline: true,
                                                        rows: 3,
                                                    },
                                                )}
                                            </p>
                                            <p className={`mt-4 text-sm leading-6 ${softTextClass}`}>
                                                {t(
                                                    'The admission form has been moved to a separate page so families can complete it without leaving the full homepage experience.',
                                                )}
                                            </p>
                                            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                                <Link
                                                    href="/admissions/apply"
                                                    className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-110 ${theme.admissionsFormButton}`}
                                                >
                                                    {t('Open Admission Form')}
                                                </Link>
                                                <a
                                                    href={`mailto:${cmsContent.admissionsEmail}`}
                                                    className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition ${secondaryLinkClass}`}
                                                >
                                                    {t('Email Admissions')}
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Outcomes Section */}
                        <div
                            className={`relative ${activeSection === 'outcomes' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        >
                            {isEditing && activeSection === 'outcomes' && (
                                <SectionEditBar
                                    sectionName="Outcomes Section"
                                    isDirty={Object.keys(sectionDrafts.outcomes || {}).length > 0}
                                    isSaving={isSaving}
                                    onSave={() => saveSection('outcomes')}
                                    onDiscard={() => {
                                        setSectionDrafts((p) => {
                                            const n = { ...p };
                                            delete n.outcomes;
                                            return n;
                                        });
                                        setActiveSection(null);
                                    }}
                                />
                            )}
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setActiveSection(activeSection === 'outcomes' ? null : 'outcomes')}
                                    className="absolute -top-8 right-4 z-50 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-lg hover:bg-blue-700"
                                >
                                    {activeSection === 'outcomes' ? 'Close' : 'Edit Outcomes'}
                                </button>
                            )}
                            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
                                <div className="max-w-3xl">
                                    <p
                                        className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                    >
                                        {renderEditOrText(
                                            'outcomesEyebrow',
                                            cmsContent.outcomesEyebrow,
                                            'outcomes',
                                            `text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`,
                                        )}
                                    </p>
                                    <h2 className={`mt-3 text-4xl font-black tracking-tight ${headingTextClass}`}>
                                        {renderEditOrText(
                                            'outcomesTitle',
                                            cmsContent.outcomesTitle,
                                            'outcomes',
                                            `mt-3 text-4xl font-black tracking-tight ${headingTextClass}`,
                                            { as: 'h2' },
                                        )}
                                    </h2>
                                    <p className={`mt-4 text-base leading-7 ${bodyTextClass}`}>
                                        {renderEditOrText(
                                            'outcomesDescription',
                                            cmsContent.outcomesDescription,
                                            'outcomes',
                                            `mt-4 text-base leading-7 ${bodyTextClass}`,
                                            { multiline: true, rows: 3 },
                                        )}
                                    </p>
                                </div>

                                {isEditing ? (
                                    <div className="mt-8">
                                        <InlineArrayEditor
                                            items={cmsContent.outcomes}
                                            isEditing={isEditing}
                                            onChange={(items) => onArrayChange?.('outcomes', items)}
                                            newItemDefaults={{
                                                title: '',
                                                description: '',
                                            }}
                                            addLabel="Add Outcome"
                                            emptyLabel="No outcomes yet"
                                            renderItem={(item, index, isEditingItem, onFieldChange) => {
                                                const Icon = outcomeIcons[index] || Award;
                                                return (
                                                    <div
                                                        className={`rounded-[2rem] border p-6 shadow-[0_25px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl ${borderClass} ${glassClass}`}
                                                    >
                                                        <div
                                                            className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${theme.pillarIcon}`}
                                                        >
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        {isEditingItem ? (
                                                            <>
                                                                <InlineEditField
                                                                    value={item.title}
                                                                    onChange={(v) => onFieldChange('title', v)}
                                                                    isEditing={isEditingItem}
                                                                    className={`mt-5 text-xl font-bold ${headingTextClass} bg-transparent border-none`}
                                                                    placeholder={t('Outcome title')}
                                                                />

                                                                <InlineEditField
                                                                    value={item.description}
                                                                    onChange={(v) => onFieldChange('description', v)}
                                                                    isEditing={isEditingItem}
                                                                    multiline
                                                                    rows={3}
                                                                    className={`mt-3 text-sm leading-6 ${bodyTextClass} bg-transparent border-none`}
                                                                    placeholder={t('Outcome description...')}
                                                                />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <h3
                                                                    className={`mt-5 text-xl font-bold ${headingTextClass}`}
                                                                >
                                                                    {item.title}
                                                                </h3>
                                                                <p
                                                                    className={`mt-3 text-sm leading-6 ${bodyTextClass}`}
                                                                >
                                                                    {item.description}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                                        {cmsContent.outcomes.map((item, index) => {
                                            const Icon = outcomeIcons[index] || Award;
                                            return (
                                                <div
                                                    key={item.title}
                                                    className={`rounded-[2rem] border p-6 shadow-[0_25px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl ${borderClass} ${glassClass}`}
                                                >
                                                    <div
                                                        className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${theme.pillarIcon}`}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <h3 className={`mt-5 text-xl font-bold ${headingTextClass}`}>
                                                        {item.title}
                                                    </h3>
                                                    <p className={`mt-3 text-sm leading-6 ${bodyTextClass}`}>
                                                        {item.description}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Journey Section */}
                        <div
                            className={`relative ${activeSection === 'journey' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        >
                            {isEditing && activeSection === 'journey' && (
                                <SectionEditBar
                                    sectionName="Journey Section"
                                    isDirty={Object.keys(sectionDrafts.journey || {}).length > 0}
                                    isSaving={isSaving}
                                    onSave={() => saveSection('journey')}
                                    onDiscard={() => {
                                        setSectionDrafts((p) => {
                                            const n = { ...p };
                                            delete n.journey;
                                            return n;
                                        });
                                        setActiveSection(null);
                                    }}
                                />
                            )}
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setActiveSection(activeSection === 'journey' ? null : 'journey')}
                                    className="absolute -top-8 right-4 z-50 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-lg hover:bg-blue-700"
                                >
                                    {activeSection === 'journey' ? 'Close' : 'Edit Journey'}
                                </button>
                            )}
                            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
                                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                                    <div
                                        className={`rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl ${borderClass} ${glassClass}`}
                                    >
                                        <p
                                            className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                        >
                                            {renderEditOrText(
                                                'journeyEyebrow',
                                                cmsContent.journeyEyebrow,
                                                'journey',
                                                `text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`,
                                            )}
                                        </p>
                                        <h2 className={`mt-4 text-4xl font-black tracking-tight ${headingTextClass}`}>
                                            {renderEditOrText(
                                                'journeyTitle',
                                                cmsContent.journeyTitle,
                                                'journey',
                                                `mt-4 text-4xl font-black tracking-tight ${headingTextClass}`,
                                                { as: 'h2' },
                                            )}
                                        </h2>
                                        <p className={`mt-4 text-base leading-7 ${bodyTextClass}`}>
                                            {renderEditOrText(
                                                'journeyDescription',
                                                cmsContent.journeyDescription,
                                                'journey',
                                                `mt-4 text-base leading-7 ${bodyTextClass}`,
                                                { multiline: true, rows: 3 },
                                            )}
                                        </p>
                                    </div>

                                    {isEditing ? (
                                        <div className="grid gap-4">
                                            <InlineArrayEditor
                                                items={cmsContent.journeySteps}
                                                isEditing={isEditing}
                                                onChange={(items) => onArrayChange?.('journeySteps', items)}
                                                newItemDefaults={{
                                                    step: '',
                                                    title: '',
                                                    description: '',
                                                }}
                                                addLabel="Add Journey Step"
                                                emptyLabel="No journey steps yet"
                                                renderItem={(item, index, isEditingItem, onFieldChange) => (
                                                    <div
                                                        className={`rounded-[2rem] border p-6 shadow-[0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-xl ${borderClass} ${glassClass}`}
                                                    >
                                                        <div className="flex flex-wrap items-center gap-4">
                                                            <div
                                                                className={`rounded-2xl px-4 py-2 text-lg font-black ${isLightTheme ? 'bg-sky-100 text-sky-800' : 'bg-white/10 text-cyan-100'}`}
                                                            >
                                                                {isEditingItem ? (
                                                                    <InlineEditField
                                                                        value={item.step}
                                                                        onChange={(v) => onFieldChange('step', v)}
                                                                        isEditing={isEditingItem}
                                                                        className={`rounded-2xl px-4 py-2 text-lg font-black ${isLightTheme ? 'bg-sky-100 text-sky-800' : 'bg-white/10 text-cyan-100'} bg-transparent border-none text-center`}
                                                                        placeholder="01"
                                                                    />
                                                                ) : (
                                                                    item.step
                                                                )}
                                                            </div>
                                                            {isEditingItem ? (
                                                                <InlineEditField
                                                                    value={item.title}
                                                                    onChange={(v) => onFieldChange('title', v)}
                                                                    isEditing={isEditingItem}
                                                                    className={`text-xl font-bold ${headingTextClass} bg-transparent border-none`}
                                                                    placeholder={t('Step title')}
                                                                />
                                                            ) : (
                                                                <h3 className={`text-xl font-bold ${headingTextClass}`}>
                                                                    {item.title}
                                                                </h3>
                                                            )}
                                                        </div>
                                                        {isEditingItem ? (
                                                            <InlineEditField
                                                                value={item.description}
                                                                onChange={(v) => onFieldChange('description', v)}
                                                                isEditing={isEditingItem}
                                                                multiline
                                                                rows={3}
                                                                className={`mt-4 text-sm leading-6 ${bodyTextClass} bg-transparent border-none`}
                                                                placeholder={t('Step description...')}
                                                            />
                                                        ) : (
                                                            <p className={`mt-4 text-sm leading-6 ${bodyTextClass}`}>
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {cmsContent.journeySteps.map((item) => (
                                                <div
                                                    key={item.step}
                                                    className={`rounded-[2rem] border p-6 shadow-[0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-xl ${borderClass} ${glassClass}`}
                                                >
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <div
                                                            className={`rounded-2xl px-4 py-2 text-lg font-black ${isLightTheme ? 'bg-sky-100 text-sky-800' : 'bg-white/10 text-cyan-100'}`}
                                                        >
                                                            {item.step}
                                                        </div>
                                                        <h3 className={`text-xl font-bold ${headingTextClass}`}>
                                                            {item.title}
                                                        </h3>
                                                    </div>
                                                    <p className={`mt-4 text-sm leading-6 ${bodyTextClass}`}>
                                                        {item.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Voices & Visit Section */}
                        <div
                            className={`relative ${activeSection === 'voices' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        >
                            {isEditing && activeSection === 'voices' && (
                                <SectionEditBar
                                    sectionName="Voices & Visit Section"
                                    isDirty={Object.keys(sectionDrafts.voices || {}).length > 0}
                                    isSaving={isSaving}
                                    onSave={() => saveSection('voices')}
                                    onDiscard={() => {
                                        setSectionDrafts((p) => {
                                            const n = { ...p };
                                            delete n.voices;
                                            return n;
                                        });
                                        setActiveSection(null);
                                    }}
                                />
                            )}
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setActiveSection(activeSection === 'voices' ? null : 'voices')}
                                    className="absolute -top-8 right-4 z-50 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-lg hover:bg-blue-700"
                                >
                                    {activeSection === 'voices' ? 'Close' : 'Edit Voices & Visit'}
                                </button>
                            )}
                            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
                                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                                    <div
                                        className={`rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl ${borderClass} ${glassClass}`}
                                    >
                                        <p
                                            className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                        >
                                            {renderEditOrText(
                                                'voicesEyebrow',
                                                cmsContent.voicesEyebrow,
                                                'voices',
                                                `text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`,
                                            )}
                                        </p>
                                        <h2 className={`mt-4 text-4xl font-black tracking-tight ${headingTextClass}`}>
                                            {renderEditOrText(
                                                'voicesTitle',
                                                cmsContent.voicesTitle,
                                                'voices',
                                                `mt-4 text-4xl font-black tracking-tight ${headingTextClass}`,
                                                { as: 'h2' },
                                            )}
                                        </h2>

                                        {isEditing ? (
                                            <div className="mt-8">
                                                <InlineArrayEditor
                                                    items={cmsContent.testimonials}
                                                    isEditing={isEditing}
                                                    onChange={(items) => onArrayChange?.('testimonials', items)}
                                                    newItemDefaults={{
                                                        quote: '',
                                                        name: '',
                                                        role: '',
                                                    }}
                                                    addLabel="Add Testimonial"
                                                    emptyLabel="No testimonials yet"
                                                    renderItem={(item, index, isEditingItem, onFieldChange) => (
                                                        <div
                                                            className={`rounded-[1.6rem] border p-5 backdrop-blur ${isLightTheme ? 'border-slate-200/80 bg-white/90' : 'border-white/10 bg-white/6'}`}
                                                        >
                                                            <Quote
                                                                className={`h-6 w-6 ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                                            />
                                                            {isEditingItem ? (
                                                                <>
                                                                    <InlineEditField
                                                                        value={item.quote}
                                                                        onChange={(v) => onFieldChange('quote', v)}
                                                                        isEditing={isEditingItem}
                                                                        multiline
                                                                        rows={3}
                                                                        className={`mt-4 text-sm leading-7 ${isLightTheme ? 'text-slate-700' : 'text-slate-200'} bg-transparent border-none`}
                                                                        placeholder={t('Testimonial quote...')}
                                                                    />

                                                                    <div className="mt-5">
                                                                        <InlineEditField
                                                                            value={item.name}
                                                                            onChange={(v) => onFieldChange('name', v)}
                                                                            isEditing={isEditingItem}
                                                                            className={`font-semibold ${headingTextClass} bg-transparent border-none`}
                                                                            placeholder={t('Name')}
                                                                        />

                                                                        <InlineEditField
                                                                            value={item.role}
                                                                            onChange={(v) => onFieldChange('role', v)}
                                                                            isEditing={isEditingItem}
                                                                            className={`text-sm ${softTextClass} bg-transparent border-none`}
                                                                            placeholder={t('Role')}
                                                                        />
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <p
                                                                        className={`mt-4 text-sm leading-7 ${isLightTheme ? 'text-slate-700' : 'text-slate-200'}`}
                                                                    >
                                                                        {item.quote}
                                                                    </p>
                                                                    <div className="mt-5">
                                                                        <p
                                                                            className={`font-semibold ${headingTextClass}`}
                                                                        >
                                                                            {item.name}
                                                                        </p>
                                                                        <p className={`text-sm ${softTextClass}`}>
                                                                            {item.role}
                                                                        </p>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        ) : (
                                            <div className="mt-8 grid gap-4">
                                                {cmsContent.testimonials.map((item) => (
                                                    <div
                                                        key={item.name}
                                                        className={`rounded-[1.6rem] border p-5 backdrop-blur ${isLightTheme ? 'border-slate-200/80 bg-white/90' : 'border-white/10 bg-white/6'}`}
                                                    >
                                                        <Quote
                                                            className={`h-6 w-6 ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                                        />
                                                        <p
                                                            className={`mt-4 text-sm leading-7 ${isLightTheme ? 'text-slate-700' : 'text-slate-200'}`}
                                                        >
                                                            {item.quote}
                                                        </p>
                                                        <div className="mt-5">
                                                            <p className={`font-semibold ${headingTextClass}`}>
                                                                {item.name}
                                                            </p>
                                                            <p className={`text-sm ${softTextClass}`}>{item.role}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className={`rounded-[2rem] border p-8 shadow-[0_25px_70px_rgba(0,0,0,0.12)] backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(255,251,235,0.92),rgba(255,255,255,0.9))]' : 'border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(16,185,129,0.08),rgba(255,255,255,0.03))]'}`}
                                    >
                                        <p
                                            className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                        >
                                            {renderEditOrText(
                                                'visitEyebrow',
                                                cmsContent.visitEyebrow,
                                                'voices',
                                                `text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`,
                                            )}
                                        </p>
                                        <h2 className={`mt-4 text-4xl font-black tracking-tight ${headingTextClass}`}>
                                            {renderEditOrText(
                                                'visitTitle',
                                                cmsContent.visitTitle,
                                                'voices',
                                                `mt-4 text-4xl font-black tracking-tight ${headingTextClass}`,
                                                { as: 'h2' },
                                            )}
                                        </h2>
                                        <div className="mt-8 space-y-5">
                                            <div
                                                className={`flex items-start gap-3 ${isLightTheme ? 'text-slate-700' : 'text-slate-200'}`}
                                            >
                                                <MapPin
                                                    className={`mt-1 h-5 w-5 ${isLightTheme ? 'text-blue-500' : 'text-blue-200'}`}
                                                />
                                                <div>
                                                    <p className={`font-semibold ${headingTextClass}`}>
                                                        {renderEditOrText(
                                                            'visitPointOneTitle',
                                                            cmsContent.visitPointOneTitle,
                                                            'voices',
                                                            `font-semibold ${headingTextClass}`,
                                                            { as: 'span' },
                                                        )}
                                                    </p>
                                                    <p className={`mt-1 text-sm leading-6 ${bodyTextClass}`}>
                                                        {renderEditOrText(
                                                            'visitPointOneText',
                                                            cmsContent.visitPointOneText,
                                                            'voices',
                                                            `mt-1 text-sm leading-6 ${bodyTextClass}`,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div
                                                className={`flex items-start gap-3 ${isLightTheme ? 'text-slate-700' : 'text-slate-200'}`}
                                            >
                                                <CheckCircle2
                                                    className={`mt-1 h-5 w-5 ${isLightTheme ? 'text-blue-500' : 'text-blue-200'}`}
                                                />
                                                <div>
                                                    <p className={`font-semibold ${headingTextClass}`}>
                                                        {renderEditOrText(
                                                            'visitPointTwoTitle',
                                                            cmsContent.visitPointTwoTitle,
                                                            'voices',
                                                            `font-semibold ${headingTextClass}`,
                                                            { as: 'span' },
                                                        )}
                                                    </p>
                                                    <p className={`mt-1 text-sm leading-6 ${bodyTextClass}`}>
                                                        {renderEditOrText(
                                                            'visitPointTwoText',
                                                            cmsContent.visitPointTwoText,
                                                            'voices',
                                                            `mt-1 text-sm leading-6 ${bodyTextClass}`,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div
                                                className={`flex items-start gap-3 ${isLightTheme ? 'text-slate-700' : 'text-slate-200'}`}
                                            >
                                                <Rocket
                                                    className={`mt-1 h-5 w-5 ${isLightTheme ? 'text-blue-500' : 'text-blue-200'}`}
                                                />
                                                <div>
                                                    <p className={`font-semibold ${headingTextClass}`}>
                                                        {renderEditOrText(
                                                            'visitPointThreeTitle',
                                                            cmsContent.visitPointThreeTitle,
                                                            'voices',
                                                            `font-semibold ${headingTextClass}`,
                                                            { as: 'span' },
                                                        )}
                                                    </p>
                                                    <p className={`mt-1 text-sm leading-6 ${bodyTextClass}`}>
                                                        {renderEditOrText(
                                                            'visitPointThreeText',
                                                            cmsContent.visitPointThreeText,
                                                            'voices',
                                                            `mt-1 text-sm leading-6 ${bodyTextClass}`,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                            <a
                                                href="/admissions/apply"
                                                className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-110 ${theme.admissionsButton}`}
                                            >
                                                {cmsContent.visitPrimaryCta}
                                            </a>
                                            <Link
                                                href="/login"
                                                className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition ${secondaryLinkClass}`}
                                            >
                                                {cmsContent.visitSecondaryCta}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* FAQ Section */}
                        <div
                            className={`relative ${activeSection === 'faq' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        >
                            {isEditing && activeSection === 'faq' && (
                                <SectionEditBar
                                    sectionName="FAQ Section"
                                    isDirty={Object.keys(sectionDrafts.faq || {}).length > 0}
                                    isSaving={isSaving}
                                    onSave={() => saveSection('faq')}
                                    onDiscard={() => {
                                        setSectionDrafts((p) => {
                                            const n = { ...p };
                                            delete n.faq;
                                            return n;
                                        });
                                        setActiveSection(null);
                                    }}
                                />
                            )}
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setActiveSection(activeSection === 'faq' ? null : 'faq')}
                                    className="absolute -top-8 right-4 z-50 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-lg hover:bg-blue-700"
                                >
                                    {activeSection === 'faq' ? 'Close' : 'Edit FAQ'}
                                </button>
                            )}
                            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
                                <div
                                    className={`rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl ${borderClass} ${glassClass}`}
                                >
                                    <div className="max-w-3xl">
                                        <p
                                            className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}
                                        >
                                            {renderEditOrText(
                                                'faqEyebrow',
                                                cmsContent.faqEyebrow,
                                                'faq',
                                                `text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`,
                                            )}
                                        </p>
                                        <h2 className={`mt-4 text-4xl font-black tracking-tight ${headingTextClass}`}>
                                            {renderEditOrText(
                                                'faqTitle',
                                                cmsContent.faqTitle,
                                                'faq',
                                                `mt-4 text-4xl font-black tracking-tight ${headingTextClass}`,
                                                { as: 'h2' },
                                            )}
                                        </h2>
                                    </div>

                                    {isEditing ? (
                                        <div className="mt-8">
                                            <InlineArrayEditor
                                                items={cmsContent.faqs}
                                                isEditing={isEditing}
                                                onChange={(items) => onArrayChange?.('faqs', items)}
                                                newItemDefaults={{
                                                    question: '',
                                                    answer: '',
                                                }}
                                                addLabel="Add FAQ"
                                                emptyLabel="No FAQs yet"
                                                renderItem={(item, index, isEditingItem, onFieldChange) => (
                                                    <div
                                                        className={`rounded-[1.6rem] border p-5 backdrop-blur ${isLightTheme ? 'border-slate-200/80 bg-white/90' : 'border-white/10 bg-white/6'}`}
                                                    >
                                                        {isEditingItem ? (
                                                            <>
                                                                <InlineEditField
                                                                    value={item.question}
                                                                    onChange={(v) => onFieldChange('question', v)}
                                                                    isEditing={isEditingItem}
                                                                    className={`text-lg font-bold ${headingTextClass} bg-transparent border-none`}
                                                                    placeholder={t('Question')}
                                                                />

                                                                <InlineEditField
                                                                    value={item.answer}
                                                                    onChange={(v) => onFieldChange('answer', v)}
                                                                    isEditing={isEditingItem}
                                                                    multiline
                                                                    rows={3}
                                                                    className={`mt-3 text-sm leading-6 ${bodyTextClass} bg-transparent border-none`}
                                                                    placeholder={t('Answer...')}
                                                                />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <p className={`text-lg font-bold ${headingTextClass}`}>
                                                                    {item.question}
                                                                </p>
                                                                <p
                                                                    className={`mt-3 text-sm leading-6 ${bodyTextClass}`}
                                                                >
                                                                    {item.answer}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    ) : (
                                        <div className="mt-8 grid gap-4 lg:grid-cols-3">
                                            {cmsContent.faqs.map((item) => (
                                                <div
                                                    key={item.question}
                                                    className={`rounded-[1.6rem] border p-5 backdrop-blur ${isLightTheme ? 'border-slate-200/80 bg-white/90' : 'border-white/10 bg-white/6'}`}
                                                >
                                                    <p className={`text-lg font-bold ${headingTextClass}`}>
                                                        {item.question}
                                                    </p>
                                                    <p className={`mt-3 text-sm leading-6 ${bodyTextClass}`}>
                                                        {item.answer}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
