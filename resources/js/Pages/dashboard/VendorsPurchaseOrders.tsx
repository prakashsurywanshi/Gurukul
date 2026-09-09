import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { Loader2, Pencil, Plus, ShoppingCart, Trash2, Truck, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface Vendor {
    id: string;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    gstin: string | null;
    address: string | null;
    category: string | null;
    status: string;
    notes: string | null;
    orders_count: number;
}

interface OrderItem {
    id: string;
    item_name: string;
    unit: string | null;
    quantity: number;
    unit_price: string;
    amount: string;
}

interface Order {
    id: string;
    po_number: string;
    vendor: string;
    vendor_id: string;
    order_date: string | null;
    expected_delivery: string | null;
    total_amount: string;
    status: string;
    notes: string | null;
    items: OrderItem[];
}

interface NextPoNumbers {
    draft: string;
    submitted: string;
}

interface VendorsPurchaseOrdersProps {
    user: any;
    vendors: Vendor[];
    orders: Order[];
    nextPoNumbers: NextPoNumbers;
    metrics: { vendors: number; orders: number; pending: number };
}

const ORDER_STATUSES = ['draft', 'submitted', 'approved', 'received', 'cancelled'];

const statusColor: Record<string, string> = {
    draft: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    received: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

function money(n: string): string {
    const num = parseFloat(n) || 0;
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function VendorsPurchaseOrders(pageProps: VendorsPurchaseOrdersProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;
    const user = pageProps.user;
    const vendors = pageProps.vendors ?? [];
    const orders = pageProps.orders ?? [];
    const nextPoNumbers = pageProps.nextPoNumbers ?? {
        draft: 'PO-' + new Date().getFullYear() + '-0001',
        submitted: 'PO-' + new Date().getFullYear() + '-0001',
    };
    const metrics = pageProps.metrics ?? { vendors: 0, orders: 0, pending: 0 };

    const [tab, setTab] = useState<'orders' | 'vendors'>('orders');
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [vendorForm, setVendorForm] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        gstin: '',
        category: '',
        address: '',
        notes: '',
        status: 'active',
    });
    const [orderForm, setOrderForm] = useState({
        po_number: nextPoNumbers.draft,
        vendor_id: '',
        order_date: '',
        expected_delivery: '',
        status: 'draft',
        notes: '',
    });
    const [items, setItems] = useState([{ item_name: '', unit: '', quantity: '1', unit_price: '' }]);

    const resetVendorForm = () =>
        setVendorForm({
            name: '',
            contact_person: '',
            phone: '',
            email: '',
            gstin: '',
            category: '',
            address: '',
            notes: '',
            status: 'active',
        });
    const resetOrderForm = () => {
        setOrderForm({
            po_number: nextPoNumbers.draft,
            vendor_id: '',
            order_date: '',
            expected_delivery: '',
            status: 'draft',
            notes: '',
        });
        setItems([{ item_name: '', unit: '', quantity: '1', unit_price: '' }]);
    };

    const submitVendor = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        router.post('/purchase-orders/vendors', vendorForm, {
            preserveScroll: true,
            onSuccess: () => {
                setShowVendorModal(false);
                resetVendorForm();
            },
            onFinish: () => setSaving(false),
        });
    };

    const submitOrder = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        router.post(
            '/purchase-orders/store',
            {
                ...orderForm,
                items: items.map((item) => ({
                    item_name: item.item_name,
                    unit: item.unit || undefined,
                    quantity: Number(item.quantity || 0),
                    unit_price: Number(item.unit_price || 0),
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowOrderModal(false);
                    resetOrderForm();
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const setOrderStatus = (order: Order, status: string) => {
        router.patch(`/purchase-orders/${order.id}/status`, { status }, { preserveScroll: true });
    };

    const removeOrder = (order: Order) => {
        if (!window.confirm(t('Delete this purchase order?'))) return;
        router.delete(`/purchase-orders/${order.id}`, { preserveScroll: true });
    };

    const removeVendor = (vendor: Vendor) => {
        if (!window.confirm(t('Delete this vendor?'))) return;
        setDeletingId(vendor.id);
        router.delete(`/purchase-orders/vendors/${vendor.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const updateItem = (index: number, key: keyof (typeof items)[0], value: string) => {
        setItems((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
    };

    const addItem = () =>
        setItems((current) => [...current, { item_name: '', unit: '', quantity: '1', unit_price: '' }]);
    const removeItem = (index: number) =>
        setItems((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));

    const itemTotal = (item: (typeof items)[0]) =>
        (Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2);
    const orderTotal = items.reduce((sum, item) => sum + Number(itemTotal(item) || 0), 0);

    const label = (s: string) => t(s.charAt(0).toUpperCase() + s.slice(1));

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Vendors & Purchase Orders')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Manage suppliers and procurement orders.')}
                        </p>
                    </div>
                    {tab === 'vendors' ? (
                        <Button
                            onClick={() => {
                                resetVendorForm();
                                setShowVendorModal(true);
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Add Vendor')}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => {
                                resetOrderForm();
                                setShowOrderModal(true);
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {t('New Purchase Order')}
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{metrics.vendors}</div>
                            <div className="text-sm text-gray-500">{t('Active Vendors')}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-3xl font-bold text-gray-700 dark:text-gray-200">{metrics.orders}</div>
                            <div className="text-sm text-gray-500">{t('Total Orders')}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                ₹{Number(metrics.pending).toLocaleString('en-IN')}
                            </div>
                            <div className="text-sm text-gray-500">{t('Pending Value')}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant={tab === 'orders' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTab('orders')}
                    >
                        <ShoppingCart className="mr-1.5 h-4 w-4" />
                        {t('Orders')}
                    </Button>
                    <Button
                        variant={tab === 'vendors' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTab('vendors')}
                    >
                        <Truck className="mr-1.5 h-4 w-4" />
                        {t('Vendors')}
                    </Button>
                </div>

                {tab === 'orders' ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Purchase Orders')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {orders.length === 0 ? (
                                <div className="py-10 text-center text-sm text-gray-400">
                                    {t('No purchase orders yet.')}
                                </div>
                            ) : (
                                orders.map((order) => (
                                    <div key={order.id} className="rounded-xl border p-4 dark:border-gray-800">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {order.po_number}
                                            </span>
                                            <span className="text-sm text-gray-500">{order.vendor}</span>
                                            <Badge className={statusColor[order.status]}>{label(order.status)}</Badge>
                                            <span className="ml-auto text-lg font-bold text-gray-900 dark:text-white">
                                                {money(order.total_amount)}
                                            </span>
                                            <div className="flex gap-2">
                                                {order.status === 'draft' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7"
                                                        onClick={() => setOrderStatus(order, 'submitted')}
                                                    >
                                                        {t('Submit')}
                                                    </Button>
                                                )}
                                                {order.status === 'submitted' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-emerald-600"
                                                        onClick={() => setOrderStatus(order, 'approved')}
                                                    >
                                                        {t('Approve')}
                                                    </Button>
                                                )}
                                                {order.status === 'approved' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-green-600"
                                                        onClick={() => setOrderStatus(order, 'received')}
                                                    >
                                                        {t('Receive')}
                                                    </Button>
                                                )}
                                                {(order.status === 'draft' || order.status === 'submitted') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-red-500"
                                                        onClick={() => setOrderStatus(order, 'cancelled')}
                                                    >
                                                        {t('Cancel')}
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-red-500"
                                                    onClick={() => removeOrder(order)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mt-3 overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-400">
                                                        <th className="py-1.5 pr-2">{t('Item')}</th>
                                                        <th className="py-1.5 pr-2">{t('Qty')}</th>
                                                        <th className="py-1.5 pr-2">{t('Unit Price')}</th>
                                                        <th className="py-1.5 text-right">{t('Amount')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {order.items.map((item) => (
                                                        <tr
                                                            key={item.id}
                                                            className="border-b last:border-0 dark:border-gray-800"
                                                        >
                                                            <td className="py-2 pr-2">{item.item_name}</td>
                                                            <td className="py-2 pr-2">
                                                                {item.quantity}
                                                                {item.unit ? ` ${item.unit}` : ''}
                                                            </td>
                                                            <td className="py-2 pr-2">{money(item.unit_price)}</td>
                                                            <td className="py-2 text-right font-medium">
                                                                {money(item.amount)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {order.notes && <div className="mt-2 text-xs text-gray-500">{order.notes}</div>}
                                        <div className="mt-2 flex gap-3 text-xs text-gray-400">
                                            <span>
                                                {t('Order Date')}: {order.order_date ?? '—'}
                                            </span>
                                            <span>
                                                {t('Expected Delivery')}: {order.expected_delivery ?? '—'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Vendors')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {vendors.length === 0 ? (
                                <div className="py-10 text-center text-sm text-gray-400">
                                    {t('No vendors added yet.')}
                                </div>
                            ) : (
                                vendors.map((vendor) => (
                                    <div
                                        key={vendor.id}
                                        className="flex flex-wrap items-center gap-3 rounded-xl border p-4 dark:border-gray-800"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-lg font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                            {vendor.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                {vendor.name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {[vendor.category, vendor.gstin && `GST: ${vendor.gstin}`, vendor.phone]
                                                    .filter(Boolean)
                                                    .join(' · ') || '—'}
                                            </div>
                                        </div>
                                        <Badge
                                            className={
                                                vendor.status === 'active'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                    : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                            }
                                        >
                                            {label(vendor.status)}
                                        </Badge>
                                        <span className="text-xs text-gray-400">
                                            {vendor.orders_count} {t('orders')}
                                        </span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-red-500"
                                            onClick={() => removeVendor(vendor)}
                                            disabled={deletingId === vendor.id}
                                        >
                                            {deletingId === vendor.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {showVendorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Add Vendor')}</h3>
                            <button
                                type="button"
                                onClick={() => setShowVendorModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submitVendor} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Vendor Name')} *</Label>
                                    <Input
                                        value={vendorForm.name}
                                        onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>{t('Contact Person')}</Label>
                                    <Input
                                        value={vendorForm.contact_person}
                                        onChange={(e) =>
                                            setVendorForm({ ...vendorForm, contact_person: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Phone')}</Label>
                                    <Input
                                        value={vendorForm.phone}
                                        onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>{t('Email')}</Label>
                                    <Input
                                        type="email"
                                        value={vendorForm.email}
                                        onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('GSTIN')}</Label>
                                    <Input
                                        value={vendorForm.gstin}
                                        onChange={(e) => setVendorForm({ ...vendorForm, gstin: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>{t('Category')}</Label>
                                    <Input
                                        placeholder="e.g. Stationery, Lab, Furniture"
                                        value={vendorForm.category}
                                        onChange={(e) => setVendorForm({ ...vendorForm, category: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('Address')}</Label>
                                <Textarea
                                    rows={2}
                                    value={vendorForm.address}
                                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>{t('Notes')}</Label>
                                <Textarea
                                    rows={2}
                                    value={vendorForm.notes}
                                    onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowVendorModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('Save Vendor')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showOrderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('New Purchase Order')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowOrderModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submitOrder} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('PO Number')} *</Label>
                                    <Input
                                        value={orderForm.po_number}
                                        onChange={(e) => setOrderForm({ ...orderForm, po_number: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>{t('Vendor')} *</Label>
                                    <Select
                                        value={orderForm.vendor_id}
                                        onValueChange={(v) => setOrderForm({ ...orderForm, vendor_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select vendor')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vendors.map((vendor) => (
                                                <SelectItem key={vendor.id} value={vendor.id}>
                                                    {vendor.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <Label>{t('Order Date')}</Label>
                                    <Input
                                        type="date"
                                        value={orderForm.order_date}
                                        onChange={(e) => setOrderForm({ ...orderForm, order_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>{t('Expected Delivery')}</Label>
                                    <Input
                                        type="date"
                                        value={orderForm.expected_delivery}
                                        onChange={(e) =>
                                            setOrderForm({ ...orderForm, expected_delivery: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>{t('Status')}</Label>
                                    <Select
                                        value={orderForm.status}
                                        onValueChange={(v) => setOrderForm({ ...orderForm, status: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ORDER_STATUSES.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {label(status)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>{t('Line Items')}</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        {t('Add Item')}
                                    </Button>
                                </div>
                                {items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-wrap items-end gap-2 rounded-lg border p-2 dark:border-gray-800"
                                    >
                                        <div className="min-w-[130px] flex-1">
                                            <Label className="text-xs">{t('Item')}</Label>
                                            <Input
                                                value={item.item_name}
                                                onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-20">
                                            <Label className="text-xs">{t('Unit')}</Label>
                                            <Input
                                                value={item.unit}
                                                onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-20">
                                            <Label className="text-xs">{t('Qty')}</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-28">
                                            <Label className="text-xs">{t('Unit Price')}</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-24 pb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                            {money(itemTotal(item))}
                                        </div>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-red-500"
                                            onClick={() => removeItem(index)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                <div className="text-right text-lg font-bold text-gray-900 dark:text-white">
                                    Total: {money(orderTotal.toFixed(2))}
                                </div>
                            </div>

                            <div>
                                <Label>{t('Notes')}</Label>
                                <Textarea
                                    rows={2}
                                    value={orderForm.notes}
                                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowOrderModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('Save Order')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
