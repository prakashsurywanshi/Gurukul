import { FormEvent, useMemo } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { CalendarDays, CheckCircle2, Clock3, Send, XCircle } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';

type LeaveType = 'casual' | 'sick' | 'vacation' | 'emergency' | 'other';
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface LeaveRequest {
  id: number;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  adminRemarks?: string | null;
}

interface MyLeavesProps {
  user: any;
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

export default function MyLeaves({ user, leaveRequests }: MyLeavesProps) {
  const page = usePage<{ flash?: { success?: string; error?: string } }>();
  const { data, setData, post, processing, errors, reset } = useForm({
    leave_type: 'casual' as LeaveType,
    from_date: today,
    to_date: today,
    reason: '',
  });

  const totals = useMemo(() => {
    return (leaveRequests ?? []).reduce(
      (summary, request) => ({
        pending: summary.pending + (request.status === 'pending' ? 1 : 0),
        approved: summary.approved + (request.status === 'approved' ? 1 : 0),
        rejected: summary.rejected + (request.status === 'rejected' ? 1 : 0),
        approvedDays: summary.approvedDays + (request.status === 'approved' ? request.days : 0),
      }),
      { pending: 0, approved: 0, rejected: 0, approvedDays: 0 }
    );
  }, [leaveRequests]);

  const submitLeaveRequest = (event: FormEvent) => {
    event.preventDefault();

    post('/my-leaves', {
      preserveScroll: true,
      onSuccess: () => reset('reason'),
    });
  };

  return (
    <DashboardLayout user={user} activeTab="my-leaves">
      <div className="min-h-full bg-slate-50 p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Leaves</h1>
            <p className="mt-1 text-sm text-slate-600">Apply for leave and track your request status.</p>
          </div>

          {page.props.flash?.success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {page.props.flash.success}
            </div>
          ) : null}

          {page.props.flash?.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {page.props.flash.error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{totals.pending}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <Clock3 className="mr-2 inline h-4 w-4" />
                Awaiting approval
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Approved</CardDescription>
                <CardTitle className="text-2xl text-emerald-600">{totals.approved}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                Accepted requests
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Rejected</CardDescription>
                <CardTitle className="text-2xl text-red-600">{totals.rejected}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <XCircle className="mr-2 inline h-4 w-4" />
                Not approved
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Approved Days</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{totals.approvedDays}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <CalendarDays className="mr-2 inline h-4 w-4" />
                Total leave days
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Apply Leave</CardTitle>
                <CardDescription>Submit a new request for admin review.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitLeaveRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Leave Type</Label>
                    <Select value={data.leave_type} onValueChange={(value) => setData('leave_type', value as LeaveType)}>
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
                    {errors.leave_type ? <p className="text-sm text-red-600">{errors.leave_type}</p> : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>From Date</Label>
                      <Input type="date" value={data.from_date} onChange={(event) => setData('from_date', event.target.value)} />
                      {errors.from_date ? <p className="text-sm text-red-600">{errors.from_date}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <Label>To Date</Label>
                      <Input type="date" value={data.to_date} onChange={(event) => setData('to_date', event.target.value)} />
                      {errors.to_date ? <p className="text-sm text-red-600">{errors.to_date}</p> : null}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Duration: {calculateDays(data.from_date, data.to_date)} day(s)
                  </div>

                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Textarea
                      value={data.reason}
                      onChange={(event) => setData('reason', event.target.value)}
                      rows={5}
                      placeholder="Enter leave reason"
                    />
                    {errors.reason ? <p className="text-sm text-red-600">{errors.reason}</p> : null}
                  </div>

                  <Button type="submit" disabled={processing} className="w-full gap-2">
                    <Send className="h-4 w-4" />
                    {processing ? 'Submitting...' : 'Submit Leave Request'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Leave Requests</CardTitle>
                <CardDescription>Your submitted leave requests and approval status.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Admin Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(leaveRequests ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                            No leave requests submitted
                          </TableCell>
                        </TableRow>
                      ) : (
                        leaveRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <Badge variant="secondary">{leaveTypeLabels[request.type]}</Badge>
                              <p className="mt-1 text-xs text-slate-500">Applied {formatDisplayDate(request.appliedOn)}</p>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-900">{request.days} day(s)</div>
                              <div className="text-xs text-slate-500">
                                {formatDisplayDate(request.fromDate)} to {formatDisplayDate(request.toDate)}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-72">
                              <p className="line-clamp-2 text-sm text-slate-700">{request.reason}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusStyles[request.status]}>
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-64 text-sm text-slate-600">
                              {request.adminRemarks || 'No remarks'}
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
        </div>
      </div>
    </DashboardLayout>
  );
}
