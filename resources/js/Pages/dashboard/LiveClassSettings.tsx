import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Save, Video } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const TOGGLES = [
    ['auto_record', 'Automatically record live classes'],
    ['allow_chat', 'Allow participants to chat'],
    ['send_join_notifications', 'Send join link notifications'],
    ['require_approval', 'Require approval to join'],
] as const;

type SettingsShape = {
    default_platform: string;
    max_participants: string;
    auto_record: boolean;
    allow_chat: boolean;
    send_join_notifications: boolean;
    require_approval: boolean;
};

export default function LiveClassSettings({ user, settings }: { user: any; settings: SettingsShape }) {
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
        router.patch('/live-classes/settings', form, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => toast.success(t('Live class settings saved.')),
            onError: () => toast.error(t('Failed to save live class settings.')),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <DashboardLayout user={user} activeTab="live-class-settings">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Live Class Settings')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Configure defaults for online live classes.')}
                            </p>
                        </div>
                        <Button onClick={save} disabled={processing} className="gap-2">
                            <Save className="h-4 w-4" />
                            {processing ? t('Saving...') : t('Save')}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('Class Preferences')}</CardTitle>
                            <CardDescription>{t('Defaults applied to every live class session.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="platform">{t('Default Platform')}</Label>
                                <Select
                                    value={form.default_platform}
                                    onValueChange={(value) => setForm((c) => ({ ...c, default_platform: value }))}
                                >
                                    <SelectTrigger id="platform">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="google_meet">{t('Google Meet')}</SelectItem>
                                        <SelectItem value="zoom">{t('Zoom')}</SelectItem>
                                        <SelectItem value="microsoft_teams">{t('Microsoft Teams')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="max-participants">{t('Max Participants')}</Label>
                                <Input
                                    id="max-participants"
                                    value={form.max_participants}
                                    onChange={(event) =>
                                        setForm((c) => ({ ...c, max_participants: event.target.value }))
                                    }
                                    inputMode="numeric"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {TOGGLES.map(([key, label]) => (
                                        <label
                                            key={key}
                                            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={form[key as keyof SettingsShape] as boolean}
                                                onChange={(event) =>
                                                    setForm((c) => ({
                                                        ...c,
                                                        [key]: event.target.checked,
                                                    }))
                                                }
                                                className="mt-1 h-4 w-4 rounded border-slate-300 accent-indigo-600"
                                            />
                                            <span className="text-sm font-medium text-slate-800">{t(label)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <Video className="h-8 w-8 shrink-0 text-indigo-600" />
                                <p className="text-sm text-slate-600">
                                    {t('Settings apply to new live class sessions created after saving.')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
