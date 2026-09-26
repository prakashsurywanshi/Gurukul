import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { AlertCircle, Bot, Clock, Cpu, Loader2, Pencil, Plus, Send, Trash2, Users } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

export interface QwaAutoAlertTriggerOption {
    key: string;
    label: string;
    description: string;
    delivery: string;
    defaultRecipient: string;
}

export interface QwaAutoAlertRulePayload {
    id: string;
    triggerEvent: string;
    triggerLabel: string;
    delivery: string;
    enabled: boolean;
    recipientType: string;
    recipientRoles: string[];
    scheduleTime?: string | null;
    lastFiredAt?: string | null;
    language: string;
    template: { id: string; name: string; isCustom: boolean } | null;
}

interface QwaAutoAlertsProps {
    autoAlertsEnabled: boolean;
    qwaAutoAlertTriggerOptions: QwaAutoAlertTriggerOption[];
    qwaAutoAlertRules: QwaAutoAlertRulePayload[];
    qwaTemplateLanguages?: Array<{ code: string; name: string }>;
    qwaTemplates: Array<{
        id: string;
        name: string;
        isCustom?: boolean;
    }>;
}

interface RuleDraft {
    triggerEvent: string;
    qwaTemplateId: string;
    enabled: boolean;
    recipientType: string;
    recipientRoles: string[];
    scheduleTime: string;
    language: string;
}

const roleOptions = [
    { value: 'admin', label: 'Admins' },
    { value: 'super_admin', label: 'Super Admins' },
    { value: 'teacher', label: 'Teachers' },
    { value: 'receptionist', label: 'Receptionists' },
    { value: 'accountant', label: 'Accountants' },
    { value: 'librarian', label: 'Librarians' },
];

const recipientTypeOptions = [
    { value: 'parents', label: 'Parents / Guardians' },
    { value: 'students', label: 'Students' },
    { value: 'roles', label: 'Staff roles' },
];

const emptyDraft: RuleDraft = {
    triggerEvent: '',
    qwaTemplateId: '',
    enabled: true,
    recipientType: 'parents',
    recipientRoles: ['admin'],
    scheduleTime: '',
    language: 'auto',
};

export default function QwaAutoAlerts({
    autoAlertsEnabled: initialEnabled,
    qwaAutoAlertTriggerOptions = [],
    qwaAutoAlertRules = [],
    qwaTemplateLanguages = [],
    qwaTemplates = [],
}: QwaAutoAlertsProps) {
    const { t } = useLanguage();
    const [enabled, setEnabled] = useState(initialEnabled);
    const [saveEnabledProcessing, setSaveEnabledProcessing] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<QwaAutoAlertRulePayload | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<RuleDraft>(emptyDraft);
    const [testPhone, setTestPhone] = useState('');
    const [testTemplateId, setTestTemplateId] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    const triggerById = useMemo(
        () => new Map(qwaAutoAlertTriggerOptions.map((option) => [option.key, option])),
        [qwaAutoAlertTriggerOptions],
    );

    const handleToggleEnabled = (next: boolean) => {
        if (saveEnabledProcessing) {
            return;
        }

        setEnabled(next);
        setSaveEnabledProcessing(true);

        router.patch(
            '/communication/qwa-alerts/settings',
            { enabled: next },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(next ? 'Automatic alerts enabled.' : 'Automatic alerts disabled.'),
                onError: () => {
                    setEnabled(!next);
                    toast.error('Could not update the automatic alerts setting.');
                },
                onFinish: () => setSaveEnabledProcessing(false),
            },
        );
    };

    const openCreate = () => {
        const firstOption = qwaAutoAlertTriggerOptions[0];
        const firstTemplate = qwaTemplates[0];
        setEditingRule(null);
        setDraft({
            ...emptyDraft,
            triggerEvent: firstOption?.key ?? '',
            qwaTemplateId: firstTemplate?.id ?? '',
            recipientType: firstOption?.defaultRecipient ?? 'parents',
        });
        setDialogOpen(true);
    };

    const openEdit = (rule: QwaAutoAlertRulePayload) => {
        setEditingRule(rule);
        setDraft({
            triggerEvent: rule.triggerEvent,
            qwaTemplateId: rule.template?.id ?? '',
            enabled: rule.enabled,
            recipientType: rule.recipientType,
            recipientRoles: rule.recipientRoles?.length ? rule.recipientRoles : ['admin'],
            scheduleTime: rule.scheduleTime ?? '',
            language: rule.language ?? 'auto',
        });
        setDialogOpen(true);
    };

    const selectedTrigger = triggerById.get(draft.triggerEvent);

    const toggleRole = (role: string) => {
        setDraft((current) => ({
            ...current,
            recipientRoles: current.recipientRoles.includes(role)
                ? current.recipientRoles.filter((item) => item !== role)
                : [...current.recipientRoles, role],
        }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!draft.triggerEvent || !draft.qwaTemplateId) {
            toast.error('Choose a trigger and a template for the rule.');
            return;
        }

        if (saving) {
            return;
        }

        setSaving(true);

        const payload = {
            triggerEvent: draft.triggerEvent,
            qwaTemplateId: draft.qwaTemplateId,
            enabled: draft.enabled,
            recipientType: draft.recipientType,
            recipientRoles: draft.recipientRoles,
            scheduleTime: draft.scheduleTime || null,
            language: draft.language,
        };

        const options = {
            preserveScroll: true,
            onFinish: () => {
                setSaving(false);
                setDialogOpen(false);
            },
            onError: (errors: Record<string, string>) => {
                const message = errors.qwa_auto_alert || 'Could not save the automatic alert rule.';
                toast.error(message);
            },
        };

        if (editingRule) {
            router.patch(`/communication/qwa-alerts/rules/${editingRule.id}`, payload, options);
        } else {
            router.post('/communication/qwa-alerts/rules', payload, options);
        }
    };

    const handleToggleRule = (rule: QwaAutoAlertRulePayload, next: boolean) => {
        router.patch(
            `/communication/qwa-alerts/rules/${rule.id}`,
            {
                enabled: next,
                recipientType: rule.recipientType,
                recipientRoles: rule.recipientRoles,
                scheduleTime: rule.scheduleTime ?? null,
                language: rule.language ?? 'auto',
            },
            {
                preserveScroll: true,
                onError: () => toast.error('Could not update the rule.'),
            },
        );
    };

    const handleDeleteRule = (rule: QwaAutoAlertRulePayload) => {
        if (deletingId) {
            return;
        }

        setDeletingId(rule.id);

        router.delete(`/communication/qwa-alerts/rules/${rule.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
            onError: () => toast.error('Could not delete the rule.'),
        });
    };

    const handleTestSend = () => {
        if (!testTemplateId) {
            toast.error('Choose a template to test.');
            return;
        }

        const phone = testPhone.replace(/[^0-9]/g, '');

        if (phone.length !== 10) {
            toast.error('Enter a valid 10-digit phone number.');
            return;
        }

        if (sendingTest) {
            return;
        }

        setSendingTest(true);

        router.post(
            '/communication/qwa-alerts/test-send',
            { qwaTemplateId: testTemplateId, phone, triggerEvent: '' },
            {
                preserveScroll: true,
                onFinish: () => setSendingTest(false),
                onError: (errors) => {
                    const message = errors.qwa_delivery || errors.phone || 'Could not send the test message.';
                    toast.error(message);
                },
            },
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">{t('Automatic Alerts')}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                        {t(
                            'Attach WhatsApp templates to operations so messages are sent automatically when events happen or on a daily schedule.',
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5">
                    <div>
                        <p className="font-medium text-slate-900">{t('Automatic alerts')}</p>
                        <p className="text-xs text-slate-500">{t('Global on / off switch')}</p>
                    </div>
                    <Switch checked={enabled} onCheckedChange={handleToggleEnabled} disabled={saveEnabledProcessing} />
                </div>
            </div>

            {!enabled ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {t(
                        'Automatic alerts are currently disabled. Flip the master switch above (also available in Communication Settings) to activate your rules.',
                    )}
                </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Send className="h-4 w-4 text-blue-500" />
                            {t('Send a test message')}
                        </CardTitle>
                        <CardDescription>
                            {t('Verify a template looks right before wiring it to a rule. Sends to a single number.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2">
                            <Label>{t('Template')}</Label>
                            <Select value={testTemplateId} onValueChange={setTestTemplateId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Choose a template')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {qwaTemplates.map((template) => (
                                        <SelectItem key={template.id} value={template.id}>
                                            {template.name}
                                            {template.isCustom ? ` (${t('Custom')})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Phone number')}</Label>
                            <Input
                                value={testPhone}
                                onChange={(event) => setTestPhone(event.target.value)}
                                placeholder={t('10-digit mobile number')}
                            />
                        </div>
                        <Button type="button" onClick={handleTestSend} disabled={sendingTest} className="gap-2">
                            {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {t('Send test message')}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Cpu className="h-4 w-4 text-violet-500" />
                            {t('How it works')}
                        </CardTitle>
                        <CardDescription>{t('Rules bind a trigger to a template and a recipient group.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-slate-600">
                        <p className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            {t(
                                'Event triggers fire instantly (a fee payment recorded, a complaint lodged). Schedule triggers run once daily (fee due reminders, birthdays).',
                            )}
                        </p>
                        <p className="flex items-start gap-2">
                            <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            {t(
                                'Recipients can be parents/guardians, the students themselves, or specific staff roles.',
                            )}
                        </p>
                        <p className="flex items-start gap-2">
                            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            {t(
                                'Messages are queued behind your normal QWA sends, and each recipient is only notified once per event.',
                            )}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">{t('Alert rules')}</h3>
                    <p className="text-sm text-slate-500">
                        {qwaAutoAlertRules.length} {t('rule(s) configured')}
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            type="button"
                            className="gap-2"
                            disabled={qwaTemplates.length === 0 || qwaAutoAlertTriggerOptions.length === 0}
                            onClick={openCreate}
                        >
                            <Plus className="h-4 w-4" />
                            {t('New rule')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] w-[95vw] max-w-xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingRule ? t('Edit automatic alert rule') : t('Create automatic alert rule')}</DialogTitle>
                            <DialogDescription>
                                {selectedTrigger ? (
                                    <>
                                        <span className="font-medium">{selectedTrigger.label}</span>
                                        {' — '}
                                        {selectedTrigger.description}
                                    </>
                                ) : (
                                    t('Choose a trigger to describe.')
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t('Trigger')}</Label>
                                <Select
                                    value={draft.triggerEvent}
                                    onValueChange={(value) => {
                                        const option = triggerById.get(value);
                                        setDraft((current) => ({
                                            ...current,
                                            triggerEvent: value,
                                            recipientType: option?.defaultRecipient ?? current.recipientType,
                                        }));
                                    }}
                                    disabled={Boolean(editingRule)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Choose a trigger')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {qwaAutoAlertTriggerOptions.map((option) => (
                                            <SelectItem key={option.key} value={option.key}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('WhatsApp template')}</Label>
                                <Select
                                    value={draft.qwaTemplateId}
                                    onValueChange={(value) => setDraft((current) => ({ ...current, qwaTemplateId: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Choose a template')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {qwaTemplates.map((template) => (
                                            <SelectItem key={template.id} value={template.id}>
                                                {template.name}
                                                {template.isCustom ? ` (${t('Custom')})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('Language')}</Label>
                                <Select
                                    value={draft.language}
                                    onValueChange={(value) => setDraft((current) => ({ ...current, language: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Language')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">{t('Auto (per recipient)')}</SelectItem>
                                        {qwaTemplateLanguages.map((option) => (
                                            <SelectItem key={option.code} value={option.code}>
                                                {option.code.toUpperCase()} — {option.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">
                                    {t(
                                        'Auto sends each recipient the regional variant matching their preferred language; a manual choice forces that language for everyone.',
                                    )}
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>{t('Recipients')}</Label>
                                    <Select
                                        value={draft.recipientType}
                                        onValueChange={(value) =>
                                            setDraft((current) => ({ ...current, recipientType: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Recipient group')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {recipientTypeOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedTrigger?.delivery === 'schedule' ? (
                                    <div className="space-y-2">
                                        <Label>{t('Send time (optional)')}</Label>
                                        <Input
                                            type="time"
                                            value={draft.scheduleTime}
                                            onChange={(event) =>
                                                setDraft((current) => ({ ...current, scheduleTime: event.target.value }))
                                            }
                                        />
                                    </div>
                                ) : null}
                            </div>

                            {draft.recipientType === 'roles' ? (
                                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                                    <Label>{t('Roles to notify')}</Label>
                                    <div className="grid gap-2 md:grid-cols-2">
                                        {roleOptions.map((role) => (
                                            <label
                                                key={role.value}
                                                className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                                            >
                                                <Checkbox
                                                    checked={draft.recipientRoles.includes(role.value)}
                                                    onCheckedChange={() => toggleRole(role.value)}
                                                />
                                                {role.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                                <div>
                                    <p className="font-medium text-slate-900">{t('Rule enabled')}</p>
                                    <p className="text-sm text-slate-500">{t('Inactive rules are ignored by the engine.')}</p>
                                </div>
                                <Switch
                                    checked={draft.enabled}
                                    onCheckedChange={(checked) => setDraft((current) => ({ ...current, enabled: checked }))}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={saving} className="gap-2">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {editingRule ? t('Save changes') : t('Create rule')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {qwaAutoAlertRules.length > 0 ? (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Trigger')}</TableHead>
                                    <TableHead>{t('Template')}</TableHead>
                                    <TableHead>{t('Language')}</TableHead>
                                    <TableHead>{t('Recipients')}</TableHead>
                                    <TableHead>{t('Last fired')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {qwaAutoAlertRules.map((rule) => {
                                    const ruleTrigger = triggerById.get(rule.triggerEvent);

                                    return (
                                        <TableRow key={rule.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-900">{rule.triggerLabel}</span>
                                                    <Badge
                                                        variant={rule.delivery === 'schedule' ? 'secondary' : 'default'}
                                                        className="gap-1"
                                                    >
                                                        {rule.delivery === 'schedule' ? (
                                                            <Clock className="h-3 w-3" />
                                                        ) : (
                                                            <Bot className="h-3 w-3" />
                                                        )}
                                                        {rule.delivery === 'schedule' ? t('Scheduled') : t('Event')}
                                                    </Badge>
                                                </div>
                                                <p className="mt-0.5 text-xs text-slate-500">{ruleTrigger?.description ?? ''}</p>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-slate-700">
                                                    {rule.template?.name ?? '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {rule.language === 'auto'
                                                        ? t('Auto')
                                                        : (rule.language ?? 'en').toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {rule.recipientType === 'roles' ? (
                                                    <span className="text-sm text-slate-600">
                                                        {rule.recipientRoles.length > 0
                                                            ? rule.recipientRoles.join(', ')
                                                            : t('Admins, Super Admins')}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-slate-600">
                                                        {rule.recipientType === 'parents'
                                                            ? t('Parents / Guardians')
                                                            : t('Students')}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-slate-600">{rule.lastFiredAt ?? t('Never')}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Switch
                                                        checked={rule.enabled}
                                                        disabled={!enabled}
                                                        onCheckedChange={(next) => handleToggleRule(rule, next)}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="gap-1"
                                                        disabled={!enabled}
                                                        onClick={() => openEdit(rule)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={() => handleDeleteRule(rule)}
                                                        disabled={deletingId === rule.id}
                                                    >
                                                        {deletingId === rule.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                    <Bot className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">
                        {t(
                            'No automatic alert rules yet. Create a rule to start sending WhatsApp alerts automatically when your operations happen.',
                        )}
                    </p>
                    <Button
                        type="button"
                        className="mt-4 gap-2"
                        disabled={qwaTemplates.length === 0 || qwaAutoAlertTriggerOptions.length === 0}
                        onClick={openCreate}
                    >
                        <Plus className="h-4 w-4" />
                        {t('Create your first rule')}
                    </Button>
                </div>
            )}
        </div>
    );
}