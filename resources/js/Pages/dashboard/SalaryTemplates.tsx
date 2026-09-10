import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { Banknote, Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { toast } from 'sonner';

type StaffOption = { id: number; name: string; role: string };
type TemplateRow = {
    id: number;
    name: string;
    basic: number;
    hra: number;
    specialAllowance: number;
    deductions: { name: string; amount: number }[];
    gross: number;
    netSalary: number;
    status: string;
    assignmentsCount: number;
    description: string | null;
};
type AssignmentRow = {
    id: number;
    staffName: string;
    staffRole: string;
    templateName: string;
    effectiveFrom: string;
    monthlyNet: number;
    status: string;
};

type Props = {
    templates: TemplateRow[];
    assignments: AssignmentRow[];
    staffOptions: StaffOption[];
    summary: { activeTemplates: number; activeAssignments: number; monthlyPayroll: number };
};

const EMPTY_DEDUCTION = { name: '', amount: '0' };

export default function SalaryTemplates({ templates, assignments, staffOptions, summary }: Props) {
    const { t } = useLanguage();
    const [editing, setEditing] = useState<TemplateRow | null>(null);
    const [name, setName] = useState('');
    const [basic, setBasic] = useState('');
    const [hra, setHra] = useState('0');
    const [specialAllowance, setSpecialAllowance] = useState('0');
    const [deductions, setDeductions] = useState<{ name: string; amount: string }[]>([{ ...EMPTY_DEDUCTION }]);
    const [status, setStatus] = useState('active');
    const [saving, setSaving] = useState(false);

    const [assignStaffId, setAssignStaffId] = useState('');
    const [assignTemplateId, setAssignTemplateId] = useState('');
    const [effectiveFrom, setEffectiveFrom] = useState('');
    const [assignSaving, setAssignSaving] = useState(false);

    const gross = (parseFloat(basic) || 0) + (parseFloat(hra) || 0) + (parseFloat(specialAllowance) || 0);
    const deductionTotal = deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const net = gross - deductionTotal;

    const startEdit = (row: TemplateRow) => {
        setEditing(row);
        setName(row.name);
        setBasic(String(row.basic));
        setHra(String(row.hra));
        setSpecialAllowance(String(row.specialAllowance));
        setDeductions(
            row.deductions.length > 0
                ? row.deductions.map((d) => ({ name: d.name, amount: String(d.amount) }))
                : [{ ...EMPTY_DEDUCTION }],
        );
        setStatus(row.status);
    };

    const reset = () => {
        setEditing(null);
        setName('');
        setBasic('');
        setHra('0');
        setSpecialAllowance('0');
        setDeductions([{ ...EMPTY_DEDUCTION }]);
        setStatus('active');
    };

    const submit = () => {
        if (!name.trim()) {
            toast.error(t('Template name is required.'));
            return;
        }
        setSaving(true);
        const payload = {
            name: name.trim(),
            basic: parseFloat(basic) || 0,
            hra: parseFloat(hra) || 0,
            special_allowance: parseFloat(specialAllowance) || 0,
            deductions: deductions
                .filter((d) => d.name.trim())
                .map((d) => ({ name: d.name.trim(), amount: parseFloat(d.amount) || 0 })),
            status,
        };
        if (editing) {
            router.put(`/staff/salary-templates/${editing.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    toast.success(t('Salary template updated.'));
                },
                onFinish: () => setSaving(false),
            });
        } else {
            router.post('/staff/salary-templates', payload, {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    toast.success(t('Salary template created.'));
                },
                onFinish: () => setSaving(false),
            });
        }
    };

    const removeTemplate = (row: TemplateRow) => {
        if (!window.confirm(t('Delete this salary template?'))) return;
        router.delete(`/staff/salary-templates/${row.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Salary template deleted.')),
        });
    };

    const submitAssignment = () => {
        if (!assignStaffId || !assignTemplateId || !effectiveFrom) {
            toast.error(t('Staff, template and effective date are required.'));
            return;
        }
        setAssignSaving(true);
        router.post(
            '/staff/salary-templates/assign',
            {
                staff_user_id: Number(assignStaffId),
                salary_template_id: Number(assignTemplateId),
                effective_from: effectiveFrom,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAssignStaffId('');
                    setAssignTemplateId('');
                    setEffectiveFrom('');
                    toast.success(t('Salary assigned.'));
                },
                onFinish: () => setAssignSaving(false),
            },
        );
    };

    const removeAssignment = (row: AssignmentRow) => {
        if (!window.confirm(t('Remove this salary assignment?'))) return;
        router.delete(`/staff/salary-templates/assign/${row.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Assignment removed.')),
        });
    };

    return (
        <DashboardLayout pageTitle={t('Salary Templates')}>
            <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Active Templates')}</p>
                                <p className="text-2xl font-bold">{summary.activeTemplates}</p>
                            </div>
                            <Banknote className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Assigned Staff')}</p>
                                <p className="text-2xl font-bold">{summary.activeAssignments}</p>
                            </div>
                            <UserCog className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Monthly Payroll')}</p>
                                <p className="text-2xl font-bold">₹{summary.monthlyPayroll.toFixed(2)}</p>
                            </div>
                            <Plus className="h-5 w-5" />
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{editing ? t('Edit Template') : t('New Salary Template')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1">
                                <Label>{t('Template Name')}</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('e.g. Primary Teacher')}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Basic')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={basic}
                                    onChange={(e) => setBasic(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('HRA')}</Label>
                                <Input type="number" min={0} value={hra} onChange={(e) => setHra(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Special Allowance')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={specialAllowance}
                                    onChange={(e) => setSpecialAllowance(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Deductions')}</Label>
                            {deductions.map((deduction, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        value={deduction.name}
                                        onChange={(e) =>
                                            setDeductions((prev) =>
                                                prev.map((d, i) => (i === index ? { ...d, name: e.target.value } : d)),
                                            )
                                        }
                                        placeholder={t('e.g. Provident Fund')}
                                    />
                                    <Input
                                        type="number"
                                        min={0}
                                        value={deduction.amount}
                                        onChange={(e) =>
                                            setDeductions((prev) =>
                                                prev.map((d, i) =>
                                                    i === index ? { ...d, amount: e.target.value } : d,
                                                ),
                                            )
                                        }
                                        className="w-32"
                                        placeholder="0.00"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setDeductions((prev) => prev.filter((_, i) => i !== index))}
                                        disabled={deductions.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeductions((prev) => [...prev, { ...EMPTY_DEDUCTION }])}
                            >
                                <Plus className="mr-1 h-4 w-4" /> {t('Add Deduction')}
                            </Button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <div className="text-sm">
                                <span className="text-muted-foreground">{t('Gross')}: </span>
                                <span className="font-bold">₹{gross.toFixed(2)}</span>
                                <span className="mx-3 text-muted-foreground">{t('Net')}: </span>
                                <span className="font-bold">₹{net.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={submit} disabled={saving}>
                                    {saving ? t('Saving...') : editing ? t('Update Template') : t('Create Template')}
                                </Button>
                                {editing && (
                                    <Button variant="outline" onClick={reset}>
                                        {t('Cancel')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Templates')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {templates.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">{t('No salary templates yet.')}</p>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Name')}</TableHead>
                                    <TableHead className="text-right">{t('Gross')}</TableHead>
                                    <TableHead className="text-right">{t('Net Salary')}</TableHead>
                                    <TableHead className="text-right">{t('Deductions')}</TableHead>
                                    <TableHead className="text-right">{t('Assigned')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell className="text-right">₹{row.gross.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            ₹{row.netSalary.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">{row.deductions.length}</TableCell>
                                        <TableCell className="text-right">{row.assignmentsCount}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
                                                {t(row.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost" onClick={() => startEdit(row)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => removeTemplate(row)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Assign Salary to Staff')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1">
                                <Label>{t('Staff Member')}</Label>
                                <Select value={assignStaffId} onValueChange={setAssignStaffId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select staff')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staffOptions.map((staff) => (
                                            <SelectItem key={staff.id} value={String(staff.id)}>
                                                {staff.name} ({staff.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Template')}</Label>
                                <Select value={assignTemplateId} onValueChange={setAssignTemplateId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select template')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map((template) => (
                                            <SelectItem key={template.id} value={String(template.id)}>
                                                {template.name} (₹{template.netSalary.toFixed(2)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Effective From')}</Label>
                                <Input
                                    type="date"
                                    value={effectiveFrom}
                                    onChange={(e) => setEffectiveFrom(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button onClick={submitAssignment} disabled={assignSaving}>
                            <Plus className="mr-2 h-4 w-4" />
                            {assignSaving ? t('Saving...') : t('Assign Salary')}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Staff Salary Assignments')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {assignments.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">{t('No salary assignments yet.')}</p>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Staff')}</TableHead>
                                    <TableHead>{t('Template')}</TableHead>
                                    <TableHead>{t('Effective From')}</TableHead>
                                    <TableHead className="text-right">{t('Monthly Net')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignments.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">
                                            {row.staffName}
                                            <span className="block text-xs text-muted-foreground">{row.staffRole}</span>
                                        </TableCell>
                                        <TableCell>{row.templateName}</TableCell>
                                        <TableCell>{row.effectiveFrom}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            ₹{row.monthlyNet.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
                                                {t(row.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost" onClick={() => removeAssignment(row)}>
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
