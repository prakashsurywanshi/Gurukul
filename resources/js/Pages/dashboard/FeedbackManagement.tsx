import { useLanguage } from '../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ClipboardPenLine, Eye, MessageSquare, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { formatDate } from '../ui/utils';
import { toast } from 'sonner';

interface FeedbackManagementProps {
    user: any;
    schoolName: string;
    teacherCount: number;
    studentCount: number;
    teachers: TeacherRecord[];
    campaigns: FeedbackCampaignRecord[];
}

interface TeacherRecord {
    id: string;
    name: string;
    email?: string | null;
}

interface FeedbackCampaignRecord {
    id: string;
    title: string;
    description?: string | null;
    dueDate?: string | null;
    status: 'active' | 'closed';
    createdAt?: string | null;
    createdBy: string;
    expectedResponses: number;
    receivedResponses: number;
    submittedStudents: number;
    totalStudents: number;
    teacherSummaries: {
        teacherId?: string | null;
        teacherName: string;
        averageRating: number;
        responseCount: number;
    }[];
}

export default function FeedbackManagement({
    user,
    teacherCount,
    studentCount,
    teachers,
    campaigns,
}: FeedbackManagementProps) {
    const { t } = useLanguage();
    const flash = usePage<{ flash?: { success?: string; error?: string } }>().props.flash ?? {};
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
    const [viewingCampaign, setViewingCampaign] = useState<FeedbackCampaignRecord | null>(null);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
    const [isCampaignFormOpen, setIsCampaignFormOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        due_date: '',
        status: 'active',
    });

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const selectedTeacher = useMemo(
        () => teachers.find((teacher) => teacher.id === selectedTeacherId) ?? null,
        [selectedTeacherId, teachers],
    );

    const teacherAverageStats = useMemo(() => {
        if (!viewingCampaign || selectedTeacherId === 'all') {
            return null;
        }

        const summaries = viewingCampaign.teacherSummaries.filter((summary) => summary.teacherId === selectedTeacherId);

        if (summaries.length === 0) {
            return {
                averageRating: 0,
                responseCount: 0,
                campaignCount: 0,
            };
        }

        const totalResponses = summaries.reduce((sum, summary) => sum + summary.responseCount, 0);
        const weightedRatingTotal = summaries.reduce(
            (sum, summary) => sum + summary.averageRating * summary.responseCount,
            0,
        );

        return {
            averageRating: totalResponses > 0 ? Number((weightedRatingTotal / totalResponses).toFixed(1)) : 0,
            responseCount: totalResponses,
            campaignCount: summaries.length,
        };
    }, [selectedTeacherId, viewingCampaign]);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!formData.title.trim()) {
            toast.error('Feedback title is required');
            return;
        }

        const onSuccess = () => {
            setEditingCampaignId(null);
            setFormData({
                title: '',
                description: '',
                due_date: '',
                status: 'active',
            });
            setIsCampaignFormOpen(false);
        };

        if (editingCampaignId) {
            router.patch(`/feedback/${editingCampaignId}`, formData, {
                preserveScroll: true,
                onSuccess,
            });
            return;
        }

        router.post('/feedback', formData, {
            preserveScroll: true,
            onSuccess,
        });
    };

    const openCreateDialog = () => {
        setEditingCampaignId(null);
        setFormData({
            title: '',
            description: '',
            due_date: '',
            status: 'active',
        });
        setIsCampaignFormOpen(true);
    };

    const handleEdit = (campaign: FeedbackCampaignRecord) => {
        setEditingCampaignId(campaign.id);
        setFormData({
            title: campaign.title,
            description: campaign.description || '',
            due_date: campaign.dueDate || '',
            status: campaign.status,
        });
        setIsCampaignFormOpen(true);
    };

    const handleDelete = (campaign: FeedbackCampaignRecord) => {
        if (!window.confirm(`Delete feedback campaign "${campaign.title}"?`)) {
            return;
        }

        router.delete(`/feedback/${campaign.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (editingCampaignId === campaign.id) {
                    setEditingCampaignId(null);
                    setFormData({
                        title: '',
                        description: '',
                        due_date: '',
                        status: 'active',
                    });
                    setIsCampaignFormOpen(false);
                }
            },
        });
    };

    const resetForm = () => {
        setEditingCampaignId(null);
        setFormData({
            title: '',
            description: '',
            due_date: '',
            status: 'active',
        });
        setIsCampaignFormOpen(false);
    };

    return (
        <DashboardLayout user={user} activeTab="feedback">
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('Feedback Management')}</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            {t(
                                'Create feedback campaigns and track how many students have submitted feedback for all teachers.',
                            )}
                        </p>
                    </div>
                    <Button type="button" className="gap-2 self-start" onClick={openCreateDialog}>
                        <Plus className="h-4 w-4" />
                        {t('Create Feedback Campaign')}
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">{t('Campaigns')}</p>
                                    <p className="text-2xl font-bold">{campaigns.length}</p>
                                </div>
                                <ClipboardPenLine className="h-8 w-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">{t('Teachers')}</p>
                                    <p className="text-2xl font-bold">{teacherCount}</p>
                                </div>
                                <Users className="h-8 w-8 text-emerald-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">{t('Students')}</p>
                                    <p className="text-2xl font-bold">{studentCount}</p>
                                </div>
                                <Users className="h-8 w-8 text-violet-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">{t('Responses')}</p>
                                    <p className="text-2xl font-bold">
                                        {campaigns.reduce((sum, campaign) => sum + campaign.receivedResponses, 0)}
                                    </p>
                                </div>
                                <MessageSquare className="h-8 w-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Feedback Campaigns')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {campaigns.length === 0 ? (
                            <div className="py-12 text-center text-slate-500">
                                {t('No feedback campaigns created yet.')}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {campaigns.map((campaign) => (
                                    <div
                                        key={campaign.id}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                    >
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-lg font-semibold text-slate-900">
                                                        {t(campaign.title)}
                                                    </h3>
                                                    <Badge
                                                        variant={campaign.status === 'active' ? 'default' : 'secondary'}
                                                    >
                                                        {t(campaign.status)}
                                                    </Badge>
                                                </div>
                                                {campaign.description ? (
                                                    <p className="line-clamp-2 text-sm text-slate-600">
                                                        {t(campaign.description)}
                                                    </p>
                                                ) : null}
                                                <p className="text-sm text-slate-500">
                                                    {t('Created by')}
                                                    {campaign.createdBy}
                                                    {campaign.createdAt ? ` on ${formatDate(campaign.createdAt)}` : ''}
                                                    {campaign.dueDate ? ` | Due ${formatDate(campaign.dueDate)}` : ''}
                                                </p>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                                        {t('Responses')}
                                                    </p>
                                                    <p className="mt-1 text-xl font-bold text-slate-900">
                                                        {campaign.receivedResponses}/{campaign.expectedResponses}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                                        {t('Students Done')}
                                                    </p>
                                                    <p className="mt-1 text-xl font-bold text-slate-900">
                                                        {campaign.submittedStudents}/{campaign.totalStudents}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                                        {t('Teachers Rated')}
                                                    </p>
                                                    <p className="mt-1 text-xl font-bold text-slate-900">
                                                        {campaign.teacherSummaries.length}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="gap-2"
                                                onClick={() => {
                                                    setSelectedTeacherId('all');
                                                    setViewingCampaign(campaign);
                                                }}
                                            >
                                                <Eye className="h-4 w-4" />
                                                {t('View')}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="gap-2"
                                                onClick={() => handleEdit(campaign)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                                {t('Edit')}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="gap-2 text-rose-600 hover:text-rose-700"
                                                onClick={() => handleDelete(campaign)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                {t('Delete')}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog
                    open={isCampaignFormOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            resetForm();
                            return;
                        }

                        setIsCampaignFormOpen(true);
                    }}
                >
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingCampaignId ? t('Edit Feedback Campaign') : t('Create Feedback Campaign')}
                            </DialogTitle>
                            <DialogDescription>
                                {editingCampaignId
                                    ? t('Update the campaign details and keep feedback collection aligned.')
                                    : t('Set up a new campaign so students can begin submitting feedback.')}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t('Title')}</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            title: event.target.value,
                                        }))
                                    }
                                    placeholder={t('Teacher Performance Feedback')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Due Date')}</Label>
                                <Input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            due_date: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Status')}</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                    value={formData.status}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            status: event.target.value,
                                        }))
                                    }
                                >
                                    <option value="active">{t('Active')}</option>
                                    <option value="closed">{t('Closed')}</option>
                                </select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t('Description')}</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            description: event.target.value,
                                        }))
                                    }
                                    placeholder={t('Students will submit feedback for every teacher in this campaign.')}
                                    rows={4}
                                />
                            </div>
                            <div className="flex justify-end gap-2 md:col-span-2">
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit">
                                    {editingCampaignId ? t('Update Feedback') : t('Create Feedback')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={Boolean(viewingCampaign)} onOpenChange={(open) => !open && setViewingCampaign(null)}>
                    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>{viewingCampaign?.title || t('Feedback Campaign Details')}</DialogTitle>
                            <DialogDescription>
                                {t('Review campaign progress and teacher-wise feedback results in one place.')}
                            </DialogDescription>
                        </DialogHeader>

                        {viewingCampaign ? (
                            <div className="space-y-5">
                                <div className="grid gap-4 md:grid-cols-[minmax(0,220px)_repeat(3,minmax(0,1fr))]">
                                    <div className="space-y-2">
                                        <Label htmlFor="view-teacher-filter">{t('Filter by Teacher')}</Label>
                                        <select
                                            id="view-teacher-filter"
                                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                            value={selectedTeacherId}
                                            onChange={(event) => setSelectedTeacherId(event.target.value)}
                                        >
                                            <option value="all">{t('All Teachers')}</option>
                                            {teachers.map((teacher) => (
                                                <option key={teacher.id} value={teacher.id}>
                                                    {teacher.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 px-4 py-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            {t('Selected Teacher')}
                                        </p>
                                        <p className="mt-2 text-lg font-semibold text-slate-900">
                                            {selectedTeacher?.name ?? t('All Teachers')}
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 px-4 py-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            {t('Average Rating')}
                                        </p>
                                        <p className="mt-2 text-lg font-semibold text-slate-900">
                                            {teacherAverageStats
                                                ? `${teacherAverageStats.averageRating}/5`
                                                : t('All Teachers')}
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 px-4 py-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            {t('Responses')}
                                        </p>
                                        <p className="mt-2 text-lg font-semibold text-slate-900">
                                            {teacherAverageStats
                                                ? teacherAverageStats.responseCount
                                                : viewingCampaign.receivedResponses}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-4">
                                    <div className="rounded-xl bg-slate-50 px-4 py-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">{t('Status')}</p>
                                        <p className="mt-2 text-lg font-semibold text-slate-900">
                                            {t(viewingCampaign.status)}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 px-4 py-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            {t('Responses')}
                                        </p>
                                        <p className="mt-2 text-lg font-semibold text-slate-900">
                                            {viewingCampaign.receivedResponses}/{viewingCampaign.expectedResponses}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 px-4 py-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            {t('Students Done')}
                                        </p>
                                        <p className="mt-2 text-lg font-semibold text-slate-900">
                                            {viewingCampaign.submittedStudents}/{viewingCampaign.totalStudents}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 px-4 py-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            {t('Teachers Rated')}
                                        </p>
                                        <p className="mt-2 text-lg font-semibold text-slate-900">
                                            {viewingCampaign.teacherSummaries.length}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-4">
                                    <p className="text-sm text-slate-500">
                                        {t('Created by')}
                                        {viewingCampaign.createdBy}
                                        {viewingCampaign.createdAt
                                            ? ` on ${formatDate(viewingCampaign.createdAt)}`
                                            : ''}
                                        {viewingCampaign.dueDate ? ` | Due ${formatDate(viewingCampaign.dueDate)}` : ''}
                                    </p>
                                    {viewingCampaign.description ? (
                                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                                            {t(viewingCampaign.description)}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="rounded-xl border border-slate-200">
                                    <div className="grid grid-cols-[minmax(0,1fr)_140px_140px] gap-4 border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-500">
                                        <span>{t('Teacher')}</span>
                                        <span>{t('Avg Rating')}</span>
                                        <span>{t('Responses')}</span>
                                    </div>
                                    {(selectedTeacherId === 'all'
                                        ? viewingCampaign.teacherSummaries
                                        : viewingCampaign.teacherSummaries.filter(
                                              (summary) => summary.teacherId === selectedTeacherId,
                                          )
                                    ).length === 0 ? (
                                        <div className="px-4 py-8 text-sm text-slate-500">
                                            {t('No student responses yet.')}
                                        </div>
                                    ) : (
                                        (selectedTeacherId === 'all'
                                            ? viewingCampaign.teacherSummaries
                                            : viewingCampaign.teacherSummaries.filter(
                                                  (summary) => summary.teacherId === selectedTeacherId,
                                              )
                                        ).map((summary) => (
                                            <div
                                                key={`${viewingCampaign.id}-${summary.teacherId ?? summary.teacherName}`}
                                                className="grid grid-cols-[minmax(0,1fr)_140px_140px] gap-4 px-4 py-3 text-sm text-slate-700"
                                            >
                                                <span>{summary.teacherName}</span>
                                                <span>{summary.averageRating}/5</span>
                                                <span>{summary.responseCount}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
