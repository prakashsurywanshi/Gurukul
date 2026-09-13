import { useLanguage } from '../../i18n/LanguageProvider';
import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { CheckCircle2, ClipboardCheck, DoorOpen, LogIn, LogOut, RotateCcw, ScrollText, Search } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface GateTerminalProps {
    user: any;
    passes: Array<{
        id: string;
        personType: string;
        personName: string;
        personContact: string | null;
        passType: string;
        reason: string | null;
        expectedReturnAt: string | null;
        usedAt: string | null;
        status: string;
        createdByName: string | null;
        createdAt: string | null;
    }>;
    summary: {
        todayTotal: number;
        openCount: number;
        checkedToday: number;
    };
    search: string;
}

function formatTime(iso: string | null): string {
    if (!iso) return '—';

    const date = new Date(iso);

    return isNaN(date.getTime()) ? '—' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function GateTerminal({ user, passes, summary, search }: GateTerminalProps) {
    const { t } = useLanguage();
    const [query, setQuery] = useState(search);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();

        return term === '' ? passes : passes.filter((pass) => pass.personName.toLowerCase().includes(term));
    }, [passes, query]);

    const markUsed = (id: string) => {
        router.post(
            `/gate-passes/${id}/used`,
            {},
            {
                preserveState: false,
                preserveScroll: true,
            },
        );
    };

    const cancel = (id: string) => {
        router.post(
            `/gate-passes/${id}/cancel`,
            {},
            {
                preserveState: false,
                preserveScroll: true,
            },
        );
    };

    const refresh = () => {
        router.reload({ only: ['passes', 'summary'] });
    };

    const cards = [
        {
            key: 'todayTotal',
            value: summary.todayTotal,
            label: t("Today's Passes"),
            icon: ScrollText,
            tone: 'bg-indigo-50 text-indigo-600',
        },
        {
            key: 'openCount',
            value: summary.openCount,
            label: t('Open Passes'),
            icon: DoorOpen,
            tone: 'bg-amber-50 text-amber-600',
        },
        {
            key: 'checkedToday',
            value: summary.checkedToday,
            label: t('Checked Today'),
            icon: CheckCircle2,
            tone: 'bg-emerald-50 text-emerald-600',
        },
    ];

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                    <ClipboardCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                        {t('Gate Terminal')}
                                    </h1>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                                        {t("Quick check-in / check-out queue for today's gate passes.")}
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={refresh}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                {t('Refresh')}
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {cards.map((card) => (
                        <Card key={card.key}>
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className={`rounded-lg p-2 ${card.tone}`}>
                                    <card.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                        {card.value}
                                    </div>
                                    <div className="text-xs text-slate-500">{card.label}</div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardContent className="space-y-4 p-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t('Search by name')}
                                className="pl-9"
                            />
                        </div>

                        <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Person')}</TableHead>
                                        <TableHead>{t('Pass')}</TableHead>
                                        <TableHead>{t('Reason')}</TableHead>
                                        <TableHead>{t('Issued')}</TableHead>
                                        <TableHead>{t('Expected Return')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead className="text-right">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                                {t('No open passes for today.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map((pass) => (
                                            <TableRow key={pass.id}>
                                                <TableCell>
                                                    <div className="font-medium text-slate-800 dark:text-gray-100">
                                                        {pass.personName}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {pass.personType === 'student' ? t('Student') : t('Staff')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            pass.passType === 'entry'
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : 'bg-sky-50 text-sky-700'
                                                        }
                                                    >
                                                        {pass.passType === 'entry' ? t('Entry') : t('Exit')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {pass.reason}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {formatTime(pass.createdAt)}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {formatTime(pass.expectedReturnAt)}
                                                </TableCell>
                                                <TableCell>
                                                    {pass.status === 'open' ? (
                                                        <Badge className="bg-amber-50 text-amber-700">
                                                            {t('Open')}
                                                        </Badge>
                                                    ) : pass.status === 'closed' ? (
                                                        <Badge className="bg-emerald-50 text-emerald-700">
                                                            {t('Checked')}
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-rose-50 text-rose-700">
                                                            {t('Cancelled')}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {pass.status === 'open' ? (
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="sm" onClick={() => markUsed(pass.id)}>
                                                                {pass.passType === 'entry' ? (
                                                                    <LogIn className="mr-1 h-4 w-4" />
                                                                ) : (
                                                                    <LogOut className="mr-1 h-4 w-4" />
                                                                )}
                                                                {t('Mark Used')}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => cancel(pass.id)}
                                                            >
                                                                {t('Cancel')}
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
