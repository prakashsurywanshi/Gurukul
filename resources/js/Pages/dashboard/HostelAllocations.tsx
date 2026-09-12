import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { BedDouble, Plus, Undo2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

interface AllocationRow {
    id: string;
    studentId: string;
    studentName: string;
    admissionNo?: string;
    class?: string;
    section?: string;
    hostelName: string;
    roomNumber: string;
    floor?: string;
    bedNumber?: string;
    allocationDate?: string;
    remarks?: string;
}

interface StudentRow {
    id: string;
    name: string;
    admissionNo?: string;
    class?: string;
    section?: string;
}

interface HostelRow {
    id: string;
    name: string;
}

interface RoomRow {
    id: string;
    hostelId: string;
    roomNumber: string;
    floor?: string;
    roomType?: string;
    capacity: number;
    occupied: number;
    status: string;
}

interface BedRow {
    id: string;
    roomId: string;
    bedNumber: string;
    status: string;
    assignedStudentId?: string;
}

interface HostelAllocationsProps {
    user: any;
    allocations: AllocationRow[];
    allocatedStudentIds: string[];
    students: StudentRow[];
    hostels: HostelRow[];
    rooms: RoomRow[];
    beds: BedRow[];
}

export default function HostelAllocations({
    user,
    allocations,
    allocatedStudentIds,
    students,
    hostels,
    rooms,
    beds,
}: HostelAllocationsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({
        studentId: '',
        hostelId: '',
        roomId: '',
        bedId: '',
        allocationDate: '',
        remarks: '',
    });
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
        if (errors.bedId || errors.studentId || errors.hostelId || errors.roomId) {
            setErrorMessage(errors.bedId ?? errors.studentId ?? errors.hostelId ?? errors.roomId);
            setDialogOpen(true);
        }
    }, [errors.bedId, errors.studentId, errors.hostelId, errors.roomId]);

    const availableStudents = useMemo(
        () => students.filter((student) => !allocatedStudentIds.includes(student.id)),
        [students, allocatedStudentIds],
    );

    const hostelRooms = useMemo(
        () =>
            rooms
                .filter((room) => room.hostelId === form.hostelId && room.occupied < room.capacity)
                .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)),
        [rooms, form.hostelId],
    );

    const roomBeds = useMemo(
        () =>
            beds
                .filter((bed) => bed.roomId === form.roomId && bed.status === 'available' && !bed.assignedStudentId)
                .sort((a, b) => a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true })),
        [beds, form.roomId],
    );

    const openAdd = () => {
        setForm({ studentId: '', hostelId: '', roomId: '', bedId: '', allocationDate: '', remarks: '' });
        setErrorMessage(null);
        setDialogOpen(true);
    };

    const close = () => {
        setDialogOpen(false);
        setErrorMessage(null);
    };

    const submit = () => {
        if (!form.studentId || !form.hostelId || !form.roomId || !form.bedId) {
            toast.error(t('Select a student, hostel, room and bed.'));
            return;
        }

        setProcessing(true);

        router.post(
            '/hostel/allocations',
            {
                studentId: Number(form.studentId),
                hostelId: Number(form.hostelId),
                roomId: Number(form.roomId),
                bedId: Number(form.bedId),
                allocationDate: form.allocationDate || null,
                remarks: form.remarks.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDialogOpen(false);
                    setErrorMessage(null);
                },
                onError: () => setErrorMessage(t('Failed to allocate student.')),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const release = (allocation: AllocationRow) => {
        if (!window.confirm(t(`Release ${allocation.studentName} from this bed?`))) {
            return;
        }

        router.post(
            `/hostel/allocations/${allocation.id}/release`,
            {},
            {
                preserveScroll: true,
                onError: () => toast.error(t('Failed to release allocation.')),
            },
        );
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
                                    <CardTitle>{t('Student Allocation')}</CardTitle>
                                    <CardDescription>{t('Assign hostel rooms and beds to students.')}</CardDescription>
                                </div>
                            </div>
                            <Button onClick={openAdd}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Allocate Student')}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Student')}</TableHead>
                                        <TableHead>{t('Class')}</TableHead>
                                        <TableHead>{t('Hostel')}</TableHead>
                                        <TableHead>{t('Room')}</TableHead>
                                        <TableHead>{t('Bed')}</TableHead>
                                        <TableHead>{t('Allocation Date')}</TableHead>
                                        <TableHead className="text-right">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allocations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                                {t('No active allocations yet.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        allocations.map((allocation) => (
                                            <TableRow key={allocation.id}>
                                                <TableCell>
                                                    <div className="font-medium text-slate-800 dark:text-gray-100">
                                                        {allocation.studentName}
                                                    </div>
                                                    {allocation.admissionNo && (
                                                        <div className="text-xs text-slate-500">
                                                            {allocation.admissionNo}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {allocation.class
                                                        ? `${allocation.class}${allocation.section ? '-' + allocation.section : ''}`
                                                        : '-'}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {allocation.hostelName}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {allocation.roomNumber}
                                                    {allocation.floor ? ` (${allocation.floor})` : ''}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {allocation.bedNumber ?? '-'}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-gray-300">
                                                    {allocation.allocationDate ?? '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:bg-red-50"
                                                            onClick={() => release(allocation)}
                                                        >
                                                            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                                                            {t('Release')}
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
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('Allocate Student')}</DialogTitle>
                        <DialogDescription>{t('Select a hostel, then a room and an available bed.')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{t('Student')}</Label>
                            <Select
                                value={form.studentId || undefined}
                                onValueChange={(value) => setForm({ ...form, studentId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select student...')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableStudents.length === 0 ? (
                                        <SelectItem value="_none" disabled>
                                            {t('No unallocated students')}
                                        </SelectItem>
                                    ) : (
                                        availableStudents.map((student) => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.name}
                                                {student.admissionNo ? ` (${student.admissionNo})` : ''}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Hostel')}</Label>
                            <Select
                                value={form.hostelId || undefined}
                                onValueChange={(value) => setForm({ ...form, hostelId: value, roomId: '', bedId: '' })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select hostel...')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {hostels.map((hostel) => (
                                        <SelectItem key={hostel.id} value={hostel.id}>
                                            {hostel.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Room')}</Label>
                            <Select
                                value={form.roomId || undefined}
                                onValueChange={(value) => setForm({ ...form, roomId: value, bedId: '' })}
                                disabled={!form.hostelId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select room...')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {hostelRooms.length === 0 ? (
                                        <SelectItem value="_none" disabled>
                                            {t('No rooms with free capacity')}
                                        </SelectItem>
                                    ) : (
                                        hostelRooms.map((room) => (
                                            <SelectItem key={room.id} value={room.id}>
                                                {room.roomNumber}
                                                {room.floor ? ` (${room.floor})` : ''} — {t('Capacity')} {room.occupied}
                                                /{room.capacity}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Bed')}</Label>
                            <Select
                                value={form.bedId || undefined}
                                onValueChange={(value) => setForm({ ...form, bedId: value })}
                                disabled={!form.roomId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select bed...')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {roomBeds.length === 0 ? (
                                        <SelectItem value="_none" disabled>
                                            {t('No available beds')}
                                        </SelectItem>
                                    ) : (
                                        roomBeds.map((bed) => (
                                            <SelectItem key={bed.id} value={bed.id}>
                                                {bed.bedNumber}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Allocation Date')}</Label>
                            <Input
                                type="date"
                                value={form.allocationDate}
                                onChange={(e) => setForm({ ...form, allocationDate: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Remarks')}</Label>
                            <Textarea
                                value={form.remarks}
                                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                placeholder={t('Optional notes')}
                            />
                        </div>
                        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={close}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={submit} disabled={processing}>
                            {processing ? t('Saving...') : t('Allocate')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
