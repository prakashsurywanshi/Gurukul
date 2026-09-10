import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { FolderPlus, HardHat, Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface DepartmentOption {
    id: number;
    name: string;
}

interface WorkerRow {
    id: number;
    name: string;
    worker_type: string;
    departmentId: number | null;
    departmentName: string | null;
    phone: string;
    joiningDate: string | null;
    shift: string | null;
    remarks: string;
    status: string;
}

const WORKER_TYPES = [
    'gardener',
    'peon',
    'security',
    'housekeeping',
    'driver',
    'electrician',
    'plumber',
    'canteen',
    'attendant',
    'general',
];

const emptyForm = {
    name: '',
    worker_type: 'general',
    department_id: '',
    phone: '',
    joining_date: '',
    shift: '',
    remarks: '',
    status: 'active',
};

export default function CampusWorkers({
    user,
    workers,
    departmentOptions,
}: {
    user: any;
    workers: WorkerRow[];
    departmentOptions: DepartmentOption[];
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [editing, setEditing] = useState<WorkerRow | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<WorkerRow | null>(null);
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
        setEditing(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (worker: WorkerRow) => {
        setMode('edit');
        setEditing(worker);
        setForm({
            name: worker.name,
            worker_type: worker.worker_type,
            department_id: worker.departmentId === null ? '' : String(worker.departmentId),
            phone: worker.phone ?? '',
            joining_date: worker.joiningDate ?? '',
            shift: worker.shift ?? '',
            remarks: worker.remarks ?? '',
            status: worker.status,
        });
        setModalOpen(true);
    };

    const submit = () => {
        if (!form.name.trim()) {
            toast.error('Enter a worker name.');
            return;
        }

        setProcessing(true);
        const payload = {
            name: form.name,
            worker_type: form.worker_type,
            department_id: form.department_id === '' ? null : Number(form.department_id),
            phone: form.phone,
            joining_date: form.joining_date || null,
            shift: form.shift,
            remarks: form.remarks,
            status: form.status,
        };

        if (mode === 'edit' && editing) {
            router.put(`/campus-workers/${editing.id}`, payload, {
                preserveScroll: true,
                onError: () => toast.error('Failed to update campus worker.'),
                onFinish: () => setProcessing(false),
            });
            return;
        }

        router.post('/campus-workers', payload, {
            preserveScroll: true,
            onError: () => toast.error('Failed to add campus worker.'),
            onFinish: () => setProcessing(false),
        });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        setProcessing(true);
        router.delete(`/campus-workers/${deleting.id}`, {
            preserveScroll: true,
            onError: () => toast.error('Failed to delete campus worker.'),
            onFinish: () => {
                setProcessing(false);
                setDeleteOpen(false);
            },
        });
    };

    return (
        <DashboardLayout user={user} activeTab="campus-workers">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Campus Workers')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t(
                                    'Track support staff who keep the campus running: gardeners, security, housekeeping and more.',
                                )}
                            </p>
                        </div>
                        <Button onClick={openAdd} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t('Add Worker')}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('All Workers')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>{t('Department')}</TableHead>
                                            <TableHead>{t('Phone')}</TableHead>
                                            <TableHead>{t('Shift')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {workers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                                    {t('No campus workers added yet.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            workers.map((worker, index) => (
                                                <TableRow key={worker.id}>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-800">
                                                        {worker.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{worker.worker_type}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {worker.departmentName ?? (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {worker.phone ?? <span className="text-slate-400">-</span>}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {worker.shift ?? <span className="text-slate-400">-</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={
                                                                worker.status === 'active'
                                                                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                                                            }
                                                        >
                                                            {worker.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openEdit(worker)}
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
                                                                    setDeleting(worker);
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
                            <HardHat className="h-5 w-5" />
                            {mode === 'edit' ? t('Edit Campus Worker') : t('Add Campus Worker')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Add a non-teaching worker assigned to campus duties.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="worker-name">{t('Name')}</Label>
                            <Input
                                id="worker-name"
                                value={form.name}
                                onChange={(event) => setForm({ ...form, name: event.target.value })}
                                placeholder={t('e.g. Ramesh Kumar')}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="worker-type">{t('Worker Type')}</Label>
                                <Select
                                    value={form.worker_type}
                                    onValueChange={(value) => setForm({ ...form, worker_type: value })}
                                >
                                    <SelectTrigger id="worker-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {WORKER_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="worker-department">{t('Department')}</Label>
                                <Select
                                    value={form.department_id}
                                    onValueChange={(value) => setForm({ ...form, department_id: value })}
                                >
                                    <SelectTrigger id="worker-department">
                                        <SelectValue placeholder={t('Select department')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departmentOptions.map((department) => (
                                            <SelectItem key={department.id} value={String(department.id)}>
                                                {department.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="worker-phone">{t('Phone')}</Label>
                                <Input
                                    id="worker-phone"
                                    value={form.phone}
                                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                                    placeholder={t('e.g. 9876543210')}
                                />
                            </div>
                            <div>
                                <Label htmlFor="worker-joining">{t('Joining Date')}</Label>
                                <Input
                                    id="worker-joining"
                                    type="date"
                                    value={form.joining_date}
                                    onChange={(event) => setForm({ ...form, joining_date: event.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="worker-shift">{t('Shift')}</Label>
                            <Input
                                id="worker-shift"
                                value={form.shift}
                                onChange={(event) => setForm({ ...form, shift: event.target.value })}
                                placeholder={t('e.g. Morning')}
                            />
                        </div>
                        <div>
                            <Label htmlFor="worker-remarks">{t('Remarks')}</Label>
                            <Textarea
                                id="worker-remarks"
                                value={form.remarks}
                                onChange={(event) => setForm({ ...form, remarks: event.target.value })}
                                rows={2}
                            />
                        </div>
                        <div>
                            <Label htmlFor="worker-status">{t('Status')}</Label>
                            <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                                <SelectTrigger id="worker-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={submit} disabled={processing} className="gap-2">
                            <FolderPlus className="h-4 w-4" />
                            {processing ? t('Saving...') : mode === 'edit' ? t('Save Changes') : t('Add Worker')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('Delete Campus Worker')}</DialogTitle>
                        <DialogDescription>
                            {t('Are you sure you want to delete')} "{deleting?.name}"? {t('This cannot be undone.')}
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
