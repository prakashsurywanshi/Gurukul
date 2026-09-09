import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ClipboardCheck, FileClock, LogIn, PauseCircle, Search, UserX } from 'lucide-react';
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

type ExitTab = 'pending' | 'register' | 'exited' | 'hold';

interface StudentRow {
    id: number;
    admissionNo: string | null;
    name: string;
    className: string | null;
    enrollmentStatus: string;
    latestExitId: number | null;
    reason: string | null;
    exitDate: string | null;
    tcNumber: string | null;
    tcIssuedDate: string | null;
    note: string | null;
    status: string | null;
}

interface ActiveStudentOption {
    id: number;
    name: string;
    admissionNo: string | null;
    className: string | null;
}

const reasonLabels: Record<string, string> = {
    transfer_out: 'Transfer Out',
    withdrawn: 'Withdrawn',
    passed_out: 'Passed Out',
    struck_off: 'Struck Off',
};

export default function StudentExits({
    user,
    pendingExits,
    register,
    exited,
    onHold,
    activeStudents,
    reasons,
}: {
    user: any;
    pendingExits: StudentRow[];
    register: StudentRow[];
    exited: StudentRow[];
    onHold: StudentRow[];
    activeStudents: ActiveStudentOption[];
    reasons: string[];
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [activeTab, setActiveTab] = useState<ExitTab>('pending');
    const [search, setSearch] = useState('');
    const [processing, setProcessing] = useState(false);

    const [exitDialogOpen, setExitDialogOpen] = useState(false);
    const [preselectedStudent, setPreselectedStudent] = useState<ActiveStudentOption | null>(null);
    const [tcDialogOpen, setTcDialogOpen] = useState(false);

    const [exitForm, setExitForm] = useState({
        student_id: '',
        type: 'exit',
        reason: '',
        exit_date: '',
        tc_number: '',
        tc_issued_date: '',
        note: '',
    });

    const [tcForm, setTcForm] = useState({
        student_id: '',
        tc_number: '',
        tc_issued_date: '',
    });

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const counts = {
        pending: pendingExits.length,
        register: register.length,
        exited: exited.length,
        hold: onHold.length,
    };

    const currentRows = useMemo(() => {
        const rows =
            activeTab === 'pending'
                ? pendingExits
                : activeTab === 'register'
                  ? register
                  : activeTab === 'exited'
                    ? exited
                    : onHold;
        const query = search.trim().toLowerCase();

        if (!query) {
            return rows;
        }

        return rows.filter(
            (row) => row.name.toLowerCase().includes(query) || (row.admissionNo ?? '').toLowerCase().includes(query),
        );
    }, [activeTab, pendingExits, register, exited, onHold, search]);

    const openExitDialog = (student?: ActiveStudentOption) => {
        setPreselectedStudent(student ?? null);
        setExitForm({
            student_id: student ? String(student.id) : '',
            type: 'exit',
            reason: '',
            exit_date: '',
            tc_number: '',
            tc_issued_date: '',
            note: '',
        });
        setExitDialogOpen(true);
    };

    const openTcDialog = () => {
        setTcForm({ student_id: '', tc_number: '', tc_issued_date: '' });
        setTcDialogOpen(true);
    };

    const submitExit = () => {
        if (!exitForm.student_id) {
            toast.error('Select a student.');
            return;
        }

        if (exitForm.type === 'exit') {
            if (!exitForm.reason || !exitForm.exit_date) {
                toast.error('Enter the reason for leaving and the last day on roll.');
                return;
            }
        }

        setProcessing(true);
        const payload = {
            ...exitForm,
            reason: exitForm.reason || null,
            exit_date: exitForm.exit_date || null,
            tc_number: exitForm.tc_number || null,
            tc_issued_date: exitForm.tc_issued_date || null,
            note: exitForm.note || null,
        };

        router.post('/student-exits', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setExitDialogOpen(false);
            },
            onError: () => toast.error('Failed to record exit.'),
            onFinish: () => setProcessing(false),
        });
    };

    const submitTcPrinted = () => {
        if (!tcForm.student_id) {
            toast.error('Select a student.');
            return;
        }

        setProcessing(true);
        router.post(
            '/student-exits/tc-printed',
            {
                ...tcForm,
                tc_number: tcForm.tc_number || null,
                tc_issued_date: tcForm.tc_issued_date || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setTcDialogOpen(false),
                onError: () => toast.error('Failed to mark TC as printed.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const restore = (row: StudentRow) => {
        if (!window.confirm(`Restore ${row.name} to the active roll?`)) {
            return;
        }

        setProcessing(true);
        router.post(
            `/student-exits/${row.id}/restore`,
            {},
            {
                preserveScroll: true,
                onError: () => toast.error('Failed to restore student.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const tabs: { id: ExitTab; label: string; value: number; icon: any }[] = [
        { id: 'pending', label: 'Pending Exit', value: counts.pending, icon: FileClock },
        { id: 'register', label: 'TC Register', value: counts.register, icon: ClipboardCheck },
        { id: 'exited', label: 'Exited', value: counts.exited, icon: UserX },
        { id: 'hold', label: 'On Hold', value: counts.hold, icon: PauseCircle },
    ];

    return (
        <DashboardLayout user={user} activeTab="student-exits">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('TC & Exit')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Manage enrolment exits, temporary holds and transfer certificates.')}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={openTcDialog} className="gap-2">
                                <FileClock className="h-4 w-4" />
                                {t('Mark TC Printed')}
                            </Button>
                            <Button onClick={() => openExitDialog()} className="gap-2">
                                <UserX className="h-4 w-4" />
                                {t('Record Exit')}
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className="text-left"
                                >
                                    <Card
                                        className={`transition ${
                                            activeTab === tab.id
                                                ? 'border-blue-300 shadow-[0_10px_25px_rgba(59,130,246,0.15)]'
                                                : 'hover:border-slate-300'
                                        }`}
                                    >
                                        <CardHeader className="pb-2">
                                            <CardDescription className="flex items-center gap-2">
                                                <Icon className="h-4 w-4" />
                                                {t(tab.label)}
                                            </CardDescription>
                                            <CardTitle
                                                className={`text-2xl ${
                                                    tab.id === 'pending'
                                                        ? 'text-amber-600'
                                                        : tab.id === 'hold'
                                                          ? 'text-slate-600'
                                                          : 'text-slate-900'
                                                }`}
                                            >
                                                {tab.value}
                                            </CardTitle>
                                        </CardHeader>
                                    </Card>
                                </button>
                            );
                        })}
                    </div>

                    {activeTab === 'pending' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Pending Exit')}</CardTitle>
                                <CardDescription>
                                    {t(
                                        'A transfer certificate was printed but the student is still on the active roll.',
                                    )}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Students')}</CardTitle>
                            <CardDescription>
                                {t('Reconcile exits, holds and transfer certificate records.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative min-w-[240px] flex-1 md:w-80">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder={t('Search name or admission no...')}
                                    className="pl-10"
                                />
                            </div>

                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Adm No.')}</TableHead>
                                            <TableHead>{t('Student')}</TableHead>
                                            <TableHead>{t('Current Class')}</TableHead>
                                            <TableHead>{t('Reason')}</TableHead>
                                            <TableHead>{t('Last Day on Roll')}</TableHead>
                                            <TableHead>{t('TC Number')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentRows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                                    {t('Nothing here yet.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            currentRows.map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="text-sm text-slate-600">
                                                        {row.admissionNo ?? '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-slate-900">{row.name}</div>
                                                        {row.tcNumber && (
                                                            <div className="text-xs text-slate-500">
                                                                {t('TC')}: {row.tcNumber}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        {row.className ?? '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.reason ? (
                                                            <Badge variant="outline">
                                                                {t(reasonLabels[row.reason])}
                                                            </Badge>
                                                        ) : row.status === 'pending' ? (
                                                            <Badge variant="secondary">{t('TC printed')}</Badge>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        {row.exitDate ?? '-'}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        {row.tcNumber ?? '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-2">
                                                            {row.status === 'pending' && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={processing}
                                                                    onClick={() =>
                                                                        openExitDialog({
                                                                            id: row.id,
                                                                            name: row.name,
                                                                            admissionNo: row.admissionNo,
                                                                            className: row.className,
                                                                        })
                                                                    }
                                                                >
                                                                    {t('Record Exit')}
                                                                </Button>
                                                            )}
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={processing}
                                                                onClick={() => restore(row)}
                                                                className="gap-2"
                                                            >
                                                                <LogIn className="h-3.5 w-3.5" />
                                                                {t('Restore')}
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

                <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
                    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>{t('Record Exit')}</DialogTitle>
                            <DialogDescription>
                                {t('Remove a student from the active roll or place them on a temporary hold.')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="space-y-2">
                                <Label>{t('Student')}</Label>
                                <Select
                                    value={exitForm.student_id}
                                    onValueChange={(value) =>
                                        setExitForm((current) => ({ ...current, student_id: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select a student')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeStudents
                                            .filter(
                                                (student) =>
                                                    !preselectedStudent || student.id === preselectedStudent.id,
                                            )
                                            .map((student) => (
                                                <SelectItem key={student.id} value={String(student.id)}>
                                                    {student.name} ({student.admissionNo ?? '-'})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('Type')}</Label>
                                <Select
                                    value={exitForm.type}
                                    onValueChange={(value) => setExitForm((current) => ({ ...current, type: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="exit">{t('Permanent Exit')}</SelectItem>
                                        <SelectItem value="hold">{t('Temporary Hold')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {exitForm.type === 'exit' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>{t('Reason for Leaving')}</Label>
                                        <Select
                                            value={exitForm.reason}
                                            onValueChange={(value) =>
                                                setExitForm((current) => ({ ...current, reason: value }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select reason')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {reasons.map((reason) => (
                                                    <SelectItem key={reason} value={reason}>
                                                        {t(reasonLabels[reason] ?? reason)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('Last Day on Roll')}</Label>
                                        <Input
                                            type="date"
                                            value={exitForm.exit_date}
                                            onChange={(event) =>
                                                setExitForm((current) => ({
                                                    ...current,
                                                    exit_date: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <Label>{t('TC / Certificate Number')}</Label>
                                <Input
                                    value={exitForm.tc_number}
                                    onChange={(event) =>
                                        setExitForm((current) => ({
                                            ...current,
                                            tc_number: event.target.value,
                                        }))
                                    }
                                    placeholder={t('Leave blank if no certificate was issued')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Certificate Issued On')}</Label>
                                <Input
                                    type="date"
                                    value={exitForm.tc_issued_date}
                                    onChange={(event) =>
                                        setExitForm((current) => ({
                                            ...current,
                                            tc_issued_date: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Note')}</Label>
                                <Textarea
                                    value={exitForm.note}
                                    onChange={(event) =>
                                        setExitForm((current) => ({ ...current, note: event.target.value }))
                                    }
                                    rows={3}
                                    placeholder={t('Optional remarks')}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setExitDialogOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="button" onClick={submitExit} disabled={processing}>
                                {processing ? t('Saving...') : t('Save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={tcDialogOpen} onOpenChange={setTcDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('Mark TC Printed')}</DialogTitle>
                            <DialogDescription>
                                {t('Record that a transfer certificate was printed for an active student.')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="space-y-2">
                                <Label>{t('Student')}</Label>
                                <Select
                                    value={tcForm.student_id}
                                    onValueChange={(value) =>
                                        setTcForm((current) => ({ ...current, student_id: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select a student')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeStudents.map((student) => (
                                            <SelectItem key={student.id} value={String(student.id)}>
                                                {student.name} ({student.admissionNo ?? '-'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('TC Number')}</Label>
                                <Input
                                    value={tcForm.tc_number}
                                    onChange={(event) =>
                                        setTcForm((current) => ({ ...current, tc_number: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Certificate Issued On')}</Label>
                                <Input
                                    type="date"
                                    value={tcForm.tc_issued_date}
                                    onChange={(event) =>
                                        setTcForm((current) => ({ ...current, tc_issued_date: event.target.value }))
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setTcDialogOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="button" onClick={submitTcPrinted} disabled={processing}>
                                {processing ? t('Saving...') : t('Save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
