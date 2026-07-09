import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { CalendarDays, Edit, Eye, Mail, Phone, Plus, Search, Trash2, UserRound } from 'lucide-react';
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

interface InquiryRecord {
  id: number;
  full_name: string;
  guardian_name?: string | null;
  email?: string | null;
  phone: string;
  class_interested: string;
  enquiry_date: string;
  source: 'walk_in' | 'phone' | 'email' | 'reference' | 'website' | 'other';
  notes?: string | null;
  status: 'pending' | 'follow_up' | 'closed';
  created_at?: string | null;
}

interface AdmissionEnquiryProps {
  user: any;
  inquiries: InquiryRecord[];
  tableReady: boolean;
  classOptions: Array<{
    id: number;
    label: string;
    value: string;
  }>;
}

const initialForm = {
  full_name: '',
  guardian_name: '',
  email: '',
  phone: '',
  class_interested: '',
  enquiry_date: new Date().toISOString().slice(0, 10),
  source: 'walk_in',
  notes: '',
  status: 'pending',
};

const ITEMS_PER_PAGE = 5;

export default function AdmissionEnquiry({ user, inquiries, tableReady, classOptions }: AdmissionEnquiryProps) {
  const page = usePage<{ flash?: { success?: string; error?: string }; errors?: Record<string, string> }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<InquiryRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<InquiryRecord | null>(null);
  const [formData, setFormData] = useState(initialForm);

  const filteredInquiries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return inquiries;
    }

    return inquiries.filter((inquiry) =>
      [
        inquiry.full_name,
        inquiry.guardian_name || '',
        inquiry.email,
        inquiry.phone,
        inquiry.class_interested,
        inquiry.enquiry_date,
        inquiry.source,
        inquiry.notes || '',
        inquiry.status,
      ].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [inquiries, searchQuery]);

  const stats = {
    total: inquiries.length,
    pending: inquiries.filter((inquiry) => inquiry.status === 'pending').length,
    followUp: inquiries.filter((inquiry) => inquiry.status === 'follow_up').length,
    closed: inquiries.filter((inquiry) => inquiry.status === 'closed').length,
  };

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredInquiries.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredInquiries.length]);

  const totalPages = Math.max(1, Math.ceil(filteredInquiries.length / ITEMS_PER_PAGE));
  const paginatedInquiries = filteredInquiries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const exportHeaders = ['Student Name', 'Guardian Name', 'Email', 'Phone', 'Class', 'Enquiry Date', 'Source', 'Status', 'Notes'];
  const exportRows = filteredInquiries.map((inquiry) => [
    inquiry.full_name,
    inquiry.guardian_name || '',
    inquiry.email || '',
    inquiry.phone,
    inquiry.class_interested,
    inquiry.enquiry_date,
    inquiry.source.replace('_', ' '),
    inquiry.status.replace('_', ' '),
    inquiry.notes || '',
  ]);

  const openCreateDialog = () => {
    setEditingRecord(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (record: InquiryRecord) => {
    setEditingRecord(record);
    setFormData({
      full_name: record.full_name,
      guardian_name: record.guardian_name || '',
      email: record.email || '',
      phone: record.phone,
      class_interested: record.class_interested,
      enquiry_date: record.enquiry_date,
      source: record.source,
      notes: record.notes || '',
      status: record.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      ...formData,
      guardian_name: formData.guardian_name || null,
      email: formData.email || null,
      notes: formData.notes || null,
    };

    if (editingRecord) {
      router.patch(`/admission-enquiry/${editingRecord.id}`, payload, {
        preserveScroll: true,
        onSuccess: () => {
          setDialogOpen(false);
          setEditingRecord(null);
          setFormData(initialForm);
        },
      });

      return;
    }

    router.post('/admission-enquiry', payload, {
      preserveScroll: true,
      onSuccess: () => {
        setDialogOpen(false);
        setFormData(initialForm);
      },
    });
  };

  const handleDelete = (record: InquiryRecord) => {
    if (!window.confirm(`Delete the admission enquiry for ${record.full_name}?`)) {
      return;
    }

    router.delete(`/admission-enquiry/${record.id}`, {
      preserveScroll: true,
    });
  };

  const renderStatusBadge = (status: InquiryRecord['status']) => {
    if (status === 'closed') {
      return <Badge className="bg-slate-700 text-white hover:bg-slate-700">Closed</Badge>;
    }

    if (status === 'follow_up') {
      return <Badge className="bg-blue-600 text-white hover:bg-blue-600">Follow Up</Badge>;
    }

    return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Pending</Badge>;
  };

  return (
    <DashboardLayout user={user} activeTab="admission-enquiry">
      <div className="min-h-full bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Admission Enquiry</h1>
              <p className="mt-1 text-sm text-slate-600">
                Capture manual front office admission enquiries separately from online admissions and enrollments.
              </p>
            </div>
            <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Add Enquiry
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
                    <p className="text-sm text-slate-500">Total Enquiries</p>
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
                    <p className="text-sm text-slate-500">Pending</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.pending}</p>
                  </div>
                  <div className="rounded-full bg-amber-100 p-3">
                    <UserRound className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Follow Up</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.followUp}</p>
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
                    <p className="text-sm text-slate-500">Closed</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.closed}</p>
                  </div>
                  <div className="rounded-full bg-emerald-100 p-3">
                    <UserRound className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enquiry Register</CardTitle>
              <CardDescription>
                Track manual walk-ins, calls, references, and other front office enquiries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!tableReady && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  The `front_office_admission_enquiries` table is not available yet. Run `php artisan migrate` to create it before using this page.
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
                    placeholder="Search enquiries..."
                    className="pl-10"
                  />
                </div>

                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Button type="button" variant="outline" size="sm" onClick={() => copyFrontOfficeRows('Admission Enquiry', exportHeaders, exportRows)}>
                    Copy
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => exportFrontOfficeCsv('admission_enquiry', 'Admission Enquiry', exportHeaders, exportRows)}>
                    CSV
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => exportFrontOfficePdf('Admission Enquiry', exportHeaders, exportRows)}>
                    PDF
                  </Button>
                </div>
              </div>

              {filteredInquiries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                  <p className="text-sm text-slate-500">No admission enquiries found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Enquiry</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Enquiry Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedInquiries.map((inquiry) => (
                        <TableRow key={inquiry.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{inquiry.full_name}</p>
                              <p className="mt-1 text-sm text-slate-500">{inquiry.guardian_name || 'Guardian not added'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {inquiry.email && (
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                  <Mail className="h-4 w-4 text-slate-400" />
                                  <span>{inquiry.email}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <Phone className="h-4 w-4 text-slate-400" />
                                <span>{inquiry.phone}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p>{inquiry.class_interested}</p>
                              <p className="text-sm capitalize text-slate-500">{inquiry.source.replace('_', ' ')}</p>
                            </div>
                          </TableCell>
                          <TableCell>{renderStatusBadge(inquiry.status)}</TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                <span>{inquiry.enquiry_date}</span>
                              </div>
                              <p>Added: {inquiry.created_at || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" size="icon" onClick={() => setViewingRecord(inquiry)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="outline" size="icon" onClick={() => openEditDialog(inquiry)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="destructive" size="icon" onClick={() => handleDelete(inquiry)}>
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
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + (paginatedInquiries.length > 0 ? 1 : 0)} to{' '}
                  {(currentPage - 1) * ITEMS_PER_PAGE + paginatedInquiries.length} of {filteredInquiries.length} records
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
            <DialogTitle>{editingRecord ? 'Edit Admission Enquiry' : 'Create Admission Enquiry'}</DialogTitle>
            <DialogDescription>
              Save a manual admission enquiry captured by the front office team.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" value={formData.full_name} onChange={(event) => setFormData((current) => ({ ...current, full_name: event.target.value }))} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardian_name">Guardian Name</Label>
                <Input id="guardian_name" value={formData.guardian_name} onChange={(event) => setFormData((current) => ({ ...current, guardian_name: event.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone} onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="class_interested">Class Interested</Label>
                <select
                  id="class_interested"
                  value={formData.class_interested}
                  onChange={(event) => setFormData((current) => ({ ...current, class_interested: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                  required
                >
                  <option value="">Select class</option>
                  {classOptions.map((classOption) => (
                    <option key={classOption.id} value={classOption.value}>
                      {classOption.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enquiry_date">Enquiry Date</Label>
                <Input id="enquiry_date" type="date" value={formData.enquiry_date} onChange={(event) => setFormData((current) => ({ ...current, enquiry_date: event.target.value }))} required />
              </div>

              <div className="space-y-2">
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
                  <option value="reference">Reference</option>
                  <option value="website">Website</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as typeof initialForm.status }))}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={formData.notes} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} rows={4} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                {editingRecord ? 'Update Enquiry' : 'Create Enquiry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingRecord)} onOpenChange={(open) => !open && setViewingRecord(null)}>
        <DialogContent className="w-1/2 sm:max-w-[50vw]">
          <DialogHeader>
            <DialogTitle>Admission Enquiry Details</DialogTitle>
            <DialogDescription>Review the captured details for this enquiry.</DialogDescription>
          </DialogHeader>

          {viewingRecord && (
            <div className="space-y-4 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-900">{viewingRecord.full_name}</p>
                {renderStatusBadge(viewingRecord.status)}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="font-medium text-slate-900">Guardian Name</p>
                  <p>{viewingRecord.guardian_name || '-'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Email</p>
                  <p>{viewingRecord.email || '-'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Phone</p>
                  <p>{viewingRecord.phone}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Class Interested</p>
                  <p>{viewingRecord.class_interested}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Enquiry Date</p>
                  <p>{viewingRecord.enquiry_date}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Source</p>
                  <p className="capitalize">{viewingRecord.source.replace('_', ' ')}</p>
                </div>
              </div>
              <div>
                <p className="font-medium text-slate-900">Notes</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {viewingRecord.notes || 'No notes added.'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
