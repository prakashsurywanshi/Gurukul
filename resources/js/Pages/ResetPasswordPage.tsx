import React from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, GraduationCap, KeyRound } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ResetPasswordPageProps {
  token: string;
  email: string;
}

export default function ResetPasswordPage({ token, email }: ResetPasswordPageProps) {
  const page = usePage<{ errors?: Record<string, string> }>();
  const { data, setData, post, processing, errors } = useForm({
    token,
    email: email || '',
    password: '',
    password_confirmation: '',
  });

  const genericError = page.props.errors?.token || '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/reset-password');
  };

  return (
    <>
      <Head title="Reset Password" />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.24),transparent_30%),linear-gradient(180deg,#eff6ff_0%,#e0e7ff_100%)]">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
          <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[2rem] border border-[rgba(59,130,246,0.2)] bg-[radial-gradient(circle_at_top,rgba(33,52,74,0.96),rgba(9,19,31,1)_58%)] p-8 text-white shadow-[0_32px_80px_rgba(8,19,31,0.28)] lg:p-10">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_18px_40px_rgba(59,130,246,0.32)]">
                  <GraduationCap className="h-9 w-9" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-[#93c5fd]">Gurukul</h1>
                  <p className="text-sm uppercase tracking-[0.24em] text-[rgba(226,232,240,0.72)]">Educational Institution Management System</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#60a5fa]">Choose A New Password</p>
                <h2 className="text-3xl font-semibold">Secure your account</h2>
                <p className="max-w-lg text-base leading-7 text-[rgba(226,232,240,0.72)]">
                  Create a new password with at least 8 characters. Once saved, you can sign in immediately with the updated password.
                </p>
              </div>

              <div className="mt-8 rounded-2xl border border-[rgba(147,197,253,0.28)] bg-[rgba(59,130,246,0.12)] p-4 text-sm text-[#f0f4ff]">
                Choose something unique that you don&apos;t reuse across other services.
              </div>
            </section>

            <Card className="border-[rgba(37,99,235,0.18)] bg-[rgba(255,255,255,0.94)] shadow-[0_28px_70px_rgba(8,19,31,0.12)]">
              <CardHeader className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#93c5fd,#2563eb)] text-[#08131f]">
                  <KeyRound className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl text-[var(--foreground)]">Reset password</CardTitle>
                <CardDescription className="text-[var(--muted-foreground)]">Set your new password below.</CardDescription>
              </CardHeader>

              <CardContent>
                {genericError && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {genericError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={data.email}
                      onChange={(e) => setData('email', e.target.value)}
                      required
                    />
                    {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 8 characters"
                      value={data.password}
                      onChange={(e) => setData('password', e.target.value)}
                      required
                    />
                    {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password_confirmation">Confirm password</Label>
                    <Input
                      id="password_confirmation"
                      type="password"
                      placeholder="Repeat your new password"
                      value={data.password_confirmation}
                      onChange={(e) => setData('password_confirmation', e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={processing}>
                    {processing ? 'Resetting password...' : 'Reset password'}
                  </Button>
                </form>

                <Button variant="link" className="mt-4 px-0" asChild>
                  <Link href="/login">
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
