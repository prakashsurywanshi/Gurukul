import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { BedDouble, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface RoomTypeRow {
    id: string;
    name: string;
    label?: string | null;
    capacity: number;
    fee: number;
    status: boolean;
}

interface DefaultRoomType {
    name: string;
    label: string;
    capacity: number;
}

interface HostelRoomTypesProps {
    user: any;
    organization: any;
    systemNames: string[];
    defaults: DefaultRoomType[];
    roomTypes: RoomTypeRow[];
    usage: Record<string, number>;
}

export default function HostelRoomTypes({
    user,
    organization,
    systemNames,
    defaults,
    roomTypes,
    usage,
}: HostelRoomTypesProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<RoomTypeRow | null>(null);
    const [form, setForm] = useState({ name: '', label: '', capacity: '2', fee: '' });
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const page = usePage() as any;
    const errors = (page.props as any).errors ?? {};

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    useEffect(() => {
        if (errors.name) {
            setErrorMessage(errors.name);
            setDialogOpen(true);
        }
    }, [errors.name]);

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', label: '', capacity: '2', fee: '' });
        setErrorMessage(null);
        setDialogOpen(true);
    };

    const openEdit = (row: RoomTypeRow) => {
        setEditing(row);
        setForm({
            name: '',
            label: row.label ?? '',
            capacity: String(row.capacity),
            fee: row.fee ? String(row.fee) : '',
        });
        setErrorMessage(null);
        setDialogOpen(true);
    };

    const close = () => {
        setDialogOpen(false);
        setErrorMessage(null);
    };

    const submit = () => {
        if (!editing && !form.name.trim()) {
            toast.error(t('Enter a value for the room type.'));
            return;
        }

        setProcessing(true);

        const payload = editing
            ? {
                  label: form.label.trim() || null,
                  capacity: form.capacity || null,
                  fee: form.fee === '' ? null : Number(form.fee),
              }
            : {
                  name: form.name.trim(),
                  label: form.label.trim() || null,
                  capacity: form.capacity || 2,
                  fee: form.fee === '' ? 0 : Number(form.fee),
              };
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setErrorMessage(null);
            },
            onError: () => setErrorMessage(editing ? t('Failed to update room type.') : t('Failed to add room type.')),
            onFinish: () => setProcessing(false),
        };

        if (editing) {
            router.patch(`/hostel/room-types/${editing.id}`, payload, options);
        } else {
            router.post('/hostel/room-types', payload, options);
        }
    };

    const toggle = (row: RoomTypeRow) => {
        router.patch(
            `/hostel/room-types/${row.id}`,
            { status: !row.status },
            {
                preserveScroll: true,
                onError: () => toast.error(t('Failed to update room type.')),
            },
        );
    };

    const remove = (row: RoomTypeRow) => {
        if (!window.confirm(t('Delete this room type?'))) {
            return;
        }

        router.delete(`/hostel/room-types/${row.id}`, {
            preserveScroll: true,
            onError: () => toast.error(t('Failed to delete room type.')),
        });
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                    <BedDouble className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle>{t('Hostel Room Types')}</CardTitle>
                                    <CardDescription>
                                        {t('Manage the room type categories used across hostels.')}
                                    </CardDescription>
                                </div>
                            </div>
                            <Button onClick={openAdd}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Add Room Type')}
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                {defaults.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('System defaults')}</CardTitle>
                            <CardDescription>{t('These room types are always available.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {defaults.map((item) => {
                                    const used = usage[item.name] ?? 0;

                                    return (
                                        <div
                                            key={item.name}
                                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                                        >
                                            <BedDouble className="h-4 w-4 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-gray-200">
                                                {item.label}
                                            </span>
                                            <Badge variant="outline" className="bg-white text-slate-500">
                                                {t('Capacity')} {item.capacity}
                                            </Badge>
                                            <span className="text-xs text-slate-400">
                                                {used} {t('room(s)')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Custom Room Types')}</CardTitle>
                        <CardDescription>{t('Add your own room types for this organization.')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Name')}</TableHead>
                                        <TableHead>{t('Display Label')}</TableHead>
                                        <TableHead>{t('Capacity')}</TableHead>
                                        <TableHead>{t('Monthly Fee')}</TableHead>
                                        <TableHead>{t('Rooms')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead className="text-right">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {roomTypes.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                                {t('No custom room types yet.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        roomTypes.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                    {row.name}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {row.label || '-'}
                                                </TableCell>
                                                <TableCell>{row.capacity}</TableCell>
                                                <TableCell>₹{row.fee.toFixed(2)}</TableCell>
                                                <TableCell>{usage[row.name] ?? 0}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            row.status
                                                                ? 'bg-green-50 text-green-700'
                                                                : 'bg-slate-100 text-slate-500'
                                                        }
                                                    >
                                                        {row.status ? t('Active') : t('Inactive')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => toggle(row)}
                                                        >
                                                            <Power
                                                                className={`mr-1.5 h-3.5 w-3.5 ${row.status ? 'text-green-600' : 'text-slate-400'}`}
                                                            />
                                                            {row.status ? t('Disable') : t('Enable')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEdit(row)}
                                                        >
                                                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                                            {t('Edit')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:bg-red-50"
                                                            onClick={() => remove(row)}
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
                    </CardContent>
                </Card>
            </div>

            <Dialog open={dialogOpen} onOpenChange={(open) => (open ? undefined : close())}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? t('Edit Room Type') : t('Add Room Type')}</DialogTitle>
                        <DialogDescription>
                            {editing
                                ? t('Update the room type details.')
                                : t('Enter a value and optional display details.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {!editing && (
                            <div className="grid gap-2">
                                <Label>{t('Room Type Value')}</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. suite"
                                    autoFocus
                                />
                                <p className="text-xs text-slate-500">
                                    {t('Lowercase letters, numbers, dash or underscore.')}
                                </p>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label>{t('Display Label')}</Label>
                            <Input
                                value={form.label}
                                onChange={(e) => setForm({ ...form, label: e.target.value })}
                                placeholder={t('e.g. Suite')}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('Default Capacity')}</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.capacity}
                                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Default Monthly Fee')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={form.fee}
                                    onChange={(e) => setForm({ ...form, fee: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            submit();
                                        }
                                    }}
                                />
                            </div>
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
        </DashboardLayout>
    );
}
