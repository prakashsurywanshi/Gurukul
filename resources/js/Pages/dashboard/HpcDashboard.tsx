import { Activity, FileText, Gauge, Layers, Rocket } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useLanguage } from '../../i18n/LanguageProvider';

interface HpcActivityRecord {
    id: number;
    category: string;
    title: string;
    description?: string | null;
    rating?: string | null;
    teacher_remark?: string | null;
    occurred_at?: string | null;
    student?: { id: number; first_name: string; last_name: string } | null;
}

interface HpcDashboardProps {
    user: any;
    stats: { frameworks: number; cards: number; activities: number; published: number };
    recentActivities: HpcActivityRecord[];
}

export default function HpcDashboard(pageProps: HpcDashboardProps) {
    const { user, stats, recentActivities } = pageProps;
    const { t } = useLanguage();

    return (
        <DashboardLayout user={user}>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">{t('hpc.title')}</h1>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6 flex items-center gap-3">
                            <div className="rounded-full bg-primary/10 p-2">
                                <Layers className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold dark:text-white">{stats.frameworks}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('hpc.frameworks')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 flex items-center gap-3">
                            <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
                                <FileText className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold dark:text-white">{stats.cards}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('hpc.progressCards')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 flex items-center gap-3">
                            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/40">
                                <Activity className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold dark:text-white">{stats.activities}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('hpc.activities')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 flex items-center gap-3">
                            <div className="rounded-full bg-sky-100 p-2 dark:bg-sky-900/40">
                                <Rocket className="h-5 w-5 text-sky-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold dark:text-white">{stats.published}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('hpc.published')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gauge className="h-5 w-5" />
                            {t('hpc.recentActivities')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentActivities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Activity className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                <p className="mt-4 text-sm font-medium dark:text-white">{t('hpc.noActivities')}</p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {t('hpc.noActivitiesDesc')}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentActivities.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className="flex items-center gap-3 rounded-lg border p-3 dark:border-gray-700"
                                    >
                                        <div className="rounded-full bg-primary/10 p-2">
                                            <Activity className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium dark:text-white">
                                                {activity.title}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {activity.student
                                                    ? `${activity.student.first_name} ${activity.student.last_name}`
                                                    : '—'}{' '}
                                                · {activity.category}
                                            </p>
                                        </div>
                                        {activity.rating && (
                                            <span className="text-sm font-semibold dark:text-white">
                                                {activity.rating}/5
                                            </span>
                                        )}
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
