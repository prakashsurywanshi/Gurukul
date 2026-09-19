import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, Loader2, Pencil, RefreshCw, Save, Send, Unplug, XCircle } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';

interface TelegramSettingsProps {
    user: any;
    telegramSettings?: typeof defaultFormData;
    configured?: boolean;
}

const defaultFormData = {
    enabled: false,
    botToken: '',
    chatId: '',
};

export default function TelegramSettings(pageProps: TelegramSettingsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [validationResult, setValidationResult] = useState<{ ok: boolean; message: string } | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [formData, setFormData] = useState({
        ...defaultFormData,
        ...(pageProps.telegramSettings ?? {}),
    });
    const [connected, setConnected] = useState(pageProps.configured ?? false);

    useEffect(() => {
        setFormData({ ...defaultFormData, ...(pageProps.telegramSettings ?? {}) });
        setConnected(pageProps.configured ?? false);
    }, [pageProps.telegramSettings, pageProps.configured]);

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

    const updateField = (field: string, value: string | boolean) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const filled = (v?: string | null | undefined): boolean => v != null && String(v).trim() !== '';

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        router.patch('/settings/telegram', formData, {
            onFinish: () => {
                setIsSaving(false);
                setConnected(filled(formData.botToken) && filled(formData.chatId));
            },
        });
    };

    const handleValidate = () => {
        setIsValidating(true);
        setValidationResult(null);
        axios
            .post('/settings/telegram/validate')
            .then((res) => setValidationResult(res.data))
            .catch(() =>
                setValidationResult({ ok: false, message: 'Something went wrong while validating the connection.' }),
            )
            .finally(() => setIsValidating(false));
    };

    const handleDisconnect = () => {
        setIsDisconnecting(true);
        router.post(
            '/settings/telegram/disconnect',
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

    return (
        <DashboardLayout user={pageProps.user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-600 text-white">
                            <Send className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {t('Telegram Bot Monitoring')}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('Monitor system activity and receive alerts on Telegram.')}
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
                                        setFormData({ ...defaultFormData, ...(pageProps.telegramSettings ?? {}) });
                                    }}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button
                                    className="bg-sky-600 text-white hover:bg-sky-700"
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
                                {t('Telegram Connection')}
                            </CardTitle>
                            <Badge className={connected ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}>
                                {connected ? t('Connected') : t('Not Connected')}
                            </Badge>
                        </div>
                        <CardDescription>
                            {t(
                                'Create a bot with @BotFather on Telegram, then enter its token and the chat ID you want to receive alerts in. Test the connection to confirm delivery.',
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                            <div>
                                <p className="font-medium text-slate-900">{t('Enable Telegram Monitoring')}</p>
                                <p className="text-sm text-slate-500">
                                    {t('Receive automated alerts and summaries from Gurukul.')}
                                </p>
                            </div>
                            <Switch
                                checked={formData.enabled}
                                disabled={!isEditing}
                                onCheckedChange={(c) => updateField('enabled', c)}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Bot Token')}</Label>
                                <Input
                                    type="password"
                                    value={formData.botToken}
                                    disabled={!isEditing}
                                    onChange={(e) => updateField('botToken', e.target.value)}
                                    placeholder="123456789:ABCdefGHIjklmnopQRStuvWXYZ"
                                />
                                <p className="text-xs text-slate-500">
                                    {t('Get it from @BotFather via the /token command.')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Chat ID')}</Label>
                                <Input
                                    value={formData.chatId}
                                    disabled={!isEditing}
                                    onChange={(e) => updateField('chatId', e.target.value)}
                                    placeholder="-1001234567890"
                                />
                                <p className="text-xs text-slate-500">{t('Channel / group / personal chat ID.')}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleValidate}
                                disabled={isValidating || !filled(formData.botToken) || !filled(formData.chatId)}
                            >
                                {isValidating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                {t('Validate & Send Test Message')}
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
            </div>
        </DashboardLayout>
    );
}
