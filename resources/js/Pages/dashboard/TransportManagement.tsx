import { useLanguage } from '../../i18n/LanguageProvider';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
    BadgeIndianRupee,
    BusFront,
    Clock3,
    Download,
    Edit,
    MapPinned,
    Phone,
    Plus,
    Route,
    Search,
    Trash2,
    Upload,
    Users,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Student } from '../../utils/mockData';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Check, ChevronsUpDown } from 'lucide-react';

import { router } from '@inertiajs/react';
import { cn } from '../ui/utils';

interface TransportManagementProps {
    user: any;
    routes?: TransportRoute[];
    vehicles?: TransportVehicle[];
    assignments?: TransportAssignment[];
    trips?: DailyTrip[];
    students?: Student[];
}

type TransportRoute = {
    id: string;
    name: string;
    area: string;
    vehicleNumber: string;
    driverName: string;
    driverPhone: string;
    morningPickup: string;
    afternoonDrop: string;
    monthlyFee: number;
    stops: string[];
    status: 'active' | 'inactive';
};

type TransportVehicle = {
    id: string;
    vehicleNumber: string;
    vehicleType: string;
    capacity: number;
    assignedDriver: string;
    driverPhone: string;
    gpsDeviceId: string;
    insuranceExpiry: string;
    status: 'active' | 'maintenance' | 'inactive';
};

type TransportAssignment = {
    id: string;
    studentId: string;
    studentName?: string;
    admissionNo?: string;
    className?: string;
    section?: string;
    routeId: string;
    vehicleId: string;
    pickupStop: string;
    dropStop: string;
    pickupTime: string;
    dropTime: string;
    monthlyFee: number;
    status: 'active' | 'pending' | 'paused' | 'inactive';
};

type DailyTrip = {
    id: string;
    routeId: string;
    vehicleId: string;
    driverId?: string;
    driverName?: string;
    shift: 'morning' | 'afternoon' | 'evening';
    journeyDate?: string;
    direction?: 'pickup' | 'drop';
    pickupPoints: string[];
    currentLocation: string;
    currentStop?: string;
    destinationPoint: string;
    departureTime: string;
    expectedArrival: string;
    startedAt?: string;
    endedAt?: string;
    stopUpdates?: {
        stop: string;
        note?: string | null;
        reached_at: string;
        updated_by?: string | null;
    }[];
    supervisor: string;
    tripStatus: 'scheduled' | 'running' | 'completed' | 'delayed' | 'cancelled';
    note: string;
};

const STORAGE_KEY = 'transport-management-data';

const routeStatusTone: Record<TransportRoute['status'], string> = {
    active: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    inactive: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
};

const vehicleStatusTone: Record<TransportVehicle['status'], string> = {
    active: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    maintenance: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    inactive: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
};

const assignmentStatusTone: Record<TransportAssignment['status'], string> = {
    active: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    pending: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    paused: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
    inactive: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
};

const tripStatusTone: Record<DailyTrip['tripStatus'], string> = {
    scheduled: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
    running: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    completed: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    delayed: 'bg-red-100 text-red-700 hover:bg-red-100',
    cancelled: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
};

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const parseCsvLine = (line: string) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
};

const normalizeTrip = (trip: Partial<DailyTrip> & { startPoint?: string }): DailyTrip => ({
    id: String(trip.id || generateId('trip')),
    routeId: trip.routeId ? String(trip.routeId) : '',
    vehicleId: trip.vehicleId ? String(trip.vehicleId) : '',
    driverId: trip.driverId ? String(trip.driverId) : '',
    driverName: trip.driverName || '',
    shift: trip.shift || 'morning',
    journeyDate: trip.journeyDate || '',
    direction: trip.direction === 'drop' ? 'drop' : 'pickup',
    pickupPoints: Array.isArray(trip.pickupPoints)
        ? trip.pickupPoints.filter(Boolean)
        : trip.startPoint
          ? [trip.startPoint]
          : [],
    currentLocation: trip.currentLocation || '',
    currentStop: trip.currentStop || '',
    destinationPoint: trip.destinationPoint || '',
    departureTime: trip.departureTime || '',
    expectedArrival: trip.expectedArrival || '',
    startedAt: trip.startedAt || '',
    endedAt: trip.endedAt || '',
    stopUpdates: Array.isArray(trip.stopUpdates) ? trip.stopUpdates : [],
    supervisor: trip.supervisor || '',
    tripStatus: trip.tripStatus || 'scheduled',
    note: trip.note || '',
});

const normalizeRoute = (route: Partial<TransportRoute>): TransportRoute => ({
    id: String(route.id || generateId('route')),
    name: route.name || '',
    area: route.area || '',
    vehicleNumber: route.vehicleNumber || '',
    driverName: route.driverName || '',
    driverPhone: route.driverPhone || '',
    morningPickup: route.morningPickup || '',
    afternoonDrop: route.afternoonDrop || '',
    monthlyFee: Number(route.monthlyFee || 0),
    stops: Array.isArray(route.stops) ? route.stops.filter(Boolean) : [],
    status: route.status === 'inactive' ? 'inactive' : 'active',
});

const normalizeVehicle = (vehicle: Partial<TransportVehicle>): TransportVehicle => ({
    id: String(vehicle.id || generateId('vehicle')),
    vehicleNumber: vehicle.vehicleNumber || '',
    vehicleType: vehicle.vehicleType || '',
    capacity: Number(vehicle.capacity || 0),
    assignedDriver: vehicle.assignedDriver || '',
    driverPhone: vehicle.driverPhone || '',
    gpsDeviceId: vehicle.gpsDeviceId || '',
    insuranceExpiry: vehicle.insuranceExpiry || '',
    status: vehicle.status === 'maintenance' || vehicle.status === 'inactive' ? vehicle.status : 'active',
});

const normalizeAssignment = (assignment: Partial<TransportAssignment>): TransportAssignment => ({
    id: String(assignment.id || generateId('assignment')),
    studentId: assignment.studentId ? String(assignment.studentId) : '',
    studentName: assignment.studentName || '',
    admissionNo: assignment.admissionNo || '',
    className: assignment.className || '',
    section: assignment.section || '',
    routeId: assignment.routeId ? String(assignment.routeId) : '',
    vehicleId: assignment.vehicleId ? String(assignment.vehicleId) : '',
    pickupStop: assignment.pickupStop || '',
    dropStop: assignment.dropStop || '',
    pickupTime: assignment.pickupTime ? assignment.pickupTime.slice(0, 5) : '',
    dropTime: assignment.dropTime ? assignment.dropTime.slice(0, 5) : '',
    monthlyFee: Number(assignment.monthlyFee || 0),
    status:
        assignment.status === 'pending' || assignment.status === 'paused' || assignment.status === 'inactive'
            ? assignment.status
            : 'active',
});

const getNormalizedRoutesFromPage = (page: any): TransportRoute[] | null => {
    const nextRoutes = page?.props?.routes;
    return Array.isArray(nextRoutes) ? nextRoutes.map(normalizeRoute) : null;
};

const getNormalizedAssignmentsFromPage = (page: any): TransportAssignment[] | null => {
    const nextAssignments = page?.props?.assignments;

    return Array.isArray(nextAssignments) ? nextAssignments.map(normalizeAssignment) : null;
};

const getFirstErrorMessage = (errors: Record<string, string | string[] | undefined>) => {
    for (const value of Object.values(errors)) {
        if (Array.isArray(value) && value[0]) {
            return value[0];
        }

        if (typeof value === 'string' && value.trim()) {
            return value;
        }
    }

    return null;
};

const createEmptyRouteForm = () => ({
    name: '',
    area: '',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    morningPickup: '',
    afternoonDrop: '',
    monthlyFee: '',
    stops: '',
    status: 'active' as TransportRoute['status'],
});

const createEmptyVehicleForm = () => ({
    vehicleNumber: '',
    vehicleType: '',
    capacity: '',
    assignedDriver: '',
    driverPhone: '',
    gpsDeviceId: '',
    insuranceExpiry: '',
    status: 'active' as TransportVehicle['status'],
});

const createEmptyAssignmentForm = () => ({
    className: '',
    section: '',
    studentId: '',
    routeId: '',
    vehicleId: '',
    pickupStop: '',
    dropStop: '',
    pickupTime: '',
    dropTime: '',
    monthlyFee: '',
    status: 'active' as TransportAssignment['status'],
});

const createEmptyTripForm = () => ({
    routeId: '',
    vehicleId: '',
    shift: 'morning' as DailyTrip['shift'],
    direction: 'pickup' as NonNullable<DailyTrip['direction']>,
    pickupPoints: '',
    currentLocation: '',
    currentStop: '',
    destinationPoint: '',
    departureTime: '',
    expectedArrival: '',
    supervisor: '',
    tripStatus: 'scheduled' as DailyTrip['tripStatus'],
    note: '',
});

export default function TransportManagement({
    user,
    routes: propRoutes,
    vehicles: propVehicles,
    assignments: propAssignments,
    trips: propTrips,
    students: propStudents,
}: TransportManagementProps) {
    const { t } = useLanguage();
    const activeStudents = useMemo(
        () =>
            (propStudents || [])
                .map((student) => ({ ...student, id: String(student.id) }))
                .filter((student) => student.status === 'active'),
        [propStudents],
    );

    const [routes, setRoutes] = useState<TransportRoute[]>(() => (propRoutes || []).map(normalizeRoute));
    const [vehicles, setVehicles] = useState<TransportVehicle[]>(() => (propVehicles || []).map(normalizeVehicle));
    const [assignments, setAssignments] = useState<TransportAssignment[]>(() =>
        (propAssignments || []).map(normalizeAssignment),
    );
    const [trips, setTrips] = useState<DailyTrip[]>(() => (propTrips || []).map(normalizeTrip));
    const [searchQuery, setSearchQuery] = useState('');

    // Update state when inertia props change
    useEffect(() => {
        if (propRoutes) setRoutes(propRoutes.map(normalizeRoute));
        if (propVehicles) setVehicles(propVehicles.map(normalizeVehicle));
        if (propAssignments) setAssignments(propAssignments.map(normalizeAssignment));
        if (propTrips) setTrips(propTrips.map(normalizeTrip));
    }, [propRoutes, propVehicles, propAssignments, propTrips]);

    const [routeForm, setRouteForm] = useState(createEmptyRouteForm);
    const [vehicleForm, setVehicleForm] = useState(createEmptyVehicleForm);
    const [assignmentForm, setAssignmentForm] = useState(createEmptyAssignmentForm);
    const [tripForm, setTripForm] = useState(createEmptyTripForm);
    const [showStartJourneyModal, setShowStartJourneyModal] = useState(false);
    const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
    const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
    const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
    const [editingTripId, setEditingTripId] = useState<string | null>(null);
    const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
    const [stopSelections, setStopSelections] = useState<Record<string, string>>({});
    const [journeyDateFilter, setJourneyDateFilter] = useState(() => new Date().toISOString().slice(0, 10));
    const [assignmentFeeManuallyEdited, setAssignmentFeeManuallyEdited] = useState(false);
    const [assignmentFilterClass, setAssignmentFilterClass] = useState('');
    const [assignmentFilterSection, setAssignmentFilterSection] = useState('');
    const [studentComboboxOpen, setStudentComboboxOpen] = useState(false);
    const assignmentImportRef = useRef<HTMLInputElement | null>(null);

    const assignedStudentIds = useMemo(() => assignments.map((assignment) => assignment.studentId), [assignments]);

    const editingAssignment = editingAssignmentId
        ? assignments.find((assignment) => assignment.id === editingAssignmentId)
        : null;

    const availableStudents = useMemo(
        () =>
            activeStudents.filter(
                (student) =>
                    !assignedStudentIds.includes(String(student.id)) ||
                    String(student.id) === editingAssignment?.studentId,
            ),
        [activeStudents, assignedStudentIds, editingAssignment?.studentId],
    );

    const availableClasses = useMemo(
        () =>
            [...new Set(availableStudents.map((student) => student.class).filter(Boolean))].sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true }),
            ),
        [availableStudents],
    );

    const assignmentClasses = useMemo(
        () =>
            [
                ...new Set(
                    assignments
                        .map(
                            (assignment) =>
                                activeStudents.find((student) => student.id === assignment.studentId)?.class || '',
                        )
                        .filter(Boolean),
                ),
            ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        [assignments, activeStudents],
    );

    const allClasses = useMemo(
        () =>
            [...new Set(activeStudents.map((student) => student.class).filter(Boolean))].sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true }),
            ),
        [activeStudents],
    );

    const assignmentFormSections = useMemo(() => {
        if (!assignmentForm.className) {
            return [];
        }

        return [
            ...new Set(
                availableStudents
                    .filter((student) => student.class === assignmentForm.className)
                    .map((student) => student.section)
                    .filter(Boolean),
            ),
        ].sort();
    }, [assignmentForm.className, availableStudents]);

    const filteredStudentsForAssignment = useMemo(
        () =>
            availableStudents.filter((student) => {
                if (assignmentForm.className && student.class !== assignmentForm.className) {
                    return false;
                }

                if (
                    assignmentFormSections.length > 0 &&
                    assignmentForm.section &&
                    student.section !== assignmentForm.section
                ) {
                    return false;
                }

                return true;
            }),
        [assignmentForm.className, assignmentForm.section, assignmentFormSections.length, availableStudents],
    );

    const availableSections = useMemo(() => {
        const sectionSource = assignments
            .map((assignment) => activeStudents.find((student) => student.id === assignment.studentId))
            .filter((student): student is NonNullable<typeof student> =>
                assignmentFilterClass ? student?.class === assignmentFilterClass : Boolean(student),
            );

        return [...new Set(sectionSource.map((student) => student.section).filter(Boolean))].sort();
    }, [assignmentFilterClass, assignments, activeStudents]);

    const routeOptions = useMemo(() => routes.filter((route) => route.status === 'active'), [routes]);

    const vehicleOptions = useMemo(() => vehicles.filter((vehicle) => vehicle.status === 'active'), [vehicles]);

    const assignmentRouteOptions = useMemo(() => {
        const selectedRoute = routes.find((route) => route.id === String(assignmentForm.routeId));
        if (!selectedRoute || selectedRoute.status === 'active') {
            return routeOptions;
        }
        return [selectedRoute, ...routeOptions];
    }, [assignmentForm.routeId, routeOptions, routes]);

    const assignmentVehicleOptions = useMemo(() => {
        const selectedVehicle = vehicles.find((vehicle) => vehicle.id === String(assignmentForm.vehicleId));
        if (!selectedVehicle || selectedVehicle.status === 'active') {
            return vehicleOptions;
        }
        return [selectedVehicle, ...vehicleOptions];
    }, [assignmentForm.vehicleId, vehicleOptions, vehicles]);

    const tripRouteOptions = useMemo(() => {
        const selectedRoute = routes.find((route) => route.id === String(tripForm.routeId));
        if (!selectedRoute || selectedRoute.status === 'active') {
            return routeOptions;
        }
        return [selectedRoute, ...routeOptions];
    }, [routeOptions, routes, tripForm.routeId]);

    const tripVehicleOptions = useMemo(() => {
        const selectedVehicle = vehicles.find((vehicle) => vehicle.id === String(tripForm.vehicleId));
        if (!selectedVehicle || selectedVehicle.status === 'active') {
            return vehicleOptions;
        }
        return [selectedVehicle, ...vehicleOptions];
    }, [tripForm.vehicleId, vehicleOptions, vehicles]);

    const selectedRouteForAssignment = routes.find((route) => route.id === String(assignmentForm.routeId)) || null;
    const selectedRouteVehicle = selectedRouteForAssignment
        ? vehicles.find((vehicle) => vehicle.vehicleNumber === selectedRouteForAssignment.vehicleNumber) || null
        : null;

    const filteredRoutes = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return routes;
        }

        return routes.filter((route) =>
            [route.name, route.area, route.vehicleNumber, route.driverName, route.driverPhone, route.status]
                .join(' ')
                .toLowerCase()
                .includes(query),
        );
    }, [routes, searchQuery]);

    const filteredVehicles = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return vehicles;
        }

        return vehicles.filter((vehicle) =>
            [vehicle.vehicleNumber, vehicle.vehicleType, vehicle.assignedDriver, vehicle.driverPhone, vehicle.status]
                .join(' ')
                .toLowerCase()
                .includes(query),
        );
    }, [searchQuery, vehicles]);

    const filteredAssignments = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return assignments.filter((assignment) => {
            const student = activeStudents.find((item) => String(item.id) === assignment.studentId);
            const route = routes.find((item) => item.id === assignment.routeId);

            if (assignmentFilterClass && student?.class !== assignmentFilterClass) {
                return false;
            }

            if (assignmentFilterSection && student?.section !== assignmentFilterSection) {
                return false;
            }

            if (!query) {
                return true;
            }

            return [
                `${student?.first_name || ''} ${student?.last_name || ''}`,
                student?.admission_no || '',
                student?.class || '',
                student?.section || '',
                route?.name || '',
                assignment.pickupStop,
                assignment.status,
            ]
                .join(' ')
                .toLowerCase()
                .includes(query);
        });
    }, [activeStudents, assignmentFilterClass, assignmentFilterSection, assignments, routes, searchQuery]);

    const filteredTrips = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return trips.filter((trip) => {
            if (journeyDateFilter && trip.journeyDate !== journeyDateFilter) {
                return false;
            }

            if (!query) {
                return true;
            }

            const route = routes.find((item) => item.id === trip.routeId);
            const vehicle = vehicles.find((item) => item.id === trip.vehicleId);

            return [
                route?.name || '',
                vehicle?.vehicleNumber || '',
                trip.shift,
                trip.pickupPoints.join(' '),
                trip.currentLocation,
                trip.destinationPoint,
                trip.supervisor,
                trip.tripStatus,
                trip.note,
            ]
                .join(' ')
                .toLowerCase()
                .includes(query);
        });
    }, [journeyDateFilter, routes, searchQuery, trips, vehicles]);

    const activeTrips = trips.filter((trip) => trip.tripStatus === 'running').length;
    const activeRoutes = routes.filter((route) => route.status === 'active').length;
    const busesInTransit = trips.filter((trip) => trip.tripStatus === 'running' && trip.currentLocation).length;
    const totalMonthlyCollection = assignments
        .filter((assignment) => assignment.status !== 'paused')
        .reduce((total, assignment) => total + assignment.monthlyFee, 0);

    const getStudent = (studentId: string) =>
        activeStudents.find((student) => String(student.id) === String(studentId));
    const getRoute = (routeId: string) => routes.find((route) => route.id === routeId);
    const getVehicle = (vehicleId: string) => vehicles.find((vehicle) => vehicle.id === vehicleId);
    const getReachedStopIndex = (trip: DailyTrip, stops: string[]) => {
        if (stops.length === 0) {
            return -1;
        }

        const latestStop = trip.currentStop || trip.stopUpdates?.at(-1)?.stop || '';
        const currentIndex = stops.findIndex((stop) => stop === latestStop);

        if (currentIndex >= 0) {
            return currentIndex;
        }

        if (trip.tripStatus === 'completed') {
            return stops.length - 1;
        }

        return -1;
    };
    const selectedAssignmentStudent = getStudent(assignmentForm.studentId);
    const selectedAssignmentStudentLabel = selectedAssignmentStudent
        ? `${selectedAssignmentStudent.first_name} ${selectedAssignmentStudent.last_name} (${selectedAssignmentStudent.admission_no || '-'}) - ${selectedAssignmentStudent.class || '-'} ${selectedAssignmentStudent.section || ''}`.trim()
        : '';

    const assignmentsByRouteId = useMemo(
        () =>
            assignments.reduce<Record<string, TransportAssignment[]>>((accumulator, assignment) => {
                accumulator[assignment.routeId] = [...(accumulator[assignment.routeId] || []), assignment];
                return accumulator;
            }, {}),
        [assignments],
    );
    const selectedAssignmentSnapshotLabel = assignmentForm.studentId
        ? `${editingAssignment?.studentName || 'Selected student'} (${editingAssignment?.admissionNo || '-'}) - ${editingAssignment?.className || '-'} ${editingAssignment?.section || ''}`.trim()
        : '';

    const syncRoutesAfterSave = (page: any, fallbackRoutes: TransportRoute[]) => {
        const nextRoutes = getNormalizedRoutesFromPage(page);
        setRoutes(nextRoutes || fallbackRoutes);
        setEditingRouteId(null);
        setRouteForm(createEmptyRouteForm());
    };

    const syncAssignmentsAfterSave = (page: any, fallbackAssignments: TransportAssignment[]) => {
        const nextAssignments = getNormalizedAssignmentsFromPage(page);
        setAssignments(nextAssignments || fallbackAssignments);
        setEditingAssignmentId(null);
        setAssignmentForm(createEmptyAssignmentForm());
    };

    const handleCreateRoute = () => {
        if (!routeForm.name || !routeForm.area || !routeForm.vehicleNumber) {
            toast.error('Add route name, area, and assigned vehicle number');
            return;
        }

        const routePayload = {
            name: routeForm.name,
            area: routeForm.area,
            vehicleNumber: routeForm.vehicleNumber,
            driverName: routeForm.driverName,
            driverPhone: routeForm.driverPhone,
            morningPickup: routeForm.morningPickup,
            afternoonDrop: routeForm.afternoonDrop,
            monthlyFee: Number(routeForm.monthlyFee || 0),
            stops: routeForm.stops,
            status: routeForm.status,
        };

        if (editingRouteId) {
            const fallbackRoute = normalizeRoute({
                id: editingRouteId,
                ...routePayload,
            });

            router.put(`/transport-management/routes/${editingRouteId}`, routePayload as any, {
                preserveScroll: true,
                onSuccess: (page) => {
                    syncRoutesAfterSave(
                        page,
                        routes.map((route) => (route.id === editingRouteId ? fallbackRoute : route)),
                    );
                    toast.success('Transport route updated');
                },
                onError: (errors) => {
                    toast.error(getFirstErrorMessage(errors) || 'Unable to update route. Please try again.');
                },
            });
        } else {
            const fallbackRoute = normalizeRoute(routePayload);

            router.post('/transport-management/routes', routePayload as any, {
                preserveScroll: true,
                onSuccess: (page) => {
                    syncRoutesAfterSave(page, [...routes, fallbackRoute]);
                    toast.success('Transport route created');
                },
                onError: (errors) => {
                    toast.error(getFirstErrorMessage(errors) || 'Unable to create route. Please try again.');
                },
            });
        }
    };

    const handleCreateVehicle = () => {
        if (!vehicleForm.vehicleNumber || !vehicleForm.vehicleType || !vehicleForm.capacity) {
            toast.error('Add vehicle number, type, and capacity');
            return;
        }

        const vehiclePayload: TransportVehicle = {
            id: editingVehicleId || generateId('vehicle'),
            vehicleNumber: vehicleForm.vehicleNumber,
            vehicleType: vehicleForm.vehicleType,
            capacity: Number(vehicleForm.capacity),
            assignedDriver: vehicleForm.assignedDriver,
            driverPhone: vehicleForm.driverPhone,
            gpsDeviceId: vehicleForm.gpsDeviceId,
            insuranceExpiry: vehicleForm.insuranceExpiry,
            status: vehicleForm.status,
        };

        if (editingVehicleId) {
            router.put(`/transport-management/vehicles/${editingVehicleId}`, vehiclePayload as any, {
                onSuccess: () => {
                    setEditingVehicleId(null);
                    setVehicleForm(createEmptyVehicleForm());
                    toast.success('Vehicle updated');
                },
            });
        } else {
            router.post('/transport-management/vehicles', vehiclePayload as any, {
                onSuccess: () => {
                    setVehicleForm(createEmptyVehicleForm());
                    toast.success('Vehicle added to transport fleet');
                },
            });
        }
    };

    const handleCreateAssignment = (event?: React.FormEvent) => {
        event?.preventDefault();

        if (
            !assignmentForm.studentId ||
            !assignmentForm.routeId ||
            !assignmentForm.vehicleId ||
            !assignmentForm.pickupStop
        ) {
            toast.error('Choose student, route, vehicle, and pickup stop');
            return;
        }

        const assignmentPayload: TransportAssignment = {
            id: editingAssignmentId || generateId('assignment'),
            studentId: assignmentForm.studentId,
            routeId: assignmentForm.routeId,
            vehicleId: assignmentForm.vehicleId,
            pickupStop: assignmentForm.pickupStop,
            dropStop: assignmentForm.dropStop || assignmentForm.pickupStop,
            pickupTime: assignmentForm.pickupTime,
            dropTime: assignmentForm.dropTime,
            monthlyFee:
                assignmentForm.monthlyFee.trim() !== ''
                    ? Number(assignmentForm.monthlyFee)
                    : Number(selectedRouteForAssignment?.monthlyFee || 0),
            status: assignmentForm.status,
        };

        const normalizedAssignment = normalizeAssignment(assignmentPayload);

        if (editingAssignmentId) {
            router.put(`/transport-management/assignments/${editingAssignmentId}`, assignmentPayload as any, {
                preserveScroll: true,
                onSuccess: (page) => {
                    syncAssignmentsAfterSave(
                        page,
                        assignments.map((assignment) =>
                            assignment.id === editingAssignmentId ? normalizedAssignment : assignment,
                        ),
                    );
                    setAssignmentFeeManuallyEdited(false);
                    toast.success('Transport assignment updated');
                },
                onError: (errors) => {
                    toast.error(
                        getFirstErrorMessage(errors) || 'Unable to update transport assignment. Please try again.',
                    );
                },
            });
        } else {
            router.post('/transport-management/assignments', assignmentPayload as any, {
                preserveScroll: true,
                onSuccess: (page) => {
                    syncAssignmentsAfterSave(page, [normalizedAssignment, ...assignments]);
                    setAssignmentFeeManuallyEdited(false);
                    toast.success('Student assigned to transport route');
                },
            });
        }
    };

    const handleCreateTrip = () => {
        if (
            !tripForm.routeId ||
            !tripForm.vehicleId ||
            !tripForm.pickupPoints ||
            !tripForm.currentLocation ||
            !tripForm.destinationPoint ||
            !tripForm.departureTime ||
            !tripForm.expectedArrival
        ) {
            toast.error(
                'Choose route, vehicle, pickup points, current location, destination, departure, and expected arrival',
            );
            return;
        }

        const tripPayload = {
            routeId: tripForm.routeId,
            vehicleId: tripForm.vehicleId,
            shift: tripForm.shift,
            direction: tripForm.direction,
            pickupPoints: tripForm.pickupPoints,
            currentLocation: tripForm.currentLocation,
            currentStop: tripForm.currentStop,
            destinationPoint: tripForm.destinationPoint,
            departureTime: tripForm.departureTime,
            expectedArrival: tripForm.expectedArrival,
            supervisor: tripForm.supervisor,
            tripStatus: tripForm.tripStatus,
            note: tripForm.note,
        };

        if (editingTripId) {
            router.put(`/transport-management/trips/${editingTripId}`, tripPayload as any, {
                onSuccess: () => {
                    setEditingTripId(null);
                    setTripForm(createEmptyTripForm());
                    toast.success('Daily transport trip updated');
                },
            });
        } else {
            router.post('/transport-management/trips', tripPayload as any, {
                onSuccess: () => {
                    setTripForm(createEmptyTripForm());
                    toast.success('Daily transport trip scheduled');
                },
            });
        }
    };

    const handleStartJourney = () => {
        if (!tripForm.routeId || !tripForm.vehicleId) {
            toast.error('Choose route and vehicle before starting a journey');
            return;
        }

        router.post(
            '/transport-management/journeys/start',
            {
                routeId: tripForm.routeId,
                vehicleId: tripForm.vehicleId,
                shift: tripForm.shift,
                direction: tripForm.direction,
                destinationPoint: tripForm.destinationPoint,
                supervisor: tripForm.supervisor,
                note: tripForm.note,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setTripForm(createEmptyTripForm());
                    toast.success('Journey started');
                },
                onError: (errors) => {
                    toast.error(getFirstErrorMessage(errors) || 'Unable to start journey.');
                },
            },
        );
    };

    const updateReachedStop = (trip: DailyTrip) => {
        const stop = stopSelections[trip.id] || trip.currentStop || '';

        if (!stop) {
            toast.error('Select the stop reached by the bus');
            return;
        }

        router.patch(
            `/transport-management/journeys/${trip.id}/stop`,
            { stop },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Reached stop updated'),
                onError: (errors) => toast.error(getFirstErrorMessage(errors) || 'Unable to update reached stop.'),
            },
        );
    };

    const endJourney = (tripId: string) => {
        router.patch(
            `/transport-management/journeys/${tripId}/end`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Journey ended'),
                onError: (errors) => toast.error(getFirstErrorMessage(errors) || 'Unable to end journey.'),
            },
        );
    };

    const startEditRoute = (route: TransportRoute) => {
        setEditingRouteId(route.id);
        setRouteForm({
            name: route.name,
            area: route.area,
            vehicleNumber: route.vehicleNumber,
            driverName: route.driverName,
            driverPhone: route.driverPhone,
            morningPickup: route.morningPickup,
            afternoonDrop: route.afternoonDrop,
            monthlyFee: String(route.monthlyFee),
            stops: route.stops.join(', '),
            status: route.status,
        });
    };

    const startEditVehicle = (vehicle: TransportVehicle) => {
        setEditingVehicleId(vehicle.id);
        setVehicleForm({
            vehicleNumber: vehicle.vehicleNumber,
            vehicleType: vehicle.vehicleType,
            capacity: String(vehicle.capacity),
            assignedDriver: vehicle.assignedDriver,
            driverPhone: vehicle.driverPhone,
            gpsDeviceId: vehicle.gpsDeviceId,
            insuranceExpiry: vehicle.insuranceExpiry,
            status: vehicle.status,
        });
    };

    const startEditAssignment = (assignment: TransportAssignment) => {
        const student = getStudent(assignment.studentId);

        setEditingAssignmentId(assignment.id);
        setAssignmentForm({
            className: student?.class || assignment.className || '',
            section: student?.section || assignment.section || '',
            studentId: assignment.studentId,
            routeId: assignment.routeId,
            vehicleId: assignment.vehicleId,
            pickupStop: assignment.pickupStop,
            dropStop: assignment.dropStop,
            pickupTime: assignment.pickupTime,
            dropTime: assignment.dropTime,
            monthlyFee: String(assignment.monthlyFee),
            status: assignment.status,
        });
        setAssignmentFeeManuallyEdited(false);
    };

    const startEditTrip = (trip: DailyTrip) => {
        setEditingTripId(trip.id);
        setTripForm({
            routeId: trip.routeId,
            vehicleId: trip.vehicleId,
            shift: trip.shift,
            direction: trip.direction || 'pickup',
            pickupPoints: (trip.pickupPoints || []).join(', '),
            currentLocation: trip.currentLocation,
            currentStop: trip.currentStop || '',
            destinationPoint: trip.destinationPoint,
            departureTime: trip.departureTime,
            expectedArrival: trip.expectedArrival,
            supervisor: trip.supervisor,
            tripStatus: trip.tripStatus,
            note: trip.note,
        });
    };

    const cancelRouteEdit = () => {
        setEditingRouteId(null);
        setRouteForm(createEmptyRouteForm());
    };

    const cancelVehicleEdit = () => {
        setEditingVehicleId(null);
        setVehicleForm(createEmptyVehicleForm());
    };

    const cancelAssignmentEdit = () => {
        setEditingAssignmentId(null);
        setAssignmentForm(createEmptyAssignmentForm());
        setAssignmentFeeManuallyEdited(false);
    };

    const cancelTripEdit = () => {
        setEditingTripId(null);
        setTripForm(createEmptyTripForm());
    };

    const confirmDelete = (resourceLabel: string) =>
        window.confirm(`Delete this ${resourceLabel}? This action cannot be undone.`);

    const deleteRoute = (routeId: string) => {
        if (!confirmDelete('route')) {
            return;
        }

        router.delete(`/transport-management/routes/${routeId}`, {
            onSuccess: (page) => {
                const nextRoutes = getNormalizedRoutesFromPage(page);
                if (nextRoutes) {
                    setRoutes(nextRoutes);
                } else {
                    setRoutes((current) => current.filter((route) => route.id !== routeId));
                }
                toast.success('Route removed');
            },
        });
    };

    const deleteVehicle = (vehicleId: string) => {
        if (!confirmDelete('vehicle')) {
            return;
        }

        router.delete(`/transport-management/vehicles/${vehicleId}`, {
            onSuccess: () => toast.success('Vehicle removed from fleet'),
        });
    };

    const deleteAssignment = (assignmentId: string) => {
        if (!confirmDelete('transport assignment')) {
            return;
        }

        router.delete(`/transport-management/assignments/${assignmentId}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const nextAssignments = getNormalizedAssignmentsFromPage(page);
                setAssignments(nextAssignments || assignments.filter((assignment) => assignment.id !== assignmentId));
                toast.success('Transport assignment removed');
            },
        });
    };

    const deleteTrip = (tripId: string) => {
        if (!confirmDelete('trip')) {
            return;
        }

        router.delete(`/transport-management/trips/${tripId}`, {
            onSuccess: () => toast.success('Trip removed'),
        });
    };

    const exportAssignments = () => {
        if (filteredAssignments.length === 0) {
            toast.error('No transport assignments available to export');
            return;
        }

        const headers = [
            'Student Name',
            'Admission No',
            'Class',
            'Section',
            'Route',
            'Vehicle',
            'Pickup Stop',
            'Drop Stop',
            'Pickup Time',
            'Drop Time',
            'Monthly Fee',
            'Status',
        ];

        const rows = filteredAssignments.map((assignment) => {
            const student = getStudent(assignment.studentId);
            const route = getRoute(assignment.routeId);
            const vehicle = getVehicle(assignment.vehicleId);

            return [
                `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '-',
                student?.admission_no || '-',
                student?.class || '-',
                student?.section || '-',
                route?.name || '-',
                vehicle?.vehicleNumber || '-',
                assignment.pickupStop || '-',
                assignment.dropStop || '-',
                assignment.pickupTime || '-',
                assignment.dropTime || '-',
                String(assignment.monthlyFee),
                assignment.status,
            ];
        });

        const csvContent = [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transport-assignments-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success(
            `Exported ${filteredAssignments.length} transport assignment${filteredAssignments.length === 1 ? '' : 's'}`,
        );
    };

    const downloadAssignmentSampleCsv = () => {
        const headers = [
            'admission_no',
            'route',
            'vehicle',
            'pickup_stop',
            'drop_stop',
            'pickup_time',
            'drop_time',
            'monthly_fee',
            'status',
        ];

        const sampleRows = [
            [
                'ADM-2020-001',
                'North Campus Route',
                'MH-01-AB-1201',
                'Powai Lake',
                'Powai Lake',
                '07:10',
                '14:45',
                '2200',
                'active',
            ],

            [
                'ADM-2021-005',
                'East City Route',
                'MH-01-CD-2208',
                'Chembur Camp',
                'Chembur Camp',
                '07:05',
                '15:00',
                '2450',
                'pending',
            ],
        ];

        const csvContent = [headers, ...sampleRows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'transport-assignments-sample.csv';
        link.click();
        URL.revokeObjectURL(url);

        toast.success('Transport sample CSV downloaded');
    };

    const handleImportAssignments = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const content = String(reader.result || '').trim();
            if (!content) {
                toast.error('Selected file is empty');
                event.target.value = '';
                return;
            }

            const lines = content
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean);

            if (lines.length < 2) {
                toast.error('CSV must include a header row and at least one data row');
                event.target.value = '';
                return;
            }

            const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().trim());
            const getValue = (row: string[], keys: string[]) => {
                const index = headers.findIndex((header) => keys.includes(header));
                return index >= 0 ? row[index] || '' : '';
            };

            const existingStudentIds = new Set(assignments.map((assignment) => assignment.studentId));
            const importedAssignments: TransportAssignment[] = [];
            const errors: string[] = [];

            lines.slice(1).forEach((line, rowIndex) => {
                const row = parseCsvLine(line);
                const admissionNo = getValue(row, ['admission_no', 'admission no']);
                const studentId = getValue(row, ['student_id', 'student id']);
                const routeName = getValue(row, ['route', 'route_name', 'route name']);
                const routeId = getValue(row, ['route_id', 'route id']);
                const vehicleNumber = getValue(row, ['vehicle', 'vehicle_number', 'vehicle number']);
                const vehicleId = getValue(row, ['vehicle_id', 'vehicle id']);
                const pickupStop = getValue(row, ['pickup_stop', 'pickup stop']);
                const dropStop = getValue(row, ['drop_stop', 'drop stop']);
                const pickupTime = getValue(row, ['pickup_time', 'pickup time']);
                const dropTime = getValue(row, ['drop_time', 'drop time']);
                const monthlyFee = getValue(row, ['monthly_fee', 'monthly fee']);
                const status = getValue(row, ['status']) as TransportAssignment['status'];

                const student = activeStudents.find(
                    (item) => String(item.id) === studentId || item.admission_no === admissionNo,
                );
                const route = routes.find(
                    (item) => item.id === routeId || item.name.toLowerCase() === routeName.toLowerCase(),
                );
                const vehicle = vehicles.find(
                    (item) => item.id === vehicleId || item.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase(),
                );

                if (!student) {
                    errors.push(`Row ${rowIndex + 2}: student not found`);
                    return;
                }

                if (!route) {
                    errors.push(`Row ${rowIndex + 2}: route not found`);
                    return;
                }

                if (!vehicle) {
                    errors.push(`Row ${rowIndex + 2}: vehicle not found`);
                    return;
                }

                if (!pickupStop) {
                    errors.push(`Row ${rowIndex + 2}: pickup stop is required`);
                    return;
                }

                if (
                    existingStudentIds.has(student.id) ||
                    importedAssignments.some((assignment) => assignment.studentId === student.id)
                ) {
                    errors.push(`Row ${rowIndex + 2}: student already has a transport assignment`);
                    return;
                }

                importedAssignments.push({
                    id: generateId('assignment'),
                    studentId: student.id,
                    routeId: route.id,
                    vehicleId: vehicle.id,
                    pickupStop,
                    dropStop: dropStop || pickupStop,
                    pickupTime,
                    dropTime,
                    monthlyFee: Number(monthlyFee || route.monthlyFee || 0),
                    status: status === 'pending' || status === 'paused' || status === 'active' ? status : 'active',
                });
            });

            if (importedAssignments.length > 0 && errors.length === 0) {
                setAssignments((current) => [...importedAssignments, ...current]);
                toast.success(
                    `Imported ${importedAssignments.length} transport assignment${importedAssignments.length === 1 ? '' : 's'} locally`,
                );
            } else if (importedAssignments.length > 0) {
                setAssignments((current) => [...importedAssignments, ...current]);
                toast.success(
                    `Imported ${importedAssignments.length} assignment${importedAssignments.length === 1 ? '' : 's'} locally with ${errors.length} issue${errors.length === 1 ? '' : 's'}`,
                );
            } else {
                toast.error(errors[0] || 'No transport assignments were imported');
            }

            event.target.value = '';
        };

        reader.readAsText(file);
    };

    return (
        <DashboardLayout user={user} activeTab="transport-management">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="flex items-center justify-between gap-4 overflow-x-auto">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Transport Management')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t(
                                    'Manage transport routes, fleet operations, student assignments, and daily trip control from one dashboard.',
                                )}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() => router.get('/transport-fee-collection')}
                        >
                            <BadgeIndianRupee className="h-4 w-4" />
                            {t('Transport Fee Collection')}
                        </Button>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-1">
                        <Card className="w-1/5 shrink-0">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Active Routes')}</p>
                                        <p className="mt-1 text-3xl font-bold text-slate-900">{activeRoutes}</p>
                                    </div>
                                    <Route className="h-6 w-6 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="w-1/5 shrink-0">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Fleet Vehicles')}</p>
                                        <p className="mt-1 text-3xl font-bold text-slate-900">{vehicles.length}</p>
                                    </div>
                                    <BusFront className="h-6 w-6 text-emerald-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="w-1/5 shrink-0">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Assigned Students')}</p>
                                        <p className="mt-1 text-3xl font-bold text-slate-900">{assignments.length}</p>
                                    </div>
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="w-1/3 shrink-0">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Monthly Collection')}</p>
                                        <p className="mt-1 text-3xl font-bold text-slate-900">
                                            {t('Rs.')}
                                            {totalMonthlyCollection.toLocaleString()}
                                        </p>
                                    </div>
                                    <BadgeIndianRupee className="h-6 w-6 text-indigo-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="vehicles">
                        <TabsList>
                            <TabsTrigger value="vehicles">{t('Vehicles')}</TabsTrigger>
                            <TabsTrigger value="assignments">{t('Assignments')}</TabsTrigger>
                            <TabsTrigger value="journeys">{t('Journeys')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="vehicles" className="space-y-6">
                            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{editingVehicleId ? t('Edit Vehicle') : t('Add Vehicle')}</CardTitle>
                                        <CardDescription>
                                            {editingVehicleId
                                                ? t('Update fleet details, driver information, and compliance.')
                                                : t('Track fleet capacity, drivers, GPS devices, and compliance.')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('Vehicle Number')}</Label>
                                                <Input
                                                    value={vehicleForm.vehicleNumber}
                                                    onChange={(event) =>
                                                        setVehicleForm((current) => ({
                                                            ...current,
                                                            vehicleNumber: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Vehicle Type')}</Label>
                                                <Input
                                                    value={vehicleForm.vehicleType}
                                                    onChange={(event) =>
                                                        setVehicleForm((current) => ({
                                                            ...current,
                                                            vehicleType: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('Capacity')}</Label>
                                                <Input
                                                    type="number"
                                                    value={vehicleForm.capacity}
                                                    onChange={(event) =>
                                                        setVehicleForm((current) => ({
                                                            ...current,
                                                            capacity: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('GPS Device ID')}</Label>
                                                <Input
                                                    value={vehicleForm.gpsDeviceId}
                                                    onChange={(event) =>
                                                        setVehicleForm((current) => ({
                                                            ...current,
                                                            gpsDeviceId: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('Assigned Driver')}</Label>
                                                <Input
                                                    value={vehicleForm.assignedDriver}
                                                    onChange={(event) =>
                                                        setVehicleForm((current) => ({
                                                            ...current,
                                                            assignedDriver: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Driver Phone')}</Label>
                                                <Input
                                                    value={vehicleForm.driverPhone}
                                                    onChange={(event) =>
                                                        setVehicleForm((current) => ({
                                                            ...current,
                                                            driverPhone: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('Insurance Expiry')}</Label>
                                                <Input
                                                    type="date"
                                                    value={vehicleForm.insuranceExpiry}
                                                    onChange={(event) =>
                                                        setVehicleForm((current) => ({
                                                            ...current,
                                                            insuranceExpiry: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Status')}</Label>
                                                <Select
                                                    value={vehicleForm.status}
                                                    onValueChange={(value: TransportVehicle['status']) =>
                                                        setVehicleForm((current) => ({
                                                            ...current,
                                                            status: value,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('Select status')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                                        <SelectItem value="maintenance">{t('Maintenance')}</SelectItem>
                                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <Button className="w-full gap-2" onClick={handleCreateVehicle}>
                                            <Plus className="h-4 w-4" />
                                            {editingVehicleId ? t('Update Vehicle') : t('Add Vehicle')}
                                        </Button>
                                        {editingVehicleId && (
                                            <Button variant="outline" className="w-full" onClick={cancelVehicleEdit}>
                                                {t('Cancel Edit')}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('Fleet Register')}</CardTitle>
                                        <CardDescription>
                                            {t('Operational status, driver coverage, and insurance dates.')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Vehicle')}</TableHead>
                                                        <TableHead>{t('Driver')}</TableHead>
                                                        <TableHead>{t('Capacity')}</TableHead>
                                                        <TableHead>{t('GPS')}</TableHead>
                                                        <TableHead>{t('Insurance')}</TableHead>
                                                        <TableHead>{t('Status')}</TableHead>
                                                        <TableHead className="w-28 text-right">
                                                            {t('Actions')}
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredVehicles.map((vehicle) => (
                                                        <TableRow key={vehicle.id}>
                                                            <TableCell>
                                                                <p className="font-medium text-slate-900">
                                                                    {vehicle.vehicleNumber}
                                                                </p>
                                                                <p className="text-sm text-slate-500">
                                                                    {vehicle.vehicleType}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="font-medium text-slate-900">
                                                                    {vehicle.assignedDriver || '-'}
                                                                </p>
                                                                <p className="text-sm text-slate-500">
                                                                    {vehicle.driverPhone || '-'}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>{vehicle.capacity}</TableCell>
                                                            <TableCell>{vehicle.gpsDeviceId || '-'}</TableCell>
                                                            <TableCell>{vehicle.insuranceExpiry || '-'}</TableCell>
                                                            <TableCell>
                                                                <Badge className={vehicleStatusTone[vehicle.status]}>
                                                                    {t(vehicle.status)}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex justify-end gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => startEditVehicle(vehicle)}
                                                                        title={t('Edit vehicle')}
                                                                    >
                                                                        <Edit className="h-4 w-4 text-slate-600" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => deleteVehicle(vehicle.id)}
                                                                        title={t('Delete vehicle')}
                                                                    >
                                                                        <Trash2 className="h-4 w-4 text-red-600" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="assignments" className="space-y-6">
                            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            {editingAssignmentId ? t('Edit Assignment') : t('Assign Student')}
                                        </CardTitle>
                                        <CardDescription>
                                            {editingAssignmentId
                                                ? t('Update route, stops, timings, and transport fee.')
                                                : t('Allocate route, pickup stop, timings, and transport fee.')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form className="space-y-4" onSubmit={handleCreateAssignment}>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>{t('Class')}</Label>
                                                    <Select
                                                        value={assignmentForm.className}
                                                        onValueChange={(value) => {
                                                            setAssignmentForm((current) => ({
                                                                ...current,
                                                                className: value,
                                                                section: '',
                                                                studentId: '',
                                                            }));
                                                            setStudentComboboxOpen(false);
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Select class')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {allClasses.map((className) => (
                                                                <SelectItem key={className} value={className}>
                                                                    {className}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {availableClasses.length === 0 && (
                                                        <p className="text-xs text-slate-500">
                                                            {t(
                                                                'No active students with class data are available for transport assignment.',
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('Section')}</Label>
                                                    <Select
                                                        value={assignmentForm.section}
                                                        onValueChange={(value) => {
                                                            setAssignmentForm((current) => ({
                                                                ...current,
                                                                section: value,
                                                                studentId: '',
                                                            }));
                                                            setStudentComboboxOpen(false);
                                                        }}
                                                        disabled={!assignmentForm.className}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue
                                                                placeholder={
                                                                    assignmentFormSections.length > 0
                                                                        ? t('Select section')
                                                                        : t('No section required')
                                                                }
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {assignmentFormSections.map((section) => (
                                                                <SelectItem key={section} value={section}>
                                                                    {t('Section')}
                                                                    {section}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {assignmentForm.className &&
                                                        assignmentFormSections.length === 0 && (
                                                            <p className="text-xs text-slate-500">
                                                                {t(
                                                                    'Students in this class do not have section values, so section is optional.',
                                                                )}
                                                            </p>
                                                        )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Student')}</Label>
                                                <Popover
                                                    open={studentComboboxOpen}
                                                    onOpenChange={setStudentComboboxOpen}
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={studentComboboxOpen}
                                                            className="w-full justify-between font-normal"
                                                            disabled={
                                                                !assignmentForm.className ||
                                                                (assignmentFormSections.length > 0 &&
                                                                    !assignmentForm.section)
                                                            }
                                                        >
                                                            <span className="truncate">
                                                                {assignmentForm.studentId
                                                                    ? selectedAssignmentStudentLabel ||
                                                                      selectedAssignmentSnapshotLabel ||
                                                                      t('Select student')
                                                                    : t('Search and select student')}
                                                            </span>
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        className="w-[var(--radix-popover-trigger-width)] p-0"
                                                        align="start"
                                                    >
                                                        <Command>
                                                            <CommandInput placeholder={t('Search student')} />
                                                            <CommandList>
                                                                <CommandEmpty>{t('No student found.')}</CommandEmpty>
                                                                <CommandGroup>
                                                                    {filteredStudentsForAssignment.map((student) => {
                                                                        const studentLabel =
                                                                            `${student.first_name} ${student.last_name} (${student.admission_no || '-'}) - ${student.class || '-'} ${student.section || ''}`.trim();

                                                                        return (
                                                                            <CommandItem
                                                                                key={student.id}
                                                                                value={`${studentLabel} ${student.admission_no || ''} ${student.class || ''} ${student.section || ''}`}
                                                                                onSelect={() => {
                                                                                    setAssignmentForm((current) => ({
                                                                                        ...current,
                                                                                        studentId: student.id,
                                                                                    }));
                                                                                    setStudentComboboxOpen(false);
                                                                                }}
                                                                            >
                                                                                <Check
                                                                                    className={cn(
                                                                                        'h-4 w-4',
                                                                                        assignmentForm.studentId ===
                                                                                            student.id
                                                                                            ? 'opacity-100'
                                                                                            : 'opacity-0',
                                                                                    )}
                                                                                />

                                                                                {studentLabel}
                                                                            </CommandItem>
                                                                        );
                                                                    })}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                {assignmentForm.className &&
                                                    filteredStudentsForAssignment.length === 0 && (
                                                        <p className="text-xs text-slate-500">
                                                            {t('No unassigned students match this class and section.')}
                                                        </p>
                                                    )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Route')}</Label>
                                                <Select
                                                    value={assignmentForm.routeId}
                                                    onValueChange={(value) => {
                                                        const route = routes.find((item) => item.id === value) || null;
                                                        const linkedVehicle = route
                                                            ? vehicles.find(
                                                                  (vehicle) =>
                                                                      vehicle.vehicleNumber === route.vehicleNumber,
                                                              ) || null
                                                            : null;
                                                        const shouldAutoFillFee = !assignmentFeeManuallyEdited;

                                                        setAssignmentForm((current) => ({
                                                            ...current,
                                                            routeId: value,
                                                            vehicleId: linkedVehicle?.id || current.vehicleId,
                                                            pickupStop: '',
                                                            dropStop: '',
                                                            monthlyFee:
                                                                shouldAutoFillFee && route
                                                                    ? String(route.monthlyFee ?? '')
                                                                    : current.monthlyFee,
                                                        }));
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('Select route')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {assignmentRouteOptions.map((route) => (
                                                            <SelectItem key={route.id} value={route.id}>
                                                                {route.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {assignmentRouteOptions.length === 0 && (
                                                    <p className="text-xs text-slate-500">
                                                        {t('Create an active route first to assign students.')}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Vehicle')}</Label>
                                                <Select
                                                    value={assignmentForm.vehicleId}
                                                    onValueChange={(value) =>
                                                        setAssignmentForm((current) => ({
                                                            ...current,
                                                            vehicleId: value,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('Select vehicle')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {assignmentVehicleOptions.map((vehicle) => (
                                                            <SelectItem key={vehicle.id} value={vehicle.id}>
                                                                {vehicle.vehicleNumber}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {selectedRouteVehicle && !assignmentForm.vehicleId && (
                                                    <p className="text-xs text-slate-500">
                                                        {t('This route is linked to vehicle')}
                                                        {selectedRouteVehicle.vehicleNumber}.
                                                    </p>
                                                )}
                                                {assignmentVehicleOptions.length === 0 && (
                                                    <p className="text-xs text-slate-500">
                                                        {t(
                                                            'Create an active vehicle first to complete the assignment.',
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>{t('Pickup Stop')}</Label>
                                                    <Select
                                                        value={assignmentForm.pickupStop}
                                                        onValueChange={(value) =>
                                                            setAssignmentForm((current) => ({
                                                                ...current,
                                                                pickupStop: value,
                                                            }))
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Select stop')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(selectedRouteForAssignment?.stops || []).map((stop) => (
                                                                <SelectItem key={stop} value={stop}>
                                                                    {stop}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {assignmentForm.routeId &&
                                                        (selectedRouteForAssignment?.stops || []).length === 0 && (
                                                            <p className="text-xs text-slate-500">
                                                                {t(
                                                                    'Add stops to the selected route before assigning pickup points.',
                                                                )}
                                                            </p>
                                                        )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('Drop Stop')}</Label>
                                                    <Select
                                                        value={assignmentForm.dropStop}
                                                        onValueChange={(value) =>
                                                            setAssignmentForm((current) => ({
                                                                ...current,
                                                                dropStop: value,
                                                            }))
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Select stop')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(selectedRouteForAssignment?.stops || []).map((stop) => (
                                                                <SelectItem key={stop} value={stop}>
                                                                    {stop}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>{t('Pickup Time')}</Label>
                                                    <Input
                                                        type="time"
                                                        value={assignmentForm.pickupTime}
                                                        onChange={(event) =>
                                                            setAssignmentForm((current) => ({
                                                                ...current,
                                                                pickupTime: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('Drop Time')}</Label>
                                                    <Input
                                                        type="time"
                                                        value={assignmentForm.dropTime}
                                                        onChange={(event) =>
                                                            setAssignmentForm((current) => ({
                                                                ...current,
                                                                dropTime: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>{t('Monthly Fee')}</Label>
                                                    <Input
                                                        type="number"
                                                        value={assignmentForm.monthlyFee}
                                                        onChange={(event) => {
                                                            setAssignmentFeeManuallyEdited(true);
                                                            setAssignmentForm((current) => ({
                                                                ...current,
                                                                monthlyFee: event.target.value,
                                                            }));
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('Status')}</Label>
                                                    <Select
                                                        value={assignmentForm.status}
                                                        onValueChange={(value: TransportAssignment['status']) =>
                                                            setAssignmentForm((current) => ({
                                                                ...current,
                                                                status: value,
                                                            }))
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Select status')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                                            <SelectItem value="pending">{t('Pending')}</SelectItem>
                                                            <SelectItem value="paused">{t('Paused')}</SelectItem>
                                                            <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <Button type="submit" className="w-full gap-2">
                                                <Plus className="h-4 w-4" />
                                                {editingAssignmentId ? t('Update Assignment') : t('Save Assignment')}
                                            </Button>
                                            {editingAssignmentId && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={cancelAssignmentEdit}
                                                >
                                                    {t('Cancel Edit')}
                                                </Button>
                                            )}
                                        </form>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <CardTitle>{t('Student Transport Assignments')}</CardTitle>
                                                <CardDescription>
                                                    {t(
                                                        'Operational list of students using transport and their assigned routes, filtered by the selected class and section.',
                                                    )}
                                                </CardDescription>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="gap-2"
                                                    onClick={downloadAssignmentSampleCsv}
                                                >
                                                    <Download className="h-4 w-4" />
                                                    {t('Download Sample CSV')}
                                                </Button>
                                                <input
                                                    ref={assignmentImportRef}
                                                    type="file"
                                                    accept=".csv"
                                                    className="hidden"
                                                    onChange={handleImportAssignments}
                                                />

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="gap-2"
                                                    onClick={() => assignmentImportRef.current?.click()}
                                                >
                                                    <Upload className="h-4 w-4" />
                                                    {t('Import CSV')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="gap-2"
                                                    onClick={exportAssignments}
                                                >
                                                    <Download className="h-4 w-4" />
                                                    {t('Export')}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-[180px_180px_auto]">
                                            <div className="space-y-2">
                                                <Label>{t('Filter Class')}</Label>
                                                <Select
                                                    value={assignmentFilterClass}
                                                    onValueChange={(value) => {
                                                        setAssignmentFilterClass(value);
                                                        setAssignmentFilterSection('');
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('All classes')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableClasses.map((className) => (
                                                            <SelectItem key={className} value={className}>
                                                                {className}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Filter Section')}</Label>
                                                <Select
                                                    value={assignmentFilterSection}
                                                    onValueChange={setAssignmentFilterSection}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue
                                                            placeholder={
                                                                assignmentFilterClass
                                                                    ? t('All sections in class')
                                                                    : t('All sections')
                                                            }
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableSections.map((section) => (
                                                            <SelectItem key={section} value={section}>
                                                                {t('Section')}
                                                                {section}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-end">
                                                {(assignmentFilterClass || assignmentFilterSection) && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setAssignmentFilterClass('');
                                                            setAssignmentFilterSection('');
                                                        }}
                                                    >
                                                        {t('Clear Filters')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Student')}</TableHead>
                                                        <TableHead>{t('Route')}</TableHead>
                                                        <TableHead>{t('Vehicle')}</TableHead>
                                                        <TableHead>{t('Stops')}</TableHead>
                                                        <TableHead>{t('Fee')}</TableHead>
                                                        <TableHead>{t('Status')}</TableHead>
                                                        <TableHead className="w-28 text-right">
                                                            {t('Actions')}
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredAssignments.map((assignment) => {
                                                        const student = getStudent(assignment.studentId);
                                                        const route = getRoute(assignment.routeId);
                                                        const vehicle = getVehicle(assignment.vehicleId);

                                                        return (
                                                            <TableRow key={assignment.id}>
                                                                <TableCell>
                                                                    <p className="font-medium text-slate-900">
                                                                        {student?.first_name ||
                                                                            assignment.studentName ||
                                                                            t('Unknown Student')}{' '}
                                                                        {student?.last_name || ''}
                                                                    </p>
                                                                    <p className="text-sm text-slate-500">
                                                                        {student?.admission_no ||
                                                                            assignment.admissionNo ||
                                                                            '-'}{' '}
                                                                        •{' '}
                                                                        {student?.class || assignment.className || '-'}{' '}
                                                                        {student?.section || assignment.section || '-'}
                                                                    </p>
                                                                </TableCell>
                                                                <TableCell>{route?.name || '-'}</TableCell>
                                                                <TableCell>{vehicle?.vehicleNumber || '-'}</TableCell>
                                                                <TableCell>
                                                                    <p className="text-sm text-slate-900">
                                                                        {assignment.pickupStop}
                                                                    </p>
                                                                    <p className="text-sm text-slate-500">
                                                                        {assignment.pickupTime || '-'} /{' '}
                                                                        {assignment.dropTime || '-'}
                                                                    </p>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {t('Rs.')}
                                                                    {assignment.monthlyFee.toLocaleString()}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        className={
                                                                            assignmentStatusTone[assignment.status]
                                                                        }
                                                                    >
                                                                        {t(assignment.status)}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex justify-end gap-1">
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() =>
                                                                                startEditAssignment(assignment)
                                                                            }
                                                                            title={t('Edit assignment')}
                                                                        >
                                                                            <Edit className="h-4 w-4 text-slate-600" />
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() =>
                                                                                deleteAssignment(assignment.id)
                                                                            }
                                                                            title={t('Delete assignment')}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="journeys" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                                        <div>
                                            <CardTitle>{t('Bus Location Updates')}</CardTitle>
                                            <CardDescription>
                                                {t(
                                                    'School can monitor the latest stop updates for running and completed journeys.',
                                                )}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-end gap-3">
                                            <div className="w-full max-w-48 space-y-2">
                                                <Label>{t('Date')}</Label>
                                                <Input
                                                    type="date"
                                                    value={journeyDateFilter}
                                                    onChange={(event) => setJourneyDateFilter(event.target.value)}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                className="gap-2 shrink-0"
                                                onClick={() => setShowStartJourneyModal(true)}
                                            >
                                                <BusFront className="h-4 w-4" />
                                                {t('Create Journey')}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('Journey')}</TableHead>
                                                    <TableHead>{t('Stop Progress')}</TableHead>
                                                    <TableHead>{t('Update Stop')}</TableHead>
                                                    <TableHead>{t('Status')}</TableHead>
                                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredTrips.map((trip) => {
                                                    const route = getRoute(trip.routeId);
                                                    const vehicle = getVehicle(trip.vehicleId);
                                                    const rawStops = route?.stops || trip.pickupPoints || [];
                                                    const stops =
                                                        trip.direction === 'drop' ? [...rawStops].reverse() : rawStops;
                                                    const reachedStopIndex = getReachedStopIndex(trip, stops);
                                                    const stopUpdateMap = new Map(
                                                        (trip.stopUpdates || []).map((u) => [u.stop, u]),
                                                    );
                                                    const progressPercent =
                                                        stops.length <= 1
                                                            ? reachedStopIndex >= 0
                                                                ? 100
                                                                : 0
                                                            : (Math.max(0, reachedStopIndex) / (stops.length - 1)) *
                                                              100;

                                                    return (
                                                        <TableRow key={trip.id}>
                                                            <TableCell>
                                                                <p className="font-medium text-slate-900">
                                                                    {route?.name || '-'}
                                                                </p>
                                                                <p className="text-sm text-slate-500">
                                                                    {vehicle?.vehicleNumber || '-'} -{' '}
                                                                    {trip.direction || t('pickup')} -{' '}
                                                                    {trip.journeyDate || '-'}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {t('Driver:')}
                                                                    {trip.driverName || trip.supervisor || '-'}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="min-w-[420px]">
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div>
                                                                            <p className="font-medium text-slate-900">
                                                                                {trip.currentStop ||
                                                                                    trip.currentLocation ||
                                                                                    '-'}
                                                                            </p>
                                                                            {trip.currentStop &&
                                                                                stopUpdateMap.get(trip.currentStop)
                                                                                    ?.reached_at && (
                                                                                    <p className="text-xs text-slate-500">
                                                                                        {t('Reached at:')}
                                                                                        {new Date(
                                                                                            stopUpdateMap.get(
                                                                                                trip.currentStop,
                                                                                            )!.reached_at,
                                                                                        ).toLocaleTimeString([], {
                                                                                            hour: '2-digit',
                                                                                            minute: '2-digit',
                                                                                        })}
                                                                                    </p>
                                                                                )}
                                                                        </div>
                                                                        <p className="shrink-0 text-xs text-slate-500">
                                                                            {trip.stopUpdates?.length || 0}
                                                                            {t('update(s)')}
                                                                        </p>
                                                                    </div>
                                                                    {stops.length > 0 ? (
                                                                        <div className="px-1 pt-2">
                                                                            <div className="relative">
                                                                                <div className="absolute top-3 right-3 left-3 h-1 rounded-full bg-slate-200" />
                                                                                <div
                                                                                    className="absolute top-3 left-3 h-1 rounded-full bg-emerald-500 transition-all"
                                                                                    style={{
                                                                                        width: `calc((100% - 1.5rem) * ${progressPercent / 100})`,
                                                                                    }}
                                                                                />

                                                                                <div className="relative flex justify-between gap-3">
                                                                                    {stops.map((stop, index) => {
                                                                                        const isReached =
                                                                                            index <= reachedStopIndex;
                                                                                        const isCurrent =
                                                                                            index === reachedStopIndex;

                                                                                        return (
                                                                                            <div
                                                                                                key={`${trip.id}-${stop}-${index}`}
                                                                                                className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
                                                                                            >
                                                                                                <span
                                                                                                    className={`z-10 flex rounded-full border-2 bg-white transition-all ${
                                                                                                        isCurrent
                                                                                                            ? 'h-7 w-7 border-blue-700 bg-blue-700 shadow-md ring-4 ring-blue-100'
                                                                                                            : isReached
                                                                                                              ? 'h-6 w-6 border-emerald-600 bg-emerald-600'
                                                                                                              : 'h-6 w-6 border-slate-300 bg-white'
                                                                                                    }`}
                                                                                                    title={stop}
                                                                                                />

                                                                                                <span
                                                                                                    className={`max-w-[96px] truncate text-xs ${
                                                                                                        isCurrent
                                                                                                            ? 'font-bold text-blue-800'
                                                                                                            : isReached
                                                                                                              ? 'font-semibold text-emerald-700'
                                                                                                              : 'font-medium text-slate-400'
                                                                                                    }`}
                                                                                                    title={stop}
                                                                                                >
                                                                                                    {stop}
                                                                                                </span>
                                                                                                {isReached &&
                                                                                                    stopUpdateMap.get(
                                                                                                        stop,
                                                                                                    )?.reached_at && (
                                                                                                        <span className="max-w-[96px] truncate text-[10px] text-slate-400">
                                                                                                            {new Date(
                                                                                                                stopUpdateMap.get(
                                                                                                                    stop,
                                                                                                                )!
                                                                                                                    .reached_at,
                                                                                                            ).toLocaleTimeString(
                                                                                                                [],
                                                                                                                {
                                                                                                                    hour: '2-digit',
                                                                                                                    minute: '2-digit',
                                                                                                                },
                                                                                                            )}
                                                                                                        </span>
                                                                                                    )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-slate-500">
                                                                            {t('No route stops configured.')}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="min-w-48">
                                                                <Select
                                                                    value={
                                                                        stopSelections[trip.id] ||
                                                                        trip.currentStop ||
                                                                        ''
                                                                    }
                                                                    onValueChange={(value) =>
                                                                        setStopSelections((current) => ({
                                                                            ...current,
                                                                            [trip.id]: value,
                                                                        }))
                                                                    }
                                                                    disabled={trip.tripStatus !== 'running'}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue
                                                                            placeholder={t('Select reached stop')}
                                                                        />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {stops.map((stop) => (
                                                                            <SelectItem key={stop} value={stop}>
                                                                                {stop}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge className={tripStatusTone[trip.tripStatus]}>
                                                                    {trip.tripStatus}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => updateReachedStop(trip)}
                                                                        disabled={trip.tripStatus !== 'running'}
                                                                    >
                                                                        {t('Reached Stop')}
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => endJourney(trip.id)}
                                                                        disabled={trip.tripStatus !== 'running'}
                                                                    >
                                                                        {t('End')}
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => deleteTrip(trip.id)}
                                                                        title={t('Delete journey')}
                                                                    >
                                                                        <Trash2 className="h-4 w-4 text-red-600" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>

                            <Dialog
                                open={showStartJourneyModal}
                                onOpenChange={(open) => {
                                    setShowStartJourneyModal(open);
                                    if (open) setTripForm(createEmptyTripForm());
                                }}
                            >
                                <DialogContent className="sm:max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>{t('Create Journey')}</DialogTitle>
                                        <DialogDescription>
                                            {t('Start the daily bus journey and track each reached stop.')}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>{t('Route')}</Label>
                                            <Select
                                                value={tripForm.routeId}
                                                onValueChange={(value) => {
                                                    const route = routes.find((item) => item.id === value) || null;
                                                    const linkedVehicle = route
                                                        ? vehicles.find(
                                                              (vehicle) =>
                                                                  vehicle.vehicleNumber === route.vehicleNumber,
                                                          ) || null
                                                        : null;
                                                    setTripForm((current) => ({
                                                        ...current,
                                                        routeId: value,
                                                        vehicleId: linkedVehicle?.id || current.vehicleId,
                                                        pickupPoints: (route?.stops || []).join(', '),
                                                    }));
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select route')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tripRouteOptions.map((route) => (
                                                        <SelectItem key={route.id} value={route.id}>
                                                            {route.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Vehicle')}</Label>
                                            <Select
                                                value={tripForm.vehicleId}
                                                onValueChange={(value) =>
                                                    setTripForm((current) => ({
                                                        ...current,
                                                        vehicleId: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select vehicle')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tripVehicleOptions.map((vehicle) => (
                                                        <SelectItem key={vehicle.id} value={vehicle.id}>
                                                            {vehicle.vehicleNumber}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('Shift')}</Label>
                                                <Select
                                                    value={tripForm.shift}
                                                    onValueChange={(value: DailyTrip['shift']) =>
                                                        setTripForm((current) => ({
                                                            ...current,
                                                            shift: value,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('Select shift')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="morning">{t('Morning')}</SelectItem>
                                                        <SelectItem value="afternoon">{t('Afternoon')}</SelectItem>
                                                        <SelectItem value="evening">{t('Evening')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Direction')}</Label>
                                                <Select
                                                    value={tripForm.direction}
                                                    onValueChange={(value: NonNullable<DailyTrip['direction']>) =>
                                                        setTripForm((current) => ({
                                                            ...current,
                                                            direction: value,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('Select direction')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pickup">{t('Pickup')}</SelectItem>
                                                        <SelectItem value="drop">{t('Drop')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Destination')}</Label>
                                            <Input
                                                value={tripForm.destinationPoint}
                                                onChange={(event) =>
                                                    setTripForm((current) => ({
                                                        ...current,
                                                        destinationPoint: event.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Note')}</Label>
                                            <Textarea
                                                value={tripForm.note}
                                                onChange={(event) =>
                                                    setTripForm((current) => ({
                                                        ...current,
                                                        note: event.target.value,
                                                    }))
                                                }
                                                rows={3}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            className="w-full gap-2"
                                            onClick={() => {
                                                handleStartJourney();
                                                setShowStartJourneyModal(false);
                                            }}
                                        >
                                            <BusFront className="h-4 w-4" />
                                            {t('Start Journey')}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </DashboardLayout>
    );
}
