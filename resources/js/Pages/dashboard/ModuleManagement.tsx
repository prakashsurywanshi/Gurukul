import { useState } from 'react';
import { Blocks, Loader2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { useLanguage } from '../../i18n/LanguageProvider';

interface ModuleEntry {
    key: string;
    label: string;
    description: string;
    enabled: boolean;
    core?: boolean;
}

interface ModuleGroup {
    group: string;
    modules: ModuleEntry[];
}

interface ModuleManagementProps {
    user: any;
    groups: ModuleGroup[];
}

export default function ModuleManagement(pageProps: ModuleManagementProps) {
    const { t } = useLanguage();
    const { user, groups } = pageProps;
    const [flags, setFlags] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};

        for (const group of groups) {
            for (const module of group.modules) {
                initial[module.key] = module.enabled;
            }
        }

        return initial;
    });
    const [pending, setPending] = useState(false);

    const toggle = (key: string, value: boolean) => {
        setFlags((current) => ({ ...current, [key]: value }));
        setPending(true);

        router.post(
            '/module-management',
            { module: key, enabled: value },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setPending(false),
            },
        );
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            <Blocks className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            {t('Module Management')}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {t(
                                'Enable or disable feature modules for this organization. Disabled modules are hidden from the sidebar and blocked on the server.',
                            )}
                        </p>
                    </div>
                    <Badge variant="secondary" className="hidden sm:inline-flex">
                        {t('Changes apply instantly')}
                    </Badge>
                </div>

                {groups.map((group) => (
                    <Card key={group.group}>
                        <CardHeader>
                            <CardTitle>{group.group}</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y divide-gray-100 dark:divide-gray-800">
                            {group.modules.map((module) => (
                                <div
                                    key={module.key}
                                    className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {module.label}
                                            {module.core && (
                                                <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300">
                                                    {t('Core module')}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {module.description}
                                            {module.core && t('This module is always enabled.')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={flags[module.key] ?? false}
                                        onCheckedChange={(checked) => toggle(module.key, checked)}
                                        disabled={pending || !!module.core}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}

                <div className="flex items-center justify-end gap-3 pb-6">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        {pending ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {t('Saving…')}
                            </span>
                        ) : (
                            'Toggling a switch saves the change immediately.'
                        )}
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
