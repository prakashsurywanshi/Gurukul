import { useLanguage } from '../../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { CalendarDays, Edit, Eye, Inbox, PackageCheck, Plus, Search, ShieldCheck, Trash2, Truck } from 'lucide-react';
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

interface PostalDeliveryEntry {
    id: number;
    reference_no?: string | null;
    from_title: string;
    address?: string | null;
    delivery_type: string;
    received_by?: string | null;
    delivery_date: string;
    tracking_no?: string | null;
    status: 'received' | 'in_process' | 'distributed' | 'pending';
    note?: string | null;
    created_at?: string | null;
}

interface PostalDeliveryProps {
    user: any;
    entries: PostalDeliveryEntry[];
    tableReady: boolean;
}

const initialForm = {
    reference_no: '',
    from_title: '',
    address: '',
    delivery_type: '',
    received_by: '',
    delivery_date: new Date().toISOString().slice(0, 10),
    tracking_no: '',
    status: 'received',
    note: '',
};

const ITEMS_PER_PAGE = 5;

export default function PostalDelivery({ user, entries, tableReady }: PostalDeliveryProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    }>();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewingEntry, setViewingEntry] = useState<PostalDeliveryEntry | null>(null);
    const [editingEntry, setEditingEntry] = useState<PostalDeliveryEntry | null>(null);
    const [formData, setFormData] = useState(initialForm);

    const filteredEntries = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        if (!normalizedQuery) {
            return entries;
        }

        return entries.filter((entry) =>
            [
                entry.reference_no || '',
                entry.from_title,
                entry.address || '',
                entry.delivery_type,
                entry.received_by || '',
                entry.delivery_date,
                entry.tracking_no || '',
                entry.status,
                entry.note || '',
            ].some((value) => value.toLowerCase().includes(normalizedQuery)),
        );
    }, [entries, searchQuery]);

    const stats = {
        total: entries.length,
        received: entries.filter((entry) => entry.status === 'received').length,
        inProcess: entries.filter((entry) => entry.status === 'in_process').length,
        distributed: entries.filter((entry) => entry.status === 'distributed').length,
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
        'From',
        'Delivery Type',
        'Received By',
        'Delivery Date',
        'Tracking No',
        'Status',
        'Address',
        'Note',
    ];

    const exportRows = filteredEntries.map((entry) => [
        entry.reference_no || '',
        entry.from_title,
        entry.delivery_type,
        entry.received_by || '',
        entry.delivery_date,
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

    const openEditDialog = (entry: PostalDeliveryEntry) => {
        setEditingEntry(entry);
        setFormData({
            reference_no: entry.reference_no || '',
            from_title: entry.from_title,
            address: entry.address || '',
            delivery_type: entry.delivery_type,
            received_by: entry.received_by || '',
            delivery_date: entry.delivery_date,
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
            received_by: formData.received_by || null,
            tracking_no: formData.tracking_no || null,
            note: formData.note || null,
        };

        if (editingEntry) {
            router.patch(`/postal-delivery/${editingEntry.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setDialogOpen(false);
                    setEditingEntry(null);
                    setFormData(initialForm);
                },
            });

            return;
        }

        router.post('/postal-delivery', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setFormData(initialForm);
            },
        });
    };

    const handleDelete = (entry: PostalDeliveryEntry) => {
        if (!window.confirm(`Delete the postal delivery entry from ${entry.from_title}?`)) {
            return;
        }

        router.delete(`/postal-delivery/${entry.id}`, {
            preserveScroll: true,
        });
    };

    const renderStatusBadge = (status: PostalDeliveryEntry['status']) => {
        if (status === 'distributed') {
            return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{t('Distributed')}</Badge>;
        }

        if (status === 'in_process') {
            return <Badge className="bg-blue-600 text-white hover:bg-blue-600">{t('In Process')}</Badge>;
        }

        if (status === 'pending') {
            return <Badge className="bg-blue-500 text-white hover:bg-blue-500">{t('Pending')}</Badge>;
        }

        return <Badge className="bg-slate-700 text-white hover:bg-slate-700">{t('Received')}</Badge>;
    };

    return (
        <DashboardLayout user={user} activeTab="postal-delivery">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Postal Delivery')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Record incoming letters, parcels, and documents received by the front office.')}
                            </p>
                        </div>
                        <Button
                            type="button"
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            onClick={openCreateDialog}
                        >
                            <Plus className="h-4 w-4" />
                            {t('Add Delivery')}
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
                                        <p className="text-sm text-slate-500">{t('Total Delivery')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                                    </div>
                                    <div className="rounded-full bg-blue-100 p-3">
                                        <Inbox className="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Received')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.received}</p>
                                    </div>
                                    <div className="rounded-full bg-slate-100 p-3">
                                        <PackageCheck className="h-5 w-5 text-slate-700" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('In Process')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.inProcess}</p>
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
                                        <p className="text-sm text-slate-500">{t('Distributed')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.distributed}</p>
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
                            <CardTitle>{t('Delivery Register')}</CardTitle>
                            <CardDescription>
                                {t('Maintain a searchable log of incoming postal and courier deliveries.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!tableReady && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                    {t(
                                        'The `postal_delivery_entries` table is not available yet. Run `php artisan migrate` to create it before using this page.',
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
                                        placeholder={t('Search delivery records...')}
                                        className="pl-10"
                                    />
                                </div>

                                <div className="flex items-center gap-2 whitespace-nowrap">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            copyFrontOfficeRows('Postal Delivery', exportHeaders, exportRows)
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
                                                'postal_delivery',
                                                'Postal Delivery',
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
                                            exportFrontOfficePdf('Postal Delivery', exportHeaders, exportRows)
                                        }
                                    >
                                        {t('PDF')}
                                    </Button>
                                </div>
                            </div>

                            {filteredEntries.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                                    <p className="text-sm text-slate-500">{t('No delivery entries found.')}</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Reference')}</TableHead>
                                                <TableHead>{t('From')}</TableHead>
                                                <TableHead>{t('Delivery Type')}</TableHead>
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
                                                            <p>{entry.from_title}</p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {entry.received_by || t('Receiver not added')}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p>{entry.delivery_type}</p>
                                                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                                                {entry.address || t('No address added')}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <CalendarDays className="h-4 w-4 text-slate-400" />
                                                            <span>{entry.delivery_date}</span>
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
                            {editingEntry ? t('Edit Postal Delivery') : t('Create Postal Delivery')}
                        </DialogTitle>
                        <DialogDescription>{t('Record an incoming postal or courier delivery.')}</DialogDescription>
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
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="delivery_type">{t('Delivery Type')}</Label>
                                <Input
                                    id="delivery_type"
                                    value={formData.delivery_type}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            delivery_type: event.target.value,
                                        }))
                                    }
                                    placeholder={t('Circular, Parcel, Documents, Courier')}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="received_by">{t('Received By')}</Label>
                                <Input
                                    id="received_by"
                                    value={formData.received_by}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            received_by: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="delivery_date">{t('Delivery Date')}</Label>
                                <Input
                                    id="delivery_date"
                                    type="date"
                                    value={formData.delivery_date}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            delivery_date: event.target.value,
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
                                    <option value="received">{t('Received')}</option>
                                    <option value="in_process">{t('In Process')}</option>
                                    <option value="distributed">{t('Distributed')}</option>
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
                                {editingEntry ? t('Update Delivery') : t('Create Delivery')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(viewingEntry)} onOpenChange={(open) => !open && setViewingEntry(null)}>
                <DialogContent className="w-1/2 sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t('Postal Delivery Details')}</DialogTitle>
                        <DialogDescription>{t('Review the recorded incoming delivery information.')}</DialogDescription>
                    </DialogHeader>

                    {viewingEntry && (
                        <div className="space-y-4 text-sm text-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-semibold text-slate-900">{viewingEntry.from_title}</p>
                                    <p className="mt-1 text-slate-500">
                                        {viewingEntry.reference_no || t('No reference number')}
                                    </p>
                                </div>
                                {renderStatusBadge(viewingEntry.status)}
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <p className="font-medium text-slate-900">{t('Delivery Type')}</p>
                                    <p>{viewingEntry.delivery_type}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Received By')}</p>
                                    <p>{viewingEntry.received_by || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Delivery Date')}</p>
                                    <p>{viewingEntry.delivery_date}</p>
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
