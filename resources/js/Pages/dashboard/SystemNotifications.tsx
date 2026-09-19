import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { BellRing, CheckCheck, ChevronDown, Circle } from 'lucide-react';
import { router } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    icon?: string | null;
    action_label?: string | null;
    action_url?: string | null;
    read: boolean;
    created_at?: string | null;
}

interface SystemNotificationsProps {
    user: any;
    notifications?: NotificationItem[];
    unreadCount?: number;
    organization?: { id: number | string; name: string } | null;
}

export default function SystemNotifications(pageProps: SystemNotificationsProps) {
    const { t } = useLanguage();
    const [notifications, setNotifications] = useState<NotificationItem[]>(pageProps.notifications ?? []);
    const [unreadCount, setUnreadCount] = useState(pageProps.unreadCount ?? 0);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        setNotifications(pageProps.notifications ?? []);
        setUnreadCount(pageProps.unreadCount ?? 0);
    }, [pageProps.notifications, pageProps.unreadCount]);

    const handleMarkAllRead = () => {
        router.post(
            '/notifications/read-all',
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
                    setUnreadCount(0);
                },
            },
        );
    };

    const handleMarkRead = (item: NotificationItem) => {
        if (item.read) return;
        router.post(
            `/notifications/${item.id}/read`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNotifications((current) => current.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
                    setUnreadCount((count) => Math.max(0, count - 1));
                },
            },
        );
    };

    const timeAgo = (iso?: string | null): string => {
        if (!iso) return '—';
        const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
        if (seconds < 60) return t('just now');
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d`;
        const weeks = Math.floor(days / 7);
        if (weeks < 5) return `${weeks}w`;
        return new Date(iso).toLocaleDateString();
    };

    return (
        <DashboardLayout user={pageProps.user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500 text-white">
                            <BellRing className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {t('System Notifications')}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {unreadCount > 0
                                    ? `${unreadCount} ${t('unread')} ${t('notifications')}`
                                    : t('You are all caught up.')}
                            </p>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="outline" onClick={handleMarkAllRead}>
                            <CheckCheck className="mr-2 h-4 w-4" />
                            {t('Mark All as Read')}
                        </Button>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <Card>
                        <CardContent>
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                <BellRing className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                {t('No notifications yet.')}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
                            {notifications.map((item) => (
                                <div key={item.id} className="flex items-start gap-3 py-4">
                                    <div className="mt-1 shrink-0">
                                        {item.read ? (
                                            <BellRing className="h-5 w-5 text-slate-300" />
                                        ) : (
                                            <Circle className="h-5 w-5 fill-amber-500 text-amber-500" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p
                                                className={`text-sm font-medium ${item.read ? 'text-slate-600 dark:text-slate-300' : 'text-gray-900 dark:text-white'}`}
                                            >
                                                {item.title}
                                            </p>
                                            {!item.read && (
                                                <Badge className="bg-amber-100 text-amber-700">{t('Unread')}</Badge>
                                            )}
                                        </div>
                                        <p
                                            className={`mt-0.5 text-sm ${item.read ? 'text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}
                                        >
                                            {item.message}
                                        </p>
                                        <div className="mt-2 flex items-center gap-3">
                                            <span className="text-xs text-slate-400">{timeAgo(item.created_at)}</span>
                                            {item.action_label && item.action_url && (
                                                <Link
                                                    href={item.action_url}
                                                    onClick={() => handleMarkRead(item)}
                                                    className="text-xs font-medium text-blue-600 hover:underline"
                                                >
                                                    {item.action_label}
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    {!item.read && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="shrink-0"
                                            onClick={() => handleMarkRead(item)}
                                        >
                                            <CheckCheck className="h-4 w-4 text-slate-400" />
                                            <span className="ml-1 text-xs">{t('Mark Read')}</span>
                                        </Button>
                                    )}
                                    <button
                                        type="button"
                                        className="mt-1 shrink-0 text-slate-400 hover:text-slate-600"
                                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                                        title={t('Details')}
                                    >
                                        <ChevronDown
                                            className={`h-4 w-4 transition-transform ${expanded === item.id ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
