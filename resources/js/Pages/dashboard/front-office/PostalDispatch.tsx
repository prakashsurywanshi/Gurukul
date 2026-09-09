import { useLanguage } from '../../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { CalendarDays, Edit, Eye, Package, Plus, Search, Send, ShieldCheck, Trash2, Truck } from 'lucide-react';
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

interface PostalDispatchEntry {
    id: number;
    reference_no?: string | null;
    to_title: string;
    address?: string | null;
    from_title?: string | null;
    dispatch_type: string;
    dispatch_date: string;
    tracking_no?: string | null;
    status: 'sent' | 'courier_booked' | 'delivered' | 'pending';
    note?: string | null;
    created_at?: string | null;
}

interface PostalDispatchProps {
    user: any;
    entries: PostalDispatchEntry[];
    tableReady: boolean;
}

const initialForm = {
    reference_no: '',
    to_title: '',
    address: '',
    from_title: '',
    dispatch_type: '',
    dispatch_date: new Date().toISOString().slice(0, 10),
    tracking_no: '',
    status: 'sent',
    note: '',
};

const ITEMS_PER_PAGE = 5;

export default function PostalDispatch({ user, entries, tableReady }: PostalDispatchProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    }>();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewingEntry, setViewingEntry] = useState<PostalDispatchEntry | null>(null);
    const [editingEntry, setEditingEntry] = useState<PostalDispatchEntry | null>(null);
    const [formData, setFormData] = useState(initialForm);

    const filteredEntries = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        if (!normalizedQuery) {
            return entries;
        }

        return entries.filter((entry) =>
            [
                entry.reference_no || '',
                entry.to_title,
                entry.address || '',
                entry.from_title || '',
                entry.dispatch_type,
                entry.dispatch_date,
                entry.tracking_no || '',
                entry.status,
                entry.note || '',
            ].some((value) => value.toLowerCase().includes(normalizedQuery)),
        );
    }, [entries, searchQuery]);

    const stats = {
        total: entries.length,
        sent: entries.filter((entry) => entry.status === 'sent').length,
        courierBooked: entries.filter((entry) => entry.status === 'courier_booked').length,
        delivered: entries.filter((entry) => entry.status === 'delivered').length,
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
        'Reference No',
        'To',
        'From',
        'Dispatch Type',
        'Dispatch Date',
        'Tracking No',
        'Status',
        'Address',
        'Note',
    ];

    const exportRows = filteredEntries.map((entry) => [
        entry.reference_no || '',
        entry.to_title,
        entry.from_title || '',
        entry.dispatch_type,
        entry.dispatch_date,
        entry.tracking_no || '',
        entry.status.replace('_', ' '),
        entry.address || '',
        entry.note || '',
    ]);

    const openCreateDialog = () => {
        setEditingEntry(null);
        setFormData(initialForm);
        setDialogOpen(true);
    };

    const openEditDialog = (entry: PostalDispatchEntry) => {
        setEditingEntry(entry);
        setFormData({
            reference_no: entry.reference_no || '',
            to_title: entry.to_title,
            address: entry.address || '',
            from_title: entry.from_title || '',
            dispatch_type: entry.dispatch_type,
            dispatch_date: entry.dispatch_date,
            tracking_no: entry.tracking_no || '',
            status: entry.status,
            note: entry.note || '',
        });
        setDialogOpen(true);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const payload = {
            ...formData,
            reference_no: formData.reference_no || null,
            address: formData.address || null,
            from_title: formData.from_title || null,
            tracking_no: formData.tracking_no || null,
            note: formData.note || null,
        };

        if (editingEntry) {
            router.patch(`/postal-dispatch/${editingEntry.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setDialogOpen(false);
                    setEditingEntry(null);
                    setFormData(initialForm);
                },
            });

            return;
        }

        router.post('/postal-dispatch', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setFormData(initialForm);
            },
        });
    };

    const handleDelete = (entry: PostalDispatchEntry) => {
        if (!window.confirm(`Delete the postal dispatch entry for ${entry.to_title}?`)) {
            return;
        }

        router.delete(`/postal-dispatch/${entry.id}`, {
            preserveScroll: true,
        });
    };

    const renderStatusBadge = (status: PostalDispatchEntry['status']) => {
        if (status === 'delivered') {
            return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{t('Delivered')}</Badge>;
        }

        if (status === 'courier_booked') {
            return <Badge className="bg-blue-600 text-white hover:bg-blue-600">{t('Courier Booked')}</Badge>;
        }

        if (status === 'pending') {
            return <Badge className="bg-blue-500 text-white hover:bg-blue-500">{t('Pending')}</Badge>;
        }

        return <Badge className="bg-slate-700 text-white hover:bg-slate-700">{t('Sent')}</Badge>;
    };

    return (
        <DashboardLayout user={user} activeTab="postal-dispatch">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Postal Dispatch')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t(
                                    'Track outgoing notices, courier packets, and official dispatch records from the front office.',
                                )}
                            </p>
                        </div>
                        <Button
                            type="button"
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            onClick={openCreateDialog}
                        >
                            <Plus className="h-4 w-4" />
                            {t('Add Dispatch')}
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
                                        <p className="text-sm text-slate-500">{t('Total Dispatch')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                                    </div>
                                    <div className="rounded-full bg-blue-100 p-3">
                                        <Package className="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Sent')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.sent}</p>
                                    </div>
                                    <div className="rounded-full bg-slate-100 p-3">
                                        <Send className="h-5 w-5 text-slate-700" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Courier Booked')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.courierBooked}</p>
                                    </div>
                                    <div className="rounded-full bg-cyan-100 p-3">
                                        <Truck className="h-5 w-5 text-cyan-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Delivered')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.delivered}</p>
                                    </div>
                                    <div className="rounded-full bg-emerald-100 p-3">
                                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Dispatch Register')}</CardTitle>
                            <CardDescription>
                                {t('Maintain a searchable log of outgoing postal and courier dispatch records.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!tableReady && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                    {t(
                                        'The `postal_dispatch_entries` table is not available yet. Run `php artisan migrate` to create it before using this page.',
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
                                        placeholder={t('Search dispatch records...')}
                                        className="pl-10"
                                    />
                                </div>

                                <div className="flex items-center gap-2 whitespace-nowrap">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            copyFrontOfficeRows('Postal Dispatch', exportHeaders, exportRows)
                                        }
                                    >
                                        {t('Copy')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            exportFrontOfficeCsv(
                                                'postal_dispatch',
                                                'Postal Dispatch',
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
                                            exportFrontOfficePdf('Postal Dispatch', exportHeaders, exportRows)
                                        }
                                    >
                                        {t('PDF')}
                                    </Button>
                                </div>
                            </div>

                            {filteredEntries.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                                    <p className="text-sm text-slate-500">{t('No dispatch entries found.')}</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Reference')}</TableHead>
                                                <TableHead>{t('Recipient')}</TableHead>
                                                <TableHead>{t('Dispatch Type')}</TableHead>
                                                <TableHead>{t('Date')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                                <TableHead className="text-right">{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedEntries.map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-slate-900">
                                                                {entry.reference_no || t('No reference')}
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {entry.tracking_no || t('No tracking number')}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p>{entry.to_title}</p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {entry.from_title || t('Sender not added')}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p>{entry.dispatch_type}</p>
                                                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                                                {entry.address || t('No address added')}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <CalendarDays className="h-4 w-4 text-slate-400" />
                                                            <span>{entry.dispatch_date}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{renderStatusBadge(entry.status)}</TableCell>
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
                        <DialogTitle>
                            {editingEntry ? t('Edit Postal Dispatch') : t('Create Postal Dispatch')}
                        </DialogTitle>
                        <DialogDescription>{t('Record an outgoing postal or courier dispatch.')}</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="reference_no">{t('Reference No')}</Label>
                                <Input
                                    id="reference_no"
                                    value={formData.reference_no}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            reference_no: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="to_title">{t('To')}</Label>
                                <Input
                                    id="to_title"
                                    value={formData.to_title}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            to_title: event.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="from_title">{t('From')}</Label>
                                <Input
                                    id="from_title"
                                    value={formData.from_title}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            from_title: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="dispatch_type">{t('Dispatch Type')}</Label>
                                <Input
                                    id="dispatch_type"
                                    value={formData.dispatch_type}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            dispatch_type: event.target.value,
                                        }))
                                    }
                                    placeholder={t('Letter, Notice, Courier, Parcel')}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="dispatch_date">{t('Dispatch Date')}</Label>
                                <Input
                                    id="dispatch_date"
                                    type="date"
                                    value={formData.dispatch_date}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            dispatch_date: event.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="tracking_no">{t('Tracking No')}</Label>
                                <Input
                                    id="tracking_no"
                                    value={formData.tracking_no}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            tracking_no: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="status">{t('Status')}</Label>
                                <select
                                    id="status"
                                    value={formData.status}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            status: event.target.value as typeof initialForm.status,
                                        }))
                                    }
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                                >
                                    <option value="sent">{t('Sent')}</option>
                                    <option value="courier_booked">{t('Courier Booked')}</option>
                                    <option value="delivered">{t('Delivered')}</option>
                                    <option value="pending">{t('Pending')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="address">{t('Address')}</Label>
                            <Textarea
                                id="address"
                                value={formData.address}
                                onChange={(event) =>
                                    setFormData((current) => ({
                                        ...current,
                                        address: event.target.value,
                                    }))
                                }
                                rows={3}
                            />
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
                                {editingEntry ? t('Update Dispatch') : t('Create Dispatch')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(viewingEntry)} onOpenChange={(open) => !open && setViewingEntry(null)}>
                <DialogContent className="w-1/2 sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t('Postal Dispatch Details')}</DialogTitle>
                        <DialogDescription>{t('Review the recorded dispatch information.')}</DialogDescription>
                    </DialogHeader>

                    {viewingEntry && (
                        <div className="space-y-4 text-sm text-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-semibold text-slate-900">{viewingEntry.to_title}</p>
                                    <p className="mt-1 text-slate-500">
                                        {viewingEntry.reference_no || t('No reference number')}
                                    </p>
                                </div>
                                {renderStatusBadge(viewingEntry.status)}
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <p className="font-medium text-slate-900">{t('From')}</p>
                                    <p>{viewingEntry.from_title || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Dispatch Type')}</p>
                                    <p>{viewingEntry.dispatch_type}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Dispatch Date')}</p>
                                    <p>{viewingEntry.dispatch_date}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Tracking No')}</p>
                                    <p>{viewingEntry.tracking_no || '-'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="font-medium text-slate-900">{t('Address')}</p>
                                    <p>{viewingEntry.address || '-'}</p>
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
