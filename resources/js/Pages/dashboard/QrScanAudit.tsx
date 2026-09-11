import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { CheckCircle2, QrCode, ScanLine, XCircle } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { toast } from 'sonner';

export type QrScanAuditLog = {
    id: number;
    studentName: string;
    admissionNo: string | null;
    scannedByName: string;
    method: string;
    status: string;
    qrToken: string | null;
    ipAddress: string | null;
    scanDate: string | null;
    createdAt: string | null;
};

export type QrScanAuditProps = {
    user: any;
    logs: QrScanAuditLog[];
    date: string;
    summary: {
        scansToday: number;
        successToday: number;
        attendanceMarked: number;
        totalScans: number;
        successRate: number;
    };
};

export default function QrScanAudit({ user, logs, date, summary }: QrScanAuditProps) {
    const { t } = useLanguage();
    const [filter, setFilter] = useState<'all' | 'success' | 'failure'>('all');

    const visible = logs.filter((log) => {
        if (filter === 'success') return log.status === 'success';
        if (filter === 'failure') return log.status === 'failure';
        return true;
    });

    const changeDate = (value: string) => {
        router.get('/qr-scan-audit', { date: value }, { preserveState: true, replace: true });
    };

    const toggleFilter = (value: 'all' | 'success' | 'failure') => {
        setFilter(value);
        if (value !== 'all') {
            toast.info(t('Filtered by scan status.'));
        }
    };

    return (
        <DashboardLayout user={user} pageTitle={t('QR Scan Audit')}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="grid gap-3 sm:grid-cols-5">
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Scans Today')}</p>
                                    <p className="text-2xl font-bold">{summary.scansToday}</p>
                                </div>
                                <ScanLine className="h-5 w-5 text-primary" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Successful')}</p>
                                    <p className="text-2xl font-bold text-emerald-600">{summary.successToday}</p>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Attendance Marked')}</p>
                                    <p className="text-2xl font-bold">{summary.attendanceMarked}</p>
                                </div>
                                <QrCode className="h-5 w-5 text-sky-600" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Total Scans')}</p>
                                    <p className="text-2xl font-bold">{summary.totalScans}</p>
                                </div>
                                <ScanLine className="h-5 w-5 text-amber-600" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Success Rate')}</p>
                                    <p className="text-2xl font-bold text-emerald-600">{summary.successRate}%</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <Input type="date" value={date} onChange={(e) => changeDate(e.target.value)} className="w-44" />
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-base">{t('Scan Log')}</CardTitle>
                            <div className="flex flex-wrap gap-2">
                                {(['all', 'success', 'failure'] as const).map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => toggleFilter(value)}
                                        className={`rounded-md px-3 py-1 text-sm ${
                                            filter === value
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/60'
                                        }`}
                                    >
                                        {value === 'all'
                                            ? t('All')
                                            : value === 'success'
                                              ? t('Successful')
                                              : t('Failed')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {visible.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">{t('No QR scans recorded.')}</p>
                        )}
                        {visible.length > 0 && (
                            <div className="space-y-2">
                                {visible.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            {log.status === 'success' ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-rose-600" />
                                            )}
                                            <p className="font-medium">{log.studentName || t('Unknown student')}</p>
                                            {log.admissionNo && <Badge variant="outline">{log.admissionNo}</Badge>}
                                            <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                                                {log.status === 'success' ? t('Success') : t('Failed')}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <span>
                                                {t('by')} {log.scannedByName}
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
        </DashboardLayout>
    );
}
