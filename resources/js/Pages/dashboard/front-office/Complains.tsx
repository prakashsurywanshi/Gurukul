import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, CalendarDays, Edit, Eye, Plus, Search, ShieldAlert, Trash2, UserRound } from 'lucide-react';
import DashboardLayout from '../../DashboardLayout';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
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

interface ComplaintEntry {
  id: number;
  complainant_name: string;
  phone?: string | null;
  source: 'walk_in' | 'phone' | 'email' | 'student' | 'parent' | 'staff' | 'other';
  category: string;
  assigned_to?: string | null;
  complaint_date: string;
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  note?: string | null;
  action_taken?: string | null;
  created_at?: string | null;
}

interface ComplainsProps {
  user: any;
  entries: ComplaintEntry[];
  tableReady: boolean;
}

const initialForm = {
  complainant_name: '',
  phone: '',
  source: 'walk_in',
  category: '',
  assigned_to: '',
  complaint_date: new Date().toISOString().slice(0, 10),
  status: 'open',
  note: '',
  action_taken: '',
};

const complaintCategories = ['Hostel', 'Transport', 'Classroom', 'Fees', 'Security', 'Academics', 'Library', 'Other'];
const ITEMS_PER_PAGE = 5;

export default function Complains({ user, entries, tableReady }: ComplainsProps) {
  const page = usePage<{ flash?: { success?: string; error?: string }; errors?: Record<string, string> }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<ComplaintEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<ComplaintEntry | null>(null);
  const [formData, setFormData] = useState(initialForm);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) =>
      [
        entry.complainant_name,
        entry.phone || '',
        entry.source,
        entry.category,
        entry.assigned_to || '',
        entry.complaint_date,
        entry.status,
        entry.note || '',
        entry.action_taken || '',
      ].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [entries, searchQuery]);

  const stats = {
    total: entries.length,
    open: entries.filter((entry) => entry.status === 'open').length,
    inReview: entries.filter((entry) => entry.status === 'in_review').length,
    resolved: entries.filter((entry) => entry.status === 'resolved' || entry.status === 'closed').length,
  };

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredEntries.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredEntries.length]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / ITEMS_PER_PAGE));
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const exportHeaders = ['Complainant Name', 'Phone', 'Source', 'Category', 'Assigned To', 'Complaint Date', 'Status', 'Complaint Note', 'Action Taken'];
  const exportRows = filteredEntries.map((entry) => [
    entry.complainant_name,
    entry.phone || '',
    entry.source.replace('_', ' '),
    entry.category,
    entry.assigned_to || '',
    entry.complaint_date,
    entry.status.replace('_', ' '),
    entry.note || '',
    entry.action_taken || '',
  ]);

  const openCreateDialog = () => {
    setEditingEntry(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (entry: ComplaintEntry) => {
    setEditingEntry(entry);
    setFormData({
      complainant_name: entry.complainant_name,
      phone: entry.phone || '',
      source: entry.source,
      category: entry.category,
      assigned_to: entry.assigned_to || '',
      complaint_date: entry.complaint_date,
      status: entry.status,
      note: entry.note || '',
      action_taken: entry.action_taken || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      ...formData,
      phone: formData.phone || null,
      assigned_to: formData.assigned_to || null,
      note: formData.note || null,
      action_taken: formData.action_taken || null,
    };

    if (editingEntry) {
      router.patch(`/complains/${editingEntry.id}`, payload, {
        preserveScroll: true,
        onSuccess: () => {
          setDialogOpen(false);
          setEditingEntry(null);
          setFormData(initialForm);
        },
      });

      return;
    }

    router.post('/complains', payload, {
      preserveScroll: true,
      onSuccess: () => {
        setDialogOpen(false);
        setFormData(initialForm);
      },
    });
  };

  const handleDelete = (entry: ComplaintEntry) => {
    if (!window.confirm(`Delete the complaint entry for ${entry.complainant_name}?`)) {
      return;
    }

    router.delete(`/complains/${entry.id}`, {
      preserveScroll: true,
    });
  };

  const renderStatusBadge = (status: ComplaintEntry['status']) => {
    if (status === 'resolved') {
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Resolved</Badge>;
    }

    if (status === 'closed') {
      return <Badge className="bg-slate-700 text-white hover:bg-slate-700">Closed</Badge>;
    }

    if (status === 'in_review') {
      return <Badge className="bg-blue-600 text-white hover:bg-blue-600">In Review</Badge>;
    }

    return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Open</Badge>;
  };

  return (
    <DashboardLayout user={user} activeTab="complains">
      <div className="min-h-full bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Complains</h1>
              <p className="mt-1 text-sm text-slate-600">
                Record, assign, and resolve complaints reported through the front office.
              </p>
            </div>
            <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Add Complaint
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
                    <p className="text-sm text-slate-500">Total Complaints</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                  </div>
                  <div className="rounded-full bg-blue-100 p-3">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Open</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.open}</p>
                  </div>
                  <div className="rounded-full bg-amber-100 p-3">
                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">In Review</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.inReview}</p>
                  </div>
                  <div className="rounded-full bg-cyan-100 p-3">
                    <UserRound className="h-5 w-5 text-cyan-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Resolved / Closed</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.resolved}</p>
                  </div>
                  <div className="rounded-full bg-emerald-100 p-3">
                    <ShieldAlert className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Complaint Register</CardTitle>
              <CardDescription>
                Maintain a searchable complaint log with assignment and resolution notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!tableReady && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  The `complaint_entries` table is not available yet. Run `php artisan migrate` to create it before using this page.
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
                    placeholder="Search complaints..."
                    className="pl-10"
                  />
                </div>

                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Button type="button" variant="outline" size="sm" onClick={() => copyFrontOfficeRows('Complains', exportHeaders, exportRows)}>
                    Copy
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => exportFrontOfficeCsv('complains', 'Complains', exportHeaders, exportRows)}>
                    CSV
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => exportFrontOfficePdf('Complains', exportHeaders, exportRows)}>
                    PDF
                  </Button>
                </div>
              </div>

              {filteredEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                  <p className="text-sm text-slate-500">No complaint entries found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Complainant</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{entry.complainant_name}</p>
                              <p className="mt-1 text-sm text-slate-500">{entry.phone || 'No phone added'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{entry.category}</p>
                              <p className="mt-1 text-sm capitalize text-slate-500">{entry.source.replace('_', ' ')}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{entry.assigned_to || 'Unassigned'}</p>
                              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{entry.action_taken || 'No action recorded'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <CalendarDays className="h-4 w-4 text-slate-400" />
                              <span>{entry.complaint_date}</span>
                            </div>
                          </TableCell>
                          <TableCell>{renderStatusBadge(entry.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" size="icon" onClick={() => setViewingEntry(entry)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="outline" size="icon" onClick={() => openEditDialog(entry)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="destructive" size="icon" onClick={() => handleDelete(entry)}>
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
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + (paginatedEntries.length > 0 ? 1 : 0)} to{' '}
                  {(currentPage - 1) * ITEMS_PER_PAGE + paginatedEntries.length} of {filteredEntries.length} records
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
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
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
                    ))}
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
            <DialogTitle>{editingEntry ? 'Edit Complaint' : 'Create Complaint'}</DialogTitle>
            <DialogDescription>
              Record a complaint raised through the front office.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="complainant_name">Complainant Name</Label>
                <Input id="complainant_name" value={formData.complainant_name} onChange={(event) => setFormData((current) => ({ ...current, complainant_name: event.target.value }))} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone} onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="source">Source</Label>
                <select
                  id="source"
                  value={formData.source}
                  onChange={(event) => setFormData((current) => ({ ...current, source: event.target.value as typeof initialForm.source }))}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="walk_in">Walk In</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                  <option value="staff">Staff</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(event) => setFormData((current) => ({ ...current, category: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                  required
                >
                  <option value="">Select category</option>
                  {formData.category && !complaintCategories.includes(formData.category) && (
                    <option value={formData.category}>{formData.category}</option>
                  )}
                  {complaintCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Input id="assigned_to" value={formData.assigned_to} onChange={(event) => setFormData((current) => ({ ...current, assigned_to: event.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="complaint_date">Complaint Date</Label>
                <Input id="complaint_date" type="date" value={formData.complaint_date} onChange={(event) => setFormData((current) => ({ ...current, complaint_date: event.target.value }))} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as typeof initialForm.status }))}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="open">Open</option>
                  <option value="in_review">In Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">Complaint Note</Label>
              <Textarea id="note" value={formData.note} onChange={(event) => setFormData((current) => ({ ...current, note: event.target.value }))} rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="action_taken">Action Taken</Label>
              <Textarea id="action_taken" value={formData.action_taken} onChange={(event) => setFormData((current) => ({ ...current, action_taken: event.target.value }))} rows={3} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                {editingEntry ? 'Update Complaint' : 'Create Complaint'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingEntry)} onOpenChange={(open) => !open && setViewingEntry(null)}>
        <DialogContent className="w-1/2 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Complaint Details</DialogTitle>
            <DialogDescription>Review the recorded complaint information.</DialogDescription>
          </DialogHeader>

          {viewingEntry && (
            <div className="space-y-4 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{viewingEntry.complainant_name}</p>
                  <p className="mt-1 text-slate-500">{viewingEntry.category}</p>
                </div>
                {renderStatusBadge(viewingEntry.status)}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="font-medium text-slate-900">Phone</p>
                  <p>{viewingEntry.phone || '-'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Source</p>
                  <p className="capitalize">{viewingEntry.source.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Assigned To</p>
                  <p>{viewingEntry.assigned_to || '-'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Complaint Date</p>
                  <p>{viewingEntry.complaint_date}</p>
                </div>
              </div>
              <div>
                <p className="font-medium text-slate-900">Complaint Note</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {viewingEntry.note || 'No complaint note added.'}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Action Taken</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {viewingEntry.action_taken || 'No action recorded.'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
