import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { router } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Download, Loader2, Plus, RefreshCw, Save, Table2, Trash2, Upload } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const AUTO_FILLED_VALUE = '__auto_filled__';
const NO_GROUP_VALUE = '__no_group__';

export interface QwaTemplate {
    id: string;
    qwaTemplateId: string;
    sessionId: string;
    name: string;
    body: string;
    header?: string | null;
    footer?: string | null;
    media?: Record<string, unknown> | null;
    placeholders: string[];
    mapping: Record<string, string>;
    canSendNatively: boolean;
    isCustom?: boolean;
    language?: string;
    variantKey?: string | null;
    variants?: Array<{
        id: string;
        language: string;
        name: string;
    }>;
    lastSyncedAt?: string | null;
}

export interface TemplateTokenGroup {
    group: string;
    items: Array<{ token: string; tag: string; label: string }>;
}

export interface QwaTemplatesProps {
    qwaTemplates: QwaTemplate[];
    templateTokens: TemplateTokenGroup[];
    qwaTemplateLanguages?: Array<{ code: string; name: string }>;
    qwaStatus: {
        configured: boolean;
        connected: boolean;
    };
}

const REGIONAL_LANGUAGES = ['mr', 'hi'];

export default function QwaWhatsappTemplates({
    qwaTemplates,
    templateTokens,
    qwaTemplateLanguages = [],
    qwaStatus,
}: QwaTemplatesProps) {
    const { t } = useLanguage();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isPushingToQwa, setIsPushingToQwa] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [addingVariantKey, setAddingVariantKey] = useState<string | null>(null);
    const [customDraft, setCustomDraft] = useState({
        name: '',
        header: '',
        body: '',
        footer: '',
        language: 'en',
        variantKey: '',
    });

    const handleSync = () => {
        if (isSyncing) {
            return;
        }

        setIsSyncing(true);

        router.post(
            '/communication/send-qwa-whatsapp/templates/sync',
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsSyncing(false),
                onError: (errors) => {
                    const message = errors.qwa_templates || 'Could not sync QWA templates.';
                    toast.error(message);
                },
            },
        );
    };

    const handleSyncToQwa = () => {
        if (isPushingToQwa) {
            return;
        }

        setIsPushingToQwa(true);

        router.post(
            '/communication/send-qwa-whatsapp/templates/sync-to-qwa',
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsPushingToQwa(false),
                onError: (errors) => {
                    const message = errors.qwa_templates || 'Could not push custom templates to QWA.';
                    toast.error(message);
                },
            },
        );
    };

    const handleCreateCustom = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!customDraft.name.trim() || !customDraft.body.trim()) {
            toast.error('Enter a name and body for the custom template.');
            return;
        }

        if (creating) {
            return;
        }

        setCreating(true);

        router.post(
            '/communication/qwa-alerts/templates',
            {
                name: customDraft.name,
                header: customDraft.header,
                body: customDraft.body,
                footer: customDraft.footer,
                language: customDraft.language,
                variantKey: customDraft.variantKey || undefined,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setCreating(false);
                    setCreateOpen(false);
                    setCustomDraft({
                        name: '',
                        header: '',
                        body: '',
                        footer: '',
                        language: 'en',
                        variantKey: '',
                    });
                },
                onError: (errors) => {
                    const message = errors.qwa_template || 'Could not create the custom template.';
                    toast.error(message);
                },
            },
        );
    };

    const handleAddVariant = (template: QwaTemplate, language: string) => {
        if (addingVariantKey) {
            return;
        }

        setAddingVariantKey(`${template.id}:${language}`);

        router.post(
            `/communication/send-qwa-whatsapp/templates/${template.id}/add-variant`,
            { language },
            {
                preserveScroll: true,
                onFinish: () => setAddingVariantKey(null),
                onError: (errors) => {
                    const message = errors.qwa_template || 'Could not add the regional variant.';
                    toast.error(message);
                },
            },
        );
    };

    const handleDeleteCustom = (template: QwaTemplate) => {
        if (deletingId) {
            return;
        }

        setDeletingId(template.id);

        router.delete(`/communication/qwa-alerts/templates/${template.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
            onError: (errors) => {
                const message = errors.qwa_template || 'Could not delete the custom template.';
                toast.error(message);
            },
        });
    };

    const draftMapping = (template: QwaTemplate) => drafts[template.id] ?? template.mapping ?? {};

    const setDraftValue = (template: QwaTemplate, placeholder: string, value: string) => {
        setDrafts((current) => ({
            ...current,
            [template.id]: {
                ...draftMapping(template),
                [placeholder]: value,
            },
        }));
    };

    const handleSaveMapping = (template: QwaTemplate) => {
        setSavingId(template.id);

        router.put(
            `/communication/send-qwa-whatsapp/templates/${template.id}`,
            {
                mapping: draftMapping(template),
            },
            {
                preserveScroll: true,
                onFinish: () => setSavingId(null),
                onError: () => toast.error('Could not save the variable mapping.'),
            },
        );
    };

    const flatTokens = templateTokens.flatMap((group) => group.items);

    const groupOptions = Array.from(
        new Set<string>(
            qwaTemplates.flatMap((template) => (template.variantKey ? [template.variantKey] : [])),
        ),
    ).sort();

    const languageLabel = (code?: string) =>
        code ? qwaTemplateLanguages.find((option) => option.code === code)?.name ?? code.toUpperCase() : '';

    const languageBadge = (code?: string) => (code ? code.toUpperCase() : 'EN');

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">{t('QWA WhatsApp Templates')}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                        {t('Templates stored on the QWA gateway are fetched here and mapped onto your data variables.')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline" className="gap-2">
                                <Plus className="h-4 w-4" />
                                {t('New Custom Template')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] w-[95vw] max-w-xl overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{t('Create custom template')}</DialogTitle>
                                <DialogDescription>
                                    {t(
                                        'Custom templates are rendered per recipient and sent as a pre-built text message. Use {{placeholders}} such as {{student_name}}, {{class_section}} or {{total_paid}}.',
                                    )}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateCustom} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('Template name')}</Label>
                                    <Input
                                        value={customDraft.name}
                                        onChange={(event) =>
                                            setCustomDraft((current) => ({ ...current, name: event.target.value }))
                                        }
                                        placeholder={t('e.g. Fee Receipt Notification')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Header (optional)')}</Label>
                                    <Input
                                        value={customDraft.header}
                                        onChange={(event) =>
                                            setCustomDraft((current) => ({ ...current, header: event.target.value }))
                                        }
                                        placeholder={t('Line shown above the message body')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Body')}</Label>
                                    <Textarea
                                        value={customDraft.body}
                                        onChange={(event) =>
                                            setCustomDraft((current) => ({ ...current, body: event.target.value }))
                                        }
                                        rows={5}
                                        placeholder={t('Dear {{student_name}}, your payment of {{total_paid}} is received...')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Footer (optional)')}</Label>
                                    <Input
                                        value={customDraft.footer}
                                        onChange={(event) =>
                                            setCustomDraft((current) => ({ ...current, footer: event.target.value }))
                                        }
                                        placeholder={t('Signature line / school tagline')}
                                    />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{t('Language')}</Label>
                                        <Select
                                            value={customDraft.language}
                                            onValueChange={(value) =>
                                                setCustomDraft((current) => ({ ...current, language: value }))
                                            }
                                        >
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder={t('Language')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {qwaTemplateLanguages.map((option) => (
                                                    <SelectItem key={option.code} value={option.code}>
                                                        {option.code.toUpperCase()} — {option.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Group with a template (optional)')}</Label>
                                        <Select
                                            value={customDraft.variantKey}
                                            onValueChange={(value) =>
                                                setCustomDraft((current) => ({
                                                    ...current,
                                                    variantKey: value === NO_GROUP_VALUE ? '' : value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder={t('None (standalone template)')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={NO_GROUP_VALUE}>
                                                    {t('None (standalone template)')}
                                                </SelectItem>
                                                {groupOptions.map((group) => (
                                                    <SelectItem key={group} value={group}>
                                                        {group}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {customDraft.variantKey ? (
                                            <p className="text-xs text-slate-500">
                                                {t(
                                                    'When grouped, the variable mapping is copied from the English master and this template becomes a language variant.',
                                                )}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={creating} className="gap-2">
                                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                        {t('Create template')}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Button
                        type="button"
                        onClick={handleSyncToQwa}
                        disabled={isPushingToQwa || isSyncing || !qwaStatus.configured}
                        variant="outline"
                        className="gap-2"
                    >
                        {isPushingToQwa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {t('Sync to QWA')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSync}
                        disabled={isSyncing || isPushingToQwa || !qwaStatus.configured}
                        className="gap-2"
                    >
                        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        {t('Sync from QWA')}
                    </Button>
                </div>
            </div>

            {!qwaStatus.configured ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {t('QWA is not configured. Open')}{' '}
                    <span className="font-semibold">{t('Settings > Communication Settings > QWA Settings')}</span>
                    {', '}
                    {t('add the Base URL, API key and Session ID before fetching templates.')}
                </div>
            ) : null}

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                {t(
                    'Named placeholders ({{name}}) are sent natively through the QWA send-template endpoint. Positional placeholders ({{1}}, {{2}}) and custom templates are rendered here per recipient and sent as a pre-built text message. Regional (मराठी / हिन्दी) variants are custom templates — they are rendered locally and sent as text.',
                )}
            </div>

            {qwaTemplates.length > 0 ? (
                <div className="space-y-3">
                    {qwaTemplates.map((template) => {
                        const mapping = draftMapping(template);
                        const isExpanded = expandedId === template.id;

                        return (
                            <Card key={template.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Table2 className="h-4 w-4 text-slate-400" />
                                            <CardTitle className="text-base">{template.name}</CardTitle>
                                            {template.isCustom ? (
                                                <Badge variant="outline" className="text-violet-600">
                                                    {t('Custom')}
                                                </Badge>
                                            ) : null}
                                            <Badge variant="secondary">
                                                {languageBadge(template.language)}
                                            </Badge>
                                            <Badge variant={template.canSendNatively ? 'default' : 'secondary'}>
                                                {template.canSendNatively ? t('Native send') : t('Rendered as text')}
                                            </Badge>
                                            {template.isCustom && template.qwaTemplateId ? (
                                                <Badge variant="outline" className="text-emerald-600">
                                                    {t('On QWA')}
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            {template.lastSyncedAt ? (
                                                <span>
                                                    {t('Synced')} {template.lastSyncedAt}
                                                </span>
                                            ) : null}
                                            {template.isCustom ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1 text-red-600 hover:text-red-700"
                                                    onClick={() => handleDeleteCustom(template)}
                                                    disabled={deletingId === template.id}
                                                >
                                                    {deletingId === template.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                    {t('Delete')}
                                                </Button>
                                            ) : null}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setExpandedId(isExpanded ? null : template.id)}
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                                {t(isExpanded ? 'Collapse' : 'Variables')}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {template.header ? (
                                        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                                            {template.header}
                                        </p>
                                    ) : null}
                                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 font-sans text-sm text-slate-700">
                                        {template.body}
                                    </pre>
                                    {template.footer ? (
                                        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                                            {template.footer}
                                        </p>
                                    ) : null}

                                    {template.media?.type ? (
                                        <p className="text-xs text-slate-500">
                                            {t('Media template:')} {String(template.media.type)}
                                        </p>
                                    ) : null}

                                    {template.placeholders.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {template.placeholders.map((placeholder) => (
                                                <Badge key={placeholder} variant="outline">
                                                    {'{{'}
                                                    {placeholder}
                                                    {'}}'}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400">
                                            {t('This template has no placeholders.')}
                                        </p>
                                    )}

                                    {template.variantKey ? (
                                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                                            <span className="text-xs font-medium text-slate-500">
                                                {t('Regional variants')}:
                                            </span>
                                            {(template.variants ?? []).map((variant) => (
                                                <Badge key={variant.id} variant="outline" className="text-slate-600">
                                                    {variant.language.toUpperCase()} – {variant.name}
                                                </Badge>
                                            ))}
                                            {REGIONAL_LANGUAGES.filter(
                                                (code) => !(template.variants ?? []).some((v) => v.language === code),
                                            ).map((code) => (
                                                <Button
                                                    key={code}
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1 text-blue-600"
                                                    onClick={() => handleAddVariant(template, code)}
                                                    disabled={addingVariantKey === `${template.id}:${code}`}
                                                >
                                                    {addingVariantKey === `${template.id}:${code}` ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Plus className="h-3 w-3" />
                                                    )}
                                                    {t('Add')} {code.toUpperCase()}
                                                </Button>
                                            ))}
                                        </div>
                                    ) : null}

                                    {isExpanded ? (
                                        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                                            <p className="text-sm font-medium text-slate-900">
                                                {t('Map QWA placeholders to your variables')}
                                            </p>
                                            {template.placeholders.length > 0 ? (
                                                <div className="space-y-2">
                                                    {template.placeholders.map((placeholder) => {
                                                        const mapped = mapping[placeholder] ?? '';

                                                        return (
                                                            <div
                                                                key={placeholder}
                                                                className="grid items-center gap-2 md:grid-cols-[200px,1fr]"
                                                            >
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="justify-self-start font-mono"
                                                                >
                                                                    {'{{'}
                                                                    {placeholder}
                                                                    {'}}'}
                                                                </Badge>
                                                                <Select
                                                                    value={mapped}
                                                                    onValueChange={(value) =>
                                                                        setDraftValue(
                                                                            template,
                                                                            placeholder,
                                                                            value === AUTO_FILLED_VALUE ? '' : value,
                                                                        )
                                                                    }
                                                                >
                                                                    <SelectTrigger className="bg-white">
                                                                        <SelectValue
                                                                            placeholder={t(
                                                                                'Auto-filled per recipient',
                                                                            )}
                                                                        />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value={AUTO_FILLED_VALUE}>
                                                                            {t('Auto-filled per recipient')}
                                                                        </SelectItem>
                                                                        {flatTokens.length > 0 ? (
                                                                            templateTokens.map((group) => (
                                                                                <SelectGroup key={group.group}>
                                                                                    <SelectLabel>{group.group}</SelectLabel>
                                                                                    {group.items.map((item) => (
                                                                                        <SelectItem
                                                                                            key={item.tag}
                                                                                            value={item.tag}
                                                                                        >
                                                                                            {item.label} (
                                                                                            {'{{'}
                                                                                            {item.tag}
                                                                                            {'}}'}
                                                                                            )
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectGroup>
                                                                            ))
                                                                        ) : (
                                                                            <SelectItem value="__none__">
                                                                                {t('No variables available')}
                                                                            </SelectItem>
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}

                                            <div className="flex justify-end">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => handleSaveMapping(template)}
                                                    disabled={savingId === template.id}
                                                    className="gap-2"
                                                >
                                                    {savingId === template.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Save className="h-4 w-4" />
                                                    )}
                                                    {t('Save mapping')}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                    <Download className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">
                        {t(
                            'No QWA templates yet. Click Sync from QWA to fetch gateway templates, or create your own custom template.',
                        )}
                    </p>
                </div>
            )}
        </div>
    );
}