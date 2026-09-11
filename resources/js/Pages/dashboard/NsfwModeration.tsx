import { FormEvent, useState } from 'react';
import { AlertTriangle, CheckCheck, Flag, Inbox, Search, ShieldAlert, XCircle } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface FlagRecord {
    id: number;
    item_type: string;
    item_id: number;
    reason: string | null;
    notes: string | null;
    status: string;
    created_at: string;
    reviewed_at: string | null;
    flagger?: { id: number; name: string; role: string } | null;
    reviewer?: { id: number; name: string } | null;
}

interface NsfwModerationProps {
    user: any;
    flags: FlagRecord[];
    stats: { pending: number; reviewed: number; dismissed: number };
    filters: { status: string };
}

const STATUS_BADGE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    reviewed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    dismissed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function NsfwModeration(pageProps: NsfwModerationProps) {
    const { user, flags, stats, filters } = pageProps;
    const { t } = useLanguage();

    const [itemType, setItemType] = useState('media');
    const [itemId, setId] = useState('');
    const [reason, setReason] = useState('');

    const submitReport = (e: FormEvent) => {
        e.preventDefault();
        router.post('/nsfw', {
            item_type: itemType,
            item_id: Number(itemId),
            reason,
        });
        setItemId('');
        setReason('');
    };

    const review = (flag: FlagRecord, action: string) => {
        router.post(`/nsfw/${flag.id}/review`, { action });
    };

    const setStatus = (status: string) => {
        router.get('/nsfw', status ? { status } : {}, { preserveState: true });
    };

    return (
        <DashboardLayout user={user}>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">{t('nsfw.title')}</h1>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6 flex items-center gap-3">
                            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/40">
                                <Flag className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold dark:text-white">{stats.pending}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('nsfw.pending')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 flex items-center gap-3">
                            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/40">
                                <CheckCheck className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold dark:text-white">{stats.reviewed}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('nsfw.reviewed')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 flex items-center gap-3">
                            <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
                                <XCircle className="h-5 w-5 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold dark:text-white">{stats.dismissed}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('nsfw.dismissed')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('nsfw.reportTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitReport} className="flex flex-wrap items-end gap-4">
                            <div className="min-w-[150px]">
                                <Label>{t('nsfw.itemType')}</Label>
                                <select
                                    value={itemType}
                                    onChange={(e) => setItemType(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                >
                                    <option value="media">Media</option>
                                    <option value="gallery">Gallery Image</option>
                                    <option value="chat">Chat Message</option>
                                </select>
                            </div>
                            <div className="min-w-[120px]">
                                <Label>{t('nsfw.itemId')}</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={itemId}
                                    onChange={(e) => setId(e.target.value)}
                                    className="mt-1"
                                    required
                                />
                            </div>
                            <div className="min-w-[220px] flex-1">
                                <Label>{t('nsfw.reason')}</Label>
                                <Input
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="mt-1"
                                    placeholder={t('nsfw.reasonPlaceholder')}
                                    required
                                />
                            </div>
                            <Button type="submit">
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                {t('nsfw.report')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5" />
                                {t('nsfw.flags')}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 rounded-lg border px-2 py-1 text-sm">
                                    <Search className="h-4 w-4 text-gray-400" />
                                    <select
                                        value={filters.status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="bg-transparent text-sm dark:text-white focus:outline-none"
                                    >
                                        <option value="">{t('nsfw.all')}</option>
                                        <option value="pending">{t('nsfw.pending')}</option>
                                        <option value="reviewed">{t('nsfw.reviewed')}</option>
                                        <option value="dismissed">{t('nsfw.dismissed')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {flags.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                <p className="mt-4 text-sm font-medium dark:text-white">{t('nsfw.noFlags')}</p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('nsfw.noFlagsDesc')}</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('nsfw.item')}</TableHead>
                                        <TableHead>{t('nsfw.reason')}</TableHead>
                                        <TableHead>{t('nsfw.reportedBy')}</TableHead>
                                        <TableHead>{t('nsfw.status')}</TableHead>
                                        <TableHead className="text-right">{t('nsfw.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flags.map((flag) => (
                                        <TableRow key={flag.id}>
                                            <TableCell>
                                                <p className="font-medium dark:text-white">{flag.item_type}</p>
                                                <p className="text-sm text-gray-500">#{flag.item_id}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm dark:text-white">{flag.reason ?? '—'}</p>
                                                {flag.notes ? (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {flag.notes}
                                                    </p>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-sm dark:text-white">
                                                {flag.flagger?.name ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={STATUS_BADGE[flag.status] ?? STATUS_BADGE.pending}>
                                                    {t('nsfw.status.' + flag.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {flag.status === 'pending' ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => review(flag, 'reviewed')}
                                                        >
                                                            {t('nsfw.approve')}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => review(flag, 'dismissed')}
                                                        >
                                                            {t('nsfw.dismiss')}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">
                                                        {flag.reviewer?.name ?? '—'}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
