import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import {
    CheckCircle2,
    ExternalLink,
    Globe,
    Loader2,
    Pencil,
    RefreshCw,
    Save,
    Share2,
    Unplug,
    XCircle,
} from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';

interface SocialMediaSettingsProps {
    user: any;
    socialMediaSettings?: typeof defaultFormData;
    configured?: boolean;
}

const defaultFormData = {
    facebook: {
        enabled: false,
        appId: '',
        pageId: '',
        pageName: '',
        accessToken: '',
        crossPostInstagram: false,
    },
    autopost: {
        notices: true,
        events: true,
        gallery: true,
    },
};

export default function SocialMediaSettings(pageProps: SocialMediaSettingsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        ok: boolean;
        message: string;
        page?: { id: string; name: string };
    } | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [formData, setFormData] = useState({
        ...defaultFormData,
        ...(pageProps.socialMediaSettings ?? {}),
    });
    const [connected, setConnected] = useState(pageProps.configured ?? false);

    useEffect(() => {
        setFormData({ ...defaultFormData, ...(pageProps.socialMediaSettings ?? {}) });
        setConnected(pageProps.configured ?? false);
    }, [pageProps.socialMediaSettings, pageProps.configured]);

    useEffect(() => {
        if (flash.success) {
            setSuccessMessage(flash.success);
            setTimeout(() => setSuccessMessage(''), 5000);
        }
        if (flash.error) {
            setErrorMessage(flash.error);
            setTimeout(() => setErrorMessage(''), 5000);
        }
    }, [flash.error, flash.success]);

    const updateFacebook = (field: string, value: string | boolean) => {
        setFormData((current) => ({
            ...current,
            facebook: { ...current.facebook, [field]: value },
        }));
    };

    const updateAutopost = (field: string, value: boolean) => {
        setFormData((current) => ({
            ...current,
            autopost: { ...current.autopost, [field]: value },
        }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        router.patch('/settings/social-media', formData, {
            onFinish: () => {
                setIsSaving(false);
                setConnected(filled(formData.facebook.pageId) && filled(formData.facebook.accessToken));
            },
        });
    };

    const handleValidate = () => {
        setIsValidating(true);
        setValidationResult(null);
        axios
            .post('/settings/social-media/validate')
            .then((res) => setValidationResult(res.data))
            .catch(() =>
                setValidationResult({ ok: false, message: 'Something went wrong while validating the connection.' }),
            )
            .finally(() => setIsValidating(false));
    };

    const handleDisconnect = () => {
        setIsDisconnecting(true);
        router.post(
            '/settings/social-media/disconnect',
            {},
            {
                onSuccess: () => {
                    setConnected(false);
                    setFormData({ ...defaultFormData });
                    setValidationResult(null);
                },
                onFinish: () => setIsDisconnecting(false),
            },
        );
    };

    const filled = (v?: string | null | undefined): boolean => v != null && String(v).trim() !== '';

    return (
        <DashboardLayout user={pageProps.user}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <Share2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {t('Social Media Autopost')}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('Automatically share school content to Facebook & Instagram.')}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {!isEditing && (
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                                <Pencil className="mr-2 h-4 w-4" /> {t('Edit')}
                            </Button>
                        )}
                        {isEditing && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData({ ...defaultFormData, ...(pageProps.socialMediaSettings ?? {}) });
                                    }}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button
                                    className="bg-blue-600 text-white hover:bg-blue-700"
                                    onClick={handleSubmit}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    {t('Save')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {successMessage && (
                    <div className="rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            {successMessage}
                        </div>
                    </div>
                )}

                {errorMessage && (
                    <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                        <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            {errorMessage}
                        </div>
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                {connected ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-gray-400" />
                                )}
                                {t('Facebook Page Connection')}
                            </CardTitle>
                            <Badge className={connected ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}>
                                {connected ? t('Connected') : t('Not Connected')}
                            </Badge>
                        </div>
                        <CardDescription>
                            {t(
                                "Connect your school's Facebook Page to automatically share notices, events, and gallery photos. If your Page has a linked Instagram Business account, those will be cross-posted too.",
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                            <div>
                                <p className="font-medium text-slate-900">{t('Enable Facebook Autopost')}</p>
                                <p className="text-sm text-slate-500">
                                    {t('Automatically share published content to your Facebook Page.')}
                                </p>
                            </div>
                            <Switch
                                checked={formData.facebook.enabled}
                                disabled={!isEditing}
                                onCheckedChange={(c) => updateFacebook('enabled', c)}
                            />
                        </div>

                        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                            <p className="font-medium">{t('How it works')}</p>
                            <ol className="mt-2 list-inside list-decimal space-y-1">
                                <li>
                                    {t(
                                        'Create a Facebook App at developers.facebook.com and obtain a long-lived Page Access Token with manage_pages and publish_pages permissions.',
                                    )}
                                </li>
                                <li>{t('Enter your App ID, Page ID and Access Token below.')}</li>
                                <li>{t('Click "Validate Connection" to verify your setup.')}</li>
                                <li>
                                    {t(
                                        'Once connected, notices, events and gallery albums will auto-share when autopost is enabled.',
                                    )}
                                </li>
                            </ol>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Facebook App ID')}</Label>
                                <Input
                                    value={formData.facebook.appId}
                                    disabled={!isEditing}
                                    onChange={(e) => updateFacebook('appId', e.target.value)}
                                    placeholder="1234567890123456"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Facebook Page ID')}</Label>
                                <Input
                                    value={formData.facebook.pageId}
                                    disabled={!isEditing}
                                    onChange={(e) => updateFacebook('pageId', e.target.value)}
                                    placeholder="000000000000000"
                                />
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Page Name')}</Label>
                                <Input
                                    value={formData.facebook.pageName}
                                    disabled={!isEditing}
                                    onChange={(e) => updateFacebook('pageName', e.target.value)}
                                    placeholder={t('Optional display name')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Page Access Token')}</Label>
                                <Input
                                    type="password"
                                    value={formData.facebook.accessToken}
                                    disabled={!isEditing}
                                    onChange={(e) => updateFacebook('accessToken', e.target.value)}
                                    placeholder="EAA..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                            <div>
                                <p className="font-medium text-slate-900">{t('Cross-post to Instagram')}</p>
                                <p className="text-sm text-slate-500">
                                    {t(
                                        'Share posts to Instagram via the linked Facebook Page. Requires an Instagram Business account linked to this Page.',
                                    )}
                                </p>
                            </div>
                            <Switch
                                checked={formData.facebook.crossPostInstagram}
                                disabled={!isEditing}
                                onCheckedChange={(c) => updateFacebook('crossPostInstagram', c)}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleValidate}
                                disabled={
                                    isValidating ||
                                    !filled(formData.facebook.pageId) ||
                                    !filled(formData.facebook.accessToken)
                                }
                            >
                                {isValidating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                {t('Validate Connection')}
                            </Button>
                            {connected && (
                                <Button variant="destructive" onClick={handleDisconnect} disabled={isDisconnecting}>
                                    {isDisconnecting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Unplug className="mr-2 h-4 w-4" />
                                    )}
                                    {t('Disconnect')}
                                </Button>
                            )}
                        </div>

                        {validationResult && (
                            <div
                                className={`rounded-lg p-4 text-sm ${validationResult.ok ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'}`}
                            >
                                <div className="flex items-center gap-2">
                                    {validationResult.ok ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <XCircle className="h-4 w-4" />
                                    )}
                                    {validationResult.message}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Globe className="h-4 w-4" />
                            {t('Auto-Share Content Types')}
                        </CardTitle>
                        <CardDescription>
                            {t('Choose which types of content to automatically share when published.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            {
                                key: 'notices',
                                label: 'Notice Board',
                                description: 'Share notices to your Facebook Page when published.',
                            },
                            {
                                key: 'events',
                                label: 'Events',
                                description: 'Share school events and calendars to Facebook.',
                            },
                            {
                                key: 'gallery',
                                label: 'Gallery Albums',
                                description: 'Share new gallery albums with cover photos.',
                            },
                        ].map((item) => (
                            <div
                                key={item.key}
                                className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                            >
                                <div>
                                    <p className="font-medium text-slate-900">{t(item.label)}</p>
                                    <p className="text-sm text-slate-500">{t(item.description)}</p>
                                </div>
                                <Switch
                                    checked={(formData.autopost as any)[item.key] ?? false}
                                    disabled={!isEditing}
                                    onCheckedChange={(c) => updateAutopost(item.key, c)}
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
