import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronRight, FileText, FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface SubjectOption {
    id: number;
    name: string;
    code: string;
}

interface TreeRow {
    id: number;
    type: 'chapter' | 'topic';
    name: string;
    description: string;
    sortOrder: number;
    childrenCount?: number;
    topics?: TreeRow[];
}

interface FormState {
    name: string;
    description: string;
    subjectId: string;
    parentId: string;
}

export default function ChaptersTopics({
    user,
    subjects,
    selectedSubjectId,
    tree,
    totalChapters,
}: {
    user: any;
    subjects: SubjectOption[];
    selectedSubjectId: number | null;
    tree: TreeRow[];
    totalChapters: number;
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [subjectId, setSubjectId] = useState<string>(selectedSubjectId ? String(selectedSubjectId) : '');
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [editingRow, setEditingRow] = useState<TreeRow | null>(null);
    const [form, setForm] = useState<FormState>({
        name: '',
        description: '',
        subjectId: '',
        parentId: '',
    });
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<TreeRow | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const applyFilter = (value: string) => {
        setSubjectId(value);
        router.get(`/chapters-topics${value ? `?subject=${value}` : ''}`, {}, { preserveState: false });
    };

    const toggle = (id: number) => {
        setExpanded((current) => ({ ...current, [id]: !current[id] }));
    };

    const openAdd = (parentId: string = '') => {
        setMode('add');
        setEditingRow(null);
        setForm({ name: '', description: '', subjectId, parentId });
        setModalOpen(true);
    };

    const openEdit = (row: TreeRow) => {
        setMode('edit');
        setEditingRow(row);
        setForm({ name: row.name, description: row.description ?? '', subjectId, parentId: '' });
        setModalOpen(true);
    };

    const submit = () => {
        if (!form.name.trim()) {
            toast.error('Enter a name.');
            return;
        }

        if (mode === 'add' && !form.subjectId) {
            toast.error('Select a subject first.');
            return;
        }

        setProcessing(true);

        if (mode === 'edit' && editingRow) {
            router.put(
                `/chapters-topics/${editingRow.id}`,
                { name: form.name, description: form.description },
                {
                    preserveScroll: true,
                    onError: () => toast.error('Failed to update.'),
                    onFinish: () => setProcessing(false),
                },
            );
            return;
        }

        router.post(
            '/chapters-topics',
            {
                subject_id: form.subjectId,
                parent_id: form.parentId || null,
                name: form.name,
                description: form.description,
            },
            {
                preserveScroll: true,
                onError: () => toast.error('Failed to add.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        setProcessing(true);
        router.delete(`/chapters-topics/${deleting.id}`, {
            preserveScroll: true,
            onError: () => toast.error('Failed to delete.'),
            onFinish: () => {
                setProcessing(false);
                setDeleteOpen(false);
            },
        });
    };

    const allTopics = tree.flatMap((chapter) => chapter.topics ?? []);

    return (
        <DashboardLayout user={user} activeTab="chapters-topics">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Chapters & Topics')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Organise each subject into chapters and topics for exams and lesson planning.')}
                            </p>
                        </div>
                        {selectedSubjectId ? (
                            <div className="flex gap-2">
                                <Button variant="outline" className="gap-2" onClick={() => openAdd('')}>
                                    <Plus className="h-4 w-4" />
                                    {t('Add Chapter')}
                                </Button>
                                <Button className="gap-2" onClick={() => openAdd('')}>
                                    <FolderTree className="h-4 w-4" />
                                    {t('Add Topic')}
                                </Button>
                            </div>
                        ) : null}
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('Select Subject')}</CardTitle>
                            <CardDescription>{t('Pick a subject to manage its chapters and topics.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-w-md">
                                <Select value={subjectId} onValueChange={applyFilter}>
                                    <SelectTrigger id="subject-select-07">
                                        <SelectValue placeholder={t('Select subject')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((subject) => (
                                            <SelectItem key={subject.id} value={String(subject.id)}>
                                                {subject.name}
                                                {subject.code ? ` (${subject.code})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedSubjectId && (
                                <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                        {totalChapters} {t('chapters')}
                                    </Badge>
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                        {allTopics.length} {t('topics')}
                                    </Badge>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {subjectId ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Curriculum Tree')}</CardTitle>
                                <CardDescription>
                                    {t('Add chapters and topics, then nest topics under chapters.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Name')}</TableHead>
                                                <TableHead>{t('Level')}</TableHead>
                                                <TableHead>{t('Topics')}</TableHead>
                                                <TableHead className="text-right">{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tree.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                                        {t('No chapters yet. Add the first chapter for this subject.')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                tree.map((chapter, index) => (
                                                    <RowGroup
                                                        key={chapter.id}
                                                        chapter={chapter}
                                                        index={index}
                                                        isLast={index === tree.length - 1}
                                                        expanded={expanded[chapter.id]}
                                                        onToggle={() => toggle(chapter.id)}
                                                        onAddTopic={() => openAdd(String(chapter.id))}
                                                        onEdit={openEdit}
                                                        onDelete={(row) => {
                                                            setDeleting(row);
                                                            setDeleteOpen(true);
                                                        }}
                                                    />
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
                            <FileText className="h-8 w-8 text-slate-400" />
                            <p className="text-sm text-slate-500">
                                {t('Select a subject to start structuring chapters and topics.')}
                            </p>
                        </div>
                    )}
                </div>

                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {mode === 'edit'
                                    ? t('Edit Chapter / Topic')
                                    : form.parentId
                                      ? t('Add Topic')
                                      : t('Add Chapter')}
                            </DialogTitle>
                            <DialogDescription>{t('Name is required. Description is optional.')}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="space-y-2">
                                <Label>{t('Name')}</Label>
                                <Input
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, name: event.target.value }))
                                    }
                                    placeholder={form.parentId ? t('e.g. Integers') : t('e.g. Real Numbers')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Description')}</Label>
                                <Input
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, description: event.target.value }))
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="button" onClick={submit} disabled={processing}>
                                {processing ? t('Saving...') : t('Save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>{t('Delete')}</DialogTitle>
                            <DialogDescription>
                                {t('Delete')} "{deleting?.name}"?{' '}
                                {deleting?.type === 'chapter'
                                    ? t('All topics under this chapter will also be removed.')
                                    : ''}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={processing}>
                                {processing ? t('Deleting...') : t('Delete')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}

function RowGroup({
    chapter,
    index,
    isLast,
    expanded,
    onToggle,
    onAddTopic,
    onEdit,
    onDelete,
}: {
    chapter: TreeRow;
    index: number;
    isLast: boolean;
    expanded: boolean;
    onToggle: () => void;
    onAddTopic: () => void;
    onEdit: (row: TreeRow) => void;
    onDelete: (row: TreeRow) => void;
}) {
    const { t } = useLanguage();
    const topics = chapter.topics ?? [];

    return (
        <>
            <TableRow className={`${!isLast ? 'border-b' : ''}`}>
                <TableCell>
                    <button
                        type="button"
                        className="flex items-center gap-2 text-left font-medium text-slate-800"
                        onClick={onToggle}
                    >
                        {topics.length > 0 ? (
                            expanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                            )
                        ) : (
                            <span className="w-4" />
                        )}
                        {chapter.name}
                    </button>
                </TableCell>
                <TableCell>
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">{t('Chapter')}</Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-500">{chapter.childrenCount ?? topics.length}</TableCell>
                <TableCell>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={onAddTopic}>
                            <Plus className="h-3.5 w-3.5" />
                            {t('Topic')}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(chapter)}>
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => onDelete(chapter)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
            {expanded &&
                topics.map((topic) => (
                    <TableRow key={topic.id} className="border-b bg-slate-50/60 last:border-b-0">
                        <TableCell className="pl-10">
                            <span className="flex items-center gap-2 text-sm text-slate-700">
                                <span className="ml-3 h-4 w-px bg-slate-300" />
                                <FileText className="h-4 w-4 text-slate-400" />
                                {topic.name}
                            </span>
                        </TableCell>
                        <TableCell>
                            <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">{t('Topic')}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-400">-</TableCell>
                        <TableCell>
                            <div className="flex justify-end gap-1">
                                <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(topic)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => onDelete(topic)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
        </>
    );
}
