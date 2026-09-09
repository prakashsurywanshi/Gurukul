import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useEffect, useRef, useState } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';

interface WindowWithEcho extends Window {
    Echo?: any;
    Pusher?: any;
}

function createEcho(): any {
    const win = window as WindowWithEcho;
    if (win.Echo) return win.Echo;
    const key = import.meta.env.VITE_REVERB_APP_KEY as string | undefined;
    if (!key) return null;
    win.Pusher = win.Pusher ?? Pusher;
    win.Echo = new Echo({
        broadcaster: 'reverb',
        key,
        wsHost: (import.meta.env.VITE_REVERB_HOST as string | undefined) ?? '127.0.0.1',
        wsPort: (import.meta.env.VITE_REVERB_PORT as string | undefined) ?? '8080',
        wssPort: (import.meta.env.VITE_REVERB_PORT as string | undefined) ?? '443',
        forceTLS: ((import.meta.env.VITE_REVERB_SCHEME as string | undefined) ?? 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
    });
    return win.Echo;
}

interface ChatContact {
    id: string;
    name: string;
    role: string;
    last_message: string;
    last_time?: string | null;
    unread: number;
}

interface ChatMessage {
    id: string;
    message: string;
    sender: string;
    sender_id: string;
    is_mine: boolean;
    created_at?: string | null;
}

interface ChatProps {
    user: any;
    organization?: any;
    contacts: ChatContact[];
    messages: ChatMessage[];
    selectedContactId?: string | null;
}

const POLL_MS = 5000;

function formatTime(iso?: string | null): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

export default function Chat(pageProps: ChatProps) {
    const { t } = useLanguage();
    const user = pageProps.user;
    const [contacts, setContacts] = useState<ChatContact[]>(pageProps.contacts ?? []);
    const [activeId, setActiveId] = useState<string | null>(pageProps.selectedContactId ?? null);
    const [messages, setMessages] = useState<ChatMessage[]>(pageProps.messages ?? []);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingThread, setLoadingThread] = useState(false);
    const [error, setError] = useState('');
    const threadEndRef = useRef<HTMLDivElement>(null);

    const active = contacts.find((c) => c.id === activeId) ?? null;

    const loadThread = (contactId: string) => {
        setLoadingThread(true);
        setError('');
        fetch(`/chat/data?with=${encodeURIComponent(contactId)}`, { headers: { Accept: 'application/json' } })
            .then((res) => res.json())
            .then((data) => {
                setMessages(data.messages ?? []);
                fetch(`/chat/read?with=${encodeURIComponent(contactId)}`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': (window as any).csrfToken ?? '' },
                }).catch(() => {});
                setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, unread: 0 } : c)));
            })
            .catch(() => setError(t('Could not load conversation.')))
            .finally(() => setLoadingThread(false));
    };

    const select = (contactId: string) => {
        setActiveId(contactId);
        loadThread(contactId);
    };

    useEffect(() => {
        if (!activeId) return;
        const timer = setInterval(() => {
            fetch(`/chat/data?with=${encodeURIComponent(activeId)}`, { headers: { Accept: 'application/json' } })
                .then((res) => res.json())
                .then((data) => {
                    if (data.messages) setMessages(data.messages);
                    if (data.contacts) {
                        const incomingUnread =
                            (data.contacts as ChatContact[]).filter((c) => c.id === activeId).map((c) => c.unread)[0] ??
                            0;
                        setContacts(data.contacts);
                        if (incomingUnread > 0) {
                            fetch(`/chat/read?with=${encodeURIComponent(activeId)}`, {
                                method: 'POST',
                                headers: { 'X-CSRF-TOKEN': (window as any).csrfToken ?? '' },
                            }).catch(() => {});
                        }
                    }
                })
                .catch(() => {});
        }, POLL_MS);
        return () => clearInterval(timer);
    }, [activeId]);

    useEffect(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!user?.id) return;
        const echo = createEcho();
        if (!echo) return;

        const channel = echo.private(`chat.${user.id}`);

        const onNewMessage = () => {
            setContacts((prev) => prev.slice());
            fetch(`/chat/data?with=${encodeURIComponent(activeId ?? '')}`, { headers: { Accept: 'application/json' } })
                .then((res) => res.json())
                .then((data) => {
                    if (data.contacts) {
                        setContacts(data.contacts);
                        const mine = data.contacts.find((c: ChatContact) => c.id === activeId);
                        if (activeId && mine && mine.unread > 0) {
                            fetch(`/chat/read?with=${encodeURIComponent(activeId)}`, {
                                method: 'POST',
                                headers: { 'X-CSRF-TOKEN': (window as any).csrfToken ?? '' },
                            }).catch(() => {});
                        }
                    }
                    if (activeId && data.messages) setMessages(data.messages);
                })
                .catch(() => {});
        };

        channel.listen('.ChatMessageSent', onNewMessage);

        return () => {
            try {
                channel.stopListening('.ChatMessageSent');
            } catch {}
        };
    }, [user?.id, activeId]);

    const send = (e: FormEvent) => {
        e.preventDefault();
        if (!activeId || !draft.trim() || sending) return;
        setSending(true);
        setError('');
        fetch('/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': (window as any).csrfToken ?? '',
            },
            body: JSON.stringify({ with: activeId, message: draft.trim() }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.ok) {
                    setDraft('');
                    if (data.messages) setMessages(data.messages);
                } else {
                    setError(t('Message could not be sent.'));
                }
            })
            .catch(() => setError(t('Message could not be sent.')))
            .finally(() => setSending(false));
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-4">
                <header className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
                        <MessageCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Live Chat')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Chat with staff and parents in real time.')}
                        </p>
                    </div>
                </header>

                {error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                <Card className="overflow-hidden">
                    <div className="grid min-h-[440px] lg:grid-cols-[300px_1fr]">
                        <div className="border-b lg:border-b-0 lg:border-r dark:border-gray-800">
                            <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                {t('Conversations')}
                            </div>
                            <div className="max-h-[440px] overflow-y-auto">
                                {contacts.length === 0 ? (
                                    <div className="py-10 text-center text-sm text-gray-400">
                                        {t('No conversations yet.')}
                                    </div>
                                ) : (
                                    contacts.map((contact) => (
                                        <button
                                            key={contact.id}
                                            type="button"
                                            onClick={() => select(contact.id)}
                                            className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800 ${activeId === contact.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                        >
                                            <div className="h-9 w-9 shrink-0 rounded-full bg-blue-100 text-sm font-semibold text-blue-700 flex items-center justify-center dark:bg-blue-900/50 dark:text-blue-300">
                                                {contact.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {contact.name}
                                                </div>
                                                <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                                                    {contact.last_message || t('Start a conversation')}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {contact.unread > 0 && (
                                                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                                                        {contact.unread}
                                                    </span>
                                                )}
                                                {contact.last_time && (
                                                    <span className="text-[10px] text-gray-400">
                                                        {formatTime(contact.last_time)}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col">
                            {!active ? (
                                <div className="flex flex-1 items-center justify-center py-16 text-sm text-gray-400">
                                    {t('Select a conversation to start chatting.')}
                                </div>
                            ) : (
                                <>
                                    <div className="border-b bg-gray-50 px-4 py-3 dark:bg-gray-900 dark:border-gray-800">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {active.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('Role')}: {t(active.role)}
                                        </div>
                                    </div>
                                    <div
                                        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
                                        style={{ minHeight: '300px', maxHeight: '360px' }}
                                    >
                                        {loadingThread ? (
                                            <div className="flex justify-center py-10 text-gray-400">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            </div>
                                        ) : messages.length === 0 ? (
                                            <div className="py-12 text-center text-sm text-gray-400">
                                                {t('No messages yet. Say hello!')}
                                            </div>
                                        ) : (
                                            messages.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${message.is_mine ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${message.is_mine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'}`}
                                                    >
                                                        <div>{message.message}</div>
                                                        <div
                                                            className={`mt-1 text-[10px] ${message.is_mine ? 'text-blue-200' : 'text-gray-400'}`}
                                                        >
                                                            {message.is_mine ? t('You') : message.sender} ·{' '}
                                                            {formatTime(message.created_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        <div ref={threadEndRef} />
                                    </div>
                                    <form
                                        onSubmit={send}
                                        className="flex items-center gap-2 border-t p-3 dark:border-gray-800"
                                    >
                                        <Input
                                            value={draft}
                                            onChange={(e) => setDraft(e.target.value)}
                                            placeholder={t('Type a message...')}
                                        />
                                        <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
                                            {sending ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                            <span className="hidden sm:inline sm:ml-2">{t('Send')}</span>
                                        </Button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
