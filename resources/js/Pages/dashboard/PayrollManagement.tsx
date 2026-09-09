import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { FileDown, IndianRupee, Printer, Save, Search, Users, WalletCards } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface StaffRecord {
    id: number;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
}

interface PayrollManagementProps {
    user: any;
    staffRecords: StaffRecord[];
    staffPayrollRecords: StaffPayrollRecord[];
}

interface PayrollDraft {
    basePay: number;
    allowance: number;
    deduction: number;
    status: 'draft' | 'processed' | 'paid';
}

interface StaffPayrollRecord {
    id: number;
    staff_id: number;
    payroll_month: string;
    base_pay: number;
    allowance: number;
    deduction: number;
    status: PayrollDraft['status'];
}

const currentMonth = new Date().toISOString().slice(0, 7);

const createPayrollDrafts = (staffRecords: StaffRecord[]): Record<number, PayrollDraft> =>
    Object.fromEntries(
        staffRecords.map((staff) => [
            staff.id,
            {
                basePay: 0,
                allowance: 0,
                deduction: 0,
                status: 'draft',
            },
        ]),
    );

const buildPayrollByMonth = (
    records: StaffPayrollRecord[],
    defaultMonth: string,
    activeStaff: StaffRecord[],
): Record<string, Record<number, PayrollDraft>> => {
    const grouped: Record<string, Record<number, PayrollDraft>> = {
        [defaultMonth]: createPayrollDrafts(activeStaff),
    };

    (records ?? []).forEach((record) => {
        grouped[record.payroll_month] = {
            ...(grouped[record.payroll_month] ?? {}),
            [record.staff_id]: {
                basePay: Number(record.base_pay ?? 0),
                allowance: Number(record.allowance ?? 0),
                deduction: Number(record.deduction ?? 0),
                status: record.status,
            },
        };
    });

    return grouped;
};

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0,
        style: 'currency',
        currency: 'INR',
    }).format(amount || 0);

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const formatPayrollMonth = (value: string) => {
    const [year, month] = value.split('-').map(Number);

    if (!year || !month) {
        return value;
    }

    return new Intl.DateTimeFormat('en-IN', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(year, month - 1, 1));
};

export default function PayrollManagement({ user, staffRecords, staffPayrollRecords }: PayrollManagementProps) {
    const { t } = useLanguage();
    const pageProps = usePage().props as any;
    const flash = pageProps.flash ?? {};
    const schoolName = pageProps.schoolName ?? 'Gurukul';
    const activeStaff = useMemo(
        () => (staffRecords ?? []).filter((staff) => staff.status === 'active'),
        [staffRecords],
    );
    const [payrollMonth, setPayrollMonth] = useState(currentMonth);
    const [searchQuery, setSearchQuery] = useState('');
    const [payrollByMonth, setPayrollByMonth] = useState<Record<string, Record<number, PayrollDraft>>>(() => ({
        ...buildPayrollByMonth(staffPayrollRecords, currentMonth, activeStaff),
    }));
    const [saving, setSaving] = useState(false);
    const currentPayroll = useMemo(
        () => payrollByMonth[payrollMonth] ?? createPayrollDrafts(activeStaff),
        [activeStaff, payrollByMonth, payrollMonth],
    );

    useEffect(() => {
        setPayrollByMonth(buildPayrollByMonth(staffPayrollRecords, currentMonth, activeStaff));
    }, [activeStaff, staffPayrollRecords]);

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
            [staff.name, staff.email, staff.role].some((value) => value.toLowerCase().includes(query)),
        );
    }, [activeStaff, searchQuery]);

    const getDraft = (staffId: number): PayrollDraft =>
        currentPayroll[staffId] ?? {
            basePay: 0,
            allowance: 0,
            deduction: 0,
            status: 'draft',
        };

    const updateDraft = (staffId: number, field: keyof PayrollDraft, value: string) => {
        setPayrollByMonth((current) => ({
            ...current,
            [payrollMonth]: {
                ...(current[payrollMonth] ?? createPayrollDrafts(activeStaff)),
                [staffId]: {
                    ...((current[payrollMonth] ?? currentPayroll)[staffId] ?? getDraft(staffId)),
                    [field]: field === 'status' ? value : Number(value || 0),
                },
            },
        }));
    };

    const handlePayrollMonthChange = (month: string) => {
        setPayrollMonth(month);
        setPayrollByMonth((current) => ({
            ...current,
            [month]: current[month] ?? createPayrollDrafts(activeStaff),
        }));
    };

    const handleSavePayroll = () => {
        if (activeStaff.length === 0) {
            toast.error('No active staff found to save payroll.');
            return;
        }

        setSaving(true);
        router.post(
            '/staff/payroll-management',
            {
                payroll_month: payrollMonth,
                entries: activeStaff.map((staff) => {
                    const draft = getDraft(staff.id);

                    return {
                        staff_id: staff.id,
                        base_pay: draft.basePay,
                        allowance: draft.allowance,
                        deduction: draft.deduction,
                        status: draft.status,
                    };
                }),
            },
            {
                preserveScroll: true,
                onError: () => toast.error('Failed to save staff payroll.'),
                onFinish: () => setSaving(false),
            },
        );
    };

    const handlePrintPayrollSlip = (staff: StaffRecord) => {
        const draft = getDraft(staff.id);
        const grossPay = draft.basePay + draft.allowance;
        const netPay = grossPay - draft.deduction;
        const printWindow = window.open('', '_blank', 'width=900,height=700');

        if (!printWindow) {
            toast.error('Allow pop-ups to print the payroll slip.');
            return;
        }

        printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Payroll Slip - ${escapeHtml(staff.name)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #f8fafc;
              color: #0f172a;
              font-family: Arial, sans-serif;
              padding: 32px;
            }
            .slip {
              max-width: 760px;
              margin: 0 auto;
              background: #fff;
              border: 1px solid #cbd5e1;
              padding: 32px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 18px;
              margin-bottom: 24px;
            }
            h1, h2, p { margin: 0; }
            h1 { font-size: 24px; }
            h2 { font-size: 16px; color: #475569; margin-top: 6px; }
            .status {
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 8px 12px;
              text-transform: uppercase;
              font-size: 12px;
              font-weight: 700;
              height: fit-content;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px 24px;
              margin-bottom: 24px;
            }
            .label {
              color: #64748b;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            .value {
              margin-top: 4px;
              font-weight: 700;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 12px;
              text-align: left;
            }
            th { background: #f1f5f9; }
            td.amount { text-align: right; font-weight: 700; }
            .net {
              margin-top: 20px;
              display: flex;
              justify-content: space-between;
              border: 2px solid #0f172a;
              padding: 14px;
              font-size: 18px;
              font-weight: 700;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              margin-top: 56px;
              color: #475569;
              font-size: 13px;
            }
            .signature {
              width: 180px;
              border-top: 1px solid #0f172a;
              padding-top: 8px;
              text-align: center;
            }
            @media print {
              body { background: #fff; padding: 0; }
              .slip { border: 0; max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="slip">
            <div class="header">
              <div>
                <h1>${escapeHtml(schoolName)}</h1>
                <h2>Payroll Slip - ${escapeHtml(formatPayrollMonth(payrollMonth))}</h2>
              </div>
              <div class="status">${escapeHtml(draft.status)}</div>
            </div>
            <div class="grid">
              <div>
                <div class="label">Staff Name</div>
                <div class="value">${escapeHtml(staff.name)}</div>
              </div>
              <div>
                <div class="label">Role</div>
                <div class="value">${escapeHtml(staff.role.replace(/_/g, ' '))}</div>
              </div>
              <div>
                <div class="label">Email</div>
                <div class="value">${escapeHtml(staff.email)}</div>
              </div>
              <div>
                <div class="label">Payroll Month</div>
                <div class="value">${escapeHtml(formatPayrollMonth(payrollMonth))}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Pay</td>
                  <td>Earning</td>
                  <td class="amount">${escapeHtml(formatCurrency(draft.basePay))}</td>
                </tr>
                <tr>
                  <td>Allowance</td>
                  <td>Earning</td>
                  <td class="amount">${escapeHtml(formatCurrency(draft.allowance))}</td>
                </tr>
                <tr>
                  <td>Deduction</td>
                  <td>Deduction</td>
                  <td class="amount">${escapeHtml(formatCurrency(draft.deduction))}</td>
                </tr>
              </tbody>
            </table>
            <div class="net">
              <span>Net Pay</span>
              <span>${escapeHtml(formatCurrency(netPay))}</span>
            </div>
            <div class="footer">
              <span>Generated on ${escapeHtml(new Date().toLocaleDateString('en-IN'))}</span>
              <span class="signature">Authorized Signature</span>
            </div>
          </div>
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
        printWindow.document.close();
    };

    const findSavedRecord = (staff: StaffRecord) =>
        (staffPayrollRecords ?? []).find(
            (record) => record.staff_id === staff.id && record.payroll_month === payrollMonth,
        );

    const handleDownloadPayslipPdf = (staff: StaffRecord) => {
        const saved = findSavedRecord(staff);

        if (!saved) {
            toast.error('Save this payroll month first to download the slip.');
            return;
        }

        const popup = window.open(`/staff/payroll-management/${saved.id}/payslip/download`, '_blank');

        if (!popup) {
            toast.error('Allow pop-ups to download the payroll slip.');
        }
    };

    const totals = useMemo(() => {
        return activeStaff.reduce(
            (summary, staff) => {
                const draft = getDraft(staff.id);
                const netPay = draft.basePay + draft.allowance - draft.deduction;

                return {
                    gross: summary.gross + draft.basePay + draft.allowance,
                    deductions: summary.deductions + draft.deduction,
                    net: summary.net + netPay,
                    paid: summary.paid + (draft.status === 'paid' ? 1 : 0),
                };
            },
            { gross: 0, deductions: 0, net: 0, paid: 0 },
        );
    }, [activeStaff, currentPayroll]);

    return (
        <DashboardLayout user={user} activeTab="payroll-management">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Payroll Management')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Prepare monthly payroll for active staff members.')}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Staff in Payroll')}</CardDescription>
                                <CardTitle className="text-2xl">{activeStaff.length}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">
                                <Users className="mr-2 inline h-4 w-4" />
                                {t('Active staff')}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Gross Pay')}</CardDescription>
                                <CardTitle className="text-2xl text-blue-600">{formatCurrency(totals.gross)}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">
                                {t('Base pay plus allowances')}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Deductions')}</CardDescription>
                                <CardTitle className="text-2xl text-red-600">
                                    {formatCurrency(totals.deductions)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">{t('Total deductions')}</CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Net Pay')}</CardDescription>
                                <CardTitle className="text-2xl text-emerald-600">
                                    {formatCurrency(totals.net)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">
                                <WalletCards className="mr-2 inline h-4 w-4" />
                                {totals.paid}
                                {t('paid')}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Payroll Sheet')}</CardTitle>
                            <CardDescription>
                                {t('Payroll month:')}
                                {payrollMonth}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between gap-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <div className="flex shrink-0 items-center gap-3">
                                    <div className="relative w-80">
                                        <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={searchQuery}
                                            onChange={(event) => setSearchQuery(event.target.value)}
                                            placeholder={t('Search staff...')}
                                            className="h-11 !pl-14"
                                        />
                                    </div>
                                    <div className="flex h-11 w-48 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm">
                                        <IndianRupee className="h-4 w-4 text-slate-500" />
                                        <Input
                                            type="month"
                                            value={payrollMonth}
                                            onChange={(event) => handlePayrollMonthChange(event.target.value)}
                                            className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleSavePayroll}
                                    disabled={saving}
                                    className="h-11 shrink-0 gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {saving ? t('Saving...') : t('Save Payroll')}
                                </Button>
                            </div>

                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Staff')}</TableHead>
                                            <TableHead>{t('Role')}</TableHead>
                                            <TableHead>{t('Base Pay')}</TableHead>
                                            <TableHead>{t('Allowance')}</TableHead>
                                            <TableHead>{t('Deduction')}</TableHead>
                                            <TableHead>{t('Net Pay')}</TableHead>
                                            <TableHead className="w-40">{t('Status')}</TableHead>
                                            <TableHead className="text-right">{t('Slip')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStaff.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                                    {t('No active staff found')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredStaff.map((staff) => {
                                                const draft = getDraft(staff.id);
                                                const netPay = draft.basePay + draft.allowance - draft.deduction;

                                                return (
                                                    <TableRow key={staff.id}>
                                                        <TableCell>
                                                            <div className="font-medium text-slate-900">
                                                                {staff.name}
                                                            </div>
                                                            <div className="text-xs text-slate-500">{staff.email}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">
                                                                {staff.role.replace(/_/g, ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={draft.basePay}
                                                                onChange={(event) =>
                                                                    updateDraft(staff.id, 'basePay', event.target.value)
                                                                }
                                                                className="w-28"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={draft.allowance}
                                                                onChange={(event) =>
                                                                    updateDraft(
                                                                        staff.id,
                                                                        'allowance',
                                                                        event.target.value,
                                                                    )
                                                                }
                                                                className="w-28"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={draft.deduction}
                                                                onChange={(event) =>
                                                                    updateDraft(
                                                                        staff.id,
                                                                        'deduction',
                                                                        event.target.value,
                                                                    )
                                                                }
                                                                className="w-28"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-slate-900">
                                                            {formatCurrency(netPay)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={draft.status}
                                                                onValueChange={(value) =>
                                                                    updateDraft(staff.id, 'status', value)
                                                                }
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="draft">{t('Draft')}</SelectItem>
                                                                    <SelectItem value="processed">
                                                                        {t('Processed')}
                                                                    </SelectItem>
                                                                    <SelectItem value="paid">{t('Paid')}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handlePrintPayrollSlip(staff)}
                                                                    className="gap-2"
                                                                >
                                                                    <Printer className="h-4 w-4" />
                                                                    {t('Print')}
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={!findSavedRecord(staff)}
                                                                    onClick={() => handleDownloadPayslipPdf(staff)}
                                                                    className="gap-2"
                                                                    title={t('Download PDF')}
                                                                    aria-label={t('Download PDF')}
                                                                >
                                                                    <FileDown className="h-4 w-4" />
                                                                    {t('PDF')}
                                                                </Button>
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
