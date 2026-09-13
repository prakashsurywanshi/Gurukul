import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { BadgePercent, CheckCircle2, IndianRupee, Loader2, Plus, XCircle } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

type ConcessionRequest = {
    id: string;
    student_id: string;
    admission_no?: string;
    first_name: string;
    last_name: string;
    class?: string;
    amount: number;
    applied_amount: number;
    reason?: string;
    status: string;
    requested_by?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    review_note?: string;
};

type StudentRecord = {
    id: string;
    admission_no?: string;
    first_name: string;
    last_name: string;
    class?: string;
};

interface Props {
    requests: ConcessionRequest[];
    students: StudentRecord[];
    statuses: string[];
    canReview: boolean;
}

const currency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function FeeConcessions({ requests, students, canReview }: Props) {
    const { t } = useLanguage();
    const [filterStatus, setFilterStatus] = useState('pending');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        student_id: students[0]?.id ?? '',
        amount: '',
        reason: '',
    });

    const filter = (status: string) => {
        setFilterStatus(status);
        router.visit('/fees/concession-requests', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: { status },
            only: ['requests'],
        });
    };

    const openCreate = () => {
        setForm({ student_id: students[0]?.id ?? '', amount: '', reason: '' });
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        router.post('/fees/concession-requests', form, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false),
            onFinish: () => setSaving(false),
        });
    };

    const review = (request: ConcessionRequest, action: 'approve' | 'reject') => {
        setSaving(true);
        router.patch(`/fees/concession-requests/${request.id}/review`, { action }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };

    const statusBadge = (status: string) => {
        const variant = status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary';
        return <Badge variant={variant}>{t(status)}</Badge>;
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 p-6 lg:p-8">
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>
                                <BadgePercent className="mr-2 inline size-5" />
                                {t('Fee Concession')}
                            </CardTitle>
                            <CardDescription>
                                {t('Request and approve fee concessions for students.')}
                            </CardDescription>
                        </div>
                        <Button onClick={openCreate}>
                            <Plus className="size-4" />
                            {t('New Request')}
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            {['pending', 'approved', 'rejected'].map((s) => (
                                <Button
                                    key={s}
                                    type="button"
                                    variant={filterStatus === s ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => filter(s)}
                                >
                                    {t(s)}
                                </Button>
                            ))}
                        </div>

                        {requests.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                {t('No concession requests found for the selected filter.')}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                                            <th className="px-3 py-2">{t('Student')}</th>
                                            <th className="px-3 py-2">{t('Amount')}</th>
                                            <th className="px-3 py-2">{t('Reason')}</th>
                                            <th className="px-3 py-2">{t('Status')}</th>
                                            <th className="px-3 py-2">{t('Requested By')}</th>
                                            <th className="px-3 py-2">{t('Actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map((request) => (
                                            <tr key={request.id} className="border-b last:border-0">
                                                <td className="px-3 py-2">
                                                    <div className="font-medium">
                                                        {request.first_name} {request.last_name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {request.admission_no} · {request.class}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-1 font-medium">
                                                        <IndianRupee className="size-3.5" />
                                                        {currency(request.amount)}
                                                    </div>
                                                    {request.status === 'approved' && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {t('Applied')} {currency(request.applied_amount)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="max-w-[220px] px-3 py-2">
                                                    <p className="truncate" title={request.reason}>
                                                        {request.reason}
                                                    </p>
                                                    {request.review_note && (
                                                        <p className="text-xs text-muted-foreground" title={request.review_note}>
                                                            {request.review_note}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">{statusBadge(request.status)}</td>
                                                <td className="px-3 py-2">
                                                    {request.requested_by}
                                                    {request.reviewed_by && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {t('Reviewed by')} {request.reviewed_by}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {canReview && request.status === 'pending' && (
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                disabled={saving}
                                                                onClick={() => review(request, 'approve')}
                                                            >
                                                                <CheckCircle2 className="size-4" />
                                                                {t('Approve')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="destructive"
                                                                disabled={saving}
                                                                onClick={() => review(request, 'reject')}
                                                            >
                                                                <XCircle className="size-4" />
                                                                {t('Reject')}
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {request.status !== 'pending' && request.reviewed_at && (
                                                        <div className="text-xs text-muted-foreground">{request.reviewed_at}</div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
                        <h2 className="text-lg font-semibold">{t('New Fee Concession')}</h2>
                        <p className="mb-4 text-sm text-muted-foreground">
                            {t('Select a student, amount and reason for the concession.')}
                        </p>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <Label>{t('Student')}</Label>
                                <Select value={form.student_id} onValueChange={(v) => setForm((f) => ({ ...f, student_id: v }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select student')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map((student) => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.admission_no} — {student.first_name} {student.last_name} ({student.class})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Amount')}</Label>
                                <div className="flex items-center gap-2">
                                    <IndianRupee className="size-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={form.amount}
                                        onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('Reason')}</Label>
                                <Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving || !form.student_id || !form.amount}>
                                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                                    {saving ? t('Saving') : t('Submit Request')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}