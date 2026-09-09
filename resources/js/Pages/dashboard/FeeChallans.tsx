import { useLanguage } from '../../i18n/LanguageProvider';
import { useMemo, useState } from 'react';
import { Download, FileText, Printer, Search, UserRound } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface FeeChallansProps {
    user: any;
    organization?: { id: number; name: string; logo?: string | null } | null;
    students: any[];
    classRecords: { id: number; name: string; section: string }[];
    studentFeeRecords: Record<string, any>;
    sessionName?: string | null;
}

export default function FeeChallans({
    user,
    organization,
    students,
    classRecords,
    studentFeeRecords,
    sessionName,
}: FeeChallansProps) {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    const classOptions = useMemo(
        () =>
            Array.from(new Set(classRecords.map((record) => record.name))).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true }),
            ),
        [classRecords],
    );

    const sectionsForClass = (className: string) =>
        Array.from(
            new Set(classRecords.filter((record) => record.name === className).map((record) => record.section)),
        ).sort();

    const filteredStudents = students.filter((student) => {
        const matchesSearch =
            `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(student.admission_no || '')
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
        const matchesClass = !classFilter || classFilter === 'all' || student.class === classFilter;
        const matchesSection = !sectionFilter || sectionFilter === 'all' || student.section === sectionFilter;
        return matchesSearch && matchesClass && matchesSection;
    });

    const pendingFees = useMemo(() => {
        if (!selectedStudent) {
            return [];
        }
        return (studentFeeRecords[selectedStudent.id]?.fees ?? []).filter((fee: any) => Number(fee.due_amount) > 0);
    }, [selectedStudent, studentFeeRecords]);

    const studentTotalDue = pendingFees.reduce((sum: number, fee: any) => sum + Number(fee.due_amount), 0);

    return (
        <DashboardLayout user={user} activeTab="fee-challans">
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('Fee Challans')}</h1>
                        <p className="text-gray-600 mt-1">
                            {t('Generate, print, and download fee challans for pending student fees')}
                        </p>
                        {sessionName ? (
                            <p className="text-sm text-gray-500 mt-1">
                                {t('Active Session')}: {sessionName}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Students')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder={t('Search name or admission no')}
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>
                                    <Select
                                        value={classFilter}
                                        onValueChange={(v) => {
                                            setClassFilter(v);
                                            setSectionFilter('');
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All Classes')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Classes')}</SelectItem>
                                            {classOptions.map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={sectionFilter}
                                        onValueChange={setSectionFilter}
                                        disabled={!classFilter}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All Sections')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Sections')}</SelectItem>
                                            {sectionsForClass(classFilter).map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setClassFilter('');
                                            setSectionFilter('');
                                            setSelectedStudent(null);
                                        }}
                                    >
                                        {t('Reset')}
                                    </Button>
                                </div>

                                <div className="max-h-[520px] overflow-y-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Student')}</TableHead>
                                                <TableHead>{t('Class')}</TableHead>
                                                <TableHead className="text-right">{t('Pending')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredStudents.map((student) => {
                                                const fees = studentFeeRecords[student.id]?.fees ?? [];
                                                const pending = fees.reduce(
                                                    (sum: number, fee: any) => sum + Number(fee.due_amount),
                                                    0,
                                                );
                                                return (
                                                    <TableRow
                                                        key={student.id}
                                                        className={`cursor-pointer ${selectedStudent?.id === student.id ? 'bg-blue-50' : ''}`}
                                                        onClick={() => setSelectedStudent(student)}
                                                    >
                                                        <TableCell>
                                                            <div className="font-medium">
                                                                {student.first_name} {student.last_name}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {student.admission_no || '-'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {student.class}-{student.section}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {pending > 0 ? (
                                                                <Badge variant="destructive">
                                                                    {formatCurrency(pending)}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline">{t('Cleared')}</Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {filteredStudents.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                                                        {t('No students found')}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="xl:col-span-2">
                        {!selectedStudent ? (
                            <Card>
                                <CardContent className="py-16 text-center text-gray-500 flex flex-col items-center gap-3">
                                    <UserRound className="w-10 h-10 text-gray-300" />
                                    <p>{t('Select a student to generate fee challans')}</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            {selectedStudent.first_name} {selectedStudent.last_name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                                            <span>
                                                <span className="text-gray-400">{t('Admission No')}:</span>{' '}
                                                {selectedStudent.admission_no || '-'}
                                            </span>
                                            <span>
                                                <span className="text-gray-400">{t('Class')}:</span>{' '}
                                                {selectedStudent.class}-{selectedStudent.section}
                                            </span>
                                            <span>
                                                <span className="text-gray-400">{t('Roll No')}:</span>{' '}
                                                {selectedStudent.roll_number || '-'}
                                            </span>
                                            <span className="ml-auto">
                                                <span className="text-gray-400">{t('Total Pending')}:</span>{' '}
                                                <strong className="text-rose-600">
                                                    {formatCurrency(studentTotalDue)}
                                                </strong>
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>{t('Pending Fee Challans')}</CardTitle>
                                        <div className="flex gap-2">
                                            <a
                                                href={`/fees/due-slips/${selectedStudent.id}/print`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <Button variant="outline" className="gap-2">
                                                    <Printer className="w-4 h-4" />
                                                    {t('Print Due Slip')}
                                                </Button>
                                            </a>
                                            <a href={`/fees/due-slips/${selectedStudent.id}/download`}>
                                                <Button variant="outline" className="gap-2">
                                                    <Download className="w-4 h-4" />
                                                    {t('Due Slip PDF')}
                                                </Button>
                                            </a>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {pendingFees.length === 0 ? (
                                            <div className="text-center text-green-600 py-8 font-medium">
                                                {t('No pending fees for this student in the active session.')}
                                            </div>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Fee Type')}</TableHead>
                                                        <TableHead>{t('Due Date')}</TableHead>
                                                        <TableHead className="text-right">{t('Net Amount')}</TableHead>
                                                        <TableHead className="text-right">{t('Paid')}</TableHead>
                                                        <TableHead className="text-right">{t('Balance')}</TableHead>
                                                        <TableHead className="text-right">{t('Actions')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {pendingFees.map((fee: any) => (
                                                        <TableRow key={fee.id}>
                                                            <TableCell className="font-medium">
                                                                {fee.fee_type}
                                                            </TableCell>
                                                            <TableCell>{fee.due_date}</TableCell>
                                                            <TableCell className="text-right">
                                                                {formatCurrency(fee.total_amount)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {formatCurrency(fee.paid_amount)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold text-rose-600">
                                                                {formatCurrency(fee.due_amount)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <a
                                                                        href={`/fees/challans/${fee.id}/print`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="gap-1.5"
                                                                        >
                                                                            <Printer className="w-3.5 h-3.5" />
                                                                            {t('Print')}
                                                                        </Button>
                                                                    </a>
                                                                    <a href={`/fees/challans/${fee.id}/download`}>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="gap-1.5"
                                                                        >
                                                                            <FileText className="w-3.5 h-3.5" />
                                                                            {t('PDF')}
                                                                        </Button>
                                                                    </a>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                        {organization?.name ? (
                                            <p className="mt-4 text-xs text-gray-400">
                                                {t('Documents are generated with the')} {organization.name}{' '}
                                                {t('header for use at the accounts office.')}
                                            </p>
                                        ) : null}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
