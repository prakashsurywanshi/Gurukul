import { FormEvent, useMemo, useState } from 'react';
import {
    Archive,
    BadgeIndianRupee,
    BarChart3,
    FileClock,
    FolderKanban,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    TrendingDown,
    UserRound,
    Warehouse,
    Wrench,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface MaintenanceLog {
    id: number;
    date: string;
    type: string;
    cost: string;
    performed_by: string | null;
    notes: string | null;
}

interface AssetRow {
    id: number;
    name: string;
    asset_code: string | null;
    category: string;
    subcategory: string | null;
    purchase_date: string | null;
    purchase_cost: string;
    current_value: string;
    depreciation_rate: string | null;
    status: string;
    condition: string;
    location: string | null;
    assigned_to: string | null;
    vendor: string | null;
    serial_number: string | null;
    notes: string | null;
    disposal_date: string | null;
    disposal_sale_price: string | null;
    maintenance_count: number;
    maintenance_logs: MaintenanceLog[];
}

interface AssetsProps {
    user: any;
    assets: AssetRow[];
    filters: { search: string; status: string; category: string };
    categories: string[];
    stats: {
        totalCost: string;
        currentValue: string;
        disposed: number;
        underMaintenance: number;
        count: number;
    };
}

const STATUS_LABELS: Record<string, string> = {
    in_use: 'In Use',
    available: 'Available',
    under_maintenance: 'Under Maintenance',
    disposed: 'Disposed',
};

const STATUS_STYLES: Record<string, string> = {
    in_use: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    under_maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    disposed: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300',
};

const CONDITION_LABELS: Record<string, string> = {
    new: 'New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
};

const emptyForm = {
    name: '',
    asset_code: '',
    category: '',
    subcategory: '',
    purchase_date: '',
    purchase_cost: '',
    current_value: '',
    depreciation_rate: '',
    status: 'in_use',
    condition: 'good',
    location: '',
    assigned_to: '',
    vendor: '',
    serial_number: '',
    notes: '',
};

export default function Assets(pageProps: AssetsProps) {
    const { t } = useLanguage();
    const { user, assets, filters, categories, stats } = pageProps;
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [category, setCategory] = useState(filters.category);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<AssetRow | null>(null);
    const [details, setDetails] = useState<AssetRow | null>(null);
    const [maintenanceFor, setMaintenanceFor] = useState<AssetRow | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [maintenanceForm, setMaintenanceForm] = useState({
        maintenance_date: '',
        maintenance_type: 'repair',
        cost: '',
        performed_by: '',
        notes: '',
    });

    type AssetView = 'assets' | 'categories' | 'assignments' | 'depreciation' | 'disposals' | 'audits' | 'reports';
    const [view, setView] = useState<AssetView>(() => {
        const query = new URLSearchParams(window.location.search).get('view') ?? '';
        const allowed: AssetView[] = [
            'assets',
            'categories',
            'assignments',
            'depreciation',
            'disposals',
            'audits',
            'reports',
        ];

        return allowed.includes(query as AssetView) ? (query as AssetView) : 'assets';
    });

    const assignedAssets = useMemo(() => assets.filter((asset) => asset.assigned_to), [assets]);

    const disposedAssets = useMemo(
        () => assets.filter((asset) => asset.status === 'disposed' || asset.disposal_date),
        [assets],
    );

    const depreciatedAssets = useMemo(
        () =>
            assets
                .filter((asset) => asset.status !== 'disposed' && asset.depreciation_rate && asset.purchase_cost)
                .map((asset) => ({
                    ...asset,
                    annualDepreciation: (parseFloat(asset.purchase_cost) * parseFloat(asset.depreciation_rate!)) / 100,
                }))
                .sort((a, b) => b.annualDepreciation - a.annualDepreciation),
        [assets],
    );

    const auditLogs = useMemo(
        () =>
            assets
                .flatMap((asset) =>
                    (asset.maintenance_logs ?? []).map((log) => ({
                        assetName: asset.name,
                        assetCode: asset.asset_code,
                        ...log,
                    })),
                )
                .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
        [assets],
    );

    const categoryReports = useMemo(() => {
        const map = new Map<string, { category: string; count: number; cost: number; current: number }>();
        for (const asset of assets) {
            const entry = map.get(asset.category) ?? { category: asset.category, count: 0, cost: 0, current: 0 };
            entry.count += 1;
            entry.cost += parseFloat(asset.purchase_cost) || 0;
            entry.current += parseFloat(asset.current_value) || 0;
            map.set(asset.category, entry);
        }
        return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
    }, [assets]);

    const totalAnnualDepreciation = depreciatedAssets.reduce((sum, asset) => sum + asset.annualDepreciation, 0);

    const applyFilters = () => {
        router.get(
            '/assets',
            {
                search: search || undefined,
                status: status || undefined,
                category: category || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('');
        setCategory('');
        router.get('/assets', {}, { preserveState: true, preserveScroll: true });
    };

    const filteredAssets = useMemo(() => {
        return assets.filter((asset) => {
            const matchesSearch =
                search === '' ||
                asset.name.toLowerCase().includes(search.toLowerCase()) ||
                (asset.asset_code ?? '').toLowerCase().includes(search.toLowerCase());
            const matchesStatus = status === '' || asset.status === status;
            const matchesCategory = category === '' || asset.category === category;

            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [assets, search, status, category]);

    const openCreate = () => {
        setForm(emptyForm);
        setCreating(true);
    };

    const openEdit = (asset: AssetRow) => {
        setForm({
            name: asset.name,
            asset_code: asset.asset_code ?? '',
            category: asset.category,
            subcategory: asset.subcategory ?? '',
            purchase_date: asset.purchase_date ?? '',
            purchase_cost: asset.purchase_cost,
            current_value: asset.current_value,
            depreciation_rate: asset.depreciation_rate ?? '',
            status: asset.status,
            condition: asset.condition,
            location: asset.location ?? '',
            assigned_to: asset.assigned_to ?? '',
            vendor: asset.vendor ?? '',
            serial_number: asset.serial_number ?? '',
            notes: asset.notes ?? '',
        });
        setEditing(asset);
    };

    const submitForm = (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);

        const payload = {
            ...form,
            purchase_cost: parseFloat(form.purchase_cost) || 0,
            current_value: parseFloat(form.current_value) || 0,
            depreciation_rate: form.depreciation_rate ? parseFloat(form.depreciation_rate) : null,
        };

        if (editing) {
            router.patch(`/assets/${editing.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setCreating(false);
                    setEditing(null);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            });
        } else {
            router.post('/assets', payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setCreating(false);
                    setEditing(null);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            });
        }
    };

    const submitMaintenance = (event: FormEvent) => {
        event.preventDefault();
        if (!maintenanceFor) {
            return;
        }

        setSaving(true);

        router.post(
            `/assets/${maintenanceFor.id}/maintenance`,
            {
                ...maintenanceForm,
                cost: parseFloat(maintenanceForm.cost) || 0,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setMaintenanceFor(null);
                    setMaintenanceForm({
                        maintenance_date: '',
                        maintenance_type: 'repair',
                        cost: '',
                        performed_by: '',
                        notes: '',
                    });
                    setSaving(false);
                },
                onError: () => setSaving(false),
            },
        );
    };

    const confirmDelete = (asset: AssetRow) => {
        if (!window.confirm(`Delete asset "${asset.name}" permanently?`)) {
            return;
        }

        setSaving(true);
        router.delete(`/assets/${asset.id}`, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };

    const setField = (field: keyof typeof emptyForm, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            <Warehouse className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />{t('Asset Management')}</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Track fixed assets, depreciation, maintenance and disposals.')}</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('Add Asset')}
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <BadgeIndianRupee className="h-8 w-8 text-emerald-500" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Total Cost')}</p>
                                <p className="text-lg font-semibold">₹{stats.totalCost}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <Archive className="h-8 w-8 text-indigo-500" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Current Value')}</p>
                                <p className="text-lg font-semibold">₹{stats.currentValue}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <Wrench className="h-8 w-8 text-amber-500" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Under Maintenance')}</p>
                                <p className="text-lg font-semibold">{stats.underMaintenance}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <Trash2 className="h-8 w-8 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Disposed')}</p>
                                <p className="text-lg font-semibold">{stats.disposed}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-0 dark:border-slate-700">
                    {(
                        [
                            { key: 'assets', label: 'Assets', icon: Warehouse },
                            { key: 'categories', label: 'Categories', icon: FolderKanban },
                            { key: 'assignments', label: 'Assignments', icon: UserRound },
                            { key: 'depreciation', label: 'Depreciation', icon: TrendingDown },
                            { key: 'disposals', label: 'Disposals', icon: Trash2 },
                            { key: 'audits', label: 'Audit Logs', icon: FileClock },
                            { key: 'reports', label: 'Reports', icon: BarChart3 },
                        ] as const
                    ).map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setView(key)}
                            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                                view === key
                                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>

                {view !== 'assets' && (
                    <div className="space-y-4">
                        {view === 'assignments' && (
                            <>
                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                                    <Card>
                                        <CardContent className="p-4">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Assigned Assets')}</p>
                                            <p className="text-lg font-semibold">{assignedAssets.length}</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-4">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Total Cost (Assigned)')}</p>
                                            <p className="text-lg font-semibold">
                                                ₹
                                                {assignedAssets
                                                    .reduce(
                                                        (sum, asset) => sum + (parseFloat(asset.purchase_cost) || 0),
                                                        0,
                                                    )
                                                    .toLocaleString('en-IN')}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                                {assignedAssets.length > 0 ? (
                                    <Card>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Asset')}</TableHead>
                                                        <TableHead>{t('Code')}</TableHead>
                                                        <TableHead>{t('Assigned To')}</TableHead>
                                                        <TableHead>{t('Category')}</TableHead>
                                                        <TableHead className="text-right">{t('Current Value')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {assignedAssets.map((asset) => (
                                                        <TableRow key={asset.id}>
                                                            <TableCell className="text-sm font-medium">
                                                                {asset.name}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-gray-400">
                                                                {asset.asset_code ?? '—'}
                                                            </TableCell>
                                                            <TableCell className="text-sm">
                                                                {asset.assigned_to}
                                                            </TableCell>
                                                            <TableCell className="text-sm">{asset.category}</TableCell>
                                                            <TableCell className="text-right text-sm">
                                                                ₹{asset.current_value}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <p className="py-8 text-center text-sm text-gray-400">{t('No assets assigned yet.')}</p>
                                )}
                            </>
                        )}

                        {view === 'depreciation' && (
                            <>
                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                                    <Card>
                                        <CardContent className="p-4">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Depreciating Assets')}</p>
                                            <p className="text-lg font-semibold">{depreciatedAssets.length}</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-4">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Annual Depreciation (Year 1)')}</p>
                                            <p className="text-lg font-semibold">
                                                ₹
                                                {totalAnnualDepreciation.toLocaleString('en-IN', {
                                                    maximumFractionDigits: 2,
                                                })}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                                {depreciatedAssets.length > 0 ? (
                                    <Card>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Asset')}</TableHead>
                                                        <TableHead>{t('Rate')}</TableHead>
                                                        <TableHead className="text-right">{t('Purchase Cost')}</TableHead>
                                                        <TableHead className="text-right">{t('Current Value')}</TableHead>
                                                        <TableHead className="text-right">{t('Annual Depreciation')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {depreciatedAssets.map((asset) => (
                                                        <TableRow key={asset.id}>
                                                            <TableCell className="text-sm font-medium">
                                                                {asset.name}
                                                            </TableCell>
                                                            <TableCell className="text-sm">
                                                                {asset.depreciation_rate}%
                                                            </TableCell>
                                                            <TableCell className="text-right text-sm">
                                                                ₹{asset.purchase_cost}
                                                            </TableCell>
                                                            <TableCell className="text-right text-sm">
                                                                ₹{asset.current_value}
                                                            </TableCell>
                                                            <TableCell className="text-right text-sm font-medium">
                                                                ₹
                                                                {asset.annualDepreciation.toLocaleString('en-IN', {
                                                                    maximumFractionDigits: 2,
                                                                })}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <p className="py-8 text-center text-sm text-gray-400">{t('No depreciation rates set on assets.')}</p>
                                )}
                            </>
                        )}

                        {view === 'disposals' && (
                            <>
                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                                    <Card>
                                        <CardContent className="p-4">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Disposed Assets')}</p>
                                            <p className="text-lg font-semibold">{disposedAssets.length}</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-4">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Total Sale Value')}</p>
                                            <p className="text-lg font-semibold">
                                                ₹
                                                {disposedAssets
                                                    .reduce(
                                                        (sum, asset) =>
                                                            sum + (parseFloat(asset.disposal_sale_price ?? '0') || 0),
                                                        0,
                                                    )
                                                    .toLocaleString('en-IN')}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                                {disposedAssets.length > 0 ? (
                                    <Card>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Asset')}</TableHead>
                                                        <TableHead>{t('Code')}</TableHead>
                                                        <TableHead className="text-right">{t('Purchase Cost')}</TableHead>
                                                        <TableHead>{t('Disposal Date')}</TableHead>
                                                        <TableHead className="text-right">{t('Sale Price')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {disposedAssets.map((asset) => (
                                                        <TableRow key={asset.id}>
                                                            <TableCell className="text-sm font-medium">
                                                                {asset.name}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-gray-400">
                                                                {asset.asset_code ?? '—'}
                                                            </TableCell>
                                                            <TableCell className="text-right text-sm">
                                                                ₹{asset.purchase_cost}
                                                            </TableCell>
                                                            <TableCell className="text-sm">
                                                                {asset.disposal_date ?? '—'}
                                                            </TableCell>
                                                            <TableCell className="text-right text-sm">
                                                                ₹{asset.disposal_sale_price ?? '0.00'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <p className="py-8 text-center text-sm text-gray-400">{t('No disposed assets.')}</p>
                                )}
                            </>
                        )}

                        {view === 'audits' && (
                            <>
                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                                    <Card>
                                        <CardContent className="p-4">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Maintenance Records')}</p>
                                            <p className="text-lg font-semibold">{auditLogs.length}</p>
                                        </CardContent>
                                    </Card>
                                </div>
                                {auditLogs.length > 0 ? (
                                    <Card>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Date')}</TableHead>
                                                        <TableHead>{t('Asset')}</TableHead>
                                                        <TableHead>{t('Type')}</TableHead>
                                                        <TableHead>{t('Performed By')}</TableHead>
                                                        <TableHead className="text-right">{t('Cost')}</TableHead>
                                                        <TableHead>{t('Notes')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {auditLogs.map((log, index) => (
                                                        <TableRow key={`${log.assetCode}-${log.date}-${index}`}>
                                                            <TableCell className="text-sm">{log.date}</TableCell>
                                                            <TableCell className="text-sm font-medium">
                                                                {log.assetName}
                                                            </TableCell>
                                                            <TableCell className="text-sm">{log.type}</TableCell>
                                                            <TableCell className="text-sm">
                                                                {log.performed_by ?? '—'}
                                                            </TableCell>
                                                            <TableCell className="text-right text-sm">
                                                                ₹{log.cost}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-gray-500">
                                                                {log.notes ?? '—'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <p className="py-8 text-center text-sm text-gray-400">{t('No maintenance / audit records yet.')}</p>
                                )}
                            </>
                        )}

                        {view === 'categories' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Categories')}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Category')}</TableHead>
                                                <TableHead className="text-right">{t('Assets')}</TableHead>
                                                <TableHead className="text-right">{t('Purchase Cost')}</TableHead>
                                                <TableHead className="text-right">{t('Current Value')}</TableHead>
                                                <TableHead className="text-right">{t('Depreciated')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {categoryReports.map((report) => (
                                                <TableRow key={report.category}>
                                                    <TableCell className="text-sm font-medium">
                                                        {report.category}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">{report.count}</TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        ₹{report.cost.toLocaleString('en-IN')}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        ₹{report.current.toLocaleString('en-IN')}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        ₹{(report.cost - report.current).toLocaleString('en-IN')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {categoryReports.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="py-8 text-center text-gray-400">{t('No categories to show.')}</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                        {view === 'reports' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Category Report')}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Category')}</TableHead>
                                                <TableHead className="text-right">{t('Assets')}</TableHead>
                                                <TableHead className="text-right">{t('Purchase Cost')}</TableHead>
                                                <TableHead className="text-right">{t('Current Value')}</TableHead>
                                                <TableHead className="text-right">{t('Depreciated')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {categoryReports.map((report) => (
                                                <TableRow key={report.category}>
                                                    <TableCell className="text-sm font-medium">
                                                        {report.category}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">{report.count}</TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        ₹{report.cost.toLocaleString('en-IN')}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        ₹{report.current.toLocaleString('en-IN')}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        ₹{(report.cost - report.current).toLocaleString('en-IN')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {categoryReports.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="py-8 text-center text-gray-400">{t('No assets to report.')}</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {view === 'assets' && (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Assets (')}{filteredAssets.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="relative lg:col-span-2">
                                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <Input
                                            className="pl-9"
                                            placeholder={t('Search name or code…')}
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    applyFilters();
                                                }
                                            }}
                                        />
                                    </div>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All statuses')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="select-all-null">{t('All statuses')}</SelectItem>
                                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All categories')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="select-all-null">{t('All categories')}</SelectItem>
                                            {categories.map((option) => (
                                                <SelectItem key={option} value={option}>
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" onClick={resetFilters}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        {t('Reset')}</Button>
                                    <Button onClick={applyFilters}>
                                        <Search className="mr-2 h-4 w-4" />
                                        {t('Apply')}</Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Asset')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead>{t('Category')}</TableHead>
                                            <TableHead>{t('Purchase Date')}</TableHead>
                                            <TableHead className="text-right">{t('Cost')}</TableHead>
                                            <TableHead className="text-right">{t('Current Value')}</TableHead>
                                            <TableHead>{t('Condition')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAssets.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={8} className="py-10 text-center text-gray-400">{t('No assets found.')}</TableCell>
                                            </TableRow>
                                        )}
                                        {filteredAssets.map((asset) => (
                                            <TableRow key={asset.id}>
                                                <TableCell>
                                                    <button
                                                        className="text-left text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                                                        onClick={() => setDetails(asset)}
                                                    >
                                                        {asset.name}
                                                    </button>
                                                    <p className="font-mono text-xs text-gray-400">
                                                        {asset.asset_code ?? 'No code'}
                                                        {asset.serial_number ? ` · ${asset.serial_number}` : ''}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={STATUS_STYLES[asset.status] ?? ''}>
                                                        {STATUS_LABELS[asset.status] ?? asset.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">{asset.category}</TableCell>
                                                <TableCell className="text-sm">{asset.purchase_date ?? '—'}</TableCell>
                                                <TableCell className="text-right text-sm">
                                                    ₹{asset.purchase_cost}
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium">
                                                    ₹{asset.current_value}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {CONDITION_LABELS[asset.condition] ?? asset.condition}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDetails(asset)}
                                                        >
                                                            <Warehouse className="h-4 w-4" />
                                                            <span className="sr-only">{t('Details')}</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEdit(asset)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                            <span className="sr-only">{t('Edit')}</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setMaintenanceFor(asset)}
                                                        >
                                                            <Wrench className="h-4 w-4" />
                                                            <span className="sr-only">{t('Maintenance')}</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => confirmDelete(asset)}
                                                            className="text-rose-500 hover:text-rose-600"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="sr-only">{t('Delete')}</span>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </>
                )}

                <Dialog
                    open={creating || editing !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setCreating(false);
                            setEditing(null);
                        }
                    }}
                >
                    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editing ? t('Edit Asset') : t('Add Asset')}</DialogTitle>
                            <DialogDescription>
                                {editing ? t('Update asset details below.') : t('Register a new fixed asset.')}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitForm} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <Label>Asset Name *</Label>
                                <Input value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                            </div>
                            <div>
                                <Label>{t('Asset Code')}</Label>
                                <Input
                                    value={form.asset_code}
                                    onChange={(e) => setField('asset_code', e.target.value)}
                                    placeholder={t('Auto if blank')}
                                />
                            </div>
                            <div>
                                <Label>Category *</Label>
                                <Input
                                    value={form.category}
                                    onChange={(e) => setField('category', e.target.value)}
                                    required
                                    placeholder={t('e.g. Furniture')}
                                />
                            </div>
                            <div>
                                <Label>{t('Subcategory')}</Label>
                                <Input
                                    value={form.subcategory}
                                    onChange={(e) => setField('subcategory', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>{t('Serial Number')}</Label>
                                <Input
                                    value={form.serial_number}
                                    onChange={(e) => setField('serial_number', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>{t('Purchase Date')}</Label>
                                <Input
                                    type="date"
                                    value={form.purchase_date}
                                    onChange={(e) => setField('purchase_date', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Status *</Label>
                                <Select value={form.status} onValueChange={(value) => setField('status', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Purchase Cost (₹)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.purchase_cost}
                                    onChange={(e) => setField('purchase_cost', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Current Value (₹)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.current_value}
                                    onChange={(e) => setField('current_value', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Depreciation Rate (%)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={form.depreciation_rate}
                                    onChange={(e) => setField('depreciation_rate', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Condition *</Label>
                                <Select value={form.condition} onValueChange={(value) => setField('condition', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Location')}</Label>
                                <Input value={form.location} onChange={(e) => setField('location', e.target.value)} />
                            </div>
                            <div>
                                <Label>{t('Assigned To')}</Label>
                                <Input
                                    value={form.assigned_to}
                                    onChange={(e) => setField('assigned_to', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>{t('Vendor')}</Label>
                                <Input value={form.vendor} onChange={(e) => setField('vendor', e.target.value)} />
                            </div>
                            <div className="sm:col-span-2">
                                <Label>{t('Notes')}</Label>
                                <Textarea
                                    value={form.notes}
                                    onChange={(e) => setField('notes', e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 sm:col-span-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setCreating(false);
                                        setEditing(null);
                                    }}
                                >
                                    {t('Cancel')}</Button>
                                <Button type="submit" disabled={saving}>
                                    {editing ? t('Save Changes') : t('Add Asset')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={details !== null} onOpenChange={(open) => !open && setDetails(null)}>
                    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{details?.name}</DialogTitle>
                            <DialogDescription>
                                {details?.asset_code ?? 'No code'} · {details?.category}
                            </DialogDescription>
                        </DialogHeader>
                        {details && (
                            <div className="space-y-4">
                                <dl className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Status')}</dt>
                                        <dd>
                                            <Badge className={STATUS_STYLES[details.status] ?? ''}>
                                                {STATUS_LABELS[details.status] ?? details.status}
                                            </Badge>
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Condition')}</dt>
                                        <dd>{CONDITION_LABELS[details.condition] ?? details.condition}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Purchase Date')}</dt>
                                        <dd>{details.purchase_date ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Purchase Cost')}</dt>
                                        <dd>₹{details.purchase_cost}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Current Value')}</dt>
                                        <dd>₹{details.current_value}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Depreciation Rate')}</dt>
                                        <dd>
                                            {details.depreciation_rate ?? '—'}
                                            {details.depreciation_rate ? '%' : ''}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Location')}</dt>
                                        <dd>{details.location ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Assigned To')}</dt>
                                        <dd>{details.assigned_to ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Vendor')}</dt>
                                        <dd>{details.vendor ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">{t('Serial Number')}</dt>
                                        <dd className="font-mono text-xs">{details.serial_number ?? '—'}</dd>
                                    </div>
                                    {details.status === 'disposed' && (
                                        <div className="sm:col-span-2">
                                            <dt className="text-gray-500 dark:text-gray-400">{t('Disposal')}</dt>
                                            <dd>
                                                {details.disposal_date ?? '—'}
                                                {details.disposal_sale_price
                                                    ? ` · ₹${details.disposal_sale_price}`
                                                    : ''}
                                            </dd>
                                        </div>
                                    )}
                                    {details.notes && (
                                        <div className="sm:col-span-2">
                                            <dt className="text-gray-500 dark:text-gray-400">{t('Notes')}</dt>
                                            <dd className="whitespace-pre-wrap text-gray-600 dark:text-gray-300">
                                                {details.notes}
                                            </dd>
                                        </div>
                                    )}
                                </dl>

                                <div>
                                    <h4 className="mb-2 text-sm font-semibold">{t('Maintenance History (')}{details.maintenance_count})
                                    </h4>
                                    {details.maintenance_logs.length === 0 ? (
                                        <p className="text-sm text-gray-400">{t('No maintenance recorded.')}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {details.maintenance_logs.map((log) => (
                                                <div
                                                    key={log.id}
                                                    className="rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{log.type}</span>
                                                        <span className="text-xs text-gray-500">
                                                            {log.date} · ₹{log.cost}
                                                        </span>
                                                    </div>
                                                    {(log.performed_by || log.notes) && (
                                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                            {log.performed_by}
                                                            {log.notes ? ` — ${log.notes}` : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog open={maintenanceFor !== null} onOpenChange={(open) => !open && setMaintenanceFor(null)}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{t('Maintenance')}</DialogTitle>
                            <DialogDescription>Record maintenance for "{maintenanceFor?.name}".</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitMaintenance} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label>Date *</Label>
                                <Input
                                    type="date"
                                    required
                                    value={maintenanceForm.maintenance_date}
                                    onChange={(e) =>
                                        setMaintenanceForm((current) => ({
                                            ...current,
                                            maintenance_date: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <Label>Type *</Label>
                                <Select
                                    value={maintenanceForm.maintenance_type}
                                    onValueChange={(value) =>
                                        setMaintenanceForm((current) => ({ ...current, maintenance_type: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="repair">{t('Repair')}</SelectItem>
                                        <SelectItem value="service">{t('Service')}</SelectItem>
                                        <SelectItem value="inspection">{t('Inspection')}</SelectItem>
                                        <SelectItem value="upgrade">{t('Upgrade')}</SelectItem>
                                        <SelectItem value="other">{t('Other')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Cost (₹)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={maintenanceForm.cost}
                                    onChange={(e) =>
                                        setMaintenanceForm((current) => ({ ...current, cost: e.target.value }))
                                    }
                                />
                            </div>
                            <div>
                                <Label>{t('Performed By')}</Label>
                                <Input
                                    value={maintenanceForm.performed_by}
                                    onChange={(e) =>
                                        setMaintenanceForm((current) => ({ ...current, performed_by: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label>{t('Notes')}</Label>
                                <Textarea
                                    rows={3}
                                    value={maintenanceForm.notes}
                                    onChange={(e) =>
                                        setMaintenanceForm((current) => ({ ...current, notes: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 sm:col-span-2">
                                <Button type="button" variant="outline" onClick={() => setMaintenanceFor(null)}>
                                    {t('Cancel')}</Button>
                                <Button type="submit" disabled={saving}>{t('Record Maintenance')}</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
