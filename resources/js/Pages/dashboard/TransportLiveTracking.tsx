import { useLanguage } from '../../i18n/LanguageProvider';
import { router, usePage } from '@inertiajs/react';
import { canPerform, type StaffPermissionMap } from '../../lib/permissions';
import { toast } from 'sonner';
import { Gauge, LocateFixed, MapPin, Navigation, PlayCircle, RotateCcw, Truck } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type LatestGps = {
    lat: number;
    lng: number;
    speedKmh: number;
    heading: string;
    recordedAt: string;
};

type LiveTrip = {
    id: string;
    vehicleId: string;
    vehicleNumber: string;
    routeId: string;
    routeName: string;
    area: string;
    driverName: string;
    shift: string;
    direction: string;
    journeyDate: string;
    pickupPoints: string[];
    currentStop: string;
    currentLocation: string;
    tripStatus: string;
    startedAt: string;
    endedAt: string;
    reached: number;
    totalStops: number;
    positionCount: number;
    latestGps: LatestGps | null;
};

type TransportLiveTrackingProps = {
    user: any;
    trips: LiveTrip[];
    summary: { running: number; completedToday: number; avgSpeed: number; positionsToday: number };
};

export default function TransportLiveTracking({ user, trips, summary }: TransportLiveTrackingProps) {
    const { t } = useLanguage();
    const { staffPermissions } = usePage<{ staffPermissions?: StaffPermissionMap }>().props;
    const canEditTrips = canPerform(user?.role, 'Transport Management', 'edit', staffPermissions);

    const simulateGps = (tripId: string) => {
        router.post(
            `/transport-management/trips/${tripId}/simulate-gps`,
            {},
            {
                onSuccess: () => toast.success(t('Simulated GPS position recorded.')),
                onError: (errors) => toast.error(t('Unable to simulate the GPS position. Please try again.')),
            },
        );
    };

    const resetGps = (tripId: string) => {
        if (!window.confirm(t('Reset the simulated GPS history for this trip?'))) return;
        router.delete(`/transport-management/trips/${tripId}/gps`, {
            onSuccess: () => toast.success(t('Simulated GPS history cleared.')),
        });
    };

    const statusTone = (status: string) => {
        const map: Record<string, string> = {
            running: 'bg-emerald-50 text-emerald-700',
            completed: 'bg-sky-50 text-sky-700',
            scheduled: 'bg-slate-100 text-slate-600',
            delayed: 'bg-amber-50 text-amber-700',
        };
        return map[status] ?? 'bg-slate-100 text-slate-600';
    };

    return (
        <DashboardLayout user={user} pageTitle={t('Live Vehicle Tracking')}>
            <div className="space-y-6 p-4 sm:p-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <Navigation className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('Live Vehicle Tracking')}</CardTitle>
                                <CardDescription>
                                    {t(
                                        'Monitor live vehicle GPS positions and simulated trip progress for running journeys.',
                                    )}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                <Truck className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    {summary.running}
                                </div>
                                <div className="text-xs text-slate-500">{t('Running Trips')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                                <MapPin className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    {summary.completedToday}
                                </div>
                                <div className="text-xs text-slate-500">{t('Completed Today')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                                <Gauge className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    {summary.avgSpeed}
                                </div>
                                <div className="text-xs text-slate-500">{t('Avg Speed (km/h)')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                                <LocateFixed className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                                    {summary.positionsToday}
                                </div>
                                <div className="text-xs text-slate-500">{t('Positions Recorded')}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                    <span className="font-semibold">{t('Demo mode')}: </span>
                    {t(
                        'GPS feeds are simulated on this dashboard. Use Simulate to advance a trip to its next stop with a live position.',
                    )}
                </div>

                {trips.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-400 dark:bg-slate-800">
                        {t('No active or completed trips today.')}
                    </p>
                ) : (
                    <div className="space-y-6">
                        {trips.map((trip) => (
                            <Card key={trip.id}>
                                <CardContent className="space-y-4 p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-slate-800 dark:text-gray-100">
                                                    {trip.vehicleNumber}
                                                </span>
                                                <Badge variant="outline" className={statusTone(trip.tripStatus)}>
                                                    {trip.tripStatus === 'running'
                                                        ? t('Running')
                                                        : trip.tripStatus === 'completed'
                                                          ? t('Completed')
                                                          : t(trip.tripStatus)}
                                                </Badge>
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                                                <span className="inline-flex items-center gap-1">
                                                    <Truck className="h-3.5 w-3.5" />
                                                    {trip.routeName || trip.routeId}
                                                </span>
                                                {trip.area ? <span>{trip.area}</span> : null}
                                                <span>
                                                    {trip.direction === 'drop' ? t('Drop') : t('Pickup')} · {trip.shift}
                                                </span>
                                                <span>
                                                    {t('Driver')}: {trip.driverName || '—'}
                                                </span>
                                                <span>
                                                    {t('Started')}: {trip.startedAt || trip.journeyDate}
                                                </span>
                                            </div>
                                        </div>
                                        {canEditTrips && (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => resetGps(trip.id)}
                                                    disabled={trip.positionCount === 0}
                                                >
                                                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                                    {t('Reset GPS')}
                                                </Button>
                                                <Button size="sm" onClick={() => simulateGps(trip.id)}>
                                                    <PlayCircle className="mr-1 h-3.5 w-3.5" />
                                                    {t('Simulate Next Stop')}
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                                            <span>
                                                {t('Stops Reached')}: {trip.reached} / {trip.totalStops}
                                            </span>
                                            <span>
                                                {Math.round((trip.reached / Math.max(1, trip.totalStops)) * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                            <div
                                                className="h-full rounded-full bg-emerald-500 transition-all"
                                                style={{
                                                    width: `${Math.round(
                                                        (trip.reached / Math.max(1, trip.totalStops)) * 100,
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                {t('Latest GPS Position')}
                                            </div>
                                            {trip.latestGps ? (
                                                <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-gray-700">
                                                    <div className="flex items-center justify-between">
                                                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-gray-300">
                                                            <MapPin className="h-3.5 w-3.5 text-rose-500" />
                                                            {trip.latestGps.lat.toFixed(5)},{' '}
                                                            {trip.latestGps.lng.toFixed(5)}
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-indigo-50 text-indigo-700"
                                                        >
                                                            {trip.latestGps.speedKmh} km/h
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            <Navigation className="h-3 w-3" />
                                                            {t('Heading')}: {trip.latestGps.heading || '—'}
                                                        </span>
                                                        <span>{trip.latestGps.recordedAt}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-400 dark:border-gray-700">
                                                    {t('No GPS position yet. Simulate a stop to record one.')}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                {t('Stop Progress')}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {trip.pickupPoints.slice(0, trip.totalStops).map((stop, index) => {
                                                    const reached = index < trip.reached;
                                                    return (
                                                        <span
                                                            key={`${stop}-${index}`}
                                                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                                reached
                                                                    ? 'bg-emerald-50 text-emerald-700'
                                                                    : 'bg-slate-100 text-slate-400'
                                                            }`}
                                                        >
                                                            {reached ? '✓ ' : ''}
                                                            {stop}
                                                        </span>
                                                    );
                                                })}
                                                {trip.totalStops === 1 ? (
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400">
                                                        {t('Destination')}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
