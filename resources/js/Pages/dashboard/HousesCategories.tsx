import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Flag, FolderPlus, Palette, Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface HouseRow {
    id: number;
    name: string;
    color: string;
    description: string;
    status: string;
    sortOrder: number;
    studentCount: number;
}

interface CategoryRow {
    id: number;
    name: string;
    description: string;
    status: string;
    sortOrder: number;
    studentCount: number;
}

interface HouseForm {
    name: string;
    color: string;
    description: string;
    status: string;
    sortOrder: string;
}

interface CategoryForm {
    name: string;
    description: string;
    status: string;
    sortOrder: string;
}

const EMPTY_HOUSE: HouseForm = {
    name: '',
    color: '#3b82f6',
    description: '',
    status: 'active',
    sortOrder: '0',
};

const EMPTY_CATEGORY: CategoryForm = {
    name: '',
    description: '',
    status: 'active',
    sortOrder: '0',
};

const HOUSE_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function HousesCategories({
    user,
    houses,
    categories,
}: {
    user: any;
    houses: HouseRow[];
    categories: CategoryRow[];
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [tab, setTab] = useState<'houses' | 'categories'>('houses');
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [houseForm, setHouseForm] = useState<HouseForm>(EMPTY_HOUSE);
    const [categoryForm, setCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<{ id: number; name: string } | null>(null);
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
        setEditingId(null);
        if (tab === 'houses') {
            setHouseForm({
                ...EMPTY_HOUSE,
                sortOrder: String(Math.max(0, ...houses.map((house) => house.sortOrder)) + 1),
            });
        } else {
            setCategoryForm({
                ...EMPTY_CATEGORY,
                sortOrder: String(Math.max(0, ...categories.map((category) => category.sortOrder)) + 1),
            });
        }
        setModalOpen(true);
    };

    const openEditHouse = (house: HouseRow) => {
        setMode('edit');
        setEditingId(house.id);
        setTab('houses');
        setHouseForm({
            name: house.name,
            color: house.color,
            description: house.description ?? '',
            status: house.status,
            sortOrder: String(house.sortOrder),
        });
        setModalOpen(true);
    };

    const openEditCategory = (category: CategoryRow) => {
        setMode('edit');
        setEditingId(category.id);
        setTab('categories');
        setCategoryForm({
            name: category.name,
            description: category.description ?? '',
            status: category.status,
            sortOrder: String(category.sortOrder),
        });
        setModalOpen(true);
    };

    const submitHouse = () => {
        if (!houseForm.name.trim()) {
            toast.error('Enter a house name.');
            return;
        }

        setProcessing(true);
        const payload = {
            name: houseForm.name,
            color: houseForm.color,
            description: houseForm.description,
            status: houseForm.status,
            sort_order: Number(houseForm.sortOrder) || 0,
        };

        if (mode === 'edit' && editingId !== null) {
            router.put(`/houses-categories/houses/${editingId}`, payload, {
                preserveScroll: true,
                onError: () => toast.error('Failed to update house.'),
                onFinish: () => setProcessing(false),
            });
            return;
        }

        router.post('/houses-categories/houses', payload, {
            preserveScroll: true,
            onError: () => toast.error('Failed to add house.'),
            onFinish: () => setProcessing(false),
        });
    };

    const submitCategory = () => {
        if (!categoryForm.name.trim()) {
            toast.error('Enter a category name.');
            return;
        }

        setProcessing(true);
        const payload = {
            name: categoryForm.name,
            description: categoryForm.description,
            status: categoryForm.status,
            sort_order: Number(categoryForm.sortOrder) || 0,
        };

        if (mode === 'edit' && editingId !== null) {
            router.put(`/houses-categories/categories/${editingId}`, payload, {
                preserveScroll: true,
                onError: () => toast.error('Failed to update category.'),
                onFinish: () => setProcessing(false),
            });
            return;
        }

        router.post('/houses-categories/categories', payload, {
            preserveScroll: true,
            onError: () => toast.error('Failed to add category.'),
            onFinish: () => setProcessing(false),
        });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        setProcessing(true);
        const url =
            tab === 'houses'
                ? `/houses-categories/houses/${deleting.id}`
                : `/houses-categories/categories/${deleting.id}`;
        router.delete(url, {
            preserveScroll: true,
            onError: () => toast.error('Failed to delete.'),
            onFinish: () => {
                setProcessing(false);
                setDeleteOpen(false);
            },
        });
    };

    const submit = () => (tab === 'houses' ? submitHouse() : submitCategory());

    return (
        <DashboardLayout user={user} activeTab="houses-categories">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Houses & Categories')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Manage the houses and categories used to organize students.')}
                            </p>
                        </div>
                        <Button onClick={openAdd} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {tab === 'houses' ? t('Add House') : t('Add Category')}
                        </Button>
                    </div>

                    <div className="flex gap-1 rounded-lg bg-slate-200/60 p-1">
                        <button
                            type="button"
                            onClick={() => setTab('houses')}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                tab === 'houses'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Palette className="h-4 w-4" />
                            {t('Houses')} ({houses.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('categories')}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                tab === 'categories'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Flag className="h-4 w-4" />
                            {t('Categories')} ({categories.length})
                        </button>
                    </div>

                    {tab === 'houses' ? (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle>{t('Student Houses')}</CardTitle>
                                <CardDescription>
                                    {t('Houses group students for sports, events and competitions.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>{t('Name')}</TableHead>
                                                <TableHead>{t('Color')}</TableHead>
                                                <TableHead>{t('Students')}</TableHead>
                                                <TableHead>{t('Description')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                                <TableHead className="text-right">{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {houses.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                                        {t('No houses created yet.')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                houses.map((house, index) => (
                                                    <TableRow key={house.id}>
                                                        <TableCell className="text-sm text-slate-500">
                                                            {index + 1}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-slate-800">
                                                            {house.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                                                                <span
                                                                    className="inline-block h-4 w-4 rounded-full ring-1 ring-slate-200"
                                                                    style={{ backgroundColor: house.color }}
                                                                />
                                                                {house.color}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{house.studentCount}</Badge>
                                                        </TableCell>
                                                        <TableCell className="max-w-xs truncate text-sm text-slate-500">
                                                            {house.description || (
                                                                <span className="text-slate-400">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                className={
                                                                    house.status === 'active'
                                                                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                                                                }
                                                            >
                                                                {house.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => openEditHouse(house)}
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
                                                                        setDeleting({ id: house.id, name: house.name });
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
                    ) : (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle>{t('Student Categories')}</CardTitle>
                                <CardDescription>
                                    {t('Categories such as RTE, defence quota or general quota.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>{t('Name')}</TableHead>
                                                <TableHead>{t('Students')}</TableHead>
                                                <TableHead>{t('Description')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                                <TableHead className="text-right">{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {categories.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                        {t('No categories created yet.')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                categories.map((category, index) => (
                                                    <TableRow key={category.id}>
                                                        <TableCell className="text-sm text-slate-500">
                                                            {index + 1}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-slate-800">
                                                            {category.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{category.studentCount}</Badge>
                                                        </TableCell>
                                                        <TableCell className="max-w-xs truncate text-sm text-slate-500">
                                                            {category.description || (
                                                                <span className="text-slate-400">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                className={
                                                                    category.status === 'active'
                                                                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                                                                }
                                                            >
                                                                {category.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => openEditCategory(category)}
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
                                                                        setDeleting({
                                                                            id: category.id,
                                                                            name: category.name,
                                                                        });
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
                    )}
                </div>
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {tab === 'houses' ? <Palette className="h-5 w-5" /> : <Flag className="h-5 w-5" />}
                            {mode === 'edit'
                                ? tab === 'houses'
                                    ? t('Edit House')
                                    : t('Edit Category')
                                : tab === 'houses'
                                  ? t('Add House')
                                  : t('Add Category')}
                        </DialogTitle>
                        <DialogDescription>
                            {tab === 'houses'
                                ? t('A house groups students for inter-house competitions and events.')
                                : t('A category describes a student quota or admission type.')}
                        </DialogDescription>
                    </DialogHeader>
                    {tab === 'houses' ? (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="house-name">{t('House Name')}</Label>
                                <Input
                                    id="house-name"
                                    value={houseForm.name}
                                    onChange={(event) => setHouseForm({ ...houseForm, name: event.target.value })}
                                    placeholder={t('e.g. Blue House')}
                                />
                            </div>
                            <div>
                                <Label>{t('Color')}</Label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {HOUSE_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`h-8 w-8 rounded-full ring-2 transition-all ${
                                                houseForm.color === color
                                                    ? 'ring-slate-900 scale-110'
                                                    : 'ring-transparent hover:scale-105'
                                            }`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setHouseForm({ ...houseForm, color })}
                                            aria-label={color}
                                        />
                                    ))}
                                    <Input
                                        type="color"
                                        value={houseForm.color}
                                        onChange={(event) => setHouseForm({ ...houseForm, color: event.target.value })}
                                        className="h-9 w-14 cursor-pointer rounded-md p-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="house-description">{t('Description')}</Label>
                                <Input
                                    id="house-description"
                                    value={houseForm.description}
                                    onChange={(event) =>
                                        setHouseForm({ ...houseForm, description: event.target.value })
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="house-status">{t('Status')}</Label>
                                    <Select
                                        value={houseForm.status}
                                        onValueChange={(value) => setHouseForm({ ...houseForm, status: value })}
                                    >
                                        <SelectTrigger id="house-status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="house-sort">{t('Sort Order')}</Label>
                                    <Input
                                        id="house-sort"
                                        type="number"
                                        min={0}
                                        value={houseForm.sortOrder}
                                        onChange={(event) =>
                                            setHouseForm({ ...houseForm, sortOrder: event.target.value })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="category-name">{t('Category Name')}</Label>
                                <Input
                                    id="category-name"
                                    value={categoryForm.name}
                                    onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
                                    placeholder={t('e.g. RTE')}
                                />
                            </div>
                            <div>
                                <Label htmlFor="category-description">{t('Description')}</Label>
                                <Input
                                    id="category-description"
                                    value={categoryForm.description}
                                    onChange={(event) =>
                                        setCategoryForm({ ...categoryForm, description: event.target.value })
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="category-status">{t('Status')}</Label>
                                    <Select
                                        value={categoryForm.status}
                                        onValueChange={(value) => setCategoryForm({ ...categoryForm, status: value })}
                                    >
                                        <SelectTrigger id="category-status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="category-sort">{t('Sort Order')}</Label>
                                    <Input
                                        id="category-sort"
                                        type="number"
                                        min={0}
                                        value={categoryForm.sortOrder}
                                        onChange={(event) =>
                                            setCategoryForm({ ...categoryForm, sortOrder: event.target.value })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={submit} disabled={processing} className="gap-2">
                            <FolderPlus className="h-4 w-4" />
                            {processing
                                ? t('Saving...')
                                : mode === 'edit'
                                  ? t('Save Changes')
                                  : tab === 'houses'
                                    ? t('Add House')
                                    : t('Add Category')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{tab === 'houses' ? t('Delete House') : t('Delete Category')}</DialogTitle>
                        <DialogDescription>
                            {t('Are you sure you want to delete')} "{deleting?.name}"?{' '}
                            {t('Students assigned to it will keep the name but it will no longer be listed.')}
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
