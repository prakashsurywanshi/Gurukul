import { useLanguage } from '../i18n/LanguageProvider';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, GraduationCap } from 'lucide-react';
import { normalizeWebsiteContent, WebsiteContent, websiteThemes } from '../utils/websiteCmsContent';
import LanguageSwitcher from '../components/LanguageSwitcher';

interface DisclosureSection {
    key: string;
    label: string;
}

interface CbseDisclosureProps {
    websiteContent?: Partial<WebsiteContent> | null;
    disclosure?: Record<string, string>;
    sectionOptions?: DisclosureSection[];
}

export default function CbseDisclosure({ websiteContent, disclosure = {}, sectionOptions = [] }: CbseDisclosureProps) {
    const { t } = useLanguage();
    const cmsContent = normalizeWebsiteContent(websiteContent);
    const theme = websiteThemes[cmsContent.theme];
    const isLightTheme = true;
    const pageTextClass = isLightTheme ? 'text-slate-900' : 'text-slate-100';
    const headingTextClass = isLightTheme ? 'text-slate-950' : 'text-white';
    const bodyTextClass = isLightTheme ? 'text-slate-600' : 'text-slate-300';
    const mutedTextClass = isLightTheme ? 'text-slate-500' : 'text-slate-400';
    const surfaceClass = isLightTheme
        ? 'border-slate-200/80 bg-white/88 shadow-[0_28px_80px_rgba(15,23,42,0.08)]'
        : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] shadow-[0_25px_60px_rgba(8,15,30,0.3)]';

    const filledSections = sectionOptions.filter((section) => (disclosure[section.key] ?? '').trim() !== '');

    return (
        <>
            <Head title={`Mandatory Disclosure | ${cmsContent.brandName}`} />

            <div className={`min-h-screen ${pageTextClass} ${theme.pageBackground}`}>
                <div className={`absolute inset-0 -z-10 ${theme.ambientBackground}`} />
                <div
                    className={`absolute left-[-8rem] top-16 -z-10 h-64 w-64 rounded-full blur-3xl ${theme.leftGlow}`}
                />
                <div
                    className={`absolute right-[-6rem] top-10 -z-10 h-80 w-80 rounded-full blur-3xl ${theme.rightGlow}`}
                />

                <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
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
                                {cmsContent.brandName}
                            </p>
                            <p className={`text-[10px] font-bold tracking-[0.24em] uppercase ${mutedTextClass}`}>
                                {cmsContent.brandSubtitle}
                            </p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className={`flex items-center gap-1 text-xs font-semibold ${mutedTextClass} hover:${headingTextClass}`}
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            {t('Back to Home')}</Link>
                        <LanguageSwitcher variant="site" />
                    </div>
                </header>

                <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 lg:px-10">
                    <div className={`relative overflow-hidden rounded-3xl border p-8 sm:p-10 ${surfaceClass}`}>
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500" />
                        <div className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-blue-600">
                            Mandatory Disclosure
                        </div>
                        <h1 className={`text-3xl font-black tracking-tight sm:text-4xl ${headingTextClass}`}>
                            CBSE Affiliation Disclosure
                        </h1>
                        <p className={`mt-3 max-w-3xl text-sm leading-relaxed ${bodyTextClass}`}>
                            Information disclosed as per the requirements of the Central Board of Secondary Education
                            for affiliated schools.
                        </p>
                    </div>

                    <div className="mt-8 space-y-4">
                        {filledSections.length > 0 ? (
                            filledSections.map((section) => (
                                <div key={section.key} className={`rounded-2xl border p-6 ${surfaceClass}`}>
                                    <h2 className={`text-base font-bold ${headingTextClass}`}>{section.label}</h2>
                                    <p className={`mt-2 whitespace-pre-line text-sm leading-relaxed ${bodyTextClass}`}>
                                        {disclosure[section.key] ?? ''}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className={`rounded-2xl border p-8 text-center ${surfaceClass}`}>
                                <p className={`text-sm ${mutedTextClass}`}>
                                    Disclosure details are not published yet. Please check back later.
                                </p>
                            </div>
                        )}
                    </div>
                </main>

                <footer
                    className={`border-t py-6 text-center text-xs ${isLightTheme ? 'border-slate-200/80 text-slate-500' : 'border-white/10 text-slate-400'}`}
                >
                    <p className="mx-auto max-w-6xl px-6">
                        © {new Date().getFullYear()} {cmsContent.brandName}. All rights reserved.
                    </p>
                    <div className="mx-auto mt-3 flex max-w-6xl items-center justify-center gap-4 px-6">
                        <Link href="/privacy-policy" className="hover:underline">
                            Privacy Policy
                        </Link>
                        <Link href="/disclosure" className="hover:underline">
                            Mandatory Disclosure
                        </Link>
                    </div>
                </footer>
            </div>
        </>
    );
}
