import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { CheckCircle2, ClipboardCheck, FileClock, FolderKanban, Plus, ShieldCheck, Trash2 } from 'lucide-react';
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
    };
};

const FREQUENCIES = ['once', 'monthly', 'quarterly', 'yearly'] as const;

export default function Compliance({ user, packs, items, summary }: ComplianceProps) {
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

    return (
        <DashboardLayout user={user} pageTitle={t('Compliance Suite')}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Compliance Packs')}</p>
                                    <p className="text-2xl font-bold">{summary.packs}</p>
                                </div>
                                <FolderKanban className="h-5 w-5 text-primary" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Total Items')}</p>
                                    <p className="text-2xl font-bold">{summary.totalItems}</p>
                                </div>
                                <ClipboardCheck className="h-5 w-5 text-primary" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Compliant')}</p>
                                    <p className="text-2xl font-bold">{summary.compliant}</p>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Overdue')}</p>
                                    <p className="text-2xl font-bold text-rose-600">{summary.overdue}</p>
                                </div>
                                <FileClock className="h-5 w-5 text-rose-600" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Due This Month')}</p>
                                    <p className="text-2xl font-bold">{summary.dueThisMonth}</p>
                                </div>
                                <ShieldCheck className="h-5 w-5 text-amber-600" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Completion')}</p>
                                    <p className="text-2xl font-bold">{summary.completion}%</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <Button onClick={() => setPackOpen(true)}>
                        <Plus className="mr-1 h-4 w-4" /> {t('Add Pack')}
                    </Button>
                </div>

                {packs.length === 0 && (
                    <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                            {t('No compliance packs yet.')}
                        </CardContent>
                    </Card>
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
                                                        {item.status === 'compliant' && (
                                                            <Badge variant="default">
                                                                <CheckCircle2 className="mr-1 h-3 w-3" />{' '}
                                                                {t('Compliant')}
                                                            </Badge>
                                                        )}
                                                        {item.status === 'pending' && (
                                                            <Badge variant={item.overdue ? 'destructive' : 'outline'}>
                                                                {item.overdue ? t('Overdue') : t('Pending')}
                                                            </Badge>
                                                        )}
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
