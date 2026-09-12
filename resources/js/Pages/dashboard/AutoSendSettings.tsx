import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useEffect, useState } from 'react';
import { Bird, Cake, Pencil, Save, Send } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

interface AutoSendSettingsProps {
    user: any;
    autoSendSettings?: typeof defaultFormData | null;
}

const defaultFormData = {
    auto_send_birthdays: false,
    auto_send_greetings: false,
    birthday_notification_time: '09:00',
    greeting_days_ahead: 3,
    channel: 'sms',
};

export default function AutoSendSettings({ user, autoSendSettings }: AutoSendSettingsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<typeof defaultFormData>({
        ...defaultFormData,
        ...(autoSendSettings ?? {}),
    });

    useEffect(() => {
        setFormData({
            ...defaultFormData,
            ...(autoSendSettings ?? {}),
        });
    }, [autoSendSettings]);

    useEffect(() => {
        if (flash.success) {
            setIsEditing(false);
        }
    }, [flash.success]);

    const updateField = (field: keyof typeof defaultFormData, value: string | boolean | number) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.patch(
            '/engagement/auto-send-settings',
            {
                ...formData,
                greeting_days_ahead: Number(formData.greeting_days_ahead),
            },
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{t('Auto-send Settings')}</h2>
                        <p className="text-sm text-slate-500">
                            {t('Automate birthday wishes and festival greetings to the school community.')}
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

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <Cake className="mr-2 inline-block h-5 w-5 text-indigo-600" />
                                {t('Birthdays')}
                            </CardTitle>
                            <CardDescription>
                                {t('Send automatic birthday wishes recorded in the engagement list.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                                <div>
                                    <p className="font-medium text-slate-900">{t('Auto-send Birthdays')}</p>
                                    <p className="text-sm text-slate-500">
                                        {t('Send a birthday message on the morning of each upcoming birthday.')}
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.auto_send_birthdays}
                                    disabled={!isEditing}
                                    onCheckedChange={(value) => updateField('auto_send_birthdays', value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Notification Time')}</Label>
                                <Input
                                    type="time"
                                    className="max-w-xs"
                                    value={formData.birthday_notification_time}
                                    disabled={!isEditing || !formData.auto_send_birthdays}
                                    onChange={(event) => updateField('birthday_notification_time', event.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <Bird className="mr-2 inline-block h-5 w-5 text-indigo-600" />
                                {t('Festival Greetings')}
                            </CardTitle>
                            <CardDescription>
                                {t('Send scheduled greetings ahead of each saved festival.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                                <div>
                                    <p className="font-medium text-slate-900">{t('Auto-send Greetings')}</p>
                                    <p className="text-sm text-slate-500">
                                        {t('Send festival greetings automatically before the festival date.')}
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.auto_send_greetings}
                                    disabled={!isEditing}
                                    onCheckedChange={(value) => updateField('auto_send_greetings', value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Send Days Ahead')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={30}
                                    className="max-w-xs"
                                    value={formData.greeting_days_ahead}
                                    disabled={!isEditing || !formData.auto_send_greetings}
                                    onChange={(event) => updateField('greeting_days_ahead', event.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <Send className="mr-2 inline-block h-5 w-5 text-indigo-600" />
                                {t('Delivery Channel')}
                            </CardTitle>
                            <CardDescription>{t('The channel used to deliver automated messages.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {(['sms', 'email', 'whatsapp'] as const).map((channel) => (
                                <label
                                    key={channel}
                                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 ${
                                        formData.channel === channel ? 'border-indigo-300 bg-indigo-50' : ''
                                    }`}
                                >
                                    <span className="font-medium text-slate-900">
                                        {t(channel === 'sms' ? 'SMS' : channel === 'email' ? 'Email' : 'WhatsApp')}
                                    </span>
                                    <input
                                        type="radio"
                                        name="channel"
                                        value={channel}
                                        checked={formData.channel === channel}
                                        disabled={!isEditing}
                                        onChange={(event) => updateField('channel', event.target.value)}
                                        className="h-4 w-4 accent-indigo-600"
                                    />
                                </label>
                            ))}
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
