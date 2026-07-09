import React, { useMemo } from 'react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

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

export default function StudentFees({ user, activeSession, studentRecord, feeData }: StudentFeesProps) {
  const pendingFees = useMemo(
    () => (feeData?.fees || []).filter((fee) => fee.due_amount > 0),
    [feeData]
  );

  const paidFees = useMemo(
    () => (feeData?.fees || []).filter((fee) => fee.due_amount <= 0),
    [feeData]
  );

  return (
    <DashboardLayout user={user} activeTab="fees">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Fees</h1>
          <p className="mt-1 text-sm text-slate-600">
            View your paid and pending fee details for this session based on the same records managed in the admin Fees page.
          </p>
        </div>

        {!studentRecord || !feeData ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              Student fee record not found.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Paid This Session</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">
                    {formatCurrency(feeData.summary.total_paid)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Pending This Session</p>
                  <p className="mt-2 text-2xl font-bold text-rose-600">
                    {formatCurrency(feeData.summary.total_pending)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Session</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{activeSession || 'No active session'}</p>
                  <p className="text-sm text-slate-500">
                    {studentRecord.first_name} {studentRecord.last_name} | Class {studentRecord.class}-{studentRecord.section}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pending Fees Details - Session {activeSession || 'N/A'}</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingFees.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">No pending fees for this session.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-200 text-left text-sm text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Fee Type</th>
                          <th className="px-4 py-3 font-medium">Total</th>
                          <th className="px-4 py-3 font-medium">Paid</th>
                          <th className="px-4 py-3 font-medium">Pending</th>
                          <th className="px-4 py-3 font-medium">Due Date</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingFees.map((fee) => (
                          <tr key={fee.id} className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium text-slate-900">{fee.fee_type}</td>
                            <td className="px-4 py-3 text-slate-600">{formatCurrency(fee.total_amount)}</td>
                            <td className="px-4 py-3 text-slate-600">{formatCurrency(fee.paid_amount)}</td>
                            <td className="px-4 py-3 text-rose-600">{formatCurrency(fee.due_amount)}</td>
                            <td className="px-4 py-3 text-slate-600">{fee.due_date}</td>
                            <td className="px-4 py-3">
                              <Badge variant={fee.status === 'partial' ? 'outline' : 'secondary'}>{fee.status}</Badge>
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
                <CardTitle>Paid Fees Details - Session {activeSession || 'N/A'}</CardTitle>
              </CardHeader>
              <CardContent>
                {paidFees.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">No paid fees for this session yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-200 text-left text-sm text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Fee Type</th>
                          <th className="px-4 py-3 font-medium">Total</th>
                          <th className="px-4 py-3 font-medium">Paid</th>
                          <th className="px-4 py-3 font-medium">Due Date</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paidFees.map((fee) => (
                          <tr key={fee.id} className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium text-slate-900">{fee.fee_type}</td>
                            <td className="px-4 py-3 text-slate-600">{formatCurrency(fee.total_amount)}</td>
                            <td className="px-4 py-3 text-emerald-600">{formatCurrency(fee.paid_amount)}</td>
                            <td className="px-4 py-3 text-slate-600">{fee.due_date}</td>
                            <td className="px-4 py-3">
                              <Badge>{fee.status}</Badge>
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
                <CardTitle>Student Details</CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {studentRecord.first_name} {studentRecord.last_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    Class {studentRecord.class}-{studentRecord.section}
                  </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {(feeData.payments || []).length === 0 ? (
                  <div className="py-8 text-center text-slate-500">No payment history available.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-200 text-left text-sm text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Amount</th>
                          <th className="px-4 py-3 font-medium">Method</th>
                          <th className="px-4 py-3 font-medium">Transaction ID</th>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feeData.payments.map((payment) => (
                          <tr key={payment.id} className="border-b border-slate-100">
                            <td className="px-4 py-3 text-slate-900">{formatCurrency(payment.amount)}</td>
                            <td className="px-4 py-3 capitalize text-slate-600">
                              {String(payment.payment_method || '-').replace('_', ' ')}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{payment.transaction_id || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{payment.payment_date}</td>
                            <td className="px-4 py-3">
                              <Badge variant={payment.status === 'active' ? 'default' : 'secondary'}>
                                {payment.status}
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
    </DashboardLayout>
  );
}
