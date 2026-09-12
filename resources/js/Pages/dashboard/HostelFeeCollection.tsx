import { useLanguage } from '../../i18n/LanguageProvider';
import { router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { Download, IndianRupee, Printer, Receipt, RefreshCw, Search, Trash2, Wallet } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface HostelFeeCollectionProps {
    user: any;
    sessions: SessionRecord[];
    selectedSessionId?: string | null;
    selectedSessionName?: string | null;
    classRecords: ClassRecord[];
    hostelFeeRecords: HostelFeeRecord[];
}

type SessionRecord = {
    id: string;
    name: string;
    isCurrent: boolean;
};

type ClassRecord = {
    id: number;
    name: string;
    section: string;
};

type HostelFeeRecord = {
    id: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    class: string;
    section: string;
    hostelRoom: string;
    feeType: string;
    amount: number;
    paidAmount: number;
    dueAmount: number;
    status: string;
    dueDate: string;
    latestPaymentId?: string | null;
    latestPaymentAmount?: number | null;
    latestPaymentDate?: string | null;
    latestPaymentMethod?: string | null;
    latestTransactionId?: string | null;
    latestReceiptNumber?: string | null;
    latestCollectedBy?: string | null;
    payments: HostelFeePaymentEntry[];
};

type HostelFeePaymentEntry = {
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod?: string | null;
    transactionId?: string | null;
    receiptNumber?: string | null;
    collectedBy?: string | null;
    status: string;
    revertedAt?: string | null;
    revertReason?: string | null;
};

export default function HostelFeeCollection({
    user,
    sessions,
    selectedSessionId,
    selectedSessionName,
    classRecords,
    hostelFeeRecords,
}: HostelFeeCollectionProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: { success?: string; error?: string };
        schoolName?: string | null;
    }>();
    const flash = page.props.flash ?? {};
    const schoolName = page.props.schoolName || 'Gurukul';
    const [hostelFeeClassFilter, setHostelFeeClassFilter] = useState('all');
    const [hostelFeeSectionFilter, setHostelFeeSectionFilter] = useState('all');
    const [hostelFeeStatusFilter, setHostelFeeStatusFilter] = useState('all');
    const [hostelFeeSearchQuery, setHostelFeeSearchQuery] = useState('');
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [showCollectFeeDialog, setShowCollectFeeDialog] = useState(false);
    const [showRevertDialog, setShowRevertDialog] = useState(false);
    const [selectedHostelFee, setSelectedHostelFee] = useState<HostelFeeRecord | null>(null);
    const [activeHostelFee, setActiveHostelFee] = useState<HostelFeeRecord | null>(null);
    const [activePayment, setActivePayment] = useState<HostelFeePaymentEntry | null>(null);
    const [collectFeeForm, setCollectFeeForm] = useState({
        fee_id: '',
        amount: '',
        payment_method: 'cash',
        transaction_id: '',
    });
    const [revertForm, setRevertForm] = useState({
        reason: '',
    });
    const isAdminUser = user?.role === 'admin';
    const [sessionFilter, setSessionFilter] = useState(selectedSessionId || sessions[0]?.id || '');

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    useEffect(() => {
        setSessionFilter(selectedSessionId || sessions[0]?.id || '');
    }, [selectedSessionId, sessions]);

    useEffect(() => {
        if (!selectedHostelFee) {
            return;
        }

        const updatedSelectedFee = hostelFeeRecords.find((record) => record.id === selectedHostelFee.id);

        if (updatedSelectedFee) {
            setSelectedHostelFee(updatedSelectedFee);
            return;
        }

        setShowDetailsDialog(false);
        setSelectedHostelFee(null);
    }, [hostelFeeRecords, selectedHostelFee]);

    const hostelFeeClassOptions = useMemo(
        () =>
            Array.from(new Set(classRecords.map((record) => record.name)))
                .filter((className) => className.trim() !== '')
                .sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
        [classRecords],
    );

    const hostelFeeSectionOptions = useMemo(() => {
        if (hostelFeeClassFilter === 'all') {
            return [];
        }

        return Array.from(
            new Set(
                classRecords.filter((record) => record.name === hostelFeeClassFilter).map((record) => record.section),
            ),
        )
            .filter((section) => section.trim() !== '')
            .sort();
    }, [classRecords, hostelFeeClassFilter]);

    const filteredHostelFeeRecords = useMemo(
        () =>
            hostelFeeRecords.filter((record) => {
                const matchesClass = hostelFeeClassFilter === 'all' || record.class === hostelFeeClassFilter;
                const matchesSection = hostelFeeSectionFilter === 'all' || record.section === hostelFeeSectionFilter;
                const matchesStatus = hostelFeeStatusFilter === 'all' || record.status === hostelFeeStatusFilter;
                const query = hostelFeeSearchQuery.trim().toLowerCase();
                const matchesSearch =
                    !query ||
                    [
                        record.studentName,
                        record.admissionNumber,
                        record.class,
                        record.section,
                        record.hostelRoom,
                        record.feeType,
                    ].some((value) =>
                        String(value || '')
                            .toLowerCase()
                            .includes(query),
                    );

                return matchesClass && matchesSection && matchesStatus && matchesSearch;
            }),
        [hostelFeeClassFilter, hostelFeeRecords, hostelFeeSectionFilter, hostelFeeSearchQuery, hostelFeeStatusFilter],
    );

    const totalAmount = filteredHostelFeeRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalPaid = filteredHostelFeeRecords.reduce((sum, record) => sum + record.paidAmount, 0);
    const totalBalance = filteredHostelFeeRecords.reduce((sum, record) => sum + record.dueAmount, 0);

    const downloadCsv = (filename: string, rows: string[][]) => {
        const csvContent = rows
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const exportHostelFees = () => {
        downloadCsv('hostel-fee-collection.csv', [
            [
                'Student',
                'Admission No.',
                'Class',
                'Section',
                'Hostel Room',
                'Fee Type',
                'Total',
                'Paid',
                'Balance',
                'Due Date',
                'Status',
            ],

            ...filteredHostelFeeRecords.map((record) => [
                record.studentName,
                record.admissionNumber || '-',
                record.class || '-',
                record.section || '-',
                record.hostelRoom || '-',
                record.feeType,
                String(record.amount),
                String(record.paidAmount),
                String(record.dueAmount),
                record.dueDate || '-',
                record.status,
            ]),
        ]);
        toast.success('Hostel fee records exported successfully');
    };

    const openDetailsDialog = (fee: HostelFeeRecord) => {
        setSelectedHostelFee(fee);
        setShowDetailsDialog(true);
    };

    const closeDetailsDialog = () => {
        setShowDetailsDialog(false);
        setSelectedHostelFee(null);
    };

    const openCollectFeeDialog = (fee: HostelFeeRecord) => {
        setActiveHostelFee(fee);
        setCollectFeeForm({
            fee_id: fee.id,
            amount: String(fee.dueAmount),
            payment_method: 'cash',
            transaction_id: '',
        });
        setShowCollectFeeDialog(true);
    };

    const closeCollectFeeDialog = () => {
        setShowCollectFeeDialog(false);
        setActiveHostelFee(null);
        setCollectFeeForm({
            fee_id: '',
            amount: '',
            payment_method: 'cash',
            transaction_id: '',
        });
    };

    const openRevertDialog = (fee: HostelFeeRecord, payment: HostelFeePaymentEntry) => {
        setActiveHostelFee(fee);
        setActivePayment(payment);
        setRevertForm({ reason: '' });
        setShowRevertDialog(true);
    };

    const closeRevertDialog = () => {
        setShowRevertDialog(false);
        setActiveHostelFee(null);
        setActivePayment(null);
        setRevertForm({ reason: '' });
    };

    const refreshPayments = (showToast = true) => {
        router.reload({
            only: ['hostelFeeRecords'],
            onSuccess: (page) => {
                if (selectedHostelFee) {
                    const updatedRecords = page.props.hostelFeeRecords as HostelFeeRecord[];
                    const updated = updatedRecords.find((r) => r.id === selectedHostelFee.id);
                    if (updated) setSelectedHostelFee(updated);
                }
                if (showToast) {
                    toast.success('Payment entries refreshed');
                }
            },
        });
    };

    const handleCollectHostelFee = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!activeHostelFee) {
            return;
        }

        router.post(
            '/hostel-management/fee-payments',
            {
                fee_id: Number(collectFeeForm.fee_id),
                amount: Number(collectFeeForm.amount),
                payment_method: collectFeeForm.payment_method,
                transaction_id: collectFeeForm.transaction_id,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    closeCollectFeeDialog();
                    refreshPayments(false);
                },
            },
        );
    };

    const handleRevertPayment = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!activePayment?.id) {
            toast.error('No payment available to revert');
            return;
        }

        if (!revertForm.reason.trim()) {
            toast.error('Enter a reason to revert the payment');
            return;
        }

        router.post(
            `/hostel-management/fee-payments/${activePayment.id}/revert`,
            {
                reason: revertForm.reason.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: closeRevertDialog,
            },
        );
    };

    const handleDeleteHostelFee = (fee: HostelFeeRecord) => {
        if (!isAdminUser) {
            return;
        }

        if (
            !window.confirm(
                `Delete hostel fee record for ${fee.studentName}? This will remove its payment entries as well.`,
            )
        ) {
            return;
        }

        router.delete(`/hostel-management/fees/${fee.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedHostelFee?.id === fee.id) {
                    closeDetailsDialog();
                }
            },
        });
    };

    const handleSessionChange = (value: string) => {
        setSessionFilter(value);
        setShowDetailsDialog(false);
        setShowCollectFeeDialog(false);
        setShowRevertDialog(false);
        setSelectedHostelFee(null);
        setActiveHostelFee(null);
        setActivePayment(null);

        router.get(
            '/hostel-fee-collection',
            { session: value },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);

    const handlePrintInvoice = (record: HostelFeeRecord, payment: HostelFeePaymentEntry) => {
        if (!payment.id) {
            toast.error('No payment available to print');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=900,height=700');

        if (!printWindow) {
            toast.error('Popup blocked. Please allow popups to print the invoice.');
            return;
        }

        const receiptNumber = payment.receiptNumber || `RCT-${payment.id}`;
        const statusLabel =
            payment.status === 'reverted'
                ? 'Reverted'
                : record.status === 'paid'
                  ? 'Paid'
                  : record.status === 'partial'
                    ? 'Partial'
                    : 'Pending';

        printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Hostel Fee Invoice ${receiptNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 32px;
              color: #0f172a;
              background: #f8fafc;
            }
            .invoice {
              max-width: 760px;
              margin: 0 auto;
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 16px;
              padding: 32px;
              position: relative;
              overflow: hidden;
            }
            .watermark {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 64px;
              font-weight: 800;
              letter-spacing: 0.2em;
              color: rgba(15, 23, 42, 0.05);
              transform: rotate(-28deg);
              text-transform: uppercase;
              pointer-events: none;
              user-select: none;
            }
            .header, .row, .amount-box {
              position: relative;
              z-index: 1;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 24px;
            }
            .title {
              margin: 0;
              font-size: 28px;
            }
            .subtitle {
              margin: 6px 0 0;
              color: #475569;
            }
            .school-name {
              margin: 0 0 8px;
              font-size: 24px;
              font-weight: 800;
            }
            .status {
              display: inline-block;
              padding: 8px 14px;
              border-radius: 999px;
              background: ${payment.status === 'reverted' ? '#e2e8f0' : record.status === 'paid' ? '#dcfce7' : '#dbeafe'};
              color: ${payment.status === 'reverted' ? '#475569' : record.status === 'paid' ? '#166534' : '#1e3a8a'};
              font-weight: 700;
              font-size: 13px;
              text-transform: uppercase;
            }
            .section {
              margin-top: 24px;
              position: relative;
              z-index: 1;
            }
            .section h2 {
              font-size: 16px;
              margin: 0 0 12px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px 24px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              padding: 10px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .row span {
              color: #475569;
            }
            .amount-box {
              margin-top: 24px;
              padding: 18px 20px;
              border-radius: 14px;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .amount-box strong {
              font-size: 24px;
            }
            .footer {
              margin-top: 30px;
              color: #64748b;
              font-size: 13px;
              text-align: center;
              position: relative;
              z-index: 1;
            }
            @media print {
              body {
                background: #ffffff;
                padding: 0;
              }
              .invoice {
                border: none;
                border-radius: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="watermark">${schoolName}</div>
            <div class="header">
              <div>
                <p class="school-name">${schoolName}</p>
                <h1 class="title">Hostel Fee Invoice</h1>
                <p class="subtitle">Receipt No: ${receiptNumber}</p>
              </div>
              <div class="status">${statusLabel}</div>
            </div>

            <div class="section">
              <h2>Student Details</h2>
              <div class="grid">
                <div class="row">
                  <span>Name</span>
                  <strong>${record.studentName}</strong>
                </div>
                <div class="row">
                  <span>Admission No.</span>
                  <strong>${record.admissionNumber || '-'}</strong>
                </div>
                <div class="row">
                  <span>Class</span>
                  <strong>${[record.class, record.section].filter(Boolean).join(' / ') || '-'}</strong>
                </div>
                <div class="row">
                  <span>Hostel Room</span>
                  <strong>${record.hostelRoom || '-'}</strong>
                </div>
                <div class="row">
                  <span>Fee Type</span>
                  <strong>${record.feeType}</strong>
                </div>
              </div>
            </div>

            <div class="section">
              <h2>Payment Details</h2>
              <div class="grid">
                <div class="row">
                  <span>Payment Date</span>
                  <strong>${payment.paymentDate || '-'}</strong>
                </div>
                <div class="row">
                  <span>Payment Method</span>
                  <strong>${String(payment.paymentMethod || '-').replace('_', ' ')}</strong>
                </div>
                <div class="row">
                  <span>Transaction ID</span>
                  <strong>${payment.transactionId || '-'}</strong>
                </div>
                <div class="row">
                  <span>Collected By</span>
                  <strong>${payment.collectedBy || '-'}</strong>
                </div>
                <div class="row">
                  <span>Due Date</span>
                  <strong>${record.dueDate || '-'}</strong>
                </div>
                <div class="row">
                  <span>Paid Amount</span>
                  <strong>${formatCurrency(Number(payment.amount || 0))}</strong>
                </div>
              </div>
            </div>

            <div class="section">
              <h2>Fee Summary</h2>
              <div class="grid">
                <div class="row">
                  <span>Total Fee</span>
                  <strong>${formatCurrency(record.amount)}</strong>
                </div>
                <div class="row">
                  <span>Total Paid</span>
                  <strong>${formatCurrency(record.paidAmount)}</strong>
                </div>
                <div class="row">
                  <span>Balance</span>
                  <strong>${formatCurrency(record.dueAmount)}</strong>
                </div>
                <div class="row">
                  <span>Status</span>
                  <strong>${statusLabel}</strong>
                </div>
              </div>
            </div>

            <div class="amount-box">
              <span>Invoice Amount</span>
              <strong>${formatCurrency(record.amount)}</strong>
            </div>

            <div class="footer">
              This is a system-generated hostel fee invoice.
            </div>
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

        printWindow.document.close();
    };

    return (
        <DashboardLayout user={user} activeTab="hostel-fee-collection">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <Dialog
                        open={showCollectFeeDialog}
                        onOpenChange={(open) => (!open ? closeCollectFeeDialog() : undefined)}
                    >
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('Collect Hostel Fee')}</DialogTitle>
                                <DialogDescription>
                                    {activeHostelFee
                                        ? t('Collect hostel fee from {activeHostelFee.studentName}.', {
                                              'activeHostelFee.studentName': activeHostelFee.studentName,
                                          })
                                        : t('Collect hostel fee payment.')}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCollectHostelFee} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('Amount')}</Label>
                                    <Input
                                        type="number"
                                        value={collectFeeForm.amount}
                                        onChange={(event) =>
                                            setCollectFeeForm({
                                                ...collectFeeForm,
                                                amount: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Payment Method')}</Label>
                                    <Select
                                        value={collectFeeForm.payment_method}
                                        onValueChange={(value) =>
                                            setCollectFeeForm({
                                                ...collectFeeForm,
                                                payment_method: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">{t('Cash')}</SelectItem>
                                            <SelectItem value="upi">{t('UPI')}</SelectItem>
                                            <SelectItem value="card">{t('Card')}</SelectItem>
                                            <SelectItem value="bank_transfer">{t('Bank Transfer')}</SelectItem>
                                            <SelectItem value="cheque">{t('Cheque')}</SelectItem>
                                            <SelectItem value="online">{t('Online')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Transaction ID')}</Label>
                                    <Input
                                        value={collectFeeForm.transaction_id}
                                        onChange={(event) =>
                                            setCollectFeeForm({
                                                ...collectFeeForm,
                                                transaction_id: event.target.value,
                                            })
                                        }
                                        placeholder={t('Optional reference')}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={closeCollectFeeDialog}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button type="submit">{t('Collect')}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={showRevertDialog} onOpenChange={(open) => (!open ? closeRevertDialog() : undefined)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('Revert Hostel Fee Payment')}</DialogTitle>
                                <DialogDescription>
                                    {activeHostelFee
                                        ? `Revert the latest payment of Rs. ${Number(activeHostelFee.latestPaymentAmount || 0).toLocaleString('en-IN')} for ${activeHostelFee.studentName}.`
                                        : t('Revert hostel fee payment.')}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleRevertPayment} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('Reason')}</Label>
                                    <Input
                                        value={revertForm.reason}
                                        onChange={(event) =>
                                            setRevertForm({
                                                reason: event.target.value,
                                            })
                                        }
                                        placeholder={t('Enter reason for reverting this payment')}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={closeRevertDialog}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button type="submit" variant="destructive">
                                        {t('Revert Payment')}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Dialog
                        open={showDetailsDialog}
                        onOpenChange={(open) => (!open ? closeDetailsDialog() : undefined)}
                    >
                        <DialogContent className="max-w-full sm:max-w-[100vw] w-[100vw] h-screen max-h-screen rounded-xl border-0 overflow-y-auto overflow-x-auto">
                            <DialogHeader>
                                <DialogTitle>{t('Student Fee Details')}</DialogTitle>
                                <DialogDescription>
                                    {selectedHostelFee
                                        ? t(
                                              'Review hostel fee and payment collection details for {selectedHostelFee.studentName}.',
                                              { 'selectedHostelFee.studentName': selectedHostelFee.studentName },
                                          )
                                        : t('Review hostel fee details.')}
                                </DialogDescription>
                            </DialogHeader>
                            {selectedHostelFee && (
                                <div className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-4">
                                        <Card>
                                            <CardContent className="pt-6">
                                                <p className="text-sm text-slate-500">{t('Student')}</p>
                                                <p className="mt-1 font-semibold text-slate-900">
                                                    {selectedHostelFee.studentName}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {selectedHostelFee.admissionNumber || '-'}
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6">
                                                <p className="text-sm text-slate-500">{t('Class / Section')}</p>
                                                <p className="mt-1 font-semibold text-slate-900">
                                                    {[selectedHostelFee.class, selectedHostelFee.section]
                                                        .filter(Boolean)
                                                        .join(' / ') || '-'}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {selectedHostelFee.hostelRoom || '-'}
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6">
                                                <p className="text-sm text-slate-500">{t('Fee Summary')}</p>
                                                <p className="mt-1 font-semibold text-slate-900">
                                                    {formatCurrency(selectedHostelFee.amount)}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {t('Paid')}
                                                    {formatCurrency(selectedHostelFee.paidAmount)}
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6">
                                                <p className="text-sm text-slate-500">{t('Balance')}</p>
                                                <p className="mt-1 font-semibold text-slate-900">
                                                    {formatCurrency(selectedHostelFee.dueAmount)}
                                                </p>
                                                <Badge
                                                    variant={
                                                        selectedHostelFee.status === 'paid' ? 'secondary' : 'default'
                                                    }
                                                    className="mt-2"
                                                >
                                                    {t(selectedHostelFee.status)}
                                                </Badge>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div className="flex flex-wrap justify-end gap-2">
                                        {isAdminUser && (
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() => handleDeleteHostelFee(selectedHostelFee)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {t('Delete Fee')}
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => openCollectFeeDialog(selectedHostelFee)}
                                            disabled={selectedHostelFee.dueAmount <= 0}
                                        >
                                            {t('Collect Fee')}
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900">
                                                    {t('Payment Collection Entries')}
                                                </h3>
                                                <p className="text-sm text-slate-500">
                                                    {t('All payment entries for this student hostel fee.')}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => refreshPayments()}
                                            >
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                {t('Refresh')}
                                            </Button>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('Receipt No.')}</TableHead>
                                                    <TableHead>{t('Amount')}</TableHead>
                                                    <TableHead>{t('Payment Date')}</TableHead>
                                                    <TableHead>{t('Method')}</TableHead>
                                                    <TableHead>{t('Collected By')}</TableHead>
                                                    <TableHead>{t('Status')}</TableHead>
                                                    <TableHead>{t('Revert Reason')}</TableHead>
                                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedHostelFee.payments.map((payment) => (
                                                    <TableRow key={payment.id}>
                                                        <TableCell>{payment.receiptNumber || '-'}</TableCell>
                                                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                                        <TableCell>{payment.paymentDate || '-'}</TableCell>
                                                        <TableCell>
                                                            {payment.paymentMethod
                                                                ? payment.paymentMethod.replace('_', ' ')
                                                                : '-'}
                                                        </TableCell>
                                                        <TableCell>{payment.collectedBy || '-'}</TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={
                                                                    payment.status === 'reverted'
                                                                        ? 'secondary'
                                                                        : 'default'
                                                                }
                                                            >
                                                                {t(payment.status)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{payment.revertReason || '-'}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handlePrintInvoice(selectedHostelFee, payment)
                                                                    }
                                                                >
                                                                    <Printer className="h-4 w-4" />
                                                                    {t('Print')}
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    disabled={payment.status === 'reverted'}
                                                                    onClick={() =>
                                                                        openRevertDialog(selectedHostelFee, payment)
                                                                    }
                                                                >
                                                                    {t('Revert')}
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {selectedHostelFee.payments.length === 0 && (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={8}
                                                            className="py-6 text-center text-sm text-slate-500"
                                                        >
                                                            {t('No payment collection entries found for this student.')}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Hostel Fee Collection')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Collect one-time hostel fees from assigned students by class and section.')}
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-700">
                                {t('Showing fee details for session:')}
                                {selectedSessionName || t('Current session')}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Total Fee')}</p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            ₹ {totalAmount.toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <IndianRupee className="h-8 w-8 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Collected')}</p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            ₹ {totalPaid.toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <Receipt className="h-8 w-8 text-emerald-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Pending Balance')}</p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            ₹ {totalBalance.toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <Wallet className="h-8 w-8 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Student Hostel Fees')}</CardTitle>
                            <CardDescription>
                                {t('Filter by class, section, and payment status, then collect hostel fee payments.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 space-y-3">
                                <div className="flex flex-row flex-wrap items-center gap-3">
                                    <div className="w-[240px]">
                                        <Select
                                            value={sessionFilter}
                                            onValueChange={handleSessionChange}
                                            disabled={sessions.length === 0}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select session')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sessions.map((session) => (
                                                    <SelectItem key={session.id} value={session.id}>
                                                        {session.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="relative w-[320px]">
                                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={hostelFeeSearchQuery}
                                            onChange={(event) => setHostelFeeSearchQuery(event.target.value)}
                                            placeholder={t('Search student')}
                                            className="pl-10"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={exportHostelFees}
                                        className="shrink-0"
                                    >
                                        <Download className="h-4 w-4" />
                                        {t('Export')}
                                    </Button>
                                </div>
                                <div className="flex flex-row flex-wrap items-center gap-3">
                                    <div className="w-[220px]">
                                        <Select
                                            value={hostelFeeClassFilter}
                                            onValueChange={(value) => {
                                                setHostelFeeClassFilter(value);
                                                setHostelFeeSectionFilter('all');
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select class')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Classes')}</SelectItem>
                                                {hostelFeeClassOptions.map((className) => (
                                                    <SelectItem key={className} value={className}>
                                                        {className}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-[220px]">
                                        <Select
                                            value={hostelFeeSectionFilter}
                                            onValueChange={setHostelFeeSectionFilter}
                                            disabled={hostelFeeClassFilter === 'all'}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select section')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Sections')}</SelectItem>
                                                {hostelFeeSectionOptions.map((section) => (
                                                    <SelectItem key={section} value={section}>
                                                        {section}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-[220px]">
                                        <Select value={hostelFeeStatusFilter} onValueChange={setHostelFeeStatusFilter}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select status')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                                <SelectItem value="pending">{t('Pending')}</SelectItem>
                                                <SelectItem value="partial">{t('Partial')}</SelectItem>
                                                <SelectItem value="paid">{t('Paid')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Student')}</TableHead>
                                        <TableHead>{t('Admission No.')}</TableHead>
                                        <TableHead>{t('Class')}</TableHead>
                                        <TableHead>{t('Hostel Room')}</TableHead>
                                        <TableHead>{t('Fee Type')}</TableHead>
                                        <TableHead>{t('Total')}</TableHead>
                                        <TableHead>{t('Paid')}</TableHead>
                                        <TableHead>{t('Balance')}</TableHead>
                                        <TableHead>{t('Due Date')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        {isAdminUser && <TableHead className="text-right">{t('Actions')}</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredHostelFeeRecords.map((record) => (
                                        <TableRow
                                            key={record.id}
                                            className="cursor-pointer"
                                            onClick={() => openDetailsDialog(record)}
                                        >
                                            <TableCell className="font-medium">{record.studentName}</TableCell>
                                            <TableCell>{record.admissionNumber || '-'}</TableCell>
                                            <TableCell>
                                                {[record.class, record.section].filter(Boolean).join(' / ') || '-'}
                                            </TableCell>
                                            <TableCell>{record.hostelRoom || '-'}</TableCell>
                                            <TableCell>{record.feeType}</TableCell>
                                            <TableCell>
                                                {t('Rs.')}
                                                {record.amount.toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell>
                                                {t('Rs.')}
                                                {record.paidAmount.toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell>
                                                {t('Rs.')}
                                                {record.dueAmount.toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell>{record.dueDate || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={record.status === 'paid' ? 'secondary' : 'default'}>
                                                    {t(record.status)}
                                                </Badge>
                                            </TableCell>
                                            {isAdminUser && (
                                                <TableCell
                                                    className="text-right"
                                                    onClick={(event) => event.stopPropagation()}
                                                >
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleDeleteHostelFee(record)}
                                                        title={t('Delete fee')}
                                                        className="text-rose-600 hover:text-rose-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                    {filteredHostelFeeRecords.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={isAdminUser ? 11 : 10}
                                                className="py-6 text-center text-sm text-slate-500"
                                            >
                                                {t('No hostel fee records found for the selected filters.')}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
