import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface ExamTypeRow {
    id: number;
    name: string;
    code: string | null;
    sortOrder: number;
}

export default function ExamTypes({ user, examTypes }: { user: any; examTypes: ExamTypeRow[] }) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ExamTypeRow | null>(null);
    const [form, setForm] = useState({ name: '', code: '' });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', code: '' });
        setDialogOpen(true);
    };

    const openEdit = (type: ExamTypeRow) => {
        setEditing(type);
        setForm({ name: type.name, code: type.code ?? '' });
        setDialogOpen(true);
    };

    const submit = () => {
        if (!form.name.trim()) {
            toast.error('Enter a name for the exam type.');
            return;
        }

        setProcessing(true);

        const payload = {
            name: form.name,
            code: form.code || null,
            sort_order: examTypes.length,
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => setDialogOpen(false),
            onError: () => toast.error(editing ? 'Failed to update exam type.' : 'Failed to add exam type.'),
            onFinish: () => setProcessing(false),
        };

        if (editing) {
            router.patch(`/exam-types/${editing.id}`, payload, options);
        } else {
            router.post('/exam-types', payload, options);
        }
    };

    const remove = (type: ExamTypeRow) => {
        if (!window.confirm(`Delete exam type "${type.name}"?`)) {
            return;
        }

        setProcessing(true);
        router.delete(`/exam-types/${type.id}`, {
            preserveScroll: true,
            onError: () => toast.error('Failed to delete exam type.'),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <DashboardLayout user={user} activeTab="exam-types">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Exam Types')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Grading component types used across exams, marksheets and report cards.')}
                            </p>
                        </div>
                        <Button onClick={openAdd} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t('Add New Exam Type')}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Types')}</CardTitle>
                            <CardDescription>
                                {t(
                                    'Common examples: Theory (TH), Practical (PR), Subject Enrichment (SE), Notebook (NB).',
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Abbreviation')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {examTypes.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                                    {t('Nothing here yet. Add your first exam type.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            examTypes.map((type, index) => (
                                                <TableRow key={type.id}>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-900">
                                                        {type.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {type.code ? (
                                                            <Badge variant="outline" className="font-mono">
                                                                {type.code}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-1.5"
                                                                disabled={processing}
                                                                onClick={() => openEdit(type)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                                {t('Edit')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-1.5 text-red-600 hover:bg-red-50"
                                                                disabled={processing}
                                                                onClick={() => remove(type)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                {t('Delete')}
                                                            </Button>
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

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editing ? t('Edit Exam Type') : t('Add New Exam Type')}</DialogTitle>
                            <DialogDescription>
                                {t('Define a grading component type and its abbreviation.')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="space-y-2">
                                <Label>{t('Name')}</Label>
                                <Input
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, name: event.target.value }))
                                    }
                                    placeholder={t('e.g. Theory')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Abbreviation')}</Label>
                                <Input
                                    value={form.code}
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, code: event.target.value }))
                                    }
                                    placeholder={t('e.g. TH')}
                                    className="font-mono"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="button" onClick={submit} disabled={processing} className="gap-2">
                                <Plus className="h-4 w-4" />
                                {processing ? t('Saving...') : t('Save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
