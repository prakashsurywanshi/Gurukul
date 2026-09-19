import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { Camera, Download, Eye, Plus, Search, Trash2, Video } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

export type CctvCameraRow = {
    id: number;
    name: string;
    location: string | null;
    streamUrl: string | null;
    cameraType: string;
    isActive: boolean;
    notes: string | null;
    accessCount: number;
};

export type CctvLogRow = {
    id: number;
    cameraName: string;
    location: string | null;
    userName: string;
    action: string;
    ipAddress: string;
    createdAt: string | null;
};

export type CctvProps = {
    user: any;
    cameras: CctvCameraRow[];
    logs: CctvLogRow[];
    summary: { cameras: number; active: number; views: number; exports: number };
    hasKey: boolean;
    keyHint: string;
    endpoint: string;
};

const CAMERA_TYPES = ['indoor', 'outdoor', 'gate', 'classroom', 'corridor'] as const;

export default function Cctv({ user, cameras, logs, summary, hasKey, keyHint, endpoint }: CctvProps) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [streamUrl, setStreamUrl] = useState('');
    const [cameraType, setCameraType] = useState<string>('indoor');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [revealedKey, setRevealedKey] = useState('');
    const [copied, setCopied] = useState(false);

    const regenerateKey = () => {
        if (!window.confirm(t('Regenerate the CCTV sync key? Existing devices will stop working until updated.')))
            return;
        setRevealedKey('');
        router.post('/cctv/regenerate', {}, { preserveScroll: true });
    };

    const revealKey = () => {
        fetch('/cctv/reveal', { headers: { Accept: 'application/json' } })
            .then((res) => res.json())
            .then((data) => setRevealedKey(data.key ?? ''))
            .catch(() => {});
    };

    const copyKey = () => {
        navigator.clipboard
            ?.writeText(revealedKey)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {});
    };

    const submitCamera = () => {
        if (!name.trim()) {
            toast.error(t('Camera name is required.'));
            return;
        }
        setSaving(true);
        router.post(
            '/cctv',
            {
                name: name.trim(),
                location: location.trim() || null,
                stream_url: streamUrl.trim() || null,
                camera_type: cameraType,
                notes: notes.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setOpen(false);
                    setName('');
                    setLocation('');
                    setStreamUrl('');
                    setCameraType('indoor');
                    setNotes('');
                    toast.success(t('Camera added.'));
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const toggleCamera = (camera: CctvCameraRow) => {
        router.post(`/cctv/${camera.id}/toggle`, undefined, {
            preserveScroll: true,
            onSuccess: () => toast.success(camera.isActive ? t('Camera disabled.') : t('Camera enabled.')),
        });
    };

    const deleteCamera = (camera: CctvCameraRow) => {
        router.delete(`/cctv/${camera.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Camera removed.')),
        });
    };

    const logAction = (camera: CctvCameraRow, action: 'view' | 'export' | 'search_photo') => {
        router.post(
            `/cctv/${camera.id}/access`,
            { action },
            { preserveScroll: true, onSuccess: () => toast.success(t('Access logged.')) },
        );
    };

    const typeLabel = (value: string) =>
        ['indoor', 'outdoor', 'gate', 'classroom', 'corridor'].includes(value)
            ? t(value.charAt(0).toUpperCase() + value.slice(1))
            : value;

    const actionLabel = (value: string) => {
        const labels: Record<string, string> = {
            view: 'View',
            export: 'Export',
            search_photo: 'Photo Search',
            camera_added: 'Camera Added',
        };
        return t(labels[value] ?? value);
    };

    return (
        <DashboardLayout user={user} pageTitle={t('CCTV Camera Registry')}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="grid gap-3 sm:grid-cols-4">
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Total Cameras')}</p>
                                    <p className="text-2xl font-bold">{summary.cameras}</p>
                                </div>
                                <Video className="h-5 w-5 text-primary" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Active')}</p>
                                    <p className="text-2xl font-bold text-emerald-600">{summary.active}</p>
                                </div>
                                <Camera className="h-5 w-5 text-emerald-600" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Views')}</p>
                                    <p className="text-2xl font-bold">{summary.views}</p>
                                </div>
                                <Eye className="h-5 w-5 text-sky-600" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Exports')}</p>
                                    <p className="text-2xl font-bold">{summary.exports}</p>
                                </div>
                                <Download className="h-5 w-5 text-amber-600" />
                            </CardContent>
                        </Card>
                    </div>
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="mr-1 h-4 w-4" /> {t('Add Camera')}
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Video className="h-4 w-4 text-primary" />
                            {t('CCTV Device Sync')}
                            {hasKey ? (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                    {t('Configured')}
                                </Badge>
                            ) : (
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                    {t('Not configured')}
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0 text-sm">
                        <p className="text-muted-foreground">
                            {t('Sync face scans from CCTV cameras using a per-school API key.')}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                            <code className="truncate text-xs text-muted-foreground">{endpoint}</code>
                            <div className="ml-auto flex gap-2">
                                {revealedKey && (
                                    <Button size="sm" variant="outline" className="h-7" onClick={copyKey}>
                                        {copied ? t('Copied') : t('Copy')}
                                    </Button>
                                )}
                                {revealedKey ? null : (
                                    <Button size="sm" variant="outline" className="h-7" onClick={revealKey}>
                                        {t('Show Key')}
                                    </Button>
                                )}
                                <Button size="sm" variant="outline" className="h-7" onClick={regenerateKey}>
                                    {t('Regenerate Key')}
                                </Button>
                            </div>
                        </div>
                        {revealedKey && (
                            <p className="break-all font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                {revealedKey}
                            </p>
                        )}
                        {hasKey && !revealedKey && <p className="font-mono text-xs text-gray-400">{keyHint}</p>}
                        <p className="text-xs text-muted-foreground">
                            {t(
                                'Send the key in the X-Cctv-Key header. The endpoint logs camera frames and optionally matches students via vision.',
                            )}
                        </p>
                    </CardContent>
                </Card>

                {cameras.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Cameras')}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {cameras.map((camera) => (
                                    <div key={camera.id} className="rounded-lg border p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Camera className="h-4 w-4 text-primary" />
                                                <p className="font-medium">{camera.name}</p>
                                            </div>
                                            <Badge variant={camera.isActive ? 'default' : 'outline'}>
                                                {camera.isActive ? t('Active') : t('Inactive')}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {camera.location ?? t('No location')} · {typeLabel(camera.cameraType)}
                                        </p>
                                        {camera.streamUrl && (
                                            <p className="mt-1 truncate text-xs text-muted-foreground">
                                                {camera.streamUrl}
                                            </p>
                                        )}
                                        {camera.notes && (
                                            <p className="mt-1 text-sm text-muted-foreground">{camera.notes}</p>
                                        )}
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => logAction(camera, 'view')}
                                            >
                                                <Eye className="mr-1 h-4 w-4" /> {t('View Live')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => logAction(camera, 'export')}
                                            >
                                                <Download className="mr-1 h-4 w-4" /> {t('Export')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => logAction(camera, 'search_photo')}
                                            >
                                                <Search className="mr-1 h-4 w-4" /> {t('Photo Search')}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => toggleCamera(camera)}>
                                                {camera.isActive ? t('Disable') : t('Enable')}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => deleteCamera(camera)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Access Log')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {logs.length === 0 && (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                {t('No access activity recorded.')}
                            </p>
                        )}
                        {logs.length > 0 && (
                            <div className="space-y-2">
                                {logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline">{actionLabel(log.action)}</Badge>
                                            <p className="font-medium">{log.cameraName}</p>
                                            {log.location && (
                                                <p className="text-sm text-muted-foreground">{log.location}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>
                                                {t('by')} {log.userName}
                                            </span>
                                            {log.ipAddress && <span>· {log.ipAddress}</span>}
                                            {log.createdAt && <span>· {log.createdAt}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Add Camera')}</DialogTitle>
                        <DialogDescription>{t('Register a new CCTV camera for your school.')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Camera Name')}</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('e.g. Main Gate Camera')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Location')}</Label>
                            <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder={t('e.g. Main Gate')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Camera Type')}</Label>
                            <Select value={cameraType} onValueChange={setCameraType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CAMERA_TYPES.map((value) => (
                                        <SelectItem key={value} value={value}>
                                            {typeLabel(value)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Stream URL')}</Label>
                            <Input
                                value={streamUrl}
                                onChange={(e) => setStreamUrl(e.target.value)}
                                placeholder={t('Optional RTSP / HLS URL')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Notes')}</Label>
                            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                        <Button className="w-full" onClick={submitCamera} disabled={saving}>
                            {saving ? t('Saving...') : t('Save Camera')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
