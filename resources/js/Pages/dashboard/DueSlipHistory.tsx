import { useLanguage } from '../../i18n/LanguageProvider';
import { useMemo, useState } from 'react';
import { Download, FileText, Printer, Search } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface DueSlipLog {
    id: number;
    student_id: string;
    student: string;
    admission_no: string | null;
    class: string | null;
    section: string | null;
    total_due: number;
    slip_date: string;
    via: string;
    generated_by: string | null;
    generated_at: string;
}

interface DueSlipHistoryProps {
    user: any;
    organization?: { id: number; name: string; logo?: string | null } | null;
    sessionName?: string | null;
    logs: DueSlipLog[];
    summary: { totalSlips: number; todaySlips: number; totalDue: number };
}

export default function DueSlipHistory({ user, sessionName, logs, summary }: DueSlipHistoryProps) {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [viaFilter, setViaFilter] = useState('');

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    const classOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    logs
                        .map((log) => (log.class ? `${log.class}${log.section ? `-${log.section}` : ''}` : null))
                        .filter(Boolean),
                ),
            ).sort((a, b) => a!.localeCompare(b!, undefined, { numeric: true })),
        [logs],
    );

    const filteredLogs = logs.filter((log) => {
        const matchesSearch =
            !searchQuery.trim() ||
            log.student.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
            (log.admission_no ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase());
        const matchesClass = !classFilter || classFilter === 'all' || `${log.class}-${log.section}` === classFilter;
        const matchesVia = !viaFilter || viaFilter === 'all' || log.via === viaFilter;
        return matchesSearch && matchesClass && matchesVia;
    });

    return (
        <DashboardLayout user={user} activeTab="due-slip-history">
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('Due Slip History')}</h1>
                        <p className="text-gray-600 mt-1">
                            {t('Track every due slip generated for students, with amount and prepared by details.')}
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
                            <p className="text-sm text-gray-500">{t('Total Due Slips')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalSlips}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-gray-500">{t('Slips Generated Today')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.todaySlips}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-gray-500">{t('Total Due Amount')}</p>
                            <p className="text-2xl font-bold text-rose-600 mt-1">{formatCurrency(summary.totalDue)}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('Search by student or admission number')}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={classFilter} onValueChange={setClassFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Filter by Class')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Classes')}</SelectItem>
                                    {classOptions.map((option) => (
                                        <SelectItem key={option!} value={option!}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={viaFilter} onValueChange={setViaFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Slip Type')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Types')}</SelectItem>
                                    <SelectItem value="print">{t('Print')}</SelectItem>
                                    <SelectItem value="download">{t('Download')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        {filteredLogs.length === 0 ? (
                            <div className="py-16 text-center">
                                <FileText className="mx-auto h-10 w-10 text-gray-300" />
                                <p className="mt-3 text-gray-500">{t('No due slips have been generated yet.')}</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Student')}</TableHead>
                                        <TableHead>{t('Class')}</TableHead>
                                        <TableHead>{t('Total Due')}</TableHead>
                                        <TableHead>{t('Slip Type')}</TableHead>
                                        <TableHead>{t('Prepared By')}</TableHead>
                                        <TableHead>{t('Generated On')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <div className="font-medium text-gray-900">{log.student}</div>
                                                {log.admission_no && (
                                                    <div className="text-xs text-gray-500">{log.admission_no}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {log.class ? (
                                                    <span>
                                                        {log.class}
                                                        {log.section ? `-${log.section}` : ''}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium text-rose-600">
                                                {formatCurrency(log.total_due)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {log.via === 'print' ? (
                                                        <Printer className="mr-1 h-3 w-3" />
                                                    ) : (
                                                        <Download className="mr-1 h-3 w-3" />
                                                    )}
                                                    {log.via === 'print' ? t('Print') : t('Download')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{log.generated_by ?? '—'}</TableCell>
                                            <TableCell className="text-gray-500">{log.slip_date}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
