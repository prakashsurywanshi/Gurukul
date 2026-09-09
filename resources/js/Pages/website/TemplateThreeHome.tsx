import { useLanguage } from '../../i18n/LanguageProvider';
import { Head, Link } from '@inertiajs/react';
import { useMemo } from 'react';
import {
    ArrowRight,
    Award,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    GraduationCap,
    Mail,
    MapPin,
    Quote,
    Rocket,
    ShieldCheck,
    Sparkles,
    Star,
    Users,
} from 'lucide-react';
import { WebsiteContent } from '../../utils/websiteCmsContent';
import type { PublishedPage, CurrentUser } from '../Home';
import InlineEditField from '../../components/website/InlineEditField';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import InlineArrayEditor from '../../components/website/InlineArrayEditor';
import SectionEditBar from '../../components/website/SectionEditBar';

interface TemplateThreeHomeProps {
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

const featureIcons = [BookOpen, ShieldCheck, Award, Sparkles];
const spotlightIcons = [MapPin, CheckCircle2, Rocket];

export default function TemplateThreeHome({
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
}: TemplateThreeHomeProps) {
    const { t } = useLanguage();
    const renderField = (
        value: string,
        fieldKey: string,
        className?: string,
        multiline?: boolean,
        placeholder?: string,
    ) => {
        if (isEditing && onFieldChange) {
            return (
                <InlineEditField
                    value={value}
                    onChange={(v) => onFieldChange(fieldKey, v)}
                    isEditing={isEditing}
                    className={className}
                    multiline={multiline}
                    placeholder={placeholder}
                    fieldKey={fieldKey}
                    translations={translations?.[fieldKey]}
                    onTranslationChange={(locale, v) => onTranslationChange?.(fieldKey, locale, v)}
                />
            );
        }
        return value;
    };

    const heroImage = cmsContent.sliderImages[0] ?? null;
    const galleryImages = useMemo(() => {
        if (cmsContent.sliderImages.length >= 4) {
            return cmsContent.sliderImages.slice(0, 4);
        }

        return Array.from(
            { length: 4 },
            (_, index) => cmsContent.sliderImages[index % Math.max(cmsContent.sliderImages.length, 1)] ?? null,
        );
    }, [cmsContent.sliderImages]);
    return (
        <>
            <Head title={`${cmsContent.seoTitle} | Template 3`} />

            <div className="min-h-screen bg-[linear-gradient(180deg,#f0f4ff_0%,#e0e7ff_24%,#f0f9ff_55%,#e9eef5_100%)] text-stone-900">
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(30,58,95,0.08),transparent_24%),radial-gradient(circle_at_85%_18%,rgba(30,64,175,0.1),transparent_22%),radial-gradient(circle_at_50%_70%,rgba(5,150,105,0.06),transparent_26%)]" />
                    <div className="absolute left-[8%] top-20 -z-10 h-48 w-48 rounded-full bg-blue-200/30 blur-3xl" />
                    <div className="absolute right-[6%] top-12 -z-10 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />

                    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-stone-300 bg-white/90 text-blue-800 shadow-[0_16px_40px_rgba(30,58,95,0.12)]">
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
                                <p className="font-serif text-xl font-semibold tracking-[0.08em] text-stone-950">
                                    {renderField(
                                        cmsContent.brandName,
                                        'brandName',
                                        'font-serif text-xl font-semibold tracking-[0.08em] text-stone-950 bg-transparent border-none',
                                        false,
                                        'Brand name',
                                    )}
                                </p>
                                <p className="text-xs uppercase tracking-[0.32em] text-stone-500">
                                    {renderField(
                                        cmsContent.brandSubtitle,
                                        'brandSubtitle',
                                        'text-xs uppercase tracking-[0.32em] text-stone-500 bg-transparent border-none',
                                        false,
                                        'Subtitle',
                                    )}
                                </p>
                            </div>
                        </Link>

                        <nav className="hidden items-center gap-7 rounded-full border border-white/70 bg-white/70 px-6 py-3 text-sm font-semibold text-stone-700 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:flex">
                            <a href="#about" className="transition hover:text-stone-950">
                                {renderField(
                                    cmsContent.navAbout,
                                    'navAbout',
                                    'text-sm font-semibold text-stone-700 bg-transparent border-none',
                                    false,
                                    'Nav label',
                                )}
                            </a>
                            <a href="#programs" className="transition hover:text-stone-950">
                                {renderField(
                                    cmsContent.navPrograms,
                                    'navPrograms',
                                    'text-sm font-semibold text-stone-700 bg-transparent border-none',
                                    false,
                                    'Nav label',
                                )}
                            </a>
                            <a href="#campus" className="transition hover:text-stone-950">
                                {renderField(
                                    cmsContent.navCampus,
                                    'navCampus',
                                    'text-sm font-semibold text-stone-700 bg-transparent border-none',
                                    false,
                                    'Nav label',
                                )}
                            </a>
                            <a href="#gallery" className="transition hover:text-stone-950">
                                {renderField(
                                    cmsContent.navGallery,
                                    'navGallery',
                                    'text-sm font-semibold text-stone-700 bg-transparent border-none',
                                    false,
                                    'Nav label',
                                )}
                            </a>
                            <Link href="/admissions/apply" className="transition hover:text-stone-950">
                                {renderField(
                                    cmsContent.navAdmissions,
                                    'navAdmissions',
                                    'text-sm font-semibold text-stone-700 bg-transparent border-none',
                                    false,
                                    'Nav label',
                                )}
                            </Link>
                            <a href="#contact" className="transition hover:text-stone-950">
                                {renderField(
                                    cmsContent.navContact,
                                    'navContact',
                                    'text-sm font-semibold text-stone-700 bg-transparent border-none',
                                    false,
                                    'Nav label',
                                )}
                            </a>
                            {publishedPages.map((page) => (
                                <Link
                                    key={page.slug}
                                    href={`/pages/${page.slug}`}
                                    className="transition hover:text-stone-950"
                                >
                                    {page.title}
                                </Link>
                            ))}
                        </nav>

                        <div className="hidden items-center gap-3 lg:flex">
                            <LanguageSwitcher variant="site" />
                            <Link
                                href="/login"
                                className="rounded-full border border-stone-300 bg-white/80 px-5 py-2.5 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-white"
                            >
                                {renderField(
                                    cmsContent.loginLabel,
                                    'loginLabel',
                                    'text-sm font-semibold text-stone-800 bg-transparent border-none',
                                    false,
                                    'Login label',
                                )}
                            </Link>
                            <Link
                                href="/admissions/apply"
                                className="rounded-full bg-[linear-gradient(135deg,#1e3a5f,#1d4ed8,#1e40af)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(30,58,95,0.24)] transition hover:brightness-105"
                            >
                                {renderField(
                                    cmsContent.applyNowLabel,
                                    'applyNowLabel',
                                    'text-sm font-semibold text-white bg-transparent border-none',
                                    false,
                                    'CTA label',
                                )}
                            </Link>
                        </div>
                    </header>

                    <main>
                        <SectionEditBar sectionKey="hero" onSave={onSaveSection} isSaving={isSaving}>
                            <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[0.94fr_1.06fr] lg:px-10 lg:pt-10">
                                <div className="max-w-2xl">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm">
                                        <Sparkles className="h-4 w-4" />
                                        {renderField(
                                            cmsContent.heroBadge,
                                            'heroBadge',
                                            'text-sm font-semibold text-blue-900 bg-transparent border-none',
                                            false,
                                            'Badge text',
                                        )}
                                    </div>
                                    <h1 className="mt-8 font-serif text-5xl font-semibold leading-[0.95] text-stone-950 sm:text-6xl lg:text-7xl">
                                        {renderField(
                                            cmsContent.heroTitleLineOne,
                                            'heroTitleLineOne',
                                            'font-serif text-5xl font-semibold leading-[0.95] text-stone-950 bg-transparent border-none',
                                            false,
                                            'Title line',
                                        )}
                                        <span className="mt-3 block text-blue-800">
                                            {renderField(
                                                cmsContent.heroTitleAccent,
                                                'heroTitleAccent',
                                                'mt-3 block text-blue-800 bg-transparent border-none',
                                                false,
                                                'Accent text',
                                            )}
                                        </span>
                                    </h1>
                                    <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">
                                        {renderField(
                                            cmsContent.heroDescription,
                                            'heroDescription',
                                            'text-lg leading-8 text-stone-600 bg-transparent border-none',
                                            true,
                                            'Description',
                                        )}
                                    </p>

                                    <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                                        <a
                                            href="#programs"
                                            className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-3.5 text-base font-semibold text-white shadow-[0_22px_44px_rgba(28,25,23,0.18)] transition hover:brightness-110"
                                        >
                                            {renderField(
                                                cmsContent.heroPrimaryCta,
                                                'heroPrimaryCta',
                                                'text-base font-semibold text-white bg-transparent border-none',
                                                false,
                                                'Button text',
                                            )}
                                            <ArrowRight className="h-4 w-4" />
                                        </a>
                                        <Link
                                            href="/login"
                                            className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white/85 px-6 py-3.5 text-base font-semibold text-stone-800 transition hover:bg-white"
                                        >
                                            {renderField(
                                                cmsContent.heroSecondaryCta,
                                                'heroSecondaryCta',
                                                'text-base font-semibold text-stone-800 bg-transparent border-none',
                                                false,
                                                'Button text',
                                            )}
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </div>

                                    <div className="mt-10 grid gap-4 sm:grid-cols-2">
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
                                            renderItem={(item, index, isEditingItem, onItemFieldChange) => (
                                                <div className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                                                    {isEditingItem ? (
                                                        <InlineEditField
                                                            value={item.value}
                                                            onChange={(v) => onItemFieldChange('value', v)}
                                                            isEditing={isEditingItem}
                                                            className="font-serif text-4xl font-semibold text-stone-950 bg-transparent border-none"
                                                            placeholder={t('Value')}
                                                        />
                                                    ) : (
                                                        <p className="font-serif text-4xl font-semibold text-stone-950">
                                                            {item.value}
                                                        </p>
                                                    )}
                                                    {isEditingItem ? (
                                                        <InlineEditField
                                                            value={item.label}
                                                            onChange={(v) => onItemFieldChange('label', v)}
                                                            isEditing={isEditingItem}
                                                            className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-stone-500 bg-transparent border-none"
                                                            placeholder={t('Label')}
                                                        />
                                                    ) : (
                                                        <p className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
                                                            {item.label}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute -left-6 top-10 hidden h-32 w-32 rounded-[2rem] border border-white/70 bg-white/45 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur xl:block" />
                                    <div className="overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/40 p-4 shadow-[0_35px_80px_rgba(28,25,23,0.12)] backdrop-blur-2xl">
                                        <div className="relative overflow-hidden rounded-[2rem]">
                                            {heroImage ? (
                                                <img
                                                    src={heroImage}
                                                    alt={cmsContent.brandName}
                                                    className="h-[28rem] w-full object-cover sm:h-[36rem]"
                                                />
                                            ) : (
                                                <div className="h-[28rem] bg-[linear-gradient(135deg,#94a3b8,#f0f4ff,#cbd5e1)] sm:h-[36rem]" />
                                            )}
                                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.04),rgba(12,10,9,0.48))]" />
                                            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                                                <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                                                    <div className="rounded-[1.6rem] bg-white/88 p-5 text-stone-900 shadow-lg backdrop-blur-xl">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-800">
                                                            {renderField(
                                                                cmsContent.featureEyebrow,
                                                                'featureEyebrow',
                                                                'text-xs font-semibold uppercase tracking-[0.28em] text-blue-800 bg-transparent border-none',
                                                                false,
                                                                'Eyebrow',
                                                            )}
                                                        </p>
                                                        <h2 className="mt-3 font-serif text-2xl font-semibold">
                                                            {renderField(
                                                                cmsContent.featureTitle,
                                                                'featureTitle',
                                                                'mt-3 font-serif text-2xl font-semibold bg-transparent border-none',
                                                                false,
                                                                'Title',
                                                            )}
                                                        </h2>
                                                        <p className="mt-3 text-sm leading-6 text-stone-600">
                                                            {renderField(
                                                                cmsContent.openHouseDescription,
                                                                'openHouseDescription',
                                                                'mt-3 text-sm leading-6 text-stone-600 bg-transparent border-none',
                                                                true,
                                                                'Description',
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-[1.6rem] border border-white/20 bg-stone-950/70 p-5 text-white backdrop-blur-xl">
                                                        <p className="text-xs uppercase tracking-[0.28em] text-blue-200">
                                                            {renderField(
                                                                cmsContent.openHouseLabel,
                                                                'openHouseLabel',
                                                                'text-xs uppercase tracking-[0.28em] text-blue-200 bg-transparent border-none',
                                                                false,
                                                                'Label',
                                                            )}
                                                        </p>
                                                        <p className="mt-3 text-2xl font-semibold">
                                                            {renderField(
                                                                cmsContent.openHouseDate,
                                                                'openHouseDate',
                                                                'mt-3 text-2xl font-semibold text-white bg-transparent border-none',
                                                                false,
                                                                'Date',
                                                            )}
                                                        </p>
                                                        <p className="mt-4 text-sm leading-6 text-stone-200">
                                                            {renderField(
                                                                cmsContent.liveOverviewValue,
                                                                'liveOverviewValue',
                                                                'text-sm leading-6 text-stone-200 bg-transparent border-none',
                                                                false,
                                                                'Value',
                                                            )}{' '}
                                                            {renderField(
                                                                cmsContent.liveOverviewLabel,
                                                                'liveOverviewLabel',
                                                                'text-sm leading-6 text-stone-200 bg-transparent border-none',
                                                                false,
                                                                'Label',
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </SectionEditBar>

                        <SectionEditBar sectionKey="about" onSave={onSaveSection} isSaving={isSaving}>
                            <section id="about" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
                                <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
                                    <div className="rounded-[2rem] border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.86),rgba(249,245,237,0.96))] p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
                                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-800">
                                            {renderField(
                                                cmsContent.aboutEyebrow,
                                                'aboutEyebrow',
                                                'text-sm font-semibold uppercase tracking-[0.28em] text-blue-800 bg-transparent border-none',
                                                false,
                                                'Eyebrow',
                                            )}
                                        </p>
                                        <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">
                                            {renderField(
                                                cmsContent.aboutTitle,
                                                'aboutTitle',
                                                'mt-4 font-serif text-4xl font-semibold text-stone-950 bg-transparent border-none',
                                                false,
                                                'Title',
                                            )}
                                        </h2>
                                        <p className="mt-4 text-base leading-7 text-stone-600">
                                            {renderField(
                                                cmsContent.aboutDescription,
                                                'aboutDescription',
                                                'mt-4 text-base leading-7 text-stone-600 bg-transparent border-none',
                                                true,
                                                'Description',
                                            )}
                                        </p>
                                    </div>

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
                                            renderItem={(item, index, isEditingItem, onItemFieldChange) => {
                                                const Icon = featureIcons[index] || Sparkles;
                                                return (
                                                    <div className="rounded-[2rem] border border-white/70 bg-white/78 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.07)] backdrop-blur-xl">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB,#3b82f6)] text-white shadow-lg">
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        {isEditingItem ? (
                                                            <>
                                                                <InlineEditField
                                                                    value={item.title}
                                                                    onChange={(v) => onItemFieldChange('title', v)}
                                                                    isEditing={isEditingItem}
                                                                    className="mt-5 font-serif text-2xl font-semibold text-stone-950 bg-transparent border-none"
                                                                    placeholder={t('Pillar title')}
                                                                />
                                                                <InlineEditField
                                                                    value={item.text}
                                                                    onChange={(v) => onItemFieldChange('text', v)}
                                                                    isEditing={isEditingItem}
                                                                    multiline
                                                                    rows={3}
                                                                    className="mt-3 text-sm leading-6 text-stone-600 bg-transparent border-none"
                                                                    placeholder={t('Pillar text...')}
                                                                />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <h3 className="mt-5 font-serif text-2xl font-semibold text-stone-950">
                                                                    {item.title}
                                                                </h3>
                                                                <p className="mt-3 text-sm leading-6 text-stone-600">
                                                                    {item.text}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            }}
                                        />
                                    </div>
                                </div>
                            </section>
                        </SectionEditBar>

                        <SectionEditBar sectionKey="programs" onSave={onSaveSection} isSaving={isSaving}>
                            <section id="programs" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
                                <div className="max-w-3xl">
                                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-800">
                                        {renderField(
                                            cmsContent.programsEyebrow,
                                            'programsEyebrow',
                                            'text-sm font-semibold uppercase tracking-[0.28em] text-blue-800 bg-transparent border-none',
                                            false,
                                            'Eyebrow',
                                        )}
                                    </p>
                                    <h2 className="mt-3 font-serif text-4xl font-semibold text-stone-950">
                                        {renderField(
                                            cmsContent.programsTitle,
                                            'programsTitle',
                                            'mt-3 font-serif text-4xl font-semibold text-stone-950 bg-transparent border-none',
                                            false,
                                            'Title',
                                        )}
                                    </h2>
                                    <p className="mt-4 text-base leading-7 text-stone-600">
                                        {renderField(
                                            cmsContent.programsDescription,
                                            'programsDescription',
                                            'mt-4 text-base leading-7 text-stone-600 bg-transparent border-none',
                                            true,
                                            'Description',
                                        )}
                                    </p>
                                </div>

                                <div className="mt-8 grid gap-5 lg:grid-cols-4">
                                    <InlineArrayEditor
                                        items={cmsContent.programs}
                                        isEditing={isEditing}
                                        onChange={(items) => onArrayChange?.('programs', items)}
                                        newItemDefaults={{
                                            title: '',
                                            description: '',
                                            age: '',
                                        }}
                                        addLabel="Add Program"
                                        emptyLabel="No programs yet"
                                        renderItem={(item, index, isEditingItem, onItemFieldChange) => (
                                            <div
                                                className={`rounded-[2rem] border p-6 shadow-[0_20px_48px_rgba(15,23,42,0.08)] ${index % 2 === 0 ? 'border-blue-100 bg-[linear-gradient(180deg,#f0f4ff,#ffffff)]' : 'border-sky-100 bg-[linear-gradient(180deg,#f8fbff,#ffffff)]'}`}
                                            >
                                                {isEditingItem ? (
                                                    <InlineEditField
                                                        value={item.age}
                                                        onChange={(v) => onItemFieldChange('age', v)}
                                                        isEditing={isEditingItem}
                                                        className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 bg-transparent border-none"
                                                        placeholder={t('Age group')}
                                                    />
                                                ) : (
                                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                                                        {item.age}
                                                    </p>
                                                )}
                                                {isEditingItem ? (
                                                    <InlineEditField
                                                        value={item.title}
                                                        onChange={(v) => onItemFieldChange('title', v)}
                                                        isEditing={isEditingItem}
                                                        className="mt-4 font-serif text-2xl font-semibold text-stone-950 bg-transparent border-none"
                                                        placeholder={t('Program title')}
                                                    />
                                                ) : (
                                                    <h3 className="mt-4 font-serif text-2xl font-semibold text-stone-950">
                                                        {item.title}
                                                    </h3>
                                                )}
                                                {isEditingItem ? (
                                                    <InlineEditField
                                                        value={item.description}
                                                        onChange={(v) => onItemFieldChange('description', v)}
                                                        isEditing={isEditingItem}
                                                        multiline
                                                        rows={3}
                                                        className="mt-3 text-sm leading-7 text-stone-600 bg-transparent border-none"
                                                        placeholder={t('Program description...')}
                                                    />
                                                ) : (
                                                    <p className="mt-3 text-sm leading-7 text-stone-600">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    />
                                </div>
                            </section>
                        </SectionEditBar>

                        <SectionEditBar sectionKey="campus" onSave={onSaveSection} isSaving={isSaving}>
                            <section id="campus" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
                                <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
                                    <div className="rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,rgba(30,58,95,0.95),rgba(68,64,60,0.92),rgba(30,41,59,0.92))] p-8 text-white shadow-[0_32px_70px_rgba(28,25,23,0.18)]">
                                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-200">
                                            {renderField(
                                                cmsContent.campusEyebrow,
                                                'campusEyebrow',
                                                'text-sm font-semibold uppercase tracking-[0.28em] text-blue-200 bg-transparent border-none',
                                                false,
                                                'Eyebrow',
                                            )}
                                        </p>
                                        <h2 className="mt-4 font-serif text-4xl font-semibold">
                                            {renderField(
                                                cmsContent.campusTitle,
                                                'campusTitle',
                                                'mt-4 font-serif text-4xl font-semibold text-white bg-transparent border-none',
                                                false,
                                                'Title',
                                            )}
                                        </h2>
                                        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-200">
                                            {renderField(
                                                cmsContent.campusDescription,
                                                'campusDescription',
                                                'mt-4 max-w-2xl text-base leading-7 text-stone-200 bg-transparent border-none',
                                                true,
                                                'Description',
                                            )}
                                        </p>
                                        <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                            <InlineArrayEditor
                                                items={cmsContent.campusStats}
                                                isEditing={isEditing}
                                                onChange={(items) => onArrayChange?.('campusStats', items)}
                                                newItemDefaults={{
                                                    value: '',
                                                    label: '',
                                                }}
                                                addLabel="Add Stat"
                                                emptyLabel="No stats yet"
                                                renderItem={(item, index, isEditingItem, onItemFieldChange) => (
                                                    <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
                                                        {isEditingItem ? (
                                                            <InlineEditField
                                                                value={item.value}
                                                                onChange={(v) => onItemFieldChange('value', v)}
                                                                isEditing={isEditingItem}
                                                                className="font-serif text-3xl font-semibold text-white bg-transparent border-none"
                                                                placeholder={t('Value')}
                                                            />
                                                        ) : (
                                                            <p className="font-serif text-3xl font-semibold">
                                                                {item.value}
                                                            </p>
                                                        )}
                                                        {isEditingItem ? (
                                                            <InlineEditField
                                                                value={item.label}
                                                                onChange={(v) => onItemFieldChange('label', v)}
                                                                isEditing={isEditingItem}
                                                                className="mt-2 text-sm font-medium text-stone-200 bg-transparent border-none"
                                                                placeholder={t('Label')}
                                                            />
                                                        ) : (
                                                            <p className="mt-2 text-sm font-medium text-stone-200">
                                                                {item.label}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-[2rem] border border-white/70 bg-white/82 p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
                                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-800">
                                            {renderField(
                                                cmsContent.newsEyebrow,
                                                'newsEyebrow',
                                                'text-sm font-semibold uppercase tracking-[0.28em] text-sky-800 bg-transparent border-none',
                                                false,
                                                'Eyebrow',
                                            )}
                                        </p>
                                        <div className="mt-6 space-y-4">
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
                                                renderItem={(item, index, isEditingItem, onItemFieldChange) => (
                                                    <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5">
                                                        {isEditingItem ? (
                                                            <InlineEditField
                                                                value={item.title}
                                                                onChange={(v) => onItemFieldChange('title', v)}
                                                                isEditing={isEditingItem}
                                                                className="font-serif text-xl font-semibold text-stone-950 bg-transparent border-none"
                                                                placeholder={t('News title')}
                                                            />
                                                        ) : (
                                                            <h3 className="font-serif text-xl font-semibold text-stone-950">
                                                                {item.title}
                                                            </h3>
                                                        )}
                                                        {isEditingItem ? (
                                                            <InlineEditField
                                                                value={item.detail}
                                                                onChange={(v) => onItemFieldChange('detail', v)}
                                                                isEditing={isEditingItem}
                                                                multiline
                                                                rows={2}
                                                                className="mt-2 text-sm leading-6 text-stone-600 bg-transparent border-none"
                                                                placeholder={t('News detail...')}
                                                            />
                                                        ) : (
                                                            <p className="mt-2 text-sm leading-6 text-stone-600">
                                                                {item.detail}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </SectionEditBar>

                        <SectionEditBar sectionKey="outcomes" onSave={onSaveSection} isSaving={isSaving}>
                            <section id="gallery" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
                                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                                    <div className="rounded-[2rem] border border-white/70 bg-white/78 p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
                                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-800">
                                            {renderField(
                                                cmsContent.outcomesEyebrow,
                                                'outcomesEyebrow',
                                                'text-sm font-semibold uppercase tracking-[0.28em] text-blue-800 bg-transparent border-none',
                                                false,
                                                'Eyebrow',
                                            )}
                                        </p>
                                        <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">
                                            {renderField(
                                                cmsContent.outcomesTitle,
                                                'outcomesTitle',
                                                'mt-4 font-serif text-4xl font-semibold text-stone-950 bg-transparent border-none',
                                                false,
                                                'Title',
                                            )}
                                        </h2>
                                        <p className="mt-4 text-base leading-7 text-stone-600">
                                            {renderField(
                                                cmsContent.outcomesDescription,
                                                'outcomesDescription',
                                                'mt-4 text-base leading-7 text-stone-600 bg-transparent border-none',
                                                true,
                                                'Description',
                                            )}
                                        </p>
                                        <div className="mt-6 grid gap-4">
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
                                                renderItem={(item, index, isEditingItem, onItemFieldChange) => (
                                                    <div className="rounded-[1.5rem] border border-stone-200 bg-[linear-gradient(180deg,#fff,#f0f4ff)] p-5">
                                                        {isEditingItem ? (
                                                            <InlineEditField
                                                                value={item.title}
                                                                onChange={(v) => onItemFieldChange('title', v)}
                                                                isEditing={isEditingItem}
                                                                className="font-semibold text-stone-950 bg-transparent border-none"
                                                                placeholder={t('Outcome title')}
                                                            />
                                                        ) : (
                                                            <p className="font-semibold text-stone-950">{item.title}</p>
                                                        )}
                                                        {isEditingItem ? (
                                                            <InlineEditField
                                                                value={item.description}
                                                                onChange={(v) => onItemFieldChange('description', v)}
                                                                isEditing={isEditingItem}
                                                                multiline
                                                                rows={2}
                                                                className="mt-2 text-sm leading-6 text-stone-600 bg-transparent border-none"
                                                                placeholder={t('Outcome description...')}
                                                            />
                                                        ) : (
                                                            <p className="mt-2 text-sm leading-6 text-stone-600">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {galleryImages.map((image, index) => (
                                            <div
                                                key={`gallery-${index}`}
                                                className={`overflow-hidden rounded-[2rem] border border-white/70 shadow-[0_20px_45px_rgba(15,23,42,0.1)] ${index === 0 ? 'sm:col-span-2' : ''}`}
                                            >
                                                {image ? (
                                                    <img
                                                        src={image}
                                                        alt={`${cmsContent.brandName} campus view ${index + 1}`}
                                                        className={`w-full object-cover ${index === 0 ? 'h-72' : 'h-60'}`}
                                                    />
                                                ) : (
                                                    <div
                                                        className={`w-full bg-[linear-gradient(135deg,#bfdbfe,#e0f2fe,#ddd6fe)] ${index === 0 ? 'h-72' : 'h-60'}`}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </SectionEditBar>

                        <SectionEditBar sectionKey="journey" onSave={onSaveSection} isSaving={isSaving}>
                            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
                                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                                    <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
                                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-800">
                                            {renderField(
                                                cmsContent.journeyEyebrow,
                                                'journeyEyebrow',
                                                'text-sm font-semibold uppercase tracking-[0.28em] text-sky-800 bg-transparent border-none',
                                                false,
                                                'Eyebrow',
                                            )}
                                        </p>
                                        <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">
                                            {renderField(
                                                cmsContent.journeyTitle,
                                                'journeyTitle',
                                                'mt-4 font-serif text-4xl font-semibold text-stone-950 bg-transparent border-none',
                                                false,
                                                'Title',
                                            )}
                                        </h2>
                                        <p className="mt-4 text-base leading-7 text-stone-600">
                                            {renderField(
                                                cmsContent.journeyDescription,
                                                'journeyDescription',
                                                'mt-4 text-base leading-7 text-stone-600 bg-transparent border-none',
                                                true,
                                                'Description',
                                            )}
                                        </p>
                                    </div>
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
                                            addLabel="Add Step"
                                            emptyLabel="No steps yet"
                                            renderItem={(item, index, isEditingItem, onItemFieldChange) => (
                                                <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                                                    <div className="flex items-center gap-4">
                                                        <div className="rounded-2xl bg-blue-100 px-4 py-2 text-lg font-black text-blue-900">
                                                            {isEditingItem ? (
                                                                <InlineEditField
                                                                    value={item.step}
                                                                    onChange={(v) => onItemFieldChange('step', v)}
                                                                    isEditing={isEditingItem}
                                                                    className="rounded-2xl bg-blue-100 px-4 py-2 text-lg font-black text-blue-900 bg-transparent border-none w-12 text-center"
                                                                    placeholder="#"
                                                                />
                                                            ) : (
                                                                item.step
                                                            )}
                                                        </div>
                                                        {isEditingItem ? (
                                                            <InlineEditField
                                                                value={item.title}
                                                                onChange={(v) => onItemFieldChange('title', v)}
                                                                isEditing={isEditingItem}
                                                                className="font-serif text-2xl font-semibold text-stone-950 bg-transparent border-none flex-1"
                                                                placeholder={t('Step title')}
                                                            />
                                                        ) : (
                                                            <h3 className="font-serif text-2xl font-semibold text-stone-950">
                                                                {item.title}
                                                            </h3>
                                                        )}
                                                    </div>
                                                    {isEditingItem ? (
                                                        <InlineEditField
                                                            value={item.description}
                                                            onChange={(v) => onItemFieldChange('description', v)}
                                                            isEditing={isEditingItem}
                                                            multiline
                                                            rows={2}
                                                            className="mt-4 text-sm leading-6 text-stone-600 bg-transparent border-none"
                                                            placeholder={t('Step description...')}
                                                        />
                                                    ) : (
                                                        <p className="mt-4 text-sm leading-6 text-stone-600">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        />
                                    </div>
                                </div>
                            </section>
                        </SectionEditBar>

                        <SectionEditBar sectionKey="voicesAndVisit" onSave={onSaveSection} isSaving={isSaving}>
                            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
                                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                                    <div className="rounded-[2rem] border border-white/70 bg-[linear-gradient(150deg,rgba(255,255,255,0.86),rgba(248,250,252,0.94))] p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
                                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-800">
                                            {renderField(
                                                cmsContent.voicesEyebrow,
                                                'voicesEyebrow',
                                                'text-sm font-semibold uppercase tracking-[0.28em] text-blue-800 bg-transparent border-none',
                                                false,
                                                'Eyebrow',
                                            )}
                                        </p>
                                        <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">
                                            {renderField(
                                                cmsContent.voicesTitle,
                                                'voicesTitle',
                                                'mt-4 font-serif text-4xl font-semibold text-stone-950 bg-transparent border-none',
                                                false,
                                                'Title',
                                            )}
                                        </h2>
                                        <div className="mt-8 grid gap-4">
                                            <InlineArrayEditor
                                                items={cmsContent.testimonials}
                                                isEditing={isEditing}
                                                onChange={(items) => onArrayChange?.('testimonials', items)}
                                                newItemDefaults={{
                                                    name: '',
                                                    role: '',
                                                    quote: '',
                                                }}
                                                addLabel="Add Testimonial"
                                                emptyLabel="No testimonials yet"
                                                renderItem={(item, index, isEditingItem, onItemFieldChange) => (
                                                    <div className="rounded-[1.6rem] border border-stone-200 bg-white p-5">
                                                        <Quote className="h-6 w-6 text-blue-700" />
                                                        {isEditingItem ? (
                                                            <InlineEditField
                                                                value={item.quote}
                                                                onChange={(v) => onItemFieldChange('quote', v)}
                                                                isEditing={isEditingItem}
                                                                multiline
                                                                rows={3}
                                                                className="mt-4 text-sm leading-7 text-stone-600 bg-transparent border-none"
                                                                placeholder={t('Quote...')}
                                                            />
                                                        ) : (
                                                            <p className="mt-4 text-sm leading-7 text-stone-600">
                                                                {item.quote}
                                                            </p>
                                                        )}
                                                        <div className="mt-5">
                                                            {isEditingItem ? (
                                                                <InlineEditField
                                                                    value={item.name}
                                                                    onChange={(v) => onItemFieldChange('name', v)}
                                                                    isEditing={isEditingItem}
                                                                    className="font-semibold text-stone-950 bg-transparent border-none"
                                                                    placeholder={t('Name')}
                                                                />
                                                            ) : (
                                                                <p className="font-semibold text-stone-950">
                                                                    {item.name}
                                                                </p>
                                                            )}
                                                            {isEditingItem ? (
                                                                <InlineEditField
                                                                    value={item.role}
                                                                    onChange={(v) => onItemFieldChange('role', v)}
                                                                    isEditing={isEditingItem}
                                                                    className="mt-1 text-sm text-stone-500 bg-transparent border-none"
                                                                    placeholder={t('Role')}
                                                                />
                                                            ) : (
                                                                <p className="text-sm text-stone-500">{item.role}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div
                                        id="contact"
                                        className="rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,#eff6ff,#ffffff,#eff6ff)] p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)]"
                                    >
                                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-800">
                                            {renderField(
                                                cmsContent.visitEyebrow,
                                                'visitEyebrow',
                                                'text-sm font-semibold uppercase tracking-[0.28em] text-sky-800 bg-transparent border-none',
                                                false,
                                                'Eyebrow',
                                            )}
                                        </p>
                                        <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">
                                            {renderField(
                                                cmsContent.visitTitle,
                                                'visitTitle',
                                                'mt-4 font-serif text-4xl font-semibold text-stone-950 bg-transparent border-none',
                                                false,
                                                'Title',
                                            )}
                                        </h2>
                                        <div className="mt-8 space-y-5">
                                            {[
                                                {
                                                    titleKey: 'visitPointOneTitle',
                                                    textKey: 'visitPointOneText',
                                                    title: cmsContent.visitPointOneTitle,
                                                    text: cmsContent.visitPointOneText,
                                                },
                                                {
                                                    titleKey: 'visitPointTwoTitle',
                                                    textKey: 'visitPointTwoText',
                                                    title: cmsContent.visitPointTwoTitle,
                                                    text: cmsContent.visitPointTwoText,
                                                },
                                                {
                                                    titleKey: 'visitPointThreeTitle',
                                                    textKey: 'visitPointThreeText',
                                                    title: cmsContent.visitPointThreeTitle,
                                                    text: cmsContent.visitPointThreeText,
                                                },
                                            ].map((point, index) => {
                                                const Icon = spotlightIcons[index] || Star;

                                                return (
                                                    <div
                                                        key={point.titleKey}
                                                        className="flex items-start gap-3 rounded-[1.4rem] border border-stone-200 bg-white/80 p-4"
                                                    >
                                                        <Icon className="mt-1 h-5 w-5 text-blue-700" />
                                                        <div className="flex-1">
                                                            {isEditing ? (
                                                                <InlineEditField
                                                                    value={point.title}
                                                                    onChange={(v) => onFieldChange?.(point.titleKey, v)}
                                                                    isEditing={isEditing}
                                                                    className="font-semibold text-stone-950 bg-transparent border-none"
                                                                    placeholder={t('Point title')}
                                                                />
                                                            ) : (
                                                                <p className="font-semibold text-stone-950">
                                                                    {point.title}
                                                                </p>
                                                            )}
                                                            {isEditing ? (
                                                                <InlineEditField
                                                                    value={point.text}
                                                                    onChange={(v) => onFieldChange?.(point.textKey, v)}
                                                                    isEditing={isEditing}
                                                                    multiline
                                                                    rows={2}
                                                                    className="mt-1 text-sm leading-6 text-stone-600 bg-transparent border-none"
                                                                    placeholder={t('Point text...')}
                                                                />
                                                            ) : (
                                                                <p className="mt-1 text-sm leading-6 text-stone-600">
                                                                    {point.text}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                            <Link
                                                href="/admissions/apply"
                                                className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                                            >
                                                {renderField(
                                                    cmsContent.visitPrimaryCta,
                                                    'visitPrimaryCta',
                                                    'text-sm font-semibold text-white bg-transparent border-none',
                                                    false,
                                                    'CTA text',
                                                )}
                                            </Link>
                                            <Link
                                                href="/login"
                                                className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
                                            >
                                                {renderField(
                                                    cmsContent.visitSecondaryCta,
                                                    'visitSecondaryCta',
                                                    'text-sm font-semibold text-stone-800 bg-transparent border-none',
                                                    false,
                                                    'CTA text',
                                                )}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </SectionEditBar>

                        <SectionEditBar sectionKey="admissions" onSave={onSaveSection} isSaving={isSaving}>
                            <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
                                <div className="rounded-[2.3rem] border border-white/70 bg-[linear-gradient(145deg,rgba(41,37,36,0.96),rgba(30,58,95,0.92),rgba(30,41,59,0.94))] px-6 py-10 text-white shadow-[0_35px_80px_rgba(28,25,23,0.18)] sm:px-10">
                                    <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-blue-200">
                                                {renderField(
                                                    cmsContent.admissionsEyebrow,
                                                    'admissionsEyebrow',
                                                    'text-sm font-semibold uppercase tracking-[0.32em] text-blue-200 bg-transparent border-none',
                                                    false,
                                                    'Eyebrow',
                                                )}
                                            </p>
                                            <h2 className="mt-4 font-serif text-4xl font-semibold">
                                                {renderField(
                                                    cmsContent.admissionsTitle,
                                                    'admissionsTitle',
                                                    'mt-4 font-serif text-4xl font-semibold text-white bg-transparent border-none',
                                                    false,
                                                    'Title',
                                                )}
                                            </h2>
                                            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-200">
                                                {renderField(
                                                    cmsContent.admissionsDescription,
                                                    'admissionsDescription',
                                                    'mt-4 max-w-2xl text-base leading-7 text-stone-200 bg-transparent border-none',
                                                    true,
                                                    'Description',
                                                )}
                                            </p>

                                            <div className="mt-8 space-y-4 text-sm text-stone-200">
                                                <div className="flex items-start gap-3">
                                                    <Users className="mt-0.5 h-5 w-5 text-blue-200" />
                                                    {isEditing ? (
                                                        <InlineEditField
                                                            value={cmsContent.admissionsPointOne}
                                                            onChange={(v) => onFieldChange?.('admissionsPointOne', v)}
                                                            isEditing={isEditing}
                                                            className="text-sm text-stone-200 bg-transparent border-none flex-1"
                                                            placeholder={t('Point 1')}
                                                        />
                                                    ) : (
                                                        <p>{cmsContent.admissionsPointOne}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <Award className="mt-0.5 h-5 w-5 text-blue-200" />
                                                    {isEditing ? (
                                                        <InlineEditField
                                                            value={cmsContent.admissionsPointTwo}
                                                            onChange={(v) => onFieldChange?.('admissionsPointTwo', v)}
                                                            isEditing={isEditing}
                                                            className="text-sm text-stone-200 bg-transparent border-none flex-1"
                                                            placeholder={t('Point 2')}
                                                        />
                                                    ) : (
                                                        <p>{cmsContent.admissionsPointTwo}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <Mail className="mt-0.5 h-5 w-5 text-blue-200" />
                                                    {isEditing ? (
                                                        <InlineEditField
                                                            value={cmsContent.admissionsEmail}
                                                            onChange={(v) => onFieldChange?.('admissionsEmail', v)}
                                                            isEditing={isEditing}
                                                            className="text-sm text-stone-200 bg-transparent border-none flex-1"
                                                            placeholder={t('Email address')}
                                                        />
                                                    ) : (
                                                        <p>{cmsContent.admissionsEmail}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                                <Link
                                                    href="/admissions/apply"
                                                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-100"
                                                >
                                                    {renderField(
                                                        cmsContent.admissionsFormTitle,
                                                        'admissionsFormTitle',
                                                        'text-sm font-semibold text-stone-950 bg-transparent border-none',
                                                        false,
                                                        'Button text',
                                                    )}
                                                </Link>
                                                <Link
                                                    href="/login"
                                                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                                                >
                                                    {renderField(
                                                        cmsContent.admissionsPortalButton,
                                                        'admissionsPortalButton',
                                                        'text-sm font-semibold text-white bg-transparent border-none',
                                                        false,
                                                        'Button text',
                                                    )}
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="rounded-[1.9rem] border border-white/12 bg-white/10 p-6 backdrop-blur-xl">
                                            <h3 className="font-serif text-2xl font-semibold">
                                                {renderField(
                                                    cmsContent.admissionsFormTitle,
                                                    'admissionsFormTitle',
                                                    'font-serif text-2xl font-semibold text-white bg-transparent border-none',
                                                    false,
                                                    'Form title',
                                                )}
                                            </h3>
                                            <p className="mt-2 text-sm leading-6 text-stone-200">
                                                {cmsContent.admissionsFormIntro}
                                            </p>
                                            <p className="mt-4 text-sm leading-6 text-stone-200">
                                                {t(
                                                    'The admission form is now available on a separate page, which makes the homepage lighter and gives families a focused application flow.',
                                                )}
                                            </p>
                                            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                                <Link
                                                    href="/admissions/apply"
                                                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-100"
                                                >
                                                    {t('Open Admission Form')}
                                                </Link>
                                                <a
                                                    href={`mailto:${cmsContent.admissionsEmail}`}
                                                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                                                >
                                                    {t('Email Admissions')}
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </SectionEditBar>
                    </main>
                </div>
            </div>
        </>
    );
}
