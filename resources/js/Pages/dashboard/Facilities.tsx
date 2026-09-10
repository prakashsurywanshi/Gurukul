import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Building2, FolderPlus, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface FacilityRow {
    id: number;
    name: string;
    facility_type: string;
    capacity: number | null;
    location: string;
    description: string;
    status: string;
    sortOrder: number;
}

const FACILITY_TYPES = [
    'classroom',
    'laboratory',
    'library',
    'sports',
    'auditorium',
    'canteen',
    'playground',
    'office',
    'washroom',
    'transport',
    'other',
];

const emptyForm = {
    name: '',
    facility_type: 'classroom',
    capacity: '',
    location: '',
    description: '',
    status: 'active',
    sortOrder: '0',
};

export default function Facilities({ user, facilities }: { user: any; facilities: FacilityRow[] }) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [editing, setEditing] = useState<FacilityRow | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<FacilityRow | null>(null);
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
        setForm({
            ...emptyForm,
            sortOrder: String(Math.max(0, ...facilities.map((facility) => facility.sortOrder)) + 1),
        });
        setModalOpen(true);
    };

    const openEdit = (facility: FacilityRow) => {
        setMode('edit');
        setEditing(facility);
        setForm({
            name: facility.name,
            facility_type: facility.facility_type,
            capacity: facility.capacity === null ? '' : String(facility.capacity),
            location: facility.location ?? '',
            description: facility.description ?? '',
            status: facility.status,
            sortOrder: String(facility.sortOrder),
        });
        setModalOpen(true);
    };

    const submit = () => {
        if (!form.name.trim()) {
            toast.error('Enter a facility name.');
            return;
        }

        setProcessing(true);
        const payload = {
            name: form.name,
            facility_type: form.facility_type,
            capacity: form.capacity === '' ? null : Number(form.capacity),
            location: form.location,
            description: form.description,
            status: form.status,
            sort_order: Number(form.sortOrder) || 0,
        };

        if (mode === 'edit' && editing) {
            router.put(`/facilities/${editing.id}`, payload, {
                preserveScroll: true,
                onError: () => toast.error('Failed to update facility.'),
                onFinish: () => setProcessing(false),
            });
            return;
        }

        router.post('/facilities', payload, {
            preserveScroll: true,
            onError: () => toast.error('Failed to add facility.'),
            onFinish: () => setProcessing(false),
        });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        setProcessing(true);
        router.delete(`/facilities/${deleting.id}`, {
            preserveScroll: true,
            onError: () => toast.error('Failed to delete facility.'),
            onFinish: () => {
                setProcessing(false);
                setDeleteOpen(false);
            },
        });
    };

    return (
        <DashboardLayout user={user} activeTab="facilities">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Facilities')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Manage the buildings, rooms and amenities of the campus.')}
                            </p>
                        </div>
                        <Button onClick={openAdd} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t('Add Facility')}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('All Facilities')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>{t('Capacity')}</TableHead>
                                            <TableHead>{t('Location')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {facilities.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                                    {t('No facilities created yet.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            facilities.map((facility, index) => (
                                                <TableRow key={facility.id}>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-800">
                                                        {facility.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{facility.facility_type}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        {facility.capacity === null ? '-' : facility.capacity}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {facility.location ? (
                                                            <span className="inline-flex items-center gap-1">
                                                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                                {facility.location}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={
                                                                facility.status === 'active'
                                                                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                                                            }
                                                        >
                                                            {facility.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openEdit(facility)}
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
                                                                    setDeleting(facility);
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
                            <Building2 className="h-5 w-5" />
                            {mode === 'edit' ? t('Edit Facility') : t('Add Facility')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Record a facility such as a classroom, lab, or playground.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="facility-name">{t('Name')}</Label>
                            <Input
                                id="facility-name"
                                value={form.name}
                                onChange={(event) => setForm({ ...form, name: event.target.value })}
                                placeholder={t('e.g. Science Lab 2')}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="facility-type">{t('Type')}</Label>
                                <Select
                                    value={form.facility_type}
                                    onValueChange={(value) => setForm({ ...form, facility_type: value })}
                                >
                                    <SelectTrigger id="facility-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FACILITY_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="facility-capacity">{t('Capacity')}</Label>
                                <Input
                                    id="facility-capacity"
                                    type="number"
                                    min={0}
                                    value={form.capacity}
                                    onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                                    placeholder={t('e.g. 40')}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="facility-location">{t('Location')}</Label>
                            <Input
                                id="facility-location"
                                value={form.location}
                                onChange={(event) => setForm({ ...form, location: event.target.value })}
                                placeholder={t('e.g. Block A, Ground Floor')}
                            />
                        </div>
                        <div>
                            <Label htmlFor="facility-description">{t('Description')}</Label>
                            <Input
                                id="facility-description"
                                value={form.description}
                                onChange={(event) => setForm({ ...form, description: event.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="facility-status">{t('Status')}</Label>
                                <Select
                                    value={form.status}
                                    onValueChange={(value) => setForm({ ...form, status: value })}
                                >
                                    <SelectTrigger id="facility-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="facility-sort">{t('Sort Order')}</Label>
                                <Input
                                    id="facility-sort"
                                    type="number"
                                    min={0}
                                    value={form.sortOrder}
                                    onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={submit} disabled={processing} className="gap-2">
                            <FolderPlus className="h-4 w-4" />
                            {processing ? t('Saving...') : mode === 'edit' ? t('Save Changes') : t('Add Facility')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('Delete Facility')}</DialogTitle>
                        <DialogDescription>
                            {t('Are you sure you want to delete the facility')} "{deleting?.name}"?{' '}
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
