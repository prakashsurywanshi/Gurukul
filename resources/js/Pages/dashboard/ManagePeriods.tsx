import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Clock, Coffee, Pencil, Plus, Save, Trash2 } from 'lucide-react';
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

interface SlotRow {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    slotType: 'period' | 'break';
    sortOrder: number;
}

interface FormState {
    name: string;
    startTime: string;
    endTime: string;
    slotType: 'period' | 'break';
}

export default function ManagePeriods({ user, slots }: { user: any; slots: SlotRow[] }) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<SlotRow | null>(null);
    const [form, setForm] = useState<FormState>({
        name: '',
        startTime: '',
        endTime: '',
        slotType: 'period',
    });
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<SlotRow | null>(null);
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
        setForm({
            name: '',
            startTime: '',
            endTime: '',
            slotType: 'period',
        });
        setModalOpen(true);
    };

    const openEdit = (slot: SlotRow) => {
        setEditing(slot);
        setForm({
            name: slot.name,
            startTime: slot.startTime.slice(0, 5),
            endTime: slot.endTime.slice(0, 5),
            slotType: slot.slotType,
        });
        setModalOpen(true);
    };

    const submit = () => {
        if (!form.name.trim() || !form.startTime || !form.endTime) {
            toast.error('Fill in the name and timings.');
            return;
        }

        setProcessing(true);

        if (editing) {
            router.put(`/time-slots/${editing.id}`, form, {
                preserveScroll: true,
                onError: () => toast.error('Failed to update slot.'),
                onFinish: () => setProcessing(false),
            });
            return;
        }

        router.post('/time-slots', form, {
            preserveScroll: true,
            onError: () => toast.error('Failed to add slot.'),
            onFinish: () => setProcessing(false),
        });
    };

    const move = (index: number, direction: -1 | 1) => {
        const target = index + direction;

        if (target < 0 || target >= slots.length) {
            return;
        }

        const reordered = [...slots];
        const [item] = reordered.splice(index, 1);
        reordered.splice(target, 0, item);
        router.post(
            '/time-slots/reorder',
            { order: reordered.map((slot) => slot.id) },
            {
                preserveScroll: true,
                onError: () => toast.error('Failed to reorder.'),
            },
        );
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        setProcessing(true);
        router.delete(`/time-slots/${deleting.id}`, {
            preserveScroll: true,
            onError: () => toast.error('Failed to delete.'),
            onFinish: () => {
                setProcessing(false);
                setDeleteOpen(false);
            },
        });
    };

    return (
        <DashboardLayout user={user} activeTab="time-slots">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Manage Periods')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Define the school day’s period and break time slots used across timetables.')}
                            </p>
                        </div>
                        <Button className="gap-2" onClick={openAdd}>
                            <Plus className="h-4 w-4" />
                            {t('Add Slot')}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('Time Slots')}</CardTitle>
                            <CardDescription>{t('Order defines the sequence of the school day.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {slots.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                                    <Clock className="h-8 w-8 text-slate-400" />
                                    <p className="text-sm text-slate-500">
                                        {t('No time slots yet. Add your first period.')}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>{t('Slot Name')}</TableHead>
                                                <TableHead>{t('Start Time')}</TableHead>
                                                <TableHead>{t('End Time')}</TableHead>
                                                <TableHead>{t('Type')}</TableHead>
                                                <TableHead className="text-right">{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {slots.map((slot, index) => (
                                                <TableRow key={slot.id}>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 font-medium text-slate-800">
                                                            {slot.slotType === 'break' ? (
                                                                <Coffee className="h-4 w-4 text-amber-500" />
                                                            ) : (
                                                                <Clock className="h-4 w-4 text-slate-400" />
                                                            )}
                                                            {t(slot.name)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        {slot.startTime.slice(0, 5)}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        {slot.endTime.slice(0, 5)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={
                                                                slot.slotType === 'break'
                                                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                                                            }
                                                        >
                                                            {slot.slotType === 'break' ? t('Break') : t('Period')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={index === 0}
                                                                onClick={() => move(index, -1)}
                                                            >
                                                                <ArrowUp className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={index === slots.length - 1}
                                                                onClick={() => move(index, 1)}
                                                            >
                                                                <ArrowDown className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-1.5"
                                                                onClick={() => openEdit(slot)}
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
                                                                    setDeleting(slot);
                                                                    setDeleteOpen(true);
                                                                }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                            <div className="mt-4 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                                <Save className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>
                                    {t('Tips')}:{' '}
                                    {t(
                                        'Add breaks between periods. Reordering saves immediately and reflects in new timetables.',
                                    )}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editing ? t('Edit Time Slot') : t('Add Time Slot')}</DialogTitle>
                            <DialogDescription>
                                {t('Give the slot a name and its start and end times.')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="space-y-2">
                                <Label>{t('Slot Name')}</Label>
                                <Input
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, name: event.target.value }))
                                    }
                                    placeholder={t('e.g. Period 1')}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('Start Time')}</Label>
                                    <Input
                                        type="time"
                                        value={form.startTime}
                                        onChange={(event) =>
                                            setForm((current) => ({ ...current, startTime: event.target.value }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('End Time')}</Label>
                                    <Input
                                        type="time"
                                        value={form.endTime}
                                        onChange={(event) =>
                                            setForm((current) => ({ ...current, endTime: event.target.value }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Type')}</Label>
                                <Select
                                    value={form.slotType}
                                    onValueChange={(value) =>
                                        setForm((current) => ({
                                            ...current,
                                            slotType: value as 'period' | 'break',
                                        }))
                                    }
                                >
                                    <SelectTrigger id="slot-type-select">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="period">{t('Period')}</SelectItem>
                                        <SelectItem value="break">{t('Break')}</SelectItem>
                                    </SelectContent>
                                </Select>
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
                            <DialogTitle>{t('Delete Time Slot')}</DialogTitle>
                            <DialogDescription>
                                {t('Delete')} "{deleting?.name}"? {t('This does not affect existing timetables.')}
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
