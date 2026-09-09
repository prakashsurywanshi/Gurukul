import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { CheckCircle2, Copy, Fingerprint, KeyRound, Loader2, RefreshCcw, XCircle } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface BiometricSettingsProps {
    user: any;
    hasKey: boolean;
    keyHint: string;
    endpoint: string;
    statusEndpoint: string;
}

export default function BiometricSettings(pageProps: BiometricSettingsProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const user = pageProps.user;
    const hasKey = pageProps.hasKey;
    const keyHint = pageProps.keyHint ?? '';
    const endpoint = pageProps.endpoint;
    const statusEndpoint = pageProps.statusEndpoint;

    const [regenerating, setRegenerating] = useState(false);
    const [revealedKey, setRevealedKey] = useState('');
    const [copied, setCopied] = useState(false);

    const regenerate = () => {
        if (!window.confirm(t('Regenerate the biometric sync key? Existing devices will stop working until updated.')))
            return;
        setRegenerating(true);
        setRevealedKey('');
        router.post(
            '/settings/biometric/regenerate',
            {},
            {
                preserveScroll: true,
                onFinish: () => setRegenerating(false),
            },
        );
    };

    const reveal = () => {
        fetch('/settings/biometric/reveal', { headers: { Accept: 'application/json' } })
            .then((res) => res.json())
            .then((data) => setRevealedKey(data.key ?? ''))
            .catch(() => {});
    };

    const copy = (value: string) => {
        navigator.clipboard
            ?.writeText(value)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {});
    };

    const curl = `curl -X POST ${endpoint} \\
  -H "X-Biometric-Key: ${revealedKey || 'YOUR_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"admission_no": "ADM-0001", "datetime": "2026-09-09 09:00:00", "direction": "in"}'`;

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-600 text-white">
                        <Fingerprint className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Biometric Settings')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Sync attendance punches from biometric devices using a per-school API key.')}
                        </p>
                    </div>
                </div>

                {(props.flash as any)?.success && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {(props.flash as any).success}
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <KeyRound className="h-5 w-5 text-violet-500" />
                                {t('API Sync Key')}
                                {hasKey ? (
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
                            {hasKey ? (
                                <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                                    <KeyRound className="h-4 w-4 text-gray-400" />
                                    <span className="font-mono text-sm text-gray-700 dark:text-gray-200">
                                        {keyHint}
                                    </span>
                                    {revealedKey && (
                                        <span className="break-all font-mono text-sm text-green-600">
                                            {revealedKey}
                                        </span>
                                    )}
                                    <div className="ml-auto flex gap-1.5">
                                        {revealedKey && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7"
                                                onClick={() => copy(revealedKey)}
                                            >
                                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                                                {copied ? t('Copied') : t('Copy')}
                                            </Button>
                                        )}
                                        {!revealedKey && (
                                            <Button size="sm" variant="outline" className="h-7" onClick={reveal}>
                                                {t('Show Key')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    {t('No key yet. Regenerate to create one, then configure your devices with it.')}
                                </p>
                            )}
                            <Button size="sm" onClick={regenerate} disabled={regenerating}>
                                {regenerating ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                                )}
                                {t('Regenerate Key')}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <KeyRound className="h-5 w-5 text-violet-500" />
                                {t('Endpoints')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
                                <span className="text-gray-500">POST</span>
                                <code className="truncate text-xs text-gray-800 dark:text-gray-200">{endpoint}</code>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
                                <span className="text-gray-500">GET</span>
                                <code className="truncate text-xs text-gray-800 dark:text-gray-200">
                                    {statusEndpoint}
                                </code>
                            </div>
                            <pre className="overflow-x-auto rounded-xl bg-gray-900 p-4 text-xs text-green-400">
                                {curl}
                            </pre>
                            <p className="text-xs text-gray-400">
                                {t(
                                    'Send the key in the X-Biometric-Key header. The endpoint upserts attendance by admission number and date.',
                                )}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
