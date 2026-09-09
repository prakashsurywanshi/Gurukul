import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { BarChart3, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';

interface Evaluation {
    id: string;
    teacher: string;
    period: string;
    scores: Record<string, number>;
    total_score: number;
    max_score: number;
    strengths?: string | null;
    improvements?: string | null;
    status: string;
    evaluator?: string | null;
    created_at?: string | null;
}

interface OptionItem {
    id: string;
    label: string;
}

interface TeacherEvaluationsProps {
    user: any;
    organization?: any;
    evaluations: Evaluation[];
    teachers: OptionItem[];
    criteria: string[];
    averagePercent: number;
    selectedStatus?: string | null;
    selectedPeriod?: string | null;
}

export default function TeacherEvaluations(pageProps: TeacherEvaluationsProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const evaluations = pageProps.evaluations ?? [];
    const teachers = pageProps.teachers ?? [];
    const criteria = pageProps.criteria ?? [];

    const [selectedStatus, setSelectedStatus] = useState(pageProps.selectedStatus ?? '');
    const [selectedPeriod, setSelectedPeriod] = useState(pageProps.selectedPeriod ?? '');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Evaluation | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        teacher_id: '',
        period: 'Term 1',
        status: 'submitted',
        strengths: '',
        improvements: '',
        scores: {} as Record<string, string>,
    });

    const filter = (data: Record<string, string>) => {
        const next = { status: selectedStatus, period: selectedPeriod, ...data };
        if ('status' in data) setSelectedStatus(data.status);
        if ('period' in data) setSelectedPeriod(data.period);
        router.visit('/teacher-evaluations', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: next,
            only: ['evaluations', 'averagePercent'],
        });
    };

    const openCreate = () => {
        setEditing(null);
        const scores: Record<string, string> = {};
        criteria.forEach((c) => {
            scores[c] = '3';
        });
        setForm({ teacher_id: '', period: 'Term 1', status: 'submitted', strengths: '', improvements: '', scores });
        setShowModal(true);
    };

    const openEdit = (evaluation: Evaluation) => {
        setEditing(evaluation);
        const scores: Record<string, string> = {};
        criteria.forEach((c) => {
            scores[c] = String(evaluation.scores[c] ?? 3);
        });
        setForm({
            teacher_id: '',
            period: evaluation.period,
            status: evaluation.status,
            strengths: evaluation.strengths ?? '',
            improvements: evaluation.improvements ?? '',
            scores,
        });
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const data: Record<string, string | number> = {
            teacher_id: form.teacher_id,
            period: form.period,
            status: form.status,
        };
        if (form.strengths) data.strengths = form.strengths;
        if (form.improvements) data.improvements = form.improvements;
        Object.entries(form.scores).forEach(([criterion, score]) => {
            data[`scores[${criterion}]`] = Number(score || 0);
        });

        router[editing ? 'patch' : 'post'](
            editing ? `/teacher-evaluations/${editing.id}` : '/teacher-evaluations',
            data,
            {
                preserveScroll: true,
                onSuccess: () => setShowModal(false),
                onFinish: () => setSaving(false),
            },
        );
    };

    const remove = (evaluation: Evaluation) => {
        if (!window.confirm(t('Delete this evaluation?'))) return;
        setDeletingId(evaluation.id);
        router.delete(`/teacher-evaluations/${evaluation.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const percentFor = (evaluation: Evaluation) =>
        evaluation.max_score > 0 ? Math.round((evaluation.total_score / evaluation.max_score) * 100) : 0;

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Teacher Evaluations')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Track performance of teaching staff across academic periods.')}
                        </p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('New Evaluation')}
                    </Button>
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BarChart3 className="h-5 w-5 text-blue-500" />
                            {t('Average Rating')}
                            <span className="ml-auto text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {pageProps.averagePercent}%
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                                style={{ width: `${Math.min(100, Math.max(0, pageProps.averagePercent))}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Filter')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label>{t('Status')}</Label>
                                <Select value={selectedStatus} onValueChange={(v) => filter({ status: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All statuses')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">{t('Draft')}</SelectItem>
                                        <SelectItem value="submitted">{t('Submitted')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Period')}</Label>
                                <Select value={selectedPeriod} onValueChange={(v) => filter({ period: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All periods')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['Term 1', 'Term 2', 'Annual'].map((p) => (
                                            <SelectItem key={p} value={p}>
                                                {p}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {evaluations.length === 0 ? (
                    <Card>
                        <CardContent>
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                <BarChart3 className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                {t('No evaluations recorded yet.')}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {evaluations.map((evaluation) => {
                            const percent = percentFor(evaluation);
                            return (
                                <Card key={evaluation.id}>
                                    <CardHeader className="pb-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {evaluation.teacher}
                                            </span>
                                            <Badge variant="outline">{evaluation.period}</Badge>
                                            <Badge
                                                className={
                                                    evaluation.status === 'submitted'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                }
                                            >
                                                {evaluation.status === 'submitted' ? t('Submitted') : t('Draft')}
                                            </Badge>
                                            <span className="ml-auto text-lg font-bold text-blue-600 dark:text-blue-400">
                                                {percent}%
                                            </span>
                                            <div className="flex gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => openEdit(evaluation)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-red-500"
                                                    onClick={() => remove(evaluation)}
                                                    disabled={deletingId === evaluation.id}
                                                >
                                                    {deletingId === evaluation.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                            <div
                                                className="h-2.5 rounded-full bg-blue-500"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            {criteria.map((criterion) => (
                                                <div
                                                    key={criterion}
                                                    className="flex items-center justify-between text-sm"
                                                >
                                                    <span className="text-gray-600 dark:text-gray-300">
                                                        {t(criterion)}
                                                    </span>
                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                        {evaluation.scores[criterion] ?? 0}
                                                        <span className="font-normal text-gray-400">/5</span>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-3 text-sm">
                                            {evaluation.strengths && (
                                                <div>
                                                    <div className="font-medium text-emerald-600 dark:text-emerald-400">
                                                        {t('Strengths')}
                                                    </div>
                                                    <p className="text-gray-600 dark:text-gray-300">
                                                        {evaluation.strengths}
                                                    </p>
                                                </div>
                                            )}
                                            {evaluation.improvements && (
                                                <div>
                                                    <div className="font-medium text-amber-600 dark:text-amber-400">
                                                        {t('Areas for Improvement')}
                                                    </div>
                                                    <p className="text-gray-600 dark:text-gray-300">
                                                        {evaluation.improvements}
                                                    </p>
                                                </div>
                                            )}
                                            {evaluation.evaluator && (
                                                <div className="text-xs text-gray-400">
                                                    {t('Evaluated by')}: {evaluation.evaluator}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editing ? t('Edit Evaluation') : t('New Evaluation')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Teacher')} *</Label>
                                    <Select
                                        value={form.teacher_id}
                                        onValueChange={(v) => setForm({ ...form, teacher_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select teacher')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teachers.map((teach) => (
                                                <SelectItem key={teach.id} value={teach.id}>
                                                    {teach.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Period')} *</Label>
                                    <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['Term 1', 'Term 2', 'Annual'].map((p) => (
                                                <SelectItem key={p} value={p}>
                                                    {p}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3 rounded-lg border p-3">
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Scores (1-5)')}
                                </div>
                                {criteria.map((criterion) => (
                                    <div key={criterion}>
                                        <div className="mb-1 flex items-center justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-300">{t(criterion)}</span>
                                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                {form.scores[criterion] ?? 0}
                                            </span>
                                        </div>
                                        <Slider
                                            min={1}
                                            max={5}
                                            step={1}
                                            value={[Number(form.scores[criterion] ?? 3)]}
                                            onValueChange={(v) =>
                                                setForm({
                                                    ...form,
                                                    scores: { ...form.scores, [criterion]: String(v[0] ?? 3) },
                                                })
                                            }
                                        />
                                    </div>
                                ))}
                            </div>

                            <div>
                                <Label>{t('Strengths')}</Label>
                                <Textarea
                                    rows={2}
                                    value={form.strengths}
                                    onChange={(e) => setForm({ ...form, strengths: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>{t('Areas for Improvement')}</Label>
                                <Textarea
                                    rows={2}
                                    value={form.improvements}
                                    onChange={(e) => setForm({ ...form, improvements: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>{t('Status')}</Label>
                                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">{t('Draft')}</SelectItem>
                                        <SelectItem value="submitted">{t('Submitted')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editing ? t('Save Changes') : t('New Evaluation')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
