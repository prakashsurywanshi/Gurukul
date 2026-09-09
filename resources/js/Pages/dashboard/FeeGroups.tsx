import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { FolderPlus, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
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

interface FeeTypeOption {
    id: number;
    name: string;
    status: string;
}

interface FeeGroupRow {
    id: number;
    name: string;
    description: string;
    status: string;
    sortOrder: number;
    feeTypeIds: number[];
}

interface FormState {
    name: string;
    description: string;
    status: string;
    sortOrder: string;
    feeTypeIds: number[];
}

const EMPTY_FORM: FormState = {
    name: '',
    description: '',
    status: 'active',
    sortOrder: '0',
    feeTypeIds: [],
};

export default function FeeGroups({
    user,
    groups,
    feeTypes,
}: {
    user: any;
    groups: FeeGroupRow[];
    feeTypes: FeeTypeOption[];
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [editingGroup, setEditingGroup] = useState<FeeGroupRow | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<FeeGroupRow | null>(null);
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
        setMode('add');
        setEditingGroup(null);
        setForm({ ...EMPTY_FORM, sortOrder: String(Math.max(0, ...groups.map((group) => group.sortOrder)) + 1) });
        setModalOpen(true);
    };

    const openEdit = (group: FeeGroupRow) => {
        setMode('edit');
        setEditingGroup(group);
        setForm({
            name: group.name,
            description: group.description ?? '',
            status: group.status,
            sortOrder: String(group.sortOrder),
            feeTypeIds: [...group.feeTypeIds],
        });
        setModalOpen(true);
    };

    const toggleFeeType = (id: number) => {
        setForm((current) => ({
            ...current,
            feeTypeIds: current.feeTypeIds.includes(id)
                ? current.feeTypeIds.filter((feeTypeId) => feeTypeId !== id)
                : [...current.feeTypeIds, id],
        }));
    };

    const submit = () => {
        if (!form.name.trim()) {
            toast.error('Enter a group name.');
            return;
        }

        setProcessing(true);
        const payload = {
            name: form.name,
            description: form.description,
            status: form.status,
            sort_order: Number(form.sortOrder) || 0,
            fee_type_ids: form.feeTypeIds,
        };

        if (mode === 'edit' && editingGroup) {
            router.patch(`/fee-groups/${editingGroup.id}`, payload, {
                preserveScroll: true,
                onError: () => toast.error('Failed to update fee group.'),
                onFinish: () => setProcessing(false),
            });
            return;
        }

        router.post('/fee-groups', payload, {
            preserveScroll: true,
            onError: () => toast.error('Failed to add fee group.'),
            onFinish: () => setProcessing(false),
        });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        setProcessing(true);
        router.delete(`/fee-groups/${deleting.id}`, {
            preserveScroll: true,
            onError: () => toast.error('Failed to delete fee group.'),
            onFinish: () => {
                setProcessing(false);
                setDeleteOpen(false);
            },
        });
    };

    const feeTypeName = useMemo(() => {
        const map = new Map(feeTypes.map((feeType) => [feeType.id, feeType.name]));

        return (id: number) => map.get(id);
    }, [feeTypes]);

    return (
        <DashboardLayout user={user} activeTab="fee-groups">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Fee Groups')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Group fee types together so they are billed and reported as one item.')}
                            </p>
                        </div>
                        <Button onClick={openAdd} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t('Add Fee Group')}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('All Fee Groups')}</CardTitle>
                            <CardDescription>{t('Manage the fee type catalog groups of your school.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Fee Types')}</TableHead>
                                            <TableHead>{t('Description')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groups.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                    {t('No fee groups created yet.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            groups.map((group, index) => (
                                                <TableRow key={group.id}>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-800">
                                                        {group.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {group.feeTypeIds.length === 0 ? (
                                                                <span className="text-sm text-slate-400">-</span>
                                                            ) : (
                                                                group.feeTypeIds.map((feeTypeId) => (
                                                                    <Badge key={feeTypeId} variant="outline">
                                                                        {feeTypeName(feeTypeId) ?? feeTypeId}
                                                                    </Badge>
                                                                ))
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate text-sm text-slate-500">
                                                        {group.description || <span className="text-slate-400">-</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={
                                                                group.status === 'active'
                                                                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                                                            }
                                                        >
                                                            {group.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openEdit(group)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                                {t('Edit')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:bg-red-50"
                                                                onClick={() => {
                                                                    setDeleting(group);
                                                                    setDeleteOpen(true);
                                                                }}
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
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            {mode === 'edit' ? t('Edit Fee Group') : t('Add Fee Group')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('A fee group bundles several fee types into one named set.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="fee-group-name">{t('Group Name')}</Label>
                            <Input
                                id="fee-group-name"
                                value={form.name}
                                onChange={(event) => setForm({ ...form, name: event.target.value })}
                                placeholder={t('e.g. Boarding Charges')}
                            />
                        </div>
                        <div>
                            <Label htmlFor="fee-group-description">{t('Description')}</Label>
                            <Textarea
                                id="fee-group-description"
                                value={form.description}
                                onChange={(event) => setForm({ ...form, description: event.target.value })}
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="fee-group-status">{t('Status')}</Label>
                                <Select
                                    value={form.status}
                                    onValueChange={(value) => setForm({ ...form, status: value })}
                                >
                                    <SelectTrigger id="fee-group-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="fee-group-sort">{t('Sort Order')}</Label>
                                <Input
                                    id="fee-group-sort"
                                    type="number"
                                    min={0}
                                    value={form.sortOrder}
                                    onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>{t('Fee Types in Group')}</Label>
                            <div className="mt-2 space-y-1 rounded-lg border border-slate-200 p-3">
                                {feeTypes.length === 0 ? (
                                    <p className="text-sm text-slate-500">{t('No fee types available yet.')}</p>
                                ) : (
                                    feeTypes.map((feeType) => (
                                        <label
                                            key={feeType.id}
                                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50"
                                        >
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                checked={form.feeTypeIds.includes(feeType.id)}
                                                onChange={() => toggleFeeType(feeType.id)}
                                            />
                                            <span className="text-sm text-slate-700">{feeType.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={submit} disabled={processing} className="gap-2">
                            <FolderPlus className="h-4 w-4" />
                            {processing ? t('Saving...') : mode === 'edit' ? t('Save Changes') : t('Add Group')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('Delete Fee Group')}</DialogTitle>
                        <DialogDescription>
                            {t('Are you sure you want to delete the fee group')} "{deleting?.name}"?{' '}
                            {t('This cannot be undone.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={processing}
                            className="gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            {processing ? t('Deleting...') : t('Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
