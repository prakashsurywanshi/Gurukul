import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { CalendarCheck, Clock3, Save, Search, UserCheck, UserX, Users } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { toast } from 'sonner';

type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent';

interface StaffRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

interface StaffDailyAttendanceProps {
  user: any;
  staffRecords: StaffRecord[];
  staffAttendanceRecords: {
    staff_id: number;
    date: string;
    status: AttendanceStatus;
  }[];
}

const today = new Date().toISOString().slice(0, 10);

const formatDisplayDate = (value: string) => {
  const [year, month, day] = value.split('-');

  return day && month && year ? `${day}-${month}-${year}` : value;
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half Day',
  absent: 'Absent',
};

const statusStyles: Record<AttendanceStatus, string> = {
  present: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  late: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
  half_day: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
  absent: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
};

const selectedStatusStyles: Record<AttendanceStatus, string> = {
  present: '!border-emerald-700 !bg-none !bg-emerald-600 !text-white shadow-sm ring-2 ring-emerald-200 hover:!bg-emerald-700 hover:!text-white',
  late: '!border-amber-700 !bg-none !bg-amber-600 !text-white shadow-sm ring-2 ring-amber-200 hover:!bg-amber-700 hover:!text-white',
  half_day: '!border-blue-700 !bg-none !bg-blue-600 !text-white shadow-sm ring-2 ring-blue-200 hover:!bg-blue-700 hover:!text-white',
  absent: '!border-red-700 !bg-none !bg-red-600 !text-white shadow-sm ring-2 ring-red-200 hover:!bg-red-700 hover:!text-white',
};

const buildAttendanceByDate = (
  records: StaffDailyAttendanceProps['staffAttendanceRecords'],
  defaultDate: string,
  defaultAttendance: Record<number, AttendanceStatus>
) => {
  const grouped: Record<string, Record<number, AttendanceStatus>> = {
    [defaultDate]: defaultAttendance,
  };

  (records ?? []).forEach((record) => {
    grouped[record.date] = {
      ...(grouped[record.date] ?? {}),
      [record.staff_id]: record.status,
    };
  });

  return grouped;
};

export default function StaffDailyAttendance({ user, staffRecords, staffAttendanceRecords }: StaffDailyAttendanceProps) {
  const flash = (usePage().props as any).flash ?? {};
  const activeStaff = useMemo(
    () => (staffRecords ?? []).filter((staff) => staff.status === 'active'),
    [staffRecords]
  );
  const defaultAttendance = useMemo(
    () => Object.fromEntries(activeStaff.map((staff) => [staff.id, 'present' as AttendanceStatus])),
    [activeStaff]
  );
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceByDate, setAttendanceByDate] = useState<Record<string, Record<number, AttendanceStatus>>>(() =>
    buildAttendanceByDate(staffAttendanceRecords, today, defaultAttendance)
  );
  const [savedDates, setSavedDates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((staffAttendanceRecords ?? []).map((record) => [record.date, true]))
  );
  const [saving, setSaving] = useState(false);

  const currentAttendance = attendanceByDate[attendanceDate] ?? defaultAttendance;

  useEffect(() => {
    setAttendanceByDate(buildAttendanceByDate(staffAttendanceRecords, today, defaultAttendance));
    setSavedDates(Object.fromEntries((staffAttendanceRecords ?? []).map((record) => [record.date, true])));
  }, [defaultAttendance, staffAttendanceRecords]);

  useEffect(() => {
    if (flash.success) {
      toast.success(flash.success);
    }

    if (flash.error) {
      toast.error(flash.error);
    }
  }, [flash.error, flash.success]);

  const filteredStaff = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return activeStaff;
    }

    return activeStaff.filter((staff) =>
      [staff.name, staff.email, staff.role].some((value) => value.toLowerCase().includes(query))
    );
  }, [activeStaff, searchQuery]);

  const counts = useMemo(() => {
    const values = activeStaff.map((staff) => currentAttendance[staff.id] ?? 'present');

    return {
      total: activeStaff.length,
      present: values.filter((status) => status === 'present').length,
      late: values.filter((status) => status === 'late').length,
      halfDay: values.filter((status) => status === 'half_day').length,
      absent: values.filter((status) => status === 'absent').length,
    };
  }, [activeStaff, currentAttendance]);

  const updateStatus = (staffId: number, status: AttendanceStatus) => {
    setAttendanceByDate((current) => ({
      ...current,
      [attendanceDate]: {
        ...(current[attendanceDate] ?? defaultAttendance),
        [staffId]: status,
      },
    }));
    setSavedDates((current) => ({
      ...current,
      [attendanceDate]: false,
    }));
  };

  const markAll = (status: AttendanceStatus) => {
    setAttendanceByDate((current) => ({
      ...current,
      [attendanceDate]: Object.fromEntries(activeStaff.map((staff) => [staff.id, status])),
    }));
    setSavedDates((current) => ({
      ...current,
      [attendanceDate]: false,
    }));
  };

  const handleSaveAttendance = () => {
    if (activeStaff.length === 0) {
      toast.error('No active staff found to save attendance.');
      return;
    }

    setSaving(true);
    router.post(
      '/staff/daily-attendance',
      {
        date: attendanceDate,
        entries: activeStaff.map((staff) => ({
          staff_id: staff.id,
          status: currentAttendance[staff.id] ?? 'present',
        })),
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setSavedDates((current) => ({
            ...current,
            [attendanceDate]: true,
          }));
        },
        onError: () => toast.error('Failed to save staff attendance.'),
        onFinish: () => setSaving(false),
      }
    );
  };

  return (
    <DashboardLayout user={user} activeTab="staff-daily-attendance">
      <div className="min-h-full bg-slate-50 p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Staff Attendance</h1>
              <p className="mt-1 text-sm text-slate-600">Mark and review daily attendance for active staff members.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Staff</CardDescription>
                <CardTitle className="text-2xl">{counts.total}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <Users className="mr-2 inline h-4 w-4" />
                Active staff
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Present</CardDescription>
                <CardTitle className="text-2xl text-emerald-600">{counts.present}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <UserCheck className="mr-2 inline h-4 w-4" />
                On time
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Late</CardDescription>
                <CardTitle className="text-2xl text-amber-600">{counts.late}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <Clock3 className="mr-2 inline h-4 w-4" />
                Delayed
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Half Day</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{counts.halfDay}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">Partial attendance</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Absent</CardDescription>
                <CardTitle className="text-2xl text-red-600">{counts.absent}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <UserX className="mr-2 inline h-4 w-4" />
                Not available
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 overflow-x-auto">
                <div className="shrink-0">
                  <CardTitle>Daily Register</CardTitle>
                  <CardDescription>
                    Attendance for {formatDisplayDate(attendanceDate)}
                    {savedDates[attendanceDate] ? ' - Saved' : ' - Unsaved'}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {(Object.keys(statusLabels) as AttendanceStatus[]).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => markAll(status)}
                      className={statusStyles[status]}
                    >
                      Mark All {statusLabels[status]}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="relative min-w-72 flex-1">
                  <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search staff..."
                    className="h-11 !pl-14"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm">
                    <CalendarCheck className="h-4 w-4 text-slate-500" />
                    <Input
                      type="date"
                      value={attendanceDate}
                      onChange={(event) => setAttendanceDate(event.target.value)}
                      className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <Button onClick={handleSaveAttendance} disabled={saving} className="h-11 shrink-0 gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Attendance'}
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="min-w-[430px]">Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                          No active staff found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStaff.map((staff) => {
                        const status = currentAttendance[staff.id] ?? 'present';

                        return (
                          <TableRow key={staff.id}>
                            <TableCell className="font-medium text-slate-900">{staff.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{staff.role.replace(/_/g, ' ')}</Badge>
                            </TableCell>
                            <TableCell className="text-slate-600">{staff.email}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 overflow-x-auto">
                                {(Object.keys(statusLabels) as AttendanceStatus[]).map((value) => (
                                  <Button
                                    key={value}
                                    type="button"
                                    variant={status === value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => updateStatus(staff.id, value)}
                                    className={`shrink-0 ${status === value ? selectedStatusStyles[value] : statusStyles[value]}`}
                                  >
                                    {statusLabels[value]}
                                  </Button>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
