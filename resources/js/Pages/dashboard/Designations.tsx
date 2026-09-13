import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Briefcase, Pencil, Plus, Trash2, Users } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface DesignationRecord {
    id: number;
    name: string;
    users_count?: number;
}

interface DesignationsProps {
    user: any;
    designations: DesignationRecord[];
}

export default function Designations({ user, designations }: DesignationsProps) {
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
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <Briefcase className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('Designations')}</CardTitle>
                                <CardDescription>
                                    {t("Designations describe each staff member's role within the school.")}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <DesignationSection designations={designations} />
            </div>
        </DashboardLayout>
    );
}

function DesignationSection({ designations }: { designations: DesignationRecord[] }) {
    const { t } = useLanguage();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<DesignationRecord | null>(null);
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

    const openEdit = (designation: DesignationRecord) => {
        setEditing(designation);
        setName(designation.name);
        setDialogOpen(true);
    };

    const close = () => {
        setDialogOpen(false);
    };

    const submit = () => {
        if (!name.trim()) {
            toast.error(t('Enter a designation name.'));
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
                toast.error(editing ? t('Failed to update designation.') : t('Failed to add designation.'));
            },
            onFinish: () => setProcessing(false),
        };

        if (editing) {
            router.put(`/staff/designations/${editing.id}`, payload, optionsRequest);
        } else {
            router.post('/staff/designations', payload, optionsRequest);
        }
    };

    const remove = (designation: DesignationRecord) => {
        if (!window.confirm(t('Delete this designation?'))) {
            return;
        }

        router.delete(`/staff/designations/${designation.id}`, {
            preserveScroll: true,
            onError: () => toast.error(t('Failed to delete designation.')),
        });
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle>{t('Designation list')}</CardTitle>
                            <CardDescription>
                                {t('Assign a designation to every staff member with the matching role.')}
                            </CardDescription>
                        </div>
                        <Button onClick={openAdd}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Add Designation')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border border-slate-200 dark:border-gray-700">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Designation')}</TableHead>
                                    <TableHead>{t('No. of Staff')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {designations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-slate-500">
                                            {t('No designations added yet.')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    designations.map((designation) => (
                                        <TableRow key={designation.id}>
                                            <TableCell className="font-medium text-slate-800 dark:text-gray-100">
                                                {designation.name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="gap-1 bg-indigo-50 text-indigo-700"
                                                >
                                                    <Users className="h-3 w-3" />
                                                    {designation.users_count ?? 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEdit(designation)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => remove(designation)}
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
                        <DialogTitle>{editing ? t('Edit Designation') : t('Add Designation')}</DialogTitle>
                        <DialogDescription>
                            {t('Enter the name of the designation.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Designation Name')}</Label>
                            <Input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder={t('e.g. Principal')}
                            />
                            {errors.name ? <p className="text-xs text-red-600">{errors.name}</p> : null}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={submit} disabled={processing}>
                            {editing ? t('Save Changes') : t('Add Designation')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}