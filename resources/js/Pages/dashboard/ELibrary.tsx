import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { ExternalLink, FileDown, LibraryBig, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface Ebook {
    id: string;
    title: string;
    author?: string | null;
    isbn?: string | null;
    type: string;
    description?: string | null;
    url?: string | null;
    subject?: string | null;
    thumbnail?: string | null;
    downloadUrl?: string;
    uploaded_by?: string | null;
}

interface OptionItem {
    id: string;
    label: string;
}

interface ELibraryProps {
    user: any;
    organization?: any;
    ebooks: Ebook[];
    subjects: OptionItem[];
    selectedType?: string | null;
    selectedSubjectId?: string | null;
}

const TYPE_BADGE: Record<string, string> = {
    ebook: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    video: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    journal: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    audio: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export default function ELibrary(pageProps: ELibraryProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const ebooks = pageProps.ebooks ?? [];
    const subjects = pageProps.subjects ?? [];

    const [selectedType, setSelectedType] = useState(pageProps.selectedType ?? '');
    const [selectedSubjectId, setSelectedSubjectId] = useState(pageProps.selectedSubjectId ?? '');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Ebook | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: '',
        author: '',
        isbn: '',
        type: 'ebook',
        description: '',
        url: '',
        subject_id: '',
    });
    const [file, setFile] = useState<File | null>(null);

    const canManage = ['admin', 'super_admin', 'librarian', 'teacher'].includes(user?.role);

    const filter = (data: Record<string, string>) => {
        const next = { type: selectedType, subject_id: selectedSubjectId, ...data };
        if ('type' in data) setSelectedType(data.type);
        if ('subject_id' in data) setSelectedSubjectId(data.subject_id);
        router.visit('/e-library', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: next,
            only: ['ebooks'],
        });
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ title: '', author: '', isbn: '', type: 'ebook', description: '', url: '', subject_id: '' });
        setFile(null);
        setShowModal(true);
    };

    const openEdit = (ebook: Ebook) => {
        setEditing(ebook);
        setForm({
            title: ebook.title,
            author: ebook.author ?? '',
            isbn: ebook.isbn ?? '',
            type: ebook.type,
            description: ebook.description ?? '',
            url: ebook.url ?? '',
            subject_id: '',
        });
        setFile(null);
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const fd = new FormData();
        fd.append('title', form.title);
        if (form.author) fd.append('author', form.author);
        if (form.isbn) fd.append('isbn', form.isbn);
        fd.append('type', form.type);
        if (form.description) fd.append('description', form.description);
        if (form.url) fd.append('url', form.url);
        if (form.subject_id) fd.append('subject_id', form.subject_id);
        if (file) fd.append('file', file);
        if (editing) fd.append('_method', 'PATCH');

        router.post(editing ? `/e-library/${editing.id}` : '/e-library', fd, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false),
            onFinish: () => setSaving(false),
        });
    };

    const remove = (ebook: Ebook) => {
        if (!window.confirm(t('Delete this item?'))) return;
        setDeletingId(ebook.id);
        router.delete(`/e-library/${ebook.id}`, {
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
                            {t('Virtual Library')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Provide students access to digital ebooks, journals, videos, and audio content.')}
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Add Item')}
                        </Button>
                    )}
                </div>

                {canManage && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <LibraryBig className="h-5 w-5 text-blue-500" />
                                {t('Filter')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Type')}</Label>
                                    <Select value={selectedType} onValueChange={(v) => filter({ type: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All types')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ebook">{t('Ebook')}</SelectItem>
                                            <SelectItem value="video">{t('Video')}</SelectItem>
                                            <SelectItem value="journal">{t('Journal')}</SelectItem>
                                            <SelectItem value="audio">{t('Audio')}</SelectItem>
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
                            </div>
                        </CardContent>
                    </Card>
                )}

                {ebooks.length === 0 ? (
                    <Card>
                        <CardContent>
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                <LibraryBig className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                {t('No digital items in the library yet.')}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {ebooks.map((ebook) => (
                            <Card key={ebook.id} className="flex flex-col">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <Badge className={TYPE_BADGE[ebook.type] ?? ''}>
                                            {t(i18nType(ebook.type))}
                                        </Badge>
                                        {canManage && (
                                            <div className="flex gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => openEdit(ebook)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-red-500"
                                                    onClick={() => remove(ebook)}
                                                    disabled={deletingId === ebook.id}
                                                >
                                                    {deletingId === ebook.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <CardTitle className="line-clamp-2 text-base">{ebook.title}</CardTitle>
                                    <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                                        {ebook.author && <span>{ebook.author}</span>}
                                        {ebook.subject && (
                                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                {ebook.subject}
                                            </span>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="mt-auto pt-3">
                                    {ebook.description && (
                                        <p className="mb-3 line-clamp-2 text-xs text-gray-500">{ebook.description}</p>
                                    )}
                                    <div className="flex gap-2">
                                        {ebook.downloadUrl && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(ebook.downloadUrl, '_blank')}
                                            >
                                                <FileDown className="mr-1 h-4 w-4" />
                                                {t('Download')}
                                            </Button>
                                        )}
                                        {ebook.url && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(ebook.url, '_blank')}
                                            >
                                                <ExternalLink className="mr-1 h-4 w-4" />
                                                {t('Open')}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editing ? t('Edit Item') : t('Add Item')}
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
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Author')}</Label>
                                    <Input
                                        value={form.author}
                                        onChange={(e) => setForm({ ...form, author: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>{t('ISBN')}</Label>
                                    <Input
                                        value={form.isbn}
                                        onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Type')} *</Label>
                                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ebook">{t('Ebook')}</SelectItem>
                                            <SelectItem value="video">{t('Video')}</SelectItem>
                                            <SelectItem value="journal">{t('Journal')}</SelectItem>
                                            <SelectItem value="audio">{t('Audio')}</SelectItem>
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
                            <div>
                                <Label>{t('URL')}</Label>
                                <Input
                                    type="url"
                                    value={form.url}
                                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                                    placeholder="https://"
                                />
                            </div>
                            <div>
                                <Label>{t('Description')}</Label>
                                <Textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div>
                                <Label>{t('Upload File')}</Label>
                                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                                <p className="mt-1 text-xs text-gray-500">
                                    {t('Max 50 MB. PDF for ebooks, MP4 for videos, MP3 for audio.')}
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editing ? t('Save Changes') : t('Add Item')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

function i18nType(type: string): string {
    const map: Record<string, string> = { ebook: 'Ebook', video: 'Video', journal: 'Journal', audio: 'Audio' };
    return map[type] ?? type;
}
