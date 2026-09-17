import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { FileDown, FileText, FolderOpen, Link2, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';

interface Material {
    id: string;
    title: string;
    description?: string | null;
    class?: string | null;
    subject?: string | null;
    url?: string | null;
    type: string;
    attachmentUrl?: string;
    uploaded_by?: string | null;
    created_at?: string | null;
}

interface ClassOption {
    id: string;
    label: string;
}

interface SubjectOption {
    id: string;
    label: string;
}

interface StudyMaterialsProps {
    user: any;
    organization?: any;
    materials: Material[];
    classes: ClassOption[];
    subjects: SubjectOption[];
    selectedClassId?: string | null;
    selectedSubjectId?: string | null;
}

const TYPE_BADGE: Record<string, string> = {
    note: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    link: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    file: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'application/pdf': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export default function StudyMaterials(pageProps: StudyMaterialsProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const materials = pageProps.materials ?? [];
    const classes = pageProps.classes ?? [];
    const subjects = pageProps.subjects ?? [];

    const [selectedClassId, setSelectedClassId] = useState(pageProps.selectedClassId ?? '');
    const [selectedSubjectId, setSelectedSubjectId] = useState(pageProps.selectedSubjectId ?? '');
    const [showModal, setShowModal] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: '',
        description: '',
        class_id: '',
        subject_id: '',
        url: '',
    });
    const [formFile, setFormFile] = useState<File | null>(null);

    const filter = (key: string, value: string) => {
        if (key === 'class_id') setSelectedClassId(value);
        else setSelectedSubjectId(value);
        router.visit('/study-materials', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: {
                class_id: key === 'class_id' ? value : selectedClassId,
                subject_id: key === 'subject_id' ? value : selectedSubjectId,
            },
            only: ['materials'],
        });
    };

    const openCreate = () => {
        setEditingMaterial(null);
        setForm({ title: '', description: '', class_id: '', subject_id: '', url: '' });
        setFormFile(null);
        setShowModal(true);
    };

    const openEdit = (material: Material) => {
        setEditingMaterial(material);
        setForm({
            title: material.title,
            description: material.description ?? '',
            class_id: '',
            subject_id: '',
            url: material.url ?? '',
        });
        setFormFile(null);
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const fd = new FormData();
        fd.append('title', form.title);
        if (form.description) fd.append('description', form.description);
        if (form.class_id) fd.append('class_id', form.class_id);
        if (form.subject_id) fd.append('subject_id', form.subject_id);
        if (form.url) fd.append('url', form.url);
        if (formFile) fd.append('file', formFile);

        const url = editingMaterial ? `/study-materials/${editingMaterial.id}` : '/study-materials';
        if (editingMaterial) {
            fd.append('_method', 'PATCH');
        }
        router.post(url, fd, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false),
            onFinish: () => setSaving(false),
        });
    };

    const remove = (material: Material) => {
        if (!window.confirm(t('Delete this material?'))) return;
        setDeletingId(material.id);
        router.delete(`/study-materials/${material.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const canManage = ['admin', 'super_admin', 'teacher'].includes(user?.role);

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Manage Resources')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Upload and share study materials, assignments, and reference documents with students.')}
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Add Material')}
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5 text-blue-500" />
                            {t('Filter')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label>{t('Class')}</Label>
                                <Select value={selectedClassId} onValueChange={(v) => filter('class_id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All classes')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((cls) => (
                                            <SelectItem key={cls.id} value={cls.id}>
                                                {cls.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Subject')}</Label>
                                <Select value={selectedSubjectId} onValueChange={(v) => filter('subject_id', v)}>
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
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        {materials.length === 0 ? (
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                <FolderOpen className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                {t('No study materials uploaded yet.')}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Title')}</TableHead>
                                        <TableHead>{t('Class')}</TableHead>
                                        <TableHead>{t('Subject')}</TableHead>
                                        <TableHead>{t('Type')}</TableHead>
                                        <TableHead>{t('Uploaded By')}</TableHead>
                                        <TableHead>{t('Date')}</TableHead>
                                        {canManage && <TableHead className="text-right">{t('Actions')}</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {materials.map((material) => (
                                        <TableRow key={material.id}>
                                            <TableCell>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {material.title}
                                                </p>
                                                {material.description && (
                                                    <p className="max-w-xs truncate text-xs text-gray-500">
                                                        {material.description}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">{material.class ?? '—'}</TableCell>
                                            <TableCell className="text-sm">{material.subject ?? '—'}</TableCell>
                                            <TableCell>
                                                <Badge className={TYPE_BADGE[material.type] ?? ''}>
                                                    {material.type === 'link' ? (
                                                        <span className="flex items-center gap-1">
                                                            <Link2 className="h-3 w-3" />
                                                            Link
                                                        </span>
                                                    ) : material.type === 'note' ? (
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="h-3 w-3" />
                                                            {t('Note')}</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1">
                                                            <FileDown className="h-3 w-3" />
                                                            {t('File')}</span>
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{material.uploaded_by ?? '—'}</TableCell>
                                            <TableCell className="whitespace-nowrap text-sm">
                                                {material.created_at ?? '—'}
                                            </TableCell>
                                            {canManage && (
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {material.attachmentUrl && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    window.open(material.attachmentUrl, '_blank')
                                                                }
                                                            >
                                                                <FileDown className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => openEdit(material)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => remove(material)}
                                                            disabled={deletingId === material.id}
                                                        >
                                                            {deletingId === material.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4 text-red-500" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingMaterial ? t('Edit Material') : t('Add Material')}
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
                                    required
                                />
                                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                            </div>
                            <div>
                                <Label>{t('Description')}</Label>
                                <Textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Class')}</Label>
                                    <Select
                                        value={form.class_id}
                                        onValueChange={(v) => setForm({ ...form, class_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Optional')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map((cls) => (
                                                <SelectItem key={cls.id} value={cls.id}>
                                                    {cls.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Subject')}</Label>
                                    <Select
                                        value={form.subject_id}
                                        onValueChange={(v) => setForm({ ...form, subject_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Optional')} />
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
                            </div>
                            <div>
                                <Label>{t('URL')}</Label>
                                <Input
                                    type="url"
                                    value={form.url}
                                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                                    placeholder="https://"
                                />
                                {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url}</p>}
                            </div>
                            <div>
                                <Label>{t('Upload File')}</Label>
                                <Input
                                    type="file"
                                    onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    {t('Max 20 MB. Supports PDF, Office docs, ZIP.')}
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingMaterial ? t('Save Changes') : t('Add Material')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
