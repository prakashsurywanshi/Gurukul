import { useLanguage } from '../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, CalendarDays, MessageSquarePlus, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

interface ComplaintEntry {
    id: number;
    student_id?: string | null;
    complainant_name: string;
    phone?: string | null;
    source: 'walk_in' | 'phone' | 'email' | 'student' | 'parent' | 'staff' | 'other';
    category: string;
    assigned_to?: string | null;
    complaint_date: string;
    status: 'open' | 'in_review' | 'resolved' | 'closed';
    note?: string | null;
    action_taken?: string | null;
    created_at?: string | null;
}

interface StudentRecord {
    id: string;
    admission_no?: string | null;
    first_name: string;
    last_name: string;
    phone?: string | null;
    class?: string | null;
    section?: string | null;
}

interface StudentComplainsProps {
    user: any;
    entries: ComplaintEntry[];
    tableReady: boolean;
    studentRecord?: StudentRecord | null;
}

const initialForm = {
    phone: '',
    category: '',
    complaint_date: new Date().toISOString().slice(0, 10),
    note: '',
};

const complaintCategories = ['Hostel', 'Transport', 'Classroom', 'Fees', 'Security', 'Academics', 'Library', 'Other'];

export default function StudentComplains({ user, entries, tableReady, studentRecord }: StudentComplainsProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    }>();
    const [formData, setFormData] = useState({
        ...initialForm,
        phone: studentRecord?.phone || '',
    });

    useEffect(() => {
        if (page.props.flash?.success) {
            toast.success(page.props.flash.success);
        }

        if (page.props.flash?.error) {
            toast.error(page.props.flash.error);
        }
    }, [page.props.flash?.error, page.props.flash?.success]);

    useEffect(() => {
        setFormData((current) => ({
            ...current,
            phone: current.phone || studentRecord?.phone || '',
        }));
    }, [studentRecord?.phone]);

    const studentName = useMemo(() => {
        if (!studentRecord) {
            return user?.name || 'Student';
        }

        return [studentRecord.first_name, studentRecord.last_name].filter(Boolean).join(' ');
    }, [studentRecord, user?.name]);

    const stats = useMemo(
        () => ({
            total: entries.length,
            open: entries.filter((entry) => entry.status === 'open').length,
            inReview: entries.filter((entry) => entry.status === 'in_review').length,
            resolved: entries.filter((entry) => entry.status === 'resolved' || entry.status === 'closed').length,
        }),
        [entries],
    );

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.post(
            '/complains',
            {
                ...formData,
                phone: formData.phone || null,
                note: formData.note.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setFormData({
                        ...initialForm,
                        phone: studentRecord?.phone || '',
                    });
                },
            },
        );
    };

    const renderStatusBadge = (status: ComplaintEntry['status']) => {
        if (status === 'resolved') {
            return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{t('Resolved')}</Badge>;
        }

        if (status === 'closed') {
            return <Badge className="bg-slate-700 text-white hover:bg-slate-700">{t('Closed')}</Badge>;
        }

        if (status === 'in_review') {
            return <Badge className="bg-blue-600 text-white hover:bg-blue-600">{t('In Review')}</Badge>;
        }

        return <Badge className="bg-blue-500 text-white hover:bg-blue-500">{t('Open')}</Badge>;
    };

    return (
        <DashboardLayout user={user} activeTab="complains">
            <div className="space-y-6 bg-slate-50/80 p-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{t('Complaints')}</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        {t('Raise an issue with the school and track the status of your submitted complaints.')}
                    </p>
                </div>

                {Object.keys(page.props.errors || {}).length > 0 ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {Object.values(page.props.errors || {})[0]}
                    </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">{t('Student')}</p>
                            <p className="mt-2 text-xl font-bold text-slate-900">{studentName}</p>
                            <p className="text-sm text-slate-500">
                                {studentRecord?.admission_no || t('No admission no.')}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">{t('Class')}</p>
                            <p className="mt-2 text-xl font-bold text-slate-900">
                                {studentRecord?.class ? `${studentRecord.class}` : t('N/A')}
                                {studentRecord?.section ? ` - ${studentRecord.section}` : ''}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">{t('Open')}</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.open}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">{t('Resolved')}</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.resolved}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquarePlus className="h-5 w-5 text-blue-600" />
                                {t('Create Complaint')}
                            </CardTitle>
                            <CardDescription>
                                {t('Share the issue clearly so the school team can review it.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!tableReady ? (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                    {t(
                                        'The `complaint_entries` table is not available yet. Run `php artisan migrate` to enable complaints.',
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">{t('Phone')}</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(event) =>
                                                setFormData((current) => ({
                                                    ...current,
                                                    phone: event.target.value,
                                                }))
                                            }
                                            placeholder={t('Contact number')}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="category">{t('Category')}</Label>
                                        <select
                                            id="category"
                                            value={formData.category}
                                            onChange={(event) =>
                                                setFormData((current) => ({
                                                    ...current,
                                                    category: event.target.value,
                                                }))
                                            }
                                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                                            required
                                        >
                                            <option value="">{t('Select category')}</option>
                                            {complaintCategories.map((category) => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="complaint_date">{t('Complaint Date')}</Label>
                                        <Input
                                            id="complaint_date"
                                            type="date"
                                            value={formData.complaint_date}
                                            onChange={(event) =>
                                                setFormData((current) => ({
                                                    ...current,
                                                    complaint_date: event.target.value,
                                                }))
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="note">{t('Complaint Details')}</Label>
                                        <Textarea
                                            id="note"
                                            value={formData.note}
                                            onChange={(event) =>
                                                setFormData((current) => ({
                                                    ...current,
                                                    note: event.target.value,
                                                }))
                                            }
                                            placeholder={t('Describe your complaint')}
                                            rows={5}
                                            required
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700"
                                        disabled={!tableReady}
                                    >
                                        <MessageSquarePlus className="h-4 w-4" />
                                        {t('Submit Complaint')}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle>{t('My Complaints')}</CardTitle>
                            <CardDescription>
                                {t('Review every complaint you have submitted and its latest progress.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {entries.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
                                    <AlertTriangle className="mx-auto h-12 w-12 text-slate-300" />
                                    <p className="mt-4 text-sm text-slate-500">{t('No complaints submitted yet.')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {entries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <p className="text-lg font-semibold text-slate-900">
                                                        {t(entry.category)}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                                        <span className="flex items-center gap-1.5">
                                                            <CalendarDays className="h-4 w-4" />
                                                            {entry.complaint_date}
                                                        </span>
                                                        <span>
                                                            {t('Source:')}
                                                            {entry.source.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </div>
                                                {renderStatusBadge(entry.status)}
                                            </div>

                                            <div className="mt-4 rounded-xl bg-slate-50 p-4">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                                    {t('Complaint')}
                                                </p>
                                                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                                                    {entry.note || t('No details added.')}
                                                </p>
                                            </div>

                                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                                                        <ShieldCheck className="h-4 w-4" />
                                                        {t('Assigned To')}
                                                    </p>
                                                    <p className="mt-2 text-sm font-medium text-slate-900">
                                                        {entry.assigned_to || t('Pending assignment')}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                                        {t('Action Taken')}
                                                    </p>
                                                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                                                        {entry.action_taken || t('No action recorded yet.')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
