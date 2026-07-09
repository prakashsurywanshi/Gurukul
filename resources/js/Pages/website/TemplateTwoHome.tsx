import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  ChevronRight,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Users,
} from 'lucide-react';
import { WebsiteContent, websiteThemes } from '../../utils/websiteCmsContent';
import { Button } from '../ui/button';
import TopWebsite3DImageSlider from './TopWebsite3DImageSlider';

interface TemplateTwoHomeProps {
  cmsContent: WebsiteContent;
}

const contactIcons = [Mail, Phone, MapPin];

export default function TemplateTwoHome({ cmsContent }: TemplateTwoHomeProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const theme = websiteThemes[cmsContent.theme];
  const isLightTheme = cmsContent.theme === 'white';
  const pageTextClass = isLightTheme ? 'text-slate-900' : 'text-white';
  const headingTextClass = isLightTheme ? 'text-slate-950' : 'text-white';
  const bodyTextClass = isLightTheme ? 'text-slate-600' : 'text-slate-300';
  const softTextClass = isLightTheme ? 'text-slate-500' : 'text-slate-400';
  const accentTextClass = isLightTheme ? 'text-sky-700' : 'text-cyan-200';
  const altAccentTextClass = isLightTheme ? 'text-fuchsia-700' : 'text-fuchsia-200';
  const shellGlowLeft = isLightTheme ? 'bg-sky-300/30' : 'bg-cyan-400/20';
  const shellGlowRight = isLightTheme ? 'bg-pink-300/30' : 'bg-fuchsia-500/20';
  const glassBorderClass = isLightTheme ? 'border-slate-200/80' : 'border-white/10';
  const softPanelClass = isLightTheme
    ? 'bg-white/88 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl'
    : 'bg-white/8 shadow-[0_24px_60px_rgba(3,8,20,0.2)] backdrop-blur-xl';
  const surfacePanelClass = isLightTheme
    ? 'bg-[linear-gradient(160deg,rgba(255,255,255,0.95),rgba(239,246,255,0.94),rgba(255,251,235,0.92))]'
    : 'bg-[linear-gradient(145deg,rgba(15,23,42,0.94),rgba(91,33,182,0.22),rgba(14,165,233,0.12),rgba(15,23,42,0.96))]';
  const navShellClass = isLightTheme
    ? 'border-slate-200/80 bg-white/85 text-slate-700'
    : 'border-white/12 bg-white/6 text-slate-200';
  const secondaryButtonClass = isLightTheme
    ? 'border-slate-200 bg-white/90 text-slate-900 hover:border-slate-300 hover:bg-white'
    : 'border-white/15 bg-white/6 text-white hover:border-white/30 hover:bg-white/10';
  const badgeClass = isLightTheme
    ? 'border-sky-200 bg-white/90 text-sky-800 shadow-[0_14px_36px_rgba(59,130,246,0.12)]'
    : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_14px_36px_rgba(34,211,238,0.14)]';
  const totalSlides = cmsContent.templateTwoSlides.length;

  useEffect(() => {
    if (totalSlides <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % totalSlides);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [totalSlides]);

  return (
    <>
      <Head title={`${cmsContent.seoTitle} | Template 2`} />

      <div className={`min-h-screen overflow-x-hidden ${pageTextClass} ${theme.pageBackground}`}>
        <div className="relative isolate">
          <div className={`absolute inset-0 -z-20 ${theme.ambientBackground}`} />
          <div className={`absolute left-[8%] top-20 -z-10 h-52 w-52 rounded-full blur-3xl ${shellGlowLeft}`} />
          <div className={`absolute right-[10%] top-16 -z-10 h-72 w-72 rounded-full blur-3xl ${shellGlowRight}`} />
          <div className={`absolute inset-x-0 top-0 -z-10 h-[42rem] ${isLightTheme ? 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.78),transparent_52%)]' : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_52%)]'}`} />

          <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
            <Link href="/" className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 bg-white/92 shadow-[0_22px_48px_rgba(37,99,235,0.12)]' : 'border-white/15 bg-white/10 shadow-[0_22px_48px_rgba(34,211,238,0.2)]'}`}>
                {cmsContent.brandLogo ? (
                  <img src={cmsContent.brandLogo} alt={`${cmsContent.brandName} logo`} className="max-h-full max-w-full object-contain p-1" />
                ) : (
                  <GraduationCap className={`h-6 w-6 ${isLightTheme ? 'text-sky-700' : 'text-cyan-100'}`} />
                )}
              </div>
              <div>
                <p className={`text-lg font-black uppercase tracking-[0.16em] ${headingTextClass}`}>{cmsContent.brandName}</p>
                <p className={`text-xs uppercase tracking-[0.28em] ${isLightTheme ? 'text-slate-500' : 'text-cyan-100/75'}`}>{cmsContent.brandSubtitle}</p>
              </div>
            </Link>

            <nav className={`hidden items-center gap-7 rounded-full border px-6 py-3 text-sm font-semibold backdrop-blur-xl lg:flex ${navShellClass}`}>
              <a href="#about" className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}>{cmsContent.navAbout}</a>
              <Link href="/admissions/apply" className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}>{cmsContent.navAdmissions}</Link>
              <a href="#gallery" className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}>{cmsContent.navGallery}</a>
              <a href="#contact" className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}>{cmsContent.navContact}</a>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${secondaryButtonClass}`}
              >
                {cmsContent.loginLabel}
              </Link>
              <Link
                href="/admissions/apply"
                className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#a78bfa,#f9a8d4)] px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(103,232,249,0.25)] transition hover:scale-[1.02]"
              >
                {cmsContent.applyNowLabel}
              </Link>
            </div>
          </header>

          <main>
            <TopWebsite3DImageSlider slides={cmsContent.templateTwoSlides} sliderImages={cmsContent.sliderImages} isLightTheme={isLightTheme} />

            <section className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-10 lg:pt-14">
              <div className="max-w-2xl">
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${badgeClass}`}>
                  <Sparkles className="h-4 w-4" />
                  {cmsContent.templateTwoHeroEyebrow}
                </div>

                <h1 className={`mt-7 text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl ${headingTextClass}`}>
                  {cmsContent.templateTwoHeroTitle}
                </h1>

                <p className={`mt-6 max-w-xl text-lg leading-8 sm:text-xl ${bodyTextClass}`}>
                  {cmsContent.templateTwoHeroDescription}
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <a
                    href="#gallery"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#67e8f9,#60a5fa)] px-6 py-3.5 text-base font-semibold text-slate-950 shadow-[0_18px_48px_rgba(34,211,238,0.28)] transition hover:scale-[1.02]"
                  >
                    {cmsContent.templateTwoHeroPrimaryCta}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <Link
                    href="/admissions/apply"
                    className={`inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-base font-semibold backdrop-blur-xl transition ${secondaryButtonClass}`}
                  >
                    {cmsContent.templateTwoHeroSecondaryCta}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  {cmsContent.highlights.slice(0, 4).map((item, index) => (
                    <div
                      key={item.label}
                      className={`rounded-[1.75rem] border p-5 transition hover:-translate-y-1 ${glassBorderClass} ${softPanelClass} ${
                        index % 2 === 0 ? 'lg:translate-x-4' : ''
                      }`}
                    >
                      <p className={`text-3xl font-black ${headingTextClass}`}>{item.value}</p>
                      <p className={`mt-2 text-sm font-medium ${bodyTextClass}`}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[38rem] [perspective:2200px]">
                <div className={`absolute left-12 top-8 h-28 w-28 rounded-[2rem] border backdrop-blur-xl animate-[float_7s_ease-in-out_infinite] ${isLightTheme ? 'border-slate-200/80 bg-white/85 shadow-[0_20px_60px_rgba(37,99,235,0.12)]' : 'border-white/10 bg-white/6 shadow-[0_20px_60px_rgba(14,165,233,0.16)]'}`} />
                <div className={`absolute right-6 top-10 h-24 w-24 rounded-full border blur-sm animate-[float_9s_ease-in-out_infinite] ${isLightTheme ? 'border-pink-200/70 bg-pink-200/40' : 'border-fuchsia-300/20 bg-fuchsia-400/10'}`} />
                <div className={`absolute bottom-10 left-16 h-36 w-36 rounded-full blur-3xl ${isLightTheme ? 'bg-sky-300/20' : 'bg-cyan-400/10'}`} />

                <div className="absolute inset-0 flex items-center justify-center">
                  {cmsContent.templateTwoSlides.map((slide, index) => {
                    const offset = index - activeSlide;
                    const wrappedOffset =
                      offset < -Math.floor(totalSlides / 2)
                        ? offset + totalSlides
                        : offset > Math.floor(totalSlides / 2)
                          ? offset - totalSlides
                          : offset;
                    const isActive = wrappedOffset === 0;

                    return (
                      <button
                        key={`${slide.title}-${index}`}
                        type="button"
                        onClick={() => setActiveSlide(index)}
                        className="absolute h-[30rem] w-full max-w-[21rem] rounded-[2rem] text-left transition duration-700 ease-out"
                        style={{
                          transform: `translateX(${wrappedOffset * 22}%) translateZ(${isActive ? 120 : -140}px) rotateY(${wrappedOffset * -32}deg) rotateX(${isActive ? 6 : 12}deg) translateY(${Math.abs(wrappedOffset) * 18}px) scale(${isActive ? 1 : 0.88})`,
                          opacity: Math.abs(wrappedOffset) > 2 ? 0 : 1,
                          zIndex: totalSlides - Math.abs(wrappedOffset),
                        }}
                      >
                        <div className={`relative h-full overflow-hidden rounded-[2rem] border p-6 shadow-[0_35px_90px_rgba(3,8,20,0.34)] backdrop-blur-2xl ${isLightTheme ? 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.94),rgba(255,251,235,0.92))]' : 'border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(37,99,235,0.28),rgba(15,23,42,0.92))]'}`}>
                          <div className={`absolute inset-0 ${isLightTheme ? 'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.12),transparent_36%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.2),transparent_36%)]'}`} />
                          <div className="relative flex h-full flex-col justify-between">
                            <div>
                              <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${badgeClass}`}>
                                {slide.eyebrow}
                              </div>
                              <h2 className={`mt-5 text-3xl font-black leading-tight ${headingTextClass}`}>{slide.title}</h2>
                              <p className={`mt-4 text-sm leading-7 ${bodyTextClass}`}>{slide.description}</p>
                            </div>
                            <div className="space-y-4">
                              <div className={`rounded-[1.5rem] border p-4 backdrop-blur-xl ${glassBorderClass} ${softPanelClass}`}>
                                <p className={`text-xs uppercase tracking-[0.26em] ${softTextClass}`}>
                                  {cmsContent.templateTwoHeroFloatingLabel}
                                </p>
                                <p className={`mt-2 text-2xl font-bold ${headingTextClass}`}>{slide.metric}</p>
                              </div>
                              <div className={`h-2 overflow-hidden rounded-full ${isLightTheme ? 'bg-slate-200' : 'bg-white/10'}`}>
                                <div
                                  className="h-full rounded-full bg-[linear-gradient(90deg,#67e8f9,#a78bfa,#f9a8d4)] transition-all duration-700"
                                  style={{ width: `${((index + 1) / totalSlides) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-3">
                  {cmsContent.templateTwoSlides.map((slide, index) => (
                    <button
                      key={slide.title}
                      type="button"
                      onClick={() => setActiveSlide(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        activeSlide === index ? 'w-12 bg-cyan-300' : isLightTheme ? 'w-3 bg-slate-300' : 'w-3 bg-white/30'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section id="about" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className={`rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(3,8,20,0.18)] backdrop-blur-2xl ${glassBorderClass} ${isLightTheme ? 'bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(239,246,255,0.94),rgba(255,251,235,0.9))]' : 'bg-[linear-gradient(145deg,rgba(15,23,42,0.82),rgba(37,99,235,0.22),rgba(15,23,42,0.92))]'}`}>
                  <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${accentTextClass}`}>
                    {cmsContent.templateTwoAboutEyebrow}
                  </p>
                  <h2 className={`mt-4 text-4xl font-black tracking-tight ${headingTextClass}`}>{cmsContent.templateTwoAboutTitle}</h2>
                  <p className={`mt-5 text-base leading-7 ${bodyTextClass}`}>{cmsContent.templateTwoAboutDescription}</p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  {cmsContent.templateTwoAboutCards.map((item, index) => (
                    <div
                      key={item.title}
                      className={`rounded-[1.85rem] border p-6 backdrop-blur-2xl transition hover:-translate-y-2 ${glassBorderClass} ${softPanelClass}`}
                      style={{
                        transform: `perspective(1200px) rotateY(${index === 1 ? 0 : index === 0 ? -8 : 8}deg)`,
                      }}
                    >
                      <div className="h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,#67e8f9,#f9a8d4)]" />
                      <h3 className={`mt-5 text-xl font-bold ${headingTextClass}`}>{item.title}</h3>
                      <p className={`mt-3 text-sm leading-7 ${bodyTextClass}`}>{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="gallery" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
              <div className="max-w-3xl">
                <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${altAccentTextClass}`}>
                  {cmsContent.templateTwoGalleryEyebrow}
                </p>
                <h2 className={`mt-4 text-4xl font-black tracking-tight ${headingTextClass}`}>{cmsContent.templateTwoGalleryTitle}</h2>
                <p className={`mt-4 text-base leading-7 ${bodyTextClass}`}>{cmsContent.templateTwoGalleryDescription}</p>
              </div>

              <div className="mt-10 grid auto-rows-[12rem] gap-5 md:grid-cols-2 xl:grid-cols-3">
                {cmsContent.templateTwoGalleryItems.map((item, index) => (
                  <article
                    key={item.title}
                    className={`group relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_28px_70px_rgba(3,8,20,0.18)] backdrop-blur-2xl transition duration-500 hover:-translate-y-2 hover:rotate-[0.5deg] ${glassBorderClass} ${isLightTheme ? 'bg-[linear-gradient(160deg,rgba(255,255,255,0.95),rgba(239,246,255,0.92),rgba(255,251,235,0.88))]' : 'bg-[linear-gradient(160deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))]'} ${
                      index % 3 === 0 ? 'md:row-span-2' : ''
                    }`}
                  >
                    <div className={`absolute inset-0 opacity-70 transition group-hover:opacity-100 ${isLightTheme ? 'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.1),transparent_36%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.12),transparent_36%)]'}`} />
                    <div className="relative flex h-full flex-col justify-between">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${accentTextClass}`}>{item.category}</p>
                        <h3 className={`mt-3 text-2xl font-bold ${headingTextClass}`}>{item.title}</h3>
                      </div>
                      <p className={`max-w-sm text-sm leading-7 ${bodyTextClass}`}>{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
              <div className={`rounded-[2.25rem] border px-6 py-10 shadow-[0_38px_100px_rgba(3,8,20,0.2)] backdrop-blur-2xl sm:px-10 ${glassBorderClass} ${isLightTheme ? 'bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(239,246,255,0.94),rgba(255,251,235,0.9),rgba(255,255,255,0.98))]' : 'bg-[linear-gradient(145deg,rgba(15,23,42,0.94),rgba(29,78,216,0.26),rgba(168,85,247,0.12),rgba(15,23,42,0.96))]'}`}>
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                  <div>
                    <p className={`text-sm font-semibold uppercase tracking-[0.32em] ${accentTextClass}`}>{cmsContent.admissionsEyebrow}</p>
                    <h2 className={`mt-4 text-4xl font-black tracking-tight ${headingTextClass}`}>{cmsContent.admissionsTitle}</h2>
                    <p className={`mt-4 max-w-2xl text-base leading-7 ${bodyTextClass}`}>
                      {cmsContent.admissionsDescription}
                    </p>
                  </div>

                  <div className={`rounded-[1.8rem] border p-6 backdrop-blur-2xl ${glassBorderClass} ${softPanelClass}`}>
                    <div className={`space-y-4 text-sm ${isLightTheme ? 'text-slate-700' : 'text-slate-200'}`}>
                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-5 w-5 text-amber-300" />
                        <p>{cmsContent.admissionsPointOne}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Award className="mt-0.5 h-5 w-5 text-amber-300" />
                        <p>{cmsContent.admissionsPointTwo}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Link href="/admissions/apply" className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#f9a8d4)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(103,232,249,0.24)] transition hover:scale-[1.02]">
                        {cmsContent.admissionsFormTitle}
                      </Link>
                      <Link
                        href="/login"
                        className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition ${secondaryButtonClass}`}
                      >
                        {cmsContent.admissionsPortalButton}
                      </Link>
                    </div>
                  </div>

                  <div className={`rounded-[1.8rem] border p-6 shadow-[0_25px_70px_rgba(0,0,0,0.12)] backdrop-blur-2xl ${glassBorderClass} ${softPanelClass}`}>
                    <h3 className={`text-2xl font-bold ${headingTextClass}`}>{cmsContent.admissionsFormTitle}</h3>
                    <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>{cmsContent.admissionsFormIntro}</p>
                    <p className={`mt-4 text-sm leading-6 ${bodyTextClass}`}>
                      The form now lives on a dedicated admissions page for a cleaner public homepage and a more focused enquiry experience.
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Link href="/admissions/apply" className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#a78bfa,#f9a8d4)] px-5 py-3 text-sm font-semibold text-slate-950 hover:brightness-110">
                        Open Admission Form
                      </Link>
                      <a href={`mailto:${cmsContent.admissionsEmail}`} className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition ${secondaryButtonClass}`}>
                        Email Admissions
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="contact" className="mx-auto max-w-7xl px-5 pb-24 pt-6 sm:px-8 lg:px-10">
              <div className={`rounded-[2.25rem] border px-6 py-10 shadow-[0_38px_100px_rgba(3,8,20,0.2)] backdrop-blur-2xl sm:px-10 ${glassBorderClass} ${surfacePanelClass}`}>
                <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                  <div>
                    <p className={`text-sm font-semibold uppercase tracking-[0.32em] ${accentTextClass}`}>
                      {cmsContent.templateTwoContactEyebrow}
                    </p>
                    <h2 className={`mt-4 text-4xl font-black tracking-tight ${headingTextClass}`}>{cmsContent.templateTwoContactTitle}</h2>
                    <p className={`mt-4 max-w-2xl text-base leading-7 ${bodyTextClass}`}>
                      {cmsContent.templateTwoContactDescription}
                    </p>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                      <a
                        href={`mailto:${cmsContent.admissionsEmail}`}
                        className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#f9a8d4)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(103,232,249,0.24)] transition hover:scale-[1.02]"
                      >
                        {cmsContent.templateTwoContactPrimaryCta}
                      </a>
                      <Link
                        href="/login"
                        className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition ${secondaryButtonClass}`}
                      >
                        {cmsContent.templateTwoContactSecondaryCta}
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {cmsContent.templateTwoContactItems.map((item, index) => {
                      const Icon = contactIcons[index] || Mail;

                      return (
                        <div
                          key={item.title}
                          className={`rounded-[1.7rem] border p-5 backdrop-blur-xl transition hover:-translate-y-1 ${glassBorderClass} ${softPanelClass}`}
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#67e8f9,#a78bfa)] text-slate-950 shadow-[0_14px_30px_rgba(103,232,249,0.22)]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <p className={`mt-5 text-sm font-semibold uppercase tracking-[0.22em] ${softTextClass}`}>{item.title}</p>
                          <p className={`mt-3 text-lg font-bold ${headingTextClass}`}>{item.value}</p>
                          <p className={`mt-3 text-sm leading-7 ${bodyTextClass}`}>{item.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
