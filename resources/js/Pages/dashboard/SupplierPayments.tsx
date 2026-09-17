import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { Landmark, Plus, Trash2, Wallet } from 'lucide-react';
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

type PaymentRecord = {
    id: number;
    supplierName: string | null;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNo: string | null;
    notes: string | null;
    createdByName: string | null;
};

type SupplierRow = {
    id: number;
    name: string;
    paidTotal: number;
};

type Props = {
    user: any;
    payments: PaymentRecord[];
    suppliers: SupplierRow[];
    summary: { totalPaid: number; monthPaid: number; paymentsCount: number };
};

export default function SupplierPayments({ user, payments, suppliers, summary }: Props) {
    const { t } = useLanguage();
    const [supplierId, setSupplierId] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [referenceNo, setReferenceNo] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = () => {
        if (!supplierId || !amount || parseFloat(amount) <= 0) {
            toast.error(t('Select a supplier and enter a valid amount.'));
            return;
        }
        setSaving(true);
        router.post(
            '/store/supplier-payments',
            {
                inventory_supplier_id: Number(supplierId),
                amount: parseFloat(amount),
                payment_date: paymentDate || null,
                payment_method: paymentMethod,
                reference_no: referenceNo || null,
                notes: notes || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSupplierId('');
                    setAmount('');
                    setPaymentDate('');
                    setNotes('');
                    setReferenceNo('');
                    setPaymentMethod('cash');
                    toast.success(t('Supplier payment recorded.'));
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const remove = (id: number) => {
        if (!window.confirm(t('Delete this payment record?'))) return;
        router.delete(`/store/supplier-payments/${id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Payment deleted.')),
        });
    };

    return (
        <DashboardLayout user={user} pageTitle={t('Supplier Payments')}>
            <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Total Paid')}</p>
                                <p className="text-2xl font-bold">₹{summary.totalPaid.toFixed(2)}</p>
                            </div>
                            <Wallet className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Paid This Month')}</p>
                                <p className="text-2xl font-bold">₹{summary.monthPaid.toFixed(2)}</p>
                            </div>
                            <Landmark className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Payments')}</p>
                                <p className="text-2xl font-bold">{summary.paymentsCount}</p>
                            </div>
                            <Plus className="h-5 w-5" />
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Record Supplier Payment')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                                <Label>{t('Supplier')}</Label>
                                <Select value={supplierId} onValueChange={setSupplierId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select supplier')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map((supplier) => (
                                            <SelectItem key={supplier.id} value={String(supplier.id)}>
                                                {supplier.name} ({t('Paid')}: ₹{supplier.paidTotal.toFixed(2)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Amount')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Payment Date')}</Label>
                                <Input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Payment Method')}</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">{t('Cash')}</SelectItem>
                                        <SelectItem value="cheque">{t('Cheque')}</SelectItem>
                                        <SelectItem value="bank_transfer">{t('Bank Transfer')}</SelectItem>
                                        <SelectItem value="upi">{t('UPI')}</SelectItem>
                                        <SelectItem value="other">{t('Other')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Reference No.')}</Label>
                                <Input
                                    value={referenceNo}
                                    onChange={(e) => setReferenceNo(e.target.value)}
                                    placeholder={t('e.g. cheque number')}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Notes')}</Label>
                                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                            </div>
                        </div>
                        <Button onClick={submit} disabled={saving}>
                            <Plus className="mr-2 h-4 w-4" />
                            {saving ? t('Saving...') : t('Record Payment')}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Payment History')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {payments.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">
                                {t('No supplier payments recorded yet.')}
                            </p>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Supplier')}</TableHead>
                                    <TableHead>{t('Date')}</TableHead>
                                    <TableHead>{t('Method')}</TableHead>
                                    <TableHead>{t('Reference')}</TableHead>
                                    <TableHead className="text-right">{t('Amount')}</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">{payment.supplierName ?? '—'}</TableCell>
                                        <TableCell>{payment.paymentDate}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{payment.paymentMethod}</Badge>
                                        </TableCell>
                                        <TableCell>{payment.referenceNo ?? '—'}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            ₹{payment.amount.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Button size="icon" variant="ghost" onClick={() => remove(payment.id)}>
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
