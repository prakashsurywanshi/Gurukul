import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { BookOpenCheck, Plus, Trash2, Pencil } from 'lucide-react';
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

interface ClassRecord {
    id: number;
    name: string;
    section: string;
}
interface Subject {
    id: string;
    name: string;
}

interface Entry {
    id: string;
    entry_type: string;
    title: string;
    description?: string | null;
    entry_date?: string | null;
    class?: string | null;
    class_id?: number | null;
    subject?: string | null;
    subject_id?: string | null;
    created_by?: string | null;
}

interface Filters {
    class?: number | null;
    date?: string | null;
    type?: string | null;
}

interface ClassworkLogbookProps {
    user: any;
    organization?: { id: number; name: string } | null;
    classRecords: ClassRecord[];
    subjects: Subject[];
    entries: Entry[];
    filters: Filters;
}

const TYPES = ['classwork', 'logbook'] as const;
const TYPE_COLORS: Record<string, string> = {
    classwork: 'bg-blue-100 text-blue-800',
    logbook: 'bg-purple-100 text-purple-800',
};

const emptyForm = { entry_type: 'classwork', title: '', description: '', class_id: '', subject_id: '', entry_date: '' };

export default function ClassworkLogbook({
    user,
    organization,
    classRecords,
    subjects,
    entries,
    filters,
}: ClassworkLogbookProps) {
    const { t } = useLanguage();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);

    const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
    const [classFilter, setClassFilter] = useState(filters.class ? String(filters.class) : 'all');
    const [dateFilter, setDateFilter] = useState(filters.date || '');

    const applyFilters = (overrides: { type?: string; class?: string; date?: string }) => {
        const nextType = overrides.type !== undefined ? overrides.type : typeFilter;
        const nextClass = overrides.class !== undefined ? overrides.class : classFilter;
        const nextDate = overrides.date !== undefined ? overrides.date : dateFilter;
        const params: Record<string, string> = {};
        if (nextType !== 'all') params.type = nextType;
        if (nextClass !== 'all') params.class = nextClass;
        if (nextDate) params.date = nextDate;
        router.get('/classwork-logbook', params, { preserveState: true, replace: true });
    };

    const openNew = () => {
        setEditId(null);
        setForm(emptyForm);
        setDialogOpen(true);
    };
    const openEdit = (entry: Entry) => {
        setEditId(entry.id);
        setForm({
            entry_type: entry.entry_type,
            title: entry.title,
            description: entry.description ?? '',
            class_id: entry.class_id ? String(entry.class_id) : '',
            subject_id: entry.subject_id ?? '',
            entry_date: entry.entry_date ?? '',
        });
        setDialogOpen(true);
    };

    const submit = () => {
        const payload = {
            entry_type: form.entry_type,
            title: form.title,
            description: form.description || null,
            class_id: Number(form.class_id),
            subject_id: form.subject_id ? Number(form.subject_id) : null,
            entry_date: form.entry_date,
        };
        if (editId) {
            router.patch(`/classwork-logbook/${editId}`, payload, { onSuccess: () => setDialogOpen(false) });
        } else {
            router.post('/classwork-logbook', payload, { onSuccess: () => setDialogOpen(false) });
        }
    };

    const destroy = (id: string) => {
        if (!window.confirm('Delete this entry?')) return;
        router.delete(`/classwork-logbook/${id}`);
    };

    return (
        <DashboardLayout user={user} activeTab="classwork-logbook">
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('Classwork & Logbook')}</h1>
                        <p className="text-gray-600 mt-1">
                            {t('Record daily classwork activities and keep a teaching logbook')}
                        </p>
                    </div>
                    <Button className="gap-2" onClick={openNew}>
                        <Plus className="w-4 h-4" />
                        {t('Add Entry')}
                    </Button>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{t('Entries')}</CardTitle>
                        <div className="flex items-center gap-3">
                            <Select
                                value={typeFilter}
                                onValueChange={(v) => {
                                    setTypeFilter(v);
                                    applyFilters({ type: v });
                                }}
                            >
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder={t('All Types')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Types')}</SelectItem>
                                    {TYPES.map((tp) => (
                                        <SelectItem key={tp} value={tp}>
                                            {tp}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={classFilter}
                                onValueChange={(v) => {
                                    setClassFilter(v);
                                    applyFilters({ class: v });
                                }}
                            >
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder={t('All Classes')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Classes')}</SelectItem>
                                    {classRecords.map((cr) => (
                                        <SelectItem key={cr.id} value={String(cr.id)}>
                                            {cr.name}-{cr.section}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => {
                                    setDateFilter(e.target.value);
                                    applyFilters({ date: e.target.value });
                                }}
                                className="w-40"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Date')}</TableHead>
                                    <TableHead>{t('Type')}</TableHead>
                                    <TableHead>{t('Title')}</TableHead>
                                    <TableHead>{t('Class')}</TableHead>
                                    <TableHead>{t('Subject')}</TableHead>
                                    <TableHead>{t('Created By')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-sm">{entry.entry_date || '-'}</TableCell>
                                        <TableCell>
                                            <Badge className={`${TYPE_COLORS[entry.entry_type] || ''} text-xs`}>
                                                {entry.entry_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{entry.title}</TableCell>
                                        <TableCell className="text-sm">{entry.class || '-'}</TableCell>
                                        <TableCell className="text-sm">{entry.subject || '-'}</TableCell>
                                        <TableCell className="text-sm">{entry.created_by || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => openEdit(entry)}>
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => destroy(entry.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {entries.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                            {t('No records found.')}
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
                            <DialogTitle>{editId ? t('Edit Entry') : t('Add Entry')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('Type')}</label>
                                    <Select
                                        value={form.entry_type}
                                        onValueChange={(v) => setForm({ ...form, entry_type: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TYPES.map((tp) => (
                                                <SelectItem key={tp} value={tp}>
                                                    {tp}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('Date')}</label>
                                    <Input
                                        type="date"
                                        value={form.entry_date}
                                        onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('Title')}</label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('Description')}</label>
                                <Textarea
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('Class')}</label>
                                    <Select
                                        value={form.class_id}
                                        onValueChange={(v) => setForm({ ...form, class_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select class')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classRecords.map((cr) => (
                                                <SelectItem key={cr.id} value={String(cr.id)}>
                                                    {cr.name}-{cr.section}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('Subject')}</label>
                                    <Select
                                        value={form.subject_id}
                                        onValueChange={(v) => setForm({ ...form, subject_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select subject')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjects.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button onClick={submit} disabled={!form.title || !form.class_id || !form.entry_date}>
                                {t('Save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
