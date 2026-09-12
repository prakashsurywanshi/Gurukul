import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { BookOpenCheck, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Textarea } from '../ui/textarea';

interface SyllabusUnit {
    id: string;
    title: string;
    book?: string | null;
    term: number;
    topics?: string | null;
    coverage_percent: number;
    covered_at?: string | null;
    class?: string | null;
    subject?: string | null;
    updated_by?: string | null;
}

interface OptionItem {
    id: string;
    label: string;
}

interface SyllabusCoverageProps {
    user: any;
    organization?: any;
    units: SyllabusUnit[];
    classes: OptionItem[];
    subjects: OptionItem[];
    coveredPercent: number;
    selectedClassId?: string | null;
    selectedSubjectId?: string | null;
    selectedTerm?: string | null;
}

export default function SyllabusCoverage(pageProps: SyllabusCoverageProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const units = pageProps.units ?? [];
    const classes = pageProps.classes ?? [];
    const subjects = pageProps.subjects ?? [];
    const coveredPercent = pageProps.coveredPercent ?? 0;

    const [selectedClassId, setSelectedClassId] = useState(pageProps.selectedClassId ?? '');
    const [selectedSubjectId, setSelectedSubjectId] = useState(pageProps.selectedSubjectId ?? '');
    const [selectedTerm, setSelectedTerm] = useState(pageProps.selectedTerm ?? '');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<SyllabusUnit | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: '',
        class_id: '',
        subject_id: '',
        book: '',
        term: '1',
        topics: '',
        coverage_percent: '0',
    });

    const canManage = ['admin', 'super_admin', 'teacher'].includes(user?.role);

    const filter = (data: Record<string, string>) => {
        const next = { class_id: selectedClassId, subject_id: selectedSubjectId, term: selectedTerm, ...data };
        if ('class_id' in data) setSelectedClassId(data.class_id);
        if ('subject_id' in data) setSelectedSubjectId(data.subject_id);
        if ('term' in data) setSelectedTerm(data.term);
        router.visit('/syllabus', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: next,
            only: ['units', 'coveredPercent'],
        });
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ title: '', class_id: '', subject_id: '', book: '', term: '1', topics: '', coverage_percent: '0' });
        setShowModal(true);
    };

    const openEdit = (unit: SyllabusUnit) => {
        setEditing(unit);
        setForm({
            title: unit.title,
            class_id: '',
            subject_id: '',
            book: unit.book ?? '',
            term: String(unit.term),
            topics: unit.topics ?? '',
            coverage_percent: String(unit.coverage_percent),
        });
        setShowModal(true);
    };

    const openCoverage = (unit: SyllabusUnit) => {
        setEditing(unit);
        setForm({
            title: unit.title,
            class_id: '',
            subject_id: '',
            book: unit.book ?? '',
            term: String(unit.term),
            topics: unit.topics ?? '',
            coverage_percent: String(unit.coverage_percent),
        });
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const data: Record<string, string> = {
            title: form.title,
            term: form.term,
            coverage_percent: form.coverage_percent,
        };
        if (form.class_id) data.class_id = form.class_id;
        if (form.subject_id) data.subject_id = form.subject_id;
        if (form.book) data.book = form.book;
        if (form.topics) data.topics = form.topics;

        router[editing ? 'patch' : 'post'](editing ? `/syllabus/${editing.id}` : '/syllabus', data, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false),
            onFinish: () => setSaving(false),
        });
    };

    const remove = (unit: SyllabusUnit) => {
        if (!window.confirm(t('Delete this syllabus unit?'))) return;
        setDeletingId(unit.id);
        router.delete(`/syllabus/${unit.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const coverageColor = (value: number) =>
        value >= 100 ? 'bg-green-500' : value >= 50 ? 'bg-blue-500' : value > 0 ? 'bg-amber-500' : 'bg-gray-300';

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Manage Syllabus')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Track unit-by-unit progress against the curriculum for every term.')}
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Add Unit')}
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BookOpenCheck className="h-5 w-5 text-blue-500" />
                            {t('Overall Coverage')}
                            <span className="ml-auto text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {coveredPercent}%
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                                style={{ width: `${Math.min(100, Math.max(0, coveredPercent))}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Filter')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                                <Label>{t('Class')}</Label>
                                <Select value={selectedClassId} onValueChange={(v) => filter({ class_id: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All classes')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Subject')}</Label>
                                <Select value={selectedSubjectId} onValueChange={(v) => filter({ subject_id: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All subjects')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((sub) => (
                                            <SelectItem key={sub.id} value={sub.id}>
                                                {sub.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Term')}</Label>
                                <Select value={selectedTerm} onValueChange={(v) => filter({ term: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All terms')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">{t('Term 1')}</SelectItem>
                                        <SelectItem value="2">{t('Term 2')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {units.length === 0 ? (
                    <Card>
                        <CardContent>
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                <BookOpenCheck className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                {t('No syllabus units added yet.')}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="divide-y">
                            {units.map((unit) => (
                                <div
                                    key={unit.id}
                                    className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:gap-4"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {unit.title}
                                            </span>
                                            {unit.coverage_percent >= 100 && (
                                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                                    {t('Covered')}
                                                </Badge>
                                            )}
                                            <span className="text-xs text-gray-500">
                                                {unit.class} &middot; {unit.subject} &middot; {t('Term')} {unit.term}
                                            </span>
                                        </div>
                                        {unit.book && <div className="mt-1 text-xs text-gray-500">{unit.book}</div>}
                                        {unit.topics && (
                                            <div className="mt-1 line-clamp-1 text-xs text-gray-400">{unit.topics}</div>
                                        )}
                                    </div>
                                    <div className="flex w-full items-center gap-3 sm:w-56">
                                        <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                            <div
                                                className={`h-2.5 rounded-full ${coverageColor(unit.coverage_percent)}`}
                                                style={{
                                                    width: `${Math.min(100, Math.max(0, unit.coverage_percent))}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="w-10 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                                            {unit.coverage_percent}%
                                        </span>
                                        {canManage && (
                                            <div className="flex gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => openCoverage(unit)}
                                                    title={t('Update Coverage')}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-red-500"
                                                    onClick={() => remove(unit)}
                                                    disabled={deletingId === unit.id}
                                                >
                                                    {deletingId === unit.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editing ? t('Edit Unit') : t('Add Unit')}
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
                            <div>
                                <Label>{t('Unit Title')} *</Label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <Label>{t('Class')} *</Label>
                                    <Select
                                        value={form.class_id}
                                        onValueChange={(v) => setForm({ ...form, class_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All classes')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Subject')} *</Label>
                                    <Select
                                        value={form.subject_id}
                                        onValueChange={(v) => setForm({ ...form, subject_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All subjects')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjects.map((sub) => (
                                                <SelectItem key={sub.id} value={sub.id}>
                                                    {sub.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Term')}</Label>
                                    <Select value={form.term} onValueChange={(v) => setForm({ ...form, term: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">{t('Term 1')}</SelectItem>
                                            <SelectItem value="2">{t('Term 2')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>{t('Book')}</Label>
                                <Input value={form.book} onChange={(e) => setForm({ ...form, book: e.target.value })} />
                            </div>
                            <div>
                                <Label>{t('Topics')}</Label>
                                <Textarea
                                    value={form.topics}
                                    onChange={(e) => setForm({ ...form, topics: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div>
                                <Label>{t('Coverage')} (%)</Label>
                                <Slider
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={[Number(form.coverage_percent || 0)]}
                                    onValueChange={(v) => setForm({ ...form, coverage_percent: String(v[0] ?? 0) })}
                                />
                                <div className="mt-1 text-right text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {form.coverage_percent}%
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editing ? t('Save Changes') : t('Add Unit')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
