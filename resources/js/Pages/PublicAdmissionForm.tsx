import { useLanguage } from '../i18n/LanguageProvider';
import { Head, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Award, Mail, Send, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { localizeWebsiteContent, WebsiteContent, websiteThemes } from '../utils/websiteCmsContent';
import { orgTypeFeatures } from '../lib/orgTypeConfig';
import type { OrgType } from './sidebarMenu';
import TemplateFiveLayout from './website/TemplateFiveLayout';
import AdmissionCustomFields, { AdmissionCustomField } from './dashboard/students/AdmissionCustomFields';
import type { CurrentUser } from './Home';

interface PublicAdmissionFormProps {
    websiteContent?: Partial<WebsiteContent> | null;
    user?: CurrentUser | null;
    publishedPages?: Array<{ id?: number; title: string; slug: string }>;
    menuPages?: Array<{ id?: number; title: string; slug: string }>;
    admissionCustomFields?: AdmissionCustomField[];
}

export default function PublicAdmissionForm({
    websiteContent,
    user,
    publishedPages = [],
    menuPages = [],
    admissionCustomFields = [],
}: PublicAdmissionFormProps) {
    const { t, locale } = useLanguage();
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const cmsContent = useMemo(
        () => localizeWebsiteContent(websiteContent, locale),
        [websiteContent, locale],
    );
    const theme = websiteThemes[cmsContent.theme];
    const orgType = (websiteContent?.type ?? 'school') as OrgType;
    const orgFeatures = orgTypeFeatures(orgType);
    const isSchoolOrg = orgType === 'school';
    const programPlaceholder = orgType === 'coaching'
        ? t('e.g. NEET 2027')
        : orgType === 'university'
          ? t('e.g. B.A. Economics')
          : t('e.g. B.Sc Computer Science');
    const isLightTheme = true;
    const headingTextClass = isLightTheme ? 'text-slate-950' : 'text-white';
    const bodyTextClass = isLightTheme ? 'text-slate-600' : 'text-slate-300';
    const softTextClass = isLightTheme ? 'text-slate-500' : 'text-slate-400';
    const shellClass = isLightTheme
        ? 'border-slate-200/80 bg-white/88 shadow-[0_28px_80px_rgba(15,23,42,0.08)]'
        : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] shadow-[0_28px_80px_rgba(8,15,30,0.24)]';
    const inputClass = isLightTheme
        ? 'border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500/20'
        : 'border-white/20 bg-white/95 text-slate-900 shadow-lg shadow-slate-950/10 focus:border-blue-400';
    const { data, setData, post, processing, errors, reset } = useForm({
        full_name: '',
        email: '',
        phone: '',
        program_interest: '',
        previous_institution: '',
        message: '',
        email_verification_token: '',
        custom_fields: {},
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
                        <DialogTitle>{t('Admission Request Submitted')}</DialogTitle>
                        <DialogDescription>{page.props.flash?.success}</DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>

            <TemplateFiveLayout
                cmsContent={cmsContent}
                publishedPages={publishedPages}
                menuPages={menuPages}
                user={user}
            >
                <div
                    className={`relative overflow-hidden ${theme.pageBackground} ${isLightTheme ? 'text-slate-900' : 'text-slate-100'}`}
                >
                    <div className={`absolute inset-0 -z-10 ${theme.ambientBackground}`} />
                    <div
                        className={`absolute left-[-6rem] top-20 -z-10 h-64 w-64 rounded-full blur-3xl ${theme.leftGlow}`}
                    />

                    <div
                        className={`absolute right-[-4rem] top-12 -z-10 h-80 w-80 rounded-full blur-3xl ${theme.rightGlow}`}
                    />

                    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
                        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
                            <section className={`rounded-[2.25rem] border p-8 backdrop-blur-2xl ${shellClass}`}>
                                <div
                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${theme.heroBadge}`}
                                >
                                    <Sparkles className="h-4 w-4" />
                                    {cmsContent.admissionsEyebrow}
                                </div>
                                <h1
                                    className={`mt-6 text-4xl font-black tracking-tight sm:text-5xl ${headingTextClass}`}
                                >
                                    {cmsContent.admissionsTitle}
                                </h1>
                                <p className={`mt-4 text-base leading-7 ${bodyTextClass}`}>
                                    {cmsContent.admissionsDescription}
                                </p>

                                <div className="mt-8 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Users
                                            className={`mt-0.5 h-5 w-5 ${isLightTheme ? 'text-blue-500' : 'text-blue-300'}`}
                                        />

                                        <p className={bodyTextClass}>{cmsContent.admissionsPointOne}</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Award
                                            className={`mt-0.5 h-5 w-5 ${isLightTheme ? 'text-blue-500' : 'text-blue-300'}`}
                                        />

                                        <p className={bodyTextClass}>{cmsContent.admissionsPointTwo}</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Mail
                                            className={`mt-0.5 h-5 w-5 ${isLightTheme ? 'text-blue-500' : 'text-blue-300'}`}
                                        />

                                        <p className={bodyTextClass}>{cmsContent.admissionsEmail}</p>
                                    </div>
                                </div>

                                <div
                                    className={`mt-8 rounded-[1.8rem] border p-6 ${isLightTheme ? 'border-slate-200/80 bg-slate-50/80' : 'border-white/10 bg-white/5'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <ShieldCheck
                                            className={`mt-0.5 h-5 w-5 ${isLightTheme ? 'text-emerald-600' : 'text-emerald-300'}`}
                                        />

                                        <div>
                                            <p className={`font-semibold ${headingTextClass}`}>
                                                {t('Email verification required')}
                                            </p>
                                            <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>
                                                {t(
                                                    'We send a 6-digit code to the email address you enter. Once verified, you can submit the form securely.',
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className={`rounded-[2.25rem] border p-8 backdrop-blur-2xl ${shellClass}`}>
                                <h2 className={`text-2xl font-bold ${headingTextClass}`}>
                                    {cmsContent.admissionsFormTitle}
                                </h2>
                                <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>
                                    {cmsContent.admissionsFormIntro}
                                </p>

                                {page.props.flash?.error && (
                                    <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-600">
                                        {page.props.flash.error}
                                    </div>
                                )}

                                <form onSubmit={handleAdmissionSubmit} className="mt-6 space-y-4">
                                    <div
                                        className={`rounded-2xl border p-4 ${isLightTheme ? 'border-slate-200 bg-slate-50/90' : 'border-white/10 bg-white/5'}`}
                                    >
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="public-admission-email"
                                                className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}
                                            >
                                                {t('Email')}

                                                <span className="text-red-400">*</span>
                                            </Label>
                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <Input
                                                    id="public-admission-email"
                                                    type="email"
                                                    value={data.email}
                                                    onChange={(event) => handleEmailChange(event.target.value)}
                                                    placeholder="e.g. student@example.com"
                                                    className={inputClass}
                                                />

                                                <Button
                                                    type="button"
                                                    onClick={handleSendVerificationCode}
                                                    disabled={isSendingCode || !data.email}
                                                    className={`shrink-0 hover:brightness-110 ${theme.admissionsButton}`}
                                                >
                                                    {isSendingCode
                                                        ? t('Sending...')
                                                        : verificationStep === 'verified'
                                                          ? t('Resend Code')
                                                          : t('Verify Email')}
                                                </Button>
                                            </div>
                                            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                                            <p className={`text-xs ${softTextClass}`}>
                                                {t('A verification code will be sent to this email address.')}
                                            </p>
                                        </div>

                                        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
                                            <div className="flex-1 space-y-2">
                                                <Label
                                                    htmlFor="public-admission-email-code"
                                                    className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}
                                                >
                                                    {t('Email Verification Code')}
                                                </Label>
                                                <Input
                                                    id="public-admission-email-code"
                                                    value={verificationCode}
                                                    onChange={(event) =>
                                                        setVerificationCode(
                                                            event.target.value.replace(/\D/g, '').slice(0, 6),
                                                        )
                                                    }
                                                    placeholder={t('Enter 6-digit code')}
                                                    className={inputClass}
                                                    disabled={verificationStep === 'verified'}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={handleVerifyCode}
                                                disabled={
                                                    isVerifyingCode ||
                                                    verificationCode.length !== 6 ||
                                                    !data.email ||
                                                    verificationStep === 'verified'
                                                }
                                                className={`shrink-0 hover:brightness-110 ${theme.admissionsButton}`}
                                            >
                                                {verificationStep === 'verified'
                                                    ? t('Verified')
                                                    : isVerifyingCode
                                                      ? t('Verifying...')
                                                      : t('Confirm Code')}
                                            </Button>
                                        </div>

                                        {verificationMessage && (
                                            <p
                                                className={`mt-3 text-sm ${verificationStep === 'verified' ? 'text-emerald-600' : bodyTextClass}`}
                                            >
                                                {verificationMessage}
                                            </p>
                                        )}

                                        {verificationError && (
                                            <p className="mt-3 text-sm text-red-500">{verificationError}</p>
                                        )}
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="public-admission-full-name"
                                                className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}
                                            >
                                                {t('Full Name')}

                                                <span className="text-red-400">*</span>
                                            </Label>
                                            <Input
                                                id="public-admission-full-name"
                                                value={data.full_name}
                                                onChange={(event) => setData('full_name', event.target.value)}
                                                placeholder={t("Enter student's full name")}
                                                className={inputClass}
                                            />

                                            {errors.full_name && (
                                                <p className="text-sm text-red-500">{errors.full_name}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="public-admission-phone"
                                                className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}
                                            >
                                                {t('Phone Number')}

                                                <span className="text-red-400">*</span>
                                            </Label>
                                            <Input
                                                id="public-admission-phone"
                                                value={data.phone}
                                                onChange={(event) => setData('phone', event.target.value)}
                                                placeholder={t('e.g. 9876543210')}
                                                className={inputClass}
                                            />

                                            {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="public-admission-program-interest"
                                                className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}
                                            >
                                                {t(orgFeatures.groupWordKey)}

                                                <span className="text-red-400">*</span>
                                            </Label>
                                            {isSchoolOrg ? (
                                                <select
                                                    id="public-admission-program-interest"
                                                    value={data.program_interest}
                                                    onChange={(event) => setData('program_interest', event.target.value)}
                                                    className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm outline-none ${isLightTheme ? 'border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500/20' : 'border-white/20 bg-white/95 text-slate-900 shadow-lg shadow-slate-950/10 focus:border-blue-400'}`}
                                                >
                                                    <option value="">{t('Select class')}</option>
                                                    {Array.from({ length: 12 }, (_, index) => {
                                                        const classNumber = String(index + 1);
                                                        return (
                                                            <option key={classNumber} value={classNumber}>
                                                                {classNumber}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            ) : (
                                                <Input
                                                    id="public-admission-program-interest"
                                                    value={data.program_interest}
                                                    onChange={(event) => setData('program_interest', event.target.value)}
                                                    placeholder={programPlaceholder}
                                                    className={inputClass}
                                                />
                                            )}
                                            {errors.program_interest && (
                                                <p className="text-sm text-red-500">{errors.program_interest}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="public-admission-previous-institution"
                                                className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}
                                            >
                                                {t('Previous Institution')}
                                            </Label>
                                            <Input
                                                id="public-admission-previous-institution"
                                                value={data.previous_institution}
                                                onChange={(event) =>
                                                    setData('previous_institution', event.target.value)
                                                }
                                                placeholder={t('e.g. Delhi Public School')}
                                                className={inputClass}
                                            />

                                            <p className={`text-xs ${softTextClass}`}>
                                                {t('Where did the student study last? Leave blank if first admission.')}
                                            </p>
                                            {errors.previous_institution && (
                                                <p className="text-sm text-red-500">{errors.previous_institution}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="public-admission-message"
                                            className={isLightTheme ? 'text-slate-700' : 'text-slate-200'}
                                        >
                                            {t('Message')}
                                        </Label>
                                        <Textarea
                                            id="public-admission-message"
                                            value={data.message}
                                            onChange={(event) => setData('message', event.target.value)}
                                            rows={5}
                                            placeholder={t("Any questions or details you'd like to share...")}
                                            className={inputClass}
                                        />

                                        {errors.message && <p className="text-sm text-red-500">{errors.message}</p>}
                                    </div>

                                    {admissionCustomFields.length > 0 && (
                                        <div
                                            className={`rounded-2xl border p-5 ${isLightTheme ? 'border-slate-200 bg-slate-50/90' : 'border-white/10 bg-white/5'}`}
                                        >
                                            <p className={`mb-4 text-sm font-semibold ${headingTextClass}`}>
                                                {t('Additional Information')}
                                            </p>
                                            <AdmissionCustomFields
                                                fields={admissionCustomFields}
                                                values={data.custom_fields}
                                                onChange={(fieldKey, value) =>
                                                    setData('custom_fields', {
                                                        ...data.custom_fields,
                                                        [fieldKey]: value,
                                                    })
                                                }
                                            />
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={
                                            processing ||
                                            verificationStep !== 'verified' ||
                                            !data.email_verification_token
                                        }
                                        className={`w-full gap-2 hover:brightness-110 ${theme.admissionsFormButton}`}
                                    >
                                        <Send className="h-4 w-4" />
                                        {processing
                                            ? t('Submitting...')
                                            : verificationStep === 'verified'
                                              ? t('Submit Admission Form')
                                              : t('Verify Email To Submit')}
                                    </Button>
                                </form>
                            </section>
                        </div>
                    </main>
                </div>
            </TemplateFiveLayout>
        </>
    );
}
