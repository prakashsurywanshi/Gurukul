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
interface TemplateThreeHomeProps {
  cmsContent: WebsiteContent;
}

const featureIcons = [BookOpen, ShieldCheck, Award, Sparkles];
const spotlightIcons = [MapPin, CheckCircle2, Rocket];

export default function TemplateThreeHome({ cmsContent }: TemplateThreeHomeProps) {
  const heroImage = cmsContent.sliderImages[0] ?? null;
  const galleryImages = useMemo(() => {
    if (cmsContent.sliderImages.length >= 4) {
      return cmsContent.sliderImages.slice(0, 4);
    }

    return Array.from({ length: 4 }, (_, index) => cmsContent.sliderImages[index % Math.max(cmsContent.sliderImages.length, 1)] ?? null);
  }, [cmsContent.sliderImages]);
  return (
    <>
      <Head title={`${cmsContent.seoTitle} | Template 3`} />

      <div className="min-h-screen bg-[linear-gradient(180deg,#f8f1e3_0%,#f3ede2_24%,#f9f7f2_55%,#e9eef5_100%)] text-stone-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(120,53,15,0.08),transparent_24%),radial-gradient(circle_at_85%_18%,rgba(30,64,175,0.1),transparent_22%),radial-gradient(circle_at_50%_70%,rgba(5,150,105,0.06),transparent_26%)]" />
          <div className="absolute left-[8%] top-20 -z-10 h-48 w-48 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="absolute right-[6%] top-12 -z-10 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />

          <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-stone-300 bg-white/90 text-amber-800 shadow-[0_16px_40px_rgba(120,53,15,0.12)]">
                {cmsContent.brandLogo ? (
                  <img src={cmsContent.brandLogo} alt={`${cmsContent.brandName} logo`} className="max-h-full max-w-full object-contain p-1" />
                ) : (
                  <GraduationCap className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="font-serif text-xl font-semibold tracking-[0.08em] text-stone-950">{cmsContent.brandName}</p>
                <p className="text-xs uppercase tracking-[0.32em] text-stone-500">{cmsContent.brandSubtitle}</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-7 rounded-full border border-white/70 bg-white/70 px-6 py-3 text-sm font-semibold text-stone-700 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:flex">
              <a href="#about" className="transition hover:text-stone-950">{cmsContent.navAbout}</a>
              <a href="#programs" className="transition hover:text-stone-950">{cmsContent.navPrograms}</a>
              <a href="#campus" className="transition hover:text-stone-950">{cmsContent.navCampus}</a>
              <a href="#gallery" className="transition hover:text-stone-950">{cmsContent.navGallery}</a>
              <Link href="/admissions/apply" className="transition hover:text-stone-950">{cmsContent.navAdmissions}</Link>
              <a href="#contact" className="transition hover:text-stone-950">{cmsContent.navContact}</a>
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <Link href="/login" className="rounded-full border border-stone-300 bg-white/80 px-5 py-2.5 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-white">
                {cmsContent.loginLabel}
              </Link>
              <Link href="/admissions/apply" className="rounded-full bg-[linear-gradient(135deg,#7c2d12,#c2410c,#b45309)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(124,45,18,0.24)] transition hover:brightness-105">
                {cmsContent.applyNowLabel}
              </Link>
            </div>
          </header>

          <main>
            <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[0.94fr_1.06fr] lg:px-10 lg:pt-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  {cmsContent.heroBadge}
                </div>
                <h1 className="mt-8 font-serif text-5xl font-semibold leading-[0.95] text-stone-950 sm:text-6xl lg:text-7xl">
                  {cmsContent.heroTitleLineOne}
                  <span className="mt-3 block text-amber-800">{cmsContent.heroTitleAccent}</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">
                  {cmsContent.heroDescription}
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <a href="#programs" className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-3.5 text-base font-semibold text-white shadow-[0_22px_44px_rgba(28,25,23,0.18)] transition hover:brightness-110">
                    {cmsContent.heroPrimaryCta}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white/85 px-6 py-3.5 text-base font-semibold text-stone-800 transition hover:bg-white">
                    {cmsContent.heroSecondaryCta}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  {cmsContent.highlights.map((item) => (
                    <div key={item.label} className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                      <p className="font-serif text-4xl font-semibold text-stone-950">{item.value}</p>
                      <p className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-stone-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-6 top-10 hidden h-32 w-32 rounded-[2rem] border border-white/70 bg-white/45 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur xl:block" />
                <div className="overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/40 p-4 shadow-[0_35px_80px_rgba(28,25,23,0.12)] backdrop-blur-2xl">
                  <div className="relative overflow-hidden rounded-[2rem]">
                    {heroImage ? (
                      <img src={heroImage} alt={cmsContent.brandName} className="h-[28rem] w-full object-cover sm:h-[36rem]" />
                    ) : (
                      <div className="h-[28rem] bg-[linear-gradient(135deg,#d6c4a7,#f8f1e3,#cbd5e1)] sm:h-[36rem]" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.04),rgba(12,10,9,0.48))]" />
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="rounded-[1.6rem] bg-white/88 p-5 text-stone-900 shadow-lg backdrop-blur-xl">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-800">{cmsContent.featureEyebrow}</p>
                          <h2 className="mt-3 font-serif text-2xl font-semibold">{cmsContent.featureTitle}</h2>
                          <p className="mt-3 text-sm leading-6 text-stone-600">{cmsContent.openHouseDescription}</p>
                        </div>
                        <div className="rounded-[1.6rem] border border-white/20 bg-stone-950/70 p-5 text-white backdrop-blur-xl">
                          <p className="text-xs uppercase tracking-[0.28em] text-amber-200">{cmsContent.openHouseLabel}</p>
                          <p className="mt-3 text-2xl font-semibold">{cmsContent.openHouseDate}</p>
                          <p className="mt-4 text-sm leading-6 text-stone-200">{cmsContent.liveOverviewValue} {cmsContent.liveOverviewLabel}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="about" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
              <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
                <div className="rounded-[2rem] border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.86),rgba(249,245,237,0.96))] p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-800">{cmsContent.aboutEyebrow}</p>
                  <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{cmsContent.aboutTitle}</h2>
                  <p className="mt-4 text-base leading-7 text-stone-600">{cmsContent.aboutDescription}</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {cmsContent.pillars.map((pillar, index) => {
                    const Icon = featureIcons[index] || Sparkles;

                    return (
                      <div key={pillar.title} className="rounded-[2rem] border border-white/70 bg-white/78 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.07)] backdrop-blur-xl">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f59e0b,#fb923c)] text-white shadow-lg">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-5 font-serif text-2xl font-semibold text-stone-950">{pillar.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-stone-600">{pillar.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section id="programs" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-800">{cmsContent.programsEyebrow}</p>
                <h2 className="mt-3 font-serif text-4xl font-semibold text-stone-950">{cmsContent.programsTitle}</h2>
                <p className="mt-4 text-base leading-7 text-stone-600">{cmsContent.programsDescription}</p>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-4">
                {cmsContent.programs.map((program, index) => (
                  <div key={program.title} className={`rounded-[2rem] border p-6 shadow-[0_20px_48px_rgba(15,23,42,0.08)] ${index % 2 === 0 ? 'border-amber-100 bg-[linear-gradient(180deg,#fffaf2,#ffffff)]' : 'border-sky-100 bg-[linear-gradient(180deg,#f8fbff,#ffffff)]'}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{program.age}</p>
                    <h3 className="mt-4 font-serif text-2xl font-semibold text-stone-950">{program.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-stone-600">{program.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="campus" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
              <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
                <div className="rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,rgba(120,53,15,0.95),rgba(68,64,60,0.92),rgba(30,41,59,0.92))] p-8 text-white shadow-[0_32px_70px_rgba(28,25,23,0.18)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-200">{cmsContent.campusEyebrow}</p>
                  <h2 className="mt-4 font-serif text-4xl font-semibold">{cmsContent.campusTitle}</h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-stone-200">{cmsContent.campusDescription}</p>
                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {cmsContent.campusStats.map((item) => (
                      <div key={item.label} className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
                        <p className="font-serif text-3xl font-semibold">{item.value}</p>
                        <p className="mt-2 text-sm font-medium text-stone-200">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/70 bg-white/82 p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-800">{cmsContent.newsEyebrow}</p>
                  <div className="mt-6 space-y-4">
                    {cmsContent.news.map((item) => (
                      <div key={item.title} className="rounded-[1.5rem] border border-stone-200 bg-white p-5">
                        <h3 className="font-serif text-xl font-semibold text-stone-950">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section id="gallery" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[2rem] border border-white/70 bg-white/78 p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-800">{cmsContent.outcomesEyebrow}</p>
                  <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{cmsContent.outcomesTitle}</h2>
                  <p className="mt-4 text-base leading-7 text-stone-600">{cmsContent.outcomesDescription}</p>
                  <div className="mt-6 grid gap-4">
                    {cmsContent.outcomes.map((item) => (
                      <div key={item.title} className="rounded-[1.5rem] border border-stone-200 bg-[linear-gradient(180deg,#fff,#f7f3eb)] p-5">
                        <p className="font-semibold text-stone-950">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {galleryImages.map((image, index) => (
                    <div key={`gallery-${index}`} className={`overflow-hidden rounded-[2rem] border border-white/70 shadow-[0_20px_45px_rgba(15,23,42,0.1)] ${index === 0 ? 'sm:col-span-2' : ''}`}>
                      {image ? (
                        <img src={image} alt={`${cmsContent.brandName} campus view ${index + 1}`} className={`w-full object-cover ${index === 0 ? 'h-72' : 'h-60'}`} />
                      ) : (
                        <div className={`w-full bg-[linear-gradient(135deg,#fde68a,#e0f2fe,#ddd6fe)] ${index === 0 ? 'h-72' : 'h-60'}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-800">{cmsContent.journeyEyebrow}</p>
                  <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{cmsContent.journeyTitle}</h2>
                  <p className="mt-4 text-base leading-7 text-stone-600">{cmsContent.journeyDescription}</p>
                </div>
                <div className="grid gap-4">
                  {cmsContent.journeySteps.map((item) => (
                    <div key={item.step} className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                      <div className="flex items-center gap-4">
                        <div className="rounded-2xl bg-amber-100 px-4 py-2 text-lg font-black text-amber-900">{item.step}</div>
                        <h3 className="font-serif text-2xl font-semibold text-stone-950">{item.title}</h3>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-stone-600">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[2rem] border border-white/70 bg-[linear-gradient(150deg,rgba(255,255,255,0.86),rgba(248,250,252,0.94))] p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-800">{cmsContent.voicesEyebrow}</p>
                  <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{cmsContent.voicesTitle}</h2>
                  <div className="mt-8 grid gap-4">
                    {cmsContent.testimonials.map((item) => (
                      <div key={item.name} className="rounded-[1.6rem] border border-stone-200 bg-white p-5">
                        <Quote className="h-6 w-6 text-amber-700" />
                        <p className="mt-4 text-sm leading-7 text-stone-600">{item.quote}</p>
                        <div className="mt-5">
                          <p className="font-semibold text-stone-950">{item.name}</p>
                          <p className="text-sm text-stone-500">{item.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div id="contact" className="rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,#fff7ed,#ffffff,#eff6ff)] p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-800">{cmsContent.visitEyebrow}</p>
                  <h2 className="mt-4 font-serif text-4xl font-semibold text-stone-950">{cmsContent.visitTitle}</h2>
                  <div className="mt-8 space-y-5">
                    {[
                      [cmsContent.visitPointOneTitle, cmsContent.visitPointOneText],
                      [cmsContent.visitPointTwoTitle, cmsContent.visitPointTwoText],
                      [cmsContent.visitPointThreeTitle, cmsContent.visitPointThreeText],
                    ].map(([title, text], index) => {
                      const Icon = spotlightIcons[index] || Star;

                      return (
                        <div key={title} className="flex items-start gap-3 rounded-[1.4rem] border border-stone-200 bg-white/80 p-4">
                          <Icon className="mt-1 h-5 w-5 text-amber-700" />
                          <div>
                            <p className="font-semibold text-stone-950">{title}</p>
                            <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link href="/admissions/apply" className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110">
                      {cmsContent.visitPrimaryCta}
                    </Link>
                    <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50">
                      {cmsContent.visitSecondaryCta}
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
              <div className="rounded-[2.3rem] border border-white/70 bg-[linear-gradient(145deg,rgba(41,37,36,0.96),rgba(120,53,15,0.92),rgba(30,41,59,0.94))] px-6 py-10 text-white shadow-[0_35px_80px_rgba(28,25,23,0.18)] sm:px-10">
                <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.32em] text-amber-200">{cmsContent.admissionsEyebrow}</p>
                    <h2 className="mt-4 font-serif text-4xl font-semibold">{cmsContent.admissionsTitle}</h2>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-stone-200">{cmsContent.admissionsDescription}</p>

                    <div className="mt-8 space-y-4 text-sm text-stone-200">
                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-5 w-5 text-amber-200" />
                        <p>{cmsContent.admissionsPointOne}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Award className="mt-0.5 h-5 w-5 text-amber-200" />
                        <p>{cmsContent.admissionsPointTwo}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="mt-0.5 h-5 w-5 text-amber-200" />
                        <p>{cmsContent.admissionsEmail}</p>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                      <Link href="/admissions/apply" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-100">
                        {cmsContent.admissionsFormTitle}
                      </Link>
                      <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                        {cmsContent.admissionsPortalButton}
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-[1.9rem] border border-white/12 bg-white/10 p-6 backdrop-blur-xl">
                    <h3 className="font-serif text-2xl font-semibold">{cmsContent.admissionsFormTitle}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-200">{cmsContent.admissionsFormIntro}</p>
                    <p className="mt-4 text-sm leading-6 text-stone-200">
                      The admission form is now available on a separate page, which makes the homepage lighter and gives families a focused application flow.
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Link href="/admissions/apply" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-100">
                        Open Admission Form
                      </Link>
                      <a href={`mailto:${cmsContent.admissionsEmail}`} className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                        Email Admissions
                      </a>
                    </div>
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
