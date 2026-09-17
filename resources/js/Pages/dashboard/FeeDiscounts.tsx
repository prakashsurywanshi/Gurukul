import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { BadgePercent, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface FeeDiscountRow {
    id: number;
    name: string;
    discountType: string;
    value: string;
    description: string;
    status: string;
}

interface FormState {
    name: string;
    discountType: string;
    value: string;
    description: string;
    status: string;
}

const EMPTY_FORM: FormState = {
    name: '',
    discountType: 'percentage',
    value: '',
    description: '',
    status: 'active',
};

export default function FeeDiscounts({ user, discounts }: { user: any; discounts: FeeDiscountRow[] }) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [editingDiscount, setEditingDiscount] = useState<FeeDiscountRow | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<FeeDiscountRow | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const openAdd = () => {
        setMode('add');
        setEditingDiscount(null);
        setForm({ ...EMPTY_FORM });
        setModalOpen(true);
    };

    const openEdit = (discount: FeeDiscountRow) => {
        setMode('edit');
        setEditingDiscount(discount);
        setForm({
            name: discount.name,
            discountType: discount.discountType,
            value: discount.value,
            description: discount.description ?? '',
            status: discount.status,
        });
        setModalOpen(true);
    };

    const submit = () => {
        if (!form.name.trim()) {
            toast.error('Enter a discount name.');
            return;
        }

        if (!form.value || Number(form.value) <= 0) {
            toast.error('Enter a discount value greater than zero.');
            return;
        }

        if (form.discountType === 'percentage' && Number(form.value) > 100) {
            toast.error('Percentage discount cannot exceed 100.');
            return;
        }

        setProcessing(true);
        const payload = {
            name: form.name,
            discount_type: form.discountType,
            value: Number(form.value),
            description: form.description,
            status: form.status,
        };

        if (mode === 'edit' && editingDiscount) {
            router.patch(`/fees-discounts/${editingDiscount.id}`, payload, {
                preserveScroll: true,
                onError: () => toast.error('Failed to update fee discount.'),
                onFinish: () => setProcessing(false),
            });
            return;
        }

        router.post('/fees-discounts', payload, {
            preserveScroll: true,
            onError: () => toast.error('Failed to add fee discount.'),
            onFinish: () => setProcessing(false),
        });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        setProcessing(true);
        router.delete(`/fees-discounts/${deleting.id}`, {
            preserveScroll: true,
            onError: () => toast.error('Failed to delete fee discount.'),
            onFinish: () => {
                setProcessing(false);
                setDeleteOpen(false);
            },
        });
    };

    const formatValue = (discount: FeeDiscountRow) =>
        `${discount.discountType === 'percentage' ? `${discount.value}%` : `Rs. ${discount.value}`}`;

    return (
        <DashboardLayout user={user} activeTab="fees-discounts">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Fee Discounts')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Define reusable discount rules to apply on student fee invoices.')}
                            </p>
                        </div>
                        <Button onClick={openAdd} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t('Add Fee Discount')}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('All Fee Discounts')}</CardTitle>
                            <CardDescription>
                                {t('Catalogue of percentage and fixed discounts available at your school.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>{t('Value')}</TableHead>
                                            <TableHead>{t('Description')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {discounts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                                    {t('No fee discounts created yet.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            discounts.map((discount, index) => (
                                                <TableRow key={discount.id}>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-800">
                                                        {discount.name}
                                                    </TableCell>
                                                    <TableCell className="capitalize text-sm text-slate-500">
                                                        {discount.discountType === 'percentage'
                                                            ? t('Percentage')
                                                            : t('Fixed')}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-medium text-slate-700">
                                                        {formatValue(discount)}
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate text-sm text-slate-500">
                                                        {discount.description || (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={
                                                                discount.status === 'active'
                                                                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                                                            }
                                                        >
                                                            {discount.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openEdit(discount)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                                {t('Edit')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:bg-red-50"
                                                                onClick={() => {
                                                                    setDeleting(discount);
                                                                    setDeleteOpen(true);
                                                                }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                {t('Delete')}
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
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BadgePercent className="h-5 w-5" />
                            {mode === 'edit' ? t('Edit Fee Discount') : t('Add Fee Discount')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Define a reusable discount rule to apply on fee invoices.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="fee-discount-name">{t('Discount Name')}</Label>
                            <Input
                                id="fee-discount-name"
                                value={form.name}
                                onChange={(event) => setForm({ ...form, name: event.target.value })}
                                placeholder={t('e.g. Sibling Concession')}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="fee-discount-type">{t('Discount Type')}</Label>
                                <Select
                                    value={form.discountType}
                                    onValueChange={(value) => setForm({ ...form, discountType: value })}
                                >
                                    <SelectTrigger id="fee-discount-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">{t('Percentage')}</SelectItem>
                                        <SelectItem value="fixed">{t('Fixed Amount')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="fee-discount-value">
                                    {form.discountType === 'percentage' ? t('Value (%)') : t('Value (Rs.)')}
                                </Label>
                                <Input
                                    id="fee-discount-value"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    max={form.discountType === 'percentage' ? 100 : undefined}
                                    value={form.value}
                                    onChange={(event) => setForm({ ...form, value: event.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="fee-discount-description">{t('Description')}</Label>
                            <Textarea
                                id="fee-discount-description"
                                value={form.description}
                                onChange={(event) => setForm({ ...form, description: event.target.value })}
                                rows={2}
                            />
                        </div>
                        <div>
                            <Label htmlFor="fee-discount-status">{t('Status')}</Label>
                            <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                                <SelectTrigger id="fee-discount-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">{t('Active')}</SelectItem>
                                    <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={submit} disabled={processing} className="gap-2">
                            <Save className="h-4 w-4" />
                            {processing ? t('Saving...') : mode === 'edit' ? t('Save Changes') : t('Add Discount')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('Delete Fee Discount')}</DialogTitle>
                        <DialogDescription>
                            {t('Are you sure you want to delete the fee discount')} "{deleting?.name}"?{' '}
                            {t('This cannot be undone.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={processing}
                            className="gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            {processing ? t('Deleting...') : t('Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
