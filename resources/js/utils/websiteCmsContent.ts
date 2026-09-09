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
    image?: string;
};

export type WebsiteMenuItem = {
    label: string;
    url: string;
    pageSlug?: string;
    children?: WebsiteMenuItem[];
};

export type WebsiteFooterColumn = {
    title: string;
    links: Array<{ label: string; url: string }>;
};

export type WebsiteDepartment = {
    title: string;
    description: string;
};

export type WebsiteAchievement = {
    value: string;
    label: string;
};

export type WebsiteMarqueeItem = {
    text: string;
    url: string;
};

export type WebsiteContactItem = {
    title: string;
    value: string;
    description: string;
};

export type WebsiteThemeKey = 'white' | 'aurora' | 'sunrise' | 'emerald';
export type WebsiteTemplateKey = 'template1' | 'template2' | 'template3' | 'template4' | 'template5';

export type WebsiteContent = {
    activeTemplate: WebsiteTemplateKey;
    theme: WebsiteThemeKey;
    sliderImages: string[];
    seoTitle: string;
    brandName: string;
    brandSubtitle: string;
    brandLogo: string;
    schoolName: string;
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
    templateFiveTopPhone: string;
    templateFiveTopEmail: string;
    templateFiveTopAddress: string;
    templateFiveSocialFacebook: string;
    templateFiveSocialTwitter: string;
    templateFiveSocialYoutube: string;
    templateFiveSocialInstagram: string;
    templateFiveMarqueeItems: WebsiteMarqueeItem[];
    templateFiveHeroTitle: string;
    templateFiveHeroSubtitle: string;
    templateFiveHeroDescription: string;
    templateFivePrincipalName: string;
    templateFivePrincipalDesignation: string;
    templateFivePrincipalMessage: string;
    templateFivePrincipalImage: string;
    templateFiveSecretaryName: string;
    templateFiveSecretaryDesignation: string;
    templateFiveSecretaryMessage: string;
    templateFiveSecretaryImage: string;
    templateFiveAboutTitle: string;
    templateFiveAboutDescription: string;
    templateFiveAboutImage: string;
    templateFiveDepartments: WebsiteDepartment[];
    templateFiveAchievements: WebsiteAchievement[];
    templateFiveWhyChooseUs: WebsiteCard[];
    templateFiveTestimonials: WebsiteTestimonial[];
    templateFiveEvents: WebsiteNews[];
    templateFiveNews: WebsiteNews[];
    templateFiveGalleryTitle: string;
    templateFiveGalleryDescription: string;
    templateFiveGalleryItems: WebsiteGalleryItem[];
    templateFiveContactTitle: string;
    templateFiveContactDescription: string;
    templateFiveContactItems: WebsiteContactItem[];
    templateFiveMapEmbedUrl: string;
    templateFiveShowAccreditedBadge: boolean;
    templateFiveAccreditedBadgeLabel: string;
    templateFiveAccreditedBadgeGrade: string;
    templateFiveShowLoginButton: boolean;
    templateFiveShowAdmissionButton: boolean;
    templateFiveMainMenuItems: WebsiteMenuItem[];
    templateFiveFooterColumns: WebsiteFooterColumn[];
    templateFiveFooterCopyright: string;
    templateFiveFooterTagline: string;
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
    template5: Partial<WebsiteContent>;
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
        pageBackground: 'bg-[linear-gradient(180deg,#f0f9ff_0%,#f8fbff_28%,#f6f8fc_58%,#eef4ff_100%)]',
        ambientBackground:
            'bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_24%),radial-gradient(circle_at_20%_12%,_rgba(14,165,233,0.1),_transparent_20%),radial-gradient(circle_at_85%_10%,_rgba(59,130,246,0.12),_transparent_18%),radial-gradient(circle_at_80%_35%,_rgba(99,102,241,0.1),_transparent_20%)]',
        leftGlow: 'bg-sky-300/30',
        rightGlow: 'bg-blue-200/40',
        heroBadge: 'border-sky-200 bg-white/90 text-sky-800 shadow-[0_12px_30px_rgba(59,130,246,0.12)]',
        primaryButton:
            'bg-[linear-gradient(135deg,#0f172a,#2563eb)] text-white shadow-[0_18px_50px_rgba(37,99,235,0.24)]',
        secondaryButton: 'border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300 hover:bg-white',
        topActionButton:
            'bg-[linear-gradient(135deg,#2563EB,#1d4ed8)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.2)]',
        logoBadgeText: 'text-sky-700',
        featureIcon: 'bg-[linear-gradient(135deg,#dbeafe,#dbeafe)] text-slate-800 shadow-sky-200/60',
        spotlightPanel:
            'bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(239,246,255,0.92),rgba(239,246,255,0.88))]',
        spotlightInner: 'bg-[linear-gradient(160deg,#ffffff_0%,#f8fbff_52%,#eef4ff_100%)]',
        openHousePanel: 'bg-[linear-gradient(135deg,rgba(219,234,254,0.92),rgba(219,234,254,0.72))]',
        liveOverviewCard: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.88))]',
        aboutPanel: 'bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(239,246,255,0.92),rgba(239,246,255,0.88))]',
        pillarIcon: 'bg-[linear-gradient(135deg,#dbeafe,#bfdbfe)] text-slate-800 shadow-sky-200/60',
        programEven: 'border-blue-200/70 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.92))]',
        programOdd: 'border-sky-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.92))]',
        campusPanel:
            'bg-[linear-gradient(135deg,rgba(239,246,255,0.92),rgba(239,246,255,0.95),rgba(255,255,255,0.94))]',
        newsPanel: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.92))]',
        admissionsPanel:
            'bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(239,246,255,0.94),rgba(239,246,255,0.9),rgba(255,255,255,0.98))]',
        admissionsButton: 'bg-[linear-gradient(135deg,#0f172a,#2563eb)] text-white',
        admissionsFormButton:
            'bg-[linear-gradient(135deg,#0f172a,#2563eb,#0ea5e9)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.22)]',
    },
    aurora: {
        name: 'Aurora',
        description: 'Soft cyan and blue accents on a clean white background.',
        pageBackground: 'bg-[linear-gradient(180deg,#f0fdfa_0%,#f8fbff_28%,#f6f8fc_58%,#eef4ff_100%)]',
        ambientBackground:
            'bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_24%),radial-gradient(circle_at_20%_12%,_rgba(96,165,250,0.1),_transparent_20%),radial-gradient(circle_at_85%_10%,_rgba(59,130,246,0.12),_transparent_18%),radial-gradient(circle_at_80%_35%,_rgba(168,85,247,0.1),_transparent_20%)]',
        leftGlow: 'bg-cyan-200/40',
        rightGlow: 'bg-blue-200/40',
        heroBadge: 'border-cyan-200 bg-white/90 text-cyan-800 shadow-[0_12px_30px_rgba(34,211,238,0.12)]',
        primaryButton:
            'bg-[linear-gradient(135deg,#0891b2,#2563eb)] text-white shadow-[0_18px_50px_rgba(34,211,238,0.24)]',
        secondaryButton: 'border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300 hover:bg-white',
        topActionButton:
            'bg-[linear-gradient(135deg,#2563EB,#1d4ed8)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.2)]',
        logoBadgeText: 'text-cyan-700',
        featureIcon: 'bg-[linear-gradient(135deg,#cffafe,#dbeafe)] text-slate-800 shadow-cyan-200/60',
        spotlightPanel:
            'bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(240,253,250,0.92),rgba(239,246,255,0.88))]',
        spotlightInner: 'bg-[linear-gradient(160deg,#ffffff_0%,#f0fdfa_52%,#ecfeff_100%)]',
        openHousePanel: 'bg-[linear-gradient(135deg,rgba(207,250,254,0.92),rgba(219,234,254,0.72))]',
        liveOverviewCard: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,253,250,0.88))]',
        aboutPanel: 'bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(240,253,250,0.92),rgba(239,246,255,0.88))]',
        pillarIcon: 'bg-[linear-gradient(135deg,#cffafe,#a5f3fc)] text-slate-800 shadow-cyan-200/60',
        programEven: 'border-cyan-200/70 bg-[linear-gradient(180deg,rgba(240,253,250,0.96),rgba(255,255,255,0.92))]',
        programOdd: 'border-blue-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.92))]',
        campusPanel:
            'bg-[linear-gradient(135deg,rgba(240,253,250,0.92),rgba(236,253,245,0.95),rgba(255,255,255,0.94))]',
        newsPanel: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.92))]',
        admissionsPanel:
            'bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(240,253,250,0.94),rgba(239,246,255,0.9),rgba(255,255,255,0.98))]',
        admissionsButton: 'bg-[linear-gradient(135deg,#0891b2,#2563eb)] text-white',
        admissionsFormButton:
            'bg-[linear-gradient(135deg,#0891b2,#2563eb,#0ea5e9)] text-white shadow-[0_18px_40px_rgba(34,211,238,0.22)]',
    },
    sunrise: {
        name: 'Sunrise',
        description: 'Clean blue and slate accents on a bright white background.',
        pageBackground: 'bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_24%,#e2e8f0_55%,#dbeafe_100%)]',
        ambientBackground:
            'bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_24%),radial-gradient(circle_at_20%_12%,_rgba(99,102,241,0.1),_transparent_20%),radial-gradient(circle_at_85%_10%,_rgba(59,130,246,0.12),_transparent_18%),radial-gradient(circle_at_80%_35%,_rgba(37,99,235,0.1),_transparent_20%)]',
        leftGlow: 'bg-blue-200/40',
        rightGlow: 'bg-indigo-200/40',
        heroBadge: 'border-blue-200 bg-white/90 text-blue-800 shadow-[0_12px_30px_rgba(59,130,246,0.12)]',
        primaryButton:
            'bg-[linear-gradient(135deg,#1d4ed8,#2563eb)] text-white shadow-[0_18px_50px_rgba(37,99,235,0.24)]',
        secondaryButton: 'border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300 hover:bg-white',
        topActionButton:
            'bg-[linear-gradient(135deg,#2563EB,#1d4ed8)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.2)]',
        logoBadgeText: 'text-blue-700',
        featureIcon: 'bg-[linear-gradient(135deg,#dbeafe,#e0e7ff)] text-slate-800 shadow-blue-200/60',
        spotlightPanel:
            'bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(239,246,255,0.92),rgba(224,231,255,0.88))]',
        spotlightInner: 'bg-[linear-gradient(160deg,#ffffff_0%,#eff6ff_52%,#dbeafe_100%)]',
        openHousePanel: 'bg-[linear-gradient(135deg,rgba(219,234,254,0.92),rgba(224,231,255,0.72))]',
        liveOverviewCard: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.88))]',
        aboutPanel: 'bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(239,246,255,0.92),rgba(224,231,255,0.88))]',
        pillarIcon: 'bg-[linear-gradient(135deg,#dbeafe,#c7d2fe)] text-slate-800 shadow-blue-200/60',
        programEven: 'border-blue-200/70 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.92))]',
        programOdd: 'border-indigo-200/80 bg-[linear-gradient(180deg,rgba(224,231,255,0.96),rgba(255,255,255,0.92))]',
        campusPanel:
            'bg-[linear-gradient(135deg,rgba(239,246,255,0.92),rgba(224,231,255,0.95),rgba(255,255,255,0.94))]',
        newsPanel: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.92))]',
        admissionsPanel:
            'bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(239,246,255,0.94),rgba(224,231,255,0.9),rgba(255,255,255,0.98))]',
        admissionsButton: 'bg-[linear-gradient(135deg,#1d4ed8,#2563eb)] text-white',
        admissionsFormButton:
            'bg-[linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.22)]',
    },
    emerald: {
        name: 'Emerald',
        description: 'Fresh green and teal accents on a clean white background.',
        pageBackground: 'bg-[linear-gradient(180deg,#f0fdf4_0%,#f0fdfa_28%,#ecfdf5_58%,#f0f9ff_100%)]',
        ambientBackground:
            'bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.12),_transparent_24%),radial-gradient(circle_at_20%_12%,_rgba(45,212,191,0.1),_transparent_20%),radial-gradient(circle_at_85%_10%,_rgba(132,204,22,0.12),_transparent_18%),radial-gradient(circle_at_80%_35%,_rgba(16,185,129,0.1),_transparent_20%)]',
        leftGlow: 'bg-emerald-200/40',
        rightGlow: 'bg-teal-200/40',
        heroBadge: 'border-emerald-200 bg-white/90 text-emerald-800 shadow-[0_12px_30px_rgba(52,211,153,0.12)]',
        primaryButton:
            'bg-[linear-gradient(135deg,#059669,#0d9488)] text-white shadow-[0_18px_50px_rgba(52,211,153,0.24)]',
        secondaryButton: 'border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300 hover:bg-white',
        topActionButton:
            'bg-[linear-gradient(135deg,#2563EB,#1d4ed8)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.2)]',
        logoBadgeText: 'text-emerald-700',
        featureIcon: 'bg-[linear-gradient(135deg,#d1fae5,#ccfbf1)] text-slate-800 shadow-emerald-200/60',
        spotlightPanel:
            'bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(240,253,244,0.92),rgba(240,253,250,0.88))]',
        spotlightInner: 'bg-[linear-gradient(160deg,#ffffff_0%,#f0fdf4_52%,#ecfdf5_100%)]',
        openHousePanel: 'bg-[linear-gradient(135deg,rgba(209,250,229,0.92),rgba(204,251,241,0.72))]',
        liveOverviewCard: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,253,244,0.88))]',
        aboutPanel: 'bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(240,253,244,0.92),rgba(240,253,250,0.88))]',
        pillarIcon: 'bg-[linear-gradient(135deg,#d1fae5,#99f6e4)] text-slate-800 shadow-emerald-200/60',
        programEven: 'border-emerald-200/70 bg-[linear-gradient(180deg,rgba(240,253,244,0.96),rgba(255,255,255,0.92))]',
        programOdd: 'border-teal-200/80 bg-[linear-gradient(180deg,rgba(240,253,250,0.96),rgba(255,255,255,0.92))]',
        campusPanel:
            'bg-[linear-gradient(135deg,rgba(240,253,244,0.92),rgba(240,253,250,0.95),rgba(255,255,255,0.94))]',
        newsPanel: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(240,253,244,0.92))]',
        admissionsPanel:
            'bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(240,253,244,0.94),rgba(240,253,250,0.9),rgba(255,255,255,0.98))]',
        admissionsButton: 'bg-[linear-gradient(135deg,#059669,#0d9488)] text-white',
        admissionsFormButton:
            'bg-[linear-gradient(135deg,#059669,#0d9488,#10b981)] text-white shadow-[0_18px_40px_rgba(52,211,153,0.22)]',
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
    schoolName: 'Gurukul',
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
        {
            title: 'Safe campus',
            text: 'Secure entry, attentive staff, and student wellbeing at the center.',
        },
        {
            title: 'Transport network',
            text: 'Reliable route coverage with disciplined supervision and updates.',
        },
        {
            title: 'Beyond classrooms',
            text: 'Sports, arts, innovation cells, seminars, competitions, and talent development.',
        },
        {
            title: 'Family and student partnership',
            text: 'Transparent communication, progress visibility, and strong trust across every stage.',
        },
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
            description:
                'Strong academics, lab learning, exam preparation, clubs, competitions, and leadership building.',
        },
        {
            title: 'Undergraduate Programs',
            age: 'College Degrees',
            description:
                'Career-focused programs with practical labs, seminars, mentoring, and skill-based learning pathways.',
        },
        {
            title: 'Professional and Career Pathways',
            age: 'Diploma and Advanced Learning',
            description:
                'Industry exposure, internships, research support, and readiness for higher studies and careers.',
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
        {
            title: 'Admissions open for 2026-27',
            detail: 'Campus tours, counseling sessions, and scholarship guidance for school and college applicants.',
        },
        {
            title: 'Innovation and Research Week',
            detail: 'Student-led robotics, coding, research posters, and sustainability exhibits across departments.',
        },
        {
            title: 'University and competitive exam mentoring',
            detail: 'Guided support for board exams, entrance pathways, placements, and academic progression.',
        },
    ],
    outcomesEyebrow: 'Outcomes',
    outcomesTitle: 'A campus designed to move students from potential to proof.',
    outcomesDescription:
        'The Gurukul experience is built around measurable academic growth, stronger confidence, and real readiness for competitive futures.',
    outcomes: [
        {
            title: 'Board and university readiness',
            description:
                'Structured mentoring, diagnostic assessments, and disciplined routines prepare learners for high-stakes milestones.',
        },
        {
            title: 'Future pathways and career exposure',
            description:
                'Students build portfolios through labs, seminars, competitions, internships, and guided career exploration.',
        },
        {
            title: 'Wellbeing with accountability',
            description:
                'We balance high expectations with pastoral support, parent communication, and strong safety systems.',
        },
        {
            title: 'Leadership and communication',
            description:
                'Public speaking, clubs, service learning, and team projects help learners grow real confidence.',
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
            description:
                'Families explore academics, student life, facilities, and admissions options through guided tours and counseling.',
        },
        {
            step: '02',
            title: 'Choose the right pathway',
            description:
                'We help match the learner stage, academic goals, and program interests with the right Gurukul track.',
        },
        {
            step: '03',
            title: 'Build confidence early',
            description:
                'From orientation to classroom integration, students settle into a structured and encouraging learning environment.',
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
    visitPointOneText:
        'Knowledge Park campus with dedicated academic blocks, labs, event spaces, and student activity zones.',
    visitPointTwoTitle: 'Admissions guidance',
    visitPointTwoText:
        'Get help on program selection, scholarship discussions, required documents, and next-step planning.',
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
            description:
                'Blended teaching environments, presentation walls, collaboration pods, and mentor-led active learning.',
            metric: '28 smart zones',
        },
        {
            eyebrow: 'Research Studios',
            title: 'Hands-on labs that turn curiosity into projects',
            description:
                'Science, robotics, design, and technical experimentation come together in one future-ready floor.',
            metric: '14 advanced labs',
        },
        {
            eyebrow: 'Creative Arena',
            title: 'Performance, media, and maker culture in motion',
            description:
                'Students learn to present, perform, build, and publish with confidence across clubs and showcases.',
            metric: '22 creator clubs',
        },
        {
            eyebrow: 'Student Life',
            title: 'A campus atmosphere that feels ambitious and welcoming',
            description:
                'Wellbeing, events, sports, and social belonging are designed into everyday student experience.',
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
            description:
                'Layered cards, perspective transforms, and floating motion give the homepage a stronger first impression.',
        },
        {
            title: 'Admissions-ready structure',
            description:
                'About, gallery, and contact sections are arranged to support trust-building and stronger enquiries.',
        },
        {
            title: 'CMS editable',
            description:
                'Every major headline, slide, gallery card, and contact block can be updated from the Website CMS.',
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
            description:
                'For application support, counselling, scholarship discussions, and campus visit coordination.',
        },
        {
            title: 'Call The Team',
            value: '+91 98765 43210',
            description: 'Talk with the admissions desk for immediate guidance on eligibility, documents, and timings.',
        },
        {
            title: 'Visit The Campus',
            value: 'Knowledge Park, Main Academic Block',
            description:
                'Schedule an in-person walkthrough to explore classrooms, labs, activity zones, and student services.',
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
    templateFourNoticeText:
        'Admissions are open and campus visits are available on all working days from 9:00 AM to 1:00 PM.',
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
            image: '',
        },
        {
            category: 'Academics',
            title: 'Interactive Classrooms',
            description: 'Bright learning spaces where teachers guide students through structured academic growth.',
            image: '',
        },
        {
            category: 'Events',
            title: 'Annual Celebrations',
            description: 'Cultural events, achievements, and performances that bring families and students together.',
            image: '',
        },
        {
            category: 'Sports',
            title: 'Playground Highlights',
            description: 'Team games, practice sessions, and student participation beyond the classroom.',
            image: '',
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
    templateFourMapEmbedUrl:
        'https://www.google.com/maps?q=Knowledge%20Park%20Road%2C%20Main%20Campus&z=15&output=embed',
    templateFiveTopPhone: '+91 98765 43210',
    templateFiveTopEmail: 'info@gurukul.edu',
    templateFiveTopAddress: 'Knowledge Park Road, Main Campus, Gurukul City',
    templateFiveSocialFacebook: 'https://facebook.com/gurukul',
    templateFiveSocialTwitter: 'https://twitter.com/gurukul',
    templateFiveSocialYoutube: 'https://youtube.com/gurukul',
    templateFiveSocialInstagram: 'https://instagram.com/gurukul',
    templateFiveMarqueeItems: [
        {
            text: 'Admissions are open for the 2026-27 academic year',
            url: '/admissions/apply',
        },
        { text: 'Campus visits available on all working days', url: '' },
        { text: 'Annual day celebration on 15th August 2026', url: '' },
    ],
    templateFiveHeroTitle: 'Empowering Minds, Shaping Futures',
    templateFiveHeroSubtitle: 'A Legacy of Academic Excellence Since 1979',
    templateFiveHeroDescription:
        'Gurukul provides quality education to students from diverse backgrounds through dedicated faculty, modern infrastructure, and a commitment to holistic development.',
    templateFivePrincipalName: 'Dr. Ashok Eknath Kalange',
    templateFivePrincipalDesignation: 'Principal',
    templateFivePrincipalMessage:
        'It is indeed a great privilege and honour for me to serve as the Principal of this esteemed institution. Our college has earned a reputation for academic excellence and holistic development. We are committed to providing quality education that prepares students for the challenges of tomorrow.',
    templateFivePrincipalImage: '',
    templateFiveSecretaryName: 'Shri. Virsinh Ransing',
    templateFiveSecretaryDesignation: 'Secretary',
    templateFiveSecretaryMessage:
        'Our institution was founded with the objective of providing quality education to the rural masses at an affordable cost. We have made remarkable achievements in all academic and social fields, and we continue to strive for excellence.',
    templateFiveSecretaryImage: '',
    templateFiveAboutTitle: 'About Our Institution',
    templateFiveAboutDescription:
        'Established in 1979, our institution has been imparting value-based education and serving the socially, economically, and educationally weaker sections of society. The institution runs undergraduate programs in Arts, Commerce, and Science, along with Post-graduation in Commerce.',
    templateFiveAboutImage: '',
    templateFiveDepartments: [
        {
            title: 'Arts',
            description:
                'The Department of Arts offers a wide range of subjects including languages, social sciences, and humanities, fostering critical thinking and creative expression.',
        },
        {
            title: 'Commerce',
            description:
                'The Department of Commerce provides comprehensive education in business, accounting, and economics with both undergraduate and postgraduate programs.',
        },
        {
            title: 'Science',
            description:
                'The Department of Science offers programs in physics, chemistry, biology, and computer science with well-equipped laboratories.',
        },
    ],
    templateFiveAchievements: [
        { value: '3200+', label: 'Students Enrolled' },
        { value: '120+', label: 'Faculty Members' },
        { value: '96%', label: 'Academic Results' },
        { value: '45+', label: 'Years of Excellence' },
    ],
    templateFiveWhyChooseUs: [
        {
            title: 'NAAC Accredited',
            description: 'Accredited by NAAC with B+ grade, ensuring quality standards in education.',
        },
        {
            title: 'Experienced Faculty',
            description: 'Dedicated and qualified faculty members committed to student success.',
        },
        {
            title: 'Modern Infrastructure',
            description: 'Well-equipped laboratories, library, and smart classrooms.',
        },
        {
            title: 'Holistic Development',
            description: 'Focus on academic, cultural, and sports activities for all-round growth.',
        },
    ],
    templateFiveTestimonials: [
        {
            quote: 'The college provides excellent education with supportive faculty. The campus environment is conducive to learning.',
            name: 'Priya Sharma',
            role: 'Alumni, B.Com',
        },
        {
            quote: 'The science laboratories are well-maintained and the faculty provides personalized attention to every student.',
            name: 'Rahul Patil',
            role: 'Student, B.Sc',
        },
        {
            quote: 'This institution has shaped my career with its comprehensive curriculum and placement support.',
            name: 'Sneha Deshmukh',
            role: 'Alumni, B.A',
        },
    ],
    templateFiveEvents: [
        {
            title: 'Annual Day Celebration',
            detail: 'Join us for the annual day celebration featuring cultural performances and prize distribution.',
        },
        {
            title: 'Science Exhibition',
            detail: 'Students showcase their innovative projects and research work at the science exhibition.',
        },
        {
            title: 'Sports Tournament',
            detail: 'Inter-college sports tournament featuring cricket, volleyball, and athletics.',
        },
    ],
    templateFiveNews: [
        {
            title: 'Admissions Open 2026-27',
            detail: 'Online and offline admissions are now open for all undergraduate and postgraduate programs.',
        },
        {
            title: 'NAAC Reaccreditation',
            detail: 'The college has been reaccredited by NAAC with B+ grade for the third cycle.',
        },
        {
            title: 'Placement Drive',
            detail: 'Campus placement drive organized in collaboration with leading companies.',
        },
    ],
    templateFiveGalleryTitle: 'Campus Gallery',
    templateFiveGalleryDescription:
        'Explore our vibrant campus life through photos of events, classrooms, laboratories, and student activities.',
    templateFiveGalleryItems: [
        {
            title: 'Campus Buildings',
            category: 'Infrastructure',
            description: 'Modern academic blocks and administrative buildings.',
            image: '',
        },
        {
            title: 'Science Laboratories',
            category: 'Facilities',
            description: 'Well-equipped laboratories for practical learning.',
            image: '',
        },
        {
            title: 'Library',
            category: 'Facilities',
            description: 'A vast collection of books and digital resources.',
            image: '',
        },
        {
            title: 'Sports Ground',
            category: 'Sports',
            description: 'Large playground for cricket, football, and athletics.',
            image: '',
        },
        {
            title: 'Cultural Events',
            category: 'Events',
            description: 'Annual day, festivals, and cultural celebrations.',
            image: '',
        },
        {
            title: 'Student Activities',
            category: 'Life',
            description: 'Clubs, seminars, and extracurricular activities.',
            image: '',
        },
    ],
    templateFiveContactTitle: 'Contact Us',
    templateFiveContactDescription: 'Get in touch with us for admissions, inquiries, or campus visits.',
    templateFiveContactItems: [
        {
            title: 'Phone',
            value: '+91 98765 43210',
            description: 'Call us for admissions and general inquiries.',
        },
        {
            title: 'Email',
            value: 'info@gurukul.edu',
            description: 'Send us an email for detailed inquiries.',
        },
        {
            title: 'Address',
            value: 'Knowledge Park Road, Main Campus',
            description: 'Visit our campus for in-person counseling and support.',
        },
    ],
    templateFiveMapEmbedUrl:
        'https://www.google.com/maps?q=Knowledge%20Park%20Road%2C%20Main%20Campus&z=15&output=embed',
    templateFiveShowAccreditedBadge: true,
    templateFiveAccreditedBadgeLabel: 'Accredited',
    templateFiveAccreditedBadgeGrade: 'NAAC A+ Grade',
    templateFiveShowLoginButton: true,
    templateFiveShowAdmissionButton: true,
    templateFiveMainMenuItems: [
        { label: 'Home', url: '/' },
        { label: 'About Us', url: '/pages/about-us', pageSlug: 'about-us' },
        {
            label: 'Admissions',
            url: '/pages/admissions',
            pageSlug: 'admissions',
        },
        {
            label: 'Departments',
            url: '/pages/departments',
            pageSlug: 'departments',
        },
        { label: 'Gallery', url: '/pages/gallery', pageSlug: 'gallery' },
        { label: 'Contact', url: '/pages/contact', pageSlug: 'contact' },
    ],
    templateFiveFooterColumns: [
        {
            title: 'About Us',
            links: [
                { label: 'About Institution', url: '#about' },
                { label: "Secretary's Message", url: '#secretary' },
                { label: "Principal's Message", url: '#principal' },
                { label: 'Vision & Mission', url: '#about' },
            ],
        },
        {
            title: 'Quick Links',
            links: [
                { label: 'Admissions', url: '/admissions/apply' },
                { label: 'Student Corner', url: '#' },
                { label: 'Library', url: '#' },
                { label: 'Gallery', url: '#gallery' },
            ],
        },
        {
            title: 'Departments',
            links: [
                { label: 'Arts', url: '#departments' },
                { label: 'Commerce', url: '#departments' },
                { label: 'Science', url: '#departments' },
            ],
        },
        {
            title: 'Contact Info',
            links: [
                { label: '+91 98765 43210', url: 'tel:+919876543210' },
                { label: 'info@gurukul.edu', url: 'mailto:info@gurukul.edu' },
                { label: 'Knowledge Park Road', url: '#' },
            ],
        },
    ],
    templateFiveFooterCopyright: '© 2026 Gurukul Institution. All rights reserved.',
    templateFiveFooterTagline: 'Empowering Minds, Shaping Futures',
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

const template5ContentKeys = [
    'templateFiveTopPhone',
    'templateFiveTopEmail',
    'templateFiveTopAddress',
    'templateFiveSocialFacebook',
    'templateFiveSocialTwitter',
    'templateFiveSocialYoutube',
    'templateFiveSocialInstagram',
    'templateFiveMarqueeItems',
    'templateFiveHeroTitle',
    'templateFiveHeroSubtitle',
    'templateFiveHeroDescription',
    'templateFivePrincipalName',
    'templateFivePrincipalDesignation',
    'templateFivePrincipalMessage',
    'templateFivePrincipalImage',
    'templateFiveSecretaryName',
    'templateFiveSecretaryDesignation',
    'templateFiveSecretaryMessage',
    'templateFiveSecretaryImage',
    'templateFiveAboutTitle',
    'templateFiveAboutDescription',
    'templateFiveAboutImage',
    'templateFiveDepartments',
    'templateFiveAchievements',
    'templateFiveWhyChooseUs',
    'templateFiveTestimonials',
    'templateFiveEvents',
    'templateFiveNews',
    'templateFiveGalleryTitle',
    'templateFiveGalleryDescription',
    'templateFiveGalleryItems',
    'templateFiveContactTitle',
    'templateFiveContactDescription',
    'templateFiveContactItems',
    'templateFiveMapEmbedUrl',
    'templateFiveShowAccreditedBadge',
    'templateFiveAccreditedBadgeLabel',
    'templateFiveAccreditedBadgeGrade',
    'templateFiveShowLoginButton',
    'templateFiveShowAdmissionButton',
    'templateFiveMainMenuItems',
    'templateFiveFooterColumns',
    'templateFiveFooterCopyright',
    'templateFiveFooterTagline',
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
    if (
        template === 'template1' ||
        template === 'template2' ||
        template === 'template3' ||
        template === 'template4' ||
        template === 'template5'
    ) {
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

    const schoolName = parsed.schoolName || parsed.brandName || defaultWebsiteContent.brandName;

    return {
        ...defaultWebsiteContent,
        ...parsed,
        brandName: schoolName,
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
        templateFiveMarqueeItems: parsed.templateFiveMarqueeItems || defaultWebsiteContent.templateFiveMarqueeItems,
        templateFiveDepartments: parsed.templateFiveDepartments || defaultWebsiteContent.templateFiveDepartments,
        templateFiveAchievements: parsed.templateFiveAchievements || defaultWebsiteContent.templateFiveAchievements,
        templateFiveWhyChooseUs: parsed.templateFiveWhyChooseUs || defaultWebsiteContent.templateFiveWhyChooseUs,
        templateFiveTestimonials: parsed.templateFiveTestimonials || defaultWebsiteContent.templateFiveTestimonials,
        templateFiveEvents: parsed.templateFiveEvents || defaultWebsiteContent.templateFiveEvents,
        templateFiveNews: parsed.templateFiveNews || defaultWebsiteContent.templateFiveNews,
        templateFiveGalleryItems: parsed.templateFiveGalleryItems || defaultWebsiteContent.templateFiveGalleryItems,
        templateFiveContactItems: parsed.templateFiveContactItems || defaultWebsiteContent.templateFiveContactItems,
        templateFiveMainMenuItems: parsed.templateFiveMainMenuItems || defaultWebsiteContent.templateFiveMainMenuItems,
        templateFiveFooterColumns: parsed.templateFiveFooterColumns || defaultWebsiteContent.templateFiveFooterColumns,
        templateFiveShowAccreditedBadge:
            parsed.templateFiveShowAccreditedBadge !== undefined
                ? Boolean(parsed.templateFiveShowAccreditedBadge)
                : defaultWebsiteContent.templateFiveShowAccreditedBadge,
        templateFiveAccreditedBadgeLabel:
            parsed.templateFiveAccreditedBadgeLabel || defaultWebsiteContent.templateFiveAccreditedBadgeLabel,
        templateFiveAccreditedBadgeGrade:
            parsed.templateFiveAccreditedBadgeGrade || defaultWebsiteContent.templateFiveAccreditedBadgeGrade,
        templateFiveShowLoginButton:
            parsed.templateFiveShowLoginButton !== undefined
                ? Boolean(parsed.templateFiveShowLoginButton)
                : defaultWebsiteContent.templateFiveShowLoginButton,
        templateFiveShowAdmissionButton:
            parsed.templateFiveShowAdmissionButton !== undefined
                ? Boolean(parsed.templateFiveShowAdmissionButton)
                : defaultWebsiteContent.templateFiveShowAdmissionButton,
    };
}

function collectSuffixedKeys(source: Record<string, unknown> | null): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (!source) return out;
    for (const [key, value] of Object.entries(source)) {
        if (/^.+_[a-z]{2}$/.test(key)) {
            if (typeof value === 'string') {
                out[key] = value;
            } else if (Array.isArray(value) && value.length > 0) {
                out[key] = value;
            }
        }
    }
    return out;
}

export function normalizeWebsiteCmsContent(
    content?: Partial<WebsiteContent> | Partial<WebsiteCmsContent> | null,
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
    const templateFiveOverrides = isRecord((parsed as Partial<WebsiteCmsContent>).template5)
        ? normalizeLegacyWebsiteContent((parsed as Partial<WebsiteCmsContent>).template5 as Partial<WebsiteContent>)
        : null;

    const raw = parsed as Record<string, unknown>;

    return {
        activeTemplate: normalizeWebsiteTemplate((parsed as Partial<WebsiteCmsContent>).activeTemplate),
        theme: normalizeWebsiteTheme((parsed as Partial<WebsiteCmsContent>).theme),
        sliderImages: Array.isArray((parsed as Partial<WebsiteCmsContent>).sliderImages)
            ? ((parsed as Partial<WebsiteCmsContent>).sliderImages as unknown[]).filter(
                  (item): item is string => typeof item === 'string' && item.length > 0,
              )
            : legacyContent.sliderImages,
        shared: {
            ...pickWebsiteValues(defaultWebsiteContent, sharedContentKeys),
            ...pickWebsiteValues(legacyContent, sharedContentKeys),
            ...(sharedOverrides ? pickWebsiteValues(sharedOverrides, sharedContentKeys) : {}),
            ...collectSuffixedKeys(isRecord(raw.shared) ? raw.shared : null),
        },
        template1: {
            ...pickWebsiteValues(legacyContent, template1ContentKeys),
            ...(templateOneOverrides ? pickWebsiteValues(templateOneOverrides, template1ContentKeys) : {}),
            ...collectSuffixedKeys(isRecord(raw.template1) ? raw.template1 : null),
        },
        template2: {
            ...pickWebsiteValues(legacyContent, template2ContentKeys),
            ...(templateTwoOverrides ? pickWebsiteValues(templateTwoOverrides, template2ContentKeys) : {}),
            ...collectSuffixedKeys(isRecord(raw.template2) ? raw.template2 : null),
        },
        template3: {
            ...pickWebsiteValues(legacyContent, template3ContentKeys),
            ...(templateThreeOverrides ? pickWebsiteValues(templateThreeOverrides, template3ContentKeys) : {}),
            ...collectSuffixedKeys(isRecord(raw.template3) ? raw.template3 : null),
        },
        template4: {
            ...pickWebsiteValues(legacyContent, template4ContentKeys),
            ...(templateFourOverrides ? pickWebsiteValues(templateFourOverrides, template4ContentKeys) : {}),
            ...collectSuffixedKeys(isRecord(raw.template4) ? raw.template4 : null),
        },
        template5: {
            ...pickWebsiteValues(legacyContent, template5ContentKeys),
            ...(templateFiveOverrides ? pickWebsiteValues(templateFiveOverrides, template5ContentKeys) : {}),
            ...collectSuffixedKeys(isRecord(raw.template5) ? raw.template5 : null),
        },
    };
}

export function normalizeWebsiteContent(
    content?: Partial<WebsiteContent> | Partial<WebsiteCmsContent> | null,
    templateOverride?: WebsiteTemplateKey,
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
                : templateKey === 'template5'
                  ? cmsContent.template5
                  : cmsContent.template1;

    return normalizeLegacyWebsiteContent({
        activeTemplate: cmsContent.activeTemplate,
        theme: cmsContent.theme,
        sliderImages: cmsContent.sliderImages,
        ...cmsContent.shared,
        ...templateContent,
    });
}

export function localizeWebsiteContent(
    content: Partial<WebsiteContent> | Partial<WebsiteCmsContent> | null,
    locale: string,
): WebsiteContent {
    if (locale === 'en') {
        return normalizeWebsiteContent(content);
    }

    const base = normalizeWebsiteContent(content);
    const localeSuffix = `_${locale}`;
    const overrides: Partial<WebsiteContent> = {};

    const raw = (content ?? {}) as Partial<WebsiteCmsContent>;
    const activeTemplate = (raw.activeTemplate ?? 'template1') as keyof WebsiteCmsContent;
    const activeGroup = isRecord(raw[activeTemplate]) ? (raw[activeTemplate] as Record<string, unknown>) : null;

    const collectScalars = (source: Record<string, unknown> | null | undefined): void => {
        if (!source || typeof source !== 'object') return;

        Object.keys(source).forEach((key) => {
            if (key.endsWith(localeSuffix)) {
                const baseKey = key.slice(0, -localeSuffix.length);
                const value = source[key];
                if (typeof value === 'string' && value.trim().length > 0) {
                    (overrides as Record<string, unknown>)[baseKey] = value;
                }
            }
        });
    };

    const collectArrays = (source: Record<string, unknown> | null | undefined, baseKey: string): void => {
        const value = source?.[`${baseKey}${localeSuffix}`];
        if (Array.isArray(value) && value.length > 0) {
            (overrides as Record<string, unknown>)[baseKey] = value;
        }
    };

    collectScalars(raw as unknown as Record<string, unknown>);
    collectScalars(raw.shared as unknown as Record<string, unknown> | null);
    collectScalars(activeGroup);

    Object.keys(base).forEach((baseKey) => {
        if (Array.isArray(base[baseKey as keyof WebsiteContent])) {
            collectArrays(raw as unknown as Record<string, unknown>, baseKey);
            collectArrays(raw.shared as unknown as Record<string, unknown> | null, baseKey);
            collectArrays(activeGroup, baseKey);
        }
    });

    return { ...base, ...(overrides as Partial<WebsiteContent>) };
}

export function mergeRegionalOverrides(
    cmsContent: WebsiteCmsContent,
    raw?: Partial<WebsiteContent> | Partial<WebsiteCmsContent> | null,
): WebsiteCmsContent {
    if (!raw || typeof raw !== 'object') {
        return cmsContent;
    }

    const regionalKeys = ['_mr', '_hi'];
    const templateGroups: Array<keyof WebsiteCmsContent> = [
        'template1',
        'template2',
        'template3',
        'template4',
        'template5',
    ];

    const collectGroup = (source: Record<string, unknown>, group: keyof WebsiteCmsContent): void => {
        Object.keys(source).forEach((key) => {
            if (regionalKeys.some((suffix) => key.endsWith(suffix))) {
                const value = source[key];
                if (typeof value === 'string' && value.trim().length > 0) {
                    (cmsContent[group] as Record<string, unknown>)[key] = value;
                } else if (Array.isArray(value) && value.length > 0) {
                    (cmsContent[group] as Record<string, unknown>)[key] = value;
                }
            }
        });
    };

    collectGroup(raw as Record<string, unknown> | null, 'shared');

    const nested = raw as Partial<WebsiteCmsContent>;
    if (isRecord(nested.shared)) {
        collectGroup(nested.shared as Record<string, unknown>, 'shared');
    }

    templateGroups.forEach((group) => {
        const groupContent = nested[group];
        if (isRecord(groupContent)) {
            collectGroup(groupContent as Record<string, unknown>, group);
        }
    });

    return cmsContent;
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
