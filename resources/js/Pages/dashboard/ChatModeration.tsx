import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { Eye, EyeOff, Flag, MessageSquareWarning, ShieldCheck } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

type ModerationRow = {
    id: number;
    senderName: string;
    senderRole: string;
    conversationKey: string | null;
    body: string;
    messageType: string;
    isFlagged: boolean;
    moderationStatus: string;
    moderationAction: string | null;
    moderationReason: string | null;
    moderatedBy: string | null;
    createdAt: string | null;
};

export type ChatModerationProps = {
    user: any;
    messages: ModerationRow[];
    summary: { flagged: number; hidden: number; reviewed: number; contentSafe: number };
};

export default function ChatModeration({ user, messages, summary }: ChatModerationProps) {
    const { t } = useLanguage();
    const [filter, setFilter] = useState<'all' | 'flagged' | 'hidden'>('all');
    const [reasons, setReasons] = useState<Record<number, string>>({});

    const visible = messages.filter((message) => {
        if (filter === 'flagged') return message.isFlagged;
        if (filter === 'hidden') return message.moderationStatus === 'hidden';
        return true;
    });

    const moderateAction = (message: ModerationRow, action: 'hide' | 'approve') => {
        router.post(
            `/chat-moderation/${message.id}/moderate`,
            {
                moderation_status: action === 'hide' ? 'hidden' : 'visible',
                action,
                reason: reasons[message.id] ?? null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setReasons((prev) => ({ ...prev, [message.id]: '' }));
                    toast.success(action === 'hide' ? t('Message hidden.') : t('Message approved.'));
                },
            },
        );
    };

    const statusBadge = (message: ModerationRow) => {
        if (message.moderationStatus === 'visible') {
            return <Badge variant="default">{t('Visible')}</Badge>;
        }
        if (message.moderationStatus === 'hidden') {
            return <Badge variant="destructive">{t('Hidden')}</Badge>;
        }
        return <Badge variant="outline">{t('Pending')}</Badge>;
    };

    return (
        <DashboardLayout user={user} pageTitle={t('Chat Moderation')}>
            <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Flagged')}</p>
                                <p className="text-2xl font-bold">{summary.flagged}</p>
                            </div>
                            <Flag className="h-5 w-5 text-rose-600" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Hidden')}</p>
                                <p className="text-2xl font-bold">{summary.hidden}</p>
                            </div>
                            <EyeOff className="h-5 w-5 text-rose-600" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Reviewed')}</p>
                                <p className="text-2xl font-bold">{summary.reviewed}</p>
                            </div>
                            <ShieldCheck className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Content Safe')}</p>
                                <p className="text-2xl font-bold">{summary.contentSafe}</p>
                            </div>
                            <MessageSquareWarning className="h-5 w-5" />
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>{t('Messages')}</CardTitle>
                            <Select
                                value={filter}
                                onValueChange={(value) => setFilter(value as 'all' | 'flagged' | 'hidden')}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All')}</SelectItem>
                                    <SelectItem value="flagged">{t('Flagged')}</SelectItem>
                                    <SelectItem value="hidden">{t('Hidden')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {visible.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">{t('No messages to review.')}</p>
                        )}
                        <div className="space-y-3">
                            {visible.map((message) => (
                                <div key={message.id} className="rounded-lg border p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{message.senderName}</p>
                                            <Badge variant="secondary">{t(message.senderRole)}</Badge>
                                            {message.isFlagged && (
                                                <Badge variant="destructive">
                                                    <Flag className="mr-1 h-3 w-3" /> {t('Flagged')}
                                                </Badge>
                                            )}
                                            {statusBadge(message)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{message.createdAt}</p>
                                    </div>
                                    <p className="mt-2 text-sm">{message.body}</p>
                                    {message.conversationKey && (
                                        <p className="mt-1 text-xs text-muted-foreground">#{message.conversationKey}</p>
                                    )}
                                    {message.moderatedBy && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t('Moderated by')} {message.moderatedBy}
                                            {message.moderationReason ? ` · ${message.moderationReason}` : ''}
                                        </p>
                                    )}
                                    {message.moderationStatus === 'visible' || (
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {message.moderationStatus === 'pending' && (
                                                <input
                                                    type="text"
                                                    value={reasons[message.id] ?? ''}
                                                    onChange={(e) =>
                                                        setReasons((prev) => ({
                                                            ...prev,
                                                            [message.id]: e.target.value,
                                                        }))
                                                    }
                                                    placeholder={t('Reason (optional)')}
                                                    className="h-9 w-56 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus:ring-1"
                                                />
                                            )}
                                            {message.moderationAction !== 'hide' && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => moderateAction(message, 'hide')}
                                                >
                                                    <EyeOff className="mr-1 h-4 w-4" /> {t('Hide')}
                                                </Button>
                                            )}
                                            {message.moderationAction !== 'approve' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => moderateAction(message, 'approve')}
                                                >
                                                    <Eye className="mr-1 h-4 w-4" /> {t('Approve')}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
