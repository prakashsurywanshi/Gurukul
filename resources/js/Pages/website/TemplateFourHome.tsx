import { Head, Link } from '@inertiajs/react';
import { BookOpen, CalendarRange, GraduationCap, Image as ImageIcon, Mail, MapPin, Phone, Sparkles, Star, Users2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WebsiteContent } from '../../utils/websiteCmsContent';

interface TemplateFourHomeProps {
  cmsContent: WebsiteContent;
}

const highlightPalette = [
  'border-rose-200 bg-rose-50/90',
  'border-amber-200 bg-amber-50/90',
  'border-sky-200 bg-sky-50/90',
];

const aboutIcons = [BookOpen, Star, Users2];
const contactIcons = [Phone, Mail, MapPin];

export default function TemplateFourHome({ cmsContent }: TemplateFourHomeProps) {
  const heroImage = cmsContent.sliderImages[0] ?? null;
  const galleryImages = cmsContent.sliderImages.length > 0
    ? cmsContent.sliderImages
    : Array.from({ length: 4 }, () => null);
  const navItems = [
    { href: '#about', label: cmsContent.navAbout },
    { href: '#gallery', label: cmsContent.navGallery },
    { href: '#events', label: 'Events' },
    { href: '#admissions', label: cmsContent.navAdmissions },
    { href: '#contact', label: cmsContent.navContact },
  ] as const;
  const [activeTab, setActiveTab] = useState<(typeof navItems)[number]['href']>('#about');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const allowedHashes = new Set(navItems.map((item) => item.href));

    const syncActiveTab = () => {
      const currentHash = window.location.hash as (typeof navItems)[number]['href'];
      setActiveTab(allowedHashes.has(currentHash) ? currentHash : '#about');
    };

    syncActiveTab();
    window.addEventListener('hashchange', syncActiveTab);

    return () => window.removeEventListener('hashchange', syncActiveTab);
  }, [navItems]);

  return (
    <>
      <Head title={`${cmsContent.seoTitle} | Template 4`} />

      <div className="min-h-screen bg-[linear-gradient(180deg,#fff8ef_0%,#fffdf8_22%,#f6f1e6_52%,#edf4ff_100%)] text-stone-900">
        <div className="border-b border-amber-200/70 bg-[linear-gradient(90deg,#7c2d12,#b45309,#1d4ed8)] text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm sm:px-8 lg:px-10">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4" />{cmsContent.templateFourTopPhone}</span>
              <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4" />{cmsContent.templateFourTopEmail}</span>
            </div>
            <div className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{cmsContent.templateFourTopAddress}</div>
          </div>
        </div>

        <header className="sticky top-0 z-20 border-b border-amber-200/70 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:flex-nowrap lg:px-10">
            <Link href="/" className="flex min-w-0 shrink-0 items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-amber-300 text-amber-900 shadow-[0_16px_36px_rgba(180,83,9,0.14)] ${cmsContent.brandLogo ? 'bg-white' : 'bg-[linear-gradient(135deg,#fff7ed,#fde68a)]'}`}>
                {cmsContent.brandLogo ? (
                  <img src={cmsContent.brandLogo} alt={`${cmsContent.brandName} logo`} className="max-h-full max-w-full object-contain p-1" />
                ) : (
                  <GraduationCap className="h-7 w-7" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-serif text-2xl font-semibold tracking-[0.08em] text-stone-950">{cmsContent.brandName}</p>
                <p className="truncate text-xs uppercase tracking-[0.32em] text-stone-500">{cmsContent.brandSubtitle}</p>
              </div>
            </Link>

            <nav className="order-3 flex w-full flex-wrap justify-center gap-3 lg:order-none lg:w-auto lg:flex-1 lg:flex-nowrap">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setActiveTab(item.href)}
                  className={`inline-flex rounded-full border px-5 py-2.5 text-sm font-semibold shadow-sm transition ${
                    activeTab === item.href
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-3">
              <Link href="/login" className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-50">
                {cmsContent.loginLabel}
              </Link>
              <Link href="/admissions/apply" className="rounded-full bg-[linear-gradient(135deg,#7c2d12,#c2410c,#f59e0b)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(194,65,12,0.22)] transition hover:brightness-105">
                {cmsContent.applyNowLabel}
              </Link>
            </div>
          </div>
        </header>

        <main>
          <section className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_0.95fr] lg:px-10 lg:py-14">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm">
                <Sparkles className="h-4 w-4" />
                {cmsContent.templateFourHeroEyebrow}
              </div>
              <h1 className="mt-7 font-serif text-5xl font-semibold leading-[0.95] text-stone-950 sm:text-6xl">
                {cmsContent.templateFourHeroTitle}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">{cmsContent.templateFourHeroDescription}</p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a href="#about" className="inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3.5 text-base font-semibold text-white shadow-[0_20px_40px_rgba(28,25,23,0.18)] transition hover:brightness-110">
                  {cmsContent.templateFourHeroPrimaryCta}
                </a>
                <Link href="/admissions/apply" className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-6 py-3.5 text-base font-semibold text-amber-900 transition hover:bg-amber-100">
                  {cmsContent.templateFourHeroSecondaryCta}
                </Link>
              </div>

              <div className="mt-8 rounded-[2rem] border border-amber-200 bg-[linear-gradient(135deg,#fff7ed,#fef3c7)] p-5 shadow-[0_20px_46px_rgba(180,83,9,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-800">{cmsContent.templateFourNoticeLabel}</p>
                <p className="mt-3 text-base leading-7 text-stone-700">{cmsContent.templateFourNoticeText}</p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {cmsContent.highlights.slice(0, 3).map((item, index) => (
                  <div key={item.label} className={`rounded-[1.75rem] border p-5 shadow-sm ${highlightPalette[index % highlightPalette.length]}`}>
                    <p className="font-serif text-3xl font-semibold text-stone-950">{item.value}</p>
                    <p className="mt-2 text-sm font-medium text-stone-600">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[2.6rem] border border-white/70 bg-white/60 p-4 shadow-[0_35px_80px_rgba(28,25,23,0.12)] backdrop-blur-2xl">
                <div className="relative overflow-hidden rounded-[2rem]">
                  {heroImage ? (
                    <img src={heroImage} alt={cmsContent.brandName} className="h-[28rem] w-full object-cover sm:h-[36rem]" />
                  ) : (
                    <div className="h-[28rem] bg-[linear-gradient(135deg,#fed7aa,#fde68a,#bfdbfe)] sm:h-[36rem]" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.06),rgba(12,10,9,0.5))]" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="rounded-[1.7rem] bg-white/88 p-5 text-stone-900 shadow-xl backdrop-blur-xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-800">{cmsContent.admissionsEyebrow}</p>
                      <h2 className="mt-3 font-serif text-2xl font-semibold">{cmsContent.admissionsTitle}</h2>
                      <p className="mt-3 text-sm leading-6 text-stone-600">{cmsContent.admissionsDescription}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="about" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <div className="rounded-[2.3rem] border border-amber-200 bg-white/88 p-8 shadow-[0_24px_56px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-800">{cmsContent.navAbout}</p>
                <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{cmsContent.templateFourAboutTitle}</h2>
                <p className="mt-4 text-base leading-7 text-stone-600">{cmsContent.templateFourAboutDescription}</p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {cmsContent.templateFourAboutCards.map((item, index) => {
                  const Icon = aboutIcons[index] || Sparkles;

                  return (
                    <div key={item.title} className="rounded-[1.8rem] border border-stone-200 bg-[linear-gradient(180deg,#ffffff,#fff8ef)] p-6 shadow-sm">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        index % 5 === 0
                          ? 'border border-rose-200 bg-rose-100 text-rose-800'
                          : index % 5 === 1
                            ? 'border border-amber-200 bg-amber-100 text-amber-900'
                            : index % 5 === 2
                              ? 'border border-emerald-200 bg-emerald-100 text-emerald-800'
                              : index % 5 === 3
                                ? 'border border-sky-200 bg-sky-100 text-sky-800'
                                : 'border border-violet-200 bg-violet-100 text-violet-800'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 font-serif text-2xl font-semibold text-stone-950">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-stone-600">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="gallery" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <div className="rounded-[2.3rem] border border-sky-200 bg-[linear-gradient(160deg,#ffffff,#eef6ff,#fff7ed)] p-8 shadow-[0_24px_56px_rgba(37,99,235,0.08)]">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">{cmsContent.navGallery}</p>
                <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{cmsContent.templateFourGalleryTitle}</h2>
                <p className="mt-4 text-base leading-7 text-stone-600">{cmsContent.templateFourGalleryDescription}</p>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                {cmsContent.templateFourGalleryItems.map((item, index) => (
                  <article key={item.title} className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-sm">
                    <div className="relative h-56 w-full">
                      {galleryImages[index % galleryImages.length] ? (
                        <img src={galleryImages[index % galleryImages.length] ?? ''} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-[linear-gradient(135deg,#fde68a,#fed7aa,#bfdbfe)]" />
                      )}
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.04),rgba(12,10,9,0.42))]" />
                      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-stone-800">
                        <ImageIcon className="h-3.5 w-3.5" />
                        {item.category}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-serif text-2xl font-semibold text-stone-950">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-stone-600">{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="events" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <div className="rounded-[2.3rem] border border-emerald-200 bg-[linear-gradient(160deg,#ffffff,#f0fdf4,#fff8ef)] p-8 shadow-[0_24px_56px_rgba(16,185,129,0.08)]">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Events</p>
                <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{cmsContent.templateFourEventsTitle}</h2>
                <p className="mt-4 text-base leading-7 text-stone-600">{cmsContent.templateFourEventsDescription}</p>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                {cmsContent.templateFourEvents.map((item) => (
                  <div key={item.title} className="rounded-[1.8rem] border border-stone-200 bg-white p-6 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                      <CalendarRange className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-serif text-2xl font-semibold text-stone-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-stone-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="admissions" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <div className="rounded-[2.3rem] border border-violet-200 bg-[linear-gradient(145deg,#fff7ff,#eef2ff,#fff8ef)] p-8 shadow-[0_24px_56px_rgba(139,92,246,0.08)]">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-700">{cmsContent.navAdmissions}</p>
                  <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{cmsContent.admissionsTitle}</h2>
                  <p className="mt-4 text-base leading-7 text-stone-600">{cmsContent.admissionsDescription}</p>
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
                    <Link href="/admissions/apply" className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c2d12,#c2410c,#f59e0b)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105">
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
            <div className="rounded-[2.3rem] border border-rose-200 bg-[linear-gradient(160deg,#ffffff,#fff1f2,#fff8ef)] p-8 shadow-[0_24px_56px_rgba(244,63,94,0.08)]">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-700">{cmsContent.navContact}</p>
                <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{cmsContent.templateFourContactTitle}</h2>
                <p className="mt-4 text-base leading-7 text-stone-600">{cmsContent.templateFourContactDescription}</p>
              </div>

              <div className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="flex flex-col gap-5">
                  {cmsContent.templateFourContactItems.map((item, index) => {
                    const Icon = contactIcons[index] || Mail;

                    return (
                      <div key={item.title} className="rounded-[1.8rem] border border-stone-200 bg-white p-6 shadow-sm">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-800">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{item.title}</p>
                        <p className="mt-3 font-serif text-2xl font-semibold text-stone-950">{item.value}</p>
                        <p className="mt-3 text-sm leading-6 text-stone-600">{item.description}</p>
                      </div>
                    );
                  })}
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
