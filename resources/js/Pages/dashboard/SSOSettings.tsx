import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { CheckCircle2, Chrome, Copy, Facebook, Github, KeyRound, Lock, XCircle } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface SsoProvider {
    name: string;
    configured: boolean;
}

interface SSOSettingsProps {
    user: any;
    enabled: boolean;
    installed: boolean;
    providers: SsoProvider[];
}

const ENV_BLOCK = `SSO_ENABLED=true

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=/auth/sso/google/callback

# Facebook
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_REDIRECT_URI=/auth/sso/facebook/callback

# GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=/auth/sso/github/callback`;

const PROVIDER_META: Record<string, { icon: any; color: string }> = {
    google: { icon: Chrome, color: 'text-red-500' },
    facebook: { icon: Facebook, color: 'text-blue-600' },
    github: { icon: Github, color: 'text-gray-800 dark:text-gray-200' },
};

export default function SSOSettings(pageProps: SSOSettingsProps) {
    const { t } = useLanguage();
    const user = pageProps.user;
    const enabled = pageProps.enabled;
    const installed = pageProps.installed;
    const providers = pageProps.providers ?? [];
    const [copied, setCopied] = useState(false);

    const copyEnv = () => {
        navigator.clipboard
            ?.writeText(ENV_BLOCK)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {});
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
                        <KeyRound className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('SSO Settings')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Single Sign-On via Google, Facebook or GitHub.')}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm">
                                {enabled ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                {t('SSO Enabled')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Badge className={enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}>
                                {enabled ? t('Yes') : t('No')}
                            </Badge>
                            <p className="mt-2 text-xs text-gray-500">
                                {t('Controlled by the SSO_ENABLED variable in your .env file.')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Lock className="h-4 w-4 text-indigo-500" />
                                {t('Library Installed')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Badge className={installed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {installed ? t('laravel/socialite installed') : t('laravel/socialite missing')}
                            </Badge>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm">
                                {enabled ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                {t('Login Page Buttons')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-gray-500">
                                {enabled && installed
                                    ? t('SSO buttons are shown on the login page for configured providers.')
                                    : t(
                                          'Buttons will appear once SSO is enabled, the library is installed and a provider is configured.',
                                      )}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Providers')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {providers.map((provider) => {
                            const meta = PROVIDER_META[provider.name] ?? { icon: KeyRound, color: 'text-gray-500' };
                            const Icon = meta.icon;

                            return (
                                <div key={provider.name} className="flex items-center gap-3 rounded-xl border p-3">
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 ${meta.color}`}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium capitalize text-gray-900 dark:text-white">
                                            {provider.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {provider.configured
                                                ? t('Client ID and secret are configured.')
                                                : t('Add client ID and secret in your .env to enable.')}
                                        </div>
                                    </div>
                                    {provider.configured ? (
                                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                            {t('Configured')}
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                            {t('Missing')}
                                        </Badge>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>{t('Quick Setup (.env)')}</span>
                            <button
                                type="button"
                                onClick={copyEnv}
                                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                            >
                                <Copy className="h-3.5 w-3.5" />
                                {copied ? t('Copied') : t('Copy')}
                            </button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="overflow-x-auto rounded-xl bg-gray-900 p-4 text-xs text-green-400">
                            {ENV_BLOCK}
                        </pre>
                        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
                            <li>{t('Add the variables above to your .env.')}</li>
                            <li>{t('Create OAuth apps on each provider and paste the client IDs and secrets.')}</li>
                            <li>
                                {t('Set the redirect URI on the provider to the matching /auth/sso/*/callback URL.')}
                            </li>
                            <li>{t('Save .env and clear config: php artisan config:clear.')}</li>
                        </ol>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
