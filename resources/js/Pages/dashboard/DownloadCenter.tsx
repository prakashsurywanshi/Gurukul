import { useLanguage } from '../../i18n/LanguageProvider';
import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock3,
    Download,
    ExternalLink,
    FileText,
    Filter,
    PlayCircle,
    Plus,
    Search,
    Share2,
    Upload,
    Users,
    Video,
} from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

type ContentType = 'all' | 'document' | 'video' | 'tutorial';
type ShareAudience = 'students' | 'staff' | 'both';
type UploadMode = 'file' | 'youtube';

type SharedContent = {
    id: string;
    title: string;
    contentType: Exclude<ContentType, 'all'>;
    category: string;
    audience: ShareAudience;
    shareGroup: string;
    format: string;
    sharedOn: string;
    downloads: number;
    uploader: string;
    size: string;
    description: string;
    duration?: string | null;
    fileName?: string | null;
    sourceKind: UploadMode;
    youtubeUrl?: string | null;
    downloadUrl: string;
    previewUrl: string;
};

type MediaLibraryItem = {
    id: string;
    title: string;
    mediaType: Exclude<ContentType, 'all'>;
    sourceKind: UploadMode;
    category: string;
    format: string;
    fileName?: string | null;
    youtubeUrl?: string | null;
    description: string;
    duration?: string | null;
    size: string;
    uploader: string;
    sharesCount: number;
    createdAt?: string | null;
};

type ShareGroupOption = {
    id: string;
    label: string;
};

type UploadLimits = {
    uploadMaxLabel: string;
    postMaxLabel: string;
    maxBytes: number;
    maxLabel: string;
};

interface DownloadCenterProps {
    user: {
        name?: string;
        role?: string;
    };
    contentItems?: SharedContent[];
    mediaLibrary?: MediaLibraryItem[];
    shareGroups?: ShareGroupOption[];
    uploadLimits?: UploadLimits;
}

const defaultShareGroups: ShareGroupOption[] = [
    { id: 'all-students', label: 'All Students' },
    { id: 'all-staff', label: 'All Staff' },
    { id: 'class-10-a', label: 'Class 10 - A' },
    { id: 'class-12-science', label: 'Class 12 - Science' },
    { id: 'science-department', label: 'Science Department' },
    { id: 'boarding-staff', label: 'Boarding Staff' },
];

const audienceLabels: Record<ShareAudience, string> = {
    students: 'Students',
    staff: 'Staff',
    both: 'Students & Staff',
};

const mediaFormDefaults = {
    uploadMode: 'file' as UploadMode,
    title: '',
    mediaType: 'document' as Exclude<ContentType, 'all'>,
    category: '',
    format: '',
    description: '',
    duration: '',
    youtubeUrl: '',
};

const shareFormDefaults = {
    mediaId: '',
    audience: 'students' as ShareAudience,
    shareGroup: 'all-students',
};

const contentTypeMeta: Array<{
    value: ContentType;
    label: string;
    icon: typeof FileText;
}> = [
    { value: 'all', label: 'All Content', icon: Filter },
    { value: 'document', label: 'Documents', icon: FileText },
    { value: 'video', label: 'Videos', icon: Video },
    { value: 'tutorial', label: 'Video Tutorials', icon: PlayCircle },
];

export default function DownloadCenter({
    user,
    contentItems = [],
    mediaLibrary = [],
    shareGroups = defaultShareGroups,
    uploadLimits,
}: DownloadCenterProps) {
    const { t } = useLanguage();
    const page = usePage<{ errors?: Record<string, string> }>();
    const isStudentViewer = ['student', 'parent'].includes(user.role || '');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<ContentType>('all');
    const [selectedAudience, setSelectedAudience] = useState<'all' | ShareAudience>('all');
    const [activeTab, setActiveTab] = useState<'shared' | 'tutorials'>('shared');
    const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [mediaForm, setMediaForm] = useState(mediaFormDefaults);
    const [shareForm, setShareForm] = useState(shareFormDefaults);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submittingMedia, setSubmittingMedia] = useState(false);
    const [submittingShare, setSubmittingShare] = useState(false);
    const canManageContent = !isStudentViewer;

    const shareGroupLabelMap = useMemo(
        () =>
            shareGroups.reduce<Record<string, string>>((accumulator, group) => {
                accumulator[group.id] = group.label;
                return accumulator;
            }, {}),
        [shareGroups],
    );

    const groupedShareCounts = useMemo(() => {
        const grouped = contentItems.reduce<Record<string, number>>((accumulator, item) => {
            accumulator[item.shareGroup] = (accumulator[item.shareGroup] || 0) + 1;
            return accumulator;
        }, {});

        return shareGroups.map((group) => ({
            id: group.id,
            label: group.label,
            count: grouped[group.id] || 0,
        }));
    }, [contentItems, shareGroups]);

    const highlightedShareGroups = useMemo(
        () => groupedShareCounts.filter((group) => group.id === 'all-students' || group.id === 'all-staff'),
        [groupedShareCounts],
    );

    const classSectionShareGroups = useMemo(
        () => groupedShareCounts.filter((group) => group.id !== 'all-students' && group.id !== 'all-staff'),
        [groupedShareCounts],
    );

    const filteredContent = useMemo(() => {
        return contentItems.filter((item) => {
            const matchesSearch =
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.uploader.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.fileName || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = selectedType === 'all' || item.contentType === selectedType;
            const matchesAudience = selectedAudience === 'all' || item.audience === selectedAudience;

            return matchesSearch && matchesType && matchesAudience;
        });
    }, [contentItems, searchTerm, selectedType, selectedAudience]);

    const tutorialContent = useMemo(
        () => filteredContent.filter((item) => item.contentType === 'video' || item.contentType === 'tutorial'),
        [filteredContent],
    );

    const totalDownloads = useMemo(() => contentItems.reduce((sum, item) => sum + item.downloads, 0), [contentItems]);

    const formatFileSize = (size: number) => {
        if (size >= 1024 * 1024) {
            return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        }

        if (size >= 1024) {
            return `${Math.round(size / 1024)} KB`;
        }

        return `${size} bytes`;
    };

    const resetMediaForm = () => {
        setMediaForm(mediaFormDefaults);
        setSelectedFile(null);
    };

    const resetShareForm = () => {
        setShareForm(shareFormDefaults);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;

        if (!file) {
            setSelectedFile(null);
            return;
        }

        if (uploadLimits?.maxBytes && file.size > uploadLimits.maxBytes) {
            setSelectedFile(null);
            event.target.value = '';
            toast.error(`This file is ${formatFileSize(file.size)}. Server limit is ${uploadLimits.maxLabel}.`);
            return;
        }

        setSelectedFile(file);

        const extension = file.name.split('.').pop()?.toUpperCase() || '';
        const inferredType: Exclude<ContentType, 'all'> = file.type.startsWith('video/')
            ? mediaForm.mediaType === 'tutorial'
                ? 'tutorial'
                : 'video'
            : 'document';

        setMediaForm((current) => ({
            ...current,
            title: current.title || file.name.replace(/\.[^/.]+$/, ''),
            mediaType: inferredType,
            format: extension || current.format,
        }));
    };

    const handleUploadMedia = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (mediaForm.uploadMode === 'file' && !selectedFile) {
            toast.error('Please choose a document or video file.');
            return;
        }

        if (mediaForm.uploadMode === 'youtube' && !mediaForm.youtubeUrl) {
            toast.error('Please paste a YouTube video link.');
            return;
        }

        setSubmittingMedia(true);

        router.post(
            '/communication/download-center/media',
            {
                uploadMode: mediaForm.uploadMode,
                title: mediaForm.title,
                mediaType: mediaForm.mediaType,
                category: mediaForm.category,
                format: mediaForm.format,
                description: mediaForm.description,
                duration: mediaForm.mediaType === 'document' ? '' : mediaForm.duration,
                youtubeUrl: mediaForm.uploadMode === 'youtube' ? mediaForm.youtubeUrl : '',
                file: mediaForm.uploadMode === 'file' ? selectedFile : null,
            },
            {
                forceFormData: mediaForm.uploadMode === 'file',
                preserveScroll: true,
                onSuccess: () => {
                    setMediaDialogOpen(false);
                    resetMediaForm();
                    toast.success('Media uploaded successfully.');
                },
                onError: () => {
                    toast.error('Failed to upload media.');
                },
                onFinish: () => setSubmittingMedia(false),
            },
        );
    };

    const handleShareContent = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!shareForm.mediaId) {
            toast.error('Please select media to share.');
            return;
        }

        setSubmittingShare(true);

        router.post(
            '/communication/download-center/share',
            {
                mediaId: shareForm.mediaId,
                audience: shareForm.audience,
                shareGroup: shareForm.shareGroup,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShareDialogOpen(false);
                    resetShareForm();
                    toast.success('Content shared successfully.');
                },
                onError: () => {
                    toast.error('Failed to share content.');
                },
                onFinish: () => setSubmittingShare(false),
            },
        );
    };

    const openDownload = (item: SharedContent) => {
        window.open(item.downloadUrl, '_blank', 'noopener,noreferrer');
    };

    const openPreview = (item: SharedContent) => {
        window.open(item.previewUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <DashboardLayout user={user} activeTab="download-center">
            <Head title={t('Download Center')} />

            <div className="space-y-6 p-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                        <h1 className="text-3xl font-bold text-slate-900">{t('Download Center')}</h1>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {canManageContent
                                ? t(
                                      'Upload media as a document, video, or YouTube link, then select that media from the library when sharing it with students or staff.',
                                  )
                                : t(
                                      'Access the files, videos, and tutorials shared specifically for your student account.',
                                  )}
                        </p>
                    </div>

                    {canManageContent ? (
                        <div className="flex flex-wrap gap-3">
                            <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2">
                                        <Upload className="h-4 w-4" />
                                        {t('Upload Media')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>{t('Upload Media')}</DialogTitle>
                                        <DialogDescription>
                                            {t(
                                                'Upload a document or video file, or save a YouTube video link into the media library.',
                                            )}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form onSubmit={handleUploadMedia} className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>{t('Upload type')}</Label>
                                                <Select
                                                    value={mediaForm.uploadMode}
                                                    onValueChange={(value: UploadMode) => {
                                                        setMediaForm((current) => ({
                                                            ...current,
                                                            uploadMode: value,
                                                        }));
                                                        setSelectedFile(null);
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="file">
                                                            {t('Document / Video File')}
                                                        </SelectItem>
                                                        <SelectItem value="youtube">
                                                            {t('YouTube Video Link')}
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {mediaForm.uploadMode === 'file' ? (
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="media-file">{t('Upload document or video')}</Label>
                                                    <label
                                                        htmlFor="media-file"
                                                        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-blue-300 hover:bg-blue-50/40"
                                                    >
                                                        <Upload className="h-8 w-8 text-blue-600" />
                                                        <p className="mt-3 font-medium text-slate-900">
                                                            {selectedFile
                                                                ? selectedFile.name
                                                                : t('Choose a file to upload')}
                                                        </p>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {t(
                                                                'PDF, DOCX, XLSX, PPT, ZIP, MP4, MOV, and other school media are supported.',
                                                            )}
                                                        </p>
                                                        {uploadLimits ? (
                                                            <p className="mt-2 text-xs text-blue-700">
                                                                {t('Current server upload limit:')}
                                                                {uploadLimits.maxLabel}
                                                            </p>
                                                        ) : null}
                                                        {selectedFile ? (
                                                            <p className="mt-3 text-xs text-slate-500">
                                                                {formatFileSize(selectedFile.size)}
                                                                {selectedFile.type ? ` • ${selectedFile.type}` : ''}
                                                            </p>
                                                        ) : null}
                                                    </label>
                                                    <Input
                                                        id="media-file"
                                                        type="file"
                                                        className="hidden"
                                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.mp4,.mov,.avi,.mkv"
                                                        onChange={handleFileChange}
                                                    />

                                                    {page.props.errors?.media_file ? (
                                                        <p className="text-sm text-red-600">
                                                            {page.props.errors.media_file}
                                                        </p>
                                                    ) : null}
                                                    {page.props.errors?.file ? (
                                                        <p className="text-sm text-red-600">{page.props.errors.file}</p>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="youtube-url">{t('YouTube Video Link')}</Label>
                                                    <Input
                                                        id="youtube-url"
                                                        value={mediaForm.youtubeUrl}
                                                        onChange={(event) =>
                                                            setMediaForm((current) => ({
                                                                ...current,
                                                                youtubeUrl: event.target.value,
                                                                format: 'YOUTUBE',
                                                            }))
                                                        }
                                                        placeholder="https://www.youtube.com/watch?v=..."
                                                        required
                                                    />

                                                    {page.props.errors?.youtubeUrl ? (
                                                        <p className="text-sm text-red-600">
                                                            {page.props.errors.youtubeUrl}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            )}

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="media-title">{t('Media title')}</Label>
                                                <Input
                                                    id="media-title"
                                                    value={mediaForm.title}
                                                    onChange={(event) =>
                                                        setMediaForm((current) => ({
                                                            ...current,
                                                            title: event.target.value,
                                                        }))
                                                    }
                                                    placeholder={t('April Chemistry Notes Pack')}
                                                    required
                                                />

                                                {page.props.errors?.title ? (
                                                    <p className="text-sm text-red-600">{t(page.props.errors.title)}</p>
                                                ) : null}
                                            </div>

                                            <div className="space-y-2">
                                                <Label>{t('Media type')}</Label>
                                                <Select
                                                    value={mediaForm.mediaType}
                                                    onValueChange={(value: Exclude<ContentType, 'all'>) =>
                                                        setMediaForm((current) => ({
                                                            ...current,
                                                            mediaType: value,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="document">{t('Document')}</SelectItem>
                                                        <SelectItem value="video">{t('Video')}</SelectItem>
                                                        <SelectItem value="tutorial">{t('Video Tutorial')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="media-category">{t('Category')}</Label>
                                                <Input
                                                    id="media-category"
                                                    value={mediaForm.category}
                                                    onChange={(event) =>
                                                        setMediaForm((current) => ({
                                                            ...current,
                                                            category: event.target.value,
                                                        }))
                                                    }
                                                    placeholder={t('Study Material')}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="media-format">{t('Format')}</Label>
                                                <Input
                                                    id="media-format"
                                                    value={mediaForm.format}
                                                    onChange={(event) =>
                                                        setMediaForm((current) => ({
                                                            ...current,
                                                            format: event.target.value,
                                                        }))
                                                    }
                                                    placeholder={
                                                        mediaForm.uploadMode === 'youtube'
                                                            ? t('YOUTUBE')
                                                            : t('PDF / MP4')
                                                    }
                                                />
                                            </div>

                                            {mediaForm.mediaType !== 'document' ? (
                                                <div className="space-y-2">
                                                    <Label htmlFor="media-duration">{t('Duration')}</Label>
                                                    <Input
                                                        id="media-duration"
                                                        value={mediaForm.duration}
                                                        onChange={(event) =>
                                                            setMediaForm((current) => ({
                                                                ...current,
                                                                duration: event.target.value,
                                                            }))
                                                        }
                                                        placeholder={t('15 min')}
                                                    />
                                                </div>
                                            ) : null}

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="media-description">{t('Description')}</Label>
                                                <Textarea
                                                    id="media-description"
                                                    rows={4}
                                                    value={mediaForm.description}
                                                    onChange={(event) =>
                                                        setMediaForm((current) => ({
                                                            ...current,
                                                            description: event.target.value,
                                                        }))
                                                    }
                                                    placeholder={t('Add a short description of the uploaded media.')}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setMediaDialogOpen(false);
                                                    resetMediaForm();
                                                }}
                                            >
                                                {t('Cancel')}
                                            </Button>
                                            <Button type="submit" className="gap-2" disabled={submittingMedia}>
                                                <Upload className="h-4 w-4" />
                                                {submittingMedia ? t('Uploading...') : t('Upload Media')}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Share2 className="h-4 w-4" />
                                        {t('Share Content')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-xl">
                                    <DialogHeader>
                                        <DialogTitle>{t('Share Content')}</DialogTitle>
                                        <DialogDescription>
                                            {t('Select media from the library, then choose who should receive it.')}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form onSubmit={handleShareContent} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>{t('Select media to share')}</Label>
                                            <Select
                                                value={shareForm.mediaId}
                                                onValueChange={(value: string) =>
                                                    setShareForm((current) => ({
                                                        ...current,
                                                        mediaId: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Choose uploaded media')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {mediaLibrary.map((media) => (
                                                        <SelectItem key={media.id} value={media.id}>
                                                            {t(media.title)} (
                                                            {media.sourceKind === 'youtube'
                                                                ? t('YouTube')
                                                                : media.format}
                                                            )
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {page.props.errors?.share_media_id ? (
                                                <p className="text-sm text-red-600">
                                                    {page.props.errors.share_media_id}
                                                </p>
                                            ) : null}
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>{t('Share with')}</Label>
                                                <Select
                                                    value={shareForm.audience}
                                                    onValueChange={(value: ShareAudience) =>
                                                        setShareForm((current) => ({
                                                            ...current,
                                                            audience: value,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="students">{t('Students')}</SelectItem>
                                                        <SelectItem value="staff">{t('Staff')}</SelectItem>
                                                        <SelectItem value="both">{t('Students & Staff')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>{t('Content share list')}</Label>
                                                <Select
                                                    value={shareForm.shareGroup}
                                                    onValueChange={(value: string) =>
                                                        setShareForm((current) => ({
                                                            ...current,
                                                            shareGroup: value,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {shareGroups.map((group) => (
                                                            <SelectItem key={group.id} value={group.id}>
                                                                {t(group.label)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setShareDialogOpen(false);
                                                    resetShareForm();
                                                }}
                                            >
                                                {t('Cancel')}
                                            </Button>
                                            <Button type="submit" className="gap-2" disabled={submittingShare}>
                                                <Share2 className="h-4 w-4" />
                                                {submittingShare ? t('Sharing...') : t('Share Selected Media')}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-row gap-4 overflow-x-auto pb-2">
                    {canManageContent ? (
                        <Card className="min-w-[220px] flex-1">
                            <CardContent className="pt-6">
                                <p className="text-sm text-slate-500">{t('Media library')}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{mediaLibrary.length}</p>
                            </CardContent>
                        </Card>
                    ) : null}
                    <Card className="min-w-[220px] flex-1">
                        <CardContent className="pt-6">
                            <p className="text-sm text-slate-500">{t('Shared content')}</p>
                            <p className="mt-2 text-3xl font-semibold text-slate-900">{contentItems.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="min-w-[220px] flex-1">
                        <CardContent className="pt-6">
                            <p className="text-sm text-slate-500">{t('YouTube links')}</p>
                            <p className="mt-2 text-3xl font-semibold text-slate-900">
                                {contentItems.filter((item) => item.sourceKind === 'youtube').length}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="min-w-[220px] flex-1">
                        <CardContent className="pt-6">
                            <p className="text-sm text-slate-500">{t('Total downloads')}</p>
                            <p className="mt-2 text-3xl font-semibold text-slate-900">{totalDownloads}</p>
                        </CardContent>
                    </Card>
                </div>

                <div
                    className={`grid gap-6 ${canManageContent ? 'xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]' : ''}`}
                >
                    <div className="space-y-6">
                        {canManageContent ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="h-5 w-5 text-blue-600" />
                                        {t('Media Library')}
                                    </CardTitle>
                                    <CardDescription>
                                        {t('Upload media first, then choose from this library while sharing content.')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {mediaLibrary.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                                            {t(
                                                'No media uploaded yet. Use `Upload Media` to add a document, video, or YouTube link.',
                                            )}
                                        </div>
                                    ) : (
                                        mediaLibrary.map((media) => (
                                            <div
                                                key={media.id}
                                                className="rounded-2xl border border-slate-200 p-4 shadow-sm"
                                            >
                                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                                    <div className="space-y-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant="secondary">{t(media.category)}</Badge>
                                                            <Badge variant="outline">{media.mediaType}</Badge>
                                                            <Badge
                                                                className={
                                                                    media.sourceKind === 'youtube'
                                                                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-100'
                                                                        : 'bg-slate-900 text-white hover:bg-slate-900'
                                                                }
                                                            >
                                                                {media.sourceKind === 'youtube'
                                                                    ? t('YouTube Link')
                                                                    : media.format}
                                                            </Badge>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-slate-900">
                                                                {t(media.title)}
                                                            </h3>
                                                            <p className="mt-1 text-sm leading-6 text-slate-600">
                                                                {t(media.description)}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                                            <span className="flex items-center gap-2">
                                                                <Users className="h-4 w-4" />
                                                                {t('Shared')}
                                                                {media.sharesCount}
                                                                {t('times')}
                                                            </span>
                                                            <span className="flex items-center gap-2">
                                                                <Clock3 className="h-4 w-4" />
                                                                {t('Added')}
                                                                {media.createdAt || t('Recently')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex min-w-[220px] flex-col gap-3 rounded-2xl bg-slate-50 p-4">
                                                        <div className="text-sm">
                                                            <p className="font-medium text-slate-900">
                                                                {media.uploader}
                                                            </p>
                                                            <p className="text-slate-500">
                                                                {media.size}
                                                                {media.duration ? ` • ${media.duration}` : ''}
                                                            </p>
                                                            {media.fileName ? (
                                                                <p className="mt-1 truncate text-slate-500">
                                                                    {media.fileName}
                                                                </p>
                                                            ) : null}
                                                            {media.youtubeUrl ? (
                                                                <p className="mt-1 truncate text-slate-500">
                                                                    {media.youtubeUrl}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                        <Button
                                                            className="gap-2"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setShareDialogOpen(true);
                                                                setShareForm((current) => ({
                                                                    ...current,
                                                                    mediaId: media.id,
                                                                }));
                                                            }}
                                                        >
                                                            <Share2 className="h-4 w-4" />
                                                            {t('Select To Share')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        ) : null}

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-blue-600" />
                                    {t('Content type')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Filter shared items by content type and audience.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    {contentTypeMeta.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = selectedType === item.value;
                                        return (
                                            <button
                                                key={item.value}
                                                type="button"
                                                onClick={() => setSelectedType(item.value)}
                                                className={`rounded-2xl border p-4 text-left transition ${
                                                    isActive
                                                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                <Icon className="h-5 w-5" />
                                                <p className="mt-4 font-semibold">{t(item.label)}</p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {item.value === 'all'
                                                        ? contentItems.length
                                                        : contentItems.filter(
                                                              (content) => content.contentType === item.value,
                                                          ).length}
                                                    {t('items')}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={searchTerm}
                                            onChange={(event) => setSearchTerm(event.target.value)}
                                            placeholder={t('Search content, uploader, category, or filename')}
                                            className="pl-9"
                                        />
                                    </div>

                                    <Select
                                        value={selectedAudience}
                                        onValueChange={(value: 'all' | ShareAudience) => setSelectedAudience(value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Audience')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All audiences')}</SelectItem>
                                            <SelectItem value="students">{t('Students')}</SelectItem>
                                            <SelectItem value="staff">{t('Staff')}</SelectItem>
                                            <SelectItem value="both">{t('Students & Staff')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Tabs
                            value={activeTab}
                            onValueChange={(value) => setActiveTab(value as 'shared' | 'tutorials')}
                        >
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="shared">{t('Content Share List')}</TabsTrigger>
                                <TabsTrigger value="tutorials">{t('Video Tutorial')}</TabsTrigger>
                            </TabsList>

                            <TabsContent value="shared" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('Shared content list')}</CardTitle>
                                        <CardDescription>
                                            {t('Documents, uploaded videos, and YouTube links shared with users.')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {filteredContent.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                                                {t('No shared content matches the current filters.')}
                                            </div>
                                        ) : (
                                            filteredContent.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="rounded-2xl border border-slate-200 p-4 shadow-sm"
                                                >
                                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                                        <div className="space-y-3">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge variant="secondary">{t(item.category)}</Badge>
                                                                <Badge className="bg-slate-900 text-white hover:bg-slate-900">
                                                                    {audienceLabels[item.audience]}
                                                                </Badge>
                                                                <Badge variant="outline">
                                                                    {item.sourceKind === 'youtube'
                                                                        ? t('YouTube')
                                                                        : item.format}
                                                                </Badge>
                                                            </div>
                                                            <div>
                                                                <h3 className="text-lg font-semibold text-slate-900">
                                                                    {t(item.title)}
                                                                </h3>
                                                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                                                    {t(item.description)}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                                                <span className="flex items-center gap-2">
                                                                    <Users className="h-4 w-4" />
                                                                    {shareGroupLabelMap[item.shareGroup] ||
                                                                        item.shareGroup}
                                                                </span>
                                                                <span className="flex items-center gap-2">
                                                                    <Clock3 className="h-4 w-4" />
                                                                    {t('Shared')}
                                                                    {item.sharedOn}
                                                                </span>
                                                                <span className="flex items-center gap-2">
                                                                    <Download className="h-4 w-4" />
                                                                    {item.downloads}
                                                                    {t('opens')}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex min-w-[220px] flex-col gap-3 rounded-2xl bg-slate-50 p-4">
                                                            <div className="text-sm">
                                                                <p className="font-medium text-slate-900">
                                                                    {item.uploader}
                                                                </p>
                                                                <p className="text-slate-500">
                                                                    {item.size}
                                                                    {item.duration ? ` • ${item.duration}` : ''}
                                                                </p>
                                                                {item.fileName ? (
                                                                    <p className="mt-1 truncate text-slate-500">
                                                                        {item.fileName}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                            {item.sourceKind === 'youtube' ? (
                                                                <Button
                                                                    className="gap-2"
                                                                    onClick={() => openPreview(item)}
                                                                >
                                                                    <ExternalLink className="h-4 w-4" />
                                                                    {t('Open YouTube Video')}
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    className="gap-2"
                                                                    onClick={() => openDownload(item)}
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                    {t('Download')}
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                className="gap-2"
                                                                onClick={() => openPreview(item)}
                                                            >
                                                                {item.sourceKind === 'youtube' ? (
                                                                    <PlayCircle className="h-4 w-4" />
                                                                ) : item.contentType === 'document' ? (
                                                                    <FileText className="h-4 w-4" />
                                                                ) : (
                                                                    <PlayCircle className="h-4 w-4" />
                                                                )}
                                                                {item.sourceKind === 'youtube'
                                                                    ? t('Preview Link')
                                                                    : item.contentType === 'document'
                                                                      ? t('Preview File')
                                                                      : t('Watch Video')}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="tutorials" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('Video tutorial')}</CardTitle>
                                        <CardDescription>
                                            {t(
                                                'Uploaded videos and YouTube tutorial links shared through the Download Center.',
                                            )}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-4 lg:grid-cols-2">
                                            {tutorialContent.length === 0 ? (
                                                <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500 lg:col-span-2">
                                                    {t('No tutorials are available for the selected filters.')}
                                                </div>
                                            ) : (
                                                tutorialContent.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                                                                <PlayCircle className="h-6 w-6" />
                                                            </div>
                                                            <Badge variant="outline">
                                                                {item.duration ||
                                                                    (item.sourceKind === 'youtube'
                                                                        ? t('YouTube')
                                                                        : t('Self-paced'))}
                                                            </Badge>
                                                        </div>
                                                        <h3 className="mt-4 text-lg font-semibold text-slate-900">
                                                            {t(item.title)}
                                                        </h3>
                                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                                            {t(item.description)}
                                                        </p>
                                                        <div className="mt-4 flex flex-wrap items-center gap-2">
                                                            <Badge variant="secondary">
                                                                {shareGroupLabelMap[item.shareGroup] || item.shareGroup}
                                                            </Badge>
                                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                                {audienceLabels[item.audience]}
                                                            </Badge>
                                                        </div>
                                                        <div className="mt-6 flex gap-3">
                                                            <Button className="gap-2" onClick={() => openPreview(item)}>
                                                                {item.sourceKind === 'youtube' ? (
                                                                    <ExternalLink className="h-4 w-4" />
                                                                ) : (
                                                                    <PlayCircle className="h-4 w-4" />
                                                                )}
                                                                {item.sourceKind === 'youtube'
                                                                    ? t('Open Link')
                                                                    : t('Watch')}
                                                            </Button>
                                                            {item.sourceKind !== 'youtube' ? (
                                                                <Button
                                                                    variant="outline"
                                                                    className="gap-2"
                                                                    onClick={() => openDownload(item)}
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                    {t('Download')}
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {canManageContent ? (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-blue-600" />
                                        {t('Content Share List')}
                                    </CardTitle>
                                    <CardDescription>
                                        {t(
                                            'All Students, All Staff, and selective class sections receiving shared content.',
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="space-y-3">
                                        {highlightedShareGroups.map((group) => (
                                            <div
                                                key={group.id}
                                                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-900">{t(group.label)}</p>
                                                    <p className="text-sm text-slate-500">
                                                        {t('Global audience group')}
                                                    </p>
                                                </div>
                                                <Badge variant="secondary">{group.count}</Badge>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                {t('Selective Class Sections')}
                                            </p>
                                            <Badge variant="outline">{classSectionShareGroups.length}</Badge>
                                        </div>

                                        {classSectionShareGroups.length > 0 ? (
                                            <div className="space-y-3">
                                                {classSectionShareGroups.map((group) => (
                                                    <div
                                                        key={group.id}
                                                        className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                                                    >
                                                        <div>
                                                            <p className="font-medium text-slate-900">
                                                                {t(group.label)}
                                                            </p>
                                                            <p className="text-sm text-slate-500">
                                                                {t('Class and section specific sharing')}
                                                            </p>
                                                        </div>
                                                        <Badge variant="secondary">{group.count}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                                                {t('No class-section share groups are available yet.')}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                        {t('Workflow')}
                                    </CardTitle>
                                    <CardDescription>{t('Recommended process for admins and staff.')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm text-slate-600">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="font-medium text-slate-900">{t('1. Upload media')}</p>
                                        <p className="mt-1">
                                            {t(
                                                'Add a document, video file, or YouTube video link into the media library.',
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="font-medium text-slate-900">{t('2. Select media to share')}</p>
                                        <p className="mt-1">
                                            {t(
                                                'Open the share dialog and choose the media item from the library dropdown.',
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="font-medium text-slate-900">
                                            {t('3. Students and staff access content')}
                                        </p>
                                        <p className="mt-1">
                                            {t(
                                                'Shared items appear in the content list, where users can preview, watch, or download them.',
                                            )}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : null}
                </div>
            </div>
        </DashboardLayout>
    );
}
