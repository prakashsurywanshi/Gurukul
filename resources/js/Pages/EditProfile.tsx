import { useLanguage } from '../i18n/LanguageProvider';
import React from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Mail, RefreshCcw, Save, ShieldCheck } from 'lucide-react';
import DashboardLayout from './DashboardLayout';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface EditProfileProps {
    user: any;
    inSuperAdminShell?: boolean;
}

export default function EditProfile({ user, inSuperAdminShell = false }: EditProfileProps) {
    const { t } = useLanguage();
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const isSuperAdmin = user.role === 'super_admin';
    const { data, setData, patch, processing, errors } = useForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
    });
    const otpForm = useForm({
        otp: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        patch('/profile');
    };

    const handleOtpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        otpForm.post('/profile/email/verify-otp', {
            preserveScroll: true,
            onSuccess: () => otpForm.reset('otp'),
        });
    };

    const handleResendOtp = () => {
        otpForm.post('/profile/email/resend-otp', {
            preserveScroll: true,
            onSuccess: () => otpForm.reset('otp'),
        });
    };

    const pageTitle = isSuperAdmin ? 'Edit Superadmin Profile' : 'Edit Profile';
    const pageDescription = isSuperAdmin
        ? 'Update the account details used for platform oversight, alerts, and verification.'
        : 'Update your account details here.';
    const cardDescription = isSuperAdmin
        ? 'Keep your superadmin contact details current. Email changes are applied only after verification.'
        : 'Keep your basic account information up to date. Email changes are applied only after verification.';

    const content = (
        <div className="p-8">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
                    <p className="mt-1 text-gray-600">{pageDescription}</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href={isSuperAdmin ? '/superadmin/profile' : '/profile'}>
                        <ArrowLeft className="h-4 w-4" />
                        {t('Back to Profile')}
                    </Link>
                </Button>
            </div>

            <div className={`grid gap-6 ${isSuperAdmin ? 'xl:grid-cols-[320px_minmax(0,1fr)]' : ''}`}>
                {isSuperAdmin && (
                    <Card className="h-fit overflow-hidden border-slate-200">
                        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 p-6 text-white">
                            <p className="text-sm font-medium text-blue-100">{t('Platform Oversight Account')}</p>
                            <h2 className="mt-2 text-2xl font-bold">{user.name}</h2>
                            <p className="mt-1 text-sm text-blue-100">{user.email}</p>
                        </div>
                        <CardContent className="space-y-4 pt-6">
                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    {t('Role')}
                                </p>
                                <p className="mt-2 text-base font-semibold text-slate-900">{t('Super Admin')}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    {t('Current Status')}
                                </p>
                                <p className="mt-2 text-base font-semibold text-slate-900">
                                    {user.status || t('active')}
                                </p>
                            </div>
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                                {t(
                                    'Use this form for personal account information only. Organization-wide settings remain in the superadmin modules.',
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className={isSuperAdmin ? '' : t('max-w-3xl')}>
                    <CardHeader>
                        <CardTitle>{t('Profile Details')}</CardTitle>
                        <CardDescription>{cardDescription}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {page.props.flash?.success && (
                            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                                {page.props.flash.success}
                            </div>
                        )}

                        {page.props.flash?.error && (
                            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                {page.props.flash.error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('Full Name')}</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                    />

                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">{t('Email')}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                    />

                                    <p className="text-xs text-gray-500">
                                        {t(
                                            'Changing this sends a 6-digit OTP to the new email address. The email is updated only after OTP verification.',
                                        )}
                                    </p>
                                    {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t('Phone')}</Label>
                                    <Input
                                        id="phone"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder={t('Enter phone number')}
                                    />

                                    {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">{t('Address')}</Label>
                                <Textarea
                                    id="address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    placeholder={t('Enter address')}
                                    rows={5}
                                />

                                {errors.address && <p className="text-sm text-red-600">{errors.address}</p>}
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={processing}>
                                    <Save className="h-4 w-4" />
                                    {processing ? t('Saving...') : t('Save Changes')}
                                </Button>
                            </div>
                        </form>

                        {user.pending_email && (
                            <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-blue-800">
                                            <Mail className="h-4 w-4" />
                                            <p className="text-sm font-semibold">{t('Pending email verification')}</p>
                                        </div>
                                        <p className="text-sm text-blue-900">
                                            {t('Enter the OTP sent to')}{' '}
                                            <span className="font-semibold">{user.pending_email}</span>
                                            {'. '}
                                            {t('Your current email stays active until verification is complete.')}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-blue-300 bg-white text-blue-700 hover:bg-blue-100"
                                        onClick={handleResendOtp}
                                        disabled={otpForm.processing}
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                        {t('Resend OTP')}
                                    </Button>
                                </div>

                                <form onSubmit={handleOtpSubmit} className="mt-5 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email-otp">{t('Email OTP')}</Label>
                                        <InputOTP
                                            id="email-otp"
                                            maxLength={6}
                                            value={otpForm.data.otp}
                                            onChange={(value) => otpForm.setData('otp', value)}
                                            containerClassName="justify-start"
                                        >
                                            <InputOTPGroup>
                                                <InputOTPSlot index={0} />
                                                <InputOTPSlot index={1} />
                                                <InputOTPSlot index={2} />
                                                <InputOTPSlot index={3} />
                                                <InputOTPSlot index={4} />
                                                <InputOTPSlot index={5} />
                                            </InputOTPGroup>
                                        </InputOTP>
                                        {otpForm.errors.otp && (
                                            <p className="text-sm text-red-600">{otpForm.errors.otp}</p>
                                        )}
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={otpForm.processing || otpForm.data.otp.length !== 6}
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            {otpForm.processing ? t('Verifying...') : t('Verify OTP And Update Email')}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    if (inSuperAdminShell) {
        return content;
    }

    return (
        <DashboardLayout user={user} activeTab="profile">
            {content}
        </DashboardLayout>
    );
}
