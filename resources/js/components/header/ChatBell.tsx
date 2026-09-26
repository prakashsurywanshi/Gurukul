import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { createEcho } from '../../lib/echo';
import { useLanguage } from '../../i18n/LanguageProvider';
import { Badge } from '../../Pages/ui/badge';
import { buttonShineClasses } from '../../Pages/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../Pages/ui/popover';

interface ChatContact {
    id: string;
    name: string;
    role: string;
    last_message: string;
    last_time?: string | null;
    unread: number;
}

interface ChatBellProps {
    initialUnread: number;
    userId?: number | string | null;
}

const POLL_MS = 30000;

function formatTime(iso?: string | null): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

export default function ChatBell({ initialUnread, userId }: ChatBellProps) {
    const { t } = useLanguage();
    const [unread, setUnread] = useState<number>(initialUnread ?? 0);
    const [contacts, setContacts] = useState<ChatContact[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const refresh = (onlyContacts: boolean) => {
        fetch('/chat/data', { headers: { Accept: 'application/json' } })
            .then((res) => res.json())
            .then((data) => {
                const list = data.contacts ?? [];
                setContacts(list);
                if (!onlyContacts) {
                    setUnread(list.reduce((acc: number, c: ChatContact) => acc + (c.unread ?? 0), 0));
                }
            })
            .catch(() => {});
    };

    const load = () => {
        setLoading(true);
        fetch('/chat/unread', { headers: { Accept: 'application/json' } })
            .then((res) => res.json())
            .then((data) => setUnread(data.total ?? 0))
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        setUnread(initialUnread ?? 0);
    }, [initialUnread]);

    useEffect(() => {
        if (!open) return;
        refresh(false);
    }, [open]);

    useEffect(() => {
        const timer = setInterval(load, POLL_MS);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!userId) return;

        const echo = createEcho();

        if (!echo) return;

        const channel = echo.private(`chat.${userId}`);

        const onNewMessage = () => {
            refresh(true);
            load();
        };

        channel.listen('.ChatMessageSent', onNewMessage);

        return () => {
            try {
                channel.stopListening('.ChatMessageSent');
            } catch {}
        };
    }, [userId]);

    const openChat = (contactId?: string) => {
        setOpen(false);
        router.visit(contactId ? `/chat?with=${contactId}` : '/chat');
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={`dashboard-header-button ${buttonShineClasses} inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--secondary)] p-2 shadow-sm transition`}
                    title={t('Chat')}
                    aria-label={t('Chat')}
                >
                    <MessageCircle className="h-5 w-5 text-[var(--primary)]" />
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
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{t('Chat')}</p>
                    <span className="text-xs text-[var(--muted-foreground)]">
                        {unread > 0 ? `${unread} ${t('unread')}` : t('No new messages')}
                    </span>
                </div>

                <div className="max-h-80 overflow-y-auto">
                    {loading && contacts.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">…</div>
                    ) : contacts.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                            {t('No conversations yet.')}
                        </div>
                    ) : (
                        contacts.slice(0, 6).map((contact) => (
                            <button
                                key={contact.id}
                                type="button"
                                onClick={() => openChat(contact.id)}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--accent)]"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-sm font-semibold text-[var(--foreground)]">
                                    {contact.name?.charAt(0).toUpperCase()}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-medium text-[var(--foreground)]">
                                            {contact.name}
                                        </span>
                                        <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                                            {formatTime(contact.last_time)}
                                        </span>
                                    </span>
                                    <span className="mt-0.5 flex items-center justify-between gap-2">
                                        <span className="truncate text-xs text-[var(--muted-foreground)]">
                                            {contact.last_message || '—'}
                                        </span>
                                        {contact.unread > 0 && (
                                            <Badge
                                                variant="destructive"
                                                className="shrink-0 rounded-full px-1.5 py-0 text-[10px]"
                                            >
                                                {contact.unread}
                                            </Badge>
                                        )}
                                    </span>
                                </span>
                            </button>
                        ))
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => openChat()}
                    className="flex w-full items-center justify-center gap-1 border-t border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--primary)] transition hover:bg-[var(--accent)]"
                >
                    {t('Open Live Chat')}
                    <ChevronRight className="h-4 w-4" />
                </button>
            </PopoverContent>
        </Popover>
    );
}
