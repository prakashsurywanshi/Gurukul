import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Gift, Plus, Wallet } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

export type CommsWalletProps = {
    balances: { type: string; balance: number }[];
    perStaff: { staffName: string; staffRole: string; walletType: string; balance: number }[];
    ledger: {
        id: number;
        type: string;
        credits: number;
        transactionType: string;
        description: string | null;
        balanceAfter: number;
        staffName: string | null;
    }[];
    staffOptions: { id: number; name: string; role: string }[];
    summary: { totalBalance: number; lastTopup: number };
};

const WALLET_TYPES = [
    { key: 'whatsapp', label: 'WhatsApp', color: 'text-emerald-600' },
    { key: 'sms', label: 'SMS', color: 'text-blue-600' },
    { key: 'email', label: 'Email', color: 'text-indigo-600' },
    { key: 'notifications', label: 'Push', color: 'text-amber-600' },
];

function formatCredits(value: number): string {
    const formatted = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
    return `${formatted} ${value === 1 ? 'credit' : 'credits'}`;
}

export default function CommsWallet({ balances, perStaff, ledger, staffOptions, summary }: CommsWalletProps) {
    const { t } = useLanguage();

    const [walletType, setWalletType] = useState('whatsapp');
    const [credits, setCredits] = useState('');
    const [txType, setTxType] = useState('credit');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const [staffId, setStaffId] = useState('');
    const [staffWalletType, setStaffWalletType] = useState('whatsapp');
    const [staffCredits, setStaffCredits] = useState('');
    const [staffDescription, setStaffDescription] = useState('');
    const [giving, setGiving] = useState(false);

    const walletLabel = (type: string) => WALLET_TYPES.find((w) => w.key === type)?.label ?? type;

    const topup = () => {
        if (!credits || Number(credits) <= 0) {
            toast.error(t('Enter a positive credit amount.'));
            return;
        }
        setSaving(true);
        router.post(
            '/comms-wallet',
            { wallet_type: walletType, credits, transaction_type: txType, description: description.trim() || null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCredits('');
                    setDescription('');
                    toast.success(t('Wallet updated.'));
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const give = () => {
        if (!staffId || !staffCredits || Number(staffCredits) <= 0) {
            toast.error(t('Select staff and enter credits.'));
            return;
        }
        setGiving(true);
        router.post(
            '/comms-wallet/give',
            {
                staff_user_id: Number(staffId),
                wallet_type: staffWalletType,
                credits: staffCredits,
                description: staffDescription.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setStaffId('');
                    setStaffCredits('');
                    setStaffDescription('');
                    toast.success(t('Credits allocated to staff.'));
                },
                onFinish: () => setGiving(false),
            },
        );
    };

    return (
        <DashboardLayout pageTitle={t('Comms Wallet')}>
            <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Total Balance')}</p>
                                <p className="text-2xl font-bold">{formatCredits(summary.totalBalance)}</p>
                            </div>
                            <Wallet className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Last Top-up')}</p>
                                <p className="text-2xl font-bold">{formatCredits(summary.lastTopup)}</p>
                            </div>
                            <ArrowDownLeft className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Staff Allocations')}</p>
                                <p className="text-2xl font-bold">{perStaff.length}</p>
                            </div>
                            <Gift className="h-5 w-5" />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Wallet Balances')}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-3">
                                {balances.map((balance) => (
                                    <div
                                        key={balance.type}
                                        className="flex items-center justify-between rounded-lg border px-4 py-3"
                                    >
                                        <span className="font-medium">{walletLabel(balance.type)}</span>
                                        <span className="font-semibold">
                                            {balance.balance.toLocaleString()}{' '}
                                            {balance.balance === 1 ? t('credit') : t('credits')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 rounded-lg bg-muted/40 p-4">
                                <p className="text-sm text-muted-foreground">
                                    {t('Top up or deduct from the shared wallet. Deducting does not go below zero.')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Adjust Wallet')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-1">
                                <Label>{t('Wallet Type')}</Label>
                                <Select value={walletType} onValueChange={setWalletType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {WALLET_TYPES.map((wallet) => (
                                            <SelectItem key={wallet.key} value={wallet.key}>
                                                {wallet.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label>{t('Type')}</Label>
                                    <Select value={txType} onValueChange={setTxType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="credit">{t('Credit')}</SelectItem>
                                            <SelectItem value="debit">{t('Debit')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Credits')}</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={credits}
                                        onChange={(e) => setCredits(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Description')}</Label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={t('e.g. SMS winter promo batch')}
                                />
                            </div>
                            <Button onClick={topup} disabled={saving}>
                                {saving ? t('Saving...') : txType === 'credit' ? t('Add Credits') : t('Deduct Credits')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Allocate Credits to Staff')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-4">
                            <div className="space-y-1">
                                <Label>{t('Staff Member')}</Label>
                                <Select value={staffId} onValueChange={setStaffId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select staff')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staffOptions.map((staff) => (
                                            <SelectItem key={staff.id} value={String(staff.id)}>
                                                {staff.name} · {staff.role}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Wallet Type')}</Label>
                                <Select value={staffWalletType} onValueChange={setStaffWalletType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {WALLET_TYPES.map((wallet) => (
                                            <SelectItem key={wallet.key} value={wallet.key}>
                                                {wallet.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Credits')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={staffCredits}
                                    onChange={(e) => setStaffCredits(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Description')}</Label>
                                <Input
                                    value={staffDescription}
                                    onChange={(e) => setStaffDescription(e.target.value)}
                                    placeholder={t('e.g. Exam SMS allowance')}
                                />
                            </div>
                        </div>
                        <Button onClick={give} disabled={giving}>
                            <Plus className="mr-1 h-4 w-4" />
                            {giving ? t('Allocating...') : t('Allocate Credits')}
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Staff Allocations')}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {perStaff.length === 0 && (
                                <p className="py-8 text-center text-muted-foreground">
                                    {t('No staff allocations yet.')}
                                </p>
                            )}
                            <div className="space-y-3">
                                {perStaff.map((allocation, index) => (
                                    <div
                                        key={`${allocation.staffName}-${index}`}
                                        className="flex items-center justify-between rounded-lg border px-4 py-3"
                                    >
                                        <div>
                                            <p className="font-medium">{allocation.staffName}</p>
                                            <p className="text-xs text-muted-foreground">{allocation.staffRole}</p>
                                        </div>
                                        <Badge variant="secondary">{walletLabel(allocation.walletType)}</Badge>
                                        <span className="font-semibold">
                                            {allocation.balance.toLocaleString()}{' '}
                                            {allocation.balance === 1 ? t('credit') : t('credits')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Ledger')}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {ledger.length === 0 && (
                                <p className="py-8 text-center text-muted-foreground">{t('No wallet activity yet.')}</p>
                            )}
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Type')}</TableHead>
                                        <TableHead>{t('Transaction')}</TableHead>
                                        <TableHead>{t('Amount')}</TableHead>
                                        <TableHead className="text-right">{t('Balance')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ledger.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell>
                                                <Badge variant="outline">{walletLabel(entry.type)}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="flex items-center gap-1">
                                                    {entry.transactionType === 'credit' ? (
                                                        <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                                                    ) : (
                                                        <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
                                                    )}
                                                    {entry.transactionType === 'credit' ? t('Credit') : t('Debit')}
                                                </span>
                                                <span className="block text-xs text-muted-foreground">
                                                    {entry.description ?? '—'}
                                                    {entry.staffName ? ` · ${entry.staffName}` : ''}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {entry.credits.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {entry.balanceAfter.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
