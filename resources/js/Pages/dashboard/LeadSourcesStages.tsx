import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { GitBranch, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface LeadOption {
    id: string;
    name: string;
    label?: string | null;
    isSystem: boolean;
    status: boolean;
}

interface LeadSourcesStagesProps {
    user: any;
    defaultSources: string[];
    defaultStages: string[];
    sources: LeadOption[];
    stages: LeadOption[];
}

export default function LeadSourcesStages({
    user,
    defaultSources,
    defaultStages,
    sources,
    stages,
}: LeadSourcesStagesProps) {
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
                                <GitBranch className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('Lead Sources & Stages')}</CardTitle>
                                <CardDescription>
                                    {t('Configure the lead sources and pipeline stages used in admissions.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <OptionSection
                    title={t('Lead Sources')}
                    description={t('Where leads come from. Custom sources appear in the lead form and filters.')}
                    addLabel={t('Add Source')}
                    addDialogTitle={t('Add Source')}
                    addDialogDescription={t('Enter an option value and an optional display label.')}
                    defaults={defaultSources}
                    options={sources}
                    basePath="/leads/sources-stages/sources"
                />
                <OptionSection
                    title={t('Pipeline Stages')}
                    description={t(
                        'The stages a lead moves through until admission. Custom stages join the system defaults.',
                    )}
                    addLabel={t('Add Stage')}
                    addDialogTitle={t('Add Stage')}
                    addDialogDescription={t('Enter a stage value and an optional display label.')}
                    defaults={defaultStages}
                    options={stages}
                    basePath="/leads/sources-stages/stages"
                />
            </div>
        </DashboardLayout>
    );
}

function OptionSection({
    title,
    description,
    addLabel,
    addDialogTitle,
    addDialogDescription,
    defaults,
    options,
    basePath,
}: {
    title: string;
    description: string;
    addLabel: string;
    addDialogTitle: string;
    addDialogDescription: string;
    defaults: string[];
    options: LeadOption[];
    basePath: string;
}) {
    const { t } = useLanguage();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<LeadOption | null>(null);
    const [form, setForm] = useState({ name: '', label: '' });
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const page = usePage() as any;
    const errors = (page.props as any).errors ?? {};

    useEffect(() => {
        if (editing) {
            setForm({ name: '', label: editing.label ?? '' });
        }
    }, [editing]);

    useEffect(() => {
        if (errors.name) {
            setErrorMessage(errors.name);
            setDialogOpen(true);
        }
    }, [errors.name]);

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', label: '' });
        setErrorMessage(null);
        setDialogOpen(true);
    };

    const openEdit = (option: LeadOption) => {
        setEditing(option);
        setErrorMessage(null);
        setDialogOpen(true);
    };

    const close = () => {
        setDialogOpen(false);
        setErrorMessage(null);
    };

    const submit = () => {
        const value = (editing ? form.label : form.name).trim();
        if (!value && !editing) {
            toast.error(t('Enter a value for the option.'));
            return;
        }

        setProcessing(true);

        const payload = editing
            ? { label: form.label.trim() || null }
            : { name: form.name.trim(), label: form.label.trim() || null };
        const optionsRequest = {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setErrorMessage(null);
            },
            onError: () => {
                setErrorMessage(editing ? t('Failed to update option.') : t('Failed to add option.'));
            },
            onFinish: () => setProcessing(false),
        };

        if (editing) {
            router.patch(`${basePath}/${editing.id}`, payload, optionsRequest);
        } else {
            router.post(basePath, payload, optionsRequest);
        }
    };

    const toggle = (option: LeadOption) => {
        router.patch(
            `${basePath}/${option.id}`,
            { status: !option.status },
            {
                preserveScroll: true,
                onError: () => toast.error(t('Failed to update option.')),
            },
        );
    };

    const remove = (option: LeadOption) => {
        if (!window.confirm(t('Delete this option?'))) {
            return;
        }

        router.delete(`${basePath}/${option.id}`, {
            preserveScroll: true,
            onError: () => toast.error(t('Failed to delete option.')),
        });
    };

    const visible = options.filter((option) => option.status);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    <Button onClick={openAdd}>
                        <Plus className="mr-2 h-4 w-4" />
                        {addLabel}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {defaults.length > 0 && (
                    <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                            {t('System defaults')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {defaults.map((name) => (
                                <Badge
                                    key={name}
                                    variant="outline"
                                    className="bg-slate-50 text-slate-700 dark:bg-gray-800 dark:text-gray-200"
                                >
                                    {name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Option Name')}</TableHead>
                                <TableHead>{t('Display Label')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead className="text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                        {t('No options added yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visible.map((option) => (
                                    <TableRow key={option.id}>
                                        <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                            {option.name}
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-gray-300">
                                            {option.label || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    option.status
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                }
                                            >
                                                {option.status ? t('Active') : t('Inactive')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggle(option)}
                                                >
                                                    <Power
                                                        className={`mr-1.5 h-3.5 w-3.5 ${option.status ? 'text-green-600' : 'text-slate-400'}`}
                                                    />
                                                    {option.status ? t('Disable') : t('Enable')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEdit(option)}
                                                >
                                                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                                    {t('Edit')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:bg-red-50"
                                                    onClick={() => remove(option)}
                                                >
                                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
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

                <Dialog open={dialogOpen} onOpenChange={(open) => (open ? undefined : close())}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editing ? t('Edit Option') : addDialogTitle}</DialogTitle>
                            <DialogDescription>{addDialogDescription}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {!editing && (
                                <div className="grid gap-2">
                                    <Label>{t('Option Value')}</Label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder={t('e.g. counselling-camp')}
                                        autoFocus
                                    />
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label>{t('Display Label')}</Label>
                                <Input
                                    value={form.label}
                                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            submit();
                                        }
                                    }}
                                    placeholder={t('e.g. Counselling Camp')}
                                />
                            </div>
                            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={close}>
                                {t('Cancel')}
                            </Button>
                            <Button onClick={submit} disabled={processing}>
                                {processing ? t('Saving...') : editing ? t('Update') : t('Add')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
