import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { router } from '@inertiajs/react';
import { BarChart3, CheckCircle2, FileSearch, QrCode, RotateCcw, Search, Users, XCircle } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface QrAttendanceReportProps {
    user: any;
    summary: {
        totalScans: number;
        successScans: number;
        failedScans: number;
        uniqueStudents: number;
        successRate: number;
    };
    byDate: Array<{
        date: string;
        scans: number;
        success: number;
        failed: number;
    }>;
    byClass: Array<{
        class: string;
        scans: number;
        success: number;
        failed: number;
        studentCount: number;
    }>;
    classes: Array<{ id: string; label: string }>;
    filters: {
        from: string;
        to: string;
        classId: string | null;
        status: string;
    };
}

export default function QrAttendanceReport({
    user,
    summary,
    byDate,
    byClass,
    classes,
    filters,
}: QrAttendanceReportProps) {
    const { t } = useLanguage();
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [classId, setClassId] = useState(filters.classId ?? 'all');
    const [status, setStatus] = useState(filters.status);

    const applyFilters = () => {
        const params: Record<string, string> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        if (classId && classId !== 'all') params.class_id = classId;
        if (status && status !== 'all') params.status = status;

        router.get('/qr-attendance/report', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        setFrom('');
        setTo('');
        setClassId('all');
        setStatus('all');
        router.get(
            '/qr-attendance/report',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const cards = [
        {
            key: 'totalScans',
            value: summary.totalScans,
            label: t('Total Scans'),
            icon: QrCode,
            tone: 'bg-indigo-50 text-indigo-600',
        },
        {
            key: 'successScans',
            value: summary.successScans,
            label: t('Successful Scans'),
            icon: CheckCircle2,
            tone: 'bg-emerald-50 text-emerald-600',
        },
        {
            key: 'failedScans',
            value: summary.failedScans,
            label: t('Failed Scans'),
            icon: XCircle,
            tone: 'bg-rose-50 text-rose-600',
        },
        {
            key: 'uniqueStudents',
            value: summary.uniqueStudents,
            label: t('Unique Students'),
            icon: Users,
            tone: 'bg-sky-50 text-sky-600',
        },
        {
            key: 'successRate',
            value: `${summary.successRate}%`,
            label: t('Success Rate'),
            icon: BarChart3,
            tone: 'bg-amber-50 text-amber-600',
        },
    ];

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <FileSearch className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {t('QR Attendance Report')}
                                </h1>
                                <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                                    {t('Summary of QR-based attendance scans across your selected range.')}
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardContent className="space-y-4 p-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500 dark:text-gray-400">
                                    {t('From')}
                                </label>
                                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500 dark:text-gray-400">
                                    {t('To')}
                                </label>
                                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500 dark:text-gray-400">
                                    {t('Class')}
                                </label>
                                <Select value={classId} onValueChange={setClassId}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All')}</SelectItem>
                                        {classes.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500 dark:text-gray-400">
                                    {t('Status')}
                                </label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All')}</SelectItem>
                                        <SelectItem value="success">{t('Successful')}</SelectItem>
                                        <SelectItem value="failure">{t('Failed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end gap-2">
                                <Button onClick={applyFilters} className="flex-1">
                                    <Search className="mr-2 h-4 w-4" />
                                    {t('Apply')}
                                </Button>
                                <Button variant="outline" onClick={resetFilters}>
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                    {cards.map((card) => (
                        <Card key={card.key}>
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className={`rounded-lg p-2 ${card.tone}`}>
                                    <card.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                        {card.value}
                                    </div>
                                    <div className="text-xs text-slate-500">{card.label}</div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('Daily Scans')}</h2>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Date')}</TableHead>
                                        <TableHead>{t('Total Scans')}</TableHead>
                                        <TableHead>{t('Successful')}</TableHead>
                                        <TableHead>{t('Failed')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {byDate.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                                {t('No records found.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        byDate.map((row) => (
                                            <TableRow key={row.date}>
                                                <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                    {row.date}
                                                </TableCell>
                                                <TableCell>{row.scans}</TableCell>
                                                <TableCell className="text-green-600">{row.success}</TableCell>
                                                <TableCell className="text-rose-600">{row.failed}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {t('Class-wise Breakdown')}
                        </h2>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Class')}</TableHead>
                                        <TableHead>{t('Students')}</TableHead>
                                        <TableHead>{t('Total Scans')}</TableHead>
                                        <TableHead>{t('Successful')}</TableHead>
                                        <TableHead>{t('Failed')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {byClass.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                                {t('No records found.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        byClass.map((row) => (
                                            <TableRow key={row.class}>
                                                <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                    {row.class}
                                                </TableCell>
                                                <TableCell>{row.studentCount}</TableCell>
                                                <TableCell>{row.scans}</TableCell>
                                                <TableCell className="text-green-600">{row.success}</TableCell>
                                                <TableCell className="text-rose-600">{row.failed}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
