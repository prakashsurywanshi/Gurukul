import { FormEvent, useState } from 'react';
import { Image as ImageIcon, Images, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useLanguage } from '../../i18n/LanguageProvider';

interface Album {
    id: number;
    title: string;
    description?: string | null;
    cover_image_url?: string | null;
    is_published: boolean;
    images_count: number;
    created_at: string;
}

interface GalleryProps {
    user: any;
    albums: Album[];
    filters: { search: string; status: string };
}

export default function Gallery(pageProps: GalleryProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const albums = pageProps.albums ?? [];

    const [search, setSearch] = useState(pageProps.filters?.search ?? '');
    const [status, setStatus] = useState(pageProps.filters?.status ?? '');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Album | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [form, setForm] = useState({ title: '', description: '', is_published: true });
    const [coverFile, setCoverFile] = useState<File | null>(null);

    const canManage = [
        'admin',
        'super_admin',
        'branch_admin',
        'teacher',
        'receptionist',
        'accountant',
        'librarian',
    ].includes(pageProps.user?.role);

    const openCreate = () => {
        setEditing(null);
        setForm({ title: '', description: '', is_published: true });
        setCoverFile(null);
        setShowModal(true);
    };

    const openEdit = (album: Album) => {
        setEditing(album);
        setForm({ title: album.title, description: album.description ?? '', is_published: album.is_published });
        setCoverFile(null);
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const fd = new FormData();
        fd.append('title', form.title);
        if (form.description) fd.append('description', form.description);
        fd.append('is_published', form.is_published ? '1' : '0');
        if (coverFile) fd.append('cover_image', coverFile);
        if (editing) fd.append('_method', 'PATCH');

        router.post(editing ? `/gallery/${editing.id}` : '/gallery', fd, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false),
            onFinish: () => setSaving(false),
        });
    };

    const remove = (album: Album) => {
        if (!window.confirm(t('Delete this album? This will permanently remove all uploaded photos.'))) return;
        setDeletingId(album.id);
        router.delete(`/gallery/${album.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const applyFilters = () => {
        router.get('/gallery', { search, status }, { preserveState: true, replace: true });
    };

    return (
        <DashboardLayout user={pageProps.user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Image Gallery')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Organize school photos into albums and share them with your community.')}
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Create Album')}
                        </Button>
                    )}
                </div>

                <Card>
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <Label>{t('Search')}</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    placeholder={t('Search albums...')}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="sm:w-48">
                            <Label>{t('Status')}</Label>
                            <select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    router.get(
                                        '/gallery',
                                        { search, status: e.target.value },
                                        { preserveState: true, replace: true },
                                    );
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">{t('All')}</option>
                                <option value="published">{t('Published')}</option>
                                <option value="draft">{t('Draft')}</option>
                            </select>
                        </div>
                        <Button variant="outline" onClick={applyFilters}>
                            {t('Filter')}
                        </Button>
                    </CardContent>
                </Card>

                {albums.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-white p-16 text-center dark:bg-gray-900 dark:border-gray-700">
                        <Images className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                        <h2 className="mt-4 text-base font-semibold">{t('No albums yet')}</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {t('Create your first album to start uploading school photos.')}
                        </p>
                        {canManage && (
                            <Button className="mt-4" onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Create Album')}
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {albums.map((album) => (
                            <div
                                key={album.id}
                                className="group overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md dark:bg-gray-900 dark:border-gray-700"
                            >
                                <a href={`/gallery/${album.id}`} className="block">
                                    {album.cover_image_url ? (
                                        <img
                                            src={album.cover_image_url}
                                            alt={album.title}
                                            className="h-44 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
                                            <ImageIcon className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                        </div>
                                    )}
                                </a>
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <a href={`/gallery/${album.id}`} className="min-w-0">
                                            <h3 className="truncate font-semibold text-gray-900 hover:underline dark:text-white">
                                                {album.title}
                                            </h3>
                                        </a>
                                        <Badge variant={album.is_published ? 'default' : 'secondary'}>
                                            {album.is_published ? t('Published') : t('Draft')}
                                        </Badge>
                                    </div>
                                    {album.description && (
                                        <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                                            {album.description}
                                        </p>
                                    )}
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                            <Images className="h-4 w-4" />
                                            {album.images_count} {album.images_count === 1 ? t('photo') : t('photos')}
                                        </span>
                                        {canManage && (
                                            <span className="flex items-center gap-1">
                                                <Button size="sm" variant="outline" onClick={() => openEdit(album)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => remove(album)}
                                                    disabled={deletingId === album.id}
                                                >
                                                    {deletingId === album.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                    )}
                                                </Button>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:border dark:border-gray-700">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{editing ? t('Edit Album') : t('Create Album')}</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <Label>{t('Album Title')} *</Label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                    className="mt-1"
                                />
                                {errors?.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
                            </div>
                            <div>
                                <Label>{t('Description')}</Label>
                                <Textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="mt-1"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Label>{t('Cover Image')}</Label>
                                <Input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                                    className="mt-1"
                                />
                            </div>
                            <label className="flex cursor-pointer items-start gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.is_published}
                                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                                    className="mt-1 h-4 w-4"
                                />
                                <span className="text-sm">
                                    <span className="font-medium">{t('Published')}</span>
                                    <span className="ml-1 text-xs text-gray-400">
                                        — {t('visible to other roles with view permission')}
                                    </span>
                                </span>
                            </label>
                            {errors?.cover_image && <p className="text-sm text-red-500">{errors.cover_image}</p>}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('Save')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
