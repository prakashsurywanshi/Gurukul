import { useLanguage } from '../../i18n/LanguageProvider';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Image as ImageIcon, Pencil, Save, Sun, Moon, Monitor, GraduationCap, ArrowRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface SettingsProps {
    user: {
        organization_id?: number | null;
    };
    organization: {
        id: number;
        slug: string | null;
        name: string | null;
        email: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        pincode: string | null;
        website: string | null;
        logo: string | null;
        type?: string | null;
        settings?: {
            session?: string;
            sessions?: string[];
            date_format?: string;
            language_settings?: Record<string, any>;
            portal_routing?: string;
        } | null;
    } | null;
    sessionRecords: {
        id: number;
        name: string;
        is_current: boolean;
    }[];
}

const defaultSettingsForm = {
    organizationCode: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    website: '',
    academicSession: '',
    dateFormat: 'DD-MM-YYYY',
    logo: '',
    orgType: 'school',
    portalRouting: 'session',
};

const dateFormatOptions = ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'];

export default function Settings({ user, organization, sessionRecords }: SettingsProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: { success?: string; error?: string };
        activeSession?: string | null;
    }>();
    const flash = page.props.flash ?? {};
    const activeSession = page.props.activeSession ?? null;
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(defaultSettingsForm);
    const { theme, setTheme } = useTheme();

    const availableSessions = useMemo(() => sessionRecords.map((session) => session.name), [sessionRecords]);
    const selectedAcademicSession =
        formData.academicSession ||
        activeSession ||
        sessionRecords.find((session) => session.is_current)?.name ||
        organization?.settings?.session ||
        '';

    useEffect(() => {
        setFormData({
            organizationCode: organization?.slug || '',
            name: organization?.name || '',
            email: organization?.email || '',
            phone: organization?.phone || '',
            address: organization?.address || '',
            city: organization?.city || '',
            state: organization?.state || '',
            pincode: organization?.pincode || '',
            website: organization?.website || '',
            academicSession:
                activeSession ||
                sessionRecords.find((session) => session.is_current)?.name ||
                organization?.settings?.session ||
                '',
            dateFormat: organization?.settings?.date_format || defaultSettingsForm.dateFormat,
            logo: organization?.logo || '',
            orgType: organization?.type || defaultSettingsForm.orgType,
            portalRouting: organization?.settings?.portal_routing || defaultSettingsForm.portalRouting,
        });
    }, [activeSession, organization, sessionRecords]);

    const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setFormData((current) => ({
                ...current,
                logo: typeof reader.result === 'string' ? reader.result : current.logo,
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!organization) {
            return;
        }

        router.patch(
            '/settings',
            {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
                website: formData.website,
                academicSession: formData.academicSession,
                dateFormat: formData.dateFormat,
                logo: formData.logo,
                orgType: formData.orgType,
                portalRouting: formData.portalRouting,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsEditing(false);
                },
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="settings">
            <div className="min-h-full bg-slate-50 p-8 dark:bg-[var(--background)]">
                <div className="mx-auto max-w-4xl space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-[var(--foreground)]">
                                {t('School Settings')}
                            </h1>
                            <p className="mt-1 text-sm text-slate-600 dark:text-[var(--muted-foreground)]">
                                {t(
                                    'Update your organization details, academic session, and format preferences from one place.',
                                )}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant={isEditing ? 'outline' : 'default'}
                            onClick={() => {
                                setIsEditing((current) => !current);
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                            {isEditing ? t('Cancel Edit') : t('Edit Setting')}
                        </Button>
                    </div>

                    <Card className="border-slate-200 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-[var(--foreground)]">
                                <Sun className="h-5 w-5 text-blue-500" />
                                {t('Dashboard Theme')}
                            </CardTitle>
                            <CardDescription>
                                {t('Switch between light and dark mode for the admin dashboard.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={() => setTheme('light')}
                                    className={`group relative overflow-hidden rounded-2xl border-2 p-1 transition-all ${
                                        theme === 'light'
                                            ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                                            : 'border-slate-200 hover:border-slate-300 dark:border-[var(--border)] dark:hover:border-slate-600'
                                    }`}
                                >
                                    <div className="rounded-xl bg-[#f0f4ff] p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-3 w-3 rounded-full bg-[#09131f]" />
                                                <div className="h-2 w-16 rounded bg-[#2563eb]" />
                                            </div>
                                            <Sun className="h-4 w-4 text-[#1d4ed8]" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-[#09131f]" />
                                                <div className="flex-1 space-y-1">
                                                    <div className="h-2 w-20 rounded bg-[#2563eb]/40" />
                                                    <div className="h-2 w-14 rounded bg-[#2563eb]/20" />
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-[rgba(37,99,235,0.18)] bg-white p-2">
                                                <div className="mb-1 h-2 w-12 rounded bg-[#2563eb]/60" />
                                                <div className="space-y-1">
                                                    <div className="h-1.5 w-full rounded bg-slate-200" />
                                                    <div className="h-1.5 w-3/4 rounded bg-slate-200" />
                                                    <div className="h-1.5 w-5/6 rounded bg-slate-200" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 py-3">
                                        <Sun className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            {t('Light Mode')}
                                        </span>
                                    </div>
                                    {theme === 'light' && (
                                        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                                            <svg
                                                className="h-3 w-3"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={3}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setTheme('dark')}
                                    className={`group relative overflow-hidden rounded-2xl border-2 p-1 transition-all ${
                                        theme === 'dark'
                                            ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                                            : 'border-slate-200 hover:border-slate-300 dark:border-[var(--border)] dark:hover:border-slate-600'
                                    }`}
                                >
                                    <div className="rounded-xl bg-[#0b1623] p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-3 w-3 rounded-full bg-[#2563eb]" />
                                                <div className="h-2 w-16 rounded bg-[#2563eb]/60" />
                                            </div>
                                            <Moon className="h-4 w-4 text-[#2563eb]" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-[#2563eb]/20" />
                                                <div className="flex-1 space-y-1">
                                                    <div className="h-2 w-20 rounded bg-[#2563eb]/30" />
                                                    <div className="h-2 w-14 rounded bg-[#2563eb]/15" />
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-[rgba(59,130,246,0.15)] bg-[#0f1f32] p-2">
                                                <div className="mb-1 h-2 w-12 rounded bg-[#2563eb]/40" />
                                                <div className="space-y-1">
                                                    <div className="h-1.5 w-full rounded bg-[#15283d]" />
                                                    <div className="h-1.5 w-3/4 rounded bg-[#15283d]" />
                                                    <div className="h-1.5 w-5/6 rounded bg-[#15283d]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 py-3">
                                        <Moon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            {t('Dark Mode')}
                                        </span>
                                    </div>
                                    {theme === 'dark' && (
                                        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                                            <svg
                                                className="h-3 w-3"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={3}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setTheme('system')}
                                    className={`group relative overflow-hidden rounded-2xl border-2 p-1 transition-all ${
                                        theme === 'system'
                                            ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                                            : 'border-slate-200 hover:border-slate-300 dark:border-[var(--border)] dark:hover:border-slate-600'
                                    }`}
                                >
                                    <div className="rounded-xl bg-gradient-to-br from-[#f0f4ff] to-[#0b1623] p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-[#09131f] to-[#2563eb]" />
                                                <div className="h-2 w-16 rounded bg-gradient-to-r from-[#2563eb]/40 to-[#2563eb]/60" />
                                            </div>
                                            <Monitor className="h-4 w-4 text-[#2563eb]" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#09131f] to-[#2563eb]/20" />
                                                <div className="flex-1 space-y-1">
                                                    <div className="h-2 w-20 rounded bg-gradient-to-r from-[#2563eb]/30 to-[#2563eb]/40" />
                                                    <div className="h-2 w-14 rounded bg-gradient-to-r from-[#2563eb]/15 to-[#2563eb]/20" />
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-[rgba(59,130,246,0.2)] bg-gradient-to-br from-white/50 to-[#0f1f32]/80 p-2">
                                                <div className="mb-1 h-2 w-12 rounded bg-gradient-to-r from-[#2563eb]/40 to-[#2563eb]/30" />
                                                <div className="space-y-1">
                                                    <div className="h-1.5 w-full rounded bg-gradient-to-r from-slate-200 to-[#15283d]" />
                                                    <div className="h-1.5 w-3/4 rounded bg-gradient-to-r from-slate-200 to-[#15283d]" />
                                                    <div className="h-1.5 w-5/6 rounded bg-gradient-to-r from-slate-200 to-[#15283d]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 py-3">
                                        <Monitor className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            {t('System')}
                                        </span>
                                    </div>
                                    {theme === 'system' && (
                                        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                                            <svg
                                                className="h-3 w-3"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={3}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
                        <CardHeader>
                            <CardTitle className="text-slate-900 dark:text-[var(--foreground)]">
                                {t('School Settings')}
                            </CardTitle>
                            <CardDescription>
                                {t('Keep your organization settings in a simple editable form.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {flash.success && (
                                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                                        {flash.success}
                                    </div>
                                )}

                                {flash.error && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                        {flash.error}
                                    </div>
                                )}

                                {!user.organization_id && (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                                        {t('No organization is linked to this admin account yet.')}
                                    </div>
                                )}

                                {user.organization_id && !organization && (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                                        {t('Organization data could not be loaded. Refresh the page and try again.')}
                                    </div>
                                )}

                                {organization && availableSessions.length === 0 && (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                                        {t(
                                            'No academic sessions were found in the database. Add one in Sessions first to choose it here.',
                                        )}
                                    </div>
                                )}

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="organization-code">{t('Organization Code')}</Label>
                                        <Input
                                            id="organization-code"
                                            value={formData.organizationCode}
                                            disabled
                                            readOnly
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="school-name">{t('School Name')}</Label>
                                        <Input
                                            id="school-name"
                                            value={formData.name}
                                            disabled={!isEditing}
                                            onChange={(event) =>
                                                setFormData({
                                                    ...formData,
                                                    name: event.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="organization-email">{t('Email')}</Label>
                                        <Input
                                            id="organization-email"
                                            type="email"
                                            value={formData.email}
                                            disabled={!isEditing}
                                            onChange={(event) =>
                                                setFormData({
                                                    ...formData,
                                                    email: event.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="organization-phone">{t('Phone')}</Label>
                                        <Input
                                            id="organization-phone"
                                            value={formData.phone}
                                            disabled={!isEditing}
                                            onChange={(event) =>
                                                setFormData({
                                                    ...formData,
                                                    phone: event.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="organization-website">{t('Website')}</Label>
                                        <Input
                                            id="organization-website"
                                            value={formData.website}
                                            disabled={!isEditing}
                                            onChange={(event) =>
                                                setFormData({
                                                    ...formData,
                                                    website: event.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('Institution Type')}</Label>
                                        <Select
                                            value={formData.orgType}
                                            onValueChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    orgType: value,
                                                })
                                            }
                                            disabled={!isEditing}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select institution type')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="school">{t('School')}</SelectItem>
                                                <SelectItem value="college">{t('College')}</SelectItem>
                                                <SelectItem value="coaching">{t('Coaching Center')}</SelectItem>
                                                <SelectItem value="university">{t('University')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-500 dark:text-[var(--muted-foreground)]">
                                            {t(
                                                'Colleges, coaching centers and universities get semester-based academic management.',
                                            )}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('Portal Routing')}</Label>
                                        <Select
                                            value={formData.portalRouting}
                                            onValueChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    portalRouting: value,
                                                })
                                            }
                                            disabled={!isEditing}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Session-based organization picker')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="session">
                                                    {t('Session-based organization picker')}
                                                </SelectItem>
                                                <SelectItem value="path">{t('URL path (domain.com/slug)')}</SelectItem>
                                                <SelectItem value="subdomain">
                                                    {t('Subdomain (slug.domain.com)')}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-500 dark:text-[var(--muted-foreground)]">
                                            {t(
                                                'Controls how public visitors are routed to this organization on the shared website.',
                                            )}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('Academic Session')}</Label>
                                        <Select
                                            value={selectedAcademicSession}
                                            onValueChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    academicSession: value,
                                                })
                                            }
                                            disabled={!isEditing || availableSessions.length === 0}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select academic session')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableSessions.map((session) => (
                                                    <SelectItem key={session} value={session}>
                                                        {session}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {selectedAcademicSession && (
                                            <p className="text-xs text-slate-500">
                                                {t('Current session:')}
                                                {selectedAcademicSession}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('Date Format')}</Label>
                                        <Select
                                            value={formData.dateFormat}
                                            onValueChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    dateFormat: value,
                                                })
                                            }
                                            disabled={!isEditing}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select date format')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {dateFormatOptions.map((format) => (
                                                    <SelectItem key={format} value={format}>
                                                        {format}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="school-address">{t('Address')}</Label>
                                    <Textarea
                                        id="school-address"
                                        value={formData.address}
                                        disabled={!isEditing}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                address: event.target.value,
                                            })
                                        }
                                        rows={4}
                                    />
                                </div>

                                <div className="grid gap-6 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="organization-city">{t('City')}</Label>
                                        <Input
                                            id="organization-city"
                                            value={formData.city}
                                            disabled={!isEditing}
                                            onChange={(event) =>
                                                setFormData({
                                                    ...formData,
                                                    city: event.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="organization-state">{t('State')}</Label>
                                        <Input
                                            id="organization-state"
                                            value={formData.state}
                                            disabled={!isEditing}
                                            onChange={(event) =>
                                                setFormData({
                                                    ...formData,
                                                    state: event.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="organization-pincode">{t('Pincode')}</Label>
                                        <Input
                                            id="organization-pincode"
                                            value={formData.pincode}
                                            disabled={!isEditing}
                                            onChange={(event) =>
                                                setFormData({
                                                    ...formData,
                                                    pincode: event.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_180px]">
                                    <div className="space-y-2">
                                        <Label htmlFor="school-logo">{t('School Logo')}</Label>
                                        <Input
                                            id="school-logo"
                                            type="file"
                                            accept="image/*"
                                            disabled={!isEditing}
                                            onChange={handleLogoChange}
                                        />

                                        <p className="text-xs text-slate-500">
                                            {t('Upload a logo only when editing settings.')}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                                        {formData.logo ? (
                                            <img
                                                src={formData.logo}
                                                alt={t('School logo preview')}
                                                className="max-h-28 max-w-full rounded-lg object-contain"
                                            />
                                        ) : (
                                            <div className="text-center text-slate-500">
                                                <ImageIcon className="mx-auto h-8 w-8" />
                                                <p className="mt-2 text-sm">{t('No logo')}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            id="save-settings-button"
                                            className="bg-blue-600 text-white hover:bg-blue-700"
                                        >
                                            <Save className="h-4 w-4" />
                                            {t('Save Settings')}
                                        </Button>
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </Card>

                    {(['college', 'coaching', 'university'] as string[]).includes(formData.orgType) && (
                        <Card className="border-slate-200 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-[var(--foreground)]">
                                    <GraduationCap className="h-5 w-5 text-blue-500" />
                                    {t('Semesters (College Mode)')}
                                </CardTitle>
                                <CardDescription>
                                    {t(
                                        'Divide the current academic session into semesters and manage which one is active.',
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    type="button"
                                    onClick={() => router.get('/semesters')}
                                    className="bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    {t('Manage Semesters')}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
