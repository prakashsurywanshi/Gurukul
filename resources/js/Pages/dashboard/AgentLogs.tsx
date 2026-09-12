import { useMemo, useState } from 'react';
import { History, Terminal, UserCheck, ScanFace, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useLanguage } from '../../i18n/LanguageProvider';

type AgentLog = {
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
};

type AgentLogsProps = {
    user: any;
    logs: AgentLog[];
    total: number;
    agentCount: number;
    attendanceCount: number;
    faceCount: number;
};

const LOG_TYPE_LABELS: Record<string, string> = {
    attendance: 'Attendance',
    face: 'Face Monitoring',
    agent: 'Agent',
};

export default function AgentLogs({ user, logs, total, agentCount, attendanceCount, faceCount }: AgentLogsProps) {
    const { t } = useLanguage();
    const [tab, setTab] = useState('all');

    const filteredLogs = useMemo(() => {
        if (tab === 'all') return logs;
        return logs.filter((log) => log.logType === tab);
    }, [logs, tab]);

    const typeBadge = (logType: string) => {
        const variant = logType === 'agent' ? 'secondary' : logType === 'attendance' ? 'default' : 'outline';
        return (
            <Badge variant={variant as 'default' | 'secondary' | 'outline'}>
                {LOG_TYPE_LABELS[logType] ?? logType}
            </Badge>
        );
    };

    return (
        <DashboardLayout user={user} pageTitle={t('Agent Logs')}>
            <div className="space-y-6">
                <Card>
                    <CardContent className="flex items-start gap-4 pt-6">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Terminal className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">{t('Agent Logs')}</h1>
                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                {t(
                                    'System and agent logs captured by biometric devices, including attendance, face monitoring and agent sync events.',
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center gap-3 pt-6">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                <History className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{total}</p>
                                <p className="text-xs text-muted-foreground">{t('Total Logs')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 pt-6">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                <UserCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{attendanceCount}</p>
                                <p className="text-xs text-muted-foreground">{t('Attendance Events')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 pt-6">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                <ScanFace className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{faceCount}</p>
                                <p className="text-xs text-muted-foreground">{t('Face Monitoring')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base">{t('Device Logs')}</CardTitle>
                        <Tabs value={tab} onValueChange={setTab}>
                            <TabsList>
                                <TabsTrigger value="all">{t('All')}</TabsTrigger>
                                <TabsTrigger value="agent">{t('Agent')}</TabsTrigger>
                                <TabsTrigger value="attendance">{t('Attendance')}</TabsTrigger>
                                <TabsTrigger value="face">{t('Face')}</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {filteredLogs.length === 0 ? (
                            <p className="py-10 text-center text-muted-foreground">{t('No records found.')}</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Time')}</TableHead>
                                        <TableHead>{t('Type')}</TableHead>
                                        <TableHead>{t('Device')}</TableHead>
                                        <TableHead>{t('Person')}</TableHead>
                                        <TableHead>{t('Direction')}</TableHead>
                                        <TableHead>{t('Matched')}</TableHead>
                                        <TableHead>{t('Details')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="whitespace-nowrap text-xs">
                                                {log.eventTime ?? '—'}
                                            </TableCell>
                                            <TableCell>{typeBadge(log.logType)}</TableCell>
                                            <TableCell>
                                                <p className="text-sm font-medium">{log.deviceName}</p>
                                                {log.deviceLocation ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        {log.deviceLocation}
                                                    </p>
                                                ) : null}
                                            </TableCell>
                                            <TableCell>
                                                {log.personName ? (
                                                    <p className="text-sm font-medium">{log.personName}</p>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                                {log.personType ? (
                                                    <p className="text-xs text-muted-foreground">{log.personType}</p>
                                                ) : null}
                                            </TableCell>
                                            <TableCell>
                                                {log.direction === 'in' ? (
                                                    <span className="inline-flex items-center gap-1 text-sm">
                                                        <ArrowDownToLine className="h-3.5 w-3.5" />
                                                        {t('In')}
                                                    </span>
                                                ) : log.direction === 'out' ? (
                                                    <span className="inline-flex items-center gap-1 text-sm">
                                                        <ArrowUpFromLine className="h-3.5 w-3.5" />
                                                        {t('Out')}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {log.matched ? (
                                                    <Badge variant="default">{t('Matched')}</Badge>
                                                ) : (
                                                    <Badge variant="destructive">{t('Unmatched')}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                                                {log.details ?? '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
