import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ClipboardCheck, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface Criterion {
    id: number;
    title: string;
    description: string | null;
    weight: number;
    status: string;
}

interface AppraisalCriteriaProps {
    user: any;
    criteria: Criterion[];
}

export default function AppraisalCriteria({ user, criteria }: AppraisalCriteriaProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <ClipboardCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('Appraisal Criteria')}</CardTitle>
                                <CardDescription>
                                    {t('Criteria used when rating staff performance in appraisal cycles.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <CriteriaSection criteria={criteria} />
            </div>
        </DashboardLayout>
    );
}

function CriteriaSection({ criteria }: { criteria: Criterion[] }) {
    const { t } = useLanguage();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Criterion | null>(null);
    const [form, setForm] = useState({
        title: '',
        description: '',
        weight: 1,
        status: 'active',
    });
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const page = usePage() as any;
    const errors = (page.props as any).errors ?? {};

    useEffect(() => {
        if (errors.title) {
            setErrorMessage(errors.title);
            setDialogOpen(true);
        }
    }, [errors.title]);

    const openAdd = () => {
        setEditing(null);
        setForm({ title: '', description: '', weight: 1, status: 'active' });
        setErrorMessage(null);
        setDialogOpen(true);
    };

    const openEdit = (criterion: Criterion) => {
        setEditing(criterion);
        setForm({
            title: criterion.title,
            description: criterion.description ?? '',
            weight: criterion.weight,
            status: criterion.status,
        });
        setErrorMessage(null);
        setDialogOpen(true);
    };

    const close = () => {
        setDialogOpen(false);
        setErrorMessage(null);
    };

    const submit = () => {
        if (!form.title.trim()) {
            toast.error(t('Enter a title for the criterion.'));
            return;
        }

        setProcessing(true);

        const payload = {
            title: form.title.trim(),
            description: form.description.trim() || null,
            weight: Number(form.weight),
            status: form.status,
        };
        const optionsRequest = {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setErrorMessage(null);
            },
            onError: () => {
                setErrorMessage(editing ? t('Failed to update criterion.') : t('Failed to add criterion.'));
            },
            onFinish: () => setProcessing(false),
        };

        if (editing) {
            router.put(`/staff/appraisal-criteria/${editing.id}`, payload, optionsRequest);
        } else {
            router.post('/staff/appraisal-criteria', payload, optionsRequest);
        }
    };

    const toggle = (criterion: Criterion) => {
        router.put(
            `/staff/appraisal-criteria/${criterion.id}`,
            { status: criterion.status === 'active' ? 'inactive' : 'active' },
            {
                preserveScroll: true,
                onError: () => toast.error(t('Failed to update criterion.')),
            },
        );
    };

    const remove = (criterion: Criterion) => {
        if (!window.confirm(t('Delete this criterion?'))) {
            return;
        }

        router.delete(`/staff/appraisal-criteria/${criterion.id}`, {
            preserveScroll: true,
            onError: () => toast.error(t('Failed to delete criterion.')),
        });
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle>{t('Criteria list')}</CardTitle>
                            <CardDescription>
                                {t('Criterion descriptions with a weight that reflects its importance.')}
                            </CardDescription>
                        </div>
                        <Button onClick={openAdd}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Add Criterion')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Title')}</TableHead>
                                    <TableHead>{t('Description')}</TableHead>
                                    <TableHead>{t('Weight')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {criteria.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                            {t('No criteria added yet.')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    criteria.map((criterion) => (
                                        <TableRow key={criterion.id}>
                                            <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                {criterion.title}
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-gray-300">
                                                {criterion.description || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{criterion.weight}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        criterion.status === 'active'
                                                            ? 'bg-green-50 text-green-700'
                                                            : 'bg-slate-100 text-slate-500'
                                                    }
                                                >
                                                    {criterion.status === 'active' ? t('Active') : t('Inactive')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEdit(criterion)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggle(criterion)}
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => remove(criterion)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
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

            <Dialog open={dialogOpen} onOpenChange={(open) => !open && close()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? t('Edit Criterion') : t('Add Criterion')}</DialogTitle>
                        <DialogDescription>
                            {t('Give the criterion a short title, description and an importance weight.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Title')}</Label>
                            <Input
                                value={form.title}
                                onChange={(event) => setForm({ ...form, title: event.target.value })}
                                placeholder={t('e.g. Classroom Management')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Description')}</Label>
                            <Input
                                value={form.description}
                                onChange={(event) => setForm({ ...form, description: event.target.value })}
                                placeholder={t('Optional description of what this criterion covers')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Weight')}</Label>
                            <select
                                value={form.weight}
                                onChange={(event) => setForm({ ...form, weight: Number(event.target.value) })}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                            >
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500">
                                {t('Weight 1 is lowest importance, 5 is highest.')}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Status')}</Label>
                            <select
                                value={form.status}
                                onChange={(event) => setForm({ ...form, status: event.target.value })}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                            >
                                <option value="active">{t('Active')}</option>
                                <option value="inactive">{t('Inactive')}</option>
                            </select>
                        </div>
                        {errorMessage ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                {errorMessage}
                            </div>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={submit} disabled={processing}>
                            {editing ? t('Save Changes') : t('Add Criterion')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
