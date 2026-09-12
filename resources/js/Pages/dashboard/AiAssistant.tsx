import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { Bot, CheckCircle2, KeyRound, Loader2, Send, Settings2, Sparkles, XCircle } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

interface AiConfig {
    mode: string;
    base_url: string;
    model: string;
    temperature: number;
    timeout: number;
    has_api_key: boolean;
}

interface AiAssistantProps {
    user: any;
    organization?: any;
    enabled: boolean;
    config: AiConfig;
    configured: boolean;
    canManage: boolean;
}

const QUICK_ACTIONS = [
    'How many students are absent today?',
    'Show fee defaulters from last term.',
    'List upcoming online classes.',
    'Summarize recent parent helpdesk tickets.',
    'Which teachers have pending evaluations?',
];

interface ChatTurn {
    role: 'user' | 'assistant';
    text: string;
}

export default function AiAssistant(pageProps: AiAssistantProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const user = pageProps.user;
    const organization = pageProps.organization;
    const configured = pageProps.configured;
    const canManage = pageProps.canManage;

    const [enabled, setEnabled] = useState(pageProps.enabled);
    const [draft, setDraft] = useState('');
    const [thinking, setThinking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fatal, setFatal] = useState('');
    const [messages, setMessages] = useState<ChatTurn[]>([]);

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [mode, setMode] = useState(pageProps.config.mode);
    const [baseUrl, setBaseUrl] = useState(pageProps.config.base_url);
    const [model, setModel] = useState(pageProps.config.model);
    const [apiKey, setApiKey] = useState('');
    const [temperature, setTemperature] = useState(String(pageProps.config.temperature));
    const [timeout, setTimeoutVal] = useState(String(pageProps.config.timeout));

    const saveSettings = () => {
        setSaving(true);
        router.patch(
            '/settings/ai-assistant',
            {
                enabled,
                mode,
                base_url: baseUrl,
                model,
                api_key: apiKey,
                temperature: Number(temperature) || 0.3,
                timeout: Number(timeout) || 60,
            },
            {
                preserveScroll: true,
                onSuccess: () => setApiKey(''),
                onFinish: () => setSaving(false),
            },
        );
    };

    const ask = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        const text = draft.trim().replace(/<\/?[^>]+>/g, '');
        if (!text || thinking) return;
        setFatal('');
        setMessages((current) => [...current, { role: 'user', text }]);
        setDraft('');
        setThinking(true);

        try {
            const response = await fetch('/ai-assistant/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': (window as any).csrfToken ?? '',
                },
                body: JSON.stringify({ question: text }),
            });
            const data = await response.json();
            if (data.ok) {
                setMessages((current) => [...current, { role: 'assistant', text: data.reply }]);
            } else {
                setFatal(data.error ?? t('Something went wrong.'));
            }
        } catch {
            setFatal(t('Something went wrong.'));
        } finally {
            setThinking(false);
        }
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-600 text-white">
                            <Bot className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {t('AI Chatbot')}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('Ask questions about your school data.')}
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <div className="flex items-center gap-2">
                            <Badge
                                className={
                                    enabled
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                        : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                }
                            >
                                {enabled ? t('Enabled') : t('Disabled')}
                            </Badge>
                            <Button variant="outline" size="sm" onClick={() => setSettingsOpen((v) => !v)}>
                                <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                                {t('Settings')}
                            </Button>
                        </div>
                    )}
                </div>

                {(props.flash as any)?.success && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {(props.flash as any).success}
                    </div>
                )}

                {canManage && settingsOpen && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <KeyRound className="h-5 w-5 text-indigo-500" />
                                {t('Provider Configuration')}
                                {configured ? (
                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                        {t('Configured')}
                                    </Badge>
                                ) : (
                                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                        {t('Not configured')}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {t('Enable AI Assistant')}
                                    </div>
                                    <div className="text-xs text-gray-500">{t('Allow users to ask questions.')}</div>
                                </div>
                                <Switch checked={enabled} onCheckedChange={setEnabled} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label>{t('Provider mode')}</Label>
                                    <Select value={mode} onValueChange={setMode}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="openai">{t('Key-based (OpenAI compatible)')}</SelectItem>
                                            <SelectItem value="local">{t('Local / self-hosted (no key)')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('Base URL')}</Label>
                                    <Input
                                        value={baseUrl}
                                        onChange={(e) => setBaseUrl(e.target.value)}
                                        placeholder="https://api.openai.com/v1"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('Model')}</Label>
                                    <Input
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        placeholder="gpt-4o-mini"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('API key')}</Label>
                                    <Input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={
                                            pageProps.config.has_api_key
                                                ? t('Stored key is active. Type to replace.')
                                                : t('Optional for local providers')
                                        }
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('Temperature')}</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="2"
                                        value={temperature}
                                        onChange={(e) => setTemperature(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('Timeout (seconds)')}</Label>
                                    <Input
                                        type="number"
                                        min="5"
                                        value={timeout}
                                        onChange={(e) => setTimeoutVal(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setSettingsOpen(false)}>
                                    {t('Close')}
                                </Button>
                                <Button size="sm" onClick={saveSettings} disabled={saving}>
                                    {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                                    {t('Save Settings')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!enabled ? (
                    <Card>
                        <CardContent>
                            <div className="flex flex-col items-center py-14 text-center">
                                <XCircle className="mb-3 h-12 w-12 text-gray-300" />
                                <div className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                    {t('AI Assistant is disabled')}
                                </div>
                                <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
                                    {canManage
                                        ? t('Open Settings and enable the assistant, then configure a provider.')
                                        : t('The administrator has turned off the assistant.')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Sparkles className="h-5 w-5 text-indigo-500" />
                                {t('Ask something')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {QUICK_ACTIONS.map((action) => (
                                    <button
                                        key={action}
                                        type="button"
                                        onClick={() => setDraft(action)}
                                        className="rounded-full border px-3 py-1.5 text-xs text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-700 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300"
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>

                            {fatal && (
                                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
                                    <XCircle className="h-4 w-4 shrink-0" />
                                    {fatal}
                                </div>
                            )}

                            <div className="min-h-[240px] space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40">
                                {messages.length === 0 && !thinking && (
                                    <div className="flex h-full flex-col items-center justify-center py-10 text-center text-sm text-gray-400">
                                        <Bot className="mb-2 h-9 w-9 text-gray-300" />
                                        {t('Ask about attendance, fees, classes, homework and more.')}
                                    </div>
                                )}
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 shadow dark:bg-gray-900 dark:text-gray-100'}`}
                                        >
                                            {message.text}
                                        </div>
                                    </div>
                                ))}
                                {thinking && (
                                    <div className="flex justify-start">
                                        <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm text-gray-400 shadow dark:bg-gray-900">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {t('Thinking')}…
                                        </div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={ask} className="flex items-center gap-2">
                                <Input
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    placeholder={t('Type your question...')}
                                />
                                <Button type="submit" disabled={!draft.trim() || thinking}>
                                    {thinking ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </form>

                            <p className="text-xs text-gray-400">
                                {organization?.name ?? ''} · {pageProps.config.model || t('AI')}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
