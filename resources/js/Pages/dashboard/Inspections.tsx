import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { ClipboardCheck, Plus, Trash2, Pencil } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { router } from '@inertiajs/react';

interface Inspection {
    id: string;
    title: string;
    inspector_name?: string | null;
    inspection_type: string;
    scheduled_date?: string | null;
    status: string;
    score?: number | null;
    findings?: string | null;
    completed_at?: string | null;
    created_by?: string | null;
}

interface InspectionsProps {
    user: any;
    organization?: { id: number; name: string } | null;
    inspections: Inspection[];
}

const TYPE_OPTIONS = ['facility', 'academic', 'health', 'safety', 'compliance'] as const;
const STATUS_OPTIONS = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
const STATUS_COLORS: Record<string, string> = {
    planned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-gray-100 text-gray-500',
};
const TYPE_COLORS: Record<string, string> = {
    facility: 'bg-purple-100 text-purple-800',
    academic: 'bg-blue-100 text-blue-800',
    health: 'bg-red-100 text-red-800',
    safety: 'bg-orange-100 text-orange-800',
    compliance: 'bg-emerald-100 text-emerald-800',
};

const emptyForm = {
    title: '',
    inspector_name: '',
    inspection_type: 'compliance',
    scheduled_date: '',
    status: 'planned',
    score: '',
    findings: '',
};

export default function Inspections({ user, organization, inspections }: InspectionsProps) {
    const { t } = useLanguage();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [statusFilter, setStatusFilter] = useState('all');

    const filtered = inspections.filter((i) => statusFilter === 'all' || i.status === statusFilter);
    const planned = inspections.filter((i) => i.status === 'planned').length;
    const inProgress = inspections.filter((i) => i.status === 'in_progress').length;
    const completed = inspections.filter((i) => i.status === 'completed').length;

    const openNew = () => {
        setEditId(null);
        setForm(emptyForm);
        setDialogOpen(true);
    };
    const openEdit = (insp: Inspection) => {
        setEditId(insp.id);
        setForm({
            title: insp.title,
            inspector_name: insp.inspector_name ?? '',
            inspection_type: insp.inspection_type,
            scheduled_date: insp.scheduled_date ?? '',
            status: insp.status,
            score: insp.score != null ? String(insp.score) : '',
            findings: insp.findings ?? '',
        });
        setDialogOpen(true);
    };

    const submit = () => {
        const payload = {
            title: form.title,
            inspector_name: form.inspector_name || null,
            inspection_type: form.inspection_type,
            scheduled_date: form.scheduled_date || null,
            status: form.status,
            score: form.score ? Number(form.score) : null,
            findings: form.findings || null,
        };
        if (editId) {
            router.patch(`/inspections/${editId}`, payload, { onSuccess: () => setDialogOpen(false) });
        } else {
            router.post('/inspections', payload, { onSuccess: () => setDialogOpen(false) });
        }
    };

    const destroy = (id: string) => {
        if (!window.confirm('Delete this inspection?')) return;
        router.delete(`/inspections/${id}`);
    };

    return (
        <DashboardLayout user={user} activeTab="inspections">
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('Inspections')}</h1>
                        <p className="text-gray-600 mt-1">{t('Plan, record, and track inspections')}</p>
                    </div>
                    <Button className="gap-2" onClick={openNew}>
                        <Plus className="w-4 h-4" />
                        {t('Add Inspection')}
                    </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <ClipboardCheck className="w-5 h-5 text-blue-600" />
                            <div>
                                <div className="text-xl font-bold">{planned}</div>
                                <div className="text-xs text-gray-500">{t('Planned')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <ClipboardCheck className="w-5 h-5 text-amber-600" />
                            <div>
                                <div className="text-xl font-bold">{inProgress}</div>
                                <div className="text-xs text-gray-500">{t('In Progress')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                            <div>
                                <div className="text-xl font-bold">{completed}</div>
                                <div className="text-xs text-gray-500">{t('Completed')}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{t('All Inspections')}</CardTitle>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Statuses')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                {STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s.replace('_', ' ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Title')}</TableHead>
                                    <TableHead>{t('Type')}</TableHead>
                                    <TableHead>{t('Inspector')}</TableHead>
                                    <TableHead>{t('Date')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((insp) => (
                                    <TableRow key={insp.id}>
                                        <TableCell className="font-medium">{insp.title}</TableCell>
                                        <TableCell>
                                            <Badge
                                                className={`${TYPE_COLORS[insp.inspection_type] || 'bg-gray-100 text-gray-600'} text-xs`}
                                            >
                                                {insp.inspection_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{insp.inspector_name || '-'}</TableCell>
                                        <TableCell>{insp.scheduled_date || '-'}</TableCell>
                                        <TableCell>
                                            <Badge className={`${STATUS_COLORS[insp.status] || ''} text-xs`}>
                                                {insp.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => openEdit(insp)}>
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => destroy(insp.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                            {t('No inspections found')}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editId ? t('Edit Inspection') : t('Add Inspection')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('Title')}</label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('Type')}</label>
                                    <Select
                                        value={form.inspection_type}
                                        onValueChange={(v) => setForm({ ...form, inspection_type: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TYPE_OPTIONS.map((tp) => (
                                                <SelectItem key={tp} value={tp}>
                                                    {tp}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('Inspector')}</label>
                                    <Input
                                        value={form.inspector_name}
                                        onChange={(e) => setForm({ ...form, inspector_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('Scheduled Date')}</label>
                                    <Input
                                        type="date"
                                        value={form.scheduled_date}
                                        onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('Status')}</label>
                                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {s.replace('_', ' ')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('Score')} (1-10)</label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={form.score}
                                    onChange={(e) => setForm({ ...form, score: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('Findings')}</label>
                                <Textarea
                                    rows={3}
                                    value={form.findings}
                                    onChange={(e) => setForm({ ...form, findings: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button onClick={submit} disabled={!form.title}>
                                {t('Save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
