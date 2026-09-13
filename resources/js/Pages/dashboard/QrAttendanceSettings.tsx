import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { QrCode, Save, Settings } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

interface QrAttendanceSettingsProps {
    user: any;
    settings?: {
        enabled: boolean;
        duplicate_upsert: boolean;
        auto_late_mark: boolean;
        opening_time: string;
        late_after_minutes: number;
    };
}

export default function QrAttendanceSettings({ user, settings }: QrAttendanceSettingsProps) {
    const { t } = useLanguage();

    const { data, setData, post, processing, errors, wasSuccessful } = useForm({
        enabled: settings?.enabled ?? true,
        duplicate_upsert: settings?.duplicate_upsert ?? false,
        auto_late_mark: settings?.auto_late_mark ?? false,
        opening_time: settings?.opening_time ?? '08:30',
        late_after_minutes: settings?.late_after_minutes ?? 15,
    });

    useEffect(() => {
        if (!settings) {
            return;
        }

        setData({
            enabled: settings.enabled,
            duplicate_upsert: settings.duplicate_upsert,
            auto_late_mark: settings.auto_late_mark,
            opening_time: settings.opening_time,
            late_after_minutes: settings.late_after_minutes,
        });
    }, [settings]);

    const handleSave = () => {
        post('/qr-attendance/settings');
    };

    return (
        <DashboardLayout user={user} activeTab="qr-attendance-settings">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-3xl space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('QR Attendance Setting')}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {t('Configure how QR codes are scanned and how attendance is marked.')}
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Settings className="h-5 w-5 text-blue-500" />
                                {t('Global Behaviour')}
                            </CardTitle>
                            <CardDescription>
                                {t('Control whether QR scanning is available across the organization.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <Label>{t('Enable QR Attendance')}</Label>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {t('Allow scanning of student and staff QR codes.')}
                                    </p>
                                </div>
                                <Switch
                                    checked={data.enabled}
                                    onCheckedChange={(checked) => setData('enabled', Boolean(checked))}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <Label>{t('Update on duplicate scan')}</Label>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {t(
                                            'When a code is scanned twice for the same student on the same day, update the earlier status.',
                                        )}
                                    </p>
                                </div>
                                <Switch
                                    checked={data.duplicate_upsert}
                                    onCheckedChange={(checked) => setData('duplicate_upsert', Boolean(checked))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <QrCode className="h-5 w-5 text-blue-500" />
                                {t('Late Marking')}
                            </CardTitle>
                            <CardDescription>
                                {t(
                                    'Automatically mark a present scan as late when it is received after the opening window.',
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <Label>{t('Auto mark late')}</Label>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {t('Treat present scans after the opening time threshold as late.')}
                                    </p>
                                </div>
                                <Switch
                                    checked={data.auto_late_mark}
                                    onCheckedChange={(checked) => setData('auto_late_mark', Boolean(checked))}
                                />
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="opening-time">{t('Opening time')}</Label>
                                    <Input
                                        id="opening-time"
                                        type="time"
                                        value={data.opening_time}
                                        onChange={(event) => setData('opening_time', event.target.value)}
                                    />
                                    {errors.opening_time && (
                                        <p className="text-sm text-red-600">{errors.opening_time}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="late-after">{t('Late after (minutes)')}</Label>
                                    <Input
                                        id="late-after"
                                        type="number"
                                        min={0}
                                        max={180}
                                        value={data.late_after_minutes}
                                        onChange={(event) => {
                                            const value = Number(event.target.value);
                                            setData('late_after_minutes', Number.isFinite(value) ? value : 0);
                                        }}
                                    />
                                    <p className="text-xs text-gray-400">
                                        {t('Scans received after opening time plus this many minutes are marked late.')}
                                    </p>
                                    {errors.late_after_minutes && (
                                        <p className="text-sm text-red-600">{errors.late_after_minutes}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {wasSuccessful && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                            {t('QR attendance settings saved.')}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={processing} className="gap-2">
                            <Save className="h-4 w-4" />
                            {processing ? t('Saving...') : t('Save Settings')}
                        </Button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
