import { FormEvent, useState } from 'react';
import { LayoutTemplate, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { useLanguage } from '../../i18n/LanguageProvider';

interface TemplateRow {
    id: number;
    name: string;
    layout: string;
    show_rank: boolean;
    show_percentage: boolean;
    show_remarks: boolean;
    show_subject_wise_grade: boolean;
    header_color: string;
    remarks: string | null;
    is_default: boolean;
}

interface ReportCardSetupsProps {
    user: any;
    templates: TemplateRow[];
}

const emptyForm = {
    name: '',
    layout: 'standard',
    show_rank: false,
    show_percentage: true,
    show_remarks: true,
    show_subject_wise_grade: true,
    header_color: '#4f46e5',
    remarks: '',
    make_default: false,
};

export default function ReportCardSetups(pageProps: ReportCardSetupsProps) {
    const { t } = useLanguage();
    const { user, templates } = pageProps;
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<TemplateRow | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);

    const openCreate = () => {
        setForm(emptyForm);
        setCreating(true);
        setEditing(null);
    };

    const openEdit = (template: TemplateRow) => {
        setForm({
            name: template.name,
            layout: template.layout,
            show_rank: template.show_rank,
            show_percentage: template.show_percentage,
            show_remarks: template.show_remarks,
            show_subject_wise_grade: template.show_subject_wise_grade,
            header_color: template.header_color,
            remarks: template.remarks ?? '',
            make_default: template.is_default,
        });
        setEditing(template);
        setCreating(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);

        if (editing) {
            router.patch(`/report-card-setups/${editing.id}`, form, {
                preserveScroll: true,
                onSuccess: () => {
                    setCreating(false);
                    setEditing(null);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            });
        } else {
            router.post('/report-card-setups', form, {
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

    const setDefault = (template: TemplateRow) => {
        router.post(`/report-card-setups/${template.id}/default`, {}, { preserveScroll: true });
    };

    const confirmDelete = (template: TemplateRow) => {
        if (template.is_default) {
            window.alert('Set another template as default before deleting this one.');
            return;
        }
        if (!window.confirm(`Delete template "${template.name}"?`)) {
            return;
        }
        router.delete(`/report-card-setups/${template.id}`, { preserveScroll: true });
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            <LayoutTemplate className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            {t('Report Card Setups')}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {t('Design custom report card templates, layouts and remarks.')}
                        </p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('New Template')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {templates.length === 0 && (
                        <Card className="lg:col-span-2">
                            <CardContent className="py-10 text-center text-gray-400">
                                {t('No report card templates yet. Create your first one.')}
                            </CardContent>
                        </Card>
                    )}
                    {templates.map((template) => {
                        const { t } = useLanguage();
                        return (
                            <Card
                                key={template.id}
                                className={template.is_default ? 'border-indigo-300 dark:border-indigo-500/60' : ''}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-base">
                                                {template.name}
                                                {template.is_default && (
                                                    <Badge className="ml-2 bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">
                                                        {t('Default')}
                                                    </Badge>
                                                )}
                                            </CardTitle>
                                            <CardDescription>
                                                {t('Layout:')}
                                                {template.layout}
                                                {t('· Header color')}
                                                {template.header_color}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ul className="grid grid-cols-2 gap-1 text-sm text-gray-600 dark:text-gray-300">
                                        <li
                                            className={`flex items-center gap-1 ${template.show_rank ? '' : 'opacity-40'}`}
                                        >
                                            {t('• Rank')}
                                        </li>
                                        <li
                                            className={`flex items-center gap-1 ${template.show_percentage ? '' : 'opacity-40'}`}
                                        >
                                            {t('• Percentage')}
                                        </li>
                                        <li
                                            className={`flex items-center gap-1 ${template.show_remarks ? '' : 'opacity-40'}`}
                                        >
                                            {t('• Remarks')}
                                        </li>
                                        <li
                                            className={`flex items-center gap-1 ${template.show_subject_wise_grade ? '' : 'opacity-40'}`}
                                        >
                                            {t('• Subject-wise grade')}
                                        </li>
                                    </ul>
                                    {template.remarks && (
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            {t('Default remark:')}
                                            {template.remarks}
                                        </p>
                                    )}
                                    <div className="mt-4 flex items-center justify-end gap-2">
                                        {!template.is_default && (
                                            <Button variant="outline" size="sm" onClick={() => setDefault(template)}>
                                                <Star className="mr-2 h-4 w-4" />
                                                {t('Set Default')}
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(template)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            {t('Edit')}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-rose-500 hover:text-rose-600"
                                            onClick={() => confirmDelete(template)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            {t('Delete')}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Dialog
                    open={creating}
                    onOpenChange={(open) => {
                        if (!open) {
                            setCreating(false);
                            setEditing(null);
                        }
                    }}
                >
                    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editing ? t('Edit Template') : t('New Template')}</DialogTitle>
                            <DialogDescription>{t('Configure report card sections and options.')}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <Label>{t('Template Name *')}</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label>{t('Layout *')}</Label>
                                <Select
                                    value={form.layout}
                                    onValueChange={(value) => setForm({ ...form, layout: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="standard">{t('Standard')}</SelectItem>
                                        <SelectItem value="landscape">{t('Landscape')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Header Color')}</Label>
                                <Input
                                    type="color"
                                    value={form.header_color}
                                    onChange={(e) => setForm({ ...form, header_color: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label>{t('Show Rank')}</Label>
                                <Switch
                                    checked={form.show_rank}
                                    onCheckedChange={(checked) => setForm({ ...form, show_rank: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label>{t('Show Percentage')}</Label>
                                <Switch
                                    checked={form.show_percentage}
                                    onCheckedChange={(checked) => setForm({ ...form, show_percentage: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label>{t('Show Remarks')}</Label>
                                <Switch
                                    checked={form.show_remarks}
                                    onCheckedChange={(checked) => setForm({ ...form, show_remarks: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label>{t('Subject-wise Grade')}</Label>
                                <Switch
                                    checked={form.show_subject_wise_grade}
                                    onCheckedChange={(checked) =>
                                        setForm({ ...form, show_subject_wise_grade: checked })
                                    }
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label>{t('Default Remarks')}</Label>
                                <Textarea
                                    rows={3}
                                    value={form.remarks}
                                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center justify-between sm:col-span-2">
                                <Label>{t('Make default')}</Label>
                                <Switch
                                    checked={form.make_default}
                                    onCheckedChange={(checked) => setForm({ ...form, make_default: checked })}
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
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {editing ? t('Save Changes') : t('Create Template')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
