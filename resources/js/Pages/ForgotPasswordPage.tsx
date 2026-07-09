import React from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, GraduationCap, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ForgotPasswordPageProps {
  flash?: {
    success?: string;
  };
}

export default function ForgotPasswordPage() {
  const page = usePage<ForgotPasswordPageProps & { errors?: Record<string, string> }>();
  const { data, setData, post, processing, errors } = useForm({
    email: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/forgot-password');
  };

  return (
    <>
      <Head title="Forgot Password" />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(209,173,106,0.24),transparent_30%),linear-gradient(180deg,#fbf6ec_0%,#f3ead7_100%)]">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
          <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[2rem] border border-[rgba(209,173,106,0.2)] bg-[radial-gradient(circle_at_top,rgba(33,52,74,0.96),rgba(9,19,31,1)_58%)] p-8 text-white shadow-[0_32px_80px_rgba(8,19,31,0.28)] lg:p-10">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#edd39c,#b28745)] text-[#08131f] shadow-[0_18px_40px_rgba(178,135,69,0.32)]">
                  <GraduationCap className="h-9 w-9" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-[#f4deaf]">Gurukul</h1>
                  <p className="text-sm uppercase tracking-[0.24em] text-[rgba(246,239,223,0.72)]">Educational Institution Management System</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#e1c07f]">Password Recovery</p>
                <h2 className="text-3xl font-semibold">Get back into your account</h2>
                <p className="max-w-lg text-base leading-7 text-[rgba(246,239,223,0.72)]">
                  Enter the email address linked to your account and we&apos;ll send you a secure password reset link.
                </p>
              </div>

              <div className="mt-8 rounded-2xl border border-[rgba(236,211,160,0.28)] bg-[rgba(209,173,106,0.12)] p-4 text-sm text-[#f6efdf]">
                Reset links are time-limited for security. If you don&apos;t see the email, check your spam folder or try again in a minute.
              </div>
            </section>

            <Card className="border-[rgba(118,86,45,0.18)] bg-[rgba(255,250,239,0.94)] shadow-[0_28px_70px_rgba(8,19,31,0.12)]">
              <CardHeader className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f3dfb7,#d1ad6a)] text-[#08131f]">
                  <Mail className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl text-[var(--foreground)]">Forgot your password?</CardTitle>
                <CardDescription className="text-[var(--muted-foreground)]">We&apos;ll email a reset link to the address you provide.</CardDescription>
              </CardHeader>

              <CardContent>
                {page.props.flash?.success && (
                  <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {page.props.flash.success}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={data.email}
                      onChange={(e) => setData('email', e.target.value)}
                      required
                    />
                    {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={processing}>
                    {processing ? 'Sending link...' : 'Email reset link'}
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
