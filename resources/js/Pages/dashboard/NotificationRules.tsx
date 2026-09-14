import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { BellRing, Plus, Save, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';

interface NotificationRule {
    id: string;
    event_type: string;
    label: string;
    is_active: boolean;
    channels: string[];
    recipient_roles?: string[] | null;
    digest_summary?: string | null;
}

interface RulePageProps {
    user: any;
    rules: NotificationRule[];
    eventOptions: { event: string; label: string }[];
    roleOptions: string[];
    channelOptions: string[];
}

export default function NotificationRules({ user, rules, eventOptions, roleOptions, channelOptions }: RulePageProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [selected, setSelected] = useState<NotificationRule | null>(null);
    const [newEvent, setNewEvent] = useState<string>(eventOptions[0]?.event ?? '');
    const [label, setLabel] = useState<string>('');
    const [isActive, setIsActive] = useState<boolean>(true);
    const [channels, setChannels] = useState<string[]>(['bell']);
    const [recipientRoles, setRecipientRoles] = useState<string[]>([]);
    const [digestSummary, setDigestSummary] = useState<string>('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash.error, flash.success]);

    useEffect(() => {
        if (!selected) return;
        setLabel(selected.label);
        setIsActive(selected.is_active);
        setChannels(selected.channels ?? ['bell']);
        setRecipientRoles(selected.recipient_roles ?? []);
        setDigestSummary(selected.digest_summary ?? '');
    }, [selected]);

    const startNew = () => {
        setSelected(null);
        setLabel(eventOptions.find((o) => o.event === newEvent)?.label ?? '');
        setIsActive(true);
        setChannels(['bell']);
        setRecipientRoles([]);
        setDigestSummary('');
    };

    const toggleRole = (role: string) => {
        setRecipientRoles((current) =>
            current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
        );
    };

    const toggleChannel = (channel: string) => {
        setChannels((current) =>
            current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel],
        );
    };

    const save = () => {
        setProcessing(true);
        const payload = {
            event_type: selected?.event_type ?? newEvent,
            label,
            is_active: isActive,
            channels,
            recipient_roles: recipientRoles.length > 0 ? recipientRoles : null,
            digest_summary: digestSummary || null,
        };
        router.post('/settings/notification-rules', payload, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => toast.success(t('Notification rule saved.')),
            onError: () => toast.error(t('Failed to save notification rule.')),
            onFinish: () => setProcessing(false),
        });
    };

    const toggleRule = (rule: NotificationRule) => {
        router.post(
            `/settings/notification-rules/${rule.id}/toggle`,
            { is_active: !rule.is_active },
            { preserveScroll: true, preserveState: true },
        );
    };

    const remove = (rule: NotificationRule) => {
        if (!window.confirm(t('Delete this notification rule?'))) return;
        router.delete(`/settings/notification-rules/${rule.id}`, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <DashboardLayout user={user} activeTab="notification-rules">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('Notification Rules')}</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            {t('Tune which events notify which roles and over which channels.')}
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle>{t('Rules')}</CardTitle>
                                <CardDescription>{t('Each event type may have one active rule.')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {rules.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-slate-500">
                                        {t('No rules configured yet. All event types use defaults.')}
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-200">
                                        {rules.map((rule) => (
                                            <div key={rule.id} className="flex items-center justify-between gap-3 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelected(rule)}
                                                    className="min-w-0 flex-1 text-left"
                                                >
                                                    <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                                        <BellRing className="h-4 w-4 text-indigo-600" />
                                                        {rule.label}
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                                rule.is_active
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-slate-200 text-slate-600'
                                                            }`}
                                                        >
                                                            {rule.is_active ? t('Active') : t('Inactive')}
                                                        </span>
                                                    </p>
                                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                                        {rule.channels?.join(', ')}
                                                        {rule.recipient_roles?.length ? ` · ${rule.recipient_roles.join(', ')}` : ''}
                                                    </p>
                                                </button>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleRule(rule)}
                                                        className="rounded-md px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-200"
                                                    >
                                                        {rule.is_active ? t('Disable') : t('Enable')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => remove(rule)}
                                                        className="rounded-md p-1 text-slate-500 transition hover:bg-rose-100 hover:text-rose-600"
                                                        aria-label={t('Delete')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle>{selected ? t('Edit Rule') : t('Add Rule')}</CardTitle>
                                <CardDescription>
                                    {selected
                                        ? t('Changes apply to new notifications.')
                                        : t('Pick an event type to customize.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!selected && (
                                    <>
                                        <select
                                            value={newEvent}
                                            onChange={(event) => {
                                                setNewEvent(event.target.value);
                                                setLabel(
                                                    eventOptions.find((o) => o.event === event.target.value)?.label ?? '',
                                                );
                                            }}
                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                        >
                                            {eventOptions.map((option) => (
                                                <option key={option.event} value={option.event}>
                                                    {t(option.label)}
                                                </option>
                                            ))}
                                        </select>
                                        <Button variant="outline" onClick={startNew} className="w-full gap-2">
                                            <Plus className="h-4 w-4" />
                                            {t('Configure')}
                                        </Button>
                                    </>
                                )}

                                {selected && (
                                    <>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">
                                                {t('Label')}
                                            </label>
                                            <input
                                                type="text"
                                                value={label}
                                                onChange={(event) => setLabel(event.target.value)}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">
                                                {t('Channels')}
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {channelOptions.map((channel) => (
                                                    <button
                                                        key={channel}
                                                        type="button"
                                                        onClick={() => toggleChannel(channel)}
                                                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                                                            channels.includes(channel)
                                                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                                                : 'border-slate-300 bg-white text-slate-600'
                                                        }`}
                                                    >
                                                        {t(channel.charAt(0).toUpperCase() + channel.slice(1))}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">
                                                {t('Recipient roles')}
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {roleOptions.map((role) => (
                                                    <button
                                                        key={role}
                                                        type="button"
                                                        onClick={() => toggleRole(role)}
                                                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                                                            recipientRoles.includes(role)
                                                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                                                : 'border-slate-300 bg-white text-slate-600'
                                                        }`}
                                                    >
                                                        {t(role.charAt(0).toUpperCase() + role.slice(1))}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="mt-1 text-[11px] text-slate-400">
                                                {t('Empty means admins only.')}
                                            </p>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">
                                                {t('Digest summary')}
                                            </label>
                                            <textarea
                                                value={digestSummary}
                                                onChange={(event) => setDigestSummary(event.target.value)}
                                                rows={2}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                            />
                                        </div>

                                        <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                            <input
                                                type="checkbox"
                                                checked={isActive}
                                                onChange={(event) => setIsActive(event.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                                            />
                                            <span className="text-sm font-medium text-slate-800">
                                                {t('Rule active')}
                                            </span>
                                        </label>

                                        <div className="flex gap-2">
                                            <Button onClick={save} disabled={processing} className="flex-1 gap-2">
                                                <Save className="h-4 w-4" />
                                                {processing ? t('Saving...') : t('Save')}
                                            </Button>
                                            <Button variant="outline" onClick={() => setSelected(null)}>
                                                {t('Cancel')}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}