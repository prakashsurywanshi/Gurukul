import { useLanguage } from '../../i18n/LanguageProvider';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
    Banknote,
    CreditCard,
    Percent,
    Plus,
    ReceiptText,
    Search,
    ShoppingBag,
    Store,
    Trash2,
    TrendingUp,
    Wallet,
    X,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

type CatalogItem = {
    id: number;
    name: string;
    unit: string | null;
    unitPrice: number;
    availableStock: number;
    minimumStock: number;
    store: string | null;
    supplier: string | null;
    lowStock: boolean;
};

type SaleItemRow = {
    id: number;
    name: string;
    quantity: number;
    unitPrice: number;
};

type SaleRecord = {
    id: number;
    invoiceNo: string;
    saleDate: string;
    customerName: string | null;
    customerPhone: string | null;
    subtotal: number;
    discount: number;
    tax: number;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    cashier: string | null;
    notes: string | null;
    items: {
        itemName: string;
        unit: string | null;
        unitPrice: number;
        quantity: number;
        amount: number;
    }[];
};

type Props = {
    user: any;
    catalog: CatalogItem[];
    sales: SaleRecord[];
    filters: { search: string; from: string | null; to: string | null };
    summary: { today: number; total: number; salesCount: number; lowStock: number };
};

export default function PointOfSale({ user, catalog, sales, filters, summary }: Props) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('pos');
    const [lines, setLines] = useState<SaleItemRow[]>([]);
    const [search, setSearch] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [discount, setDiscount] = useState('0');
    const [tax, setTax] = useState('0');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (activeTab === 'pos') setSearch('');
    }, [activeTab]);

    const matches = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return catalog.slice(0, 40);
        return catalog.filter((i) => i.name.toLowerCase().includes(term)).slice(0, 40);
    }, [catalog, search]);

    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const discountValue = parseFloat(discount) || 0;
    const taxValue = parseFloat(tax) || 0;
    const total = subtotal - discountValue + taxValue;

    const addLine = (item: CatalogItem) => {
        setLines((prev) => {
            const existing = prev.find((line) => line.id === item.id);
            if (existing) {
                return prev.map((line) =>
                    line.id === item.id
                        ? { ...line, quantity: Math.min(line.quantity + 1, item.availableStock) }
                        : line,
                );
            }
            return [...prev, { id: item.id, name: item.name, quantity: 1, unitPrice: item.unitPrice }];
        });
    };

    const updateQuantity = (id: number, quantity: number) => {
        const item = catalog.find((i) => i.id === id);
        setLines((prev) =>
            prev.map((line) =>
                line.id === id
                    ? { ...line, quantity: Math.max(1, Math.min(quantity, item?.availableStock ?? quantity)) }
                    : line,
            ),
        );
    };

    const removeLine = (id: number) => setLines((prev) => prev.filter((line) => line.id !== id));

    const submitSale = () => {
        if (lines.length === 0) {
            toast.error(t('Add at least one item to the cart.'));
            return;
        }
        setSaving(true);
        const payload = {
            customer_name: customerName || null,
            customer_phone: customerPhone || null,
            discount: discountValue,
            tax: taxValue,
            payment_method: paymentMethod,
            payment_status: 'paid',
            notes: notes || null,
            items: lines.map((line) => ({ id: line.id, quantity: line.quantity })),
        };
        router.post('/store/sales', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setLines([]);
                setCustomerName('');
                setCustomerPhone('');
                setDiscount('0');
                setTax('0');
                setNotes('');
                toast.success(t('Sale recorded.'));
            },
            onFinish: () => setSaving(false),
        });
    };

    const deleteSale = (sale: SaleRecord) => {
        if (!window.confirm(t('Delete this sale and restore stock?'))) return;
        router.delete(`/store/sales/${sale.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Sale deleted.')),
        });
    };

    const statCards: { label: string; value: string; icon: ReactNode }[] = [
        {
            label: t('Today Sales'),
            value: `₹${summary.today.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            icon: <TrendingUp className="h-4 w-4" />,
        },
        {
            label: t('Total Sales'),
            value: `₹${summary.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            icon: <ReceiptText className="h-4 w-4" />,
        },
        { label: t('Invoices'), value: String(summary.salesCount), icon: <ShoppingBag className="h-4 w-4" /> },
        { label: t('Low Stock Items'), value: String(summary.lowStock), icon: <Store className="h-4 w-4" /> },
    ];

    return (
        <DashboardLayout user={user} pageTitle={t('Point of Sale')}>
            <div className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="pos">{t('New Sale')}</TabsTrigger>
                        <TabsTrigger value="sales">{t('Sales History')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pos" className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {statCards.map((card) => (
                                <Card key={card.label}>
                                    <CardContent className="flex items-center justify-between pt-6">
                                        <div>
                                            <p className="text-sm text-muted-foreground">{card.label}</p>
                                            <p className="text-2xl font-bold">{card.value}</p>
                                        </div>
                                        {card.icon}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('Product Search')}</CardTitle>
                                        <CardDescription>
                                            {t('Search the inventory catalogue to add items.')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder={t('Search products...')}
                                                className="pl-9"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            {matches.length === 0 && (
                                                <p className="col-span-full py-6 text-center text-muted-foreground">
                                                    {t('No products match your search.')}
                                                </p>
                                            )}
                                            {matches.map((item) => {
                                                const inCart = lines.find((line) => line.id === item.id);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between rounded-lg border p-3"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium">{item.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {t('Stock')}: {item.availableStock} {item.unit ?? ''} ·
                                                                ₹{item.unitPrice.toFixed(2)}
                                                            </p>
                                                            {item.lowStock && (
                                                                <Badge variant="secondary" className="mt-1">
                                                                    {t('Low Stock')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => addLine(item)}
                                                            disabled={item.availableStock <= 0}
                                                        >
                                                            <Plus className="mr-1 h-4 w-4" />
                                                            {inCart ? `${inCart.quantity}` : t('Add')}
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('Cart')}</CardTitle>
                                        <CardDescription>{t('Review items before checkout.')}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {lines.length === 0 && (
                                            <p className="py-6 text-center text-sm text-muted-foreground">
                                                {t('Your cart is empty. Add products to start a sale.')}
                                            </p>
                                        )}
                                        {lines.map((line) => (
                                            <div key={line.id} className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{line.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        ₹{line.unitPrice.toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={line.quantity}
                                                        onChange={(e) =>
                                                            updateQuantity(line.id, parseInt(e.target.value, 10) || 1)
                                                        }
                                                        className="h-8 w-16"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => removeLine(line.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="space-y-1 border-t pt-3 text-sm">
                                            <div className="flex justify-between">
                                                <span>{t('Subtotal')}</span>
                                                <span>₹{subtotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1">
                                                    <Percent className="h-3 w-3" /> {t('Discount')}
                                                </span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={discount}
                                                    onChange={(e) => setDiscount(e.target.value)}
                                                    className="h-8 w-24 text-right"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1">
                                                    <Percent className="h-3 w-3" /> {t('Tax')}
                                                </span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={tax}
                                                    onChange={(e) => setTax(e.target.value)}
                                                    className="h-8 w-24 text-right"
                                                />
                                            </div>
                                            <div className="flex justify-between text-base font-bold">
                                                <span>{t('Total')}</span>
                                                <span>₹{total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('Checkout')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="space-y-1">
                                            <Label>{t('Customer Name')}</Label>
                                            <Input
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder={t('Walk-in customer')}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>{t('Customer Phone')}</Label>
                                            <Input
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="+91"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>{t('Payment Method')}</Label>
                                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cash">Cash</SelectItem>
                                                    <SelectItem value="card">Card</SelectItem>
                                                    <SelectItem value="upi">UPI</SelectItem>
                                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label>{t('Notes')}</Label>
                                            <Textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                rows={2}
                                            />
                                        </div>
                                        <Button
                                            className="w-full"
                                            onClick={submitSale}
                                            disabled={saving || lines.length === 0}
                                        >
                                            <Wallet className="mr-2 h-4 w-4" />
                                            {saving ? t('Saving...') : `${t('Checkout')} · ₹${total.toFixed(2)}`}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="sales" className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                            <Input
                                value={filters.search}
                                onChange={(e) =>
                                    router.get(
                                        '/store/pos',
                                        { search: e.target.value },
                                        { preserveState: true, replace: true },
                                    )
                                }
                                placeholder={t('Search invoice or customer...')}
                            />
                            <Input
                                type="date"
                                value={filters.from ?? ''}
                                onChange={(e) =>
                                    router.get(
                                        '/store/pos',
                                        { ...filters, from: e.target.value },
                                        { preserveState: true, replace: true },
                                    )
                                }
                                placeholder={t('From date')}
                            />
                            <Input
                                type="date"
                                value={filters.to ?? ''}
                                onChange={(e) =>
                                    router.get(
                                        '/store/pos',
                                        { ...filters, to: e.target.value },
                                        { preserveState: true, replace: true },
                                    )
                                }
                                placeholder={t('To date')}
                            />
                        </div>
                        <Card>
                            <CardContent className="pt-6">
                                {sales.length === 0 && (
                                    <p className="py-8 text-center text-muted-foreground">{t('No sales found.')}</p>
                                )}
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Invoice')}</TableHead>
                                            <TableHead>{t('Date')}</TableHead>
                                            <TableHead>{t('Customer')}</TableHead>
                                            <TableHead>{t('Items')}</TableHead>
                                            <TableHead>{t('Payment')}</TableHead>
                                            <TableHead className="text-right">{t('Total')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sales.map((sale) => (
                                            <TableRow key={sale.id}>
                                                <TableCell className="font-medium">{sale.invoiceNo}</TableCell>
                                                <TableCell>{sale.saleDate}</TableCell>
                                                <TableCell>{sale.customerName ?? t('Walk-in')}</TableCell>
                                                <TableCell>
                                                    {sale.items.reduce((sum, it) => sum + it.quantity, 0)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{sale.paymentMethod}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    ₹{sale.totalAmount.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => deleteSale(sale)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
