import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { GraduationCap, AlertCircle, ShieldCheck, Users, Briefcase, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

type LoginPortal = 'student_parent' | 'admin' | 'super_admin' | 'staff' | 'teacher';

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
    demoEmail: 'tejasphirke.steja@gmail.com',
    demoPassword: '12345678',
  },
  {
    id: 'admin',
    label: 'Admin Login',
    title: 'Admin Portal',
    description: 'For admins',
    icon: Briefcase,
    helper: 'Use your staff credentials to continue.',
    demoEmail: 'admin@qodeigence.com',
    demoPassword: '12345678',
  },
  {
    id: 'teacher',
    label: 'Teacher Login',
    title: 'Teacher Portal',
    description: 'For teachers',
    icon: Briefcase,
    helper: 'Use your Teacher credentials to continue.',
    demoEmail: 'teacher@qodeigence.com',
    demoPassword: '12345678',
  },
  // {
  //   id: 'super_admin',
  //   label: 'Superadmin Login',
  //   title: 'Superadmin Portal',
  //   description: 'For organization-wide oversight and privileged administration.',
  //   icon: ShieldCheck,
  //   helper: 'Use your superadmin credentials for full access.',
  //   demoEmail: 'hello@qodeigence.com',
  //   demoPassword: '12345678',
  // },
];

interface LoginPageProps {
  onLogin?: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export default function LoginPage(_: LoginPageProps) {
  const [selectedPortal, setSelectedPortal] = useState<LoginPortal>('staff');
  const [loginEmail, setLoginEmail] = useState('admin@qodeigence.com');
  const [loginPassword, setLoginPassword] = useState('12345678');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const page = usePage<{ errors?: Record<string, string>; flash?: { success?: string }; schoolName?: string | null; schoolLogo?: string | null }>();

  const error = page.props.errors?.email || page.props.errors?.password || '';
  const schoolName = page.props.schoolName || 'Gurukul';
  const schoolLogo = page.props.schoolLogo || '';
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
      }
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
      <Head title="Login" />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.24),transparent_30%),linear-gradient(180deg,#eff6ff_0%,#e0e7ff_100%)]">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
          <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[2rem] border border-[rgba(59,130,246,0.2)] bg-[radial-gradient(circle_at_top,rgba(33,52,74,0.96),rgba(9,19,31,1)_58%)] p-8 text-white shadow-[0_32px_80px_rgba(8,19,31,0.28)] lg:p-10">
              <div className="mb-8 flex items-center gap-4">
                <div className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-[#08131f] shadow-[0_18px_40px_rgba(59,130,246,0.32)] ${schoolLogo ? 'bg-white' : 'bg-[linear-gradient(135deg,#93c5fd,#3b82f6)]'}`}>
                  {schoolLogo ? (
                    <img src={schoolLogo} alt={`${schoolName} logo`} className="max-h-full max-w-full object-contain p-1.5" />
                  ) : (
                    <GraduationCap className="h-9 w-9" />
                  )}
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-[#93c5fd]">{schoolName}</h1>
                  <p className="text-sm uppercase tracking-[0.24em] text-[rgba(226,232,240,0.72)]">Educational Institution Management System</p>
                </div>
              </div>

              <a
                href="/"
                className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-[#93c5fd] backdrop-blur-sm transition hover:border-[rgba(147,197,253,0.45)] hover:bg-white/20 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Back to Website
              </a>

              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#60a5fa]">Choose Login Type</p>
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
                          <div className={`mt-0.5 rounded-xl p-2 ${isActive ? 'bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f]' : 'bg-white/10 text-slate-200'}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{option.label}</p>
                            <p className="mt-1 text-sm text-[rgba(226,232,240,0.72)]">{option.description}</p>
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
                <div className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl text-[#08131f] ${schoolLogo ? 'bg-white' : 'bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'}`}>
                  {schoolLogo ? (
                    <img src={schoolLogo} alt={`${schoolName} logo`} className="max-h-full max-w-full object-contain p-1" />
                  ) : (
                    <PortalIcon className="h-6 w-6" />
                  )}
                </div>
                <CardTitle className="text-2xl text-[var(--foreground)]">Welcome</CardTitle>
                <CardDescription className="text-[var(--muted-foreground)]">Sign in to access your account</CardDescription>
              </CardHeader>

              <CardContent>
                {page.props.flash?.success && (
                  <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {page.props.flash.success}
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
                    <Label htmlFor="login-email">Email</Label>
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
                      <Label htmlFor="login-password">Password</Label>
                      <Link href="/forgot-password" className="text-sm font-medium text-[#1d4ed8] hover:text-[#1e3a8a]">
                        Forgot password?
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
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
