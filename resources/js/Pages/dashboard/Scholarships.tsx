import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { BadgePercent, Loader2, Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface Scholarship {
    id: string;
    title: string;
    student: string;
    admission_no?: string | null;
    class?: string | null;
    year?: string | null;
    type: string;
    value: number;
    category: string;
    notes?: string | null;
    status: string;
    approved_by?: string | null;
    total_amount: number;
    discount_applied: number;
}

interface OptionItem {
    id: string;
    label: string;
}

interface ScholarshipsProps {
    user: any;
    organization?: any;
    scholarships: Scholarship[];
    classes: OptionItem[];
    students: OptionItem[];
    sessionName: string;
    totalDiscount: number;
    selectedStatus?: string | null;
    selectedCategory?: string | null;
}

const CATEGORY_LABEL: Record<string, string> = {
    merit: 'Merit',
    needs_based: 'Needs Based',
    sports: 'Sports',
    other: 'Other',
};

export default function Scholarships(pageProps: ScholarshipsProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const scholarships = pageProps.scholarships ?? [];
    const students = pageProps.students ?? [];
    const classes = pageProps.classes ?? [];

    const [selectedStatus, setSelectedStatus] = useState(pageProps.selectedStatus ?? '');
    const [selectedCategory, setSelectedCategory] = useState(pageProps.selectedCategory ?? '');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Scholarship | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: '',
        student_id: '',
        type: 'percent',
        value: '',
        category: 'merit',
        notes: '',
        status: 'active',
    });

    const canManage = ['admin', 'super_admin', 'accountant'].includes(user?.role);

    const filter = (data: Record<string, string>) => {
        const next = { status: selectedStatus, category: selectedCategory, ...data };
        if ('status' in data) setSelectedStatus(data.status);
        if ('category' in data) setSelectedCategory(data.category);
        router.visit('/scholarships', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: next,
            only: ['scholarships', 'totalDiscount'],
        });
    };

    const openCreate = () => {
        setEditing(null);
        setForm({
            title: '',
            student_id: '',
            type: 'percent',
            value: '',
            category: 'merit',
            notes: '',
            status: 'active',
        });
        setShowModal(true);
    };

    const openEdit = (scholarship: Scholarship) => {
        setEditing(scholarship);
        setForm({
            title: scholarship.title,
            student_id: '',
            type: scholarship.type,
            value: String(scholarship.value),
            category: scholarship.category,
            notes: scholarship.notes ?? '',
            status: scholarship.status,
        });
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const data: Record<string, string> = {
            title: form.title,
            student_id: form.student_id,
            type: form.type,
            value: form.value,
            category: form.category,
            status: form.status,
        };
        if (form.notes) data.notes = form.notes;

        router[editing ? 'patch' : 'post'](editing ? `/scholarships/${editing.id}` : '/scholarships', data, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false),
            onFinish: () => setSaving(false),
        });
    };

    const toggle = (scholarship: Scholarship) => {
        setTogglingId(scholarship.id);
        router.patch(
            `/scholarships/${scholarship.id}/toggle`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setTogglingId(null),
            },
        );
    };

    const remove = (scholarship: Scholarship) => {
        if (!window.confirm(t('Remove this scholarship?'))) return;
        setDeletingId(scholarship.id);
        router.delete(`/scholarships/${scholarship.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Scholarship & Discounts')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t(
                                'Assign merit, needs-based, or sports scholarships. Concessions apply to active student fees.',
                            )}
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Assign Scholarship')}
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BadgePercent className="h-5 w-5 text-blue-500" />
                            {t('Session {session}', { session: pageProps.sessionName })}
                            <span className="ml-auto text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {t('₹{amount} conceded', {
                                    amount: Number(pageProps.totalDiscount ?? 0).toLocaleString(),
                                })}
                            </span>
                        </CardTitle>
                    </CardHeader>
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
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Category')}</Label>
                                <Select value={selectedCategory} onValueChange={(v) => filter({ category: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All categories')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="merit">{t('Merit')}</SelectItem>
                                        <SelectItem value="needs_based">{t('Needs Based')}</SelectItem>
                                        <SelectItem value="sports">{t('Sports')}</SelectItem>
                                        <SelectItem value="other">{t('Other')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {scholarships.length === 0 ? (
                    <Card>
                        <CardContent>
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                <BadgePercent className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                {t('No scholarships assigned yet.')}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="divide-y">
                            {scholarships.map((scholarship) => (
                                <div
                                    key={scholarship.id}
                                    className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:gap-4"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {scholarship.title}
                                            </span>
                                            <Badge
                                                className={
                                                    scholarship.status === 'active'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                                }
                                            >
                                                {scholarship.status === 'active' ? t('Active') : t('Inactive')}
                                            </Badge>
                                            <span className="text-xs text-gray-500">
                                                {t(CATEGORY_LABEL[scholarship.category] ?? scholarship.category)}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                            {scholarship.student}
                                            {scholarship.admission_no && (
                                                <span className="ml-1 text-xs text-gray-400">
                                                    ({scholarship.admission_no})
                                                </span>
                                            )}
                                            {scholarship.class && (
                                                <span className="ml-2 text-xs text-gray-400">{scholarship.class}</span>
                                            )}
                                        </div>
                                        {scholarship.notes && (
                                            <div className="mt-1 line-clamp-1 text-xs text-gray-400">
                                                {scholarship.notes}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                                {scholarship.type === 'percent'
                                                    ? `${scholarship.value}%`
                                                    : `₹${Number(scholarship.value).toLocaleString()}`}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {t('Fee conceded')}:{' '}
                                                {Number(scholarship.discount_applied).toLocaleString()}
                                            </div>
                                        </div>
                                        {canManage && (
                                            <div className="flex gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => openEdit(scholarship)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => toggle(scholarship)}
                                                    disabled={togglingId === scholarship.id}
                                                    title={
                                                        scholarship.status === 'active'
                                                            ? t('Deactivate')
                                                            : t('Activate')
                                                    }
                                                >
                                                    {togglingId === scholarship.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Power className="h-3.5 w-3.5 text-amber-500" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-red-500"
                                                    onClick={() => remove(scholarship)}
                                                    disabled={deletingId === scholarship.id}
                                                >
                                                    {deletingId === scholarship.id ? (
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
                                {editing ? t('Edit Scholarship') : t('Assign Scholarship')}
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
                                <Label>{t('Title')} *</Label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder={t('e.g. Merit Scholarship 2026')}
                                    required
                                />
                            </div>
                            <div>
                                <Label>{t('Student')} *</Label>
                                <Select
                                    value={form.student_id}
                                    onValueChange={(v) => setForm({ ...form, student_id: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select student')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Type')}</Label>
                                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percent">{t('Percentage')}</SelectItem>
                                            <SelectItem value="fixed">{t('Fixed Amount')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{form.type === 'percent' ? t('Percentage %') : t('Amount')} *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.value}
                                        onChange={(e) => setForm({ ...form, value: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Category')}</Label>
                                    <Select
                                        value={form.category}
                                        onValueChange={(v) => setForm({ ...form, category: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="merit">{t('Merit')}</SelectItem>
                                            <SelectItem value="needs_based">{t('Needs Based')}</SelectItem>
                                            <SelectItem value="sports">{t('Sports')}</SelectItem>
                                            <SelectItem value="other">{t('Other')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Status')}</Label>
                                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>{t('Notes')}</Label>
                                <Textarea
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editing ? t('Save Changes') : t('Assign Scholarship')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
