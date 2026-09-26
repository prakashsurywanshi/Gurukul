import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import {
    CheckCircle2,
    ChevronDown,
    History,
    Mail,
    Megaphone,
    MessageSquare,
    Plus,
    Send,
    Trash2,
    XCircle,
} from 'lucide-react';
import { Link, router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface Broadcast {
    id: string;
    subject: string;
    message: string;
    channels: string[];
    recipient_group: string;
    recipient_count: number;
    sent_count: number;
    delivered_count: number;
    opened_count: number;
    status: string;
    sent_at?: string | null;
    created_at?: string | null;
    created_by?: string | null;
}

interface BroadcastHistoryProps {
    user: any;
    broadcasts?: Broadcast[];
    sessionName?: string | null;
}

const CHANNEL_ICONS: Record<string, any> = {
    email: Send,
    sms: MessageSquare,
    whatsapp: MessageSquare,
    qwa_whatsapp: MessageSquare,
    push: Megaphone,
};

const GROUP_LABELS: Record<string, string> = {
    all_parents: 'All Parents',
    all_staff: 'All Staff',
    due_fees: 'Parents with Due Fees',
    no_dues: 'Parents with No Dues',
    class_parents: 'Parents of Specific Class(es)',
    class_students: 'Students of Specific Class(es)',
    specific_students: 'Specific Student(s)',
    specific_staff: 'Specific Staff',
};

const STATUS_BADGES: Record<string, string> = {
    sent: 'bg-green-100 text-green-700',
    sending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
};

export default function BroadcastHistory(pageProps: BroadcastHistoryProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const broadcasts = pageProps.broadcasts ?? [];

    useEffect(() => {
        if (flash.success) {
            setSuccessMessage(flash.success);
            setTimeout(() => setSuccessMessage(''), 5000);
        }
        if (flash.error) {
            setErrorMessage(flash.error);
            setTimeout(() => setErrorMessage(''), 5000);
        }
    }, [flash.error, flash.success]);

    const handleDelete = (broadcast: Broadcast) => {
        if (window.confirm(t('Delete this broadcast and its delivery records?'))) {
            router.delete(`/communicate/broadcast/${broadcast.id}`);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const formatDate = (iso?: string | null): string => {
        if (!iso) return '—';
        const date = new Date(iso);
        return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <DashboardLayout user={pageProps.user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Broadcast History')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {broadcasts.length} {t('messages sent to parents and staff')}
                            {pageProps.sessionName && (
                                <>
                                    {' '}
                                    · {t('Session')}: <strong>{pageProps.sessionName}</strong>
                                </>
                            )}
                        </p>
                    </div>
                    <Link href="/communicate/broadcast/create">
                        <Button className="bg-indigo-600 text-white hover:bg-indigo-700">
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Compose New Broadcast')}
                        </Button>
                    </Link>
                </div>

                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                        <CheckCircle2 className="h-4 w-4" />
                        {successMessage}
                    </div>
                )}
                {errorMessage && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                        <XCircle className="h-4 w-4" />
                        {errorMessage}
                    </div>
                )}

                {broadcasts.length === 0 ? (
                    <Card>
                        <CardContent>
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                <History className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                <p className="font-medium">{t('No broadcasts yet')}</p>
                                <p>{t('Messages you send appear here with their delivery stats.')}</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Previously Sent Messages')}</CardTitle>
                            <CardDescription>
                                {t('Delivery analytics show sent, delivered and opened counts per message.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {broadcasts.map((broadcast) => (
                                <div
                                    key={broadcast.id}
                                    className="rounded-xl border border-slate-200 dark:border-slate-700"
                                >
                                    <div
                                        className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        onClick={() => toggleExpand(broadcast.id)}
                                    >
                                        <ChevronDown
                                            className={`h-4 w-4 text-gray-400 transition-transform ${expandedId === broadcast.id ? 'rotate-180' : ''}`}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-gray-900 dark:text-white">
                                                {broadcast.subject}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(broadcast.sent_at ?? broadcast.created_at)}
                                                {broadcast.created_by && <> · {broadcast.created_by}</>}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {(broadcast.channels ?? []).map((channel) => {
                                                const Icon = CHANNEL_ICONS[channel] ?? Send;
                                                return (
                                                    <Badge key={channel} variant="outline">
                                                        <Icon className="mr-1 h-3 w-3" />
                                                        {t(channel)}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                        <Badge variant="outline">
                                            {t(GROUP_LABELS[broadcast.recipient_group] ?? broadcast.recipient_group)}
                                        </Badge>
                                        <Badge className={STATUS_BADGES[broadcast.status] ?? ''}>
                                            {t(broadcast.status)}
                                        </Badge>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span title={t('Sent')}>{broadcast.sent_count}</span>
                                            <span className="text-green-600" title={t('Delivered')}>
                                                {broadcast.delivered_count}
                                            </span>
                                            <span className="text-indigo-600" title={t('Opened')}>
                                                {broadcast.opened_count}
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(broadcast);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {expandedId === broadcast.id && (
                                        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
                                            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                                                {broadcast.message}
                                            </p>
                                            <div className="mt-4 grid grid-cols-3 gap-3 sm:max-w-md">
                                                <div className="rounded-lg bg-slate-100 p-3 text-center dark:bg-slate-800">
                                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {broadcast.sent_count}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{t('Sent')}</p>
                                                </div>
                                                <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
                                                    <p className="text-lg font-semibold text-green-700">
                                                        {broadcast.delivered_count}
                                                    </p>
                                                    <p className="text-xs text-green-600">{t('Delivered')}</p>
                                                </div>
                                                <div className="rounded-lg bg-indigo-50 p-3 text-center dark:bg-indigo-900/20">
                                                    <p className="text-lg font-semibold text-indigo-700">
                                                        {broadcast.opened_count}
                                                    </p>
                                                    <p className="text-xs text-indigo-600">{t('Opened')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
