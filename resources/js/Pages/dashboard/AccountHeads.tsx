import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowDownCircle, ArrowUpCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface AccountHeadRow {
    id: number;
    name: string;
    status: string;
}

interface AccountHeadsProps {
    user: any;
    heads: AccountHeadRow[];
    type: string;
}

export default function AccountHeads({ user, heads, type }: AccountHeadsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const isIncome = type === 'income';
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<AccountHeadRow | null>(null);
    const [form, setForm] = useState({ name: '' });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const basePath = `/accounts/${isIncome ? 'income' : 'expense'}-heads`;

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '' });
        setDialogOpen(true);
    };

    const openEdit = (head: AccountHeadRow) => {
        setEditing(head);
        setForm({ name: head.name });
        setDialogOpen(true);
    };

    const submit = () => {
        if (!form.name.trim()) {
            toast.error(t('Enter a name for the head.'));
            return;
        }

        setProcessing(true);

        const payload = { name: form.name.trim() };

        const options = {
            preserveScroll: true,
            onSuccess: () => setDialogOpen(false),
            onError: () => toast.error(editing ? t('Failed to update head.') : t('Failed to add head.')),
            onFinish: () => setProcessing(false),
        };

        if (editing) {
            router.patch(`${basePath}/${editing.id}`, payload, options);
        } else {
            router.post(basePath, payload, options);
        }
    };

    const remove = (head: AccountHeadRow) => {
        if (!window.confirm(t('Delete this head?'))) {
            return;
        }

        router.delete(`${basePath}/${head.id}`, {
            preserveScroll: true,
            onError: () => toast.error(t('Failed to delete head.')),
        });
    };

    const Icon = isIncome ? ArrowUpCircle : ArrowDownCircle;
    const titleKey = isIncome ? 'Income Heads' : 'Expense Heads';
    const descriptionKey = isIncome
        ? 'Manage the list of income heads used while recording income entries.'
        : 'Manage the list of expense heads used while recording expense entries.';

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div
                                    className={`rounded-lg p-2 ${
                                        isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                    }`}
                                >
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle>{t(titleKey)}</CardTitle>
                                    <CardDescription>{t(descriptionKey)}</CardDescription>
                                </div>
                            </div>
                            <Button onClick={openAdd}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Add Head')}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Head Name')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead className="text-right">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {heads.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-slate-500">
                                                {t('No heads added yet.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        heads.map((head) => (
                                            <TableRow key={head.id}>
                                                <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                    {head.name}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            head.status === 'active'
                                                                ? 'bg-green-50 text-green-700'
                                                                : 'bg-slate-100 text-slate-500'
                                                        }
                                                    >
                                                        {head.status === 'active' ? t('Active') : t('Inactive')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEdit(head)}
                                                        >
                                                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                                            {t('Edit')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:bg-red-50"
                                                            onClick={() => remove(head)}
                                                        >
                                                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? t('Edit Head') : t('Add Head')}</DialogTitle>
                        <DialogDescription>
                            {isIncome
                                ? t('Enter the name of the income head.')
                                : t('Enter the name of the expense head.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{t('Head Name')}</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ name: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        submit();
                                    }
                                }}
                                placeholder={t('e.g. Tuition Fee')}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={submit} disabled={processing}>
                            {processing ? t('Saving...') : editing ? t('Update') : t('Add')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
