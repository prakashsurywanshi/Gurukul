import { FormEvent, useState } from 'react';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Images,
    ImagePlus,
    Loader2,
    Pencil,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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

interface GalleryImage {
    id: number;
    url: string;
    original_name: string;
    caption?: string | null;
    sort_order: number;
}

interface GalleryShowProps {
    user: any;
    album: Album;
    images: GalleryImage[];
}

export default function GalleryShow(pageProps: GalleryShowProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const album = pageProps.album;
    const [images, setImages] = useState<GalleryImage[]>(pageProps.images ?? []);
    const [uploading, setUploading] = useState(false);
    const [showUploader, setShowUploader] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [editingCaptionId, setEditingCaptionId] = useState<number | null>(null);
    const [captionDraft, setCaptionDraft] = useState('');
    const [savingCaption, setSavingCaption] = useState(false);

    const canManage = ['admin', 'super_admin', 'teacher', 'receptionist', 'accountant', 'librarian'].includes(
        pageProps.user?.role,
    );

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        const file = files[0];
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await fetch(`/gallery/${album.id}/images`, {
                method: 'POST',
                headers: {
                    'X-XSRF-TOKEN': decodeURIComponent(getCookie('XSRF-TOKEN') ?? ''),
                    Accept: 'application/json',
                },
                body: fd,
            });
            if (res.ok) {
                const img = await res.json();
                setImages((current) => [...current, img]);
            }
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (image: GalleryImage) => {
        if (!window.confirm(t('Delete this photo?'))) return;
        router.delete(`/gallery/images/${image.id}`, {
            preserveScroll: true,
            onSuccess: () => setImages((current) => current.filter((i) => i.id !== image.id)),
        });
    };

    const saveCaption = (e: FormEvent) => {
        e.preventDefault();
        if (editingCaptionId === null) return;
        setSavingCaption(true);
        router.post(
            `/gallery/images/${editingCaptionId}/caption`,
            { caption: captionDraft },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setImages((current) =>
                        current.map((i) => (i.id === editingCaptionId ? { ...i, caption: captionDraft } : i)),
                    );
                    setEditingCaptionId(null);
                },
                onFinish: () => setSavingCaption(false),
            },
        );
    };

    const moveImage = (imageId: number, direction: -1 | 1) => {
        const idx = images.findIndex((i) => i.id === imageId);
        const target = idx + direction;
        if (idx < 0 || target < 0 || target >= images.length) return;
        const next = [...images];
        [next[idx], next[target]] = [next[target], next[idx]];
        setImages(next);
        router.post(`/gallery/${album.id}/reorder`, { order: next.map((i) => i.id) }, { preserveScroll: true });
    };

    const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[2]) : null;
    };

    return (
        <DashboardLayout user={pageProps.user}>
            <div className="space-y-6">
                <a
                    href="/gallery"
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t('Back to Albums')}
                </a>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {album.title}
                            </h1>
                            <Badge variant={album.is_published ? 'default' : 'secondary'}>
                                {album.is_published ? t('Published') : t('Draft')}
                            </Badge>
                        </div>
                        {album.description && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{album.description}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                            {album.images_count} {album.images_count === 1 ? t('photo') : t('photos')}
                        </p>
                    </div>
                    {canManage && (
                        <Button variant="outline" onClick={() => setShowUploader((current) => !current)}>
                            <Upload className="mr-2 h-4 w-4" />
                            {showUploader ? t('Hide Uploader') : t('Upload Images')}
                        </Button>
                    )}
                </div>

                {showUploader && canManage && (
                    <div className="rounded-lg border border-dashed bg-white p-6 text-center dark:bg-gray-900 dark:border-gray-600">
                        <input
                            type="file"
                            id="gallery-upload-input"
                            accept="image/jpeg,image/png,image/jpg,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => handleUpload(e.target.files)}
                        />
                        <label
                            htmlFor="gallery-upload-input"
                            className="flex cursor-pointer flex-col items-center gap-2"
                        >
                            {uploading ? (
                                <Loader2 className="h-10 w-10 animate-spin text-gray-300 dark:text-gray-600" />
                            ) : (
                                <ImagePlus className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                            )}
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {uploading ? t('Uploading...') : t('Drag & drop photos here, or click to browse')}
                            </span>
                            <span className="text-xs text-gray-400">{t('JPG, PNG, WebP or GIF')}</span>
                        </label>
                        {errors?.file && <p className="mt-2 text-sm text-red-500">{errors.file}</p>}
                    </div>
                )}

                {images.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-white p-16 text-center dark:bg-gray-900 dark:border-gray-700">
                        <Images className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                        <h2 className="mt-4 text-base font-semibold">{t('No photos yet')}</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {t('Upload photos to start building this album.')}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {images.map((image, index) => (
                            <div
                                key={image.id}
                                className="group relative overflow-hidden rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-700"
                            >
                                <img
                                    src={image.url}
                                    alt={image.caption ?? image.original_name}
                                    onClick={() => setLightboxIndex(index)}
                                    className="h-40 w-full cursor-pointer object-cover transition hover:opacity-90 sm:h-48"
                                />
                                {canManage && (
                                    <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                                        <button
                                            onClick={() => {
                                                setEditingCaptionId(image.id);
                                                setCaptionDraft(image.caption ?? '');
                                            }}
                                            className="rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80"
                                            title={t('Edit caption')}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => removeImage(image)}
                                            className="rounded-md bg-black/60 p-1.5 text-white hover:bg-red-600"
                                            title={t('Delete')}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )}
                                {canManage && index > 0 && (
                                    <button
                                        onClick={() => moveImage(image.id, -1)}
                                        className="absolute bottom-1 left-1 rounded-md bg-black/60 p-1 text-white hover:bg-black/80"
                                        title={t('Move left')}
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                {canManage && index < images.length - 1 && (
                                    <button
                                        onClick={() => moveImage(image.id, 1)}
                                        className="absolute bottom-1 right-1 rounded-md bg-black/60 p-1 text-white hover:bg-black/80"
                                        title={t('Move right')}
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                {image.caption && (
                                    <p className="truncate px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                                        {image.caption}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editingCaptionId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setEditingCaptionId(null)} />
                    <form
                        onSubmit={saveCaption}
                        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:border dark:border-gray-700"
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{t('Edit caption')}</h2>
                            <button
                                type="button"
                                onClick={() => setEditingCaptionId(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <Input value={captionDraft} onChange={(e) => setCaptionDraft(e.target.value)} autoFocus />
                        {errors?.caption && <p className="mt-1 text-sm text-red-500">{errors.caption}</p>}
                        <div className="mt-4 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setEditingCaptionId(null)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={savingCaption}>
                                {savingCaption && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('Save')}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {lightboxIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
                    <button
                        onClick={() => setLightboxIndex(null)}
                        className="absolute right-4 top-4 text-white hover:text-gray-300"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    {lightboxIndex > 0 && (
                        <button
                            onClick={() => setLightboxIndex(lightboxIndex - 1)}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"
                        >
                            <ChevronLeft className="h-8 w-8" />
                        </button>
                    )}
                    <img
                        src={images[lightboxIndex].url}
                        alt={images[lightboxIndex].caption ?? ''}
                        className="max-h-[85vh] max-w-full object-contain"
                    />
                    {lightboxIndex < images.length - 1 && (
                        <button
                            onClick={() => setLightboxIndex(lightboxIndex + 1)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"
                        >
                            <ChevronRight className="h-8 w-8" />
                        </button>
                    )}
                    {images[lightboxIndex].caption && (
                        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white">
                            {images[lightboxIndex].caption}
                        </p>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
}
