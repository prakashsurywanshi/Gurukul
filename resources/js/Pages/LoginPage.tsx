import { useLanguage } from '../i18n/LanguageProvider';
import React, { useEffect, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
    GraduationCap,
    AlertCircle,
    ShieldCheck,
    Users,
    Clock4,
    Briefcase,
    Wallet,
    Headset,
    BookOpen,
    Bus,
    Eye,
    EyeOff,
    ExternalLink,
    Chrome,
    Facebook,
    Github,
} from 'lucide-react';
import { toast } from 'sonner';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { orgTypeLabel } from '../lib/orgTypeConfig';

type LoginPortal =
    | 'student_parent'
    | 'super_admin'
    | 'admin'
    | 'teacher'
    | 'accountant'
    | 'receptionist'
    | 'librarian'
    | 'driver'
    | 'transport_manager'
    | 'staff';

const portalOptions: Array<{
    id: LoginPortal;
    label: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    helper: string;
    demoEmail: string;
    demoPassword: string;
}> = [
    {
        id: 'student_parent',
        label: 'Student/Parent Login',
        title: 'Student & Parent Portal',
        description: 'Access attendance, exams, fees, messages, and school updates.',
        icon: Users,
        helper: 'Use a student or parent account email and password.',
        demoEmail: 'student@gurukul.com',
        demoPassword: 'student123',
    },
    {
        id: 'super_admin',
        label: 'Super Admin Login',
        title: 'Super Admin Portal',
        description: 'Platform-wide oversight, billing and privileged administration.',
        icon: ShieldCheck,
        helper: 'Use your superadmin credentials for full access.',
        demoEmail: 'superadmin@gurukul.com',
        demoPassword: 'superadmin123',
    },
    {
        id: 'admin',
        label: 'Admin Login',
        title: 'Admin Portal',
        description: 'For admins',
        icon: Briefcase,
        helper: 'Use your staff credentials to continue.',
        demoEmail: 'admin@gurukul.com',
        demoPassword: 'admin123',
    },
    {
        id: 'teacher',
        label: 'Teacher Login',
        title: 'Teacher Portal',
        description: 'For teachers',
        icon: Briefcase,
        helper: 'Use your Teacher credentials to continue.',
        demoEmail: 'teacher@gurukul.com',
        demoPassword: 'teacher123',
    },
    {
        id: 'accountant',
        label: 'Accountant Login',
        title: 'Accountant Portal',
        description: 'For accountants',
        icon: Wallet,
        helper: 'Use your accountant credentials to continue.',
        demoEmail: 'accountant@gurukul.com',
        demoPassword: 'accountant123',
    },
    {
        id: 'receptionist',
        label: 'Receptionist Login',
        title: 'Receptionist Portal',
        description: 'For receptionists',
        icon: Headset,
        helper: 'Use your receptionist credentials to continue.',
        demoEmail: 'receptionist@gurukul.com',
        demoPassword: 'receptionist123',
    },
    {
        id: 'librarian',
        label: 'Librarian Login',
        title: 'Librarian Portal',
        description: 'For librarians',
        icon: BookOpen,
        helper: 'Use your librarian credentials to continue.',
        demoEmail: 'librarian@gurukul.com',
        demoPassword: 'librarian123',
    },
    {
        id: 'driver',
        label: 'Driver Login',
        title: 'Driver Portal',
        description: 'For transport staff',
        icon: Bus,
        helper: 'Use your driver credentials to continue.',
        demoEmail: 'driver@gurukul.com',
        demoPassword: 'driver123',
    },
    {
        id: 'transport_manager',
        label: 'Transport Manager Login',
        title: 'Transport Manager Portal',
        description: 'Manage routes, vehicles, drivers, and journeys.',
        icon: Bus,
        helper: 'Use your transport manager credentials to continue.',
        demoEmail: 'transport_manager@gurukul.com',
        demoPassword: 'transport123',
    },
];

const demoCredentials: Array<{ org: string; type: string; email: string; password: string }> = [
    { org: 'Gurukul Public School', type: 'School', email: 'admin@gurukul.com', password: 'admin123' },
    { org: 'Nova College of Science', type: 'College', email: 'admin@college.gurukul.com', password: 'college123' },
    {
        org: 'Shine Test Prep Academy',
        type: 'Coaching Center',
        email: 'admin@coaching.gurukul.com',
        password: 'coaching123',
    },
    {
        org: 'Sarvamaya University',
        type: 'University',
        email: 'admin@university.gurukul.com',
        password: 'university123',
    },
];

interface LoginPageProps {
    onLogin?: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}
interface SsoStatus {
    enabled: boolean;
    providers: string[];
    installed?: boolean;
}

const SSO_PROVIDER_ICONS: Record<string, any> = {
    google: Chrome,
    facebook: Facebook,
    github: Github,
};

function SSOButtons() {
    const { t } = useLanguage();
    const [status, setStatus] = useState<SsoStatus | null>(null);

    useEffect(() => {
        fetch('/sso/status', { headers: { Accept: 'application/json' } })
            .then((res) => res.json())
            .then((data) => setStatus(data))
            .catch(() => setStatus(null));
    }, []);

    if (!status?.enabled || !status.providers?.length) {
        return null;
    }

    return (
        <div className="space-y-3 pt-1">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase text-gray-400">
                    <span className="bg-card px-2">{t('or continue with')}</span>
                </div>
            </div>
            <div className="flex justify-center gap-2">
                {status.providers.map((provider) => {
                    const Icon = SSO_PROVIDER_ICONS[provider] ?? Chrome;

                    return (
                        <a
                            key={provider}
                            href={`/auth/sso/${provider}`}
                            className="flex h-10 w-10 items-center justify-center rounded-full border text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                            title={provider}
                        >
                            <Icon className="h-4.5 w-4.5" />
                        </a>
                    );
                })}
            </div>
        </div>
    );
}

export default function LoginPage(_: LoginPageProps) {
    const { t } = useLanguage();
    const [selectedPortal, setSelectedPortal] = useState<LoginPortal>('staff');
    const [loginEmail, setLoginEmail] = useState('admin@qodeigence.com');
    const [loginPassword, setLoginPassword] = useState('12345678');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const page = usePage<{
        errors?: Record<string, string>;
        flash?: { success?: string };
        schoolName?: string | null;
        schoolLogo?: string | null;
        orgType?: string | null;
        demoLogin?: boolean;
    }>();

    const demoLogin = page.props.demoLogin === true;

    const error = page.props.errors?.email || page.props.errors?.password || '';
    const schoolName = page.props.schoolName || 'Gurukul';
    const schoolLogo = page.props.schoolLogo || '';
    const orgType = page.props.orgType;
    const portal = portalOptions.find((item) => item.id === selectedPortal) || portalOptions[1];
    const PortalIcon = portal.icon;

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        router.post(
            '/login',
            {
                email: loginEmail,
                password: loginPassword,
            },
            {
                onSuccess: () => {
                    toast.success('Login successful');
                },
                onError: () => {
                    toast.error('Invalid credentials');
                },
                onFinish: () => {
                    setLoading(false);
                },
            },
        );
    };

    const handlePortalSelect = (portalId: LoginPortal) => {
        const selected = portalOptions.find((item) => item.id === portalId);
        if (!selected) return;

        setSelectedPortal(portalId);
        setLoginEmail(selected.demoEmail);
        setLoginPassword(selected.demoPassword);
    };

    return (
        <>
            <Head title={t('Login')} />
            <div className="fixed top-4 right-4 z-50">
                <LanguageSwitcher />
            </div>

            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.24),transparent_30%),linear-gradient(180deg,#eff6ff_0%,#e0e7ff_100%)]">
                <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
                    <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                        <section className="rounded-[2rem] border border-[rgba(59,130,246,0.2)] bg-[radial-gradient(circle_at_top,rgba(33,52,74,0.96),rgba(9,19,31,1)_58%)] p-8 text-white shadow-[0_32px_80px_rgba(8,19,31,0.28)] lg:p-10">
                            <div className="mb-8 flex items-center gap-4">
                                <div
                                    className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-[#08131f] shadow-[0_18px_40px_rgba(59,130,246,0.32)] ${schoolLogo ? 'bg-white' : 'bg-[linear-gradient(135deg,#93c5fd,#3b82f6)]'}`}
                                >
                                    {schoolLogo ? (
                                        <img
                                            src={schoolLogo}
                                            alt={`${schoolName} logo`}
                                            className="max-h-full max-w-full object-contain p-1.5"
                                        />
                                    ) : (
                                        <GraduationCap className="h-9 w-9" />
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold tracking-tight text-[#93c5fd]">{schoolName}</h1>
                                    {orgType && orgType !== 'school' && (
                                        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[rgba(147,197,253,0.35)] bg-[rgba(147,197,253,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#bfdbfe]">
                                            {t(orgTypeLabel(orgType))}
                                        </span>
                                    )}
                                    <p className="text-sm uppercase tracking-[0.24em] text-[rgba(226,232,240,0.72)]">
                                        {t('Educational Institution Management System')}
                                    </p>
                                </div>
                            </div>

                            <a
                                href="/"
                                className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-[#93c5fd] backdrop-blur-sm transition hover:border-[rgba(147,197,253,0.45)] hover:bg-white/20 hover:text-white"
                            >
                                <ExternalLink className="h-4 w-4" />
                                {t('Back to Website')}
                            </a>

                            <div className="space-y-4">
                                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#60a5fa]">
                                    {t('Choose Login Type')}
                                </p>
                                <div className="grid gap-3">
                                    {portalOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isActive = option.id === selectedPortal;

                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => handlePortalSelect(option.id)}
                                                className={`rounded-2xl border px-5 py-4 text-left transition ${
                                                    isActive
                                                        ? 'border-[rgba(147,197,253,0.45)] bg-[linear-gradient(135deg,rgba(59,130,246,0.22),rgba(59,130,246,0.16))] shadow-[0_18px_40px_rgba(8,19,31,0.2)]'
                                                        : 'border-white/10 bg-white/5 hover:border-[rgba(147,197,253,0.35)] hover:bg-white/10'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`mt-0.5 rounded-xl p-2 ${isActive ? 'bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f]' : 'bg-white/10 text-slate-200'}`}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{t(option.label)}</p>
                                                        <p className="mt-1 text-sm text-[rgba(226,232,240,0.72)]">
                                                            {t(option.description)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        <Card className="border-[rgba(37,99,235,0.18)] bg-[rgba(255,255,255,0.94)] shadow-[0_28px_70px_rgba(8,19,31,0.12)]">
                            <CardHeader className="space-y-3">
                                <div
                                    className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl text-[#08131f] ${schoolLogo ? 'bg-white' : 'bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'}`}
                                >
                                    {schoolLogo ? (
                                        <img
                                            src={schoolLogo}
                                            alt={`${schoolName} logo`}
                                            className="max-h-full max-w-full object-contain p-1"
                                        />
                                    ) : (
                                        <PortalIcon className="h-6 w-6" />
                                    )}
                                </div>
                                <CardTitle className="text-2xl text-[var(--foreground)]">{t('Welcome')}</CardTitle>
                                <CardDescription className="text-[var(--muted-foreground)]">
                                    {t('Sign in to access your account')}
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                {page.props.flash?.success && (
                                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                                        {page.props.flash.success}
                                    </div>
                                )}

                                {new URLSearchParams(window.location.search).get('expired') === '1' && (
                                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                        <Clock4 className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>{t('Your session expired. Please log in again to continue.')}</span>
                                    </div>
                                )}

                                <form onSubmit={handleLoginSubmit} className="space-y-5">
                                    {error && (
                                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                            <AlertCircle className="h-4 w-4" />
                                            {error}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="login-email">{t('Email')}</Label>
                                        <Input
                                            id="login-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="login-password">{t('Password')}</Label>
                                            <Link
                                                href="/forgot-password"
                                                className="text-sm font-medium text-[#1d4ed8] hover:text-[#1e3a8a]"
                                            >
                                                {t('Forgot password?')}
                                            </Link>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id="login-password"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                value={loginPassword}
                                                onChange={(e) => setLoginPassword(e.target.value)}
                                                className="pr-10"
                                                required
                                            />

                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((current) => !current)}
                                                className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                                                aria-label={showPassword ? t('Hide password') : t('Show password')}
                                                aria-pressed={showPassword}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full" disabled={loading}>
                                        {loading ? t('Signing in...') : t('Sign In')}
                                    </Button>

                                    {demoLogin ? (
                                        <div className="space-y-2">
                                            <p className="text-center text-xs uppercase tracking-[0.18em] text-slate-400">
                                                {t('Demo quick login')}
                                            </p>
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                {[
                                                    { role: 'superadmin', label: t('Super Admin') },
                                                    { role: 'schooladmin', label: t('School Admin') },
                                                    { role: 'teacher', label: t('Teacher') },
                                                    { role: 'accountant', label: t('Accountant') },
                                                    { role: 'receptionist', label: t('Receptionist') },
                                                    { role: 'librarian', label: t('Librarian') },
                                                    { role: 'driver', label: t('Driver') },
                                                    { role: 'transport-manager', label: t('Transport Manager') },
                                                    { role: 'parent', label: t('Parent / Student') },
                                                ].map((item) => (
                                                    <button
                                                        key={item.role}
                                                        type="button"
                                                        onClick={() => router.visit(`/demo-login/${item.role}`)}
                                                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                                    >
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-center text-[11px] text-slate-400">
                                                {t('One-click demo access to each role.')}
                                            </p>
                                        </div>
                                    ) : null}

                                    <SSOButtons />
                                </form>

                                <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{t('Demo Credentials')}</p>
                                        <p className="text-xs text-slate-500">
                                            {t('Use these accounts to preview each organization type.')}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        {demoCredentials.map((credential) => (
                                            <button
                                                key={credential.email}
                                                type="button"
                                                onClick={() => {
                                                    setLoginEmail(credential.email);
                                                    setLoginPassword(credential.password);
                                                }}
                                                className="flex w-full flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs transition hover:border-blue-300 hover:bg-blue-50"
                                            >
                                                <span className="flex items-center justify-between gap-2">
                                                    <span className="font-medium text-slate-700">{credential.org}</span>
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                        {t(credential.type)}
                                                    </span>
                                                </span>
                                                <span className="text-slate-500">
                                                    {credential.email} · {credential.password}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-center text-[11px] text-slate-400">
                                        {t('Click an account to fill the login form.')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
