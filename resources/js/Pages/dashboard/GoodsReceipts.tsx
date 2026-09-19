import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { PackageCheck, Plus, Trash2, Truck, X } from 'lucide-react';
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

type ReceiptItem = {
    inventory_item_id: number;
    item_name: string;
    unit: string | null;
    quantity: number;
    unit_price: number;
};

type ItemOption = { id: number; name: string; unit: string | null; availableStock: number };
type SupplierOption = { id: number; name: string };
type OrderOption = { id: number; po_number: string };

type ReceiptRecord = {
    id: number;
    grnNumber: string;
    receiptDate: string;
    supplierName: string | null;
    totalAmount: number;
    notes: string | null;
    receivedByName: string | null;
    items: { itemName: string; unit: string | null; unitPrice: number; quantity: number; amount: number }[];
};

type Props = {
    user: any;
    receipts: ReceiptRecord[];
    itemOptions: ItemOption[];
    supplierOptions: SupplierOption[];
    orderOptions: OrderOption[];
    summary: { receiptsCount: number; monthTotal: number };
};

export default function GoodsReceipts({ user, receipts, itemOptions, supplierOptions, orderOptions, summary }: Props) {
    const { t } = useLanguage();
    const [supplierId, setSupplierId] = useState<string>('');
    const [orderId, setOrderId] = useState<string>('');
    const [receiptDate, setReceiptDate] = useState('');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState<ReceiptItem[]>([]);
    const [saving, setSaving] = useState(false);

    const addLine = (itemId: string) => {
        const item = itemOptions.find((i) => i.id === Number(itemId));
        if (!item) return;
        if (lines.some((line) => line.inventory_item_id === item.id)) {
            toast.error(t('Item already added to the receipt.'));
            return;
        }
        setLines((prev) => [
            ...prev,
            { inventory_item_id: item.id, item_name: item.name, unit: item.unit, quantity: 1, unit_price: 0 },
        ]);
    };

    const updateLine = (itemId: number, patch: Partial<ReceiptItem>) =>
        setLines((prev) => prev.map((line) => (line.inventory_item_id === itemId ? { ...line, ...patch } : line)));

    const removeLine = (itemId: number) => setLines((prev) => prev.filter((line) => line.inventory_item_id !== itemId));

    const totalAmount = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);

    const submit = () => {
        if (lines.length === 0) {
            toast.error(t('Add at least one item.'));
            return;
        }
        setSaving(true);
        router.post(
            '/store/goods-receipts',
            {
                inventory_supplier_id: supplierId ? Number(supplierId) : null,
                purchase_order_id: orderId ? Number(orderId) : null,
                receipt_date: receiptDate || null,
                notes: notes || null,
                items: lines.map((line) => ({
                    inventory_item_id: line.inventory_item_id,
                    quantity: line.quantity,
                    unit_price: line.unit_price,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setLines([]);
                    setSupplierId('');
                    setOrderId('');
                    setReceiptDate('');
                    setNotes('');
                    toast.success(t('Goods receipt recorded.'));
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const remove = (id: number) => {
        if (!window.confirm(t('Delete this receipt and revert stock?'))) return;
        router.delete(`/store/goods-receipts/${id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Receipt deleted.')),
        });
    };

    return (
        <DashboardLayout user={user} pageTitle={t('Goods Receipts')}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Total Receipts')}</p>
                                <p className="text-2xl font-bold">{summary.receiptsCount}</p>
                            </div>
                            <PackageCheck className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('This Month')}</p>
                                <p className="text-2xl font-bold">₹{summary.monthTotal.toFixed(2)}</p>
                            </div>
                            <Truck className="h-5 w-5" />
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Record Goods Receipt')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1">
                                <Label>{t('Supplier')}</Label>
                                <Select value={supplierId} onValueChange={setSupplierId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select supplier')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {supplierOptions.map((supplier) => (
                                            <SelectItem key={supplier.id} value={String(supplier.id)}>
                                                {supplier.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Purchase Order')}</Label>
                                <Select value={orderId} onValueChange={setOrderId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Optional')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {orderOptions.map((order) => (
                                            <SelectItem key={order.id} value={String(order.id)}>
                                                {order.po_number}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Receipt Date')}</Label>
                                <Input
                                    type="date"
                                    value={receiptDate}
                                    onChange={(e) => setReceiptDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>{t('Add Item')}</Label>
                            <div className="flex gap-2">
                                <Select onValueChange={addLine} value={undefined}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={t('Choose inventory item...')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {itemOptions.map((item) => (
                                            <SelectItem key={item.id} value={String(item.id)}>
                                                {item.name} ({t('Stock')}: {item.availableStock})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {lines.length > 0 && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Item')}</TableHead>
                                        <TableHead>{t('Unit')}</TableHead>
                                        <TableHead className="w-28">{t('Quantity')}</TableHead>
                                        <TableHead className="w-36">{t('Unit Price')}</TableHead>
                                        <TableHead className="text-right">{t('Amount')}</TableHead>
                                        <TableHead className="w-10" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lines.map((line) => (
                                        <TableRow key={line.inventory_item_id}>
                                            <TableCell>{line.item_name}</TableCell>
                                            <TableCell>{line.unit ?? '—'}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={line.quantity}
                                                    onChange={(e) =>
                                                        updateLine(line.inventory_item_id, {
                                                            quantity: parseInt(e.target.value, 10) || 1,
                                                        })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={line.unit_price}
                                                    onChange={(e) =>
                                                        updateLine(line.inventory_item_id, {
                                                            unit_price: parseFloat(e.target.value) || 0,
                                                        })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                ₹{(line.quantity * line.unit_price).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => removeLine(line.inventory_item_id)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm">
                                <span className="text-muted-foreground">{t('Total')}: </span>
                                <span className="font-bold">₹{totalAmount.toFixed(2)}</span>
                            </p>
                            <Button onClick={submit} disabled={saving || lines.length === 0}>
                                <Plus className="mr-2 h-4 w-4" />
                                {saving ? t('Saving...') : t('Record Receipt')}
                            </Button>
                        </div>

                        <div className="space-y-1">
                            <Label>{t('Notes')}</Label>
                            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Receipt History')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {receipts.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">{t('No receipts recorded yet.')}</p>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('GRN')}</TableHead>
                                    <TableHead>{t('Date')}</TableHead>
                                    <TableHead>{t('Supplier')}</TableHead>
                                    <TableHead>{t('Items')}</TableHead>
                                    <TableHead className="text-right">{t('Total')}</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receipts.map((receipt) => (
                                    <TableRow key={receipt.id}>
                                        <TableCell className="font-medium">{receipt.grnNumber}</TableCell>
                                        <TableCell>{receipt.receiptDate}</TableCell>
                                        <TableCell>{receipt.supplierName ?? t('General')}</TableCell>
                                        <TableCell>{receipt.items.reduce((sum, it) => sum + it.quantity, 0)}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            ₹{receipt.totalAmount.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Button size="icon" variant="ghost" onClick={() => remove(receipt.id)}>
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
