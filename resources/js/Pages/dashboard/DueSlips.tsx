import { useLanguage } from '../../i18n/LanguageProvider';
import { useMemo, useState } from 'react';
import { Download, Printer, Search } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface DueSlipStudent {
    student_id: string;
    total_due: number;
    pending_count: number;
}

interface DueSlipsProps {
    user: any;
    organization?: { id: number; name: string; logo?: string | null } | null;
    classRecords: { id: number; name: string; section: string }[];
    sessionName?: string | null;
    dues: DueSlipStudent[];
    students: any[];
}

export default function DueSlips({ user, organization, classRecords, sessionName, dues, students }: DueSlipsProps) {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('');

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    const classOptions = useMemo(
        () =>
            Array.from(new Set(classRecords.map((record) => record.name))).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true }),
            ),
        [classRecords],
    );

    const studentIndex = useMemo(() => {
        const index: Record<string, any> = {};
        students.forEach((student) => {
            index[student.id] = student;
        });
        return index;
    }, [students]);

    const filteredDues = dues.filter((due) => {
        const student = studentIndex[due.student_id];
        const matchesSearch =
            !searchQuery.trim() ||
            (student &&
                (`${student.first_name} ${student.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    String(student.admission_no || '')
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())));
        const matchesClass = !classFilter || classFilter === 'all' || !student || student.class === classFilter;
        return matchesSearch && matchesClass;
    });

    const totalDue = dues.reduce((sum, due) => sum + due.total_due, 0);
    const totalStudents = filteredDues.length;

    const classSummaries = useMemo(() => {
        const summary: Record<string, { total: number; students: number }> = {};
        dues.forEach((due) => {
            const student = studentIndex[due.student_id];
            const key = student ? `${student.class}-${student.section}` : 'Other';
            if (!summary[key]) {
                summary[key] = { total: 0, students: 0 };
            }
            summary[key].total += due.total_due;
            summary[key].students += 1;
        });
        return Object.entries(summary)
            .map(([key, value]) => ({ key, ...value }))
            .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
    }, [dues, studentIndex]);

    return (
        <DashboardLayout user={user} activeTab="due-slips">
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('Fee Due Slips')}</h1>
                        <p className="text-gray-600 mt-1">
                            {t('Print and download fee due slips for students with pending fees')}
                        </p>
                        {sessionName ? (
                            <p className="text-sm text-gray-500 mt-1">
                                {t('Active Session')}: {sessionName}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-gray-500">{t('Students with Dues')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{totalStudents}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-gray-500">{t('Total Due Amount')}</p>
                            <p className="text-2xl font-bold text-rose-600 mt-1">{formatCurrency(totalDue)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-gray-500">{t('Classes with Dues')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{classSummaries.length}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Students with Pending Fees')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    <div className="relative flex-1 min-w-[240px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={t('Search name or admission no')}
                                            className="pl-9"
                                        />
                                    </div>
                                    <Select value={classFilter} onValueChange={setClassFilter}>
                                        <SelectTrigger className="w-[180px]">
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
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Student')}</TableHead>
                                            <TableHead>{t('Class')}</TableHead>
                                            <TableHead className="text-right">{t('Pending Items')}</TableHead>
                                            <TableHead className="text-right">{t('Total Due')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDues.map((due) => {
                                            const student = studentIndex[due.student_id];
                                            return (
                                                <TableRow key={due.student_id}>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {student
                                                                ? `${student.first_name} ${student.last_name}`
                                                                : due.student_id}
                                                        </div>
                                                        {student?.admission_no ? (
                                                            <div className="text-xs text-gray-500">
                                                                {student.admission_no}
                                                            </div>
                                                        ) : null}
                                                    </TableCell>
                                                    <TableCell>
                                                        {student ? `${student.class}-${student.section}` : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline">{due.pending_count}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-rose-600">
                                                        {formatCurrency(due.total_due)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <a
                                                                href={`/fees/due-slips/${due.student_id}/print`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <Button size="sm" variant="outline" className="gap-1.5">
                                                                    <Printer className="w-3.5 h-3.5" />
                                                                    {t('Print')}
                                                                </Button>
                                                            </a>
                                                            <a href={`/fees/due-slips/${due.student_id}/download`}>
                                                                <Button size="sm" variant="outline" className="gap-1.5">
                                                                    <Download className="w-3.5 h-3.5" />
                                                                    {t('PDF')}
                                                                </Button>
                                                            </a>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {filteredDues.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                                                    {t('No students with pending fees found')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="xl:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Class-wise Due Summary')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Class')}</TableHead>
                                            <TableHead className="text-right">{t('Students')}</TableHead>
                                            <TableHead className="text-right">{t('Due')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {classSummaries.map((summary) => (
                                            <TableRow key={summary.key}>
                                                <TableCell className="font-medium">{summary.key}</TableCell>
                                                <TableCell className="text-right">{summary.students}</TableCell>
                                                <TableCell className="text-right font-semibold text-rose-600">
                                                    {formatCurrency(summary.total)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {classSummaries.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                                                    {t('No dues found')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
