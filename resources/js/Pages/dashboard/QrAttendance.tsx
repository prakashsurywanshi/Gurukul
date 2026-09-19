import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { Check, Loader2, Printer, QrCode, Save, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface StudentRow {
    id: string;
    admission_no?: string | null;
    name: string;
    class_id?: number | null;
    class?: string | null;
    section?: string | null;
    roll_number?: string | null;
    qr_token: string;
    status?: string | null;
    check_in_time?: string | null;
}

interface ClassOption {
    id: string;
    name: string;
    section: string;
    label: string;
}

interface QrAttendanceProps {
    user: any;
    organization?: any;
    classes: ClassOption[];
    students: StudentRow[];
    selectedClassId?: string | null;
    date: string;
}

export default function QrAttendance(pageProps: QrAttendanceProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const classes = pageProps.classes ?? [];
    const students = pageProps.students ?? [];

    const [selectedClassId, setSelectedClassId] = useState(pageProps.selectedClassId ?? '');
    const [date, setDate] = useState(pageProps.date);
    const [statuses, setStatuses] = useState<Record<string, string>>(() =>
        Object.fromEntries(students.map((student) => [student.id, student.status ?? 'present'])),
    );
    const [saving, setSaving] = useState(false);
    const [showQrSheet, setShowQrSheet] = useState(false);

    const selectClass = (classId: string) => {
        router.visit('/attendance-qr', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: { class_id: classId, date },
            only: ['students', 'selectedClassId'],
        });
    };

    const changeDate = (value: string) => {
        setDate(value);
        router.visit('/attendance-qr', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: { class_id: selectedClassId, date: value },
            only: ['students', 'date'],
        });
    };

    const submitAttendance = (e: FormEvent) => {
        e.preventDefault();
        if (!selectedClassId) return;
        setSaving(true);
        const entries = students.map((student) => ({
            student_id: Number(student.id),
            status: statuses[student.id] ?? 'present',
        }));
        router.post(
            '/attendance-qr',
            { class_id: Number(selectedClassId), date, entries },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    const markAll = (status: string) => {
        const next = { ...statuses };
        students.forEach((student) => {
            next[student.id] = status;
        });
        setStatuses(next);
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('QR Code Attendance')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Mark attendance by QR code and print class QR sheets for quick scanning.')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowQrSheet(true)}>
                            <Printer className="mr-2 h-4 w-4" />
                            {t('Print QR Sheet')}
                        </Button>
                        <Button type="submit" onClick={submitAttendance} disabled={saving || students.length === 0}>
                            {saving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {t('Save Attendance')}
                        </Button>
                    </div>
                </div>

                <Card className="print:hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5 text-blue-500" />
                            {t('Select Class & Date')}
                        </CardTitle>
                        <CardDescription>
                            {t('Choose a class to mark attendance for the selected date.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label>{t('Class')}</Label>
                                <Select value={selectedClassId} onValueChange={selectClass}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select class')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((schoolClass) => (
                                            <SelectItem key={schoolClass.id} value={schoolClass.id}>
                                                {schoolClass.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Date')}</Label>
                                <Input type="date" value={date} onChange={(e) => changeDate(e.target.value)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {students.length > 0 && (
                    <Card className="print:hidden">
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>{t('Student Roster')}</CardTitle>
                                <CardDescription>
                                    {t('Mark each student present, absent, late or half day.')}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => markAll('present')}>
                                    <Check className="mr-1 h-4 w-4 text-green-500" />
                                    {t('All Present')}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => markAll('absent')}>
                                    <X className="mr-1 h-4 w-4 text-red-500" />
                                    {t('All Absent')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Student')}</TableHead>
                                        <TableHead>{t('Roll No.')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead>{t('Check-In')}</TableHead>
                                        <TableHead>{t('QR Token')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {student.name}
                                                </p>
                                                <p className="text-xs text-gray-500">{student.admission_no}</p>
                                            </TableCell>
                                            <TableCell className="text-sm">{student.roll_number ?? '—'}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={statuses[student.id] ?? 'present'}
                                                    onValueChange={(v) => setStatuses({ ...statuses, [student.id]: v })}
                                                >
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="present">{t('Present')}</SelectItem>
                                                        <SelectItem value="absent">{t('Absent')}</SelectItem>
                                                        <SelectItem value="late">{t('Late')}</SelectItem>
                                                        <SelectItem value="half_day">{t('Half Day')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm">
                                                {student.check_in_time ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                    {student.qr_token}
                                                </code>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {errors.entries && <p className="mt-2 text-xs text-red-500">{errors.entries}</p>}
                        </CardContent>
                    </Card>
                )}

                {selectedClassId && students.length === 0 && (
                    <Card className="print:hidden">
                        <CardContent>
                            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                {t('No students found for this class.')}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {showQrSheet && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:bg-white print:p-0">
                        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 print:max-h-none print:overflow-visible print:shadow-none print:dark:bg-white">
                            <div className="mb-4 flex items-center justify-between print:hidden">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {t('Class QR Sheet')}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {t('Print this sheet and paste it at the entrance for quick attendance.')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowQrSheet(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="mb-4 text-center print:mb-2">
                                <p className="text-lg font-bold text-gray-900">
                                    {classes.find((c) => c.id === selectedClassId)?.label ?? ''} — {date}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                {students.map((student) => (
                                    <div
                                        key={student.id}
                                        className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-700"
                                    >
                                        <QRCodeSVG value={student.qr_token} size={96} />
                                        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            {student.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {student.roll_number ?? ''} · {student.admission_no ?? ''}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 hidden justify-end gap-2 print:hidden">
                                <Button type="button" variant="outline" onClick={() => setShowQrSheet(false)}>
                                    {t('Close')}
                                </Button>
                                <Button type="button" onClick={() => window.print()}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    {t('Print')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
