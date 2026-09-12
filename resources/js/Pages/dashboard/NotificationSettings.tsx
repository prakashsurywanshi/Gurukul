import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { BellRing, Save } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';

const TOGGLES = [
    ['email_alerts', 'Email alerts'],
    ['push_notifications', 'Push notifications'],
    ['sms_alerts', 'SMS alerts'],
    ['daily_digest', 'Daily digest'],
    ['event_reminders', 'Event reminders'],
    ['fee_due_reminders', 'Fee due reminders'],
    ['attendance_alerts', 'Attendance alerts'],
] as const;

type SettingsShape = Record<(typeof TOGGLES)[number][0], boolean>;

export default function NotificationSettings({ user, settings }: { user: any; settings: SettingsShape }) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [form, setForm] = useState<SettingsShape>(settings);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const save = () => {
        setProcessing(true);
        router.patch('/settings/notification', form, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => toast.success(t('Notification settings saved.')),
            onError: () => toast.error(t('Failed to save notification settings.')),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <DashboardLayout user={user} activeTab="notification-settings">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Notification Settings')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Choose which notifications the school sends and over which channels.')}
                            </p>
                        </div>
                        <Button onClick={save} disabled={processing} className="gap-2">
                            <Save className="h-4 w-4" />
                            {processing ? t('Saving...') : t('Save')}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('Notification Channels')}</CardTitle>
                            <CardDescription>{t('Toggles apply school-wide.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {TOGGLES.map(([key, label]) => (
                                    <label
                                        key={key}
                                        className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form[key]}
                                            onChange={(event) =>
                                                setForm((c) => ({ ...c, [key]: event.target.checked }))
                                            }
                                            className="mt-1 h-4 w-4 rounded border-slate-300 accent-indigo-600"
                                        />
                                        <span className="text-sm font-medium text-slate-800">{t(label)}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <BellRing className="h-8 w-8 shrink-0 text-indigo-600" />
                                <p className="text-sm text-slate-600">
                                    {t('Digest and reminder settings apply from the next scheduled run.')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
