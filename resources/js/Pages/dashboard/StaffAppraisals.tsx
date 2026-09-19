import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { CalendarRange, ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

type StaffOption = { id: number; name: string; role: string };
type CycleRow = {
    id: number;
    name: string;
    startsOn: string;
    endsOn: string;
    status: string;
    appraisalsCount: number;
    description: string | null;
};
type AppraisalRow = {
    id: number;
    staffName: string;
    staffRole: string;
    cycleName: string;
    cycleId: number;
    criteria: unknown[];
    overallScore: number | null;
    rating: string | null;
    reviewerName: string | null;
    feedback: string | null;
    status: string;
    reviewDate: string | null;
};

type Props = {
    user: any;
    cycles: CycleRow[];
    appraisals: AppraisalRow[];
    staffOptions: StaffOption[];
    summary: { activeCycles: number; completed: number; avgScore: number | null };
};

export default function StaffAppraisals({ user, cycles, appraisals, staffOptions, summary }: Props) {
    const { t } = useLanguage();
    const [cycleName, setCycleName] = useState('');
    const [startsOn, setStartsOn] = useState('');
    const [endsOn, setEndsOn] = useState('');
    const [cycleStatus, setCycleStatus] = useState('active');
    const [cycleDescription, setCycleDescription] = useState('');
    const [cycleSaving, setCycleSaving] = useState(false);

    const [appStaffId, setAppStaffId] = useState('');
    const [appCycleId, setAppCycleId] = useState('');
    const [appScore, setAppScore] = useState('');
    const [appRating, setAppRating] = useState('');
    const [appStatus, setAppStatus] = useState('draft');
    const [appFeedback, setAppFeedback] = useState('');
    const [appSaving, setAppSaving] = useState(false);

    const [editingCycle, setEditingCycle] = useState<CycleRow | null>(null);

    const openEditCycle = (cycle: CycleRow) => {
        setEditingCycle(cycle);
        setCycleName(cycle.name);
        setStartsOn(cycle.startsOn);
        setEndsOn(cycle.endsOn);
        setCycleStatus(cycle.status);
        setCycleDescription(cycle.description ?? '');
        toast.info(t('Editing appraisal cycle.'));
    };

    const resetCycleForm = () => {
        setEditingCycle(null);
        setCycleName('');
        setStartsOn('');
        setEndsOn('');
        setCycleStatus('active');
        setCycleDescription('');
    };

    const removeCycle = (cycle: CycleRow) => {
        if (!window.confirm(t('Delete this appraisal cycle and its appraisals?'))) {
            return;
        }
        router.delete(`/staff/appraisals/cycles/${cycle.id}`, {
            preserveScroll: true,
            onError: () => toast.error(t('Failed to delete appraisal cycle.')),
        });
    };

    const submitCycle = () => {
        if (!cycleName.trim() || !startsOn || !endsOn) {
            toast.error(t('Cycle name and dates are required.'));
            return;
        }
        setCycleSaving(true);
        const payload = {
            name: cycleName.trim(),
            starts_on: startsOn,
            ends_on: endsOn,
            status: cycleStatus,
            description: cycleDescription.trim() || null,
        };
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                resetCycleForm();
                toast.success(editingCycle ? t('Appraisal cycle updated.') : t('Appraisal cycle created.'));
            },
            onFinish: () => setCycleSaving(false),
        };
        if (editingCycle) {
            router.put(`/staff/appraisals/cycles/${editingCycle.id}`, payload, options);
        } else {
            router.post('/staff/appraisals/cycles', payload, options);
        }
    };

    const submitAppraisal = () => {
        if (!appStaffId || !appCycleId) {
            toast.error(t('Select staff member and cycle.'));
            return;
        }
        setAppSaving(true);
        router.post(
            '/staff/appraisals',
            {
                staff_user_id: Number(appStaffId),
                appraisal_cycle_id: Number(appCycleId),
                overall_score: appScore !== '' ? parseInt(appScore, 10) : null,
                rating: appRating.trim() || null,
                feedback: appFeedback.trim() || null,
                status: appStatus,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAppStaffId('');
                    setAppCycleId('');
                    setAppScore('');
                    setAppRating('');
                    setAppStatus('draft');
                    setAppFeedback('');
                    toast.success(t('Appraisal recorded.'));
                },
                onFinish: () => setAppSaving(false),
            },
        );
    };

    const editAppraisal = (row: AppraisalRow) => {
        const score = window.prompt(`${t('Overall Score (0-100)')}:`, String(row.overallScore ?? ''));
        if (score === null) return;
        const parsed = Math.max(0, Math.min(100, parseInt(score, 10) || 0));
        const status = parsed > 0 ? 'completed' : row.status;
        router.put(
            `/staff/appraisals/${row.id}`,
            { overall_score: parsed, rating: row.rating, feedback: row.feedback, status },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(t('Appraisal updated.')),
            },
        );
    };

    const removeAppraisal = (row: AppraisalRow) => {
        if (!window.confirm(t('Delete this appraisal record?'))) return;
        router.delete(`/staff/appraisals/${row.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Appraisal deleted.')),
        });
    };

    const ratingBadge = (score: number | null) => {
        if (score === null) return null;
        if (score >= 85) return <Badge>A+</Badge>;
        if (score >= 70) return <Badge>A</Badge>;
        if (score >= 50) return <Badge variant="secondary">B</Badge>;
        return <Badge variant="destructive">C</Badge>;
    };

    return (
        <DashboardLayout user={user} pageTitle={t('Appraisals')}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Active Cycles')}</p>
                                <p className="text-2xl font-bold">{summary.activeCycles}</p>
                            </div>
                            <CalendarRange className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Completed')}</p>
                                <p className="text-2xl font-bold">{summary.completed}</p>
                            </div>
                            <ClipboardCheck className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Average Score')}</p>
                                <p className="text-2xl font-bold">
                                    {summary.avgScore === null ? '—' : summary.avgScore.toFixed(1)}
                                </p>
                            </div>
                            <Plus className="h-5 w-5" />
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{editingCycle ? t('Edit Appraisal Cycle') : t('New Appraisal Cycle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1">
                                <Label>{t('Cycle Name')}</Label>
                                <Input
                                    value={cycleName}
                                    onChange={(e) => setCycleName(e.target.value)}
                                    placeholder={t('e.g. 2026-27 Annual')}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Starts On')}</Label>
                                <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Ends On')}</Label>
                                <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Status')}</Label>
                                <Select value={cycleStatus} onValueChange={setCycleStatus}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="completed">{t('Completed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>{t('Description')}</Label>
                            <Input value={cycleDescription} onChange={(e) => setCycleDescription(e.target.value)} />
                        </div>
                        <Button onClick={submitCycle} disabled={cycleSaving}>
                            <Plus className="mr-2 h-4 w-4" />
                            {cycleSaving ? t('Saving...') : editingCycle ? t('Update Cycle') : t('Create Cycle')}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Cycles')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {cycles.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">{t('No appraisal cycles yet.')}</p>
                        )}
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {cycles.map((cycle) => (
                                <div key={cycle.id} className="rounded-lg border p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium">{cycle.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {cycle.startsOn} → {cycle.endsOn}
                                            </p>
                                        </div>
                                        <Badge variant={cycle.status === 'active' ? 'default' : 'secondary'}>
                                            {t(cycle.status)}
                                        </Badge>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {cycle.appraisalsCount} {t('appraisals')}
                                    </p>
                                    <div className="mt-3 flex justify-end gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => openEditCycle(cycle)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => removeCycle(cycle)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Record Appraisal')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                            <div className="space-y-1">
                                <Label>{t('Staff Member')}</Label>
                                <Select value={appStaffId} onValueChange={setAppStaffId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select staff')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staffOptions.map((staff) => (
                                            <SelectItem key={staff.id} value={String(staff.id)}>
                                                {staff.name} ({staff.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Cycle')}</Label>
                                <Select value={appCycleId} onValueChange={setAppCycleId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select cycle')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cycles.map((cycle) => (
                                            <SelectItem key={cycle.id} value={String(cycle.id)}>
                                                {cycle.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Score (0-100)')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={appScore}
                                    onChange={(e) => setAppScore(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Rating')}</Label>
                                <Input
                                    value={appRating}
                                    onChange={(e) => setAppRating(e.target.value)}
                                    placeholder={t('e.g. Outstanding')}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Status')}</Label>
                                <Select value={appStatus} onValueChange={setAppStatus}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">{t('Draft')}</SelectItem>
                                        <SelectItem value="submitted">{t('Submitted')}</SelectItem>
                                        <SelectItem value="completed">{t('Completed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>{t('Feedback')}</Label>
                            <Textarea value={appFeedback} onChange={(e) => setAppFeedback(e.target.value)} rows={2} />
                        </div>
                        <Button onClick={submitAppraisal} disabled={appSaving}>
                            <Plus className="mr-2 h-4 w-4" />
                            {appSaving ? t('Saving...') : t('Record Appraisal')}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Appraisals')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {appraisals.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">{t('No appraisals recorded yet.')}</p>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Staff')}</TableHead>
                                    <TableHead>{t('Cycle')}</TableHead>
                                    <TableHead>{t('Score')}</TableHead>
                                    <TableHead>{t('Rating')}</TableHead>
                                    <TableHead>{t('Reviewer')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {appraisals.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">
                                            {row.staffName}
                                            <span className="block text-xs text-muted-foreground">{row.staffRole}</span>
                                        </TableCell>
                                        <TableCell>{row.cycleName}</TableCell>
                                        <TableCell>{row.overallScore ?? '—'}</TableCell>
                                        <TableCell>{row.rating ?? ratingBadge(row.overallScore) ?? '—'}</TableCell>
                                        <TableCell>{row.reviewerName ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.status === 'completed' ? 'default' : 'secondary'}>
                                                {t(row.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost" onClick={() => editAppraisal(row)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => removeAppraisal(row)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
