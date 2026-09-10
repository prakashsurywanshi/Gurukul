import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { CalendarCheck, Pencil, Plus, Trash2 } from 'lucide-react';
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

type LeaveTypeRow = {
    id: number;
    name: string;
    code: string | null;
    daysPerYear: number;
    approvalRequired: boolean;
    cashable: boolean;
    color: string | null;
    appliesTo: string;
    status: string;
    description: string | null;
};

type Props = {
    types: LeaveTypeRow[];
    summary: { activeCount: number };
};

const PALETTE = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];

export default function LeaveTypes({ types, summary }: Props) {
    const { t } = useLanguage();
    const [editing, setEditing] = useState<LeaveTypeRow | null>(null);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [daysPerYear, setDaysPerYear] = useState('0');
    const [approvalRequired, setApprovalRequired] = useState('true');
    const [cashable, setCashable] = useState('false');
    const [color, setColor] = useState(PALETTE[0]);
    const [appliesTo, setAppliesTo] = useState('staff');
    const [status, setStatus] = useState('active');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const startEdit = (row: LeaveTypeRow) => {
        setEditing(row);
        setName(row.name);
        setCode(row.code ?? '');
        setDaysPerYear(String(row.daysPerYear));
        setApprovalRequired(String(row.approvalRequired));
        setCashable(String(row.cashable));
        setColor(row.color ?? PALETTE[0]);
        setAppliesTo(row.appliesTo);
        setStatus(row.status);
        setDescription(row.description ?? '');
    };

    const reset = () => {
        setEditing(null);
        setName('');
        setCode('');
        setDaysPerYear('0');
        setApprovalRequired('true');
        setCashable('false');
        setColor(PALETTE[0]);
        setAppliesTo('staff');
        setStatus('active');
        setDescription('');
    };

    const submit = () => {
        if (!name.trim()) {
            toast.error(t('Leave type name is required.'));
            return;
        }
        setSaving(true);
        const payload = {
            name: name.trim(),
            code: code.trim() || null,
            days_per_year: parseFloat(daysPerYear) || 0,
            approval_required: approvalRequired === 'true',
            cashable: cashable === 'true',
            color,
            applies_to: appliesTo,
            status,
            description: description.trim() || null,
        };
        if (editing) {
            router.put(`/staff/leave-types/${editing.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    toast.success(t('Leave type updated.'));
                },
                onFinish: () => setSaving(false),
            });
        } else {
            router.post('/staff/leave-types', payload, {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    toast.success(t('Leave type added.'));
                },
                onFinish: () => setSaving(false),
            });
        }
    };

    const remove = (row: LeaveTypeRow) => {
        if (!window.confirm(t('Delete this leave type?'))) return;
        router.delete(`/staff/leave-types/${row.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Leave type deleted.')),
        });
    };

    return (
        <DashboardLayout pageTitle={t('Leave Types')}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{editing ? t('Edit Leave Type') : t('Add Leave Type')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                                <Label>{t('Name')}</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('e.g. Casual Leave')}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Code')}</Label>
                                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CL" />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Days Per Year')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={daysPerYear}
                                    onChange={(e) => setDaysPerYear(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Approval Required')}</Label>
                                <Select value={approvalRequired} onValueChange={setApprovalRequired}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Yes</SelectItem>
                                        <SelectItem value="false">No</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Cashable')}</Label>
                                <Select value={cashable} onValueChange={setCashable}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Yes</SelectItem>
                                        <SelectItem value="false">No</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Applies To')}</Label>
                                <Select value={appliesTo} onValueChange={setAppliesTo}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="staff">{t('Staff')}</SelectItem>
                                        <SelectItem value="student">{t('Student')}</SelectItem>
                                        <SelectItem value="both">{t('Both')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Status')}</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Color')}</Label>
                                <div className="flex items-center gap-2">
                                    {PALETTE.map((swatch) => (
                                        <button
                                            key={swatch}
                                            type="button"
                                            onClick={() => setColor(swatch)}
                                            className={`h-6 w-6 rounded-full border ${color === swatch ? 'ring-2 ring-ring ring-offset-1' : ''}`}
                                            style={{ backgroundColor: swatch }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>{t('Description')}</Label>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={submit} disabled={saving}>
                                <Plus className="mr-2 h-4 w-4" />
                                {saving ? t('Saving...') : editing ? t('Update Leave Type') : t('Add Leave Type')}
                            </Button>
                            {editing && (
                                <Button variant="outline" onClick={reset}>
                                    {t('Cancel')}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {t('Leave Type Catalogue')}{' '}
                            <span className="text-sm font-normal text-muted-foreground">
                                ({summary.activeCount} {t('active')})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {types.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">
                                {t('No leave types configured yet.')}
                            </p>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Name')}</TableHead>
                                    <TableHead>{t('Code')}</TableHead>
                                    <TableHead>{t('Days/Year')}</TableHead>
                                    <TableHead>{t('Approval')}</TableHead>
                                    <TableHead>{t('Applies To')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {types.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">
                                            <span
                                                className="mr-2 inline-block h-3 w-3 rounded-full"
                                                style={{ backgroundColor: row.color ?? '#8b5cf6' }}
                                            />
                                            {row.name}
                                        </TableCell>
                                        <TableCell>{row.code ?? '—'}</TableCell>
                                        <TableCell>{row.daysPerYear}</TableCell>
                                        <TableCell>
                                            {row.approvalRequired ? t('Required') : t('Not Required')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{row.appliesTo}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
                                                {t(row.status === 'active' ? 'Active' : 'Inactive')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost" onClick={() => startEdit(row)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => remove(row)}>
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
