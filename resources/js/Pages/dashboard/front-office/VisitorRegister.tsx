import { useLanguage } from '../../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { CalendarDays, Clock3, Edit, Eye, Phone, Plus, Search, Shield, Trash2, UserRound } from 'lucide-react';
import DashboardLayout from '../../DashboardLayout';
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

interface VisitorEntry {
    id: number;
    visitor_name: string;
    purpose: string;
    person_to_meet?: string | null;
    contact?: string | null;
    id_proof?: string | null;
    entry_date: string;
    entry_time?: string | null;
    exit_time?: string | null;
    note?: string | null;
    created_at?: string | null;
}

interface VisitorRegisterProps {
    user: any;
    entries: VisitorEntry[];
    tableReady: boolean;
}

const initialForm = {
    visitor_name: '',
    purpose: '',
    person_to_meet: '',
    contact: '',
    id_proof: '',
    entry_date: new Date().toISOString().slice(0, 10),
    entry_time: '',
    exit_time: '',
    note: '',
};

const ITEMS_PER_PAGE = 5;

export default function VisitorRegister({ user, entries, tableReady }: VisitorRegisterProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    }>();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewingEntry, setViewingEntry] = useState<VisitorEntry | null>(null);
    const [editingEntry, setEditingEntry] = useState<VisitorEntry | null>(null);
    const [formData, setFormData] = useState(initialForm);

    const filteredEntries = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        if (!normalizedQuery) {
            return entries;
        }

        return entries.filter((entry) =>
            [
                entry.visitor_name,
                entry.purpose,
                entry.person_to_meet || '',
                entry.contact || '',
                entry.id_proof || '',
                entry.entry_date,
                entry.entry_time || '',
                entry.exit_time || '',
                entry.note || '',
            ].some((value) => value.toLowerCase().includes(normalizedQuery)),
        );
    }, [entries, searchQuery]);

    const stats = {
        total: entries.length,
        today: entries.filter((entry) => entry.entry_date === new Date().toISOString().slice(0, 10)).length,
        openVisits: entries.filter((entry) => !entry.exit_time).length,
        closedVisits: entries.filter((entry) => Boolean(entry.exit_time)).length,
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
        'Visitor Name',
        'Purpose',
        'Person To Meet',
        'Contact',
        'ID Proof',
        'Entry Date',
        'Entry Time',
        'Exit Time',
        'Note',
    ];

    const exportRows = filteredEntries.map((entry) => [
        entry.visitor_name,
        entry.purpose,
        entry.person_to_meet || '',
        entry.contact || '',
        entry.id_proof || '',
        entry.entry_date,
        entry.entry_time || '',
        entry.exit_time || '',
        entry.note || '',
    ]);

    const openCreateDialog = () => {
        setEditingEntry(null);
        setFormData(initialForm);
        setDialogOpen(true);
    };

    const openEditDialog = (entry: VisitorEntry) => {
        setEditingEntry(entry);
        setFormData({
            visitor_name: entry.visitor_name,
            purpose: entry.purpose,
            person_to_meet: entry.person_to_meet || '',
            contact: entry.contact || '',
            id_proof: entry.id_proof || '',
            entry_date: entry.entry_date,
            entry_time: entry.entry_time || '',
            exit_time: entry.exit_time || '',
            note: entry.note || '',
        });
        setDialogOpen(true);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const payload = {
            ...formData,
            person_to_meet: formData.person_to_meet || null,
            contact: formData.contact || null,
            id_proof: formData.id_proof || null,
            entry_time: formData.entry_time || null,
            exit_time: formData.exit_time || null,
            note: formData.note || null,
        };

        if (editingEntry) {
            router.patch(`/visitor-register/${editingEntry.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setDialogOpen(false);
                    setEditingEntry(null);
                    setFormData(initialForm);
                },
            });

            return;
        }

        router.post('/visitor-register', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setFormData(initialForm);
            },
        });
    };

    const handleDelete = (entry: VisitorEntry) => {
        if (!window.confirm(`Delete the visitor entry for ${entry.visitor_name}?`)) {
            return;
        }

        router.delete(`/visitor-register/${entry.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <DashboardLayout user={user} activeTab="visitor-register">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Visitor Register')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Record, monitor, and update front desk visitor movements throughout the day.')}
                            </p>
                        </div>
                        <Button
                            type="button"
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            onClick={openCreateDialog}
                        >
                            <Plus className="h-4 w-4" />
                            {t('Add Visitor')}
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
                                        <p className="text-sm text-slate-500">{t('Total Visitors')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                                    </div>
                                    <div className="rounded-full bg-blue-100 p-3">
                                        <UserRound className="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Today')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.today}</p>
                                    </div>
                                    <div className="rounded-full bg-cyan-100 p-3">
                                        <CalendarDays className="h-5 w-5 text-cyan-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Inside Campus')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.openVisits}</p>
                                    </div>
                                    <div className="rounded-full bg-blue-100 p-3">
                                        <Clock3 className="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Completed Visits')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.closedVisits}</p>
                                    </div>
                                    <div className="rounded-full bg-emerald-100 p-3">
                                        <Shield className="h-5 w-5 text-emerald-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Visitor Log')}</CardTitle>
                            <CardDescription>
                                {t('Track visitors, whom they met, and whether they have checked out.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!tableReady && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                    {t(
                                        'The `visitor_register_entries` table is not available yet. Run `php artisan migrate` to create it before using this page.',
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
                                        placeholder={t('Search visitors...')}
                                        className="pl-10"
                                    />
                                </div>

                                <div className="flex items-center gap-2 whitespace-nowrap">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            copyFrontOfficeRows('Visitor Register', exportHeaders, exportRows)
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
                                                'visitor_register',
                                                'Visitor Register',
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
                                            exportFrontOfficePdf('Visitor Register', exportHeaders, exportRows)
                                        }
                                    >
                                        {t('PDF')}
                                    </Button>
                                </div>
                            </div>

                            {filteredEntries.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                                    <p className="text-sm text-slate-500">{t('No visitor entries found.')}</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Visitor')}</TableHead>
                                                <TableHead>{t('Purpose')}</TableHead>
                                                <TableHead>{t('Contact')}</TableHead>
                                                <TableHead>{t('Visit Time')}</TableHead>
                                                <TableHead className="text-right">{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedEntries.map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-slate-900">
                                                                {entry.visitor_name}
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {entry.person_to_meet || t('No meeting person added')}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p>{t(entry.purpose)}</p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {entry.id_proof || t('No ID proof noted')}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                                            <Phone className="h-4 w-4 text-slate-400" />
                                                            <span>{entry.contact || '-'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1 text-sm text-slate-600">
                                                            <div className="flex items-center gap-2">
                                                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                                                <span>{entry.entry_date}</span>
                                                            </div>
                                                            <p>
                                                                {t('In:')}
                                                                {entry.entry_time || '-'}
                                                            </p>
                                                            <p>
                                                                {t('Out:')}
                                                                {entry.exit_time || t('Still inside')}
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
                        <DialogTitle>{editingEntry ? t('Edit Visitor Entry') : t('Create Visitor Entry')}</DialogTitle>
                        <DialogDescription>{t('Record a visitor entry captured at the front desk.')}</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="visitor_name">{t('Visitor Name')}</Label>
                                <Input
                                    id="visitor_name"
                                    value={formData.visitor_name}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            visitor_name: event.target.value,
                                        }))
                                    }
                                    required
                                />
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
                                <Label htmlFor="person_to_meet">{t('Person To Meet')}</Label>
                                <Input
                                    id="person_to_meet"
                                    value={formData.person_to_meet}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            person_to_meet: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="contact">{t('Contact')}</Label>
                                <Input
                                    id="contact"
                                    value={formData.contact}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            contact: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="id_proof">{t('ID Proof')}</Label>
                                <Input
                                    id="id_proof"
                                    value={formData.id_proof}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            id_proof: event.target.value,
                                        }))
                                    }
                                    placeholder={t('Aadhaar, PAN, Visitor Pass, etc.')}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="entry_date">{t('Entry Date')}</Label>
                                <Input
                                    id="entry_date"
                                    type="date"
                                    value={formData.entry_date}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            entry_date: event.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="entry_time">{t('Entry Time')}</Label>
                                <Input
                                    id="entry_time"
                                    type="time"
                                    value={formData.entry_time}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            entry_time: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="exit_time">{t('Exit Time')}</Label>
                                <Input
                                    id="exit_time"
                                    value={formData.exit_time}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            exit_time: event.target.value,
                                        }))
                                    }
                                    placeholder={t('Optional')}
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
                                {editingEntry ? t('Update Visitor') : t('Create Visitor')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(viewingEntry)} onOpenChange={(open) => !open && setViewingEntry(null)}>
                <DialogContent className="w-1/2 sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t('Visitor Details')}</DialogTitle>
                        <DialogDescription>{t('Review the recorded information for this visitor.')}</DialogDescription>
                    </DialogHeader>

                    {viewingEntry && (
                        <div className="space-y-4 text-sm text-slate-700">
                            <div>
                                <p className="text-lg font-semibold text-slate-900">{viewingEntry.visitor_name}</p>
                                <p className="mt-1 text-slate-500">{t(viewingEntry.purpose)}</p>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <p className="font-medium text-slate-900">{t('Person To Meet')}</p>
                                    <p>{viewingEntry.person_to_meet || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Contact')}</p>
                                    <p>{viewingEntry.contact || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('ID Proof')}</p>
                                    <p>{viewingEntry.id_proof || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Entry Date')}</p>
                                    <p>{viewingEntry.entry_date}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Entry Time')}</p>
                                    <p>{viewingEntry.entry_time || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{t('Exit Time')}</p>
                                    <p>{viewingEntry.exit_time || t('Still inside')}</p>
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
