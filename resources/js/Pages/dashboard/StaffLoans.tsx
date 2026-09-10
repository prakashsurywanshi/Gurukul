import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { BadgeIndianRupee, Pencil, Plus, Trash2, WalletCards } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

type StaffOption = { id: number; name: string; role: string };
type LoanRow = {
    id: number;
    staffName: string;
    staffRole: string;
    reason: string;
    principal: number;
    interestRate: number;
    tenureMonths: number;
    monthlyEmi: number;
    startDate: string;
    paidEmis: number;
    remainingEmis: number;
    outstanding: number;
    status: string;
    notes: string | null;
};

type Props = {
    loans: LoanRow[];
    staffOptions: StaffOption[];
    summary: { openLoans: number; outstandingTotal: number; emisCollected: number };
};

export default function StaffLoans({ loans, staffOptions, summary }: Props) {
    const { t } = useLanguage();
    const [staffUserId, setStaffUserId] = useState('');
    const [reason, setReason] = useState('');
    const [principal, setPrincipal] = useState('');
    const [interestRate, setInterestRate] = useState('0');
    const [tenureMonths, setTenureMonths] = useState('12');
    const [startDate, setStartDate] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const emi = (() => {
        const p = parseFloat(principal) || 0;
        const r = (parseFloat(interestRate) || 0) / 100 / 12;
        const n = parseInt(tenureMonths, 10) || 1;
        if (r === 0) return n > 0 ? p / n : 0;
        return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    })();

    const submit = () => {
        if (!staffUserId || !reason.trim() || !principal || parseFloat(principal) <= 0) {
            toast.error(t('Select staff member and enter principal amount.'));
            return;
        }
        setSaving(true);
        router.post(
            '/staff/loans',
            {
                staff_user_id: Number(staffUserId),
                loan_reason: reason.trim(),
                principal_amount: parseFloat(principal),
                interest_rate: parseFloat(interestRate) || 0,
                tenure_months: parseInt(tenureMonths, 10) || 1,
                monthly_emi: Math.round(emi * 100) / 100,
                start_date: startDate || null,
                status: 'active',
                notes: notes.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setStaffUserId('');
                    setReason('');
                    setPrincipal('');
                    setInterestRate('0');
                    setTenureMonths('12');
                    setStartDate('');
                    setNotes('');
                    toast.success(t('Staff loan recorded.'));
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const editRow = (row: LoanRow) => {
        const next = window.prompt(`${t('Paid EMIs')} (${row.tenureMonths} ${t('total')}):`, String(row.paidEmis));
        if (next === null) return;
        const paid = Math.max(0, Math.min(parseInt(next, 10) || 0, row.tenureMonths));
        const status = paid >= row.tenureMonths ? 'completed' : row.status;
        router.put(
            `/staff/loans/${row.id}`,
            { paid_emis: paid, status },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(t('Loan updated.')),
            },
        );
    };

    const remove = (row: LoanRow) => {
        if (!window.confirm(t('Delete this loan record?'))) return;
        router.delete(`/staff/loans/${row.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Loan deleted.')),
        });
    };

    return (
        <DashboardLayout pageTitle={t('Staff Loans')}>
            <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Active Loans')}</p>
                                <p className="text-2xl font-bold">{summary.openLoans}</p>
                            </div>
                            <WalletCards className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Outstanding')}</p>
                                <p className="text-2xl font-bold">₹{summary.outstandingTotal.toFixed(2)}</p>
                            </div>
                            <BadgeIndianRupee className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('EMIs Collected')}</p>
                                <p className="text-2xl font-bold">{summary.emisCollected}</p>
                            </div>
                            <Plus className="h-5 w-5" />
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Issue Staff Loan')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                                <Label>{t('Staff Member')}</Label>
                                <Select value={staffUserId} onValueChange={setStaffUserId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select staff')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staffOptions.map((staff) => (
                                            <SelectItem key={staff.id} value={String(staff.id)}>
                                                {staff.name} ({staff.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Reason')}</Label>
                                <Input
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder={t('e.g. House repair')}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Principal Amount')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={principal}
                                    onChange={(e) => setPrincipal(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Interest Rate %')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={interestRate}
                                    onChange={(e) => setInterestRate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Tenure (Months)')}</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={tenureMonths}
                                    onChange={(e) => setTenureMonths(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Monthly EMI')}</Label>
                                <Input value={`₹${emi.toFixed(2)}`} disabled />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Start Date')}</Label>
                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>{t('Notes')}</Label>
                            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                        </div>
                        <Button onClick={submit} disabled={saving}>
                            <Plus className="mr-2 h-4 w-4" />
                            {saving ? t('Saving...') : t('Issue Loan')}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Loan Registry')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {loans.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">{t('No loans recorded yet.')}</p>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Staff')}</TableHead>
                                    <TableHead>{t('Reason')}</TableHead>
                                    <TableHead className="text-right">{t('Principal')}</TableHead>
                                    <TableHead className="text-right">{t('EMI')}</TableHead>
                                    <TableHead className="text-right">{t('Paid')}</TableHead>
                                    <TableHead className="text-right">{t('Outstanding')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loans.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">
                                            {row.staffName}
                                            <span className="block text-xs text-muted-foreground">{row.staffRole}</span>
                                        </TableCell>
                                        <TableCell>{row.reason}</TableCell>
                                        <TableCell className="text-right">₹{row.principal.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">₹{row.monthlyEmi.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            {row.paidEmis}/{row.tenureMonths}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            ₹{row.outstanding.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    row.status === 'active'
                                                        ? 'default'
                                                        : row.status === 'completed'
                                                          ? 'secondary'
                                                          : 'destructive'
                                                }
                                            >
                                                {t(row.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost" onClick={() => editRow(row)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => remove(row)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
