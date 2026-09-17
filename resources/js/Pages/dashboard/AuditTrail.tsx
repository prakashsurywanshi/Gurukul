import { useEffect, useState } from 'react';
import { Download, Eye, Filter, FileClock, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '../ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface TrailActor {
    id: number;
    name: string;
}

interface TrailRow {
    id: number;
    action: 'created' | 'updated' | 'deleted';
    module: string;
    model: string | null;
    model_id: number | null;
    description: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    user: TrailActor | null;
    created_at: string;
}

interface Option {
    value: string;
    label: string;
}

interface AuditTrailProps {
    user: any;
    trails: TrailRow[];
    pagination: {
        currentPage: number;
        lastPage: number;
        total: number;
        perPage: number;
    };
    filters: {
        search: string;
        action: string;
        module: string;
        start_date: string;
        end_date: string;
    };
    actionOptions: string[];
    moduleOptions: Option[];
    retentionDays?: number;
}

const ACTION_STYLES: Record<string, string> = {
    created: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    updated: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    deleted: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
};

const ACTION_LABELS: Record<string, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
};

export default function AuditTrail(pageProps: AuditTrailProps) {
    const { t } = useLanguage();
    const { user, trails, pagination, filters, actionOptions, moduleOptions, retentionDays = 90 } = pageProps;
    const [search, setSearch] = useState(filters.search);
    const [action, setAction] = useState(filters.action);
    const [module, setModule] = useState(filters.module);
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<TrailRow | null>(null);

    const hasFilters = search !== '' || action !== '' || module !== '' || startDate !== '' || endDate !== '';

    const applyFilters = (page = 1) => {
        setLoading(true);

        router.get(
            '/audit-trail',
            {
                page,
                search: search || undefined,
                action: action || undefined,
                module: module || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setLoading(false),
            },
        );
    };

    useEffect(() => {
        setSearch(filters.search);
        setAction(filters.action);
        setModule(filters.module);
        setStartDate(filters.start_date);
        setEndDate(filters.end_date);
    }, [filters]);

    const exportCsv = () => {
        const params = new URLSearchParams({
            search: search || '',
            action: action || '',
            module: module || '',
            start_date: startDate || '',
            end_date: endDate || '',
        });

        window.open(`/audit-trail/export?${params.toString()}`, '_blank');
    };

    const clearLogs = () => {
        if (!window.confirm('Clear all audit logs for this school? This cannot be undone.')) {
            return;
        }

        router.delete('/audit-trail/clear', { preserveScroll: true });
    };

    const resetFilters = () => {
        setSearch('');
        setAction('');
        setModule('');
        setStartDate('');
        setEndDate('');
        applyFilters(1);
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            <FileClock className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            {t('Audit Trail')}</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Every create, update and delete action recorded across the system.')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={exportCsv}>
                            <Download className="mr-2 h-4 w-4" />
                            {t('Export CSV')}</Button>
                        <Button variant="outline" className="text-rose-500 hover:text-rose-600" onClick={clearLogs}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('Clear Logs')}</Button>
                        {hasFilters && (
                            <Button variant="ghost" onClick={resetFilters}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {t('Reset')}</Button>
                        )}
                    </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:bg-sky-500/10 dark:text-sky-300">
                    <span className="mt-0.5">🗑</span>
                    <p>{t('Logs older than')}{retentionDays} days are removed automatically by nightly cleanup. Use{' '}
                        <strong>{t('Clear Logs')}</strong> to wipe everything now.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            <Filter className="mr-2 inline-block h-4 w-4" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                            <div className="relative lg:col-span-2">
                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    className="pl-9"
                                    placeholder={t('Search description…')}
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            applyFilters(1);
                                        }
                                    }}
                                />
                            </div>
                            <Select value={action} onValueChange={(value) => setAction(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('All actions')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="select-all-null">{t('All actions')}</SelectItem>
                                    {actionOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {ACTION_LABELS[option] ?? option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={module} onValueChange={(value) => setModule(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('All modules')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="select-all-null">{t('All modules')}</SelectItem>
                                    {moduleOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                max={endDate || undefined}
                            />
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(event) => setEndDate(event.target.value)}
                                min={startDate || undefined}
                            />
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                            <Badge variant="outline">{pagination.total} events</Badge>
                            <Button onClick={() => applyFilters(1)} disabled={loading}>
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Search className="mr-2 h-4 w-4" />
                                )}
                                {t('Apply')}</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Timestamp')}</TableHead>
                                    <TableHead>{t('User')}</TableHead>
                                    <TableHead>{t('Action')}</TableHead>
                                    <TableHead>{t('Module')}</TableHead>
                                    <TableHead>{t('Model')}</TableHead>
                                    <TableHead>{t('Description')}</TableHead>
                                    <TableHead>{t('IP Address')}</TableHead>
                                    <TableHead className="text-right">{t('Details')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {trails.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-10 text-center text-gray-400">{t('No audit events match your filters.')}</TableCell>
                                    </TableRow>
                                )}
                                {trails.map((trail) => (
                                    <TableRow key={trail.id}>
                                        <TableCell className="whitespace-nowrap text-xs">{trail.created_at}</TableCell>
                                        <TableCell className="whitespace-nowrap text-sm">
                                            {trail.user?.name ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={ACTION_STYLES[trail.action] ?? ''}>
                                                {ACTION_LABELS[trail.action] ?? trail.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{trail.module}</TableCell>
                                        <TableCell className="text-sm">
                                            {trail.model ? (
                                                <span className="font-mono text-xs">
                                                    {trail.model}
                                                    {trail.model_id ? ` #${trail.model_id}` : ''}
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-sm">{trail.description}</TableCell>
                                        <TableCell className="whitespace-nowrap font-mono text-xs">
                                            {trail.ip_address ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => setSelected(trail)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {pagination.lastPage > 1 && (
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        if (pagination.currentPage > 1) {
                                            applyFilters(pagination.currentPage - 1);
                                        }
                                    }}
                                    className={pagination.currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                                />
                            </PaginationItem>
                            <PaginationItem>
                                <span className="px-3 text-sm text-gray-500">
                                    {t('Page')}{pagination.currentPage} of {pagination.lastPage}
                                </span>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        if (pagination.currentPage < pagination.lastPage) {
                                            applyFilters(pagination.currentPage + 1);
                                        }
                                    }}
                                    className={
                                        pagination.currentPage >= pagination.lastPage
                                            ? 'pointer-events-none opacity-50'
                                            : ''
                                    }
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}

                <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
                    <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {selected ? `${ACTION_LABELS[selected.action] ?? selected.action} event` : ''}
                            </DialogTitle>
                            <DialogDescription>{t('Full details of this audit event.')}</DialogDescription>
                        </DialogHeader>
                        {selected && (
                            <div className="space-y-4">
                                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Timestamp')}</dt>
                                        <dd className="font-medium">{selected.created_at}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('User')}</dt>
                                        <dd className="font-medium">{selected.user?.name ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Module')}</dt>
                                        <dd className="font-medium">{selected.module}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Model')}</dt>
                                        <dd className="font-medium">
                                            {selected.model ? `${selected.model}#${selected.model_id ?? ''}` : '—'}
                                        </dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Description')}</dt>
                                        <dd className="font-medium">{selected.description}</dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="text-gray-500 dark:text-gray-400">{t('IP Address')}</dt>
                                        <dd className="font-mono text-xs">{selected.ip_address ?? '—'}</dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="text-gray-500 dark:text-gray-400">{t('User Agent')}</dt>
                                        <dd className="break-words font-mono text-xs text-gray-600 dark:text-gray-300">
                                            {selected.user_agent ?? '—'}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                                            Before
                                        </p>
                                        {selected.old_values ? (
                                            <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">
                                                {JSON.stringify(selected.old_values, null, 2)}
                                            </pre>
                                        ) : (
                                            <p className="text-xs text-gray-400">—</p>
                                        )}
                                    </div>
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                            After
                                        </p>
                                        {selected.new_values ? (
                                            <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">
                                                {JSON.stringify(selected.new_values, null, 2)}
                                            </pre>
                                        ) : (
                                            <p className="text-xs text-gray-400">—</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
