import { useLanguage } from '../../i18n/LanguageProvider';
import { BusFront, CarFront, ClipboardList } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface DriverRow {
    name: string;
    phone: string;
    license: string;
    vehicleNumber: string;
    vehicleType: string;
    routeAssignments: number;
}

export default function TransportDrivers({ user, drivers, total }: { user: any; drivers: DriverRow[]; total: number }) {
    const { t } = useLanguage();

    return (
        <DashboardLayout user={user} activeTab="transport-drivers">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Drivers')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Transport drivers assigned to school vehicles and routes.')}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <BusFront className="h-8 w-8 text-indigo-600" />
                                <div>
                                    <p className="text-xs text-slate-500">{t('Total Drivers')}</p>
                                    <p className="text-lg font-semibold">{total}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <CarFront className="h-8 w-8 text-indigo-600" />
                                <div>
                                    <p className="text-xs text-slate-500">{t('Vehicles with Driver')}</p>
                                    <p className="text-lg font-semibold">{drivers.length}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <ClipboardList className="h-8 w-8 text-indigo-600" />
                                <div>
                                    <p className="text-xs text-slate-500">{t('Route Assignments')}</p>
                                    <p className="text-lg font-semibold">
                                        {drivers.reduce((sum, driver) => sum + driver.routeAssignments, 0)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Driver Registry')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Driver')}</TableHead>
                                        <TableHead>{t('Phone')}</TableHead>
                                        <TableHead>{t('License')}</TableHead>
                                        <TableHead>{t('Vehicle')}</TableHead>
                                        <TableHead className="text-right">{t('Route Assignments')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {drivers.map((driver) => (
                                        <TableRow key={`${driver.name}-${driver.vehicleNumber}`}>
                                            <TableCell className="font-medium text-slate-800">{driver.name}</TableCell>
                                            <TableCell className="text-sm text-slate-600">{driver.phone}</TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {driver.license || '-'}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {driver.vehicleNumber}
                                                {driver.vehicleType ? ` (${driver.vehicleType})` : ''}
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                {driver.routeAssignments}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {drivers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-8 text-center text-slate-400">
                                                {t(
                                                    'No drivers assigned yet. Add driver details to your transport vehicles.',
                                                )}
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
