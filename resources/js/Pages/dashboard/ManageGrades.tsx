import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import type { RequestPayload } from '@inertiajs/core';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface GradeRow {
    grade: string;
    min: number;
    max: number;
    point: number;
    remark: string;
}

interface EditingRow {
    grade: string;
    min: string;
    max: string;
    point: string;
    remark: string;
}

export default function ManageGrades({
    user,
    gradeScale,
    isDefault,
}: {
    user: any;
    gradeScale: GradeRow[];
    isDefault: boolean;
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [rows, setRows] = useState<GradeRow[]>(gradeScale);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [form, setForm] = useState<EditingRow>({
        grade: '',
        min: '',
        max: '',
        point: '',
        remark: '',
    });
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
        setEditingIndex(null);
        setForm({ grade: '', min: '', max: '', point: '', remark: '' });
        setModalOpen(true);
    };

    const openEdit = (index: number) => {
        const row = rows[index];
        setEditingIndex(index);
        setForm({
            grade: row.grade,
            min: String(row.min),
            max: String(row.max),
            point: String(row.point),
            remark: row.remark,
        });
        setModalOpen(true);
    };

    const submitRow = () => {
        const grade = form.grade.trim();

        if (!grade) {
            toast.error('Enter a grade name.');
            return;
        }

        const min = Number(form.min);
        const max = Number(form.max);
        const point = Number(form.point);

        if (!Number.isFinite(min) || !Number.isFinite(max)) {
            toast.error('Enter valid minimum and maximum percentages.');
            return;
        }

        const updated = [...rows];

        if (editingIndex !== null) {
            updated[editingIndex] = {
                grade,
                min,
                max,
                point: Number.isFinite(point) ? point : 0,
                remark: form.remark,
            };
        } else {
            updated.push({
                grade,
                min,
                max,
                point: Number.isFinite(point) ? point : 0,
                remark: form.remark,
            });
        }

        setRows(updated.sort((a, b) => b.min - a.min));
        setModalOpen(false);
    };

    const removeRow = (index: number) => {
        setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    };

    const save = () => {
        if (rows.length === 0) {
            toast.error('Add at least one grade.');
            return;
        }

        setProcessing(true);
        router.post('/grades', { rows } as unknown as RequestPayload, {
            preserveScroll: true,
            onError: () => toast.error('Failed to save grading scale.'),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <DashboardLayout user={user} activeTab="manage-grades">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Manage Grades')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Percentage ranges used to derive grades on report cards and marksheets.')}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={openAdd} className="gap-2">
                                <Plus className="h-4 w-4" />
                                {t('Add New Grade')}
                            </Button>
                            <Button onClick={save} disabled={processing} className="gap-2">
                                <Save className="h-4 w-4" />
                                {processing ? t('Saving...') : t('Save')}
                            </Button>
                        </div>
                    </div>

                    {isDefault && (
                        <Card className="border-amber-200 bg-amber-50/60">
                            <CardHeader>
                                <CardDescription>
                                    {t(
                                        'You are editing the default grading scale. Save to keep these changes for this school.',
                                    )}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Grades')}</CardTitle>
                            <CardDescription>
                                {t(
                                    'Higher percentage ranges win first. Grades are applied automatically when marks are saved.',
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>{t('Grade Name')}</TableHead>
                                            <TableHead>{t('Percentage Range')}</TableHead>
                                            <TableHead>{t('Points')}</TableHead>
                                            <TableHead>{t('Description')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                    {t('Nothing here yet. Add your first grade.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            rows.map((row, index) => (
                                                <TableRow key={`${row.grade}-${row.min}-${index}`}>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                                                            {row.grade}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        {row.min}% - {row.max}%
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        {row.point.toFixed(1)}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        {row.remark || <span className="text-slate-400">-</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-1.5"
                                                                onClick={() => openEdit(index)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                                {t('Edit')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-1.5 text-red-600 hover:bg-red-50"
                                                                onClick={() => removeRow(index)}
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
                </div>

                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingIndex !== null ? t('Edit Grade') : t('Add New Grade')}</DialogTitle>
                            <DialogDescription>{t('Set the grade name and its percentage range.')}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="space-y-2">
                                <Label>{t('Grade Name')}</Label>
                                <Input
                                    value={form.grade}
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, grade: event.target.value }))
                                    }
                                    placeholder={t('e.g. A1')}
                                    className="max-w-[120px] font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('Minimum %')}</Label>
                                    <Input
                                        type="number"
                                        value={form.min}
                                        onChange={(event) =>
                                            setForm((current) => ({ ...current, min: event.target.value }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Maximum %')}</Label>
                                    <Input
                                        type="number"
                                        value={form.max}
                                        onChange={(event) =>
                                            setForm((current) => ({ ...current, max: event.target.value }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Points')}</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={form.point}
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, point: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Description')}</Label>
                                <Input
                                    value={form.remark}
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, remark: event.target.value }))
                                    }
                                    placeholder={t('e.g. Outstanding')}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="button" onClick={submitRow}>
                                {t('Save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
