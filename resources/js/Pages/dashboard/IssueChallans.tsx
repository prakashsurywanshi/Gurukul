import { useLanguage } from '../../i18n/LanguageProvider';
import { useMemo, useState } from 'react';
import { Download, FileText, Search, Send, UsersRound } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { router } from '@inertiajs/react';

interface StudentFeeRecord {
    id: string;
    fee_type: string;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    due_date?: string | null;
}

interface StudentIssueRecord {
    id: string;
    first_name: string;
    last_name: string;
    admission_no?: string | null;
    roll_number?: string | null;
    class?: string | null;
    section?: string | null;
    fees: StudentFeeRecord[];
    total_due: number;
}

interface IssueChallansProps {
    user: any;
    organization?: { id: number; name: string; logo?: string | null } | null;
    classRecords: { id: number; name: string; section: string }[];
    sessionName?: string | null;
    selectedClassId?: number | null;
    students: StudentIssueRecord[];
}

export default function IssueChallans({
    user,
    organization,
    classRecords,
    sessionName,
    selectedClassId,
    students,
}: IssueChallansProps) {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFeeIds, setSelectedFeeIds] = useState<Set<string>>(new Set());

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    const classOptions = useMemo(
        () =>
            Array.from(new Set(classRecords.map((record) => record.name))).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true }),
            ),
        [classRecords],
    );

    const filteredStudents = useMemo(
        () =>
            students.filter((student) => {
                const matchesSearch =
                    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    String(student.admission_no || '')
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    String(student.roll_number || '')
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase());
                return matchesSearch;
            }),
        [students, searchQuery],
    );

    const allVisibleFeeIds = useMemo(
        () => filteredStudents.flatMap((student) => student.fees.map((fee) => fee.id)),
        [filteredStudents],
    );

    const allVisibleSelected = allVisibleFeeIds.length > 0 && allVisibleFeeIds.every((id) => selectedFeeIds.has(id));

    const toggleAll = () => {
        const next = new Set(selectedFeeIds);
        if (allVisibleSelected) {
            allVisibleFeeIds.forEach((id) => next.delete(id));
        } else {
            allVisibleFeeIds.forEach((id) => next.add(id));
        }
        setSelectedFeeIds(next);
    };

    const toggleFee = (id: string) => {
        const next = new Set(selectedFeeIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedFeeIds(next);
    };

    const selectedTotal = useMemo(
        () =>
            students.reduce((sum, student) => {
                const selectedFees = student.fees.filter((fee) => selectedFeeIds.has(fee.id));
                return sum + selectedFees.reduce((feeSum: number, fee) => feeSum + Number(fee.due_amount), 0);
            }, 0),
        [students, selectedFeeIds],
    );

    const grandTotalDue = useMemo(
        () => students.reduce((sum, student) => sum + Number(student.total_due), 0),
        [students],
    );

    const downloadBatch = () => {
        const ids = [...selectedFeeIds];
        if (ids.length === 0) return;
        const query = ids.map((id) => `ids[]=${encodeURIComponent(id)}`).join('&');
        window.open(`/fees/challans/issue/batch?${query}`, '_blank', 'noopener');
    };

    return (
        <DashboardLayout user={user} activeTab="fee-challans">
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('Challan Issuing')}</h1>
                        <p className="text-gray-600 mt-1">{t('Select pending fees and generate challans in bulk')}</p>
                        {sessionName ? (
                            <p className="text-sm text-gray-500 mt-1">
                                {t('Active Session')}: {sessionName}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex gap-3">
                        <Card>
                            <CardContent className="flex items-center gap-3 py-3">
                                <UsersRound className="w-5 h-5 text-blue-600" />
                                <div>
                                    <div className="text-xl font-bold">{students.length}</div>
                                    <div className="text-xs text-gray-500">{t('Students Due')}</div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3 py-3">
                                <div className="w-5 h-5 text-rose-600 font-bold text-center">₹</div>
                                <div>
                                    <div className="text-xl font-bold">{formatCurrency(grandTotalDue)}</div>
                                    <div className="text-xs text-gray-500">{t('Total Pending')}</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <CardTitle>{t('Pending Fees')}</CardTitle>
                        <div className="flex items-center gap-3">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('Search name, admission or roll no')}
                                    className="pl-9"
                                />
                            </div>
                            <Select
                                value={selectedClassId ? String(selectedClassId) : 'all'}
                                onValueChange={(v) => {
                                    router.get(
                                        '/fees/challans/issue',
                                        { class: v === 'all' ? undefined : v },
                                        { preserveState: true, replace: true },
                                    );
                                }}
                            >
                                <SelectTrigger className="w-52">
                                    <SelectValue placeholder={t('All Classes')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Classes')}</SelectItem>
                                    {classRecords.map((record) => (
                                        <SelectItem key={record.id} value={String(record.id)}>
                                            {record.name}-{record.section}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />
                                    </TableHead>
                                    <TableHead>{t('Student')}</TableHead>
                                    <TableHead>{t('Fee Type')}</TableHead>
                                    <TableHead>{t('Due Date')}</TableHead>
                                    <TableHead className="text-right">{t('Net')}</TableHead>
                                    <TableHead className="text-right">{t('Paid')}</TableHead>
                                    <TableHead className="text-right">{t('Balance')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.map((student) => {
                                    const selectedInStudent = student.fees.filter((fee) =>
                                        selectedFeeIds.has(fee.id),
                                    ).length;
                                    return student.fees.map((fee, feeIndex) => (
                                        <TableRow
                                            key={fee.id}
                                            className={selectedFeeIds.has(fee.id) ? 'bg-blue-50/60' : ''}
                                        >
                                            {feeIndex === 0 ? (
                                                <TableCell
                                                    rowSpan={student.fees.length}
                                                    className="align-top"
                                                    onClick={(e) => {
                                                        const checkbox = e.currentTarget.querySelector('input');
                                                        if (checkbox) checkbox.click();
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            student.fees.length > 0 &&
                                                            selectedInStudent === student.fees.length
                                                        }
                                                        onChange={(e) => {
                                                            const next = new Set(selectedFeeIds);
                                                            if (e.target.checked) {
                                                                student.fees.forEach((f) => next.add(f.id));
                                                            } else {
                                                                student.fees.forEach((f) => next.delete(f.id));
                                                            }
                                                            setSelectedFeeIds(next);
                                                        }}
                                                    />
                                                </TableCell>
                                            ) : null}
                                            {feeIndex === 0 ? (
                                                <TableCell rowSpan={student.fees.length} className="align-top">
                                                    <div className="font-medium">
                                                        {student.first_name} {student.last_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {student.class}
                                                        {student.section ? `-${student.section}` : ''} ·{' '}
                                                        {student.admission_no || '-'}
                                                    </div>
                                                </TableCell>
                                            ) : null}
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{fee.fee_type}</span>
                                                    {feeIndex === student.fees.length - 1 &&
                                                    Number(student.total_due) > 0 ? (
                                                        <Badge variant="destructive">
                                                            {formatCurrency(student.total_due)}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell>{fee.due_date || '-'}</TableCell>
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
                                                <div className="flex justify-end items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFeeIds.has(fee.id)}
                                                        onChange={() => toggleFee(fee.id)}
                                                    />
                                                    <a
                                                        href={`/fees/challans/${fee.id}/print`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <Button size="sm" variant="outline" className="gap-1.5">
                                                            <FileText className="w-3.5 h-3.5" />
                                                            {t('Print')}
                                                        </Button>
                                                    </a>
                                                    <a href={`/fees/challans/${fee.id}/download`}>
                                                        <Button size="sm" variant="outline" className="gap-1.5">
                                                            <Download className="w-3.5 h-3.5" />
                                                            {t('PDF')}
                                                        </Button>
                                                    </a>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ));
                                })}
                                {filteredStudents.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                                            {t('No students with pending fees found')}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="mt-6 flex items-center justify-between sticky bottom-4 bg-white dark:bg-gray-900 rounded-xl border p-4 shadow-sm">
                    <div className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{selectedFeeIds.size}</span>{' '}
                        {t('challan(s) selected')} ·{' '}
                        <span className="font-semibold text-rose-600">{formatCurrency(selectedTotal)}</span> {t('due')}
                        {organization?.name ? (
                            <>
                                {' · '}
                                {t('Generated with')} {organization.name} {t('header')}
                            </>
                        ) : null}
                    </div>
                    <Button onClick={downloadBatch} disabled={selectedFeeIds.size === 0} className="gap-2">
                        <Send className="w-4 h-4" />
                        {t('Generate Challans')} ({selectedFeeIds.size})
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
}
