import { useLanguage } from '../../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { CalendarDays, Clock3, Edit, Eye, Phone, PhoneCall, Plus, Search, Trash2 } from 'lucide-react';
import DashboardLayout from '../../DashboardLayout';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '../../ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Textarea } from '../../ui/textarea';
import { copyFrontOfficeRows, exportFrontOfficeCsv, exportFrontOfficePdf } from './frontOfficeExport';

interface PhoneCallEntry {
    id: number;
    caller_name: string;
    phone?: string | null;
    call_type: 'incoming' | 'outgoing';
    purpose: string;
    call_date: string;
    call_time?: string | null;
    duration?: string | null;
    follow_up_date?: string | null;
    note?: string | null;
    created_at?: string | null;
}

interface PhoneCallLogProps {
    user: any;
    entries: PhoneCallEntry[];
    tableReady: boolean;
}

const initialForm = {
    caller_name: '',
    phone: '',
    call_type: 'incoming',
    purpose: '',
    call_date: new Date().toISOString().slice(0, 10),
    call_time: '',
    duration: '',
    follow_up_date: '',
    note: '',
};

const ITEMS_PER_PAGE = 5;

export default function PhoneCallLog({ user, entries, tableReady }: PhoneCallLogProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    }>();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewingEntry, setViewingEntry] = useState<PhoneCallEntry | null>(null);
    const [editingEntry, setEditingEntry] = useState<PhoneCallEntry | null>(null);
    const [formData, setFormData] = useState(initialForm);

    const filteredEntries = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        if (!normalizedQuery) {
            return entries;
        }

        return entries.filter((entry) =>
            [
                entry.caller_name,
                entry.phone || '',
                entry.call_type,
                entry.purpose,
                entry.call_date,
                entry.call_time || '',
                entry.duration || '',
                entry.follow_up_date || '',
                entry.note || '',
            ].some((value) => value.toLowerCase().includes(normalizedQuery)),
        );
    }, [entries, searchQuery]);

    const stats = {
        total: entries.length,
        incoming: entries.filter((entry) => entry.call_type === 'incoming').length,
        outgoing: entries.filter((entry) => entry.call_type === 'outgoing').length,
        followUps: entries.filter((entry) => Boolean(entry.follow_up_date)).length,
    };

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredEntries.length / ITEMS_PER_PAGE));
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, filteredEntries.length]);

    const totalPages = Math.max(1, Math.ceil(filteredEntries.length / ITEMS_PER_PAGE));
    const paginatedEntries = filteredEntries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const exportHeaders = [
        'Caller Name',
        'Phone',
        'Call Type',
        'Purpose',
        'Call Date',
        'Call Time',
        'Duration',
        'Follow Up Date',
        'Note',
    ];

    const exportRows = filteredEntries.map((entry) => [
        entry.caller_name,
        entry.phone || '',
        entry.call_type,
        entry.purpose,
        entry.call_date,
        entry.call_time || '',
        entry.duration || '',
        entry.follow_up_date || '',
        entry.note || '',
    ]);

    const openCreateDialog = () => {
        setEditingEntry(null);
        setFormData(initialForm);
        setDialogOpen(true);
    };

    const openEditDialog = (entry: PhoneCallEntry) => {
        setEditingEntry(entry);
        setFormData({
            caller_name: entry.caller_name,
            phone: entry.phone || '',
            call_type: entry.call_type,
            purpose: entry.purpose,
            call_date: entry.call_date,
            call_time: entry.call_time || '',
            duration: entry.duration || '',
            follow_up_date: entry.follow_up_date || '',
            note: entry.note || '',
        });
        setDialogOpen(true);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const payload = {
            ...formData,
            phone: formData.phone || null,
            call_time: formData.call_time || null,
            duration: formData.duration || null,
            follow_up_date: formData.follow_up_date || null,
            note: formData.note || null,
        };

        if (editingEntry) {
            router.patch(`/phone-call-log/${editingEntry.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setDialogOpen(false);
                    setEditingEntry(null);
                    setFormData(initialForm);
                },
            });

            return;
        }

        router.post('/phone-call-log', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setFormData(initialForm);
            },
        });
    };

    const handleDelete = (entry: PhoneCallEntry) => {
        if (!window.confirm(`Delete the phone call entry for ${entry.caller_name}?`)) {
            return;
        }

        router.delete(`/phone-call-log/${entry.id}`, {
            preserveScroll: true,
        });
    };

    const renderTypeBadge = (callType: PhoneCallEntry['call_type']) => {
        if (callType === 'outgoing') {
            return <Badge className="bg-blue-600 text-white hover:bg-blue-600">{t('Outgoing')}</Badge>;
        }

        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{t('Incoming')}</Badge>;
    };

    return (
        <DashboardLayout user={user} activeTab="phone-call-log">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Phone Call Log')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t(
                                    'Record incoming and outgoing front office calls with purpose and follow-up tracking.',
                                )}
                            </p>
                        </div>
                        <Button
                            type="button"
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            onClick={openCreateDialog}
                        >
                            <Plus className="h-4 w-4" />
                            {t('Add Call Log')}
                        </Button>
                    </div>

                    {page.props.flash?.success && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {page.props.flash.success}
                        </div>
                    )}

                    {page.props.flash?.error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {page.props.flash.error}
                        </div>
                    )}

                    {Object.keys(page.props.errors || {}).length > 0 && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {Object.values(page.props.errors || {})[0]}
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Total Calls')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                                    </div>
                                    <div className="rounded-full bg-blue-100 p-3">
                                        <PhoneCall className="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Incoming')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.incoming}</p>
                                    </div>
                                    <div className="rounded-full bg-emerald-100 p-3">
                                        <Phone className="h-5 w-5 text-emerald-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Outgoing')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.outgoing}</p>
                                    </div>
                                    <div className="rounded-full bg-cyan-100 p-3">
                                        <PhoneCall className="h-5 w-5 text-cyan-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Follow Ups')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.followUps}</p>
                                    </div>
                                    <div className="rounded-full bg-blue-100 p-3">
                                        <CalendarDays className="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Call Register')}</CardTitle>
                            <CardDescription>
                                {t('Keep a searchable record of call purpose, timing, and any required follow-up.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!tableReady && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                    {t(
                                        'The `phone_call_log_entries` table is not available yet. Run `php artisan migrate` to create it before using this page.',
                                    )}
                                </div>
                            )}

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative min-w-[260px] flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(event) => {
                                            setSearchQuery(event.target.value);
                                            setCurrentPage(1);
                                        }}
                                        placeholder={t('Search calls...')}
                                        className="pl-10"
                                    />
                                </div>

                                <div className="flex items-center gap-2 whitespace-nowrap">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyFrontOfficeRows('Phone Call Log', exportHeaders, exportRows)}
                                    >
                                        {t('Copy')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            exportFrontOfficeCsv(
                                                'phone_call_log',
                                                'Phone Call Log',
                                                exportHeaders,
                                                exportRows,
                                            )
                                        }
                                    >
                                        {t('CSV')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            exportFrontOfficePdf('Phone Call Log', exportHeaders, exportRows)
                                        }
                                    >
                                        {t('PDF')}
                                    </Button>
                                </div>
                            </div>

                            {filteredEntries.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                                    <p className="text-sm text-slate-500">{t('No phone call entries found.')}</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Caller')}</TableHead>
                                                <TableHead>{t('Type')}</TableHead>
                                                <TableHead>{t('Purpose')}</TableHead>
                                                <TableHead>{t('Schedule')}</TableHead>
                                                <TableHead className="text-right">{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedEntries.map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-slate-900">
                                                                {entry.caller_name}
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {entry.phone || t('No number added')}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{renderTypeBadge(entry.call_type)}</TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p>{t(entry.purpose)}</p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {entry.duration || t('No duration noted')}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1 text-sm text-slate-600">
                                                            <div className="flex items-center gap-2">
                                                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                                                <span>{entry.call_date}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Clock3 className="h-4 w-4 text-slate-400" />
                                                                <span>{entry.call_time || '-'}</span>
                                                            </div>
                                                            <p>
                                                                {t('Follow up:')}
                                                                {entry.follow_up_date || t('Not scheduled')}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => setViewingEntry(entry)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => openEditDialog(entry)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="icon"
                                                                onClick={() => handleDelete(entry)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-slate-600">
                                    {t('Showing {start} to {end} of {total} records', {
                                        start:
                                            (currentPage - 1) * ITEMS_PER_PAGE + (paginatedEntries.length > 0 ? 1 : 0),
                                        end: (currentPage - 1) * ITEMS_PER_PAGE + paginatedEntries.length,
                                        total: filteredEntries.length,
                                    })}
                                </p>

                                <Pagination className="mx-0 w-auto justify-end">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    if (currentPage > 1) {
                                                        setCurrentPage((pageNumber) => pageNumber - 1);
                                                    }
                                                }}
                                            />
                                        </PaginationItem>
                                        {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                                            (pageNumber) => (
                                                <PaginationItem key={pageNumber}>
                                                    <PaginationLink
                                                        href="#"
                                                        isActive={pageNumber === currentPage}
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            setCurrentPage(pageNumber);
                                                        }}
                                                    >
                                                        {pageNumber}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ),
                                        )}
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    if (currentPage < totalPages) {
                                                        setCurrentPage((pageNumber) => pageNumber + 1);
                                                    }
                                                }}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto p-5 sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingEntry ? t('Edit Call Log') : t('Create Call Log')}</DialogTitle>
                        <DialogDescription>{t('Record a front office phone call entry.')}</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="caller_name">{t('Caller Name')}</Label>
                                <Input
                                    id="caller_name"
                                    value={formData.caller_name}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            caller_name: event.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="phone">{t('Phone')}</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            phone: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="call_type">{t('Call Type')}</Label>
                                <select
                                    id="call_type"
                                    value={formData.call_type}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            call_type: event.target.value as typeof initialForm.call_type,
                                        }))
                                    }
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                                >
                                    <option value="incoming">{t('Incoming')}</option>
                                    <option value="outgoing">{t('Outgoing')}</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="purpose">{t('Purpose')}</Label>
                                <Input
                                    id="purpose"
                                    value={formData.purpose}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            purpose: event.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="call_date">{t('Call Date')}</Label>
                                <Input
                                    id="call_date"
                                    type="date"
                                    value={formData.call_date}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            call_date: event.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="call_time">{t('Call Time')}</Label>
                                <Input
                                    id="call_time"
                                    type="time"
                                    value={formData.call_time}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            call_time: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="duration">{t('Duration')}</Label>
                                <Input
                                    id="duration"
                                    value={formData.duration}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            duration: event.target.value,
                                        }))
                                    }
                                    placeholder={t('5 min')}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="follow_up_date">{t('Follow Up Date')}</Label>
                                <Input
                                    id="follow_up_date"
                                    type="date"
                                    value={formData.follow_up_date}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            follow_up_date: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="note">{t('Note')}</Label>
                            <Textarea
                                id="note"
                                value={formData.note}
                                onChange={(event) =>
                                    setFormData((current) => ({
                                        ...current,
                                        note: event.target.value,
                                    }))
                                }
                                rows={4}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                                {editingEntry ? t('Update Call Log') : t('Create Call Log')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(viewingEntry)} onOpenChange={(open) => !open && setViewingEntry(null)}>
                <DialogContent className="w-1/2 sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t('Phone Call Details')}</DialogTitle>
                        <DialogDescription>
                            {t('Review the recorded information for this phone call.')}
                        </DialogDescription>
                    </DialogHeader>

                    {viewingEntry && (
                        <div className="space-y-4 text-sm text-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-semibold text-slate-900">{viewingEntry.caller_name}</p>
                                    <p className="mt-1 text-slate-500">{viewingEntry.phone || t('No number added')}</p>
                                </div>
                                {renderTypeBadge(viewingEntry.call_type)}
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <p className="font-medium text-slate-900">{t('Purpose')}</p>
                                    <p>{t(viewingEntry.purpose)}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Call Date')}</p>
                                    <p>{viewingEntry.call_date}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Call Time')}</p>
                                    <p>{viewingEntry.call_time || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Duration')}</p>
                                    <p>{viewingEntry.duration || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Follow Up Date')}</p>
                                    <p>{viewingEntry.follow_up_date || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Created At')}</p>
                                    <p>{viewingEntry.created_at || '-'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">{t('Note')}</p>
                                <p className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    {viewingEntry.note || t('No note added.')}
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
