import { useLanguage } from '../../i18n/LanguageProvider';
import React, { useMemo, useState } from 'react';
import { Loader2, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

declare global {
    interface Window {
        Razorpay?: any;
    }
}

interface StudentFeesProps {
    user: any;
    activeSession?: string | null;
    studentRecord?: any | null;
    feeData?: any | null;
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount || 0);

const loadRazorpayScript = () =>
    new Promise<void>((resolve) => {
        if (window.Razorpay) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve();
        document.body.appendChild(script);
    });

export default function StudentFees({ user, activeSession, studentRecord, feeData }: StudentFeesProps) {
    const { t } = useLanguage();
    const pendingFees = useMemo(() => (feeData?.fees || []).filter((fee) => fee.due_amount > 0), [feeData]);

    const paidFees = useMemo(() => (feeData?.fees || []).filter((fee) => fee.due_amount <= 0), [feeData]);

    const [payTarget, setPayTarget] = useState<any | null>(null);
    const [paying, setPaying] = useState(false);
    const [paymentData, setPaymentData] = useState<any | null>(null);
    const [paymentError, setPaymentError] = useState('');
    const [upiRef, setUpiRef] = useState('');
    const [submittingUpi, setSubmittingUpi] = useState(false);
    const [receipt, setReceipt] = useState<any | null>(null);
    const [gotIt, setGotIt] = useState('');

    const closeModal = () => {
        setPayTarget(null);
        setPaymentData(null);
        setPaymentError('');
        setUpiRef('');
        setReceipt(null);
        setGotIt('');
    };

    const startPayment = async (fee: any) => {
        if (!fee?.id) {
            return;
        }

        setPayTarget(fee);
        setPaymentData(null);
        setPaymentError('');
        setPaying(true);

        try {
            const csrfToken = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
            const response = await axios.post(
                '/fees/online/pay',
                { student_fee_id: String(fee.id) },
                { headers: { 'X-XSRF-TOKEN': csrfToken } },
            );

            setPaymentData(response.data);
            setPaying(false);

            if (response.data.gateway === 'razorpay') {
                await openRazorpayCheckout(response.data);
            }
        } catch (error) {
            setPaying(false);
            setPaymentError((error as any)?.response?.data?.message ?? 'Unable to start the payment. Try again.');
        }
    };

    const openRazorpayCheckout = async (payment: any) => {
        await loadRazorpayScript();

        if (!window.Razorpay) {
            setPaymentError('Razorpay checkout could not be loaded. Check your internet connection.');
            return;
        }

        const options = {
            key: payment.keyId,
            amount: payment.amount,
            currency: payment.currency,
            name: 'School Fee Payment',
            description: `Fee payment ${payment.orderId ?? ''}`,
            order_id: payment.orderId,
            prefill: {
                name: `${studentRecord?.first_name ?? ''} ${studentRecord?.last_name ?? ''}`.trim(),
            },
            modal: {
                ondismiss: () => setPaymentData(null),
            },
            handler: async (result: any) => {
                await verifyRazorpayPayment(payment.orderId, result.razorpay_payment_id, result.razorpay_signature);
            },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', (response: any) => {
            setPaymentError(response?.error?.description ?? 'Payment failed. Please try again.');
            setPaymentData(null);
        });

        razorpay.open();
    };

    const verifyRazorpayPayment = async (orderId: string, paymentId: string, signature: string) => {
        setPaymentError('');
        setPaying(true);

        try {
            const csrfToken = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
            const response = await axios.post(
                '/fees/online/razorpay/verify',
                { orderId, paymentId, signature },
                { headers: { 'X-XSRF-TOKEN': csrfToken } },
            );

            setPaying(false);
            setPaymentData(null);
            setReceipt(response.data.receipt);
        } catch (error) {
            setPaying(false);
            setPaymentError(
                (error as any)?.response?.data?.message ?? 'Payment could not be verified. Contact the school office.',
            );
        }
    };

    const submitUpiReference = async () => {
        if (!upiRef.trim()) {
            setPaymentError('Enter the UPI transaction reference (UTR).');
            return;
        }

        setSubmittingUpi(true);
        setPaymentError('');

        try {
            const csrfToken = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
            const response = await axios.post(
                '/fees/online/upi/confirm',
                {
                    student_fee_id: String(payTarget?.id),
                    upi_transaction_id: upiRef.trim(),
                },
                { headers: { 'X-XSRF-TOKEN': csrfToken } },
            );

            setSubmittingUpi(false);
            setGotIt(response.data.message ?? 'Payment reference submitted.');
            setUpiRef('');
        } catch (error) {
            setSubmittingUpi(false);
            setPaymentError((error as any)?.response?.data?.message ?? 'Could not submit the reference. Try again.');
        }
    };

    const modalOpen = payTarget !== null;

    return (
        <DashboardLayout user={user} activeTab="fees">
            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{t('My Fees')}</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        {t(
                            'View your paid and pending fee details for this session based on the same records managed in the admin Fees page.',
                        )}
                    </p>
                </div>

                {!studentRecord || !feeData ? (
                    <Card>
                        <CardContent className="py-12 text-center text-slate-500">
                            {t('Student fee record not found.')}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardContent className="px-4 py-4">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        {t('Paid This Session')}
                                    </p>
                                    <p className="mt-2 text-2xl font-bold text-emerald-600">
                                        {formatCurrency(feeData.summary.total_paid)}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="px-4 py-4">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        {t('Pending This Session')}
                                    </p>
                                    <p className="mt-2 text-2xl font-bold text-rose-600">
                                        {formatCurrency(feeData.summary.total_pending)}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="px-4 py-4">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{t('Session')}</p>
                                    <p className="mt-2 text-lg font-bold text-slate-900">
                                        {activeSession || t('No active session')}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {studentRecord.first_name} {studentRecord.last_name} | {studentRecord.class}-
                                        {studentRecord.section}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {t('Pending Fees Details - Session')}
                                    {activeSession || t('N/A')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {pendingFees.length === 0 ? (
                                    <div className="py-8 text-center text-slate-500">
                                        {t('No pending fees for this session.')}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full">
                                            <thead className="border-b border-slate-200 text-left text-sm text-slate-500">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">{t('Fee Type')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Total')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Paid')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Pending')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Due Date')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Status')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Action')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingFees.map((fee) => (
                                                    <tr key={fee.id} className="border-b border-slate-100">
                                                        <td className="px-4 py-3 font-medium text-slate-900">
                                                            {fee.fee_type}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {formatCurrency(fee.total_amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {formatCurrency(fee.paid_amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-rose-600">
                                                            {formatCurrency(fee.due_amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">{fee.due_date}</td>
                                                        <td className="px-4 py-3">
                                                            <Badge
                                                                variant={
                                                                    fee.status === 'partial' ? 'outline' : 'secondary'
                                                                }
                                                            >
                                                                {t(fee.status)}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={() => startPayment(fee)}
                                                                disabled={paying}
                                                            >
                                                                {paying && payTarget?.id === fee.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <QrCode className="h-4 w-4" />
                                                                )}
                                                                {t('Pay Online')}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {t('Paid Fees Details - Session')}
                                    {activeSession || t('N/A')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {paidFees.length === 0 ? (
                                    <div className="py-8 text-center text-slate-500">
                                        {t('No paid fees for this session yet.')}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full">
                                            <thead className="border-b border-slate-200 text-left text-sm text-slate-500">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">{t('Fee Type')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Total')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Paid')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Due Date')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Status')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paidFees.map((fee) => (
                                                    <tr key={fee.id} className="border-b border-slate-100">
                                                        <td className="px-4 py-3 font-medium text-slate-900">
                                                            {fee.fee_type}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {formatCurrency(fee.total_amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-emerald-600">
                                                            {formatCurrency(fee.paid_amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">{fee.due_date}</td>
                                                        <td className="px-4 py-3">
                                                            <Badge>{t(fee.status)}</Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Student Details')}</CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 py-4">
                                <p className="text-xs uppercase tracking-wide text-slate-500">{t('Student')}</p>
                                <p className="mt-2 text-lg font-bold text-slate-900">
                                    {studentRecord.first_name} {studentRecord.last_name}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {studentRecord.class}-{studentRecord.section}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Payment History')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(feeData.payments || []).length === 0 ? (
                                    <div className="py-8 text-center text-slate-500">
                                        {t('No payment history available.')}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full">
                                            <thead className="border-b border-slate-200 text-left text-sm text-slate-500">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">{t('Amount')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Method')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Transaction ID')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Date')}</th>
                                                    <th className="px-4 py-3 font-medium">{t('Status')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {feeData.payments.map((payment) => (
                                                    <tr key={payment.id} className="border-b border-slate-100">
                                                        <td className="px-4 py-3 text-slate-900">
                                                            {formatCurrency(payment.amount)}
                                                        </td>
                                                        <td className="px-4 py-3 capitalize text-slate-600">
                                                            {String(payment.payment_method || '-').replace('_', ' ')}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {payment.transaction_id || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {payment.payment_date}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Badge
                                                                variant={
                                                                    payment.status === 'active'
                                                                        ? 'default'
                                                                        : 'secondary'
                                                                }
                                                            >
                                                                {t(payment.status)}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {modalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">
                                {receipt ? t('Payment Receipt') : t('Pay Online')}
                            </h3>
                            {!paying ? (
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            ) : null}
                        </div>

                        {receipt ? (
                            <div className="mt-4 space-y-4">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                                    {t('Payment successful.')}
                                </div>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-slate-500">{t('Receipt No.')}</dt>
                                        <dd className="font-semibold text-slate-900">{receipt.receiptNumber}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-slate-500">{t('Amount')}</dt>
                                        <dd className="font-semibold text-slate-900">
                                            {formatCurrency(receipt.amount)}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-slate-500">{t('Fee Type')}</dt>
                                        <dd className="text-slate-900">{receipt.feeType}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-slate-500">{t('Transaction ID')}</dt>
                                        <dd className="text-slate-900">{receipt.transactionId}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-slate-500">{t('Date')}</dt>
                                        <dd className="text-slate-900">{receipt.paymentDate}</dd>
                                    </div>
                                </dl>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => window.print()}
                                    >
                                        {t('Print Receipt')}
                                    </Button>
                                    <Button type="button" className="flex-1" onClick={() => router.reload()}>
                                        {t('Done')}
                                    </Button>
                                </div>
                            </div>
                        ) : paymentData?.gateway === 'upi' ? (
                            <div className="mt-4 space-y-4">
                                <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 p-4">
                                    <QRCodeSVG
                                        value={paymentData.upiPayload}
                                        size={200}
                                        bgColor="#ffffff"
                                        fgColor="#000000"
                                        level="M"
                                    />
                                    <p className="text-sm font-medium text-slate-700">
                                        {paymentData.holderName} • {paymentData.upiId}
                                    </p>
                                    <p className="text-xl font-bold text-slate-900">
                                        {formatCurrency(paymentData.amount)}
                                    </p>
                                </div>

                                <p className="text-sm text-slate-500">
                                    {t(
                                        'Scan the QR with any UPI app, complete the payment, then enter the UPI transaction reference (UTR) below.',
                                    )}
                                </p>

                                <div className="space-y-2">
                                    <Label>{t('UPI Transaction Reference (UTR)')}</Label>
                                    <Input
                                        value={upiRef}
                                        onChange={(event) => setUpiRef(event.target.value)}
                                        placeholder={t('e.g. 417263910258')}
                                    />
                                </div>

                                {paymentError ? <p className="text-sm text-red-600">{paymentError}</p> : null}

                                {gotIt ? (
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                        {gotIt}
                                    </div>
                                ) : null}

                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setPaymentData(null);
                                            setPaymentError('');
                                        }}
                                    >
                                        {t('Cancel')}
                                    </Button>
                                    <Button type="button" onClick={submitUpiReference} disabled={submittingUpi}>
                                        {submittingUpi ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <QrCode className="h-4 w-4" />
                                        )}
                                        {t('Submit Reference')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                {paying ? (
                                    <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                        <p className="text-sm">{t('Preparing payment...')}</p>
                                    </div>
                                ) : (
                                    <>
                                        {payTarget ? (
                                            <div className="rounded-xl border border-slate-200 p-4 text-sm">
                                                <div className="flex justify-between py-1">
                                                    <span className="text-slate-500">{t('Fee Type')}</span>
                                                    <span className="font-medium text-slate-900">
                                                        {payTarget.fee_type}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between py-1">
                                                    <span className="text-slate-500">{t('Pending')}</span>
                                                    <span className="font-medium text-rose-600">
                                                        {formatCurrency(payTarget.due_amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : null}

                                        {paymentError ? <p className="text-sm text-red-600">{paymentError}</p> : null}

                                        <Button
                                            type="button"
                                            className="w-full"
                                            onClick={() => startPayment(payTarget)}
                                        >
                                            <QrCode className="h-4 w-4" />
                                            {t('Retry Payment')}
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </DashboardLayout>
    );
}
