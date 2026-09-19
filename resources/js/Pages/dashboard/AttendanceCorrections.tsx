import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { CheckCircle2, Clock, Loader2, Plus, XCircle } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

type Correction = {
    id: string;
    student_id: string;
    admission_no?: string;
    first_name: string;
    last_name: string;
    class?: string;
    date: string;
    current_status: string;
    requested_status: string;
    reason?: string;
    status: string;
    requested_by?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    review_note?: string;
};

type ClassRecord = { id: string; label: string };
type StudentRecord = {
    id: string;
    admission_no?: string;
    first_name: string;
    last_name: string;
    class?: string;
};

interface Props {
    user: any;
    corrections: Correction[];
    classRecords: ClassRecord[];
    students: StudentRecord[];
    statuses: string[];
    canReview: boolean;
}

export default function AttendanceCorrections({ user, corrections, students, statuses, canReview }: Props) {
    const { t } = useLanguage();
    const [filterStatus, setFilterStatus] = useState('pending');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        student_id: '',
        date: new Date().toISOString().slice(0, 10),
        requested_status: 'present',
        reason: '',
    });

    const filter = (status: string) => {
        setFilterStatus(status);
        router.visit('/attendance-corrections', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: { status },
            only: ['corrections'],
        });
    };

    const openCreate = () => {
        setForm({
            student_id: students[0]?.id ?? '',
            date: new Date().toISOString().slice(0, 10),
            requested_status: 'present',
            reason: '',
        });
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        router.post('/attendance-corrections', form, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false),
            onFinish: () => setSaving(false),
        });
    };

    const review = (correction: Correction, action: 'approve' | 'reject') => {
        setSaving(true);
        router.patch(
            `/attendance-corrections/${correction.id}/review`,
            { action },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    const statusBadge = (status: string) => {
        const variant = status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary';
        return <Badge variant={variant}>{t(status)}</Badge>;
    };

    const attendanceBadge = (status: string) => {
        const variant = status === 'present' ? 'default' : status === 'absent' ? 'destructive' : 'secondary';
        return <Badge variant={variant}>{t(status)}</Badge>;
    };

    return (
        <DashboardLayout user={user} activeTab="attendance-corrections">
            <div className="space-y-6 p-6 lg:p-8">
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>{t('Attendance Corrections')}</CardTitle>
                            <CardDescription>
                                {t('Request and review attendance status changes for students.')}
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

                        {corrections.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                {t('No corrections found for the selected filter.')}
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                                            <th className="px-3 py-2">{t('Student')}</th>
                                            <th className="px-3 py-2">{t('Date')}</th>
                                            <th className="px-3 py-2">{t('Status')}</th>
                                            <th className="px-3 py-2">{t('Requested By')}</th>
                                            <th className="px-3 py-2">{t('Reason')}</th>
                                            <th className="px-3 py-2">{t('Actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {corrections.map((correction) => (
                                            <tr key={correction.id} className="border-b last:border-0">
                                                <td className="px-3 py-2">
                                                    <div className="font-medium">
                                                        {correction.first_name} {correction.last_name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {correction.admission_no} · {correction.class}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">{correction.date}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-1.5">
                                                        {attendanceBadge(correction.current_status)}
                                                        <span className="text-muted-foreground">→</span>
                                                        {attendanceBadge(correction.requested_status)}
                                                    </div>
                                                    <div className="mt-1">{statusBadge(correction.status)}</div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {correction.requested_by}
                                                    {correction.reviewed_by && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {t('Reviewed by')} {correction.reviewed_by}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="max-w-[220px] px-3 py-2">
                                                    <p className="truncate" title={correction.reason}>
                                                        {correction.reason || '—'}
                                                    </p>
                                                    {correction.review_note && (
                                                        <p
                                                            className="text-xs text-muted-foreground"
                                                            title={correction.review_note}
                                                        >
                                                            {correction.review_note}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {canReview && correction.status === 'pending' && (
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                disabled={saving}
                                                                onClick={() => review(correction, 'approve')}
                                                            >
                                                                <CheckCircle2 className="size-4" />
                                                                {t('Approve')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="destructive"
                                                                disabled={saving}
                                                                onClick={() => review(correction, 'reject')}
                                                            >
                                                                <XCircle className="size-4" />
                                                                {t('Reject')}
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {correction.status !== 'pending' && (
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Clock className="size-3" />
                                                            {correction.reviewed_at}
                                                        </div>
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
                        <h2 className="text-lg font-semibold">{t('New Attendance Correction')}</h2>
                        <p className="mb-4 text-sm text-muted-foreground">
                            {t('Select a student, date and requested status.')}
                        </p>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <Label>{t('Student')}</Label>
                                <Select
                                    value={form.student_id}
                                    onValueChange={(v) => setForm((f) => ({ ...f, student_id: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select student')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map((student) => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.admission_no} — {student.first_name} {student.last_name} (
                                                {student.class})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Date')}</Label>
                                <Input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>{t('Requested Status')}</Label>
                                <Select
                                    value={form.requested_status}
                                    onValueChange={(v) => setForm((f) => ({ ...f, requested_status: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['present', 'absent', 'late', 'half_day'].map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {t(s)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Reason')}</Label>
                                <Textarea
                                    value={form.reason}
                                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving || !form.student_id}>
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
