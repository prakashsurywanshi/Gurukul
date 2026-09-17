import { useLanguage } from '../i18n/LanguageProvider';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, GraduationCap, Mail, ShieldCheck } from 'lucide-react';
import { localizeWebsiteContent, WebsiteContent, websiteThemes } from '../utils/websiteCmsContent';
import LanguageSwitcher from '../components/LanguageSwitcher';

interface PrivacyPolicyProps {
    websiteContent?: Partial<WebsiteContent> | null;
}

const sections = [
    {
        title: '1. App Covered By This Policy',
        points: [
            'This Privacy Policy applies to the Gurukul Android app and related backend services used by students, parents, teachers, staff, and school administrators.',
            'It is intended to support Google Play privacy policy requirements by describing what data the app accesses, collects, uses, stores, and shares.',
        ],
    },
    {
        title: '2. Information We Collect',
        points: [
            'Account and profile information, such as name, email address, phone number, role, organization or school affiliation, profile photo, and login credentials.',
            'Student and academic information made available through the app, such as admission details, class and section, attendance, fees, homework, exams, timetable, certificates, library activity, transport details, hostel information, and related school records.',
            'Admissions and enquiry information submitted through Gurukul forms, which may include student details, parent or guardian information, and contact details.',
            'Device and app information, such as Firebase Cloud Messaging token, device platform, device name, IP-related request metadata, and app session activity needed for login security and notifications.',
            'Communication and support records when schools use the app to send notices, email, push notifications, WhatsApp messages, or voice-related communications.',
        ],
    },
    {
        title: '3. How We Use Information',
        points: [
            'To create and manage user accounts, authenticate users, and provide access to school management features.',
            'To deliver core educational and administrative services such as attendance, fees, examinations, admissions, timetable access, homework, certificates, library workflows, and communication between institutions and users.',
            'To send important alerts, reminders, announcements, and push notifications related to school operations and user accounts.',
            'To maintain app security, investigate misuse, troubleshoot issues, and improve reliability and performance.',
            'To comply with legal obligations, school administration needs, and legitimate institutional recordkeeping requirements.',
        ],
    },
    {
        title: '4. Data Sharing And Disclosure',
        points: [
            'We do not sell personal information.',
            'Data may be shared with the school, college, or organization that operates your Gurukul deployment, including authorized administrators, teachers, accountants, librarians, reception staff, and other approved personnel based on role and permission.',
            'Data may be processed by service providers that support app functionality, such as hosting providers, database infrastructure, email providers, notification services, and Firebase Cloud Messaging for push delivery.',
            'Where enabled by the institution, communication-related data may be processed through integrated third-party services such as email, WhatsApp bridge services, or voice communication providers to deliver school communications.',
            'We may disclose information when required by law, regulation, legal process, or to protect the safety, rights, property, or integrity of users, institutions, or the service.',
        ],
    },
    {
        title: '5. Permissions And Sensitive Access',
        points: [
            'The app may request access or store technical identifiers needed for sign-in, session management, and push notifications.',
            'If future versions of the app request access to device features such as camera, microphone, storage, or files, that access should be used only for clearly explained app features and subject to applicable permission prompts and in-app disclosures.',
            'Users should review Android permission prompts carefully before granting access.',
        ],
    },
    {
        title: '6. Data Security',
        points: [
            'We use reasonable administrative, technical, and organizational measures to protect personal data against unauthorized access, alteration, disclosure, or destruction.',
            'Access to school data is intended to be role-based, so users should only be able to see functions and records permitted for their account type.',
            'Because no method of electronic storage or transmission is completely secure, we cannot guarantee absolute security.',
        ],
    },
    {
        title: '7. Data Retention',
        points: [
            'We retain personal and academic data for as long as necessary to provide the Gurukul service, maintain school records, comply with legal obligations, resolve disputes, and enforce agreements.',
            'Retention periods may vary depending on the type of record, institutional policy, and applicable law.',
            'Technical logs, tokens, and usage records may be retained for security, audit, and operational continuity purposes for a limited or reasonable period.',
        ],
    },
    {
        title: '8. Account Deletion And Data Requests',
        points: [
            'Users may request account deletion, correction, or removal of certain personal data by contacting their school administration or the privacy contact listed below.',
            'Where account deletion is approved and legally permitted, the account will be deleted or deactivated and associated data will be handled in line with school recordkeeping requirements, legal obligations, and legitimate retention needs.',
            'Some records may be retained after deletion requests where required for compliance, institutional administration, fraud prevention, payment reconciliation, dispute resolution, or safeguarding obligations.',
        ],
    },
    {
        title: '9. Children And Student Data',
        points: [
            'The Gurukul app is designed for educational institutions and may process student data on behalf of schools or colleges.',
            'Student information is expected to be provided and managed by the relevant institution or authorized parent, guardian, or staff member, depending on the use case and applicable law.',
            'Schools and institutions using Gurukul are responsible for ensuring they have the necessary authority, notices, and consents for student data they submit or manage through the service.',
        ],
    },
    {
        title: '10. Your Choices',
        points: [
            'You may review or update certain account information through the app or by contacting your institution.',
            'You may opt out of some communications where applicable, but service-related and school-critical notices may still be sent.',
            'You can log out of the app and, where supported, request removal of your device token from notification systems.',
        ],
    },
    {
        title: '11. Changes To This Policy',
        points: [
            'This policy may be updated from time to time to reflect app changes, legal requirements, security practices, or institutional needs.',
            'Any revised version will be posted on this page with an updated effective date.',
        ],
    },
];

export default function PrivacyPolicy({ websiteContent }: PrivacyPolicyProps) {
    const { t, locale } = useLanguage();
    const cmsContent = localizeWebsiteContent(websiteContent, locale);
    const theme = websiteThemes[cmsContent.theme];
    const isLightTheme = true;
    const pageTextClass = isLightTheme ? 'text-slate-900' : 'text-slate-100';
    const headingTextClass = isLightTheme ? 'text-slate-950' : 'text-white';
    const bodyTextClass = isLightTheme ? 'text-slate-600' : 'text-slate-300';
    const mutedTextClass = isLightTheme ? 'text-slate-500' : 'text-slate-400';
    const surfaceClass = isLightTheme
        ? 'border-slate-200/80 bg-white/88 shadow-[0_28px_80px_rgba(15,23,42,0.08)]'
        : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] shadow-[0_25px_60px_rgba(8,15,30,0.3)]';

    return (
        <>
            <Head title={`Privacy Policy | ${cmsContent.brandName}`} />

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
                            <p className={`text-xs font-medium tracking-[0.3em] uppercase ${mutedTextClass}`}>
                                {cmsContent.brandSubtitle}
                            </p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-3">
                        <LanguageSwitcher variant="site" />
                        <Link
                            href="/"
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-xl transition ${isLightTheme ? 'border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300 hover:bg-white' : 'border-white/15 bg-white/5 text-slate-100 hover:border-white/30 hover:bg-white/10'}`}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            {t('Back to Home')}
                        </Link>
                    </div>
                </header>

                <main className="mx-auto max-w-6xl px-5 pb-16 pt-4 sm:px-8 lg:px-10">
                    <section
                        className={`overflow-hidden rounded-[2rem] border p-8 backdrop-blur-xl sm:p-10 lg:p-12 ${surfaceClass}`}
                    >
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                            <div className="max-w-3xl text-left">
                                <div
                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${theme.heroBadge}`}
                                >
                                    <ShieldCheck className="h-4 w-4" />
                                    {t('Gurukul Android App Privacy Policy')}
                                </div>
                                <h1
                                    className={`mt-5 text-4xl font-black tracking-tight sm:text-5xl ${headingTextClass}`}
                                >
                                    {t('Privacy Policy for the Gurukul Android App')}
                                </h1>
                                <p className={`mt-5 text-base leading-7 sm:text-lg ${bodyTextClass}`}>
                                    {t(
                                        'This Privacy Policy explains how the Gurukul Android app collects, uses, stores, protects, and shares information when students, parents, teachers, staff, and administrators use the app and related institutional services.',
                                    )}
                                </p>
                            </div>

                            <div
                                className={`justify-self-start rounded-[1.5rem] border px-5 py-4 text-left backdrop-blur-xl lg:justify-self-end ${surfaceClass}`}
                            >
                                <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${mutedTextClass}`}>
                                    {t('Last Updated')}
                                </p>
                                <p className={`mt-2 text-lg font-bold ${headingTextClass}`}>{t('May 21, 2026')}</p>
                            </div>
                        </div>
                    </section>

                    <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                        <aside className={`rounded-[2rem] border p-6 backdrop-blur-xl ${surfaceClass}`}>
                            <h2 className={`text-xl font-bold ${headingTextClass}`}>{t('Quick Summary')}</h2>
                            <p className={`mt-3 text-sm leading-6 ${bodyTextClass}`}>
                                {t(
                                    'Gurukul processes account data, school records, admissions data, device notification tokens, and communication-related information to operate the app for educational institutions. We do not sell personal information, and we use reasonable safeguards to protect it.',
                                )}
                            </p>

                            <div
                                className={`mt-6 rounded-[1.5rem] border p-5 ${isLightTheme ? 'border-slate-200/80 bg-slate-50/80' : 'border-white/10 bg-white/5'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Mail className={`h-5 w-5 ${headingTextClass}`} />
                                    <h3 className={`text-sm font-bold uppercase tracking-[0.2em] ${headingTextClass}`}>
                                        {t('Privacy Contact')}
                                    </h3>
                                </div>
                                <p className={`mt-3 text-sm leading-6 ${bodyTextClass}`}>
                                    {t(
                                        'For privacy questions, data requests, or deletion requests, please contact your school administrator or use the official institution contact published by',
                                    )}
                                    {cmsContent.brandName}
                                    {cmsContent.admissionsEmail
                                        ? t('at {cmsContent.admissionsEmail}', {
                                              'cmsContent.admissionsEmail': cmsContent.admissionsEmail,
                                          })
                                        : ''}
                                    .
                                </p>
                            </div>
                        </aside>

                        <div className="space-y-6">
                            {sections.map((section) => (
                                <section
                                    key={section.title}
                                    className={`rounded-[2rem] border p-6 sm:p-8 backdrop-blur-xl ${surfaceClass}`}
                                >
                                    <h2 className={`text-2xl font-bold ${headingTextClass}`}>{t(section.title)}</h2>
                                    <div className="mt-5 space-y-3">
                                        {section.points.map((point) => (
                                            <div key={point} className="flex items-start gap-3">
                                                <div
                                                    className={`mt-2 h-2.5 w-2.5 rounded-full ${isLightTheme ? 'bg-sky-500' : 'bg-cyan-300'}`}
                                                />

                                                <p className={`text-sm leading-7 sm:text-base ${bodyTextClass}`}>
                                                    {point}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}
