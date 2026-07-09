import { Head, Link } from '@inertiajs/react';
import { useMemo } from 'react';
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
import { normalizeWebsiteContent, WebsiteContent, websiteThemes } from '../utils/websiteCmsContent';
import TemplateFourHome from './website/TemplateFourHome';
import TemplateTwoHome from './website/TemplateTwoHome';
import TemplateThreeHome from './website/TemplateThreeHome';
import TopWebsite3DImageSlider from './website/TopWebsite3DImageSlider';

const featureIcons = [BookOpen, FlaskConical, LibraryBig, Globe];
const pillarIcons = [ShieldCheck, Bus, Trophy, HeartHandshake];
const outcomeIcons = [Award, Rocket, Shield, Users];

interface HomeProps {
  websiteContent?: Partial<WebsiteContent> | null;
}

export default function Home({ websiteContent }: HomeProps) {
  const cmsContent = useMemo(() => normalizeWebsiteContent(websiteContent), [websiteContent]);
  const theme = websiteThemes[cmsContent.theme];
  const isLightTheme = cmsContent.theme === 'white';
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

  if (cmsContent.activeTemplate === 'template2') {
    return <TemplateTwoHome cmsContent={cmsContent} />;
  }

  if (cmsContent.activeTemplate === 'template3') {
    return <TemplateThreeHome cmsContent={cmsContent} />;
  }

  if (cmsContent.activeTemplate === 'template4') {
    return <TemplateFourHome cmsContent={cmsContent} />;
  }

  return (
    <>
      <Head title={cmsContent.seoTitle} />

      <div className={`min-h-screen ${pageTextClass} ${theme.pageBackground}`}>
        <div className="relative overflow-hidden">
          <div className={`absolute inset-0 -z-10 ${theme.ambientBackground}`} />
          <div className={`absolute left-[-8rem] top-24 -z-10 h-64 w-64 rounded-full blur-3xl ${theme.leftGlow}`} />
          <div className={`absolute right-[-6rem] top-12 -z-10 h-80 w-80 rounded-full blur-3xl ${theme.rightGlow}`} />
          <div className={`absolute inset-x-0 top-0 -z-10 h-[46rem] ${isLightTheme ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0))]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]'}`} />
          <div className={`absolute left-[10%] top-32 -z-10 h-40 w-40 rotate-12 rounded-[3rem] border blur-sm ${isLightTheme ? 'border-slate-200/70 bg-white/70' : 'border-white/10 bg-white/5'}`} />
          <div className={`absolute right-[14%] top-44 -z-10 h-24 w-24 rounded-full border ${isLightTheme ? 'border-slate-200/70 bg-white/80' : 'border-white/10 bg-white/5'}`} />

          <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
            <Link href="/" className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 bg-white/92 shadow-[0_18px_45px_rgba(37,99,235,0.12)]' : 'border-white/10 bg-white/10 shadow-[0_18px_45px_rgba(14,165,233,0.18)]'} ${theme.logoBadgeText}`}>
                {cmsContent.brandLogo ? (
                  <img src={cmsContent.brandLogo} alt={`${cmsContent.brandName} logo`} className="max-h-full max-w-full object-contain p-1" />
                ) : (
                  <GraduationCap className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className={`text-lg font-black tracking-[0.12em] uppercase ${headingTextClass}`}>{cmsContent.brandName}</p>
                <p className={`text-xs font-medium tracking-[0.3em] uppercase ${softTextClass}`}>{cmsContent.brandSubtitle}</p>
              </div>
            </Link>

            <nav className={`hidden items-center gap-8 rounded-full border px-6 py-3 text-sm font-semibold backdrop-blur-xl lg:flex ${isLightTheme ? 'border-slate-200/80 bg-white/85 text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'}`}>
              <a href="#about" className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}>{cmsContent.navAbout}</a>
              <a href="#programs" className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}>{cmsContent.navPrograms}</a>
              <a href="#campus" className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}>{cmsContent.navCampus}</a>
              <Link href="/admissions/apply" className={`transition ${isLightTheme ? 'hover:text-slate-950' : 'hover:text-white'}`}>{cmsContent.navAdmissions}</Link>
            </nav>

            <div className="flex items-center gap-3">
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
            <TopWebsite3DImageSlider slides={cmsContent.templateTwoSlides} sliderImages={cmsContent.sliderImages} isLightTheme={isLightTheme} />

            <section className="mx-auto grid max-w-7xl gap-14 px-5 pb-18 pt-8 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:pb-24 lg:pt-12">
              <div className="max-w-2xl">
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-xl ${theme.heroBadge}`}>
                  <Sparkles className="h-4 w-4" />
                  {cmsContent.heroBadge}
                </div>

                <h1 className={`mt-6 text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl ${headingTextClass}`}>
                  {cmsContent.heroTitleLineOne}
                  <span className={`block bg-clip-text text-transparent ${isLightTheme ? 'bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_45%,#f59e0b_100%)]' : 'bg-[linear-gradient(135deg,#67e8f9_0%,#f9a8d4_45%,#fde68a_100%)]'}`}>{cmsContent.heroTitleAccent}</span>
                </h1>

                <p className={`mt-6 max-w-xl text-lg leading-8 sm:text-xl ${bodyTextClass}`}>
                  {cmsContent.heroDescription}
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

                <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {cmsContent.highlights.map((item) => (
                    <div key={item.label} className={`rounded-3xl border p-5 ${borderClass} ${glassClass}`}>
                      <p className={`text-3xl font-black ${headingTextClass}`}>{item.value}</p>
                      <p className={`mt-2 text-sm font-medium ${bodyTextClass}`}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[34rem] [perspective:1400px]">
                <div className={`absolute right-8 top-2 h-40 w-40 rounded-[2.5rem] border blur-sm ${isLightTheme ? 'border-sky-200/80 bg-sky-200/50' : 'border-cyan-300/15 bg-cyan-300/10'}`} />
                <div className={`absolute left-6 top-14 h-24 w-24 rounded-[2rem] border ${isLightTheme ? 'border-amber-200/80 bg-amber-100/70' : 'border-fuchsia-300/15 bg-fuchsia-400/10'}`} />
                <div className={`absolute left-10 top-20 hidden h-28 w-28 rounded-[2rem] border shadow-xl backdrop-blur lg:block [transform:translateZ(40px)_rotate(-8deg)] ${isLightTheme ? 'border-slate-200/80 bg-white/85' : 'border-white/10 bg-white/6'}`} />
                <div className={`absolute right-0 top-12 h-[28rem] w-full max-w-[34rem] rounded-[2.2rem] border p-6 shadow-[0_40px_90px_rgba(3,8,20,0.12)] backdrop-blur-2xl [transform:rotateY(-16deg)_rotateX(10deg)] sm:p-8 ${isLightTheme ? 'border-slate-200/80 text-slate-900' : 'border-white/12 text-white'} ${theme.spotlightPanel}`}>
                  <div className={`absolute inset-4 rounded-[1.6rem] border ${isLightTheme ? 'border-slate-200/70 bg-[radial-gradient(circle_at_top_right,rgba(147,197,253,0.28),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(253,224,71,0.2),transparent_35%)]' : 'border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.14),transparent_35%)]'}`} />
                  <div className={`relative rounded-[1.5rem] border p-6 ${isLightTheme ? 'border-slate-200/80' : 'border-white/10'} ${theme.spotlightInner}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm uppercase tracking-[0.28em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}>{cmsContent.featureEyebrow}</p>
                        <h2 className="mt-3 text-3xl font-bold">{cmsContent.featureTitle}</h2>
                      </div>
                      <div className={`rounded-2xl border p-3 backdrop-blur ${isLightTheme ? 'border-slate-200 bg-white/85' : 'border-white/10 bg-white/10'}`}>
                        <Star className={`h-6 w-6 ${isLightTheme ? 'text-amber-500' : 'text-amber-200'}`} />
                      </div>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                      {cmsContent.features.map((feature, index) => {
                        const Icon = featureIcons[index] || BookOpen;

                        return (
                          <div key={feature.title} className={`rounded-[1.4rem] border p-5 shadow-[0_20px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 bg-white/88' : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.06))]'}`}>
                            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg ${theme.featureIcon}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                            <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>{feature.description}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className={`mt-6 rounded-[1.4rem] border p-5 backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80' : 'border-white/10'} ${theme.openHousePanel}`}>
                      <div className="flex items-center gap-3">
                        <CalendarDays className={`h-5 w-5 ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`} />
                        <p className="font-semibold">{cmsContent.openHouseLabel}</p>
                      </div>
                      <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>
                        {cmsContent.openHouseDescription}
                      </p>
                      <p className={`mt-3 text-base font-semibold ${headingTextClass}`}>{cmsContent.openHouseDate}</p>
                    </div>
                  </div>
                </div>
                <div className={`absolute bottom-4 left-0 hidden w-56 rounded-[1.6rem] border p-5 shadow-[0_25px_70px_rgba(0,0,0,0.14)] backdrop-blur-2xl lg:block [transform:translateZ(80px)_rotate(-8deg)] ${isLightTheme ? 'border-slate-200/80 text-slate-900' : 'border-white/12 text-white'} ${theme.liveOverviewCard}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${bodyTextClass}`}>Live Overview</p>
                  <p className="mt-3 text-3xl font-black">{cmsContent.liveOverviewValue}</p>
                  <p className={`mt-1 text-sm ${bodyTextClass}`}>{cmsContent.liveOverviewLabel}</p>
                </div>
              </div>
            </section>

            <section id="about" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className={`rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 text-slate-900' : 'border-white/10 text-white'} ${theme.aboutPanel}`}>
                  <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}>{cmsContent.aboutEyebrow}</p>
                  <h2 className={`mt-4 text-3xl font-bold ${headingTextClass}`}>{cmsContent.aboutTitle}</h2>
                  <p className={`mt-4 text-base leading-7 ${bodyTextClass}`}>
                    {cmsContent.aboutDescription}
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {cmsContent.pillars.map((pillar, index) => {
                    const Icon = pillarIcons[index] || ShieldCheck;

                    return (
                      <div key={pillar.title} className={`rounded-[2rem] border p-6 shadow-[0_25px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl transition hover:-translate-y-1 ${borderClass} ${glassClass}`}>
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${theme.pillarIcon}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className={`mt-5 text-xl font-bold ${headingTextClass}`}>{pillar.title}</h3>
                        <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>{pillar.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section id="programs" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
              <div className="max-w-3xl">
                <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}>{cmsContent.programsEyebrow}</p>
                <h2 className={`mt-3 text-4xl font-black tracking-tight ${headingTextClass}`}>{cmsContent.programsTitle}</h2>
                <p className={`mt-4 text-base leading-7 ${bodyTextClass}`}>
                  {cmsContent.programsDescription}
                </p>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-4">
                {cmsContent.programs.map((program, index) => (
                  <div
                    key={program.title}
                    className={`rounded-[2rem] border p-6 shadow-[0_28px_65px_rgba(0,0,0,0.12)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_35px_75px_rgba(0,0,0,0.16)] ${
                      index % 2 === 0
                        ? theme.programEven
                        : theme.programOdd
                    }`}
                  >
                    <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${softTextClass}`}>{program.age}</p>
                    <h3 className={`mt-4 text-2xl font-bold ${headingTextClass}`}>{program.title}</h3>
                    <p className={`mt-3 text-sm leading-7 ${bodyTextClass}`}>{program.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="campus" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
              <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
                <div className={`rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 text-slate-900' : 'border-white/10 text-white'} ${theme.campusPanel}`}>
                  <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-amber-600' : 'text-amber-200'}`}>{cmsContent.campusEyebrow}</p>
                  <h2 className="mt-4 text-4xl font-black tracking-tight">{cmsContent.campusTitle}</h2>
                  <p className={`mt-4 max-w-2xl text-base leading-7 ${bodyTextClass}`}>
                    {cmsContent.campusDescription}
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {cmsContent.campusStats.map((item) => (
                      <div key={item.label} className={`rounded-[1.5rem] border p-5 backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 bg-white/86' : 'border-white/10 bg-white/10'}`}>
                        <p className="text-3xl font-black">{item.value}</p>
                        <p className={`mt-2 text-sm font-medium ${bodyTextClass}`}>{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`rounded-[2rem] border p-8 shadow-[0_25px_65px_rgba(0,0,0,0.12)] backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80' : 'border-white/10'} ${theme.newsPanel}`}>
                  <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}>{cmsContent.newsEyebrow}</p>
                  <div className="mt-6 space-y-5">
                    {cmsContent.news.map((item) => (
                      <div key={item.title} className={`rounded-[1.5rem] border p-5 backdrop-blur ${isLightTheme ? 'border-slate-200/80 bg-white/90' : 'border-white/10 bg-white/6'}`}>
                        <h3 className={`text-lg font-bold ${headingTextClass}`}>{item.title}</h3>
                        <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
              <div className={`rounded-[2.25rem] border px-6 py-10 shadow-[0_35px_90px_rgba(0,0,0,0.12)] backdrop-blur-2xl sm:px-10 ${isLightTheme ? 'border-slate-200/80 text-slate-900' : 'border-white/10 text-white'} ${theme.admissionsPanel}`}>
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                  <div>
                    <p className={`text-sm font-semibold uppercase tracking-[0.32em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}>{cmsContent.admissionsEyebrow}</p>
                    <h2 className="mt-4 text-4xl font-black tracking-tight">{cmsContent.admissionsTitle}</h2>
                    <p className={`mt-4 max-w-2xl text-base leading-7 ${bodyTextClass}`}>
                      {cmsContent.admissionsDescription}
                    </p>
                  </div>

                  <div className={`rounded-[1.8rem] border p-6 backdrop-blur-2xl ${isLightTheme ? 'border-slate-200/80 bg-white/88' : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))]'}`}>
                    <div className={`space-y-4 text-sm ${isLightTheme ? 'text-slate-600' : 'text-slate-200'}`}>
                      <div className="flex items-start gap-3">
                        <Users className={`mt-0.5 h-5 w-5 ${isLightTheme ? 'text-amber-500' : 'text-amber-300'}`} />
                        <p>{cmsContent.admissionsPointOne}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Award className={`mt-0.5 h-5 w-5 ${isLightTheme ? 'text-amber-500' : 'text-amber-300'}`} />
                        <p>{cmsContent.admissionsPointTwo}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Link href="/admissions/apply" className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-110 ${theme.admissionsButton}`}>
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

                  <div className={`rounded-[1.8rem] border p-6 shadow-[0_25px_70px_rgba(0,0,0,0.12)] backdrop-blur-2xl ${isLightTheme ? 'border-slate-200/80 bg-white/92' : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))]'}`}>
                    <h3 className={`text-2xl font-bold ${headingTextClass}`}>{cmsContent.admissionsFormTitle}</h3>
                    <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>{cmsContent.admissionsFormIntro}</p>
                    <p className={`mt-4 text-sm leading-6 ${softTextClass}`}>
                      The admission form has been moved to a separate page so families can complete it without leaving the full homepage experience.
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Link href="/admissions/apply" className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-110 ${theme.admissionsFormButton}`}>
                        Open Admission Form
                      </Link>
                      <a href={`mailto:${cmsContent.admissionsEmail}`} className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition ${secondaryLinkClass}`}>
                        Email Admissions
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
              <div className="max-w-3xl">
                <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}>{cmsContent.outcomesEyebrow}</p>
                <h2 className={`mt-3 text-4xl font-black tracking-tight ${headingTextClass}`}>{cmsContent.outcomesTitle}</h2>
                <p className={`mt-4 text-base leading-7 ${bodyTextClass}`}>
                  {cmsContent.outcomesDescription}
                </p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {cmsContent.outcomes.map((item, index) => {
                  const Icon = outcomeIcons[index] || Award;

                  return (
                    <div
                      key={item.title}
                      className={`rounded-[2rem] border p-6 shadow-[0_25px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl ${borderClass} ${glassClass}`}
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${theme.pillarIcon}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className={`mt-5 text-xl font-bold ${headingTextClass}`}>{item.title}</h3>
                      <p className={`mt-3 text-sm leading-6 ${bodyTextClass}`}>{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className={`rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl ${borderClass} ${glassClass}`}>
                  <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}>{cmsContent.journeyEyebrow}</p>
                  <h2 className={`mt-4 text-4xl font-black tracking-tight ${headingTextClass}`}>{cmsContent.journeyTitle}</h2>
                  <p className={`mt-4 text-base leading-7 ${bodyTextClass}`}>
                    {cmsContent.journeyDescription}
                  </p>
                </div>

                <div className="grid gap-4">
                  {cmsContent.journeySteps.map((item) => (
                    <div
                      key={item.step}
                      className={`rounded-[2rem] border p-6 shadow-[0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-xl ${borderClass} ${glassClass}`}
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        <div className={`rounded-2xl px-4 py-2 text-lg font-black ${isLightTheme ? 'bg-sky-100 text-sky-800' : 'bg-white/10 text-cyan-100'}`}>{item.step}</div>
                        <h3 className={`text-xl font-bold ${headingTextClass}`}>{item.title}</h3>
                      </div>
                      <p className={`mt-4 text-sm leading-6 ${bodyTextClass}`}>{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className={`rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl ${borderClass} ${glassClass}`}>
                  <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}>{cmsContent.voicesEyebrow}</p>
                  <h2 className={`mt-4 text-4xl font-black tracking-tight ${headingTextClass}`}>{cmsContent.voicesTitle}</h2>

                  <div className="mt-8 grid gap-4">
                    {cmsContent.testimonials.map((item) => (
                      <div key={item.name} className={`rounded-[1.6rem] border p-5 backdrop-blur ${isLightTheme ? 'border-slate-200/80 bg-white/90' : 'border-white/10 bg-white/6'}`}>
                        <Quote className={`h-6 w-6 ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`} />
                        <p className={`mt-4 text-sm leading-7 ${isLightTheme ? 'text-slate-700' : 'text-slate-200'}`}>{item.quote}</p>
                        <div className="mt-5">
                          <p className={`font-semibold ${headingTextClass}`}>{item.name}</p>
                          <p className={`text-sm ${softTextClass}`}>{item.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`rounded-[2rem] border p-8 shadow-[0_25px_70px_rgba(0,0,0,0.12)] backdrop-blur-xl ${isLightTheme ? 'border-slate-200/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(255,251,235,0.92),rgba(255,255,255,0.9))]' : 'border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(16,185,129,0.08),rgba(255,255,255,0.03))]'}`}>
                  <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}>{cmsContent.visitEyebrow}</p>
                  <h2 className={`mt-4 text-4xl font-black tracking-tight ${headingTextClass}`}>{cmsContent.visitTitle}</h2>
                  <div className="mt-8 space-y-5">
                    <div className={`flex items-start gap-3 ${isLightTheme ? 'text-slate-700' : 'text-slate-200'}`}>
                      <MapPin className={`mt-1 h-5 w-5 ${isLightTheme ? 'text-amber-500' : 'text-amber-200'}`} />
                      <div>
                        <p className={`font-semibold ${headingTextClass}`}>{cmsContent.visitPointOneTitle}</p>
                        <p className={`mt-1 text-sm leading-6 ${bodyTextClass}`}>{cmsContent.visitPointOneText}</p>
                      </div>
                    </div>
                    <div className={`flex items-start gap-3 ${isLightTheme ? 'text-slate-700' : 'text-slate-200'}`}>
                      <CheckCircle2 className={`mt-1 h-5 w-5 ${isLightTheme ? 'text-amber-500' : 'text-amber-200'}`} />
                      <div>
                        <p className={`font-semibold ${headingTextClass}`}>{cmsContent.visitPointTwoTitle}</p>
                        <p className={`mt-1 text-sm leading-6 ${bodyTextClass}`}>{cmsContent.visitPointTwoText}</p>
                      </div>
                    </div>
                    <div className={`flex items-start gap-3 ${isLightTheme ? 'text-slate-700' : 'text-slate-200'}`}>
                      <Rocket className={`mt-1 h-5 w-5 ${isLightTheme ? 'text-amber-500' : 'text-amber-200'}`} />
                      <div>
                        <p className={`font-semibold ${headingTextClass}`}>{cmsContent.visitPointThreeTitle}</p>
                        <p className={`mt-1 text-sm leading-6 ${bodyTextClass}`}>{cmsContent.visitPointThreeText}</p>
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

            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
              <div className={`rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl ${borderClass} ${glassClass}`}>
                <div className="max-w-3xl">
                  <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${isLightTheme ? 'text-sky-700' : 'text-cyan-200'}`}>{cmsContent.faqEyebrow}</p>
                  <h2 className={`mt-4 text-4xl font-black tracking-tight ${headingTextClass}`}>{cmsContent.faqTitle}</h2>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-3">
                  {cmsContent.faqs.map((item) => (
                    <div key={item.question} className={`rounded-[1.6rem] border p-5 backdrop-blur ${isLightTheme ? 'border-slate-200/80 bg-white/90' : 'border-white/10 bg-white/6'}`}>
                      <p className={`text-lg font-bold ${headingTextClass}`}>{item.question}</p>
                      <p className={`mt-3 text-sm leading-6 ${bodyTextClass}`}>{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
