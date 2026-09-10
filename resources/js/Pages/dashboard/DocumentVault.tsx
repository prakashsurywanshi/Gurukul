import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Download, File, FileText, FolderOpen, Search, Trash2, Upload } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface VaultDocument {
    id: string;
    title: string;
    description: string | null;
    category: string;
    originalName: string;
    mimeType: string | null;
    size: string;
    uploadedByName: string | null;
    createdAt: string | null;
}

const UPLOAD_CATEGORIES = [
    'ID Proof',
    'Marksheet',
    'Certificate',
    'Medical',
    'Agreement',
    'Financial',
    'Notice',
    'Other',
];

export default function DocumentVault({
    user,
    documents,
    categories,
    filters,
}: {
    user: any;
    documents: VaultDocument[];
    categories: string[];
    filters: { search: string; category: string };
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const [categoryFilter, setCategoryFilter] = useState(filters.category ?? '');
    const [uploadOpen, setUploadOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Other');
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadErrors, setUploadErrors] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<VaultDocument | null>(null);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const canUpload = ['admin', 'super_admin', 'teacher', 'accountant'].includes(user?.role);
    const canDelete = ['admin', 'super_admin', 'teacher'].includes(user?.role);

    const applyFilters = () => {
        const params: Record<string, string> = {};

        if (search.trim()) {
            params.search = search.trim();
        }

        if (categoryFilter) {
            params.category = categoryFilter;
        }

        router.get('/document-vault', params, { preserveState: true, only: ['documents', 'filters'] });
    };

    const submitUpload = () => {
        if (!selectedFile) {
            setUploadErrors(['Select a file to upload.']);
            return;
        }

        if (!title.trim()) {
            setUploadErrors(['Enter a document title.']);
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title);
        formData.append('category', category);
        formData.append('description', description);

        setUploading(true);
        setUploadErrors([]);

        router.post('/document-vault', formData, {
            preserveScroll: true,
            onError: (errors) => {
                const errorMessages = Object.values(errors)
                    .flat()
                    .map((error) => String(error));
                setUploadErrors(errorMessages.length > 0 ? errorMessages : ['Failed to upload document.']);
            },
            onSuccess: () => {
                setTitle('');
                setDescription('');
                setCategory('Other');
                setSelectedFile(null);
                setUploadOpen(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
            onFinish: () => setUploading(false),
        });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(`/document-vault/${deleting.id}`, {
            preserveScroll: true,
            onError: () => toast.error('Failed to delete document.'),
            onFinish: () => setDeleteOpen(false),
        });
    };

    const renderFileIcon = (mimeType: string | null) =>
        mimeType === 'application/pdf' ? (
            <FileText className="h-4 w-4 text-red-500" />
        ) : (
            <File className="h-4 w-4 text-slate-500" />
        );

    return (
        <DashboardLayout user={user} activeTab="document-vault">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Document Vault')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('A secure archive for staff and student records and school documents.')}
                            </p>
                        </div>
                        {canUpload && (
                            <Button onClick={() => setUploadOpen(true)} className="gap-2">
                                <Upload className="h-4 w-4" />
                                {t('Upload Document')}
                            </Button>
                        )}
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2">
                                <FolderOpen className="h-5 w-5 text-blue-600" />
                                {t('Documents')}
                            </CardTitle>
                            <CardDescription>{t('Filter and retrieve your shared documents.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                applyFilters();
                                            }
                                        }}
                                        placeholder={t('Search by title, description or file name...')}
                                        className="pl-9"
                                    />
                                </div>
                                <div className="w-full md:w-56">
                                    <Select
                                        value={categoryFilter}
                                        onValueChange={(value) => {
                                            setCategoryFilter(value);
                                            window.setTimeout(applyFilters, 0);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All categories')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">{t('All categories')}</SelectItem>
                                            {categories.map((item) => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Document')}</TableHead>
                                            <TableHead>{t('Category')}</TableHead>
                                            <TableHead>{t('Size')}</TableHead>
                                            <TableHead>{t('Uploaded By')}</TableHead>
                                            <TableHead>{t('Uploaded At')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {documents.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                    {t('No documents found.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            documents.map((document) => (
                                                <TableRow key={document.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {renderFileIcon(document.mimeType)}
                                                            <div>
                                                                <p className="font-medium text-slate-800">
                                                                    {document.title}
                                                                </p>
                                                                <p className="max-w-xs truncate text-xs text-slate-500">
                                                                    {document.originalName}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{document.category}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {document.size}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {document.uploadedByName ?? '-'}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {document.createdAt
                                                            ? new Date(document.createdAt).toLocaleDateString()
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-1">
                                                            <Button type="button" variant="ghost" size="sm" asChild>
                                                                <a
                                                                    href={`/document-vault/${document.id}/download`}
                                                                    className="gap-1.5"
                                                                >
                                                                    <Download className="h-3.5 w-3.5" />
                                                                    {t('Download')}
                                                                </a>
                                                            </Button>
                                                            {canDelete && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-red-600 hover:bg-red-50"
                                                                    onClick={() => {
                                                                        setDeleting(document);
                                                                        setDeleteOpen(true);
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                    {t('Delete')}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            {t('Upload Document')}
                        </DialogTitle>
                        <DialogDescription>{t('Store a document in the school document vault.')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {uploadErrors.length > 0 && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                <ul className="list-disc space-y-1 pl-5">
                                    {uploadErrors.map((error) => (
                                        <li key={error}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="vault-file">{t('File')}</Label>
                            <input
                                id="vault-file"
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt"
                                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                                className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                {t('PDF, images, Office and text files up to 20 MB.')}
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="vault-title">{t('Title')}</Label>
                            <Input
                                id="vault-title"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder={t('e.g. Admission Procedure Policy')}
                            />
                        </div>
                        <div>
                            <Label htmlFor="vault-category">{t('Category')}</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger id="vault-category">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {UPLOAD_CATEGORIES.map((item) => (
                                        <SelectItem key={item} value={item}>
                                            {item}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="vault-description">{t('Description')}</Label>
                            <Textarea
                                id="vault-description"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={submitUpload} disabled={uploading} className="gap-2">
                            <Upload className="h-4 w-4" />
                            {uploading ? t('Uploading...') : t('Upload')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('Delete Document')}</DialogTitle>
                        <DialogDescription>
                            {t('Are you sure you want to delete')} "{deleting?.title}"?{' '}
                            {t('This removes the uploaded file and cannot be undone.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmDelete} className="gap-2">
                            <Trash2 className="h-4 w-4" />
                            {t('Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
