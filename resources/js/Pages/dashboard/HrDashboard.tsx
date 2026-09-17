import { useMemo } from 'react';
import {
    Activity,
    BadgeIndianRupee,
    Cake,
    CalendarCheck,
    CalendarClock,
    HandCoins,
    HeartHandshake,
    IndianRupee,
    LayoutDashboard,
    UserCog,
    Users,
} from 'lucide-react';
import { Link } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface DepartmentRow {
    name: string;
    count: number;
}

interface BirthdayRow {
    name: string;
    birthday: string;
    department: string | null;
}

interface ActivityRow {
    id: number;
    description: string;
    user: string | null;
    created_at: string;
}

interface LeaveRequestRow {
    id: number;
    name: string | null;
    leave_type: string;
    from_date: string | null;
    to_date: string | null;
    days: number;
}

interface HrDashboardProps {
    user: any;
    staff: {
        total: number;
        active: number;
        onLeaveToday: number;
        pendingLeaves: number;
        activeLoans: number;
        outstandingLoans: number;
        unpaidPayslips: number;
        unpaidPayrollValue: number;
        attendanceMarkedToday: number;
    };
    departmentBreakdown: DepartmentRow[];
    upcomingBirthdays: BirthdayRow[];
    recentActivity: ActivityRow[];
    pendingLeaveRequests: LeaveRequestRow[];
}

export default function HrDashboard(pageProps: HrDashboardProps) {
    const { t } = useLanguage();
    const { user, staff, departmentBreakdown, upcomingBirthdays, recentActivity, pendingLeaveRequests } = pageProps;

    const maxDept = useMemo(
        () => Math.max(1, ...departmentBreakdown.map((entry) => entry.count)),
        [departmentBreakdown],
    );

    const quickLinks: { href: string; label: string; icon: typeof Users }[] = [
        { href: '/staff', label: 'Staff Management', icon: UserCog },
        { href: '/staff/daily-attendance', label: 'Staff Attendance', icon: CalendarCheck },
        { href: '/staff/leave-management', label: 'Leave Management', icon: CalendarClock },
        { href: '/staff/loans', label: 'Staff Loans', icon: HandCoins },
        { href: '/staff/payroll-management', label: 'Payroll', icon: IndianRupee },
    ];

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        <LayoutDashboard className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />{t('HR Dashboard')}</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Staff overview, leave, payroll and people insights at a glance.')}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Total Staff')}</p>
                            <p className="text-2xl font-bold">{staff.total}</p>
                            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{staff.active} active</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Pending Leaves')}</p>
                            <p className="text-2xl font-bold text-amber-600">{staff.pendingLeaves}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('On Leave Today')}</p>
                            <p className="text-2xl font-bold text-sky-600">{staff.onLeaveToday}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Active Loans')}</p>
                            <p className="text-2xl font-bold">{staff.activeLoans}</p>
                            <p className="mt-1 text-xs text-gray-400">
                                ₹{staff.outstandingLoans.toLocaleString('en-IN')} outstanding
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Attendance Today')}</p>
                            <p className="text-2xl font-bold text-indigo-600">{staff.attendanceMarkedToday}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Unpaid Payslips')}</p>
                            <p className="text-2xl font-bold text-rose-600">{staff.unpaidPayslips}</p>
                            <p className="mt-1 text-xs text-gray-400">
                                ₹{staff.unpaidPayrollValue.toLocaleString('en-IN')}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-indigo-500" />{t('Staff by Department')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {departmentBreakdown.length === 0 && (
                                <p className="py-8 text-center text-sm text-gray-400">{t('No department assignments yet.')}</p>
                            )}
                            {departmentBreakdown.map((entry) => (
                                <div key={entry.name}>
                                    <div className="mb-1 flex items-center justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-300">{entry.name}</span>
                                        <span className="text-gray-400">{entry.count}</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div
                                            className="h-full rounded-full bg-indigo-500"
                                            style={{ width: `${Math.max(4, (entry.count / maxDept) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-emerald-500" />{t('Recent Activity')}</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y divide-gray-100 dark:divide-gray-800">
                            {recentActivity.length === 0 && (
                                <p className="py-8 text-center text-sm text-gray-400">{t('No recent staff activity.')}</p>
                            )}
                            {recentActivity.map((entry) => (
                                <div key={entry.id} className="py-3 first:pt-0 last:pb-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {entry.description}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {entry.user ?? 'System'} · {entry.created_at}
                                    </p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarClock className="h-4 w-4 text-amber-500" />{t('Pending Leave Requests')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Staff')}</TableHead>
                                        <TableHead>{t('Type')}</TableHead>
                                        <TableHead>{t('Dates')}</TableHead>
                                        <TableHead className="text-right">{t('Days')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingLeaveRequests.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-8 text-center text-gray-400">{t('No pending leave requests.')}</TableCell>
                                        </TableRow>
                                    )}
                                    {pendingLeaveRequests.map((leave) => (
                                        <TableRow key={leave.id}>
                                            <TableCell className="text-sm font-medium">{leave.name ?? '—'}</TableCell>
                                            <TableCell className="text-sm capitalize">{leave.leave_type}</TableCell>
                                            <TableCell className="text-sm">
                                                {leave.from_date ?? '—'} → {leave.to_date ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-right text-sm">{leave.days}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Cake className="h-4 w-4 text-pink-500" />{t('Upcoming Birthdays (30 days)')}</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y divide-gray-100 dark:divide-gray-800">
                            {upcomingBirthdays.length === 0 && (
                                <p className="py-8 text-center text-sm text-gray-400">{t('No birthdays in the next 30 days.')}</p>
                            )}
                            {upcomingBirthdays.map((entry) => (
                                <div
                                    key={entry.name + entry.birthday}
                                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {entry.name}
                                        </p>
                                        <p className="text-xs text-gray-400">{entry.department ?? 'No department'}</p>
                                    </div>
                                    <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                                        {entry.birthday}
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HeartHandshake className="h-4 w-4 text-indigo-500" />{t('People Operations')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {quickLinks.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <Link key={link.href} href={link.href}>
                                        <Button variant="outline">
                                            <Icon className="mr-2 h-4 w-4" />
                                            {link.label}
                                        </Button>
                                    </Link>
                                );
                            })}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                                <BadgeIndianRupee className="mb-1 h-5 w-5 text-slate-500" />
                                <p className="text-lg font-semibold">
                                    ₹{staff.unpaidPayrollValue.toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs text-gray-400">{t('Unpaid payroll value')}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                                <HandCoins className="mb-1 h-5 w-5 text-slate-500" />
                                <p className="text-lg font-semibold">{staff.activeLoans}</p>
                                <p className="text-xs text-gray-400">{t('Active loans')}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                                <Users className="mb-1 h-5 w-5 text-slate-500" />
                                <p className="text-lg font-semibold">{staff.active}</p>
                                <p className="text-xs text-gray-400">{t('Active staff')}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                                <CalendarCheck className="mb-1 h-5 w-5 text-slate-500" />
                                <p className="text-lg font-semibold">{staff.attendanceMarkedToday}</p>
                                <p className="text-xs text-gray-400">{t('Marked today')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
