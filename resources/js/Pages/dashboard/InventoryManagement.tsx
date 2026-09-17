import { useLanguage } from '../../i18n/LanguageProvider';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
    Boxes,
    ClipboardList,
    Pencil,
    PackagePlus,
    PackageSearch,
    RotateCcw,
    ReceiptText,
    Search,
    Store,
    Tags,
    Trash2,
    Truck,
    X,
} from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
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

type User = {
    name?: string;
    email?: string;
    role?: string;
};

type InventoryCategory = {
    id: string;
    name: string;
    description: string;
};

type InventoryStore = {
    id: string;
    name: string;
    manager: string;
    location: string;
};

type InventorySupplier = {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
};

type InventoryItem = {
    id: string;
    name: string;
    categoryId: string;
    category: string;
    storeId: string;
    store: string;
    supplierId: string;
    supplier: string;
    unit: string;
    availableStock: number;
    minimumStock: number;
};

type StockEntry = {
    id: string;
    itemId: string;
    itemName: string;
    supplierId: string;
    supplier: string;
    storeId: string;
    store: string;
    quantity: number;
    unitPrice: number;
    date: string;
};

type IssueRecord = {
    id: string;
    itemId: string;
    itemName: string;
    issuedTo: string;
    quantity: number;
    issueDate: string;
    returnDate: string;
    status: 'Issued' | 'Returned';
};

interface InventoryManagementProps {
    user: User;
    categories?: InventoryCategory[];
    stores?: InventoryStore[];
    suppliers?: InventorySupplier[];
    items?: InventoryItem[];
    stockEntries?: StockEntry[];
    issueRecords?: IssueRecord[];
}

const today = new Date().toISOString().split('T')[0];
const defaultCategoryForm = { name: '', description: '' };
const defaultStoreForm = { name: '', manager: '', location: '' };
const defaultSupplierForm = {
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
};
const defaultItemForm = {
    name: '',
    categoryId: '',
    storeId: '',
    supplierId: '',
    unit: 'pcs',
    availableStock: '0',
    minimumStock: '0',
};
const defaultStockForm = {
    itemId: '',
    supplierId: '',
    storeId: '',
    quantity: '',
    unitPrice: '',
    date: today,
};
const defaultIssueForm = {
    itemId: '',
    issuedTo: '',
    quantity: '',
    issueDate: today,
    returnDate: '',
};
const defaultInventoryTab = 'issue-item';

export default function InventoryManagement({
    user,
    categories: initialCategories = [],
    stores: initialStores = [],
    suppliers: initialSuppliers = [],
    items: initialItems = [],
    stockEntries: initialStockEntries = [],
    issueRecords: initialIssueRecords = [],
}: InventoryManagementProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [categories, setCategories] = useState(initialCategories);
    const [stores, setStores] = useState(initialStores);
    const [suppliers, setSuppliers] = useState(initialSuppliers);
    const [items, setItems] = useState(initialItems);
    const [stockEntries, setStockEntries] = useState(initialStockEntries);
    const [issueRecords, setIssueRecords] = useState(initialIssueRecords);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState(defaultInventoryTab);

    const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);
    const [storeForm, setStoreForm] = useState(defaultStoreForm);
    const [supplierForm, setSupplierForm] = useState(defaultSupplierForm);
    const [itemForm, setItemForm] = useState(defaultItemForm);
    const [stockForm, setStockForm] = useState(defaultStockForm);
    const [issueForm, setIssueForm] = useState(defaultIssueForm);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
    const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingStockId, setEditingStockId] = useState<string | null>(null);
    const [editingIssueId, setEditingIssueId] = useState<string | null>(null);

    const filteredItems = useMemo(() => {
        const search = searchQuery.trim().toLowerCase();

        if (!search) {
            return items;
        }

        return items.filter((item) =>
            [item.name, item.category, item.store, item.supplier].some((value) => value.toLowerCase().includes(search)),
        );
    }, [items, searchQuery]);

    const totalStock = useMemo(() => items.reduce((sum, item) => sum + item.availableStock, 0), [items]);

    const lowStockItems = useMemo(() => items.filter((item) => item.availableStock <= item.minimumStock), [items]);

    const activeIssues = useMemo(() => issueRecords.filter((record) => record.status === 'Issued'), [issueRecords]);

    const totalInventoryValue = useMemo(
        () => stockEntries.reduce((sum, entry) => sum + entry.quantity * entry.unitPrice, 0),
        [stockEntries],
    );

    useEffect(() => {
        setCategories(initialCategories);
    }, [initialCategories]);

    useEffect(() => {
        setStores(initialStores);
    }, [initialStores]);

    useEffect(() => {
        setSuppliers(initialSuppliers);
    }, [initialSuppliers]);

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    useEffect(() => {
        setStockEntries(initialStockEntries);
    }, [initialStockEntries]);

    useEffect(() => {
        setIssueRecords(initialIssueRecords);
    }, [initialIssueRecords]);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const resetCategoryForm = () => {
        setCategoryForm(defaultCategoryForm);
        setEditingCategoryId(null);
        setActiveTab('category');
    };

    const resetStoreForm = () => {
        setStoreForm(defaultStoreForm);
        setEditingStoreId(null);
        setActiveTab('store');
    };

    const resetSupplierForm = () => {
        setSupplierForm(defaultSupplierForm);
        setEditingSupplierId(null);
        setActiveTab('supplier');
    };

    const resetItemForm = () => {
        setItemForm(defaultItemForm);
        setEditingItemId(null);
        setActiveTab('add-item');
    };

    const resetStockForm = () => {
        setStockForm(defaultStockForm);
        setEditingStockId(null);
        setActiveTab('add-stock');
    };

    const resetIssueForm = () => {
        setIssueForm(defaultIssueForm);
        setEditingIssueId(null);
        setActiveTab('issue-item');
    };

    const addCategory = () => {
        if (!categoryForm.name.trim()) {
            toast.error('Category name is required.');
            return;
        }

        const payload = {
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim(),
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                resetCategoryForm();
            },
        };

        if (editingCategoryId) {
            router.patch(`/inventory/categories/${editingCategoryId}`, payload, options);
            return;
        }

        router.post('/inventory/categories', payload, options);
    };

    const addStore = () => {
        if (!storeForm.name.trim() || !storeForm.manager.trim()) {
            toast.error('Store name and manager are required.');
            return;
        }

        const payload = {
            name: storeForm.name.trim(),
            manager: storeForm.manager.trim(),
            location: storeForm.location.trim(),
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                resetStoreForm();
            },
        };

        if (editingStoreId) {
            router.patch(`/inventory/stores/${editingStoreId}`, payload, options);
            return;
        }

        router.post('/inventory/stores', payload, options);
    };

    const addSupplier = () => {
        if (!supplierForm.name.trim() || !supplierForm.contactPerson.trim()) {
            toast.error('Supplier name and contact person are required.');
            return;
        }

        const payload = {
            name: supplierForm.name.trim(),
            contactPerson: supplierForm.contactPerson.trim(),
            phone: supplierForm.phone.trim(),
            email: supplierForm.email.trim(),
            address: supplierForm.address.trim(),
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                resetSupplierForm();
            },
        };

        if (editingSupplierId) {
            router.patch(`/inventory/suppliers/${editingSupplierId}`, payload, options);
            return;
        }

        router.post('/inventory/suppliers', payload, options);
    };

    const addItem = () => {
        if (!itemForm.name.trim() || !itemForm.categoryId || !itemForm.storeId || !itemForm.supplierId) {
            toast.error('Fill item name, category, store, and supplier.');
            return;
        }

        const payload = {
            name: itemForm.name.trim(),
            categoryId: itemForm.categoryId,
            storeId: itemForm.storeId,
            supplierId: itemForm.supplierId,
            unit: itemForm.unit.trim(),
            availableStock: Number(itemForm.availableStock) || 0,
            minimumStock: Number(itemForm.minimumStock) || 0,
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                resetItemForm();
            },
        };

        if (editingItemId) {
            router.patch(`/inventory/items/${editingItemId}`, payload, options);
            return;
        }

        router.post('/inventory/items', payload, options);
    };

    const addStock = () => {
        if (!stockForm.itemId || !stockForm.storeId || !stockForm.supplierId || !stockForm.quantity) {
            toast.error('Select item, supplier, store, and quantity.');
            return;
        }

        const payload = {
            itemId: stockForm.itemId,
            supplierId: stockForm.supplierId,
            storeId: stockForm.storeId,
            quantity: Number(stockForm.quantity),
            unitPrice: Number(stockForm.unitPrice) || 0,
            date: stockForm.date,
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                resetStockForm();
            },
        };

        if (editingStockId) {
            router.patch(`/inventory/stocks/${editingStockId}`, payload, options);
            return;
        }

        router.post('/inventory/stocks', payload, options);
    };

    const issueItem = () => {
        if (!issueForm.itemId || !issueForm.issuedTo.trim() || !issueForm.quantity) {
            toast.error('Select item, recipient, and quantity.');
            return;
        }

        const quantity = Number(issueForm.quantity);
        const selectedItem = items.find((item) => item.id === issueForm.itemId);

        if (!selectedItem) {
            toast.error('Selected item was not found.');
            return;
        }

        if (quantity > selectedItem.availableStock) {
            toast.error('Issue quantity cannot exceed available stock.');
            return;
        }

        const payload = {
            itemId: issueForm.itemId,
            issuedTo: issueForm.issuedTo.trim(),
            quantity,
            issueDate: issueForm.issueDate,
            returnDate: issueForm.returnDate || null,
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                resetIssueForm();
            },
        };

        if (editingIssueId) {
            router.patch(`/inventory/issues/${editingIssueId}`, payload, options);
            return;
        }

        router.post('/inventory/issues', payload, options);
    };

    const startEditingCategory = (category: InventoryCategory) => {
        setActiveTab('category');
        setEditingCategoryId(category.id);
        setCategoryForm({
            name: category.name,
            description: category.description,
        });
    };

    const startEditingStore = (store: InventoryStore) => {
        setActiveTab('store');
        setEditingStoreId(store.id);
        setStoreForm({
            name: store.name,
            manager: store.manager,
            location: store.location,
        });
    };

    const startEditingSupplier = (supplier: InventorySupplier) => {
        setActiveTab('supplier');
        setEditingSupplierId(supplier.id);
        setSupplierForm({
            name: supplier.name,
            contactPerson: supplier.contactPerson,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
        });
    };

    const startEditingItem = (item: InventoryItem) => {
        setActiveTab('add-item');
        setEditingItemId(item.id);
        setItemForm({
            name: item.name,
            categoryId: item.categoryId,
            storeId: item.storeId,
            supplierId: item.supplierId,
            unit: item.unit,
            availableStock: String(item.availableStock),
            minimumStock: String(item.minimumStock),
        });
    };

    const startEditingStock = (entry: StockEntry) => {
        setActiveTab('add-stock');
        setEditingStockId(entry.id);
        setStockForm({
            itemId: entry.itemId,
            supplierId: entry.supplierId,
            storeId: entry.storeId,
            quantity: String(entry.quantity),
            unitPrice: String(entry.unitPrice),
            date: entry.date,
        });
    };

    const startEditingIssue = (record: IssueRecord) => {
        setActiveTab('issue-item');
        setEditingIssueId(record.id);
        setIssueForm({
            itemId: record.itemId,
            issuedTo: record.issuedTo,
            quantity: String(record.quantity),
            issueDate: record.issueDate,
            returnDate: record.returnDate,
        });
    };

    const deleteCategory = (categoryId: string) => {
        if (!window.confirm('Delete this category?')) {
            return;
        }

        router.delete(`/inventory/categories/${categoryId}`, {
            preserveScroll: true,
        });
    };

    const deleteStore = (storeId: string) => {
        if (!window.confirm('Delete this store?')) {
            return;
        }

        router.delete(`/inventory/stores/${storeId}`, { preserveScroll: true });
    };

    const deleteSupplier = (supplierId: string) => {
        if (!window.confirm('Delete this supplier?')) {
            return;
        }

        router.delete(`/inventory/suppliers/${supplierId}`, {
            preserveScroll: true,
        });
    };

    const deleteItem = (itemId: string) => {
        if (!window.confirm('Delete this inventory item?')) {
            return;
        }

        router.delete(`/inventory/items/${itemId}`, { preserveScroll: true });
    };

    const deleteStock = (stockId: string) => {
        if (!window.confirm('Delete this stock entry?')) {
            return;
        }

        router.delete(`/inventory/stocks/${stockId}`, { preserveScroll: true });
    };

    const deleteIssue = (issueId: string) => {
        if (!window.confirm('Delete this issue record?')) {
            return;
        }

        router.delete(`/inventory/issues/${issueId}`, { preserveScroll: true });
    };

    const returnIssue = (issueId: string) => {
        if (!window.confirm('Mark this issued item as returned?')) {
            return;
        }

        router.patch(`/inventory/issues/${issueId}/return`, {}, { preserveScroll: true });
    };

    const summaryCards = [
        {
            title: 'Inventory Items',
            value: items.length,
            note: 'Tracked inventory masters',
            icon: Boxes,
        },
        {
            title: 'Total Stock Units',
            value: totalStock,
            note: 'Current available quantity',
            icon: PackageSearch,
        },
        {
            title: 'Low Stock Alerts',
            value: lowStockItems.length,
            note: 'Needs replenishment soon',
            icon: ReceiptText,
        },
        {
            title: 'Active Issues',
            value: activeIssues.length,
            note: 'Currently issued items',
            icon: ClipboardList,
        },
    ];

    return (
        <DashboardLayout user={user} activeTab="inventory">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="space-y-4">
                        <div className="max-w-3xl text-left">
                            <h1 className="text-3xl font-bold text-slate-900">{t('Inventory Management')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t(
                                    'Manage school stock, suppliers, store rooms, and issue tracking from one workspace.',
                                )}
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {summaryCards.map((card) => {
                                const Icon = card.icon;

                                return (
                                    <Card key={card.title} className="border-slate-200 shadow-sm">
                                        <CardContent className="flex items-start gap-3 p-4">
                                            <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                    {t(card.title)}
                                                </p>
                                                <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
                                                <p className="text-xs text-slate-500">{card.note}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle>{t('Inventory Register')}</CardTitle>
                                <CardDescription>
                                    {t('Search all items by name, category, store, or supplier.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4 space-y-2">
                                    <Label>{t('Search Inventory')}</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={searchQuery}
                                            onChange={(event) => setSearchQuery(event.target.value)}
                                            placeholder={t('Search inventory...')}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Item')}</TableHead>
                                                <TableHead>{t('Category')}</TableHead>
                                                <TableHead>{t('Store')}</TableHead>
                                                <TableHead>{t('Supplier')}</TableHead>
                                                <TableHead>{t('Stock')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                                <TableHead className="text-right">{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredItems.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-slate-900">{item.name}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {t('Min stock:')}
                                                                {item.minimumStock} {item.unit}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{t(item.category)}</TableCell>
                                                    <TableCell>{item.store}</TableCell>
                                                    <TableCell>{item.supplier}</TableCell>
                                                    <TableCell>
                                                        {item.availableStock} {item.unit}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                item.availableStock <= item.minimumStock
                                                                    ? 'destructive'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {item.availableStock <= item.minimumStock
                                                                ? t('Low Stock')
                                                                : t('Healthy')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => startEditingItem(item)}
                                                            >
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                {t('Edit')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => deleteItem(item.id)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                {t('Delete')}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle>{t('Quick Snapshot')}</CardTitle>
                                <CardDescription>
                                    {t('Keep a close eye on valuation and issue movement.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-sm font-medium text-slate-600">
                                        {t('Approx. stock purchase value')}
                                    </p>
                                    <p className="mt-1 text-3xl font-bold text-slate-900">
                                        {t('Rs.')}
                                        {totalInventoryValue.toLocaleString()}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                    <p className="text-sm font-medium text-blue-800">{t('Low stock items')}</p>
                                    <div className="mt-3 space-y-2">
                                        {lowStockItems.length > 0 ? (
                                            lowStockItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                                                >
                                                    <span>{item.name}</span>
                                                    <span className="font-semibold text-blue-700">
                                                        {item.availableStock}
                                                        {t('left')}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-blue-800">
                                                {t('No low stock alerts right now.')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                    <p className="text-sm font-medium text-blue-900">{t('Open issue records')}</p>
                                    <div className="mt-3 space-y-2">
                                        {activeIssues.length > 0 ? (
                                            activeIssues.slice(0, 4).map((record) => (
                                                <div key={record.id} className="rounded-lg bg-white px-3 py-2 text-sm">
                                                    <p className="font-medium text-slate-900">{record.itemName}</p>
                                                    <p className="text-slate-500">
                                                        {record.issuedTo}
                                                        {'• '}
                                                        {t('Qty')}
                                                        {record.quantity}
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-blue-900">{t('No active issued items.')}</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <div className="overflow-x-auto pb-1">
                            <TabsList className="flex w-max min-w-full flex-nowrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
                                <TabsTrigger
                                    value="issue-item"
                                    className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Issue Item')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="add-stock"
                                    className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Add Item Stock')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="add-item"
                                    className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Add Item')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="category"
                                    className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Item Category')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="store"
                                    className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Item Store')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="supplier"
                                    className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Item Supplier')}
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="issue-item">
                            <FeaturePanel
                                icon={ClipboardList}
                                title={t('Issue Item')}
                                description="Assign inventory to departments, classrooms, or staff and keep issue history visible."
                            >
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                    <div className="space-y-2">
                                        <Label>{t('Item')}</Label>
                                        <Select
                                            value={issueForm.itemId}
                                            onValueChange={(value) =>
                                                setIssueForm((current) => ({
                                                    ...current,
                                                    itemId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select item')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {items.map((item) => (
                                                    <SelectItem key={item.id} value={item.id}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Issued To')}</Label>
                                        <Input
                                            placeholder={t('Issued to')}
                                            value={issueForm.issuedTo}
                                            onChange={(event) =>
                                                setIssueForm((current) => ({
                                                    ...current,
                                                    issuedTo: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Quantity')}</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            placeholder={t('Quantity')}
                                            value={issueForm.quantity}
                                            onChange={(event) =>
                                                setIssueForm((current) => ({
                                                    ...current,
                                                    quantity: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Issue Date')}</Label>
                                        <Input
                                            type="date"
                                            value={issueForm.issueDate}
                                            onChange={(event) =>
                                                setIssueForm((current) => ({
                                                    ...current,
                                                    issueDate: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Return Date')}</Label>
                                        <Input
                                            type="date"
                                            value={issueForm.returnDate}
                                            onChange={(event) =>
                                                setIssueForm((current) => ({
                                                    ...current,
                                                    returnDate: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <div className="flex gap-2">
                                        {editingIssueId ? (
                                            <Button type="button" variant="outline" onClick={resetIssueForm}>
                                                <X className="mr-2 h-4 w-4" />
                                                {t('Cancel')}
                                            </Button>
                                        ) : null}
                                        <Button onClick={issueItem}>
                                            {editingIssueId ? t('Update Issue') : t('Issue Item')}
                                        </Button>
                                    </div>
                                </div>
                                <SimpleIssueTable
                                    records={issueRecords}
                                    onEdit={startEditingIssue}
                                    onDelete={deleteIssue}
                                    onReturn={returnIssue}
                                />
                            </FeaturePanel>
                        </TabsContent>

                        <TabsContent value="add-stock">
                            <FeaturePanel
                                icon={PackagePlus}
                                title={t('Add Item Stock')}
                                description={t('Record new inward stock and instantly update available quantities.')}
                            >
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                                    <div className="space-y-2">
                                        <Label>{t('Item')}</Label>
                                        <Select
                                            value={stockForm.itemId}
                                            onValueChange={(value) =>
                                                setStockForm((current) => ({
                                                    ...current,
                                                    itemId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select item')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {items.map((item) => (
                                                    <SelectItem key={item.id} value={item.id}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Supplier')}</Label>
                                        <Select
                                            value={stockForm.supplierId}
                                            onValueChange={(value) =>
                                                setStockForm((current) => ({
                                                    ...current,
                                                    supplierId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select supplier')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {suppliers.map((supplier) => (
                                                    <SelectItem key={supplier.id} value={supplier.id}>
                                                        {supplier.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Store')}</Label>
                                        <Select
                                            value={stockForm.storeId}
                                            onValueChange={(value) =>
                                                setStockForm((current) => ({
                                                    ...current,
                                                    storeId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select store')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {stores.map((storeItem) => (
                                                    <SelectItem key={storeItem.id} value={storeItem.id}>
                                                        {storeItem.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Quantity')}</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            placeholder={t('Quantity')}
                                            value={stockForm.quantity}
                                            onChange={(event) =>
                                                setStockForm((current) => ({
                                                    ...current,
                                                    quantity: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Unit Price')}</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            placeholder={t('Unit price')}
                                            value={stockForm.unitPrice}
                                            onChange={(event) =>
                                                setStockForm((current) => ({
                                                    ...current,
                                                    unitPrice: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Date')}</Label>
                                        <Input
                                            type="date"
                                            value={stockForm.date}
                                            onChange={(event) =>
                                                setStockForm((current) => ({
                                                    ...current,
                                                    date: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <div className="flex gap-2">
                                        {editingStockId ? (
                                            <Button type="button" variant="outline" onClick={resetStockForm}>
                                                <X className="mr-2 h-4 w-4" />
                                                {t('Cancel')}
                                            </Button>
                                        ) : null}
                                        <Button onClick={addStock}>
                                            {editingStockId ? t('Update Stock') : t('Add Stock')}
                                        </Button>
                                    </div>
                                </div>
                                <SimpleStockTable
                                    entries={stockEntries}
                                    onEdit={startEditingStock}
                                    onDelete={deleteStock}
                                />
                            </FeaturePanel>
                        </TabsContent>

                        <TabsContent value="add-item">
                            <FeaturePanel
                                icon={Boxes}
                                title={t('Add Item')}
                                description={t('Create new inventory masters and define minimum stock thresholds.')}
                            >
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
                                    <div className="space-y-2">
                                        <Label>{t('Item Name')}</Label>
                                        <Input
                                            placeholder={t('Item name')}
                                            value={itemForm.name}
                                            onChange={(event) =>
                                                setItemForm((current) => ({
                                                    ...current,
                                                    name: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Category')}</Label>
                                        <Select
                                            value={itemForm.categoryId}
                                            onValueChange={(value) =>
                                                setItemForm((current) => ({
                                                    ...current,
                                                    categoryId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Category')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.id} value={category.id}>
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Store')}</Label>
                                        <Select
                                            value={itemForm.storeId}
                                            onValueChange={(value) =>
                                                setItemForm((current) => ({
                                                    ...current,
                                                    storeId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Store')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {stores.map((storeItem) => (
                                                    <SelectItem key={storeItem.id} value={storeItem.id}>
                                                        {storeItem.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Supplier')}</Label>
                                        <Select
                                            value={itemForm.supplierId}
                                            onValueChange={(value) =>
                                                setItemForm((current) => ({
                                                    ...current,
                                                    supplierId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Supplier')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {suppliers.map((supplier) => (
                                                    <SelectItem key={supplier.id} value={supplier.id}>
                                                        {supplier.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Unit')}</Label>
                                        <Input
                                            placeholder={t('Unit')}
                                            value={itemForm.unit}
                                            onChange={(event) =>
                                                setItemForm((current) => ({
                                                    ...current,
                                                    unit: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Opening Stock')}</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            placeholder={t('Opening stock')}
                                            value={itemForm.availableStock}
                                            onChange={(event) =>
                                                setItemForm((current) => ({
                                                    ...current,
                                                    availableStock: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Minimum Stock')}</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            placeholder={t('Minimum stock')}
                                            value={itemForm.minimumStock}
                                            onChange={(event) =>
                                                setItemForm((current) => ({
                                                    ...current,
                                                    minimumStock: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <div className="flex gap-2">
                                        {editingItemId ? (
                                            <Button type="button" variant="outline" onClick={resetItemForm}>
                                                <X className="mr-2 h-4 w-4" />
                                                {t('Cancel')}
                                            </Button>
                                        ) : null}
                                        <Button onClick={addItem}>
                                            {editingItemId ? t('Update Item') : t('Add Item')}
                                        </Button>
                                    </div>
                                </div>
                                <InventoryItemTable items={items} onEdit={startEditingItem} onDelete={deleteItem} />
                            </FeaturePanel>
                        </TabsContent>

                        <TabsContent value="category">
                            <FeaturePanel
                                icon={Tags}
                                title={t('Item Category')}
                                description={t('Organize goods into reusable categories for easier reporting and filtering.')}
                            >
                                <div className="grid gap-4 md:grid-cols-[1fr_1.5fr_auto]">
                                    <div className="space-y-2">
                                        <Label>{t('Category Name')}</Label>
                                        <Input
                                            placeholder={t('Category name')}
                                            value={categoryForm.name}
                                            onChange={(event) =>
                                                setCategoryForm((current) => ({
                                                    ...current,
                                                    name: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Description')}</Label>
                                        <Input
                                            placeholder={t('Description')}
                                            value={categoryForm.description}
                                            onChange={(event) =>
                                                setCategoryForm((current) => ({
                                                    ...current,
                                                    description: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <div className="flex gap-2">
                                            {editingCategoryId ? (
                                                <Button type="button" variant="outline" onClick={resetCategoryForm}>
                                                    <X className="mr-2 h-4 w-4" />
                                                    {t('Cancel')}
                                                </Button>
                                            ) : null}
                                            <Button onClick={addCategory}>
                                                {editingCategoryId ? t('Update Category') : t('Add Category')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <SimpleCategoryGrid
                                    categories={categories}
                                    onEdit={startEditingCategory}
                                    onDelete={deleteCategory}
                                />
                            </FeaturePanel>
                        </TabsContent>

                        <TabsContent value="store">
                            <FeaturePanel
                                icon={Store}
                                title={t('Item Store')}
                                description={t('Track multiple stock rooms with ownership and physical locations.')}
                            >
                                <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.3fr_auto]">
                                    <div className="space-y-2">
                                        <Label>{t('Store Name')}</Label>
                                        <Input
                                            placeholder={t('Store name')}
                                            value={storeForm.name}
                                            onChange={(event) =>
                                                setStoreForm((current) => ({
                                                    ...current,
                                                    name: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Store Manager')}</Label>
                                        <Input
                                            placeholder={t('Store manager')}
                                            value={storeForm.manager}
                                            onChange={(event) =>
                                                setStoreForm((current) => ({
                                                    ...current,
                                                    manager: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Location')}</Label>
                                        <Input
                                            placeholder={t('Location')}
                                            value={storeForm.location}
                                            onChange={(event) =>
                                                setStoreForm((current) => ({
                                                    ...current,
                                                    location: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <div className="flex gap-2">
                                            {editingStoreId ? (
                                                <Button type="button" variant="outline" onClick={resetStoreForm}>
                                                    <X className="mr-2 h-4 w-4" />
                                                    {t('Cancel')}
                                                </Button>
                                            ) : null}
                                            <Button onClick={addStore}>
                                                {editingStoreId ? t('Update Store') : t('Add Store')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <SimpleStoreTable stores={stores} onEdit={startEditingStore} onDelete={deleteStore} />
                            </FeaturePanel>
                        </TabsContent>

                        <TabsContent value="supplier">
                            <FeaturePanel
                                icon={Truck}
                                title={t('Item Supplier')}
                                description={t('Maintain the vendor list used for purchases and replenishment.')}
                            >
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                    <div className="space-y-2">
                                        <Label>{t('Supplier Name')}</Label>
                                        <Input
                                            placeholder={t('Supplier name')}
                                            value={supplierForm.name}
                                            onChange={(event) =>
                                                setSupplierForm((current) => ({
                                                    ...current,
                                                    name: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Contact Person')}</Label>
                                        <Input
                                            placeholder={t('Contact person')}
                                            value={supplierForm.contactPerson}
                                            onChange={(event) =>
                                                setSupplierForm((current) => ({
                                                    ...current,
                                                    contactPerson: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Phone')}</Label>
                                        <Input
                                            placeholder={t('Phone')}
                                            value={supplierForm.phone}
                                            onChange={(event) =>
                                                setSupplierForm((current) => ({
                                                    ...current,
                                                    phone: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Email')}</Label>
                                        <Input
                                            placeholder={t('Email')}
                                            value={supplierForm.email}
                                            onChange={(event) =>
                                                setSupplierForm((current) => ({
                                                    ...current,
                                                    email: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2 xl:col-span-5">
                                        <Label>{t('Address')}</Label>
                                        <Textarea
                                            placeholder={t('Address')}
                                            value={supplierForm.address}
                                            onChange={(event) =>
                                                setSupplierForm((current) => ({
                                                    ...current,
                                                    address: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <div className="flex gap-2">
                                        {editingSupplierId ? (
                                            <Button type="button" variant="outline" onClick={resetSupplierForm}>
                                                <X className="mr-2 h-4 w-4" />
                                                {t('Cancel')}
                                            </Button>
                                        ) : null}
                                        <Button onClick={addSupplier}>
                                            {editingSupplierId ? t('Update Supplier') : t('Add Supplier')}
                                        </Button>
                                    </div>
                                </div>
                                <SimpleSupplierTable
                                    suppliers={suppliers}
                                    onEdit={startEditingSupplier}
                                    onDelete={deleteSupplier}
                                />
                            </FeaturePanel>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </DashboardLayout>
    );
}

function FeaturePanel({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: typeof Boxes;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-200">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">{children}</CardContent>
        </Card>
    );
}

function SimpleCategoryGrid({
    categories,
    onEdit,
    onDelete,
}: {
    categories: InventoryCategory[];
    onEdit: (category: InventoryCategory) => void;
    onDelete: (categoryId: string) => void;
}) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
                const { t } = useLanguage();
                return (
                    <div key={category.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold text-slate-900">{category.name}</p>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(category)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t('Edit')}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => onDelete(category.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('Delete')}
                                </Button>
                            </div>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                            {category.description || t('No description added yet.')}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

function SimpleStoreTable({
    stores,
    onEdit,
    onDelete,
}: {
    stores: InventoryStore[];
    onEdit: (store: InventoryStore) => void;
    onDelete: (storeId: string) => void;
}) {
    const { t } = useLanguage();
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Store')}</TableHead>
                        <TableHead>{t('Manager')}</TableHead>
                        <TableHead>{t('Location')}</TableHead>
                        <TableHead className="text-right">{t('Actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {stores.map((store) => (
                        <TableRow key={store.id}>
                            <TableCell className="font-medium">{store.name}</TableCell>
                            <TableCell>{store.manager}</TableCell>
                            <TableCell>{store.location}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(store)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        {t('Edit')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDelete(store.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {t('Delete')}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function SimpleSupplierTable({
    suppliers,
    onEdit,
    onDelete,
}: {
    suppliers: InventorySupplier[];
    onEdit: (supplier: InventorySupplier) => void;
    onDelete: (supplierId: string) => void;
}) {
    const { t } = useLanguage();
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Supplier')}</TableHead>
                        <TableHead>{t('Contact')}</TableHead>
                        <TableHead>{t('Phone')}</TableHead>
                        <TableHead>{t('Email')}</TableHead>
                        <TableHead>{t('Address')}</TableHead>
                        <TableHead className="text-right">{t('Actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {suppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                            <TableCell className="font-medium">{supplier.name}</TableCell>
                            <TableCell>{supplier.contactPerson}</TableCell>
                            <TableCell>{supplier.phone || '-'}</TableCell>
                            <TableCell>{supplier.email || '-'}</TableCell>
                            <TableCell>{supplier.address || '-'}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(supplier)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        {t('Edit')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDelete(supplier.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {t('Delete')}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function InventoryItemTable({
    items,
    onEdit,
    onDelete,
}: {
    items: InventoryItem[];
    onEdit: (item: InventoryItem) => void;
    onDelete: (itemId: string) => void;
}) {
    const { t } = useLanguage();
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Item')}</TableHead>
                        <TableHead>{t('Category')}</TableHead>
                        <TableHead>{t('Store')}</TableHead>
                        <TableHead>{t('Supplier')}</TableHead>
                        <TableHead>{t('Unit')}</TableHead>
                        <TableHead>{t('Stock')}</TableHead>
                        <TableHead>{t('Minimum')}</TableHead>
                        <TableHead className="text-right">{t('Actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{t(item.category)}</TableCell>
                            <TableCell>{item.store}</TableCell>
                            <TableCell>{item.supplier}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>{item.availableStock}</TableCell>
                            <TableCell>{item.minimumStock}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(item)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        {t('Edit')}
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => onDelete(item.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {t('Delete')}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function SimpleStockTable({
    entries,
    onEdit,
    onDelete,
}: {
    entries: StockEntry[];
    onEdit: (entry: StockEntry) => void;
    onDelete: (stockId: string) => void;
}) {
    const { t } = useLanguage();
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Item')}</TableHead>
                        <TableHead>{t('Supplier')}</TableHead>
                        <TableHead>{t('Store')}</TableHead>
                        <TableHead>{t('Quantity')}</TableHead>
                        <TableHead>{t('Unit Price')}</TableHead>
                        <TableHead>{t('Date')}</TableHead>
                        <TableHead className="text-right">{t('Actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.map((entry) => (
                        <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.itemName}</TableCell>
                            <TableCell>{entry.supplier}</TableCell>
                            <TableCell>{entry.store}</TableCell>
                            <TableCell>{entry.quantity}</TableCell>
                            <TableCell>
                                {t('Rs.')}
                                {entry.unitPrice.toLocaleString()}
                            </TableCell>
                            <TableCell>{entry.date}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(entry)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        {t('Edit')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDelete(entry.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {t('Delete')}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function SimpleIssueTable({
    records,
    onEdit,
    onDelete,
    onReturn,
}: {
    records: IssueRecord[];
    onEdit: (record: IssueRecord) => void;
    onDelete: (issueId: string) => void;
    onReturn: (issueId: string) => void;
}) {
    const { t } = useLanguage();
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Item')}</TableHead>
                        <TableHead>{t('Issued To')}</TableHead>
                        <TableHead>{t('Qty')}</TableHead>
                        <TableHead>{t('Issue Date')}</TableHead>
                        <TableHead>{t('Return Date')}</TableHead>
                        <TableHead>{t('Status')}</TableHead>
                        <TableHead className="text-right">{t('Actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {records.map((record) => (
                        <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.itemName}</TableCell>
                            <TableCell>{record.issuedTo}</TableCell>
                            <TableCell>{record.quantity}</TableCell>
                            <TableCell>{record.issueDate}</TableCell>
                            <TableCell>{record.returnDate || '-'}</TableCell>
                            <TableCell>
                                <Badge variant={record.status === 'Issued' ? 'secondary' : 'outline'}>
                                    {t(record.status)}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    {record.status === 'Issued' ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onReturn(record.id)}
                                        >
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                            {t('Return')}
                                        </Button>
                                    ) : null}
                                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(record)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        {t('Edit')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDelete(record.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {t('Delete')}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
