import { FormEvent, useMemo, useState } from 'react';
import { ListChecks, Plus, Pencil, ScanFace, ServerCog, Trash2, UserCheck, Activity, Power } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useLanguage } from '../../i18n/LanguageProvider';

interface Device {
    id: number;
    name: string;
    deviceType: string;
    location: string | null;
    serialNumber: string | null;
    apiUrl: string | null;
    isActive: boolean;
    notes: string | null;
    logCount: number;
}

interface LogEntry {
    id: number;
    logType: string;
    deviceName: string;
    deviceLocation: string | null;
    personType: string | null;
    personName: string | null;
    uid: string | null;
    direction: string | null;
    matched: boolean;
    action: string | null;
    details: string | null;
    eventTime: string | null;
}

interface BiometricDevicesProps {
    user: any;
    devices: Device[];
    logs: LogEntry[];
    summary: {
        devices: number;
        active: number;
        attendance: number;
        face: number;
        agent: number;
    };
}

const DEVICE_TYPES: Record<string, string> = {
    fingerprint: 'Fingerprint',
    face: 'Face',
    iris: 'Iris',
    card: 'Card',
};

const LOG_TYPE_LABELS: Record<string, string> = {
    attendance: 'Attendance',
    face: 'Face Monitoring',
    agent: 'Agent',
};

const emptyForm = {
    name: '',
    device_type: 'fingerprint',
    location: '',
    serial_number: '',
    api_url: '',
    notes: '',
};

const emptyLogForm = {
    biometric_device_id: '',
    log_type: 'attendance',
    person_type: 'student',
    person_name: '',
    uid: '',
    direction: 'in',
    matched: true,
    details: '',
    event_time: '',
};

export default function BiometricDevices(pageProps: BiometricDevicesProps) {
    const { t } = useLanguage();
    const { user, devices, logs, summary } = pageProps;
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<Device | null>(null);
    const [addingLog, setAddingLog] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [logForm, setLogForm] = useState(emptyLogForm);

    const saveDevice = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await router.put(`/biometric-devices/${editing.id}`, form);
            } else {
                await router.post('/biometric-devices', form);
            }
            setCreating(false);
            setEditing(null);
            setForm(emptyForm);
        } finally {
            setSaving(false);
        }
    };

    const saveLog = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        try {
            await router.post('/biometric-devices/logs', logForm);
            setAddingLog(false);
            setLogForm({ ...emptyLogForm, biometric_device_id: devices[0]?.id ? String(devices[0].id) : '' });
        } finally {
            setSaving(false);
        }
    };

    const startLogForm = () => {
        setLogForm({ ...emptyLogForm, biometric_device_id: devices[0]?.id ? String(devices[0].id) : '' });
        setAddingLog(true);
    };

    const attendanceLogs = useMemo(() => logs.filter((log) => log.logType === 'attendance'), [logs]);
    const faceLogs = useMemo(
        () =>
            logs.filter(
                (log) => log.logType === 'face' || (log.logType === 'attendance' && log.details?.includes('face')),
            ),
        [logs],
    );
    const agentLogs = useMemo(() => logs.filter((log) => log.logType === 'agent'), [logs]);

    const statusBadge = (log: LogEntry) => {
        if (log.logType === 'agent') {
            return log.matched ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Sync OK
                </Badge>
            ) : (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{t('Failed')}</Badge>
            );
        }
        return log.direction === 'in' ? (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">In</Badge>
        ) : (
            <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">{t('Out')}</Badge>
        );
    };

    const renderLogTable = (rows: LogEntry[], emptyText: string) => (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('Device')}</TableHead>
                            <TableHead>{t('Person')}</TableHead>
                            <TableHead>{t('Type')}</TableHead>
                            <TableHead>{t('Event Time')}</TableHead>
                            <TableHead>{t('Status')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="py-10 text-center text-gray-400">
                                    {emptyText}
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell>
                                    <p className="text-sm font-medium">{log.deviceName}</p>
                                    {log.deviceLocation && (
                                        <p className="text-xs text-gray-400">{log.deviceLocation}</p>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm">{log.personName ?? '—'}</p>
                                    {log.personType && <p className="text-xs text-gray-400">{log.personType}</p>}
                                </TableCell>
                                <TableCell className="text-sm">{statusBadge(log)}</TableCell>
                                <TableCell className="text-sm">{log.eventTime ?? '—'}</TableCell>
                                <TableCell className="text-sm text-gray-500">
                                    {log.action ?? log.details ?? '—'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            <ScanFace className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            Biometric Devices
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Devices, attendance logs, face monitoring and agent sync status.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={startLogForm}>
                            <ListChecks className="mr-2 h-4 w-4" />
                            Add Log
                        </Button>
                        <Button onClick={() => setCreating(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Device
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <ServerCog className="h-8 w-8 text-indigo-500" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Devices')}</p>
                                <p className="text-lg font-semibold">
                                    {summary.devices}{' '}
                                    <span className="text-xs font-normal text-gray-400">({summary.active} active)</span>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <UserCheck className="h-8 w-8 text-emerald-500" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Attendance Logs')}</p>
                                <p className="text-lg font-semibold">{summary.attendance}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <ScanFace className="h-8 w-8 text-sky-500" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Face Events')}</p>
                                <p className="text-lg font-semibold">{summary.face}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <Activity className="h-8 w-8 text-amber-500" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Agent Syncs')}</p>
                                <p className="text-lg font-semibold">{summary.agent}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="devices">
                    <TabsList>
                        <TabsTrigger value="devices">All Devices ({devices.length})</TabsTrigger>
                        <TabsTrigger value="attendance">Attendance Logs ({attendanceLogs.length})</TabsTrigger>
                        <TabsTrigger value="face">Face Monitoring ({faceLogs.length})</TabsTrigger>
                        <TabsTrigger value="agent">Agent Logs ({agentLogs.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="devices" className="mt-4">
                        {devices.length === 0 ? (
                            <p className="rounded-xl bg-slate-50 py-10 text-center text-sm text-gray-400 dark:bg-slate-800">
                                No biometric devices registered yet. Add your first device to start capturing attendance
                                logs.
                            </p>
                        ) : (
                            <Card>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Device')}</TableHead>
                                                <TableHead>{t('Type')}</TableHead>
                                                <TableHead>{t('Location')}</TableHead>
                                                <TableHead>{t('Serial / API')}</TableHead>
                                                <TableHead className="text-right">{t('Logs')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                                <TableHead className="text-right">{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {devices.map((device) => (
                                                <TableRow key={device.id}>
                                                    <TableCell className="text-sm font-medium">{device.name}</TableCell>
                                                    <TableCell className="text-sm">
                                                        <Badge variant="outline">
                                                            {DEVICE_TYPES[device.deviceType] ?? device.deviceType}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{device.location ?? '—'}</TableCell>
                                                    <TableCell>
                                                        <p className="font-mono text-xs text-gray-400">
                                                            {device.serialNumber ?? 'No serial'}
                                                        </p>
                                                        {device.apiUrl && (
                                                            <p className="max-w-[240px] truncate text-xs text-gray-400">
                                                                {device.apiUrl}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        {device.logCount}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={
                                                                device.isActive
                                                                    ? ACTIVITY_STYLES.active
                                                                    : ACTIVITY_STYLES.inactive
                                                            }
                                                        >
                                                            {device.isActive ? t('Active') : t('Inactive')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setEditing(device)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                <span className="sr-only">{t('Edit')}</span>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    router.post(
                                                                        `/biometric-devices/${device.id}/toggle`,
                                                                    )
                                                                }
                                                            >
                                                                <Power className="h-4 w-4" />
                                                                <span className="sr-only">{t('Toggle')}</span>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-rose-500 hover:text-rose-600"
                                                                onClick={() => {
                                                                    if (
                                                                        window.confirm(
                                                                            `Remove device "${device.name}"?`,
                                                                        )
                                                                    ) {
                                                                        router.delete(
                                                                            `/biometric-devices/${device.id}`,
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                <span className="sr-only">{t('Delete')}</span>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="attendance" className="mt-4">
                        {renderLogTable(attendanceLogs, 'No attendance logs yet.')}
                    </TabsContent>

                    <TabsContent value="face" className="mt-4">
                        {renderLogTable(faceLogs, 'No face monitoring events yet.')}
                    </TabsContent>

                    <TabsContent value="agent" className="mt-4">
                        {renderLogTable(agentLogs, 'No agent sync logs yet.')}
                    </TabsContent>
                </Tabs>

                {(creating || editing) && (
                    <DialogShell
                        title={editing ? `Edit ${editing.name}` : t('Add Biometric Device')}
                        onClose={() => {
                            setCreating(false);
                            setEditing(null);
                            setForm(emptyForm);
                        }}
                        onSubmit={saveDevice}
                        saving={saving}
                    >
                        <DeviceForm form={form} setForm={setForm} />
                    </DialogShell>
                )}

                {addingLog && (
                    <DialogShell
                        title={t('Record Biometric Log')}
                        onClose={() => setAddingLog(false)}
                        onSubmit={saveLog}
                        saving={saving}
                    >
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t('Device')}</Label>
                                <Select
                                    value={logForm.biometric_device_id}
                                    onValueChange={(value) =>
                                        setLogForm((current) => ({ ...current, biometric_device_id: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select device')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {devices.map((device) => (
                                            <SelectItem key={device.id} value={String(device.id)}>
                                                {device.name}
                                                {device.location ? ` (${device.location})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('Log Type')}</Label>
                                    <Select
                                        value={logForm.log_type}
                                        onValueChange={(value) =>
                                            setLogForm((current) => ({ ...current, log_type: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(LOG_TYPE_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Person Type')}</Label>
                                    <Select
                                        value={logForm.person_type}
                                        onValueChange={(value) =>
                                            setLogForm((current) => ({ ...current, person_type: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="student">{t('Student')}</SelectItem>
                                            <SelectItem value="staff">{t('Staff')}</SelectItem>
                                            <SelectItem value="visitor">{t('Visitor')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('Person Name')}</Label>
                                    <Input
                                        value={logForm.person_name}
                                        onChange={(event) =>
                                            setLogForm((current) => ({ ...current, person_name: event.target.value }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>UID</Label>
                                    <Input
                                        value={logForm.uid}
                                        onChange={(event) =>
                                            setLogForm((current) => ({ ...current, uid: event.target.value }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('Direction')}</Label>
                                    <Select
                                        value={logForm.direction}
                                        onValueChange={(value) =>
                                            setLogForm((current) => ({ ...current, direction: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="in">In</SelectItem>
                                            <SelectItem value="out">{t('Out')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Event Time')}</Label>
                                    <Input
                                        type="datetime-local"
                                        value={logForm.event_time}
                                        onChange={(event) =>
                                            setLogForm((current) => ({ ...current, event_time: event.target.value }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </DialogShell>
                )}
            </div>
        </DashboardLayout>
    );
}

const ACTIVITY_STYLES: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
};

function DeviceForm({ form, setForm }: { form: any; setForm: (updater: (current: any) => any) => void }) {
    const { t } = useLanguage();
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>{t('Device Name')}</Label>
                <Input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('Device Type')}</Label>
                    <Select
                        value={form.device_type}
                        onValueChange={(value) => setForm((current) => ({ ...current, device_type: value }))}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(DEVICE_TYPES).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>{t('Location')}</Label>
                    <Input
                        value={form.location}
                        onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('Serial Number')}</Label>
                    <Input
                        value={form.serial_number}
                        onChange={(event) => setForm((current) => ({ ...current, serial_number: event.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label>{t('API URL')}</Label>
                    <Input
                        value={form.api_url}
                        onChange={(event) => setForm((current) => ({ ...current, api_url: event.target.value }))}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label>{t('Notes')}</Label>
                <Input
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
            </div>
        </div>
    );
}

function DialogShell({
    title,
    description,
    onClose,
    onSubmit,
    saving,
    children,
}: {
    title: string;
    description?: string;
    onClose: () => void;
    onSubmit: (event: FormEvent) => void;
    saving: boolean;
    children: React.ReactNode;
}) {
    const { t } = useLanguage();
    return (
        <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    {children}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            {t('Cancel')}</Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving…' : t('Save')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
