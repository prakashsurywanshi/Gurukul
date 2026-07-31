import { Head, Link } from '@inertiajs/react';
import { BookOpen, CalendarRange, GraduationCap, Image as ImageIcon, Mail, MapPin, Phone, Sparkles, Star, Users2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WebsiteContent } from '../../utils/websiteCmsContent';
import type { PublishedPage, CurrentUser } from '../Home';
import InlineEditField from '../../components/website/InlineEditField';
import InlineArrayEditor from '../../components/website/InlineArrayEditor';
import SectionEditBar from '../../components/website/SectionEditBar';

interface TemplateFourHomeProps {
  cmsContent: WebsiteContent;
  user?: CurrentUser | null;
  publishedPages?: PublishedPage[];
  isEditing?: boolean;
  onFieldChange?: (key: string, value: string) => void;
  onArrayChange?: (key: string, items: any[]) => void;
  onSaveSection?: (sectionKey: string, data: Record<string, any>) => void;
  isSaving?: boolean;
}

const highlightPalette = [
  'border-rose-200 bg-rose-50/90',
  'border-blue-200 bg-blue-50/90',
  'border-sky-200 bg-sky-50/90',
];

const aboutIcons = [BookOpen, Star, Users2];
const contactIcons = [Phone, Mail, MapPin];

export default function TemplateFourHome({ cmsContent, user, publishedPages = [], isEditing = false, onFieldChange, onArrayChange, onSaveSection, isSaving = false }: TemplateFourHomeProps) {
  const renderField = (value: string, fieldKey: string, className?: string, multiline?: boolean, placeholder?: string) => {
    if (isEditing && onFieldChange) {
      return (
        <InlineEditField
          value={value}
          onChange={(v) => onFieldChange(fieldKey, v)}
          isEditing={isEditing}
          className={className}
          multiline={multiline}
          placeholder={placeholder}
        />
      );
    }
    return value;
  };

  const heroImage = cmsContent.sliderImages[0] ?? null;
  const galleryImages = cmsContent.sliderImages.length > 0
    ? cmsContent.sliderImages
    : Array.from({ length: 4 }, () => null);
  const baseNavItems = [
    { href: '#about' as const, label: cmsContent.navAbout },
    { href: '#gallery' as const, label: cmsContent.navGallery },
    { href: '#events' as const, label: 'Events' },
    { href: '#admissions' as const, label: cmsContent.navAdmissions },
    { href: '#contact' as const, label: cmsContent.navContact },
  ];
  const navItems = [
    ...baseNavItems,
    ...publishedPages.map((p) => ({ href: `/pages/${p.slug}` as string, label: p.title })),
  ];
  const [activeTab, setActiveTab] = useState<string>('#about');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const allowedHrefs = new Set(navItems.map((item) => item.href));

    const syncActiveTab = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (allowedHrefs.has(hash)) {
        setActiveTab(hash);
      } else if (allowedHrefs.has(path)) {
        setActiveTab(path);
      } else {
        setActiveTab('#about');
      }
    };

    syncActiveTab();
    window.addEventListener('hashchange', syncActiveTab);

    return () => window.removeEventListener('hashchange', syncActiveTab);
  }, [navItems]);

  return (
    <>
      <Head title={`${cmsContent.seoTitle} | Template 4`} />

      <div className="min-h-screen bg-[linear-gradient(180deg,#f0f9ff_0%,#f0f9ff_22%,#e0e7ff_52%,#edf4ff_100%)] text-stone-900">
        <div className="border-b border-blue-200/70 bg-[linear-gradient(90deg,#1e3a5f,#1e40af,#1d4ed8)] text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm sm:px-8 lg:px-10">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4" />{renderField(cmsContent.templateFourTopPhone, 'templateFourTopPhone', 'bg-transparent border-none text-white', false, 'Phone number')}</span>
              <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4" />{renderField(cmsContent.templateFourTopEmail, 'templateFourTopEmail', 'bg-transparent border-none text-white', false, 'Email address')}</span>
            </div>
            <div className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{renderField(cmsContent.templateFourTopAddress, 'templateFourTopAddress', 'bg-transparent border-none text-white', false, 'Address')}</div>
          </div>
        </div>

        <header className="sticky top-0 z-20 border-b border-blue-200/70 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:flex-nowrap lg:px-10">
            <Link href="/" className="flex min-w-0 shrink-0 items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-blue-300 text-blue-900 shadow-[0_16px_36px_rgba(30,64,175,0.14)] ${cmsContent.brandLogo ? 'bg-white' : 'bg-[linear-gradient(135deg,#eff6ff,#bfdbfe)]'}`}>
                {cmsContent.brandLogo ? (
                  <img src={cmsContent.brandLogo} alt={`${cmsContent.brandName} logo`} className="max-h-full max-w-full object-contain p-1" />
                ) : (
                  <GraduationCap className="h-7 w-7" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-serif text-2xl font-semibold tracking-[0.08em] text-stone-950">{renderField(cmsContent.brandName, 'brandName', 'font-serif text-2xl font-semibold tracking-[0.08em] text-stone-950 bg-transparent border-none', false, 'School name')}</p>
                <p className="truncate text-xs uppercase tracking-[0.32em] text-stone-500">{renderField(cmsContent.brandSubtitle, 'brandSubtitle', 'text-xs uppercase tracking-[0.32em] text-stone-500 bg-transparent border-none', false, 'Subtitle')}</p>
              </div>
            </Link>

            <nav className="order-3 flex w-full flex-wrap justify-center gap-3 lg:order-none lg:w-auto lg:flex-1 lg:flex-nowrap">
              {navItems.map((item) => {
                const isPageLink = item.href.startsWith('/pages/');
                const navClass = `inline-flex rounded-full border px-5 py-2.5 text-sm font-semibold shadow-sm transition ${
                    activeTab === item.href
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                  }`;
                const label = item.href === '#about' ? renderField(item.label, 'navAbout', 'bg-transparent border-none', false, 'Nav label') : item.label;
                if (isPageLink) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={navClass}
                    >
                      {label}
                    </Link>
                  );
                }
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setActiveTab(item.href)}
                    className={navClass}
                  >
                    {label}
                  </a>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-3">
              <Link href="/login" className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-50">
                {renderField(cmsContent.loginLabel, 'loginLabel', 'bg-transparent border-none text-stone-800', false, 'Login text')}
              </Link>
              <Link href="/admissions/apply" className="rounded-full bg-[linear-gradient(135deg,#1e3a5f,#1d4ed8,#2563EB)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(29,78,216,0.22)] transition hover:brightness-105">
                {renderField(cmsContent.applyNowLabel, 'applyNowLabel', 'bg-transparent border-none text-white', false, 'Apply text')}
              </Link>
            </div>
          </div>
        </header>

        <main>
          <section className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_0.95fr] lg:px-10 lg:py-14">
            <div className="max-w-2xl">
              {isEditing && onSaveSection && (
                <SectionEditBar sectionName="Hero" onSave={() => onSaveSection('hero', {
                  templateFourHeroEyebrow: cmsContent.templateFourHeroEyebrow,
                  templateFourHeroTitle: cmsContent.templateFourHeroTitle,
                  templateFourHeroDescription: cmsContent.templateFourHeroDescription,
                  templateFourHeroPrimaryCta: cmsContent.templateFourHeroPrimaryCta,
                  templateFourHeroSecondaryCta: cmsContent.templateFourHeroSecondaryCta,
                  templateFourNoticeLabel: cmsContent.templateFourNoticeLabel,
                  templateFourNoticeText: cmsContent.templateFourNoticeText,
                })} isSaving={isSaving} />
              )}
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm">
                <Sparkles className="h-4 w-4" />
                {renderField(cmsContent.templateFourHeroEyebrow, 'templateFourHeroEyebrow', 'bg-transparent border-none text-blue-900', false, 'Eyebrow text')}
              </div>
              <h1 className="mt-7 font-serif text-5xl font-semibold leading-[0.95] text-stone-950 sm:text-6xl">
                {renderField(cmsContent.templateFourHeroTitle, 'templateFourHeroTitle', 'font-serif text-5xl font-semibold leading-[0.95] text-stone-950 sm:text-6xl bg-transparent border-none', true, 'Hero title')}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">{renderField(cmsContent.templateFourHeroDescription, 'templateFourHeroDescription', 'text-lg leading-8 text-stone-600 bg-transparent border-none', true, 'Hero description')}</p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a href="#about" className="inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3.5 text-base font-semibold text-white shadow-[0_20px_40px_rgba(28,25,23,0.18)] transition hover:brightness-110">
                  {renderField(cmsContent.templateFourHeroPrimaryCta, 'templateFourHeroPrimaryCta', 'bg-transparent border-none text-white', false, 'Primary button')}
                </a>
                <Link href="/admissions/apply" className="inline-flex items-center justify-center rounded-full border border-blue-300 bg-blue-50 px-6 py-3.5 text-base font-semibold text-blue-900 transition hover:bg-blue-100">
                  {renderField(cmsContent.templateFourHeroSecondaryCta, 'templateFourHeroSecondaryCta', 'bg-transparent border-none text-blue-900', false, 'Secondary button')}
                </Link>
              </div>

              <div className="mt-8 rounded-[2rem] border border-blue-200 bg-[linear-gradient(135deg,#eff6ff,#dbeafe)] p-5 shadow-[0_20px_46px_rgba(30,64,175,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-800">{renderField(cmsContent.templateFourNoticeLabel, 'templateFourNoticeLabel', 'text-xs font-semibold uppercase tracking-[0.3em] text-blue-800 bg-transparent border-none', false, 'Notice label')}</p>
                <p className="mt-3 text-base leading-7 text-stone-700">{renderField(cmsContent.templateFourNoticeText, 'templateFourNoticeText', 'text-base leading-7 text-stone-700 bg-transparent border-none', true, 'Notice text')}</p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <InlineArrayEditor
                  items={cmsContent.highlights}
                  isEditing={isEditing}
                  onChange={(items) => onArrayChange?.('highlights', items)}
                  newItemDefaults={{ label: '', value: '' }}
                  addLabel="Add Highlight"
                  emptyLabel="No highlights yet"
                  renderItem={(item, index, isEditingItem, onItemFieldChange) => (
                    <div className={`rounded-[1.75rem] border p-5 shadow-sm ${highlightPalette[index % highlightPalette.length]}`}>
                      {isEditingItem ? (
                        <>
                          <InlineEditField value={item.value} onChange={(v) => onItemFieldChange('value', v)} isEditing={isEditingItem} className="font-serif text-3xl font-semibold text-stone-950 bg-transparent border-none" placeholder="Value" />
                          <InlineEditField value={item.label} onChange={(v) => onItemFieldChange('label', v)} isEditing={isEditingItem} className="mt-2 text-sm font-medium text-stone-600 bg-transparent border-none" placeholder="Label" />
                        </>
                      ) : (
                        <>
                          <p className="font-serif text-3xl font-semibold text-stone-950">{item.value}</p>
                          <p className="mt-2 text-sm font-medium text-stone-600">{item.label}</p>
                        </>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[2.6rem] border border-white/70 bg-white/60 p-4 shadow-[0_35px_80px_rgba(28,25,23,0.12)] backdrop-blur-2xl">
                <div className="relative overflow-hidden rounded-[2rem]">
                  {heroImage ? (
                    <img src={heroImage} alt={cmsContent.brandName} className="h-[28rem] w-full object-cover sm:h-[36rem]" />
                  ) : (
                    <div className="h-[28rem] bg-[linear-gradient(135deg,#dbeafe,#bfdbfe,#bfdbfe)] sm:h-[36rem]" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.06),rgba(12,10,9,0.5))]" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="rounded-[1.7rem] bg-white/88 p-5 text-stone-900 shadow-xl backdrop-blur-xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-800">{renderField(cmsContent.admissionsEyebrow, 'admissionsEyebrow', 'text-xs font-semibold uppercase tracking-[0.3em] text-blue-800 bg-transparent border-none', false, 'Admissions eyebrow')}</p>
                      <h2 className="mt-3 font-serif text-2xl font-semibold">{renderField(cmsContent.admissionsTitle, 'admissionsTitle', 'font-serif text-2xl font-semibold bg-transparent border-none', false, 'Admissions title')}</h2>
                      <p className="mt-3 text-sm leading-6 text-stone-600">{renderField(cmsContent.admissionsDescription, 'admissionsDescription', 'text-sm leading-6 text-stone-600 bg-transparent border-none', true, 'Admissions description')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="about" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <div className="rounded-[2.3rem] border border-blue-200 bg-white/88 p-8 shadow-[0_24px_56px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              {isEditing && onSaveSection && (
                <SectionEditBar sectionName="About" onSave={() => onSaveSection('about', {
                  navAbout: cmsContent.navAbout,
                  templateFourAboutTitle: cmsContent.templateFourAboutTitle,
                  templateFourAboutDescription: cmsContent.templateFourAboutDescription,
                  templateFourAboutCards: cmsContent.templateFourAboutCards,
                })} isSaving={isSaving} />
              )}
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-800">{renderField(cmsContent.navAbout, 'navAbout', 'text-sm font-semibold uppercase tracking-[0.3em] text-blue-800 bg-transparent border-none', false, 'Section label')}</p>
                <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{renderField(cmsContent.templateFourAboutTitle, 'templateFourAboutTitle', 'font-serif text-4xl font-semibold text-stone-950 bg-transparent border-none', false, 'About title')}</h2>
                <p className="mt-4 text-base leading-7 text-stone-600">{renderField(cmsContent.templateFourAboutDescription, 'templateFourAboutDescription', 'text-base leading-7 text-stone-600 bg-transparent border-none', true, 'About description')}</p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                <InlineArrayEditor
                  items={cmsContent.templateFourAboutCards}
                  isEditing={isEditing}
                  onChange={(items) => onArrayChange?.('templateFourAboutCards', items)}
                  newItemDefaults={{ title: '', description: '' }}
                  addLabel="Add Card"
                  emptyLabel="No cards yet"
                  renderItem={(item, index, isEditingItem, onItemFieldChange) => {
                    const Icon = aboutIcons[index] || Sparkles;
                    return (
                      <div className="rounded-[1.8rem] border border-stone-200 bg-[linear-gradient(180deg,#ffffff,#f0f9ff)] p-6 shadow-sm">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                          index % 5 === 0
                            ? 'border border-rose-200 bg-rose-100 text-rose-800'
                            : index % 5 === 1
                              ? 'border border-blue-200 bg-blue-100 text-blue-900'
                              : index % 5 === 2
                                ? 'border border-emerald-200 bg-emerald-100 text-emerald-800'
                                : index % 5 === 3
                                  ? 'border border-sky-200 bg-sky-100 text-sky-800'
                                  : 'border border-violet-200 bg-violet-100 text-violet-800'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {isEditingItem ? (
                          <>
                            <InlineEditField value={item.title} onChange={(v) => onItemFieldChange('title', v)} isEditing={isEditingItem} className="mt-5 font-serif text-2xl font-semibold text-stone-950 bg-transparent border-none" placeholder="Card title" />
                            <InlineEditField value={item.description} onChange={(v) => onItemFieldChange('description', v)} isEditing={isEditingItem} multiline rows={3} className="mt-3 text-sm leading-6 text-stone-600 bg-transparent border-none" placeholder="Card description..." />
                          </>
                        ) : (
                          <>
                            <h3 className="mt-5 font-serif text-2xl font-semibold text-stone-950">{item.title}</h3>
                            <p className="mt-3 text-sm leading-6 text-stone-600">{item.description}</p>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
              </div>
            </div>
          </section>

          <section id="gallery" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <div className="rounded-[2.3rem] border border-sky-200 bg-[linear-gradient(160deg,#ffffff,#eef6ff,#eff6ff)] p-8 shadow-[0_24px_56px_rgba(37,99,235,0.08)]">
              {isEditing && onSaveSection && (
                <SectionEditBar sectionName="Gallery" onSave={() => onSaveSection('gallery', {
                  templateFourGalleryTitle: cmsContent.templateFourGalleryTitle,
                  templateFourGalleryDescription: cmsContent.templateFourGalleryDescription,
                  templateFourGalleryItems: cmsContent.templateFourGalleryItems,
                })} isSaving={isSaving} />
              )}
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">{cmsContent.navGallery}</p>
                <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{renderField(cmsContent.templateFourGalleryTitle, 'templateFourGalleryTitle', 'font-serif text-4xl font-semibold text-stone-950 bg-transparent border-none', false, 'Gallery title')}</h2>
                <p className="mt-4 text-base leading-7 text-stone-600">{renderField(cmsContent.templateFourGalleryDescription, 'templateFourGalleryDescription', 'text-base leading-7 text-stone-600 bg-transparent border-none', true, 'Gallery description')}</p>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                <InlineArrayEditor
                  items={cmsContent.templateFourGalleryItems}
                  isEditing={isEditing}
                  onChange={(items) => onArrayChange?.('templateFourGalleryItems', items)}
                  newItemDefaults={{ title: '', description: '', category: '' }}
                  addLabel="Add Gallery Item"
                  emptyLabel="No gallery items yet"
                  renderItem={(item, index, isEditingItem, onItemFieldChange) => (
                    <article className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-sm">
                      <div className="relative h-56 w-full">
                        {galleryImages[index % galleryImages.length] ? (
                          <img src={galleryImages[index % galleryImages.length] ?? ''} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-[linear-gradient(135deg,#bfdbfe,#dbeafe,#bfdbfe)]" />
                        )}
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.04),rgba(12,10,9,0.42))]" />
                        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-stone-800">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {isEditingItem ? (
                            <InlineEditField value={item.category} onChange={(v) => onItemFieldChange('category', v)} isEditing={isEditingItem} className="bg-transparent border-none text-xs font-semibold uppercase tracking-[0.2em] text-stone-800" placeholder="Category" />
                          ) : (
                            item.category
                          )}
                        </div>
                      </div>
                      <div className="p-6">
                        {isEditingItem ? (
                          <>
                            <InlineEditField value={item.title} onChange={(v) => onItemFieldChange('title', v)} isEditing={isEditingItem} className="font-serif text-2xl font-semibold text-stone-950 bg-transparent border-none" placeholder="Gallery title" />
                            <InlineEditField value={item.description} onChange={(v) => onItemFieldChange('description', v)} isEditing={isEditingItem} multiline rows={3} className="mt-3 text-sm leading-6 text-stone-600 bg-transparent border-none" placeholder="Gallery description..." />
                          </>
                        ) : (
                          <>
                            <h3 className="font-serif text-2xl font-semibold text-stone-950">{item.title}</h3>
                            <p className="mt-3 text-sm leading-6 text-stone-600">{item.description}</p>
                          </>
                        )}
                      </div>
                    </article>
                  )}
                />
              </div>
            </div>
          </section>

          <section id="events" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <div className="rounded-[2.3rem] border border-emerald-200 bg-[linear-gradient(160deg,#ffffff,#f0fdf4,#f0f9ff)] p-8 shadow-[0_24px_56px_rgba(16,185,129,0.08)]">
              {isEditing && onSaveSection && (
                <SectionEditBar sectionName="Events" onSave={() => onSaveSection('events', {
                  templateFourEventsTitle: cmsContent.templateFourEventsTitle,
                  templateFourEventsDescription: cmsContent.templateFourEventsDescription,
                  templateFourEvents: cmsContent.templateFourEvents,
                })} isSaving={isSaving} />
              )}
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Events</p>
                <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{renderField(cmsContent.templateFourEventsTitle, 'templateFourEventsTitle', 'font-serif text-4xl font-semibold text-stone-950 bg-transparent border-none', false, 'Events title')}</h2>
                <p className="mt-4 text-base leading-7 text-stone-600">{renderField(cmsContent.templateFourEventsDescription, 'templateFourEventsDescription', 'text-base leading-7 text-stone-600 bg-transparent border-none', true, 'Events description')}</p>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                <InlineArrayEditor
                  items={cmsContent.templateFourEvents}
                  isEditing={isEditing}
                  onChange={(items) => onArrayChange?.('templateFourEvents', items)}
                  newItemDefaults={{ title: '', detail: '' }}
                  addLabel="Add Event"
                  emptyLabel="No events yet"
                  renderItem={(item, index, isEditingItem, onItemFieldChange) => (
                    <div className="rounded-[1.8rem] border border-stone-200 bg-white p-6 shadow-sm">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                        <CalendarRange className="h-5 w-5" />
                      </div>
                      {isEditingItem ? (
                        <>
                          <InlineEditField value={item.title} onChange={(v) => onItemFieldChange('title', v)} isEditing={isEditingItem} className="mt-5 font-serif text-2xl font-semibold text-stone-950 bg-transparent border-none" placeholder="Event title" />
                          <InlineEditField value={item.detail} onChange={(v) => onItemFieldChange('detail', v)} isEditing={isEditingItem} multiline rows={3} className="mt-3 text-sm leading-6 text-stone-600 bg-transparent border-none" placeholder="Event details..." />
                        </>
                      ) : (
                        <>
                          <h3 className="mt-5 font-serif text-2xl font-semibold text-stone-950">{item.title}</h3>
                          <p className="mt-3 text-sm leading-6 text-stone-600">{item.detail}</p>
                        </>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>
          </section>

          <section id="admissions" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <div className="rounded-[2.3rem] border border-violet-200 bg-[linear-gradient(145deg,#fff7ff,#eef2ff,#f0f4ff)] p-8 shadow-[0_24px_56px_rgba(139,92,246,0.08)]">
              {isEditing && onSaveSection && (
                <SectionEditBar sectionName="Admissions" onSave={() => onSaveSection('admissions', {
                  admissionsEyebrow: cmsContent.admissionsEyebrow,
                  admissionsTitle: cmsContent.admissionsTitle,
                  admissionsDescription: cmsContent.admissionsDescription,
                })} isSaving={isSaving} />
              )}
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-700">{cmsContent.navAdmissions}</p>
                  <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{renderField(cmsContent.admissionsTitle, 'admissionsTitle', 'font-serif text-4xl font-semibold text-stone-950 bg-transparent border-none', false, 'Admissions title')}</h2>
                  <p className="mt-4 text-base leading-7 text-stone-600">{renderField(cmsContent.admissionsDescription, 'admissionsDescription', 'text-base leading-7 text-stone-600 bg-transparent border-none', true, 'Admissions description')}</p>
                </div>

                <div className="rounded-[1.8rem] border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="space-y-4 text-sm text-stone-600">
                    <div className="flex items-start gap-3">
                      <Users2 className="mt-0.5 h-5 w-5 text-violet-700" />
                      <p>{cmsContent.admissionsPointOne}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Star className="mt-0.5 h-5 w-5 text-violet-700" />
                      <p>{cmsContent.admissionsPointTwo}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link href="/admissions/apply" className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#1e3a5f,#1d4ed8,#2563EB)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105">
                      {cmsContent.admissionsFormTitle}
                    </Link>
                    <a href={`mailto:${cmsContent.admissionsEmail}`} className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-stone-50 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-100">
                      {cmsContent.admissionsContactButton}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="contact" className="mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8 lg:px-10">
            <div className="rounded-[2.3rem] border border-rose-200 bg-[linear-gradient(160deg,#ffffff,#fff1f2,#f0f9ff)] p-8 shadow-[0_24px_56px_rgba(244,63,94,0.08)]">
              {isEditing && onSaveSection && (
                <SectionEditBar sectionName="Contact" onSave={() => onSaveSection('contact', {
                  templateFourContactTitle: cmsContent.templateFourContactTitle,
                  templateFourContactDescription: cmsContent.templateFourContactDescription,
                  templateFourContactItems: cmsContent.templateFourContactItems,
                })} isSaving={isSaving} />
              )}
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-700">{cmsContent.navContact}</p>
                <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{renderField(cmsContent.templateFourContactTitle, 'templateFourContactTitle', 'font-serif text-4xl font-semibold text-stone-950 bg-transparent border-none', false, 'Contact title')}</h2>
                <p className="mt-4 text-base leading-7 text-stone-600">{renderField(cmsContent.templateFourContactDescription, 'templateFourContactDescription', 'text-base leading-7 text-stone-600 bg-transparent border-none', true, 'Contact description')}</p>
              </div>

              <div className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="flex flex-col gap-5">
                  <InlineArrayEditor
                    items={cmsContent.templateFourContactItems}
                    isEditing={isEditing}
                    onChange={(items) => onArrayChange?.('templateFourContactItems', items)}
                    newItemDefaults={{ title: '', value: '', description: '' }}
                    addLabel="Add Contact Item"
                    emptyLabel="No contact items yet"
                    renderItem={(item, index, isEditingItem, onItemFieldChange) => {
                      const Icon = contactIcons[index] || Mail;
                      return (
                        <div className="rounded-[1.8rem] border border-stone-200 bg-white p-6 shadow-sm">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-800">
                            <Icon className="h-5 w-5" />
                          </div>
                          {isEditingItem ? (
                            <>
                              <InlineEditField value={item.title} onChange={(v) => onItemFieldChange('title', v)} isEditing={isEditingItem} className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 bg-transparent border-none" placeholder="Contact label" />
                              <InlineEditField value={item.value} onChange={(v) => onItemFieldChange('value', v)} isEditing={isEditingItem} className="mt-3 font-serif text-2xl font-semibold text-stone-950 bg-transparent border-none" placeholder="Contact value" />
                              <InlineEditField value={item.description} onChange={(v) => onItemFieldChange('description', v)} isEditing={isEditingItem} multiline rows={3} className="mt-3 text-sm leading-6 text-stone-600 bg-transparent border-none" placeholder="Contact description..." />
                            </>
                          ) : (
                            <>
                              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{item.title}</p>
                              <p className="mt-3 font-serif text-2xl font-semibold text-stone-950">{item.value}</p>
                              <p className="mt-3 text-sm leading-6 text-stone-600">{item.description}</p>
                            </>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>

                <div className="overflow-hidden rounded-[1.8rem] border border-stone-200 bg-white p-3 shadow-sm">
                  <iframe
                    src={cmsContent.templateFourMapEmbedUrl}
                    title={`${cmsContent.brandName} map`}
                    className="h-[24rem] w-full rounded-[1.2rem] border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
