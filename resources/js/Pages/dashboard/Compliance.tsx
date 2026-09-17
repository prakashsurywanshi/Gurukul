import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import {
    Activity,
    Banknote,
    CheckCircle2,
    ClipboardCheck,
    Download,
    FileClock,
    FolderKanban,
    GraduationCap,
    HandCoins,
    Plus,
    ShieldCheck,
    Trash2,
    UserRound,
    Users,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { PageHeader } from '../ui/page-header';
import { StatCard } from '../ui/stat-card';
import { StatusBadge } from '../ui/status-badge';
import { EmptyState } from '../ui/empty-state';
import { toast } from 'sonner';

export type ComplianceItemRow = {
    id: number;
    packId: number;
    title: string;
    description: string | null;
    frequency: string;
    dueDate: string | null;
    status: string;
    verifiedAt: string | null;
    overdue: boolean;
};

export type ComplianceProps = {
    user: any;
    packs: {
        id: number;
        name: string;
        category: string;
        description: string | null;
        status: string;
        itemCount: number;
        compliantCount: number;
    }[];
    items: ComplianceItemRow[];
    summary: {
        packs: number;
        totalItems: number;
        compliant: number;
        overdue: number;
        dueThisMonth: number;
        completion: number;
        healthScore: number;
    };
    liveStats: {
        students: number;
        activeStudents: number;
        staff: number;
        staffStudentRatio: number;
        attendanceRate30d: number;
        feesDue: number;
        feesDueCount: number;
        pendingConcessions: number;
    };
};

const FREQUENCIES = ['once', 'monthly', 'quarterly', 'yearly'] as const;

export default function Compliance({ user, packs, items, summary, liveStats }: ComplianceProps) {
    const { t } = useLanguage();
    const [packOpen, setPackOpen] = useState(false);
    const [itemPack, setItemPack] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('CBSE');
    const [packStatus, setPackStatus] = useState<'active' | 'archived'>('active');
    const [packDescription, setPackDescription] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [frequency, setFrequency] = useState<string>('monthly');
    const [dueDate, setDueDate] = useState('');
    const [saving, setSaving] = useState(false);

    const submitPack = () => {
        if (!name.trim() || !category.trim()) {
            toast.error(t('Name and category are required.'));
            return;
        }
        setSaving(true);
        router.post(
            '/compliance/packs',
            {
                name: name.trim(),
                category: category.trim(),
                description: packDescription.trim() || null,
                status: packStatus,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setPackOpen(false);
                    setName('');
                    setCategory('CBSE');
                    setPackStatus('active');
                    setPackDescription('');
                    toast.success(t('Compliance pack added.'));
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const openItemDialog = (packId: number) => {
        setItemPack(packId);
        setTitle('');
        setDescription('');
        setFrequency('monthly');
        setDueDate('');
    };

    const submitItem = () => {
        if (itemPack === null || !title.trim()) {
            toast.error(t('Item title is required.'));
            return;
        }
        setSaving(true);
        router.post(
            `/compliance/packs/${itemPack}/items`,
            {
                compliance_pack_id: itemPack,
                title: title.trim(),
                description: description.trim() || null,
                frequency,
                due_date: dueDate || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setItemPack(null);
                    toast.success(t('Compliance checklist item added.'));
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const toggleStatus = (item: ComplianceItemRow) => {
        router.put(
            `/compliance/items/${item.id}`,
            { status: item.status === 'compliant' ? 'pending' : 'compliant' },
            {
                preserveScroll: true,
                onSuccess: () =>
                    toast.success(item.status === 'compliant' ? t('Item moved to pending.') : t('Item verified.')),
            },
        );
    };

    const deleteItem = (item: ComplianceItemRow) => {
        router.delete(`/compliance/items/${item.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Item removed.')),
        });
    };

    const deletePack = (packId: number) => {
        router.delete(`/compliance/packs/${packId}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Compliance pack removed.')),
        });
    };

    const frequencyLabel = (value: string) =>
        ['once', 'monthly', 'quarterly', 'yearly'].includes(value)
            ? t(value.charAt(0).toUpperCase() + value.slice(1))
            : value;

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);

    return (
        <DashboardLayout user={user} pageTitle={t('Compliance Overview')}>
            <div className="space-y-6">
                <PageHeader
                    title={t('Compliance Overview')}
                    description={t('Live statutory indicators drawn from your student, staff, fee and attendance data.')}
                    actions={
                        <>
                            <Button variant="outline" onClick={() => router.visit('/compliance/export')}>
                                <Download className="mr-1 h-4 w-4" /> {t('Export')}
                            </Button>
                            <Button onClick={() => setPackOpen(true)}>
                                <Plus className="mr-1 h-4 w-4" /> {t('Add Pack')}
                            </Button>
                        </>
                    }
                />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <StatCard label={t('Compliance Packs')} value={summary.packs} icon={FolderKanban} tone="info" />
                    <StatCard label={t('Total Items')} value={summary.totalItems} icon={ClipboardCheck} tone="info" />
                    <StatCard label={t('Compliant')} value={summary.compliant} icon={CheckCircle2} tone="success" />
                    <StatCard label={t('Overdue')} value={summary.overdue} icon={FileClock} tone="danger" />
                    <StatCard label={t('Due This Month')} value={summary.dueThisMonth} icon={ShieldCheck} tone="warning" />
                    <StatCard label={t('Completion')} value={`${summary.completion}%`} icon={Activity} tone="success" />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Live School Health')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                label={t('Enrolled Students')}
                                value={liveStats.students}
                                hint={`${t('Active')}: ${liveStats.activeStudents}`}
                                icon={GraduationCap}
                                tone="info"
                            />
                            <StatCard label={t('Active Staff')} value={liveStats.staff} icon={UserRound} tone="info" />
                            <StatCard
                                label={t('Student : Staff Ratio')}
                                value={liveStats.staffStudentRatio}
                                icon={Users}
                            />
                            <StatCard
                                label={t('Attendance (30 days)')}
                                value={`${liveStats.attendanceRate30d}%`}
                                icon={CheckCircle2}
                                tone={liveStats.attendanceRate30d >= 85 ? 'success' : 'warning'}
                            />
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <StatCard
                                label={t('Fees Due')}
                                value={formatCurrency(liveStats.feesDue)}
                                hint={`${liveStats.feesDueCount} ${t('Payment Records Due')}`}
                                icon={Banknote}
                                tone={liveStats.feesDueCount > 0 ? 'warning' : 'success'}
                            />
                            <StatCard
                                label={t('Pending Concessions')}
                                value={liveStats.pendingConcessions}
                                icon={HandCoins}
                                tone={liveStats.pendingConcessions > 0 ? 'warning' : 'success'}
                            />
                            <Card className="gap-2 p-0">
                                <CardContent className="flex flex-col justify-center px-4 py-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                                                <Activity className="size-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">{t('Overall Health')}</p>
                                                <p
                                                    className={`mt-0.5 text-xl font-semibold tabular-nums ${
                                                        summary.healthScore >= 80
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : summary.healthScore >= 50
                                                              ? 'text-amber-600 dark:text-amber-400'
                                                              : 'text-red-600 dark:text-red-400'
                                                    }`}
                                                >
                                                    {summary.healthScore}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all"
                                            style={{ width: `${summary.healthScore}%` }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>

                {packs.length === 0 && (
                    <EmptyState
                        title={t('No compliance packs yet.')}
                        description={t('Add a compliance pack to start tracking statutory and renewal requirements.')}
                        icon={FolderKanban}
                        action={<Button onClick={() => setPackOpen(true)}>{t('Add Pack')}</Button>}
                    />
                )}

                <div className="space-y-4">
                    {packs.map((pack) => {
                        const packItems = items.filter((item) => item.packId === pack.id);

                        return (
                            <Card key={pack.id}>
                                <CardHeader>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-base">{pack.name}</CardTitle>
                                            <Badge variant="secondary">{pack.category}</Badge>
                                            {pack.status === 'archived' && (
                                                <Badge variant="outline">{t('Archived')}</Badge>
                                            )}
                                            <Badge
                                                variant={
                                                    pack.itemCount > 0 && pack.compliantCount === pack.itemCount
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                            >
                                                {pack.compliantCount}/{pack.itemCount}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => openItemDialog(pack.id)}>
                                                <Plus className="mr-1 h-4 w-4" /> {t('Add Item')}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => deletePack(pack.id)}>
                                                <Trash2 className="mr-1 h-4 w-4" /> {t('Remove')}
                                            </Button>
                                        </div>
                                    </div>
                                    {pack.description && (
                                        <p className="text-sm text-muted-foreground">{pack.description}</p>
                                    )}
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {packItems.length === 0 && (
                                        <p className="py-4 text-sm text-muted-foreground">
                                            {t('No items in this pack.')}
                                        </p>
                                    )}
                                    <div className="space-y-2">
                                        {packItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-medium">{item.title}</p>
                                                        <Badge variant="outline">
                                                            {frequencyLabel(item.frequency)}
                                                        </Badge>
                                                        <StatusBadge
                                                            status={
                                                                item.status === 'compliant'
                                                                    ? 'compliant'
                                                                    : item.overdue
                                                                      ? 'overdue'
                                                                      : 'pending'
                                                            }
                                                            label={
                                                                item.status === 'compliant'
                                                                    ? t('Compliant')
                                                                    : item.overdue
                                                                      ? t('Overdue')
                                                                      : t('Pending')
                                                            }
                                                        />
                                                    </div>
                                                    {item.description && (
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {item.dueDate
                                                            ? `${t('Due')} ${item.dueDate}`
                                                            : t('No due date')}
                                                        {item.verifiedAt
                                                            ? ` · ${t('Verified')} ${item.verifiedAt}`
                                                            : ''}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant={item.status === 'compliant' ? 'outline' : 'default'}
                                                        onClick={() => toggleStatus(item)}
                                                    >
                                                        <CheckCircle2 className="mr-1 h-4 w-4" />
                                                        {item.status === 'compliant'
                                                            ? t('Mark Pending')
                                                            : t('Mark Compliant')}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => deleteItem(item)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            <Dialog open={packOpen} onOpenChange={setPackOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Add Compliance Pack')}</DialogTitle>
                        <DialogDescription>{t('Group related compliance checklist items.')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Pack Name')}</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('e.g. CBSE Affiliation Requirements')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Category')}</Label>
                            <Input
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder={t('e.g. CBSE')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Status')}</Label>
                            <Select
                                value={packStatus}
                                onValueChange={(value) => setPackStatus(value as 'active' | 'archived')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">{t('Active')}</SelectItem>
                                    <SelectItem value="archived">{t('Archived')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Description')}</Label>
                            <Textarea value={packDescription} onChange={(e) => setPackDescription(e.target.value)} />
                        </div>
                        <Button className="w-full" onClick={submitPack} disabled={saving}>
                            {saving ? t('Saving...') : t('Save Pack')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={itemPack !== null} onOpenChange={(open) => !open && setItemPack(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Add Checklist Item')}</DialogTitle>
                        <DialogDescription>
                            {t('Track a specific compliance requirement or renewal.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Item Title')}</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('e.g. Renew school recognition certificate')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Frequency')}</Label>
                            <Select value={frequency} onValueChange={setFrequency}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FREQUENCIES.map((value) => (
                                        <SelectItem key={value} value={value}>
                                            {frequencyLabel(value)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Due Date')}</Label>
                            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Description')}</Label>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <Button className="w-full" onClick={submitItem} disabled={saving}>
                            {saving ? t('Saving...') : t('Save Item')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
