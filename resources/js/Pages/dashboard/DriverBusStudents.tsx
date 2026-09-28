import { useLanguage } from '../../i18n/LanguageProvider';
import {
    BadgeCheck,
    BusFront,
    ClipboardList,
    MapPinned,
    Pencil,
    Search,
    ShieldCheck,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';

interface BusPolicy {
    busType: string;
    rosterControl: string;
    boardingControl: string;
    requiresRosterApproval: boolean;
    requiresFeeApproval: boolean;
    feeLedger: string;
    vendorName: string;
    vendorContractNo: string;
    vendorValidFrom: string;
    vendorValidTill: string;
    vendorContact: string;
    notes: string;
    inherited: boolean;
}

interface BusVehicle {
    id: string;
    vehicleNumber: string;
    vehicleType: string;
    capacity: number;
    routeName: string;
    stops: string[];
    status: string;
    policy: BusPolicy;
    canManageRoster: boolean;
}

interface BusAssignment {
    id: string;
    studentId: string;
    studentName: string;
    admissionNo: string;
    className: string;
    section: string;
    vehicleId: string;
    vehicleNumber: string;
    routeId: string;
    routeName: string;
    pickupStop: string;
    dropStop: string;
    pickupTime: string;
    dropTime: string;
    monthlyFee: number;
    status: string;
    isPending: boolean;
    createdBy: string;
    decisionNote: string;
    feeLedger: string;
    canRevoke: boolean;
}

interface AvailableStudent {
    id: string;
    name: string;
    admissionNo: string;
    class: string;
    section: string;
}

interface PolicyOptions {
    busTypes: string[];
    rosterControls: string[];
    boardingControls: string[];
    feeLedgers: string[];
    presets: Record<string, BusPolicy>;
}

interface Props {
    user: any;
    isDriverView: boolean;
    vehicles: BusVehicle[];
    assignments: BusAssignment[];
    students: AvailableStudent[];
    policyOptions: PolicyOptions;
    flash?: { success?: string; error?: string };
    errors?: Record<string, string>;
}

const ROSTER_LABELS: Record<string, string> = {
    manager_only: 'Transport office only',
    driver_only: 'Driver only',
    both: 'Driver and transport office',
};

const BOARDING_LABELS: Record<string, string> = {
    driver_only: 'Driver only',
    driver_and_manager: 'Driver and transport office',
    manager_only: 'Transport office only',
};

const LEDGER_LABELS: Record<string, string> = {
    school: 'School fee ledger',
    vendor: 'Vendor payable',
};

const BUS_TYPE_LABELS: Record<string, string> = {
    school_owned: 'School owned',
    private_vendor: 'Private vendor',
};

function policyFrom(vehicle: BusVehicle): BusPolicy {
    return { ...vehicle.policy };
}

function DriverBusStudents({
    user,
    isDriverView,
    vehicles,
    assignments,
    students,
    policyOptions,
    flash,
    errors,
}: Props) {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const [vehicleFilter, setVehicleFilter] = useState('all');
    const [editingPolicyFor, setEditingPolicyFor] = useState<string | null>(null);

    const policyForm = useForm({
        busType: 'school_owned',
        rosterControl: 'manager_only',
        boardingControl: 'driver_only',
        requiresRosterApproval: false,
        requiresFeeApproval: false,
        feeLedger: 'school',
        vendorName: '',
        vendorContractNo: '',
        vendorValidFrom: '',
        vendorValidTill: '',
        vendorContact: '',
        notes: '',
    });

    const assignForm = useForm({
        vehicleId: '',
        routeId: '',
        studentId: '',
        pickupStop: '',
        dropStop: '',
        pickupTime: '',
        dropTime: '',
        monthlyFee: '0',
    });

    const [assignError, setAssignError] = useState('');

    const selectedVehicle = useMemo(
        () => vehicles.find((vehicle) => vehicle.id === assignForm.data.vehicleId),
        [vehicles, assignForm.data.vehicleId],
    );

    const visibleAssignments = useMemo(() => {
        const term = search.trim().toLowerCase();

        return assignments.filter((assignment) => {
            const matchesVehicle = vehicleFilter === 'all' || assignment.vehicleId === vehicleFilter;
            if (!matchesVehicle) return false;
            if (!term) return true;

            return [assignment.studentName, assignment.admissionNo, assignment.pickupStop, assignment.routeName]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(term));
        });
    }, [assignments, search, vehicleFilter]);

    const pendingCount = assignments.filter((assignment) => assignment.isPending).length;
    const vendorTotal = assignments
        .filter((assignment) => assignment.feeLedger === 'vendor' && !assignment.isPending)
        .reduce((sum, assignment) => sum + assignment.monthlyFee, 0);

    const openPolicyEditor = (vehicle: BusVehicle) => {
        const policy = policyFrom(vehicle);
        policyForm.setData({
            busType: policy.busType || 'school_owned',
            rosterControl: policy.rosterControl || 'manager_only',
            boardingControl: policy.boardingControl || 'driver_only',
            requiresRosterApproval: !!policy.requiresRosterApproval,
            requiresFeeApproval: !!policy.requiresFeeApproval,
            feeLedger: policy.feeLedger || 'school',
            vendorName: policy.vendorName || '',
            vendorContractNo: policy.vendorContractNo || '',
            vendorValidFrom: policy.vendorValidFrom || '',
            vendorValidTill: policy.vendorValidTill || '',
            vendorContact: policy.vendorContact || '',
            notes: policy.notes || '',
        });
        setEditingPolicyFor(vehicle.id);
    };

    const applyPreset = (presetKey: string) => {
        const preset = policyOptions.presets?.[presetKey];

        if (!preset) return;

        policyForm.setData({
            ...policyForm.data,
            busType: preset.busType,
            rosterControl: preset.rosterControl,
            boardingControl: preset.boardingControl,
            requiresRosterApproval: !!preset.requiresRosterApproval,
            requiresFeeApproval: !!preset.requiresFeeApproval,
            feeLedger: preset.feeLedger,
        });
    };

    const savePolicy = (vehicleId: string) => {
        policyForm.post(`/driver/bus-students/${vehicleId}/policy`, {
            preserveScroll: true,
            onSuccess: () => {
                policyForm.reset();
                setEditingPolicyFor(null);
            },
        });
    };

    const pickStudent = (studentId: string) => {
        const student = students.find((item) => item.id === studentId);
        const vehicle = selectedVehicle;

        assignForm.setData({
            ...assignForm.data,
            studentId,
            pickupStop: vehicle?.stops?.[0] ?? assignForm.data.pickupStop,
            dropStop: vehicle?.stops?.[vehicle.stops.length - 1] ?? assignForm.data.dropStop,
            routeId: vehicle ? findRouteId(vehicle) : assignForm.data.routeId,
        });
    };

    const findRouteId = (vehicle: BusVehicle) => {
        const match = assignments.find((assignment) => assignment.vehicleId === vehicle.id);

        return match?.routeId ?? '';
    };

    const submitAssignment = () => {
        setAssignError('');

        if (!assignForm.data.vehicleId || !assignForm.data.studentId || !assignForm.data.pickupStop) {
            setAssignError(t('Pick a bus, a student and a pickup stop.'));

            return;
        }

        assignForm.post('/driver/bus-students/assignments', {
            preserveScroll: true,
            onSuccess: () => {
                assignForm.reset();
            },
        });
    };

    const revoke = (assignment: BusAssignment) => {
        if (!window.confirm(t(`Remove ${assignment.studentName} from ${assignment.vehicleNumber}?`))) {
            return;
        }

        router.delete(`/driver/bus-students/assignments/${assignment.id}`, { preserveScroll: true });
    };

    return (
        <DashboardLayout user={user} activeTab="transport-bus-students">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                {isDriverView ? t('My Bus Students') : t('Bus Roster and Policy')}
                            </h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {isDriverView
                                    ? t('Manage the students on your bus and the rules your school set for it.')
                                    : t(
                                          'Set roster, boarding, approval and vendor rules for every bus, then review driver requests.',
                                      )}
                            </p>
                        </div>
                    </div>

                    {flash?.success && (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {flash.error}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <BusFront className="h-8 w-8 text-indigo-600" />
                                <div>
                                    <p className="text-xs text-slate-500">{t('My Buses')}</p>
                                    <p className="text-lg font-semibold">{vehicles.length}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <Users className="h-8 w-8 text-emerald-600" />
                                <div>
                                    <p className="text-xs text-slate-500">{t('Students on Buses')}</p>
                                    <p className="text-lg font-semibold">
                                        {assignments.filter((item) => !item.isPending).length}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <ClipboardList className="h-8 w-8 text-amber-600" />
                                <div>
                                    <p className="text-xs text-slate-500">{t('Waiting Approval')}</p>
                                    <p className="text-lg font-semibold">{pendingCount}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <MapPinned className="h-8 w-8 text-sky-600" />
                                <div>
                                    <p className="text-xs text-slate-500">{t('Vendor Monthly Due')}</p>
                                    <p className="text-lg font-semibold">₹{vendorTotal.toLocaleString()}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ShieldCheck className="h-4 w-4" />
                                {t('Bus Policy')}
                            </CardTitle>
                            <CardDescription>
                                {t(
                                    'Each bus keeps its own rules. Whatever you leave untouched follows the school-owned preset.',
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {vehicles.length === 0 && (
                                <p className="text-sm text-slate-500">
                                    {t('No bus is assigned to you yet. Ask the transport office to link a bus.')}
                                </p>
                            )}

                            {vehicles.map((vehicle) => (
                                <div key={vehicle.id} className="rounded-lg border border-slate-200 bg-white p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-slate-900">
                                                {vehicle.vehicleNumber}
                                                <span className="ml-2 text-sm font-normal text-slate-500">
                                                    {vehicle.vehicleType} · {vehicle.routeName || t('No route')}
                                                </span>
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <Badge variant="outline">
                                                    {BUS_TYPE_LABELS[vehicle.policy.busType] ?? vehicle.policy.busType}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {t('Roster')}:{' '}
                                                    {ROSTER_LABELS[vehicle.policy.rosterControl] ??
                                                        vehicle.policy.rosterControl}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {t('Boarding')}:{' '}
                                                    {BOARDING_LABELS[vehicle.policy.boardingControl] ??
                                                        vehicle.policy.boardingControl}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {LEDGER_LABELS[vehicle.policy.feeLedger] ??
                                                        vehicle.policy.feeLedger}
                                                </Badge>
                                                {vehicle.policy.requiresRosterApproval && (
                                                    <Badge className="bg-amber-100 text-amber-800">
                                                        {t('Driver requests need approval')}
                                                    </Badge>
                                                )}
                                                {vehicle.policy.inherited && (
                                                    <Badge className="bg-slate-100 text-slate-600">
                                                        {t('Using school default')}
                                                    </Badge>
                                                )}
                                            </div>
                                            {vehicle.policy.busType === 'private_vendor' &&
                                                vehicle.policy.vendorName && (
                                                    <p className="mt-2 text-xs text-slate-500">
                                                        {t('Vendor')}: {vehicle.policy.vendorName}
                                                        {vehicle.policy.vendorContractNo
                                                            ? ` · ${t('Contract')}: ${vehicle.policy.vendorContractNo}`
                                                            : ''}
                                                        {vehicle.policy.vendorValidTill
                                                            ? ` · ${t('Valid till')}: ${vehicle.policy.vendorValidTill}`
                                                            : ''}
                                                    </p>
                                                )}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openPolicyEditor(vehicle)}
                                        >
                                            <Pencil className="mr-2 h-4 w-4" />
                                            {t('Edit Policy')}
                                        </Button>
                                    </div>

                                    {editingPolicyFor === vehicle.id && (
                                        <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => applyPreset('school_owned')}
                                                >
                                                    {t('Use school owned preset')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => applyPreset('private_vendor')}
                                                >
                                                    {t('Use private vendor preset')}
                                                </Button>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <Label>{t('Bus Type')}</Label>
                                                    <Select
                                                        value={policyForm.data.busType}
                                                        onValueChange={(value) => policyForm.setData('busType', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {policyOptions.busTypes.map((type) => (
                                                                <SelectItem key={type} value={type}>
                                                                    {BUS_TYPE_LABELS[type] ?? type}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div>
                                                    <Label>{t('Roster Control')}</Label>
                                                    <Select
                                                        value={policyForm.data.rosterControl}
                                                        onValueChange={(value) =>
                                                            policyForm.setData('rosterControl', value)
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {policyOptions.rosterControls.map((control) => (
                                                                <SelectItem key={control} value={control}>
                                                                    {ROSTER_LABELS[control] ?? control}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div>
                                                    <Label>{t('Pickup and Drop Control')}</Label>
                                                    <Select
                                                        value={policyForm.data.boardingControl}
                                                        onValueChange={(value) =>
                                                            policyForm.setData('boardingControl', value)
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {policyOptions.boardingControls.map((control) => (
                                                                <SelectItem key={control} value={control}>
                                                                    {BOARDING_LABELS[control] ?? control}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div>
                                                    <Label>{t('Fees Go To')}</Label>
                                                    <Select
                                                        value={policyForm.data.feeLedger}
                                                        onValueChange={(value) =>
                                                            policyForm.setData('feeLedger', value)
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {policyOptions.feeLedgers.map((ledger) => (
                                                                <SelectItem key={ledger} value={ledger}>
                                                                    {LEDGER_LABELS[ledger] ?? ledger}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-6">
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-slate-300"
                                                        checked={policyForm.data.requiresRosterApproval}
                                                        onChange={(event) =>
                                                            policyForm.setData(
                                                                'requiresRosterApproval',
                                                                event.target.checked,
                                                            )
                                                        }
                                                    />
                                                    {t('Driver roster changes need manager approval')}
                                                </label>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-slate-300"
                                                        checked={policyForm.data.requiresFeeApproval}
                                                        onChange={(event) =>
                                                            policyForm.setData(
                                                                'requiresFeeApproval',
                                                                event.target.checked,
                                                            )
                                                        }
                                                    />
                                                    {t('Driver entered fees need manager approval')}
                                                </label>
                                            </div>

                                            {policyForm.data.busType === 'private_vendor' && (
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div>
                                                        <Label>{t('Vendor Name')}</Label>
                                                        <Input
                                                            value={policyForm.data.vendorName}
                                                            onChange={(event) =>
                                                                policyForm.setData('vendorName', event.target.value)
                                                            }
                                                        />
                                                        {errors?.vendorName && (
                                                            <p className="mt-1 text-xs text-rose-600">
                                                                {errors.vendorName}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Label>{t('Vendor Contract Number')}</Label>
                                                        <Input
                                                            value={policyForm.data.vendorContractNo}
                                                            onChange={(event) =>
                                                                policyForm.setData(
                                                                    'vendorContractNo',
                                                                    event.target.value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>{t('Contract Valid From')}</Label>
                                                        <Input
                                                            type="date"
                                                            value={policyForm.data.vendorValidFrom}
                                                            onChange={(event) =>
                                                                policyForm.setData(
                                                                    'vendorValidFrom',
                                                                    event.target.value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>{t('Contract Valid Till')}</Label>
                                                        <Input
                                                            type="date"
                                                            value={policyForm.data.vendorValidTill}
                                                            onChange={(event) =>
                                                                policyForm.setData(
                                                                    'vendorValidTill',
                                                                    event.target.value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>{t('Vendor Contact')}</Label>
                                                        <Input
                                                            value={policyForm.data.vendorContact}
                                                            onChange={(event) =>
                                                                policyForm.setData('vendorContact', event.target.value)
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <Label>{t('Policy Notes')}</Label>
                                                <Textarea
                                                    value={policyForm.data.notes}
                                                    onChange={(event) =>
                                                        policyForm.setData('notes', event.target.value)
                                                    }
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    onClick={() => savePolicy(vehicle.id)}
                                                    disabled={policyForm.processing}
                                                >
                                                    <BadgeCheck className="mr-2 h-4 w-4" />
                                                    {t('Save Policy')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setEditingPolicyFor(null)}
                                                >
                                                    {t('Cancel')}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {vehicles.some((vehicle) => vehicle.canManageRoster) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <UserPlus className="h-4 w-4" />
                                    {t('Add Student to a Bus')}
                                </CardTitle>
                                <CardDescription>
                                    {t(
                                        'Only students without a bus this session are listed. If the bus needs approval the request waits for the transport office.',
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <Label>{t('Bus')}</Label>
                                        <Select
                                            value={assignForm.data.vehicleId}
                                            onValueChange={(value) => {
                                                const vehicle = vehicles.find((item) => item.id === value);
                                                assignForm.setData({
                                                    ...assignForm.data,
                                                    vehicleId: value,
                                                    routeId: findRouteId(vehicle ?? ({} as BusVehicle)),
                                                    pickupStop: vehicle?.stops?.[0] ?? '',
                                                    dropStop: vehicle?.stops?.[vehicle.stops.length - 1] ?? '',
                                                });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Choose a bus')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vehicles
                                                    .filter((vehicle) => vehicle.canManageRoster)
                                                    .map((vehicle) => (
                                                        <SelectItem key={vehicle.id} value={vehicle.id}>
                                                            {vehicle.vehicleNumber} · {vehicle.routeName}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                        {errors?.vehicleId && (
                                            <p className="mt-1 text-xs text-rose-600">{errors.vehicleId}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label>{t('Student')}</Label>
                                        <Select value={assignForm.data.studentId} onValueChange={pickStudent}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Choose a student')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {students.map((student) => (
                                                    <SelectItem key={student.id} value={student.id}>
                                                        {student.name} · {student.admissionNo}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors?.studentId && (
                                            <p className="mt-1 text-xs text-rose-600">{errors.studentId}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label>{t('Monthly Fee')}</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={assignForm.data.monthlyFee}
                                            onChange={(event) => assignForm.setData('monthlyFee', event.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <Label>{t('Pickup Stop')}</Label>
                                        <Input
                                            value={assignForm.data.pickupStop}
                                            onChange={(event) => assignForm.setData('pickupStop', event.target.value)}
                                        />
                                        {errors?.pickupStop && (
                                            <p className="mt-1 text-xs text-rose-600">{errors.pickupStop}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label>{t('Drop Stop')}</Label>
                                        <Input
                                            value={assignForm.data.dropStop}
                                            onChange={(event) => assignForm.setData('dropStop', event.target.value)}
                                        />
                                    </div>
                                </div>

                                {assignError && <p className="text-sm text-rose-600">{assignError}</p>}

                                <Button type="button" onClick={submitAssignment} disabled={assignForm.processing}>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    {t('Add to Bus')}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Bus Roster')}</CardTitle>
                            <CardDescription>
                                {t('Pending students are not counted as riding the bus until approved.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-3 md:flex-row">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        className="pl-9"
                                        value={search}
                                        placeholder={t('Search student, admission number or stop')}
                                        onChange={(event) => setSearch(event.target.value)}
                                    />
                                </div>
                                <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                                    <SelectTrigger className="md:w-64">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All buses')}</SelectItem>
                                        {vehicles.map((vehicle) => (
                                            <SelectItem key={vehicle.id} value={vehicle.id}>
                                                {vehicle.vehicleNumber}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Student')}</TableHead>
                                        <TableHead>{t('Class')}</TableHead>
                                        <TableHead>{t('Bus')}</TableHead>
                                        <TableHead>{t('Stops')}</TableHead>
                                        <TableHead>{t('Monthly Fee')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead className="text-right">{t('Action')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleAssignments.map((assignment) => (
                                        <TableRow key={assignment.id}>
                                            <TableCell className="font-medium text-slate-800">
                                                {assignment.studentName}
                                                <span className="block text-xs text-slate-500">
                                                    {assignment.admissionNo}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {assignment.className} {assignment.section}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {assignment.vehicleNumber}
                                                <span className="block text-xs text-slate-500">
                                                    {assignment.routeName}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {assignment.pickupStop}
                                                {assignment.dropStop && assignment.dropStop !== assignment.pickupStop
                                                    ? ` → ${assignment.dropStop}`
                                                    : ''}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                ₹{assignment.monthlyFee.toLocaleString()}
                                                {assignment.feeLedger === 'vendor' && (
                                                    <span className="block text-xs text-slate-500">
                                                        {t('Vendor payable')}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {assignment.isPending ? (
                                                    <Badge className="bg-amber-100 text-amber-800">
                                                        {t('Waiting approval')}
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-emerald-100 text-emerald-800">
                                                        {t('On bus')}
                                                    </Badge>
                                                )}
                                                {assignment.createdBy && (
                                                    <span className="block text-xs text-slate-500">
                                                        {t('Added by')} {assignment.createdBy}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {assignment.canRevoke && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => revoke(assignment)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-rose-600" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {visibleAssignments.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-8 text-center text-slate-400">
                                                {t('No students on this bus yet.')}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default DriverBusStudents;
