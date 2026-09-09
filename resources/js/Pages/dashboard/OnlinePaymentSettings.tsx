import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useEffect, useState } from 'react';
import { Banknote, CreditCard, Loader2, Pencil, QrCode, Save } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';

interface OnlinePaymentSettingsProps {
    user: any;
    onlinePaymentSettings?: typeof defaultFormData | null;
    gatewayStatus?: {
        enabled: boolean;
        razorpayEnabled: boolean;
        razorpayConfigured: boolean;
        razorpayMode: 'test' | 'live' | 'custom' | null;
        razorpayAvailable: boolean;
        upiEnabled: boolean;
        upiConfigured: boolean;
        upiAvailable: boolean;
    } | null;
}

interface TestResult {
    success: boolean;
    message: string;
    enabled?: boolean;
    razorpay?: boolean;
    upi?: boolean;
    razorpayMode?: 'test' | 'live' | 'custom' | null;
    razorpayConfigured?: boolean;
    upiConfigured?: boolean;
}

const defaultFormData = {
    enabled: false,
    razorpay_enabled: true,
    razorpay_key_id: '',
    razorpay_key_secret: '',
    razorpay_currency: 'INR',
    upi_enabled: true,
    upi_id: '',
    upi_holder_name: '',
};

export default function OnlinePaymentSettings({
    user,
    onlinePaymentSettings,
    gatewayStatus,
}: OnlinePaymentSettingsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [isEditing, setIsEditing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [formData, setFormData] = useState<typeof defaultFormData>({
        ...defaultFormData,
        ...(onlinePaymentSettings ?? {}),
    });
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);

    useEffect(() => {
        setFormData({
            ...defaultFormData,
            ...(onlinePaymentSettings ?? {}),
        });
    }, [onlinePaymentSettings]);

    useEffect(() => {
        if (flash.success) {
            setSuccessMessage(flash.success);
        }

        if (flash.error) {
            setErrorMessage(flash.error);
        }
    }, [flash.error, flash.success]);

    const enteredKeyMode = (keyId: string): 'test' | 'live' | 'custom' | null => {
        if (!keyId) {
            return null;
        }

        if (keyId.startsWith('rzp_test_')) {
            return 'test';
        }

        if (keyId.startsWith('rzp_live_')) {
            return 'live';
        }

        return 'custom';
    };

    const currentKeyMode = enteredKeyMode(formData.razorpay_key_id) ?? gatewayStatus?.razorpayMode ?? null;
    const isTestMode = Boolean(formData.enabled) && formData.razorpay_enabled && currentKeyMode === 'test';

    const modeBadge = (mode: 'test' | 'live' | 'custom' | null | undefined) => {
        if (mode === 'live') {
            return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{t('LIVE')}</Badge>;
        }

        if (mode === 'test') {
            return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{t('TEST')}</Badge>;
        }

        if (mode === 'custom') {
            return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">{t('CUSTOM')}</Badge>;
        }

        return <Badge variant="outline">{t('Not configured')}</Badge>;
    };

    const updateField = (field: keyof typeof defaultFormData, value: string | boolean) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setSuccessMessage('');
        setErrorMessage('');

        router.patch('/settings/online-payments', formData, {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditing(false);
            },
        });
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);

        try {
            const csrfToken = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
            const response = await axios.post(
                '/settings/online-payments/test',
                {},
                { headers: { 'X-XSRF-TOKEN': csrfToken } },
            );

            setTestResult(response.data);
        } catch (error) {
            const message = (error as any)?.response?.data?.message ?? 'Online payments check failed.';
            setTestResult({ success: false, message });
        } finally {
            setTesting(false);
        }
    };

    return (
        <DashboardLayout user={user} activeTab="communication">
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{t('Online Payments')}</h2>
                        <p className="text-sm text-slate-500">
                            {t('Configure Razorpay gateway and static UPI QR payments for fee collection.')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {!isEditing ? (
                            <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                                <Pencil className="h-4 w-4" />
                                {t('Edit')}
                            </Button>
                        ) : (
                            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                                {t('Cancel')}
                            </Button>
                        )}
                    </div>
                </div>

                {successMessage ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                        {successMessage}
                    </div>
                ) : null}
                {errorMessage ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        {errorMessage}
                    </div>
                ) : null}

                {isTestMode ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                        {t(
                            'TEST mode is active for Razorpay. Payments made now run on the Razorpay sandbox and will not reach the bank. Switch to rzp_live_... keys for real collections.',
                        )}
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <Banknote className="mr-2 inline-block h-5 w-5 text-indigo-600" />
                                {t('Payment Status')}
                            </CardTitle>
                            <CardDescription>
                                {t('Master switch for online self-service fee payments by students and parents.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                                <div>
                                    <p className="font-medium text-slate-900">{t('Enable Online Payments')}</p>
                                    <p className="text-sm text-slate-500">
                                        {t('Allows students to pay pending fees online on the My Fees page.')}
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.enabled}
                                    disabled={!isEditing}
                                    onCheckedChange={(value) => updateField('enabled', value)}
                                />
                            </div>
                            <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-900">{t('Online Payments')}</p>
                                        {gatewayStatus?.enabled ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                {t('Enabled')}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">{t('Disabled')}</Badge>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {gatewayStatus?.enabled
                                            ? t('Students can pay pending fees online.')
                                            : t('Online fee collection is turned off.')}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-900">{t('Razorpay')}</p>
                                        {modeBadge(currentKeyMode)}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {gatewayStatus?.razorpayAvailable
                                            ? t('Checkout is live for students.')
                                            : gatewayStatus?.razorpayConfigured
                                              ? `${t('Configured but')} ${t('paused')}`
                                              : t('Enter Key ID and Key Secret to configure.')}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-900">{t('Static UPI QR')}</p>
                                        {gatewayStatus?.upiAvailable ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                {t('Active')}
                                            </Badge>
                                        ) : gatewayStatus?.upiConfigured ? (
                                            <Badge variant="outline">{t('Paused')}</Badge>
                                        ) : (
                                            <Badge variant="outline">{t('Not configured')}</Badge>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {gatewayStatus?.upiConfigured
                                            ? t('Students can scan and pay from any UPI app.')
                                            : t('Enter a UPI ID and holder name to configure.')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <CreditCard className="mr-2 inline-block h-5 w-5 text-indigo-600" />
                                {t('Razorpay Gateway')}
                            </CardTitle>
                            <CardDescription>
                                {t('Card, net banking and UPI payments collected through Razorpay checkout.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                                <div>
                                    <p className="font-medium text-slate-900">{t('Enable Razorpay')}</p>
                                    <p className="text-sm text-slate-500">
                                        {t('Turn on the hosted Razorpay checkout for online fee payments.')}
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.razorpay_enabled}
                                    disabled={!isEditing || !formData.enabled}
                                    onCheckedChange={(value) => updateField('razorpay_enabled', value)}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>{t('Key ID')}</Label>
                                        {enteredKeyMode(formData.razorpay_key_id) || gatewayStatus?.razorpayMode
                                            ? modeBadge(currentKeyMode)
                                            : null}
                                    </div>
                                    <Input
                                        value={formData.razorpay_key_id}
                                        disabled={!isEditing || !formData.enabled}
                                        onChange={(event) => updateField('razorpay_key_id', event.target.value)}
                                        placeholder={t('Razorpay API Key ID (rzp_live_...)')}
                                    />
                                    <p className="text-xs text-slate-500">
                                        {t(
                                            'Keys starting with rzp_test_ run in sandbox mode; rzp_live_ keys collect real payments.',
                                        )}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Key Secret')}</Label>
                                    <Input
                                        type="password"
                                        value={formData.razorpay_key_secret}
                                        disabled={!isEditing || !formData.enabled}
                                        onChange={(event) => updateField('razorpay_key_secret', event.target.value)}
                                        placeholder={t('Razorpay API Key Secret')}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('Currency')}</Label>
                                <Input
                                    className="max-w-xs"
                                    value={formData.razorpay_currency}
                                    disabled={!isEditing || !formData.enabled}
                                    onChange={(event) => updateField('razorpay_currency', event.target.value)}
                                />
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                                {t(
                                    'Razorpay keys can be obtained from the Razorpay Dashboard under Settings > API Keys.',
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <QrCode className="mr-2 inline-block h-5 w-5 text-indigo-600" />
                                {t('Static UPI QR')}
                            </CardTitle>
                            <CardDescription>
                                {t('Show a school UPI QR so students can scan and pay directly from any UPI app.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                                <div>
                                    <p className="font-medium text-slate-900">{t('Enable UPI QR')}</p>
                                    <p className="text-sm text-slate-500">
                                        {t(
                                            'Students scan the QR with their UPI app and submit the transaction reference.',
                                        )}
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.upi_enabled}
                                    disabled={!isEditing || !formData.enabled}
                                    onCheckedChange={(value) => updateField('upi_enabled', value)}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>{t('UPI ID (VPA)')}</Label>
                                    <Input
                                        value={formData.upi_id}
                                        disabled={!isEditing || !formData.enabled}
                                        onChange={(event) => updateField('upi_id', event.target.value)}
                                        placeholder={t('e.g. gurukul@ybl')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Account Holder Name')}</Label>
                                    <Input
                                        value={formData.upi_holder_name}
                                        disabled={!isEditing || !formData.enabled}
                                        onChange={(event) => updateField('upi_holder_name', event.target.value)}
                                        placeholder={t('e.g. Vyankatesh Vidyalaya')}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Check Configuration')}</CardTitle>
                            <CardDescription>
                                {t('Verify gateway mode availability based on the saved settings.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
                                {testing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Banknote className="h-4 w-4" />
                                )}
                                {testing ? t('Checking...') : t('Check Configuration')}
                            </Button>

                            {testResult ? (
                                <div className="space-y-3">
                                    <div
                                        className={`rounded-lg border p-3 text-sm ${
                                            testResult.success
                                                ? 'border-green-200 bg-green-50 text-green-800'
                                                : 'border-red-200 bg-red-50 text-red-800'
                                        }`}
                                    >
                                        {testResult.message}
                                    </div>
                                    {typeof testResult.razorpay === 'boolean' || typeof testResult.upi === 'boolean' ? (
                                        <div className="grid gap-3 md:grid-cols-3">
                                            <div className="rounded-xl border border-slate-200 p-4">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {t('Online Payments')}
                                                    </p>
                                                    {testResult.enabled ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                            {t('Enabled')}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">{t('Disabled')}</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 p-4">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {t('Razorpay')}
                                                    </p>
                                                    {testResult.razorpay ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                            {t('Ready')}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">{t('Not ready')}</Badge>
                                                    )}
                                                </div>
                                                {testResult.razorpayMode ? modeBadge(testResult.razorpayMode) : null}
                                            </div>
                                            <div className="rounded-xl border border-slate-200 p-4">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {t('Static UPI QR')}
                                                    </p>
                                                    {testResult.upi ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                            {t('Ready')}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">{t('Not ready')}</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    {isEditing ? (
                        <div className="flex justify-end">
                            <Button type="submit">
                                <Save className="h-4 w-4" />
                                {t('Save Settings')}
                            </Button>
                        </div>
                    ) : null}
                </form>
            </div>
        </DashboardLayout>
    );
}
