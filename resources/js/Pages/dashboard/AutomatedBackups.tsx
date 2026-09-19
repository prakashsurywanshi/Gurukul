import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { CheckCircle2, Database, Download, Loader2, Plus, RefreshCcw, Trash2, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface BackupFile {
    name: string;
    size: number;
    created_at: string;
}

interface AutomatedBackupsProps {
    user: any;
    backups: BackupFile[];
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDate(iso?: string): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

export default function AutomatedBackups(pageProps: AutomatedBackupsProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;
    const user = pageProps.user;
    const backups = pageProps.backups ?? [];

    const [running, setRunning] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [restoring, setRestoring] = useState<string | null>(null);

    const run = () => {
        setRunning(true);
        router.post(
            '/backups/run',
            {},
            {
                preserveScroll: true,
                onFinish: () => setRunning(false),
            },
        );
    };

    const restore = (file: BackupFile) => {
        if (
            !window.confirm(
                t('Restore this backup? The current database will be overwritten and you will be logged out.'),
            )
        )
            return;
        setRestoring(file.name);
        router.post(`/backups/${encodeURIComponent(file.name)}/restore`, {}, { preserveScroll: true });
    };

    const remove = (file: BackupFile) => {
        if (!window.confirm(t('Delete this backup?'))) return;
        setDeleting(file.name);
        router.delete(`/backups/${encodeURIComponent(file.name)}`, {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Automated Backups')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Create and download database backups. A backup runs daily at 02:00.')}
                        </p>
                    </div>
                    <Button onClick={run} disabled={running}>
                        {running ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="mr-2 h-4 w-4" />
                        )}
                        {t('Backup Now')}
                    </Button>
                </div>

                {(props.flash as any)?.success && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {(props.flash as any).success}
                    </div>
                )}
                {(props.flash as any)?.error && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
                        <X className="h-4 w-4 shrink-0" />
                        {(props.flash as any).error}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Database className="h-5 w-5 text-blue-500" />
                            {t('Available Backups')}
                            <span className="ml-auto text-sm font-normal text-gray-400">
                                {backups.length} {t('files')}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {backups.length === 0 ? (
                            <div className="py-12 text-center text-sm text-gray-400">
                                <Database className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                {t('No backups yet. Click “Backup Now” to create the first one.')}
                            </div>
                        ) : (
                            <div className="divide-y dark:divide-gray-800">
                                {backups.map((backup) => (
                                    <div key={backup.name} className="flex flex-wrap items-center gap-3 py-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                            <Database className="h-4.5 w-4.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                                {backup.name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {formatDate(backup.created_at)} · {formatBytes(backup.size)}
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/30"
                                                onClick={() => restore(backup)}
                                                disabled={restoring === backup.name}
                                            >
                                                {restoring === backup.name ? (
                                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                                                )}
                                                {t('Restore')}
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-7" asChild>
                                                <a href={`/backups/${encodeURIComponent(backup.name)}/download`}>
                                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                                    {t('Download')}
                                                </a>
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-red-500"
                                                onClick={() => remove(backup)}
                                                disabled={deleting === backup.name}
                                            >
                                                {deleting === backup.name ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
