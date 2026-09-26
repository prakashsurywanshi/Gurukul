import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    Bell,
    BellRing,
    CalendarCheck,
    CalendarX,
    CheckCheck,
    ChevronRight,
    ClipboardCheck,
    Circle,
    FileCheck,
    Info,
    MessageSquareWarning,
    Target,
    UserPlus,
    Wallet,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';
import { createEcho } from '../../lib/echo';
import { useLanguage } from '../../i18n/LanguageProvider';
import { Badge } from '../../Pages/ui/badge';
import { buttonShineClasses } from '../../Pages/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../Pages/ui/popover';

const POLL_MS = 30000;

const TYPE_ICONS: Record<string, LucideIcon> = {
    leave_request: CalendarX,
    admit_card: FileCheck,
    admission_enquiry: UserPlus,
    lead: Target,
    complaint: MessageSquareWarning,
    attendance_correction: CalendarCheck,
    fee_concession: Wallet,
    fee_due: Wallet,
    daily_digest: BellRing,
    approval_request: ClipboardCheck,
    ai_risk_alert: Sparkles,
    info: Info,
};

interface NotificationItem {
    id: string;
    type?: string;
    title: string;
    message: string;
    icon?: string | null;
    action_label?: string | null;
    action_url?: string | null;
    event?: string | null;
    read: boolean;
    created_at?: string | null;
}

interface HeaderNotifications {
    items: NotificationItem[];
    unreadCount: number;
}

interface NotificationBellProps {
    headerNotifications?: HeaderNotifications | null;
    userId?: number | string | null;
}

function timeAgo(iso?: string | null): string {
    if (!iso) return '—';
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return '1m';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w`;
    return new Date(iso).toLocaleDateString();
}

export default function NotificationBell({ headerNotifications, userId }: NotificationBellProps) {
    const { t } = useLanguage();
    const [items, setItems] = useState<NotificationItem[]>(headerNotifications?.items ?? []);
    const [unread, setUnread] = useState<number>(headerNotifications?.unreadCount ?? 0);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setItems(headerNotifications?.items ?? []);
        setUnread(headerNotifications?.unreadCount ?? 0);
    }, [headerNotifications]);

    const refresh = () => {
        fetch('/notifications/recent', { headers: { Accept: 'application/json' } })
            .then((res) => res.json())
            .then((data) => {
                if (data?.items) setItems(data.items.slice(0, 8));
                if (typeof data?.unread === 'number') setUnread(data.unread);
            })
            .catch(() => {});
    };

    useEffect(() => {
        const timer = setInterval(refresh, POLL_MS);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!userId) return;

        const echo = createEcho();

        if (!echo) return;

        const channel = echo.private(`notifications.${userId}`);

        const onNewNotification = (event: {
            notification?: {
                id?: string | number;
                title?: string;
                message?: string;
                type?: string;
                created_at?: string;
            };
        }) => {
            const incoming = event?.notification;
            if (!incoming) return;

            const item: NotificationItem = {
                id: String(incoming.id ?? Date.now()),
                type: incoming.type,
                title: incoming.title ?? t('New notification'),
                message: incoming.message ?? '',
                read: false,
                created_at: incoming.created_at,
            };

            setItems((current) => [item, ...current].slice(0, 8));
            setUnread((count) => count + 1);
        };

        channel.listen('.SystemNotificationCreated', onNewNotification);

        return () => {
            try {
                channel.stopListening('.SystemNotificationCreated');
            } catch {}
        };
    }, [userId, t]);

    const markAllRead = () => {
        router.post(
            '/notifications/read-all',
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setItems((current) => current.map((item) => ({ ...item, read: true })));
                    setUnread(0);
                },
            },
        );
    };

    const markRead = (item: NotificationItem) => {
        if (item.read) return;
        router.post(
            `/notifications/${item.id}/read`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setItems((current) => current.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
                    setUnread((count) => Math.max(0, count - 1));
                },
            },
        );
    };

    const openAll = () => {
        setOpen(false);
        router.visit('/notifications');
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={`dashboard-header-button ${buttonShineClasses} inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--secondary)] p-2 shadow-sm transition`}
                    title={t('Notifications')}
                    aria-label={t('Notifications')}
                >
                    <Bell className="h-5 w-5 text-[var(--primary)]" />
                    {unread > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]"
                        >
                            {unread > 99 ? '99+' : unread}
                        </Badge>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent align="end" sideOffset={8} className="w-[calc(100vw-2rem)] max-w-sm p-0">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{t('Notifications')}</p>
                    {unread > 0 && (
                        <button
                            type="button"
                            onClick={markAllRead}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            {t('Mark All as Read')}
                        </button>
                    )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                            {t('No notifications yet.')}
                        </div>
                    ) : (
                        items.map((item) => {
                            const unreadItem = !item.read;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        if (item.action_url) {
                                            markRead(item);
                                            setOpen(false);
                                            router.visit(item.action_url);
                                        } else {
                                            markRead(item);
                                        }
                                    }}
                                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--accent)]"
                                >
                                    <span className="mt-1 shrink-0">
                                        {unreadItem ? (
                                            <Circle className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                        ) : (
                                            (() => {
                                                const TypeIcon = TYPE_ICONS[item.type ?? ''] ?? Bell;
                                                return <TypeIcon className="h-4 w-4 text-[var(--muted-foreground)]" />;
                                            })()
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center justify-between gap-2">
                                            <span
                                                className={`truncate text-sm font-medium ${unreadItem ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}
                                            >
                                                {item.title}
                                            </span>
                                            <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                                                {timeAgo(item.created_at)}
                                            </span>
                                        </span>
                                        <span className="mt-0.5 block truncate text-xs text-[var(--muted-foreground)]">
                                            {item.message}
                                        </span>
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                <button
                    type="button"
                    onClick={openAll}
                    className="flex w-full items-center justify-center gap-1 border-t border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--primary)] transition hover:bg-[var(--accent)]"
                >
                    {t('View all')}
                    <ChevronRight className="h-4 w-4" />
                </button>
            </PopoverContent>
        </Popover>
    );
}
