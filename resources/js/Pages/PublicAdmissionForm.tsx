import { Head, Link, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { ArrowLeft, Award, GraduationCap, Mail, Send, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { normalizeWebsiteContent, WebsiteContent, websiteThemes } from '../utils/websiteCmsContent';

interface PublicAdmissionFormProps {
  websiteContent?: Partial<WebsiteContent> | null;
}

export default function PublicAdmissionForm({ websiteContent }: PublicAdmissionFormProps) {
  const page = usePage<{ flash?: { success?: string; error?: string } }>();
  const cmsContent = useMemo(() => normalizeWebsiteContent(websiteContent), [websiteContent]);
  const theme = websiteThemes[cmsContent.theme];
  const isLightTheme = cmsContent.theme === 'white';
  const headingTextClass = isLightTheme ? 'text-slate-950' : 'text-white';
  const bodyTextClass = isLightTheme ? 'text-slate-600' : 'text-slate-300';
  const softTextClass = isLightTheme ? 'text-slate-500' : 'text-slate-400';
  const secondaryButtonClass = isLightTheme
    ? 'border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300 hover:bg-white'
    : 'border-white/15 bg-white/6 text-white hover:border-white/30 hover:bg-white/10';
  const shellClass = isLightTheme
    ? 'border-slate-200/80 bg-white/88 shadow-[0_28px_80px_rgba(15,23,42,0.08)]'
    : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] shadow-[0_28px_80px_rgba(8,15,30,0.24)]';
  const inputClass = 'border-white/10 bg-white/95 text-slate-900 shadow-lg shadow-slate-950/10';
  const { data, setData, post, processing, errors, reset } = useForm({
    full_name: '',
    email: '',
    phone: '',
    program_interest: '',
    previous_institution: '',
    message: '',
    email_verification_token: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationStep, setVerificationStep] = useState<'idle' | 'code-sent' | 'verified'>('idle');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  useEffect(() => {
    if (page.props.flash?.success) {
      setShowSuccessDialog(true);
    }
  }, [page.props.flash?.success]);

  const handleAdmissionSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    post('/admissions', {
      preserveScroll: true,
      onSuccess: () => {
        reset();
        setVerificationCode('');
        setVerificationStep('idle');
        setVerificationMessage('');
        setVerificationError('');
      },
    });
  };

  const handleEmailChange = (value: string) => {
    setData('email', value);
    setData('email_verification_token', '');
    setVerificationCode('');
    setVerificationStep('idle');
    setVerificationMessage('');
    setVerificationError('');
  };

  const handleSendVerificationCode = async () => {
    setVerificationError('');
    setVerificationMessage('');
    setIsSendingCode(true);

    try {
      const response = await axios.post('/admissions/send-verification-code', {
        full_name: data.full_name,
        email: data.email,
      });

      setVerificationStep('code-sent');
      setVerificationMessage(response.data.message);
      setData('email_verification_token', '');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.email?.[0] ||
        error?.response?.data?.errors?.full_name?.[0] ||
        'We could not send the verification code. Please check the email address and try again.';

      setVerificationError(message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    setVerificationError('');
    setVerificationMessage('');
    setIsVerifyingCode(true);

    try {
      const response = await axios.post('/admissions/verify-code', {
        email: data.email,
        code: verificationCode,
      });

      setVerificationStep('verified');
      setVerificationMessage(response.data.message);
      setData('email_verification_token', response.data.verification_token);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.code?.[0] ||
        'The verification code could not be confirmed. Please try again.';

      setVerificationError(message);
      setData('email_verification_token', '');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  return (
    <>
      <Head title={`${cmsContent.admissionsFormTitle} | ${cmsContent.brandName}`} />

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Admission Request Submitted</DialogTitle>
            <DialogDescription>
              {page.props.flash?.success}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <div className={`min-h-screen ${theme.pageBackground} ${isLightTheme ? 'text-slate-900' : 'text-slate-100'}`}>
        <div className="relative overflow-hidden">
          <div className={`absolute inset-0 -z-10 ${theme.ambientBackground}`} />
          <div className={`absolute left-[-6rem] top-20 -z-10 h-64 w-64 rounded-full blur-3xl ${theme.leftGlow}`} />
          <div className={`absolute right-[-4rem] top-12 -z-10 h-80 w-80 rounded-full blur-3xl ${theme.rightGlow}`} />

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
                <p className={`text-lg font-black uppercase tracking-[0.12em] ${headingTextClass}`}>{cmsContent.brandName}</p>
                <p className={`text-xs uppercase tracking-[0.3em] ${softTextClass}`}>{cmsContent.brandSubtitle}</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/" className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${secondaryButtonClass}`}>
                <ArrowLeft className="h-4 w-4" />
                Back To Home
              </Link>
              <Link href="/login" className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition hover:brightness-110 ${theme.topActionButton}`}>
                {cmsContent.loginLabel}
              </Link>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-5 pb-20 pt-4 sm:px-8 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
              <section className={`rounded-[2.25rem] border p-8 backdrop-blur-2xl ${shellClass}`}>
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${theme.heroBadge}`}>
                  <Sparkles className="h-4 w-4" />
                  {cmsContent.admissionsEyebrow}
                </div>
                <h1 className={`mt-6 text-4xl font-black tracking-tight sm:text-5xl ${headingTextClass}`}>{cmsContent.admissionsTitle}</h1>
                <p className={`mt-4 text-base leading-7 ${bodyTextClass}`}>{cmsContent.admissionsDescription}</p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3">
                    <Users className={`mt-0.5 h-5 w-5 ${isLightTheme ? 'text-amber-500' : 'text-amber-300'}`} />
                    <p className={bodyTextClass}>{cmsContent.admissionsPointOne}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Award className={`mt-0.5 h-5 w-5 ${isLightTheme ? 'text-amber-500' : 'text-amber-300'}`} />
                    <p className={bodyTextClass}>{cmsContent.admissionsPointTwo}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className={`mt-0.5 h-5 w-5 ${isLightTheme ? 'text-amber-500' : 'text-amber-300'}`} />
                    <p className={bodyTextClass}>{cmsContent.admissionsEmail}</p>
                  </div>
                </div>

                <div className={`mt-8 rounded-[1.8rem] border p-6 ${isLightTheme ? 'border-slate-200/80 bg-slate-50/80' : 'border-white/10 bg-white/5'}`}>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className={`mt-0.5 h-5 w-5 ${isLightTheme ? 'text-emerald-600' : 'text-emerald-300'}`} />
                    <div>
                      <p className={`font-semibold ${headingTextClass}`}>Email verification required</p>
                      <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>
                        We send a 6-digit code to the email address you enter. Once verified, you can submit the form securely.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className={`rounded-[2.25rem] border p-8 backdrop-blur-2xl ${shellClass}`}>
                <h2 className={`text-2xl font-bold ${headingTextClass}`}>{cmsContent.admissionsFormTitle}</h2>
                <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>{cmsContent.admissionsFormIntro}</p>

                {page.props.flash?.error && (
                  <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-600">
                    {page.props.flash.error}
                  </div>
                )}

                <form onSubmit={handleAdmissionSubmit} className="mt-6 space-y-4">
                  <div className={`rounded-2xl border p-4 ${isLightTheme ? 'border-slate-200 bg-slate-50/90' : 'border-white/10 bg-white/5'}`}>
                    <div className="space-y-2">
                      <Label htmlFor="public-admission-email" className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}>Email</Label>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                          id="public-admission-email"
                          type="email"
                          value={data.email}
                          onChange={(event) => handleEmailChange(event.target.value)}
                          placeholder="Enter email address"
                          className={inputClass}
                        />
                        <Button
                          type="button"
                          onClick={handleSendVerificationCode}
                          disabled={isSendingCode || !data.email}
                          className={`shrink-0 hover:brightness-110 ${theme.admissionsButton}`}
                        >
                          {isSendingCode ? 'Sending...' : verificationStep === 'verified' ? 'Resend Code' : 'Verify Email'}
                        </Button>
                      </div>
                      {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                      <p className={`text-xs ${softTextClass}`}>Verify this email first. The admission form can only be submitted after verification.</p>
                    </div>

                    <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="public-admission-email-code" className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}>Email Verification Code</Label>
                        <Input
                          id="public-admission-email-code"
                          value={verificationCode}
                          onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit code"
                          className={inputClass}
                          disabled={verificationStep === 'verified'}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={isVerifyingCode || verificationCode.length !== 6 || !data.email || verificationStep === 'verified'}
                        className={`shrink-0 hover:brightness-110 ${theme.admissionsButton}`}
                      >
                        {verificationStep === 'verified' ? 'Verified' : isVerifyingCode ? 'Verifying...' : 'Confirm Code'}
                      </Button>
                    </div>

                    {verificationMessage && (
                      <p className={`mt-3 text-sm ${verificationStep === 'verified' ? 'text-emerald-600' : bodyTextClass}`}>{verificationMessage}</p>
                    )}

                    {verificationError && <p className="mt-3 text-sm text-red-500">{verificationError}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="public-admission-full-name" className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}>Full Name</Label>
                      <Input id="public-admission-full-name" value={data.full_name} onChange={(event) => setData('full_name', event.target.value)} className={inputClass} />
                      {errors.full_name && <p className="text-sm text-red-500">{errors.full_name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="public-admission-phone" className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}>Phone Number</Label>
                      <Input id="public-admission-phone" value={data.phone} onChange={(event) => setData('phone', event.target.value)} className={inputClass} />
                      {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="public-admission-program-interest" className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}>Class</Label>
                      <select
                        id="public-admission-program-interest"
                        value={data.program_interest}
                        onChange={(event) => setData('program_interest', event.target.value)}
                        className="flex h-10 w-full rounded-md border border-white/10 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-lg shadow-slate-950/10 outline-none"
                      >
                        <option value="">Select class</option>
                        {Array.from({ length: 12 }, (_, index) => {
                          const classNumber = String(index + 1);
                          return (
                            <option key={classNumber} value={`Class ${classNumber}`}>
                              {`Class ${classNumber}`}
                            </option>
                          );
                        })}
                      </select>
                      {errors.program_interest && <p className="text-sm text-red-500">{errors.program_interest}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="public-admission-previous-institution" className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}>Previous Institution</Label>
                      <Input id="public-admission-previous-institution" value={data.previous_institution} onChange={(event) => setData('previous_institution', event.target.value)} className={inputClass} />
                      {errors.previous_institution && <p className="text-sm text-red-500">{errors.previous_institution}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="public-admission-message" className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}>Message</Label>
                    <Textarea id="public-admission-message" value={data.message} onChange={(event) => setData('message', event.target.value)} rows={5} className={inputClass} />
                    {errors.message && <p className="text-sm text-red-500">{errors.message}</p>}
                  </div>

                  <Button type="submit" disabled={processing || verificationStep !== 'verified' || !data.email_verification_token} className={`w-full gap-2 hover:brightness-110 ${theme.admissionsFormButton}`}>
                    <Send className="h-4 w-4" />
                    {processing ? 'Submitting...' : verificationStep === 'verified' ? 'Submit Admission Form' : 'Verify Email To Submit'}
                  </Button>
                </form>
              </section>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
