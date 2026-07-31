import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  CalendarDays,
  CalendarX,
  CheckCircle2,
  Clock3,
  Edit,
  Plus,
  Search,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

type LeaveType = 'casual' | 'sick' | 'vacation' | 'emergency' | 'other';
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface StaffRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

interface LeaveRequest {
  id: number;
  staffId: number;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
}

interface StaffLeaveManagementProps {
  user: any;
  staffRecords: StaffRecord[];
  leaveRequests: LeaveRequest[];
}

const today = new Date().toISOString().slice(0, 10);

const leaveTypeLabels: Record<LeaveType, string> = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  vacation: 'Vacation Leave',
  emergency: 'Emergency Leave',
  other: 'Other Leave',
};

const statusStyles: Record<LeaveStatus, string> = {
  pending: 'border-blue-200 bg-blue-50 text-blue-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  cancelled: 'border-slate-200 bg-slate-50 text-slate-600',
};

const defaultForm = {
  staffId: '',
  type: 'casual' as LeaveType,
  fromDate: today,
  toDate: today,
  reason: '',
};

const pageSizeOptions = [10, 25, 50];

const formatRole = (role: string) => role.replace(/_/g, ' ');

const formatDisplayDate = (value: string) => {
  const [year, month, day] = value.split('-');

  return day && month && year ? `${day}-${month}-${year}` : value;
};

const calculateDays = (fromDate: string, toDate: string) => {
  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);
  const diff = end.getTime() - start.getTime();

  if (Number.isNaN(diff) || diff < 0) {
    return 0;
  }

  return Math.floor(diff / 86400000) + 1;
};

export default function StaffLeaveManagement({ user, staffRecords, leaveRequests }: StaffLeaveManagementProps) {
  const flash = (usePage().props as any).flash ?? {};
  const activeStaff = useMemo(
    () => (staffRecords ?? []).filter((staff) => staff.status === 'active'),
    [staffRecords]
  );
  const staffById = useMemo(
    () => new Map(activeStaff.map((staff) => [staff.id, staff])),
    [activeStaff]
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formData, setFormData] = useState(defaultForm);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (flash.success) {
      toast.success(flash.success);
    }

    if (flash.error) {
      toast.error(flash.error);
    }
  }, [flash.error, flash.success]);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return leaveRequests.filter((request) => {
      const staff = staffById.get(request.staffId);
      const matchesSearch =
        !query ||
        [staff?.name, staff?.email, staff?.role, request.reason]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesType = typeFilter === 'all' || request.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [leaveRequests, searchQuery, staffById, statusFilter, typeFilter]);

  const totals = useMemo(() => {
    return leaveRequests.reduce(
      (summary, request) => ({
        pending: summary.pending + (request.status === 'pending' ? 1 : 0),
        approved: summary.approved + (request.status === 'approved' ? 1 : 0),
        rejected: summary.rejected + (request.status === 'rejected' ? 1 : 0),
        approvedDays: summary.approvedDays + (request.status === 'approved' ? request.days : 0),
      }),
      { pending: 0, approved: 0, rejected: 0, approvedDays: 0 }
    );
  }, [leaveRequests]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredRequests.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredRequests, pageSize]);
  const paginationStart = filteredRequests.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const paginationEnd = Math.min(currentPage * pageSize, filteredRequests.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const resetForm = () => {
    setFormData(defaultForm);
  };

  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    setEditingRequest(null);
    resetForm();
  };

  const openCreateDialog = () => {
    setEditingRequest(null);
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (request: LeaveRequest) => {
    setEditingRequest(request);
    setFormData({
      staffId: String(request.staffId),
      type: request.type,
      fromDate: request.fromDate,
      toDate: request.toDate,
      reason: request.reason,
    });
    setShowCreateDialog(true);
  };

  const saveLeaveRequest = () => {
    const days = calculateDays(formData.fromDate, formData.toDate);

    if (!formData.staffId || !formData.reason.trim()) {
      toast.error('Select staff and enter a leave reason.');
      return;
    }

    if (days <= 0) {
      toast.error('To date must be after or equal to from date.');
      return;
    }

    setProcessing(true);
    const payload = {
      staff_id: Number(formData.staffId),
      leave_type: formData.type,
      from_date: formData.fromDate,
      to_date: formData.toDate,
      reason: formData.reason.trim(),
    };
    const options = {
      preserveScroll: true,
      onSuccess: closeCreateDialog,
      onError: () => toast.error(editingRequest ? 'Failed to update leave request.' : 'Failed to create leave request.'),
      onFinish: () => setProcessing(false),
    };

    if (editingRequest) {
      router.patch(`/staff/leave-management/${editingRequest.id}`, payload, options);
      return;
    }

    router.post('/staff/leave-management', payload, options);
  };

  const updateLeaveStatus = (requestId: number, status: LeaveStatus) => {
    setProcessing(true);
    router.patch(
      `/staff/leave-management/${requestId}/status`,
      { status },
      {
        preserveScroll: true,
        onError: () => toast.error('Failed to update leave request status.'),
        onFinish: () => setProcessing(false),
      }
    );
  };

  const deleteLeaveRequest = (request: LeaveRequest) => {
    if (!window.confirm(`Delete leave request for ${staffById.get(request.staffId)?.name ?? 'this staff member'}?`)) {
      return;
    }

    setProcessing(true);
    router.delete(`/staff/leave-management/${request.id}`, {
      preserveScroll: true,
      onError: () => toast.error('Failed to delete leave request.'),
      onFinish: () => setProcessing(false),
    });
  };

  return (
    <DashboardLayout user={user} activeTab="leave-management">
      <div className="min-h-full bg-slate-50 p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Leave Management</h1>
              <p className="mt-1 text-sm text-slate-600">Track staff leave requests and approvals.</p>
            </div>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Leave Request
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Staff</CardDescription>
                <CardTitle className="text-2xl">{activeStaff.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <Users className="mr-2 inline h-4 w-4" />
                Eligible staff
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{totals.pending}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <Clock3 className="mr-2 inline h-4 w-4" />
                Awaiting action
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Approved</CardDescription>
                <CardTitle className="text-2xl text-emerald-600">{totals.approved}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                Requests
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Rejected</CardDescription>
                <CardTitle className="text-2xl text-red-600">{totals.rejected}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <XCircle className="mr-2 inline h-4 w-4" />
                Requests
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Approved Days</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{totals.approvedDays}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <CalendarDays className="mr-2 inline h-4 w-4" />
                This workspace
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 overflow-x-auto">
                <div className="shrink-0">
                  <CardTitle>Leave Requests</CardTitle>
                  <CardDescription>Review and update staff leave approvals.</CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="relative w-72">
                    <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search staff or reason..."
                      className="h-10 !pl-14"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {(Object.keys(leaveTypeLabels) as LeaveType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {leaveTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                          No leave requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRequests.map((request) => {
                        const staff = staffById.get(request.staffId);

                        return (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="font-medium text-slate-900">{staff?.name ?? 'Unknown Staff'}</div>
                              <div className="text-xs text-slate-500">{staff?.email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{leaveTypeLabels[request.type]}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-900">{request.days} day(s)</div>
                              <div className="text-xs text-slate-500">
                                {formatDisplayDate(request.fromDate)} to {formatDisplayDate(request.toDate)}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-64">
                              <p className="line-clamp-2 text-sm text-slate-700">{request.reason}</p>
                              <p className="mt-1 text-xs text-slate-500">Applied {formatDisplayDate(request.appliedOn)}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusStyles[request.status]}>
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  disabled={processing}
                                  onClick={() => openEditDialog(request)}
                                  className="h-8 w-8"
                                  title="Edit leave request"
                                  aria-label="Edit leave request"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={processing || request.status === 'approved'}
                                  onClick={() => updateLeaveStatus(request.id, 'approved')}
                                  className="border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:text-emerald-800"
                                >
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={processing || request.status === 'rejected'}
                                  onClick={() => updateLeaveStatus(request.id, 'rejected')}
                                  className="border-red-200 text-red-700 hover:border-red-300 hover:text-red-800"
                                >
                                  Reject
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  disabled={processing}
                                  onClick={() => deleteLeaveRequest(request)}
                                  className="h-8 w-8 border-red-200 text-red-700 hover:border-red-300 hover:text-red-800"
                                  title="Delete leave request"
                                  aria-label="Delete leave request"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  Showing {paginationStart}-{paginationEnd} of {filteredRequests.length} leave requests
                </div>
                <div className="flex items-center gap-3">
                  <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="h-9 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      Previous
                    </Button>
                    <span className="min-w-20 text-center text-sm text-slate-600">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={(open) => (open ? setShowCreateDialog(true) : closeCreateDialog())}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRequest ? 'Edit Leave Request' : 'Add Leave Request'}</DialogTitle>
              <DialogDescription>
                {editingRequest ? 'Update staff leave request details.' : 'Create a staff leave request for approval tracking.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Staff</Label>
                <Select
                  value={formData.staffId}
                  onValueChange={(value) => setFormData((current) => ({ ...current, staffId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeStaff.map((staff) => (
                      <SelectItem key={staff.id} value={String(staff.id)}>
                        {staff.name} - {formatRole(staff.role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData((current) => ({ ...current, type: value as LeaveType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(leaveTypeLabels) as LeaveType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {leaveTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={formData.fromDate}
                  onChange={(event) => setFormData((current) => ({ ...current, fromDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={formData.toDate}
                  onChange={(event) => setFormData((current) => ({ ...current, toDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Reason</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(event) => setFormData((current) => ({ ...current, reason: event.target.value }))}
                  rows={4}
                  placeholder="Enter leave reason"
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <CalendarX className="h-4 w-4 text-slate-500" />
                  Duration: {calculateDays(formData.fromDate, formData.toDate)} day(s)
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog}>
                Cancel
              </Button>
              <Button type="button" onClick={saveLeaveRequest} disabled={processing}>
                {processing ? 'Saving...' : editingRequest ? 'Update Request' : 'Save Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
