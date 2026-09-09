import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { BookOpen, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '../ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';

interface SubjectRecord {
    id: number;
    name: string;
    code?: string | null;
    type: 'theory' | 'practical' | 'both';
    description?: string | null;
    created_at?: string | null;
}

interface SubjectsManagementProps {
    user: any;
    subjects: SubjectRecord[];
}

const INITIAL_FORM = {
    name: '',
    code: '',
    type: 'theory',
    description: '',
};

const ITEMS_PER_PAGE = 8;

export default function SubjectsManagement({ user, subjects }: SubjectsManagementProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    }>();
    const flash = page.props.flash ?? {};
    const errors = page.props.errors ?? {};
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<SubjectRecord | null>(null);
    const [formData, setFormData] = useState(INITIAL_FORM);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const filteredSubjects = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        if (!normalizedQuery) {
            return subjects;
        }

        return subjects.filter((subject) =>
            [subject.name, subject.code || '', subject.type, subject.description || ''].some((value) =>
                value.toLowerCase().includes(normalizedQuery),
            ),
        );
    }, [searchQuery, subjects]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / ITEMS_PER_PAGE));

        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, filteredSubjects.length]);

    const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / ITEMS_PER_PAGE));
    const paginatedSubjects = filteredSubjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const canManageSubjects = ['super_admin', 'admin'].includes(user.role);

    const stats = {
        total: subjects.length,
        theory: subjects.filter((subject) => subject.type === 'theory').length,
        practical: subjects.filter((subject) => subject.type === 'practical').length,
        both: subjects.filter((subject) => subject.type === 'both').length,
    };

    const resetDialog = () => {
        setDialogOpen(false);
        setEditingSubject(null);
        setFormData(INITIAL_FORM);
    };

    const openCreateDialog = () => {
        setEditingSubject(null);
        setFormData(INITIAL_FORM);
        setDialogOpen(true);
    };

    const openEditDialog = (subject: SubjectRecord) => {
        setEditingSubject(subject);
        setFormData({
            name: subject.name,
            code: subject.code || '',
            type: subject.type,
            description: subject.description || '',
        });
        setDialogOpen(true);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const payload = {
            name: formData.name.trim(),
            code: formData.code.trim() || null,
            type: formData.type,
            description: formData.description.trim() || null,
        };

        if (!payload.name) {
            toast.error('Please enter a subject name');
            return;
        }

        if (editingSubject) {
            router.patch(`/subjects/${editingSubject.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    resetDialog();
                },
            });

            return;
        }

        router.post('/subjects', payload, {
            preserveScroll: true,
            onSuccess: () => {
                resetDialog();
            },
        });
    };

    const handleDelete = (subject: SubjectRecord) => {
        if (!window.confirm(`Delete subject ${subject.name}?`)) {
            return;
        }

        router.delete(`/subjects/${subject.id}`, {
            preserveScroll: true,
        });
    };

    const renderTypeBadge = (type: SubjectRecord['type']) => {
        if (type === 'practical') {
            return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{t('Practical')}</Badge>;
        }

        if (type === 'both') {
            return <Badge className="bg-violet-600 text-white hover:bg-violet-600">{t('Theory + Practical')}</Badge>;
        }

        return <Badge className="bg-sky-600 text-white hover:bg-sky-600">{t('Theory')}</Badge>;
    };

    return (
        <DashboardLayout user={user} activeTab="subjects">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Subjects')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Create and maintain subject records for your academic setup.')}
                            </p>
                        </div>
                        {canManageSubjects && (
                            <Button
                                type="button"
                                className="bg-blue-600 text-white hover:bg-blue-700"
                                onClick={openCreateDialog}
                            >
                                <Plus className="h-4 w-4" />
                                {t('Add Subject')}
                            </Button>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="p-5">
                                <p className="text-sm text-slate-500">{t('Total Subjects')}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="p-5">
                                <p className="text-sm text-slate-500">{t('Theory')}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.theory}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="p-5">
                                <p className="text-sm text-slate-500">{t('Practical')}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.practical}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="p-5">
                                <p className="text-sm text-slate-500">{t('Combined')}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.both}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>{t('Subject Directory')}</CardTitle>
                                <CardDescription>
                                    {t('Search, review, and manage all available subject records.')}
                                </CardDescription>
                            </div>
                            <div className="relative w-full sm:max-w-sm">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(event) => {
                                        setSearchQuery(event.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder={t('Search subjects')}
                                    className="pl-10"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Subject')}</TableHead>
                                            <TableHead>{t('Code')}</TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>{t('Description')}</TableHead>
                                            {canManageSubjects && (
                                                <TableHead className="text-right">{t('Action')}</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedSubjects.map((subject) => (
                                            <TableRow key={subject.id}>
                                                <TableCell className="font-medium text-slate-900">
                                                    {subject.name}
                                                </TableCell>
                                                <TableCell>{subject.code || t('N/A')}</TableCell>
                                                <TableCell>{renderTypeBadge(subject.type)}</TableCell>
                                                <TableCell className="max-w-md text-slate-600">
                                                    {subject.description ? (
                                                        <span className="line-clamp-2">{t(subject.description)}</span>
                                                    ) : (
                                                        t('No description')
                                                    )}
                                                </TableCell>
                                                {canManageSubjects && (
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openEditDialog(subject)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700"
                                                                onClick={() => handleDelete(subject)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {filteredSubjects.length === 0 && (
                                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
                                    <BookOpen className="h-9 w-9 text-slate-400" />
                                    <p className="mt-3 text-sm font-medium text-slate-700">{t('No subjects found.')}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {searchQuery
                                            ? t('Try a different search term.')
                                            : t('Create your first subject to get started.')}
                                    </p>
                                </div>
                            )}

                            {filteredSubjects.length > 0 && (
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-slate-500">
                                        {t('Showing {start} to {end} of {total} subjects', {
                                            start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                                            end: Math.min(currentPage * ITEMS_PER_PAGE, filteredSubjects.length),
                                            total: filteredSubjects.length,
                                        })}
                                    </p>
                                    <Pagination className="justify-end">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href="#"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        if (currentPage > 1) {
                                                            setCurrentPage((pageNumber) => pageNumber - 1);
                                                        }
                                                    }}
                                                    className={
                                                        currentPage === 1 ? t('pointer-events-none opacity-50') : ''
                                                    }
                                                />
                                            </PaginationItem>
                                            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                                                (pageNumber) => (
                                                    <PaginationItem key={pageNumber}>
                                                        <PaginationLink
                                                            href="#"
                                                            isActive={pageNumber === currentPage}
                                                            onClick={(event) => {
                                                                event.preventDefault();
                                                                setCurrentPage(pageNumber);
                                                            }}
                                                        >
                                                            {pageNumber}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ),
                                            )}
                                            <PaginationItem>
                                                <PaginationNext
                                                    href="#"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        if (currentPage < totalPages) {
                                                            setCurrentPage((pageNumber) => pageNumber + 1);
                                                        }
                                                    }}
                                                    className={
                                                        currentPage === totalPages
                                                            ? t('pointer-events-none opacity-50')
                                                            : ''
                                                    }
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        resetDialog();
                        return;
                    }

                    setDialogOpen(true);
                }}
            >
                <DialogContent className="w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingSubject ? t('Edit Subject') : t('Create Subject')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject-name">{t('Subject Name')}</Label>
                            <Input
                                id="subject-name"
                                value={formData.name}
                                onChange={(event) =>
                                    setFormData((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                                placeholder={t('Enter subject name')}
                            />

                            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="subject-code">{t('Subject Code')}</Label>
                                <Input
                                    id="subject-code"
                                    value={formData.code}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            code: event.target.value,
                                        }))
                                    }
                                    placeholder={t('e.g. MATH101')}
                                />

                                {errors.code && <p className="text-sm text-red-600">{errors.code}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>{t('Subject Type')}</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value: 'theory' | 'practical' | 'both') =>
                                        setFormData((current) => ({
                                            ...current,
                                            type: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select type')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="theory">{t('Theory')}</SelectItem>
                                        <SelectItem value="practical">{t('Practical')}</SelectItem>
                                        <SelectItem value="both">{t('Theory + Practical')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.type && <p className="text-sm text-red-600">{t(errors.type)}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subject-description">{t('Description')}</Label>
                            <Textarea
                                id="subject-description"
                                value={formData.description}
                                onChange={(event) =>
                                    setFormData((current) => ({
                                        ...current,
                                        description: event.target.value,
                                    }))
                                }
                                placeholder={t('Add a short description')}
                                rows={4}
                            />

                            {errors.description && <p className="text-sm text-red-600">{t(errors.description)}</p>}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetDialog}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                                {editingSubject ? t('Update Subject') : t('Create Subject')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
