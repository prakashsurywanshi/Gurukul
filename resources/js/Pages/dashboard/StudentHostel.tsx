import React, { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, BedDouble, CalendarDays, ClipboardPenLine, IndianRupee, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

type StudentRecord = {
  id: string;
  name: string;
  admissionNo?: string | null;
  phone?: string | null;
  class?: string | null;
  section?: string | null;
  rollNumber?: string | null;
};

type HostelAllocation = {
  id: string;
  hostelName?: string | null;
  hostelType?: string | null;
  hostelAddress?: string | null;
  hostelStatus?: string | null;
  wardenName?: string | null;
  wardenPhone?: string | null;
  roomNumber?: string | null;
  roomType?: string | null;
  roomFloor?: string | null;
  roomCapacity?: number | null;
  roomStatus?: string | null;
  bedNumber?: string | null;
  bedStatus?: string | null;
  allocationDate?: string | null;
  status?: string | null;
  remarks?: string | null;
};

type HostelFee = {
  id: string;
  feeType: string;
  amount: number;
  netAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  dueDate?: string | null;
};

type HostelComplaint = {
  id: string;
  complaintDate?: string | null;
  status: string;
  note?: string | null;
  actionTaken?: string | null;
  assignedTo?: string | null;
  createdAt?: string | null;
};

interface StudentHostelProps {
  user: any;
  student: StudentRecord;
  allocation?: HostelAllocation | null;
  hostelFees: HostelFee[];
  hostelComplaints: HostelComplaint[];
}

const formatStatus = (status?: string | null) =>
  status
    ? status
        .replace(/_/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '-';

const formatCurrency = (amount?: number) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusBadge = (status: string) => {
  if (status === 'resolved') {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Resolved</Badge>;
  }

  if (status === 'closed') {
    return <Badge className="bg-slate-700 text-white hover:bg-slate-700">Closed</Badge>;
  }

  if (status === 'in_review') {
    return <Badge className="bg-blue-600 text-white hover:bg-blue-600">In Review</Badge>;
  }

  return <Badge className="bg-blue-500 text-white hover:bg-blue-500">Open</Badge>;
};

export default function StudentHostel({ user, student, allocation, hostelFees, hostelComplaints }: StudentHostelProps) {
  const page = usePage<{ flash?: { success?: string; error?: string }; errors?: Record<string, string> }>();
  const [complaintForm, setComplaintForm] = useState({
    phone: student.phone || '',
    complaint_date: new Date().toISOString().slice(0, 10),
    note: '',
  });

  useEffect(() => {
    if (page.props.flash?.success) {
      toast.success(page.props.flash.success);
    }

    if (page.props.flash?.error) {
      toast.error(page.props.flash.error);
    }
  }, [page.props.flash?.error, page.props.flash?.success]);

  const feeSummary = useMemo(
    () => ({
      total: hostelFees.reduce((sum, fee) => sum + Number(fee.netAmount || 0), 0),
      paid: hostelFees.reduce((sum, fee) => sum + Number(fee.paidAmount || 0), 0),
      balance: hostelFees.reduce((sum, fee) => sum + Number(fee.balance || 0), 0),
    }),
    [hostelFees]
  );

  const submitComplaint = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    router.post('/complains', {
      phone: complaintForm.phone || null,
      category: 'Hostel',
      complaint_date: complaintForm.complaint_date,
      note: complaintForm.note.trim(),
      return_to: 'student-hostel',
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setComplaintForm((current) => ({ ...current, note: '' }));
      },
    });
  };

  return (
    <DashboardLayout user={user} activeTab="my-hostel">
      <div className="space-y-6 bg-slate-50/80 p-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Hostel</h1>
          <p className="mt-1 text-sm text-slate-600">View your hostel assignment, hostel fees, and raise hostel complaints.</p>
        </div>

        {Object.keys(page.props.errors || {}).length > 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {Object.values(page.props.errors || {})[0]}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{student.name}</p>
              <p className="text-sm text-slate-500">{student.admissionNo || 'No admission no.'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Class</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {student.class ? `${student.class}` : 'N/A'}{student.section ? ` - ${student.section}` : ''}
              </p>
              <p className="text-sm text-slate-500">Roll No: {student.rollNumber || '-'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Hostel</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{allocation?.hostelName || 'Not assigned'}</p>
              <p className="text-sm capitalize text-slate-500">{allocation?.hostelType || '-'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pending Hostel Fee</p>
              <p className="mt-2 text-xl font-bold text-blue-700">{formatCurrency(feeSummary.balance)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-blue-600" />
                  Hostel Assignment
                </CardTitle>
                <CardDescription>Your active hostel, room, and bed details.</CardDescription>
              </CardHeader>
              <CardContent>
                {allocation ? (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Assigned Hostel</p>
                      <p className="mt-2 text-2xl font-bold text-blue-950">{allocation.hostelName || '-'}</p>
                      <p className="mt-1 text-sm capitalize text-blue-800">
                        {allocation.hostelType || 'Hostel'} hostel
                        {allocation.allocationDate ? ` - Assigned on ${allocation.allocationDate}` : ''}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
                          <MapPin className="h-4 w-4" />
                          Room
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{allocation.roomNumber || '-'}</p>
                        <p className="text-sm capitalize text-slate-600">
                          {allocation.roomType || '-'} room{allocation.roomFloor ? ` - Floor ${allocation.roomFloor}` : ''}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">Capacity: {allocation.roomCapacity || '-'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
                          <BedDouble className="h-4 w-4" />
                          Bed
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{allocation.bedNumber || '-'}</p>
                        <p className="text-sm text-slate-600">{formatStatus(allocation.bedStatus || allocation.status)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
                          <UserRound className="h-4 w-4" />
                          Warden
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{allocation.wardenName || '-'}</p>
                        <p className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Phone className="h-4 w-4" />
                          {allocation.wardenPhone || 'No phone added'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
                          <ShieldCheck className="h-4 w-4" />
                          Hostel Address
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{allocation.hostelAddress || '-'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                    <BedDouble className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-4 text-sm font-medium text-slate-900">No hostel is assigned yet.</p>
                    <p className="mt-1 text-sm text-slate-500">Your hostel, room, and bed details will appear here after assignment.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-emerald-600" />
                  Hostel Fees
                </CardTitle>
                <CardDescription>Your hostel fee demand, payment, and balance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{formatCurrency(feeSummary.total)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Paid</p>
                    <p className="mt-2 text-lg font-bold text-emerald-800">{formatCurrency(feeSummary.paid)}</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Balance</p>
                    <p className="mt-2 text-lg font-bold text-blue-800">{formatCurrency(feeSummary.balance)}</p>
                  </div>
                </div>

                {hostelFees.length > 0 ? (
                  <div className="space-y-3">
                    {hostelFees.map((fee) => (
                      <div key={fee.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{fee.feeType}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                              <CalendarDays className="h-4 w-4" />
                              Due {fee.dueDate || '-'}
                            </p>
                          </div>
                          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {formatStatus(fee.status)}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                          <div>
                            <p className="text-slate-500">Amount</p>
                            <p className="font-semibold text-slate-900">{formatCurrency(fee.netAmount)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Paid</p>
                            <p className="font-semibold text-emerald-700">{formatCurrency(fee.paidAmount)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Balance</p>
                            <p className="font-semibold text-blue-700">{formatCurrency(fee.balance)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                    <IndianRupee className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-4 text-sm font-medium text-slate-900">No hostel fee records found.</p>
                    <p className="mt-1 text-sm text-slate-500">Hostel fee details will appear here once generated.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardPenLine className="h-5 w-5 text-blue-600" />
                  Create Hostel Complaint
                </CardTitle>
                <CardDescription>Share a hostel issue with the school team.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitComplaint} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={complaintForm.phone}
                      onChange={(event) => setComplaintForm((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="Contact number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complaint_date">Complaint Date</Label>
                    <Input
                      id="complaint_date"
                      type="date"
                      value={complaintForm.complaint_date}
                      onChange={(event) => setComplaintForm((current) => ({ ...current, complaint_date: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note">Complaint Details</Label>
                    <Textarea
                      id="note"
                      value={complaintForm.note}
                      onChange={(event) => setComplaintForm((current) => ({ ...current, note: event.target.value }))}
                      placeholder="Describe your hostel complaint"
                      rows={5}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700">
                    <ClipboardPenLine className="h-4 w-4" />
                    Submit Hostel Complaint
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>My Hostel Complaints</CardTitle>
                <CardDescription>Track hostel complaints you have submitted.</CardDescription>
              </CardHeader>
              <CardContent>
                {hostelComplaints.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <AlertTriangle className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">No hostel complaints submitted yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hostelComplaints.map((complaint) => (
                      <div key={complaint.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{complaint.complaintDate || '-'}</p>
                            <p className="mt-1 text-sm text-slate-500">Assigned to {complaint.assignedTo || 'pending'}</p>
                          </div>
                          {statusBadge(complaint.status)}
                        </div>
                        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                          {complaint.note || '-'}
                        </p>
                        {complaint.actionTaken && (
                          <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
                            {complaint.actionTaken}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
