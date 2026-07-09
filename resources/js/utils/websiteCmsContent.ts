export type WebsiteStat = {
  value: string;
  label: string;
};

export type WebsiteCard = {
  title: string;
  description: string;
};

export type WebsiteProgram = {
  title: string;
  age: string;
  description: string;
};

export type WebsitePillar = {
  title: string;
  text: string;
};

export type WebsiteNews = {
  title: string;
  detail: string;
};

export type WebsiteSimpleCard = {
  title: string;
  description: string;
};

export type WebsiteStep = {
  step: string;
  title: string;
  description: string;
};

export type WebsiteTestimonial = {
  quote: string;
  name: string;
  role: string;
};

export type WebsiteFaq = {
  question: string;
  answer: string;
};

export type WebsiteSlide = {
  eyebrow: string;
  title: string;
  description: string;
  metric: string;
};

export type WebsiteGalleryItem = {
  title: string;
  category: string;
  description: string;
};

export type WebsiteContactItem = {
  title: string;
  value: string;
  description: string;
};

export type WebsiteThemeKey = 'white' | 'aurora' | 'sunrise' | 'emerald';
export type WebsiteTemplateKey = 'template1' | 'template2' | 'template3' | 'template4';

export type WebsiteContent = {
  activeTemplate: WebsiteTemplateKey;
  theme: WebsiteThemeKey;
  sliderImages: string[];
  seoTitle: string;
  brandName: string;
  brandSubtitle: string;
  brandLogo: string;
  navAbout: string;
  navPrograms: string;
  navCampus: string;
  navAdmissions: string;
  navGallery: string;
  navContact: string;
  loginLabel: string;
  applyNowLabel: string;
  heroBadge: string;
  heroTitleLineOne: string;
  heroTitleAccent: string;
  heroDescription: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  highlights: WebsiteStat[];
  featureEyebrow: string;
  featureTitle: string;
  features: WebsiteCard[];
  openHouseLabel: string;
  openHouseDescription: string;
  openHouseDate: string;
  liveOverviewValue: string;
  liveOverviewLabel: string;
  aboutEyebrow: string;
  aboutTitle: string;
  aboutDescription: string;
  pillars: WebsitePillar[];
  programsEyebrow: string;
  programsTitle: string;
  programsDescription: string;
  programs: WebsiteProgram[];
  campusEyebrow: string;
  campusTitle: string;
  campusDescription: string;
  campusStats: WebsiteStat[];
  newsEyebrow: string;
  news: WebsiteNews[];
  outcomesEyebrow: string;
  outcomesTitle: string;
  outcomesDescription: string;
  outcomes: WebsiteSimpleCard[];
  journeyEyebrow: string;
  journeyTitle: string;
  journeyDescription: string;
  journeySteps: WebsiteStep[];
  voicesEyebrow: string;
  voicesTitle: string;
  testimonials: WebsiteTestimonial[];
  visitEyebrow: string;
  visitTitle: string;
  visitPointOneTitle: string;
  visitPointOneText: string;
  visitPointTwoTitle: string;
  visitPointTwoText: string;
  visitPointThreeTitle: string;
  visitPointThreeText: string;
  visitPrimaryCta: string;
  visitSecondaryCta: string;
  faqEyebrow: string;
  faqTitle: string;
  faqs: WebsiteFaq[];
  admissionsEyebrow: string;
  admissionsTitle: string;
  admissionsDescription: string;
  admissionsPointOne: string;
  admissionsPointTwo: string;
  admissionsEmail: string;
  admissionsContactButton: string;
  admissionsPortalButton: string;
  admissionsFormTitle: string;
  admissionsFormIntro: string;
  templateTwoHeroEyebrow: string;
  templateTwoHeroTitle: string;
  templateTwoHeroDescription: string;
  templateTwoHeroPrimaryCta: string;
  templateTwoHeroSecondaryCta: string;
  templateTwoHeroFloatingLabel: string;
  templateTwoSlides: WebsiteSlide[];
  templateTwoAboutEyebrow: string;
  templateTwoAboutTitle: string;
  templateTwoAboutDescription: string;
  templateTwoAboutCards: WebsiteCard[];
  templateTwoGalleryEyebrow: string;
  templateTwoGalleryTitle: string;
  templateTwoGalleryDescription: string;
  templateTwoGalleryItems: WebsiteGalleryItem[];
  templateTwoContactEyebrow: string;
  templateTwoContactTitle: string;
  templateTwoContactDescription: string;
  templateTwoContactItems: WebsiteContactItem[];
  templateTwoContactPrimaryCta: string;
  templateTwoContactSecondaryCta: string;
  templateFourTopPhone: string;
  templateFourTopEmail: string;
  templateFourTopAddress: string;
  templateFourHeroEyebrow: string;
  templateFourHeroTitle: string;
  templateFourHeroDescription: string;
  templateFourHeroPrimaryCta: string;
  templateFourHeroSecondaryCta: string;
  templateFourNoticeLabel: string;
  templateFourNoticeText: string;
  templateFourAboutTitle: string;
  templateFourAboutDescription: string;
  templateFourAboutCards: WebsiteCard[];
  templateFourGalleryTitle: string;
  templateFourGalleryDescription: string;
  templateFourGalleryItems: WebsiteGalleryItem[];
  templateFourEventsTitle: string;
  templateFourEventsDescription: string;
  templateFourEvents: WebsiteNews[];
  templateFourContactTitle: string;
  templateFourContactDescription: string;
  templateFourContactItems: WebsiteContactItem[];
  templateFourMapEmbedUrl: string;
};

export type WebsiteSharedContent = Pick<
  WebsiteContent,
  | 'seoTitle'
  | 'brandName'
  | 'brandSubtitle'
  | 'brandLogo'
  | 'navAbout'
  | 'navPrograms'
  | 'navCampus'
  | 'navAdmissions'
  | 'navGallery'
  | 'navContact'
  | 'loginLabel'
  | 'applyNowLabel'
>;

export type WebsiteCmsContent = {
  activeTemplate: WebsiteTemplateKey;
  theme: WebsiteThemeKey;
  sliderImages: string[];
  shared: WebsiteSharedContent;
  template1: Partial<WebsiteContent>;
  template2: Partial<WebsiteContent>;
  template3: Partial<WebsiteContent>;
  template4: Partial<WebsiteContent>;
};

export type WebsiteTheme = {
  name: string;
  description: string;
  pageBackground: string;
  ambientBackground: string;
  leftGlow: string;
  rightGlow: string;
  heroBadge: string;
  primaryButton: string;
  secondaryButton: string;
  topActionButton: string;
  logoBadgeText: string;
  featureIcon: string;
  spotlightPanel: string;
  spotlightInner: string;
  openHousePanel: string;
  liveOverviewCard: string;
  aboutPanel: string;
  pillarIcon: string;
  programEven: string;
  programOdd: string;
  campusPanel: string;
  newsPanel: string;
  admissionsPanel: string;
  admissionsButton: string;
  admissionsFormButton: string;
};

export const websiteThemes: Record<WebsiteThemeKey, WebsiteTheme> = {
  white: {
    name: 'White',
    description: 'A bright white default with soft blue accents and clean editorial surfaces.',
    pageBackground: 'bg-[linear-gradient(180deg,#fffdf8_0%,#f8fbff_28%,#f6f8fc_58%,#eef4ff_100%)]',
    ambientBackground:
      'bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_24%),radial-gradient(circle_at_20%_12%,_rgba(14,165,233,0.1),_transparent_20%),radial-gradient(circle_at_85%_10%,_rgba(251,191,36,0.12),_transparent_18%),radial-gradient(circle_at_80%_35%,_rgba(244,114,182,0.1),_transparent_20%)]',
    leftGlow: 'bg-sky-300/30',
    rightGlow: 'bg-amber-200/40',
    heroBadge: 'border-sky-200 bg-white/90 text-sky-800 shadow-[0_12px_30px_rgba(59,130,246,0.12)]',
    primaryButton: 'bg-[linear-gradient(135deg,#0f172a,#2563eb)] text-white shadow-[0_18px_50px_rgba(37,99,235,0.24)]',
    secondaryButton: 'border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300 hover:bg-white',
    topActionButton: 'bg-[linear-gradient(135deg,#f59e0b,#fb7185)] text-white shadow-[0_18px_40px_rgba(245,158,11,0.2)]',
    logoBadgeText: 'text-sky-700',
    featureIcon: 'bg-[linear-gradient(135deg,#dbeafe,#fef3c7)] text-slate-800 shadow-sky-200/60',
    spotlightPanel: 'bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(239,246,255,0.92),rgba(255,251,235,0.88))]',
    spotlightInner: 'bg-[linear-gradient(160deg,#ffffff_0%,#f8fbff_52%,#eef4ff_100%)]',
    openHousePanel: 'bg-[linear-gradient(135deg,rgba(219,234,254,0.92),rgba(254,243,199,0.72))]',
    liveOverviewCard: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.88))]',
    aboutPanel: 'bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(239,246,255,0.92),rgba(255,251,235,0.88))]',
    pillarIcon: 'bg-[linear-gradient(135deg,#dbeafe,#bfdbfe)] text-slate-800 shadow-sky-200/60',
    programEven: 'border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.92))]',
    programOdd: 'border-sky-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.92))]',
    campusPanel: 'bg-[linear-gradient(135deg,rgba(255,251,235,0.92),rgba(239,246,255,0.95),rgba(255,255,255,0.94))]',
    newsPanel: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.92))]',
    admissionsPanel: 'bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(239,246,255,0.94),rgba(255,251,235,0.9),rgba(255,255,255,0.98))]',
    admissionsButton: 'bg-[linear-gradient(135deg,#0f172a,#2563eb)] text-white',
    admissionsFormButton: 'bg-[linear-gradient(135deg,#0f172a,#2563eb,#0ea5e9)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.22)]',
  },
  aurora: {
    name: 'Aurora',
    description: 'Deep navy with cyan, amber, and rose glows.',
    pageBackground: 'bg-[radial-gradient(circle_at_top_left,#17335e_0%,#0b1223_30%,#070b16_65%,#03050b_100%)]',
    ambientBackground:
      'bg-[radial-gradient(circle_at_top_left,_rgba(74,222,128,0.16),_transparent_20%),radial-gradient(circle_at_20%_10%,_rgba(96,165,250,0.25),_transparent_22%),radial-gradient(circle_at_80%_10%,_rgba(251,191,36,0.2),_transparent_18%),radial-gradient(circle_at_80%_35%,_rgba(168,85,247,0.18),_transparent_20%)]',
    leftGlow: 'bg-cyan-400/20',
    rightGlow: 'bg-fuchsia-500/20',
    heroBadge: 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_12px_30px_rgba(34,211,238,0.14)]',
    primaryButton: 'bg-[linear-gradient(135deg,#22d3ee,#60a5fa)] text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,0.3)]',
    secondaryButton: 'border-white/15 bg-white/6 text-white hover:border-white/30 hover:bg-white/10',
    topActionButton: 'bg-[linear-gradient(135deg,#f59e0b,#fb7185)] text-slate-950 shadow-[0_18px_40px_rgba(251,191,36,0.25)]',
    logoBadgeText: 'text-amber-300',
    featureIcon: 'bg-[linear-gradient(135deg,#fde68a,#f472b6)] text-slate-950 shadow-pink-500/10',
    spotlightPanel: 'bg-[linear-gradient(160deg,rgba(8,15,30,0.82),rgba(25,39,80,0.76),rgba(99,102,241,0.32))]',
    spotlightInner: 'bg-[linear-gradient(160deg,#17305a_0%,#0f172a_52%,#171d38_100%)]',
    openHousePanel: 'bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(244,114,182,0.08))]',
    liveOverviewCard: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))]',
    aboutPanel: 'bg-[linear-gradient(145deg,rgba(15,23,42,0.88),rgba(37,99,235,0.24),rgba(15,23,42,0.88))]',
    pillarIcon: 'bg-[linear-gradient(135deg,#67e8f9,#38bdf8)] text-slate-950 shadow-cyan-500/20',
    programEven: 'border-amber-300/18 bg-[linear-gradient(180deg,rgba(251,191,36,0.16),rgba(255,255,255,0.04))]',
    programOdd: 'border-cyan-300/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.14),rgba(255,255,255,0.04))]',
    campusPanel: 'bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(244,114,182,0.12),rgba(15,23,42,0.75))]',
    newsPanel: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))]',
    admissionsPanel: 'bg-[linear-gradient(145deg,rgba(8,15,30,0.92),rgba(29,78,216,0.24),rgba(236,72,153,0.15),rgba(8,15,30,0.94))]',
    admissionsButton: 'bg-[linear-gradient(135deg,#fde68a,#fb7185)] text-slate-950',
    admissionsFormButton: 'bg-[linear-gradient(135deg,#22d3ee,#f59e0b,#fb7185)] text-slate-950 shadow-[0_18px_40px_rgba(34,211,238,0.22)]',
  },
  sunrise: {
    name: 'Sunrise',
    description: 'Warm gold, coral, and dusk blue for a brighter admissions-first look.',
    pageBackground: 'bg-[radial-gradient(circle_at_top_left,#7c2d12_0%,#3b1d3a_28%,#172554_62%,#020617_100%)]',
    ambientBackground:
      'bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_22%),radial-gradient(circle_at_20%_10%,_rgba(251,113,133,0.22),_transparent_24%),radial-gradient(circle_at_80%_10%,_rgba(56,189,248,0.18),_transparent_20%),radial-gradient(circle_at_80%_35%,_rgba(253,186,116,0.12),_transparent_24%)]',
    leftGlow: 'bg-amber-400/20',
    rightGlow: 'bg-rose-400/20',
    heroBadge: 'border-amber-200/30 bg-amber-300/10 text-amber-50 shadow-[0_12px_30px_rgba(251,191,36,0.16)]',
    primaryButton: 'bg-[linear-gradient(135deg,#fb7185,#f59e0b)] text-slate-950 shadow-[0_18px_50px_rgba(251,113,133,0.28)]',
    secondaryButton: 'border-white/20 bg-white/8 text-white hover:border-white/35 hover:bg-white/12',
    topActionButton: 'bg-[linear-gradient(135deg,#fde68a,#fb7185)] text-slate-950 shadow-[0_18px_40px_rgba(251,191,36,0.22)]',
    logoBadgeText: 'text-amber-200',
    featureIcon: 'bg-[linear-gradient(135deg,#fdba74,#fb7185)] text-slate-950 shadow-orange-500/10',
    spotlightPanel: 'bg-[linear-gradient(160deg,rgba(61,23,23,0.82),rgba(124,45,18,0.62),rgba(30,41,59,0.42))]',
    spotlightInner: 'bg-[linear-gradient(160deg,#4a1d1f_0%,#1e293b_54%,#2c1d4d_100%)]',
    openHousePanel: 'bg-[linear-gradient(135deg,rgba(251,113,133,0.14),rgba(251,191,36,0.12))]',
    liveOverviewCard: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))]',
    aboutPanel: 'bg-[linear-gradient(145deg,rgba(120,53,15,0.8),rgba(251,113,133,0.18),rgba(30,41,59,0.88))]',
    pillarIcon: 'bg-[linear-gradient(135deg,#fdba74,#fb7185)] text-slate-950 shadow-orange-500/20',
    programEven: 'border-rose-300/18 bg-[linear-gradient(180deg,rgba(251,113,133,0.16),rgba(255,255,255,0.04))]',
    programOdd: 'border-amber-300/18 bg-[linear-gradient(180deg,rgba(251,191,36,0.14),rgba(255,255,255,0.04))]',
    campusPanel: 'bg-[linear-gradient(135deg,rgba(251,113,133,0.18),rgba(251,191,36,0.14),rgba(15,23,42,0.74))]',
    newsPanel: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))]',
    admissionsPanel: 'bg-[linear-gradient(145deg,rgba(76,29,149,0.26),rgba(251,113,133,0.2),rgba(120,53,15,0.24),rgba(8,15,30,0.92))]',
    admissionsButton: 'bg-[linear-gradient(135deg,#fde68a,#fb7185)] text-slate-950',
    admissionsFormButton: 'bg-[linear-gradient(135deg,#fb7185,#f59e0b,#fde68a)] text-slate-950 shadow-[0_18px_40px_rgba(251,113,133,0.22)]',
  },
  emerald: {
    name: 'Emerald',
    description: 'Forest-inspired greens with teal and slate for a calm academic tone.',
    pageBackground: 'bg-[radial-gradient(circle_at_top_left,#0f3d2e_0%,#08281f_30%,#07131e_68%,#02050a_100%)]',
    ambientBackground:
      'bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.16),_transparent_22%),radial-gradient(circle_at_20%_10%,_rgba(45,212,191,0.2),_transparent_22%),radial-gradient(circle_at_80%_10%,_rgba(132,204,22,0.14),_transparent_20%),radial-gradient(circle_at_80%_35%,_rgba(56,189,248,0.12),_transparent_24%)]',
    leftGlow: 'bg-emerald-400/20',
    rightGlow: 'bg-teal-400/20',
    heroBadge: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-50 shadow-[0_12px_30px_rgba(52,211,153,0.14)]',
    primaryButton: 'bg-[linear-gradient(135deg,#34d399,#2dd4bf)] text-slate-950 shadow-[0_18px_50px_rgba(52,211,153,0.28)]',
    secondaryButton: 'border-white/15 bg-white/6 text-white hover:border-white/30 hover:bg-white/10',
    topActionButton: 'bg-[linear-gradient(135deg,#bef264,#34d399)] text-slate-950 shadow-[0_18px_40px_rgba(34,197,94,0.22)]',
    logoBadgeText: 'text-emerald-200',
    featureIcon: 'bg-[linear-gradient(135deg,#bef264,#34d399)] text-slate-950 shadow-emerald-500/10',
    spotlightPanel: 'bg-[linear-gradient(160deg,rgba(6,78,59,0.78),rgba(15,118,110,0.54),rgba(15,23,42,0.4))]',
    spotlightInner: 'bg-[linear-gradient(160deg,#0f3d2e_0%,#0f172a_54%,#113339_100%)]',
    openHousePanel: 'bg-[linear-gradient(135deg,rgba(52,211,153,0.14),rgba(45,212,191,0.08))]',
    liveOverviewCard: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))]',
    aboutPanel: 'bg-[linear-gradient(145deg,rgba(6,78,59,0.84),rgba(45,212,191,0.16),rgba(15,23,42,0.88))]',
    pillarIcon: 'bg-[linear-gradient(135deg,#34d399,#2dd4bf)] text-slate-950 shadow-emerald-500/20',
    programEven: 'border-emerald-300/18 bg-[linear-gradient(180deg,rgba(52,211,153,0.16),rgba(255,255,255,0.04))]',
    programOdd: 'border-lime-300/18 bg-[linear-gradient(180deg,rgba(132,204,22,0.14),rgba(255,255,255,0.04))]',
    campusPanel: 'bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(45,212,191,0.1),rgba(15,23,42,0.76))]',
    newsPanel: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))]',
    admissionsPanel: 'bg-[linear-gradient(145deg,rgba(5,46,22,0.9),rgba(16,185,129,0.2),rgba(13,148,136,0.14),rgba(8,15,30,0.94))]',
    admissionsButton: 'bg-[linear-gradient(135deg,#bef264,#34d399)] text-slate-950',
    admissionsFormButton: 'bg-[linear-gradient(135deg,#34d399,#2dd4bf,#bef264)] text-slate-950 shadow-[0_18px_40px_rgba(16,185,129,0.22)]',
  },
};

export const defaultWebsiteContent: WebsiteContent = {
  activeTemplate: 'template1',
  theme: 'white',
  sliderImages: [],
  seoTitle: 'Gurukul | Inspiring Learners, Building Futures',
  brandName: 'Gurukul',
  brandSubtitle: 'School and College Excellence',
  brandLogo: '',
  navAbout: 'About',
  navPrograms: 'Programs',
  navCampus: 'Campus Life',
  navAdmissions: 'Admissions',
  navGallery: 'Gallery',
  navContact: 'Contact',
  loginLabel: 'Login',
  applyNowLabel: 'Apply Now',
  heroBadge: 'Admissions open for the 2026-27 academic year',
  heroTitleLineOne: 'A modern learning destination',
  heroTitleAccent: 'with depth, energy, and ambition.',
  heroDescription:
    'Gurukul blends academic rigor, caring mentorship, and vibrant campus life to help students from early years through college learn with confidence and lead with character.',
  heroPrimaryCta: 'Explore Programs',
  heroSecondaryCta: 'Student, Parent and Staff Portal',
  highlights: [
    { value: '3,200+', label: 'School and college learners' },
    { value: '96%', label: 'Academic excellence rate' },
    { value: '120+', label: 'Faculty and mentors' },
    { value: '22', label: 'Clubs, cells, and studios' },
  ],
  featureEyebrow: 'Campus Spotlight',
  featureTitle: 'A complete school and college ecosystem',
  features: [
    {
      title: 'Strong academics',
      description: 'Concept-first teaching with daily support, smart classrooms, and balanced assessments.',
    },
    {
      title: 'Modern labs',
      description: 'Hands-on science, robotics, and maker learning that turns curiosity into confidence.',
    },
    {
      title: 'Reading culture',
      description: 'A rich library program with guided reading, research practice, and quiet study spaces.',
    },
    {
      title: 'Future-ready skills',
      description: 'Communication, leadership, digital literacy, research, and industry-ready project work.',
    },
  ],
  openHouseLabel: 'Next open house',
  openHouseDescription:
    'Visit our campus, meet faculty mentors, and explore both school and college learning spaces.',
  openHouseDate: 'Saturday, April 18 | 10:00 AM to 1:00 PM',
  liveOverviewValue: '42+',
  liveOverviewLabel: 'smart classrooms, labs, studios, and innovation zones',
  aboutEyebrow: 'Why learners choose Gurukul',
  aboutTitle: 'An institution designed for deep learning, ambition, and belonging.',
  aboutDescription:
    'We believe the best institutions combine discipline with delight. Our faculty mentor closely, our systems stay organized, and our learners are encouraged to discover who they are while achieving at a high level.',
  pillars: [
    { title: 'Safe campus', text: 'Secure entry, attentive staff, and student wellbeing at the center.' },
    { title: 'Transport network', text: 'Reliable route coverage with disciplined supervision and updates.' },
    { title: 'Beyond classrooms', text: 'Sports, arts, innovation cells, seminars, competitions, and talent development.' },
    { title: 'Family and student partnership', text: 'Transparent communication, progress visibility, and strong trust across every stage.' },
  ],
  programsEyebrow: 'Academic Journey',
  programsTitle: 'Learning pathways for every stage',
  programsDescription:
    'Each program is built with age-appropriate care, strong academics, and opportunities to explore talent, leadership, research, and career pathways.',
  programs: [
    {
      title: 'School Foundation',
      age: 'Pre-Primary to Grade 5',
      description: 'Playful, nurturing learning with language, numeracy, creativity, and joyful routines.',
    },
    {
      title: 'Middle and Senior School',
      age: 'Grades 6 to 12',
      description: 'Strong academics, lab learning, exam preparation, clubs, competitions, and leadership building.',
    },
    {
      title: 'Undergraduate Programs',
      age: 'College Degrees',
      description: 'Career-focused programs with practical labs, seminars, mentoring, and skill-based learning pathways.',
    },
    {
      title: 'Professional and Career Pathways',
      age: 'Diploma and Advanced Learning',
      description: 'Industry exposure, internships, research support, and readiness for higher studies and careers.',
    },
  ],
  campusEyebrow: 'Campus Life',
  campusTitle: 'Every day is full of movement, creativity, and discovery.',
  campusDescription:
    'From performing arts and athletics to coding labs, seminars, clubs, and community service, learners find meaningful ways to grow their confidence and voice.',
  campusStats: [
    { value: '12+', label: 'Sports disciplines' },
    { value: '8', label: 'Creative and innovation studios' },
    { value: '25+', label: 'Annual events, fests, and showcases' },
  ],
  newsEyebrow: 'Latest Highlights',
  news: [
    { title: 'Admissions open for 2026-27', detail: 'Campus tours, counseling sessions, and scholarship guidance for school and college applicants.' },
    { title: 'Innovation and Research Week', detail: 'Student-led robotics, coding, research posters, and sustainability exhibits across departments.' },
    { title: 'University and competitive exam mentoring', detail: 'Guided support for board exams, entrance pathways, placements, and academic progression.' },
  ],
  outcomesEyebrow: 'Outcomes',
  outcomesTitle: 'A campus designed to move students from potential to proof.',
  outcomesDescription:
    'The Gurukul experience is built around measurable academic growth, stronger confidence, and real readiness for competitive futures.',
  outcomes: [
    {
      title: 'Board and university readiness',
      description: 'Structured mentoring, diagnostic assessments, and disciplined routines prepare learners for high-stakes milestones.',
    },
    {
      title: 'Future pathways and career exposure',
      description: 'Students build portfolios through labs, seminars, competitions, internships, and guided career exploration.',
    },
    {
      title: 'Wellbeing with accountability',
      description: 'We balance high expectations with pastoral support, parent communication, and strong safety systems.',
    },
    {
      title: 'Leadership and communication',
      description: 'Public speaking, clubs, service learning, and team projects help learners grow real confidence.',
    },
  ],
  journeyEyebrow: 'Student Journey',
  journeyTitle: 'From enquiry to belonging, every step is intentional.',
  journeyDescription:
    'We make the admissions and onboarding experience feel clear, personal, and confidence-building for both students and families.',
  journeySteps: [
    {
      step: '01',
      title: 'Discover the campus',
      description: 'Families explore academics, student life, facilities, and admissions options through guided tours and counseling.',
    },
    {
      step: '02',
      title: 'Choose the right pathway',
      description: 'We help match the learner stage, academic goals, and program interests with the right Gurukul track.',
    },
    {
      step: '03',
      title: 'Build confidence early',
      description: 'From orientation to classroom integration, students settle into a structured and encouraging learning environment.',
    },
  ],
  voicesEyebrow: 'Voices From Gurukul',
  voicesTitle: 'Trust built through everyday experience.',
  testimonials: [
    {
      quote: 'The school combines discipline, warmth, and strong academic systems. We always know how our child is progressing.',
      name: 'Shalini Mehta',
      role: 'Parent, Grade 8',
    },
    {
      quote: 'The mentors push us to think bigger, compete harder, and still enjoy learning. The labs and clubs changed my confidence.',
      name: 'Aarav Singh',
      role: 'Student Leader, Grade 11',
    },
    {
      quote: 'Gurukul gives faculty room to mentor deeply, and students respond to that culture with real ownership and ambition.',
      name: 'Ritika Verma',
      role: 'Faculty Mentor',
    },
  ],
  visitEyebrow: 'Visit and Connect',
  visitTitle: 'See the campus, meet the team, and ask the right questions.',
  visitPointOneTitle: 'Campus location',
  visitPointOneText: 'Knowledge Park campus with dedicated academic blocks, labs, event spaces, and student activity zones.',
  visitPointTwoTitle: 'Admissions guidance',
  visitPointTwoText: 'Get help on program selection, scholarship discussions, required documents, and next-step planning.',
  visitPointThreeTitle: 'Future-ready environment',
  visitPointThreeText: 'Explore how academic rigor, labs, clubs, and mentoring come together in one student journey.',
  visitPrimaryCta: 'Book a Visit',
  visitSecondaryCta: 'Open Portal',
  faqEyebrow: 'Frequently Asked',
  faqTitle: 'Common questions from students and families.',
  faqs: [
    {
      question: 'Who can apply to Gurukul?',
      answer: 'We welcome applicants across school stages, senior secondary, undergraduate pathways, and selected professional programs.',
    },
    {
      question: 'How does Gurukul support parents?',
      answer: 'Through structured communication, progress visibility, admissions guidance, and responsive administrative support.',
    },
    {
      question: 'What makes the campus experience different?',
      answer: 'Students learn in an environment built around academics, modern labs, extracurricular depth, wellbeing, and future readiness.',
    },
  ],
  admissionsEyebrow: 'Admissions',
  admissionsTitle: 'Start your Gurukul journey with confidence.',
  admissionsDescription:
    'Schedule a campus visit, speak with our admissions team, and explore how Gurukul supports academic growth from foundational schooling to college and career readiness.',
  admissionsPointOne: 'Personalized guidance for school admissions, college admissions, and transfer students.',
  admissionsPointTwo: 'Merit and need-based scholarship conversations available across eligible programs.',
  admissionsEmail: 'admissions@gurukul.edu',
  admissionsContactButton: 'Contact Admissions',
  admissionsPortalButton: 'Open Gurukul Portal',
  admissionsFormTitle: 'Admission Form',
  admissionsFormIntro: 'Submit your details and our admissions team will get in touch with the next steps.',
  templateTwoHeroEyebrow: 'Immersive Future Campus',
  templateTwoHeroTitle: 'A cinematic learning experience built to feel alive.',
  templateTwoHeroDescription:
    'Template 2 is designed for schools and colleges that want a bold digital presence with motion, depth, gallery storytelling, and a strong contact journey.',
  templateTwoHeroPrimaryCta: 'View 3D Highlights',
  templateTwoHeroSecondaryCta: 'Talk To Admissions',
  templateTwoHeroFloatingLabel: 'Interactive Campus Experience',
  templateTwoSlides: [
    {
      eyebrow: 'Innovation Atrium',
      title: 'Dynamic classrooms with layered digital tools',
      description: 'Blended teaching environments, presentation walls, collaboration pods, and mentor-led active learning.',
      metric: '28 smart zones',
    },
    {
      eyebrow: 'Research Studios',
      title: 'Hands-on labs that turn curiosity into projects',
      description: 'Science, robotics, design, and technical experimentation come together in one future-ready floor.',
      metric: '14 advanced labs',
    },
    {
      eyebrow: 'Creative Arena',
      title: 'Performance, media, and maker culture in motion',
      description: 'Students learn to present, perform, build, and publish with confidence across clubs and showcases.',
      metric: '22 creator clubs',
    },
    {
      eyebrow: 'Student Life',
      title: 'A campus atmosphere that feels ambitious and welcoming',
      description: 'Wellbeing, events, sports, and social belonging are designed into everyday student experience.',
      metric: '3,200+ learners',
    },
  ],
  templateTwoAboutEyebrow: 'About The Experience',
  templateTwoAboutTitle: 'Designed like a flagship campus, managed like a high-performing institution.',
  templateTwoAboutDescription:
    'This template highlights space, energy, and credibility. It suits institutions that want to communicate modern infrastructure, trust, and student momentum through a more premium visual language.',
  templateTwoAboutCards: [
    {
      title: '3D visual storytelling',
      description: 'Layered cards, perspective transforms, and floating motion give the homepage a stronger first impression.',
    },
    {
      title: 'Admissions-ready structure',
      description: 'About, gallery, and contact sections are arranged to support trust-building and stronger enquiries.',
    },
    {
      title: 'CMS editable',
      description: 'Every major headline, slide, gallery card, and contact block can be updated from the Website CMS.',
    },
  ],
  templateTwoGalleryEyebrow: 'Gallery Showcase',
  templateTwoGalleryTitle: 'Moments, spaces, and student energy captured in one visual grid.',
  templateTwoGalleryDescription:
    'Use this section to present campus culture through immersive cards that feel more like a digital exhibit than a standard image list.',
  templateTwoGalleryItems: [
    {
      title: 'Atrium Launch Events',
      category: 'Campus',
      description: 'Orientation days, guest sessions, and high-energy student gatherings in signature spaces.',
    },
    {
      title: 'Robotics and STEM Lab',
      category: 'Innovation',
      description: 'Prototype building, coding sprints, lab experiments, and cross-disciplinary project work.',
    },
    {
      title: 'Performing Arts Stage',
      category: 'Creativity',
      description: 'Music, theatre, spoken word, and public showcases that build confidence and expression.',
    },
    {
      title: 'Sports and Wellness Zone',
      category: 'Wellbeing',
      description: 'Athletics, structured practice, teamwork culture, and healthy student routines.',
    },
    {
      title: 'Library and Research Lounge',
      category: 'Academics',
      description: 'Quiet research spaces, reading culture, mentorship corners, and collaborative study.',
    },
    {
      title: 'Student Community Moments',
      category: 'Life At Gurukul',
      description: 'Celebrations, leadership activities, service learning, and peer connection across the year.',
    },
  ],
  templateTwoContactEyebrow: 'Contact And Enquiry',
  templateTwoContactTitle: 'Bring families from inspiration to conversation.',
  templateTwoContactDescription:
    'The final section focuses on quick contact clarity: where to reach you, how to visit, and how to move into the admissions flow without friction.',
  templateTwoContactItems: [
    {
      title: 'Admissions Email',
      value: 'admissions@gurukul.edu',
      description: 'For application support, counselling, scholarship discussions, and campus visit coordination.',
    },
    {
      title: 'Call The Team',
      value: '+91 98765 43210',
      description: 'Talk with the admissions desk for immediate guidance on eligibility, documents, and timings.',
    },
    {
      title: 'Visit The Campus',
      value: 'Knowledge Park, Main Academic Block',
      description: 'Schedule an in-person walkthrough to explore classrooms, labs, activity zones, and student services.',
    },
  ],
  templateTwoContactPrimaryCta: 'Book A Campus Tour',
  templateTwoContactSecondaryCta: 'Open Student Portal',
  templateFourTopPhone: '+91 98765 43210',
  templateFourTopEmail: 'info@gurukul.edu',
  templateFourTopAddress: 'Knowledge Park Road, Main Campus, Gurukul City',
  templateFourHeroEyebrow: 'Classic School Website',
  templateFourHeroTitle: 'A timeless school experience with warmth, discipline, and visible student growth.',
  templateFourHeroDescription:
    'Template 4 brings a colorful classic school identity with a trusted header, tab-style navigation, dedicated sections for about, gallery, events, contact, and a strong path to the admission form.',
  templateFourHeroPrimaryCta: 'Explore Campus Life',
  templateFourHeroSecondaryCta: 'Open Admission Form',
  templateFourNoticeLabel: 'Principal Notice',
  templateFourNoticeText: 'Admissions are open and campus visits are available on all working days from 9:00 AM to 1:00 PM.',
  templateFourAboutTitle: 'A classic learning environment built on values and academic confidence.',
  templateFourAboutDescription:
    'This template is ideal for schools that want to look established, welcoming, and organized, while still using bright colors, classic structure, and clear navigation for families.',
  templateFourAboutCards: [
    {
      title: 'Strong traditions',
      description: 'A disciplined academic culture with respectful values, routines, and student mentoring.',
    },
    {
      title: 'Colorful navigation',
      description: 'Bright classic tabs highlight each section so parents and students can browse with ease.',
    },
    {
      title: 'Admissions clarity',
      description: 'The design keeps contact information visible and makes the admission journey easy to find.',
    },
  ],
  templateFourGalleryTitle: 'Campus moments, celebrations, and school life in one welcoming gallery.',
  templateFourGalleryDescription:
    'Use the gallery to showcase assembly days, classrooms, sports, annual functions, and the everyday atmosphere of your school.',
  templateFourGalleryItems: [
    {
      category: 'Campus',
      title: 'Morning Assembly',
      description: 'Daily gatherings that reflect discipline, culture, and the school community spirit.',
    },
    {
      category: 'Academics',
      title: 'Interactive Classrooms',
      description: 'Bright learning spaces where teachers guide students through structured academic growth.',
    },
    {
      category: 'Events',
      title: 'Annual Celebrations',
      description: 'Cultural events, achievements, and performances that bring families and students together.',
    },
    {
      category: 'Sports',
      title: 'Playground Highlights',
      description: 'Team games, practice sessions, and student participation beyond the classroom.',
    },
  ],
  templateFourEventsTitle: 'Events and announcements that keep the school community informed.',
  templateFourEventsDescription:
    'Promote school events, admission dates, celebrations, competitions, open houses, and academic milestones in a classic newsboard format.',
  templateFourEvents: [
    {
      title: 'Summer Admission Counselling Week',
      detail: 'Meet the admissions team for guidance on class selection, documents, and scholarship support.',
    },
    {
      title: 'Annual Cultural Celebration',
      detail: 'A full-day program of performances, awards, and student showcases for families and guests.',
    },
    {
      title: 'Parent Interaction Session',
      detail: 'A structured school-family meeting focused on progress, wellbeing, and academic expectations.',
    },
  ],
  templateFourContactTitle: 'Reach the school office, admissions team, and campus desk easily.',
  templateFourContactDescription:
    'Keep your contact channels visible with a classic information section that supports calls, visits, and direct enquiries.',
  templateFourContactItems: [
    {
      title: 'School Office',
      value: '+91 98765 43210',
      description: 'For timings, school office help, and general parent enquiries.',
    },
    {
      title: 'Admissions Desk',
      value: 'admissions@gurukul.edu',
      description: 'For admissions, form guidance, documents, and counselling support.',
    },
    {
      title: 'Campus Address',
      value: 'Knowledge Park Road, Main Campus',
      description: 'Visit the campus for in-person counselling, office support, and school tours.',
    },
  ],
  templateFourMapEmbedUrl: 'https://www.google.com/maps?q=Knowledge%20Park%20Road%2C%20Main%20Campus&z=15&output=embed',
};

const sharedContentKeys = [
  'seoTitle',
  'brandName',
  'brandSubtitle',
  'brandLogo',
  'navAbout',
  'navPrograms',
  'navCampus',
  'navAdmissions',
  'navGallery',
  'navContact',
  'loginLabel',
  'applyNowLabel',
] as const satisfies ReadonlyArray<keyof WebsiteSharedContent>;

const template1ContentKeys = [
  'heroBadge',
  'heroTitleLineOne',
  'heroTitleAccent',
  'heroDescription',
  'heroPrimaryCta',
  'heroSecondaryCta',
  'highlights',
  'featureEyebrow',
  'featureTitle',
  'features',
  'openHouseLabel',
  'openHouseDescription',
  'openHouseDate',
  'liveOverviewValue',
  'liveOverviewLabel',
  'aboutEyebrow',
  'aboutTitle',
  'aboutDescription',
  'pillars',
  'programsEyebrow',
  'programsTitle',
  'programsDescription',
  'programs',
  'campusEyebrow',
  'campusTitle',
  'campusDescription',
  'campusStats',
  'newsEyebrow',
  'news',
  'outcomesEyebrow',
  'outcomesTitle',
  'outcomesDescription',
  'outcomes',
  'journeyEyebrow',
  'journeyTitle',
  'journeyDescription',
  'journeySteps',
  'voicesEyebrow',
  'voicesTitle',
  'testimonials',
  'visitEyebrow',
  'visitTitle',
  'visitPointOneTitle',
  'visitPointOneText',
  'visitPointTwoTitle',
  'visitPointTwoText',
  'visitPointThreeTitle',
  'visitPointThreeText',
  'visitPrimaryCta',
  'visitSecondaryCta',
  'faqEyebrow',
  'faqTitle',
  'faqs',
  'admissionsEyebrow',
  'admissionsTitle',
  'admissionsDescription',
  'admissionsPointOne',
  'admissionsPointTwo',
  'admissionsEmail',
  'admissionsContactButton',
  'admissionsPortalButton',
  'admissionsFormTitle',
  'admissionsFormIntro',
] as const satisfies ReadonlyArray<keyof WebsiteContent>;

const template2ContentKeys = [
  'highlights',
  'admissionsEyebrow',
  'admissionsTitle',
  'admissionsDescription',
  'admissionsPointOne',
  'admissionsPointTwo',
  'admissionsEmail',
  'admissionsContactButton',
  'admissionsPortalButton',
  'admissionsFormTitle',
  'admissionsFormIntro',
  'templateTwoHeroEyebrow',
  'templateTwoHeroTitle',
  'templateTwoHeroDescription',
  'templateTwoHeroPrimaryCta',
  'templateTwoHeroSecondaryCta',
  'templateTwoHeroFloatingLabel',
  'templateTwoSlides',
  'templateTwoAboutEyebrow',
  'templateTwoAboutTitle',
  'templateTwoAboutDescription',
  'templateTwoAboutCards',
  'templateTwoGalleryEyebrow',
  'templateTwoGalleryTitle',
  'templateTwoGalleryDescription',
  'templateTwoGalleryItems',
  'templateTwoContactEyebrow',
  'templateTwoContactTitle',
  'templateTwoContactDescription',
  'templateTwoContactItems',
  'templateTwoContactPrimaryCta',
  'templateTwoContactSecondaryCta',
] as const satisfies ReadonlyArray<keyof WebsiteContent>;

const template3ContentKeys = [
  'heroBadge',
  'heroTitleLineOne',
  'heroTitleAccent',
  'heroDescription',
  'heroPrimaryCta',
  'heroSecondaryCta',
  'highlights',
  'featureEyebrow',
  'featureTitle',
  'openHouseLabel',
  'openHouseDescription',
  'openHouseDate',
  'liveOverviewValue',
  'liveOverviewLabel',
  'aboutEyebrow',
  'aboutTitle',
  'aboutDescription',
  'pillars',
  'programsEyebrow',
  'programsTitle',
  'programsDescription',
  'programs',
  'campusEyebrow',
  'campusTitle',
  'campusDescription',
  'campusStats',
  'newsEyebrow',
  'news',
  'outcomesEyebrow',
  'outcomesTitle',
  'outcomesDescription',
  'outcomes',
  'journeyEyebrow',
  'journeyTitle',
  'journeyDescription',
  'journeySteps',
  'voicesEyebrow',
  'voicesTitle',
  'testimonials',
  'visitEyebrow',
  'visitTitle',
  'visitPointOneTitle',
  'visitPointOneText',
  'visitPointTwoTitle',
  'visitPointTwoText',
  'visitPointThreeTitle',
  'visitPointThreeText',
  'visitPrimaryCta',
  'visitSecondaryCta',
  'admissionsEyebrow',
  'admissionsTitle',
  'admissionsDescription',
  'admissionsPointOne',
  'admissionsPointTwo',
  'admissionsEmail',
  'admissionsContactButton',
  'admissionsPortalButton',
  'admissionsFormTitle',
  'admissionsFormIntro',
] as const satisfies ReadonlyArray<keyof WebsiteContent>;

const template4ContentKeys = [
  'templateFourTopPhone',
  'templateFourTopEmail',
  'templateFourTopAddress',
  'templateFourHeroEyebrow',
  'templateFourHeroTitle',
  'templateFourHeroDescription',
  'templateFourHeroPrimaryCta',
  'templateFourHeroSecondaryCta',
  'templateFourNoticeLabel',
  'templateFourNoticeText',
  'templateFourAboutTitle',
  'templateFourAboutDescription',
  'templateFourAboutCards',
  'templateFourGalleryTitle',
  'templateFourGalleryDescription',
  'templateFourGalleryItems',
  'templateFourEventsTitle',
  'templateFourEventsDescription',
  'templateFourEvents',
  'templateFourContactTitle',
  'templateFourContactDescription',
  'templateFourContactItems',
  'templateFourMapEmbedUrl',
  'admissionsEyebrow',
  'admissionsTitle',
  'admissionsDescription',
  'admissionsPointOne',
  'admissionsPointTwo',
  'admissionsEmail',
  'admissionsContactButton',
  'admissionsPortalButton',
  'admissionsFormTitle',
  'admissionsFormIntro',
  'highlights',
] as const satisfies ReadonlyArray<keyof WebsiteContent>;

const STORAGE_KEY = 'website_cms_content';

function normalizeWebsiteTheme(theme?: string): WebsiteThemeKey {
  if (theme === 'ivory') {
    return 'white';
  }

  if (theme === 'aurora' || theme === 'sunrise' || theme === 'emerald' || theme === 'white') {
    return theme;
  }

  return defaultWebsiteContent.theme;
}

function normalizeWebsiteTemplate(template?: string): WebsiteTemplateKey {
  if (template === 'template1' || template === 'template2' || template === 'template3' || template === 'template4') {
    return template;
  }

  return defaultWebsiteContent.activeTemplate;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickWebsiteValues<T extends object, K extends readonly (keyof T)[]>(source: T, keys: K): Pick<T, K[number]> {
  const result = {} as Pick<T, K[number]>;

  keys.forEach((key) => {
    result[key] = source[key];
  });

  return result;
}

function normalizeLegacyWebsiteContent(content?: Partial<WebsiteContent> | null): WebsiteContent {
  const parsed = content ?? {};

  return {
    ...defaultWebsiteContent,
    ...parsed,
    activeTemplate: normalizeWebsiteTemplate(parsed.activeTemplate),
    theme: normalizeWebsiteTheme(parsed.theme),
    sliderImages: Array.isArray(parsed.sliderImages)
      ? parsed.sliderImages.filter((item): item is string => typeof item === 'string' && item.length > 0)
      : defaultWebsiteContent.sliderImages,
    highlights: parsed.highlights || defaultWebsiteContent.highlights,
    features: parsed.features || defaultWebsiteContent.features,
    programs: parsed.programs || defaultWebsiteContent.programs,
    pillars: parsed.pillars || defaultWebsiteContent.pillars,
    campusStats: parsed.campusStats || defaultWebsiteContent.campusStats,
    news: parsed.news || defaultWebsiteContent.news,
    outcomes: parsed.outcomes || defaultWebsiteContent.outcomes,
    journeySteps: parsed.journeySteps || defaultWebsiteContent.journeySteps,
    testimonials: parsed.testimonials || defaultWebsiteContent.testimonials,
    faqs: parsed.faqs || defaultWebsiteContent.faqs,
    templateTwoSlides: parsed.templateTwoSlides || defaultWebsiteContent.templateTwoSlides,
    templateTwoAboutCards: parsed.templateTwoAboutCards || defaultWebsiteContent.templateTwoAboutCards,
    templateTwoGalleryItems: parsed.templateTwoGalleryItems || defaultWebsiteContent.templateTwoGalleryItems,
    templateTwoContactItems: parsed.templateTwoContactItems || defaultWebsiteContent.templateTwoContactItems,
  };
}

export function normalizeWebsiteCmsContent(
  content?: Partial<WebsiteContent> | Partial<WebsiteCmsContent> | null
): WebsiteCmsContent {
  const parsed = content ?? {};
  const legacyContent = normalizeLegacyWebsiteContent(parsed as Partial<WebsiteContent>);
  const sharedOverrides = isRecord((parsed as Partial<WebsiteCmsContent>).shared)
    ? normalizeLegacyWebsiteContent((parsed as Partial<WebsiteCmsContent>).shared as Partial<WebsiteContent>)
    : null;
  const templateOneOverrides = isRecord((parsed as Partial<WebsiteCmsContent>).template1)
    ? normalizeLegacyWebsiteContent((parsed as Partial<WebsiteCmsContent>).template1 as Partial<WebsiteContent>)
    : null;
  const templateTwoOverrides = isRecord((parsed as Partial<WebsiteCmsContent>).template2)
    ? normalizeLegacyWebsiteContent((parsed as Partial<WebsiteCmsContent>).template2 as Partial<WebsiteContent>)
    : null;
  const templateThreeOverrides = isRecord((parsed as Partial<WebsiteCmsContent>).template3)
    ? normalizeLegacyWebsiteContent((parsed as Partial<WebsiteCmsContent>).template3 as Partial<WebsiteContent>)
    : null;
  const templateFourOverrides = isRecord((parsed as Partial<WebsiteCmsContent>).template4)
    ? normalizeLegacyWebsiteContent((parsed as Partial<WebsiteCmsContent>).template4 as Partial<WebsiteContent>)
    : null;

  return {
    activeTemplate: normalizeWebsiteTemplate((parsed as Partial<WebsiteCmsContent>).activeTemplate),
    theme: normalizeWebsiteTheme((parsed as Partial<WebsiteCmsContent>).theme),
    sliderImages: Array.isArray((parsed as Partial<WebsiteCmsContent>).sliderImages)
      ? ((parsed as Partial<WebsiteCmsContent>).sliderImages as unknown[]).filter(
          (item): item is string => typeof item === 'string' && item.length > 0
        )
      : legacyContent.sliderImages,
    shared: {
      ...pickWebsiteValues(defaultWebsiteContent, sharedContentKeys),
      ...pickWebsiteValues(legacyContent, sharedContentKeys),
      ...(sharedOverrides ? pickWebsiteValues(sharedOverrides, sharedContentKeys) : {}),
    },
    template1: {
      ...pickWebsiteValues(legacyContent, template1ContentKeys),
      ...(templateOneOverrides ? pickWebsiteValues(templateOneOverrides, template1ContentKeys) : {}),
    },
    template2: {
      ...pickWebsiteValues(legacyContent, template2ContentKeys),
      ...(templateTwoOverrides ? pickWebsiteValues(templateTwoOverrides, template2ContentKeys) : {}),
    },
    template3: {
      ...pickWebsiteValues(legacyContent, template3ContentKeys),
      ...(templateThreeOverrides ? pickWebsiteValues(templateThreeOverrides, template3ContentKeys) : {}),
    },
    template4: {
      ...pickWebsiteValues(legacyContent, template4ContentKeys),
      ...(templateFourOverrides ? pickWebsiteValues(templateFourOverrides, template4ContentKeys) : {}),
    },
  };
}

export function normalizeWebsiteContent(
  content?: Partial<WebsiteContent> | Partial<WebsiteCmsContent> | null,
  templateOverride?: WebsiteTemplateKey
): WebsiteContent {
  const cmsContent = normalizeWebsiteCmsContent(content);
  const templateKey = templateOverride ?? cmsContent.activeTemplate;
  const templateContent =
    templateKey === 'template2'
      ? cmsContent.template2
      : templateKey === 'template3'
        ? cmsContent.template3
        : templateKey === 'template4'
          ? cmsContent.template4
        : cmsContent.template1;

  return normalizeLegacyWebsiteContent({
    activeTemplate: cmsContent.activeTemplate,
    theme: cmsContent.theme,
    sliderImages: cmsContent.sliderImages,
    ...cmsContent.shared,
    ...templateContent,
  });
}

export function getWebsiteContent(): WebsiteContent {
  if (typeof window === 'undefined') {
    return defaultWebsiteContent;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultWebsiteContent;
    }

    const parsed = JSON.parse(raw) as Partial<WebsiteContent> | Partial<WebsiteCmsContent>;

    return normalizeWebsiteContent(parsed);
  } catch {
    return defaultWebsiteContent;
  }
}

export function saveWebsiteContent(content: WebsiteContent | WebsiteCmsContent) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
}
