import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useLanguage } from '../../../i18n/LanguageProvider';
import {
    ArrowLeft,
    BadgeCheck,
    Banknote,
    BookOpenCheck,
    CalendarCheck,
    CalendarDays,
    HandCoins,
    IdCard,
    Mail,
    Phone,
    ShieldCheck,
    User,
    Wallet,
} from 'lucide-react';
import DashboardLayout from '../../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '../../ui/breadcrumb';
import { InfoRow, OpenPageButton, StatChip, formatMoney } from '../../ui/hub';

interface StaffHubPageProps {
    user: any;
    staffId: string;
    staff?: any | null;
    hub?: {
        attendance?: {
            total: number;
            present: number;
            absent: number;
            late: number;
            leave: number;
            this_month_present: number;
        };
        payroll?: {
            total_entries: number;
            latest_month?: string | null;
            base_pay: number;
            allowance: number;
            deduction: number;
            net_pay: number;
            status?: string | null;
        };
        leave?: {
            balances?: { leave_type: string; entitled_days: number }[];
            pending: number;
            approved_days: number;
        };
        appraisals?: {
            total: number;
            latest_score?: number | null;
            latest_rating?: string | null;
            latest_cycle?: string | null;
            latest_review_date?: string | null;
            latest_status?: string | null;
        };
        loans?: {
            total: number;
            active: number;
            outstanding: number;
        };
    };
}

export default function StaffDetails({ user, staffId, staff, hub }: StaffHubPageProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { staffPermissions } = props as any;

    const isManagedStaffRole = ['admin', 'teacher', 'receptionist', 'accountant', 'librarian', 'branch_admin'].includes(
        user?.role,
    );
    const can = (feature: string) =>
        user?.role === 'branch_admin' || !isManagedStaffRole || Boolean(staffPermissions?.[feature]?.view);

    const attendance = hub?.attendance;
    const payroll = hub?.payroll;
    const leave = hub?.leave;
    const appraisals = hub?.appraisals;
    const loans = hub?.loans;

    const hubTabs = [
        { id: 'overview', label: t('Overview'), icon: User, enabled: true },
        { id: 'attendance', label: t('Daily Attendance'), icon: CalendarCheck, enabled: can('Staff Attendance') },
        { id: 'payroll', label: t('Payroll'), icon: Banknote, enabled: can('Payroll Management') },
        { id: 'leave', label: t('Leave'), icon: CalendarDays, enabled: can('Leave Management') },
        { id: 'appraisals', label: t('Appraisals'), icon: BookOpenCheck, enabled: can('Teacher Evaluations') },
        { id: 'loans', label: t('Loans'), icon: HandCoins, enabled: can('Payroll Management') },
    ].filter((tab) => tab.enabled);

    if (!staff) {
        return (
            <DashboardLayout user={user} activeTab="users">
                <div className="min-h-full bg-slate-50 p-8">
                    <div className="mx-auto max-w-5xl space-y-6">
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/staff">
                                <ArrowLeft className="h-4 w-4" />
                                {t('Back to Staff')}
                            </Link>
                        </Button>
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-lg font-semibold text-slate-900">{t('Staff not found')}</p>
                                <p className="mt-2 text-sm text-slate-500">
                                    {t('The requested staff record could not be loaded.')}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={user} activeTab="users">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <Button asChild variant="outline" className="mb-4 gap-2">
                                <Link href="/staff">
                                    <ArrowLeft className="h-4 w-4" />
                                    {t('Back to Staff')}
                                </Link>
                            </Button>
                            <Breadcrumb className="mb-2">
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink asChild>
                                            <Link href="/staff">{t('Staff')}</Link>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>{staff.name}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                            <h1 className="text-3xl font-bold text-slate-900">{staff.name}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {staff.designation_name || t('Designation')}
                                {staff.department_name ? ` · ${staff.department_name}` : ''}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="px-3 py-1 text-sm capitalize">
                                {staff.role}
                            </Badge>
                            {staff.status === 'inactive' ? (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{t('Inactive')}</Badge>
                            ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                    {t('Active')}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <Tabs defaultValue="overview">
                        <div className="overflow-x-auto">
                            <TabsList className="h-10">
                                {hubTabs.map((tab) => (
                                    <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 px-3">
                                        <tab.icon className="h-4 w-4" />
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <TabsContent value="overview" className="m-0 space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <StatChip
                                    label={t('This Month Present')}
                                    value={attendance?.this_month_present ?? 0}
                                    tone="success"
                                />
                                <StatChip
                                    label={t('Leave Pending')}
                                    value={leave?.pending ?? 0}
                                    tone={(leave?.pending ?? 0) > 0 ? 'danger' : 'default'}
                                />
                                <StatChip
                                    label={t('Active Loans')}
                                    value={loans?.active ?? 0}
                                    tone={(loans?.active ?? 0) > 0 ? 'danger' : 'default'}
                                />
                                <StatChip label={t('Latest Net Pay')} value={formatMoney(payroll?.net_pay)} />
                            </div>

                            <div className="grid gap-6 xl:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('Staff Information')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <InfoRow icon={IdCard} label={t('Employee ID')} value={staff.employee_id} />
                                        <InfoRow icon={Mail} label={t('Email')} value={staff.email} />
                                        <InfoRow icon={Phone} label={t('Phone')} value={staff.phone} />
                                        <InfoRow
                                            icon={CalendarDays}
                                            label={t('Joining Date')}
                                            value={staff.joining_date}
                                        />
                                        <InfoRow icon={User} label={t('Gender')} value={staff.gender} />
                                        <InfoRow
                                            icon={CalendarDays}
                                            label={t('Date of Birth')}
                                            value={staff.date_of_birth}
                                        />
                                        <InfoRow
                                            icon={ShieldCheck}
                                            label={t('Blood Group')}
                                            value={staff.blood_group}
                                        />
                                        <InfoRow
                                            icon={Phone}
                                            label={t('Emergency Contact')}
                                            value={staff.emergency_contact}
                                        />
                                        <InfoRow icon={BadgeCheck} label={t('Address')} value={staff.address} />
                                        <InfoRow icon={IdCard} label={t('National Teacher ID')} value={staff.national_teacher_id} />
                                        <InfoRow icon={IdCard} label={t('Employee Code')} value={staff.employee_code} />
                                        <InfoRow icon={IdCard} label={t('PAN')} value={staff.pan} />
                                        <InfoRow icon={IdCard} label={t('Aadhaar Number')} value={staff.aadhar_number} />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Wallet className="h-5 w-5 text-blue-600" />
                                            {t('Quick Access')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-3 sm:grid-cols-2">
                                        {can('Payroll Management') && (
                                            <OpenPageButton
                                                href="/staff/payroll-management"
                                                label={t('Open Payroll Page')}
                                            />
                                        )}
                                        {can('Leave Management') && (
                                            <OpenPageButton
                                                href="/staff/leave-management"
                                                label={t('Open Leave Page')}
                                            />
                                        )}
                                        {can('Teacher Evaluations') && (
                                            <OpenPageButton
                                                href="/staff/appraisals"
                                                label={t('Open Appraisals Page')}
                                            />
                                        )}
                                        {can('Payroll Management') && (
                                            <OpenPageButton href="/staff/loans" label={t('Open Loans Page')} />
                                        )}
                                        {can('Staff Attendance') && (
                                            <OpenPageButton
                                                href="/staff/daily-attendance"
                                                label={t('Open Attendance Page')}
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {can('Staff Attendance') && (
                            <TabsContent value="attendance" className="m-0 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CalendarCheck className="h-5 w-5 text-blue-600" />
                                            {t('Attendance Summary')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="mt-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                                            <StatChip label={t('Total')} value={attendance?.total ?? 0} />
                                            <StatChip
                                                label={t('Present')}
                                                value={attendance?.present ?? 0}
                                                tone="success"
                                            />
                                            <StatChip
                                                label={t('Absent')}
                                                value={attendance?.absent ?? 0}
                                                tone="danger"
                                            />
                                            <StatChip label={t('Late')} value={attendance?.late ?? 0} />
                                            <StatChip label={t('Leave')} value={attendance?.leave ?? 0} />
                                        </div>
                                        <p className="mt-4 text-sm text-slate-500">
                                            {t('This Month Present')}: {attendance?.this_month_present ?? 0}
                                        </p>
                                    </CardContent>
                                </Card>
                                <OpenPageButton href="/staff/daily-attendance" label={t('Open Attendance Page')} />
                            </TabsContent>
                        )}

                        {can('Payroll Management') && (
                            <TabsContent value="payroll" className="m-0 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Banknote className="h-5 w-5 text-blue-600" />
                                            {t('Latest Payroll')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="mt-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                                            <StatChip label={t('Base Pay')} value={formatMoney(payroll?.base_pay)} />
                                            <StatChip label={t('Allowance')} value={formatMoney(payroll?.allowance)} />
                                            <StatChip label={t('Deduction')} value={formatMoney(payroll?.deduction)} />
                                            <StatChip
                                                label={t('Net Pay')}
                                                value={formatMoney(payroll?.net_pay)}
                                                tone="success"
                                            />
                                            <StatChip label={t('Entries')} value={payroll?.total_entries ?? 0} />
                                        </div>
                                        <p className="mt-4 text-sm text-slate-500">
                                            {t('Month')}: {payroll?.latest_month || '-'} · {t('Status')}:{' '}
                                            {payroll?.status ? String(payroll.status) : '-'}
                                        </p>
                                    </CardContent>
                                </Card>
                                <OpenPageButton href="/staff/payroll-management" label={t('Open Payroll Page')} />
                            </TabsContent>
                        )}

                        {can('Leave Management') && (
                            <TabsContent value="leave" className="m-0 space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    <StatChip label={t('Leave Pending')} value={leave?.pending ?? 0} />
                                    <StatChip
                                        label={t('Approved Days')}
                                        value={leave?.approved_days ?? 0}
                                        tone="success"
                                    />
                                </div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CalendarDays className="h-5 w-5 text-blue-600" />
                                            {t('Leave Balances')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {!leave?.balances || leave.balances.length === 0 ? (
                                            <p className="text-sm text-slate-500">
                                                {t('No leave balances recorded for this year yet.')}
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {leave.balances.map((balance) => (
                                                    <div
                                                        key={balance.leave_type}
                                                        className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                                                    >
                                                        <p className="font-medium text-slate-900">
                                                            {balance.leave_type}
                                                        </p>
                                                        <Badge variant="outline" className="px-3 py-1 text-sm">
                                                            {balance.entitled_days}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                                <OpenPageButton href="/staff/leave-management" label={t('Open Leave Page')} />
                            </TabsContent>
                        )}

                        {can('Teacher Evaluations') && (
                            <TabsContent value="appraisals" className="m-0 space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <StatChip label={t('Appraisals')} value={appraisals?.total ?? 0} />
                                    <StatChip label={t('Latest Score')} value={appraisals?.latest_score ?? 0} />
                                    <StatChip label={t('Rating')} value={appraisals?.latest_rating || '-'} />
                                    <StatChip label={t('Cycle')} value={appraisals?.latest_cycle || '-'} />
                                </div>
                                <Card>
                                    <CardContent className="py-8">
                                        {appraisals?.total ? (
                                            <p className="text-sm text-slate-600">
                                                {t('Latest Review Date')}: {appraisals.latest_review_date || '-'} ·{' '}
                                                {t('Status')}: {appraisals.latest_status || '-'}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-slate-500">
                                                {t('No appraisal records for this staff member yet.')}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                                <OpenPageButton href="/staff/appraisals" label={t('Open Appraisals Page')} />
                            </TabsContent>
                        )}

                        {can('Payroll Management') && (
                            <TabsContent value="loans" className="m-0 space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    <StatChip label={t('Loans')} value={loans?.total ?? 0} />
                                    <StatChip
                                        label={t('Active Loans')}
                                        value={loans?.active ?? 0}
                                        tone={loans?.active ? 'danger' : 'default'}
                                    />
                                    <StatChip label={t('Outstanding')} value={formatMoney(loans?.outstanding)} />
                                </div>
                                <OpenPageButton href="/staff/loans" label={t('Open Loans Page')} />
                            </TabsContent>
                        )}
                    </Tabs>
                </div>
            </div>
        </DashboardLayout>
    );
}
