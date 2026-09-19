import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Building2, Pencil, Plus, Trash2, Users } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface DepartmentRecord {
    id: number;
    name: string;
    users_count?: number;
}

interface DepartmentsProps {
    user: any;
    departments: DepartmentRecord[];
}

export default function Departments({ user, departments }: DepartmentsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('Departments')}</CardTitle>
                                <CardDescription>
                                    {t('Organize staff into departments across the organization.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <DepartmentSection departments={departments} />
            </div>
        </DashboardLayout>
    );
}

function DepartmentSection({ departments }: { departments: DepartmentRecord[] }) {
    const { t } = useLanguage();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<DepartmentRecord | null>(null);
    const [name, setName] = useState('');
    const [processing, setProcessing] = useState(false);
    const page = usePage() as any;
    const errors = (page.props as any).errors ?? {};

    useEffect(() => {
        if (errors.name) {
            setDialogOpen(true);
        }
    }, [errors.name]);

    const openAdd = () => {
        setEditing(null);
        setName('');
        setDialogOpen(true);
    };

    const openEdit = (department: DepartmentRecord) => {
        setEditing(department);
        setName(department.name);
        setDialogOpen(true);
    };

    const close = () => {
        setDialogOpen(false);
    };

    const submit = () => {
        if (!name.trim()) {
            toast.error(t('Enter a department name.'));
            return;
        }

        setProcessing(true);

        const payload = { name: name.trim() };
        const optionsRequest = {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
            },
            onError: () => {
                toast.error(editing ? t('Failed to update department.') : t('Failed to add department.'));
            },
            onFinish: () => setProcessing(false),
        };

        if (editing) {
            router.put(`/staff/departments/${editing.id}`, payload, optionsRequest);
        } else {
            router.post('/staff/departments', payload, optionsRequest);
        }
    };

    const remove = (department: DepartmentRecord) => {
        if (!window.confirm(t('Delete this department?'))) {
            return;
        }

        router.delete(`/staff/departments/${department.id}`, {
            preserveScroll: true,
            onError: () => toast.error(t('Failed to delete department.')),
        });
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle>{t('Department list')}</CardTitle>
                            <CardDescription>
                                {t('Departments identify where each staff member works.')}
                            </CardDescription>
                        </div>
                        <Button onClick={openAdd}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Add Department')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Department')}</TableHead>
                                    <TableHead>{t('No. of Staff')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {departments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-slate-500">
                                            {t('No departments added yet.')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    departments.map((department) => (
                                        <TableRow key={department.id}>
                                            <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                {department.name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="gap-1 bg-indigo-50 text-indigo-700">
                                                    <Users className="h-3 w-3" />
                                                    {department.users_count ?? 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEdit(department)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => remove(department)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
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

            <Dialog open={dialogOpen} onOpenChange={(open) => !open && close()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? t('Edit Department') : t('Add Department')}</DialogTitle>
                        <DialogDescription>{t('Enter the name of the department.')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Department Name')}</Label>
                            <Input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder={t('e.g. Science')}
                            />
                            {errors.name ? <p className="text-xs text-red-600">{errors.name}</p> : null}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={submit} disabled={processing}>
                            {editing ? t('Save Changes') : t('Add Department')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
