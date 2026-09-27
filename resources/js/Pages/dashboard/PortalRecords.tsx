import { useMemo, useState } from 'react';
import axios from 'axios';
import {
    Building2,
    Download,
    FileSpreadsheet,
    FileText,
    GraduationCap,
    Landmark,
    Plus,
    Users,
    X,
    Pencil,
    Trash2,
    SignalHigh,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';
import { getCsrfToken } from '../../lib/csrf';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

type SheetColumn = {
    label: string;
    required: boolean;
    filled: number;
    coverage: number;
};

type SheetReadiness = {
    name: string;
    entity: 'school' | 'student' | 'staff';
    entityCount: number;
    readyCount: number;
    rowsNeedingAttention: number;
    attentionNames: string[];
    requiredCoverage: number;
    columns: SheetColumn[];
};

type Preset = {
    key: string;
    label: string;
    description: string;
    state: string;
    sheets: SheetReadiness[];
};

type CustomTemplateColumn = {
    label: string;
    source: string | null;
    static: string | null;
    required: boolean;
    type: string;
    lookup: string | null;
};

type CustomTemplateSheet = {
    name: string;
    entity: 'school' | 'student' | 'staff';
    columns: CustomTemplateColumn[];
};

type CustomTemplate = {
    id: string;
    name: string;
    description: string;
    sheets: CustomTemplateSheet[];
    readiness: SheetReadiness[];
};

type ColumnForm = {
    label: string;
    source: string;
    static: string;
    required: boolean;
    type: string;
    lookup: string;
};

type SheetForm = {
    name: string;
    entity: 'school' | 'student' | 'staff';
    columns: ColumnForm[];
};

type TemplateForm = {
    name: string;
    description: string;
    sheets: SheetForm[];
};

export type PortalRecordsProps = {
    user: any;
    states: Record<string, string>;
    currentState: string;
    presets: Preset[];
    customTemplates: CustomTemplate[];
    fieldLabels: Record<string, string>;
    lookups: string[];
    udiseCode: string;
    academicYear: string;
};

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    school: Building2,
    student: GraduationCap,
    staff: Users,
};

const ENTITY_LABELS: Record<string, string> = {
    school: 'School',
    student: 'Student',
    staff: 'Staff',
};

export default function PortalRecords({
    user,
    states,
    currentState,
    presets,
    customTemplates,
    fieldLabels,
    lookups,
    udiseCode,
    academicYear,
}: PortalRecordsProps) {
    const { t } = useLanguage();
    const [templateOpen, setTemplateOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<string | null>(null);
    const [templateForm, setTemplateForm] = useState<TemplateForm | null>(null);
    const [saving, setSaving] = useState(false);

    const csrfHeaders = useMemo(
        () => ({
            'X-XSRF-TOKEN': getCsrfToken(),
        }),
        [],
    );

    const changeState = async (state: string) => {
        try {
            await axios.patch(
                '/portal-records/state',
                { state },
                { headers: csrfHeaders },
            );
            window.location.reload();
        } catch {
            // state change failed; keep current selection
        }
    };

    const exportUrl = (schema: string, mode: 'filled' | 'blank', format: 'xlsx' | 'csv' | 'csv-zip', sheet?: string) => {
        const params = new URLSearchParams({ schema, mode, format });
        if (sheet) {
            params.set('sheet', sheet);
        }
        return `/portal-records/export?${params.toString()}`;
    };

    const openNewTemplate = () => {
        setEditingIndex(null);
        setTemplateForm({
            name: '',
            description: '',
sheets: [
                    {
                        name: 'Sheet 1',
                        entity: 'student',
                        columns: [{ label: '', source: '', static: '', required: false, type: 'auto', lookup: '' }],
                    },
                ],
        });
        setTemplateOpen(true);
    };

    const openEditTemplate = (index: string, template: CustomTemplate) => {
        setEditingIndex(index);
        setTemplateForm({
            name: template.name,
            description: template.description || '',
            sheets: template.sheets.map((sheet): SheetForm => ({
                name: sheet.name,
                entity: sheet.entity,
                columns: sheet.columns.map((column): ColumnForm => ({
                    label: column.label,
                    source: column.source ?? '',
                    static: column.static ?? '',
                    required: column.required,
                    type: column.type || 'auto',
                    lookup: column.lookup ?? '',
                })),
            })),
        });
        setTemplateOpen(true);
    };

    const fieldsForEntity = (entity: string) =>
        Object.keys(fieldLabels).filter((key) => key.startsWith(`${entity}.`));

    const updateSheet = (sheetIndex: number, patch: Partial<SheetForm>) => {
        setTemplateForm((current) => {
            if (!current) return current;
            const sheets = current.sheets.map((sheet, index) => (index === sheetIndex ? { ...sheet, ...patch } : sheet));
            return { ...current, sheets };
        });
    };

    const updateColumn = (sheetIndex: number, columnIndex: number, patch: Partial<ColumnForm>) => {
        setTemplateForm((current) => {
            if (!current) return current;
            const sheets = current.sheets.map((sheet, index) => {
                if (index !== sheetIndex) return sheet;
                const columns = sheet.columns.map((column, cIndex) =>
                    cIndex === columnIndex ? { ...column, ...patch } : column,
                );
                return { ...sheet, columns };
            });
            return { ...current, sheets };
        });
    };

    const addColumn = (sheetIndex: number) => {
        setTemplateForm((current) => {
            if (!current) return current;
            const sheets = current.sheets.map((sheet, index) =>
                index === sheetIndex
                    ? {
                          ...sheet,
                          columns: [
                              ...sheet.columns,
                              { label: '', source: '', static: '', required: false, type: 'auto', lookup: '' },
                          ],
                      }
                    : sheet,
            );
            return { ...current, sheets };
        });
    };

    const removeColumn = (sheetIndex: number, columnIndex: number) => {
        setTemplateForm((current) => {
            if (!current) return current;
            const sheets = current.sheets.map((sheet, index) =>
                index === sheetIndex
                    ? { ...sheet, columns: sheet.columns.filter((_, cIndex) => cIndex !== columnIndex) }
                    : sheet,
            );
            return { ...current, sheets };
        });
    };

    const addSheet = () => {
        setTemplateForm((current) => {
            if (!current) return current;
            return {
                ...current,
                sheets: [
                    ...current.sheets,
                    {
                        name: `Sheet ${current.sheets.length + 1}`,
                        entity: 'student',
                        columns: [{ label: '', source: '', static: '', required: false, type: 'auto', lookup: '' }],
                    },
                ],
            };
        });
    };

    const removeSheet = (sheetIndex: number) => {
        setTemplateForm((current) => {
            if (!current) return current;
            return { ...current, sheets: current.sheets.filter((_, index) => index !== sheetIndex) };
        });
    };

    const saveTemplate = async () => {
        if (!templateForm || !templateForm.name.trim()) return;
        setSaving(true);

        try {
            if (editingIndex !== null) {
                await axios.patch(`/portal-records/templates/${editingIndex}`, templateForm, { headers: csrfHeaders });
            } else {
                await axios.post('/portal-records/templates', templateForm, { headers: csrfHeaders });
            }
            window.location.reload();
        } catch {
            setSaving(false);
        }
    };

    const deleteTemplate = async (index: string) => {
        if (!window.confirm('Delete this custom template?')) return;

        try {
            await axios.delete(`/portal-records/templates/${index}`, { headers: csrfHeaders });
            window.location.reload();
        } catch {
            // deletion failed
        }
    };

    const viewRecordsHref = (sheet: SheetReadiness): string | null => {
        const attentionName = sheet.attentionNames[0] ?? '';
        const query = attentionName ? `?q=${encodeURIComponent(attentionName)}` : '';

        switch (sheet.entity) {
            case 'student':
                return `/students${query}`;
            case 'staff':
                return `/staff${query}`;
            case 'school':
                return `/compliance/profile`;
            default:
                return null;
        }
    };

    const renderSheetRow = (sheet: SheetReadiness, baseUrl: string) => {
        const Icon = ENTITY_ICONS[sheet.entity] ?? FileSpreadsheet;
        const readyPct = sheet.entityCount > 0 ? Math.round((sheet.readyCount / sheet.entityCount) * 100) : 100;
        const viewHref = viewRecordsHref(sheet);

        return (
            <div key={sheet.name} className="rounded-lg border">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-primary" />
                        <p className="truncate text-sm font-medium">{sheet.name}</p>
                        <Badge variant="secondary">{t(ENTITY_LABELS[sheet.entity])}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {viewHref && sheet.rowsNeedingAttention > 0 && (
                            <a href={viewHref}>
                                <Button type="button" size="sm" variant="outline">
                                    <Pencil className="mr-1 h-3.5 w-3.5" />
                                    {t('View records')}
                                </Button>
                            </a>
                        )}
                        <a href={exportUrl(baseUrl, 'filled', 'csv', sheet.name)}>
                            <Button type="button" size="sm" variant="outline">
                                <FileText className="mr-1 h-3.5 w-3.5" />
                                CSV
                            </Button>
                        </a>
                        <a href={exportUrl(baseUrl, 'blank', 'csv', sheet.name)}>
                            <Button type="button" size="sm" variant="outline">
                                <FileText className="mr-1 h-3.5 w-3.5" />
                                CSV {t('Blank')}
                            </Button>
                        </a>
                    </div>
                </div>

                <div className="space-y-3 p-3">
                    <div className="grid gap-3 text-sm sm:grid-cols-4">
                        <div className="rounded-md bg-muted p-2">
                            <p className="text-xs text-muted-foreground">{t('Records')}</p>
                            <p className="text-lg font-semibold">{sheet.entityCount}</p>
                        </div>
                        <div className="rounded-md bg-muted p-2">
                            <p className="text-xs text-muted-foreground">{t('Ready')}</p>
                            <p className="text-lg font-semibold text-emerald-600">{sheet.readyCount}</p>
                        </div>
                        <div className="rounded-md bg-muted p-2">
                            <p className="text-xs text-muted-foreground">{t('Need attention')}</p>
                            <p className={`text-lg font-semibold ${sheet.rowsNeedingAttention > 0 ? 'text-amber-600' : ''}`}>
                                {sheet.rowsNeedingAttention}
                            </p>
                        </div>
                        <div className="rounded-md bg-muted p-2">
                            <p className="text-xs text-muted-foreground">{t('Required coverage')}</p>
                            <p className="text-lg font-semibold">{sheet.requiredCoverage}%</p>
                        </div>
                    </div>

                    <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{t('Ready records')}</span>
                            <span className="font-medium">{readyPct}%</span>
                        </div>
                        <Progress value={readyPct} className="h-2" />
                    </div>

                    {sheet.rowsNeedingAttention > 0 && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                            <p className="font-medium">{t('Records missing required fields:')}</p>
                            <p className="mt-0.5">
                                {sheet.attentionNames.length > 0 ? sheet.attentionNames.join(', ') : `${sheet.rowsNeedingAttention} ${t('records')}`}
                            </p>
                        </div>
                    )}

                    <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            {t('Columns')} ({sheet.columns.length})
                        </summary>
                        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                            {sheet.columns.map((column) => (
                                <div key={column.label} className="flex items-center justify-between rounded-md border px-2 py-1.5">
                                    <span className="truncate pr-2">
                                        {column.required && <span className="text-rose-500">* </span>}
                                        {column.label}
                                    </span>
                                    <span className={column.coverage === 100 ? 'font-semibold text-emerald-600' : 'text-muted-foreground'}>
                                        {column.filled}/{sheet.entityCount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            </div>
        );
    };

    const renderPreset = (preset: Preset) => (
        <Card key={preset.key}>
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{preset.label}</CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <a href={exportUrl(preset.key, 'filled', 'xlsx')}>
                            <Button type="button" size="sm">
                                <Download className="mr-1 h-4 w-4" />
                                XLSX {t('Filled')}
                            </Button>
                        </a>
                        <a href={exportUrl(preset.key, 'blank', 'xlsx')}>
                            <Button type="button" size="sm" variant="outline">
                                <FileSpreadsheet className="mr-1 h-4 w-4" />
                                XLSX {t('Blank')}
                            </Button>
                        </a>
                        <a href={exportUrl(preset.key, 'filled', 'csv-zip')}>
                            <Button type="button" size="sm" variant="outline">
                                <FileText className="mr-1 h-4 w-4" />
                                CSV (ZIP)
                            </Button>
                        </a>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">{preset.description}</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
                {preset.sheets.map((sheet) => renderSheetRow(sheet, preset.key))}
            </CardContent>
        </Card>
    );

    const renderTemplate = (template: CustomTemplate, index: string) => (
        <Card key={template.id ?? index}>
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge variant="secondary">{t('Custom')}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <a href={exportUrl(`custom:${index}`, 'filled', 'xlsx')}>
                            <Button type="button" size="sm">
                                <Download className="mr-1 h-4 w-4" />
                                XLSX {t('Filled')}
                            </Button>
                        </a>
                        <a href={exportUrl(`custom:${index}`, 'blank', 'xlsx')}>
                            <Button type="button" size="sm" variant="outline">
                                <FileSpreadsheet className="mr-1 h-4 w-4" />
                                XLSX {t('Blank')}
                            </Button>
                        </a>
                        <a href={exportUrl(`custom:${index}`, 'filled', 'csv-zip')}>
                            <Button type="button" size="sm" variant="outline">
                                <FileText className="mr-1 h-4 w-4" />
                                CSV (ZIP)
                            </Button>
                        </a>
                        <Button type="button" size="sm" variant="ghost" onClick={() => openEditTemplate(index, template)}>
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => deleteTemplate(index)}>
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </Button>
                    </div>
                </div>
                {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
                {template.readiness.map((sheet) => renderSheetRow(sheet, `custom:${index}`))}
            </CardContent>
        </Card>
    );

    const renderTemplateDialog = () => {
        if (!templateForm) return null;

        return (
            <Dialog open={templateOpen} onOpenChange={(open) => !open && setTemplateOpen(false)}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingIndex !== null ? t('Edit Template') : t('New Template')}</DialogTitle>
                        <DialogDescription>
                            {t('Define columns from the field catalog or static values. Generate a template to match any portal format.')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>{t('Template Name')}</Label>
                                <Input
                                    value={templateForm.name}
                                    onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })}
                                    placeholder="e.g. CBSE DCF 2026"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>{t('Description')}</Label>
                                <Input
                                    value={templateForm.description}
                                    onChange={(event) =>
                                        setTemplateForm({ ...templateForm, description: event.target.value })
                                    }
                                    placeholder={t('Optional')}
                                />
                            </div>
                        </div>

                        {templateForm.sheets.map((sheet, sheetIndex) => (
                            <div key={sheetIndex} className="rounded-lg border p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-medium">
                                        {t('Sheet')} {sheetIndex + 1}
                                    </p>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => removeSheet(sheetIndex)}>
                                        <X className="h-3.5 w-3.5 text-rose-500" />
                                    </Button>
                                </div>

                                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label>{t('Sheet Name')}</Label>
                                        <Input
                                            value={sheet.name}
                                            onChange={(event) => updateSheet(sheetIndex, { name: event.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>{t('Entity')}</Label>
                                        <Select
                                            value={sheet.entity}
                                            onValueChange={(entity) =>
                                                updateSheet(sheetIndex, {
                                                    entity: entity as SheetForm['entity'],
                                                    columns: sheet.columns.map((column) => ({
                                                        ...column,
                                                        source: '',
                                                        static: '',
                                                    })),
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(ENTITY_LABELS).map((entity) => (
                                                    <SelectItem key={entity} value={entity}>
                                                        {t(ENTITY_LABELS[entity])}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-2">
                                    {sheet.columns.map((column, columnIndex) => (
                                        <div key={columnIndex} className="rounded-md border p-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    {t('Column')} {columnIndex + 1}
                                                </p>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => removeColumn(sheetIndex, columnIndex)}
                                                >
                                                    <X className="h-3 w-3 text-rose-500" />
                                                </Button>
                                            </div>
                                            <div className="mt-1.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                                <div className="space-y-1 sm:col-span-2">
                                                    <Label className="text-xs">{t('Column Label')}</Label>
                                                    <Input
                                                        value={column.label}
                                                        onChange={(event) =>
                                                            updateColumn(sheetIndex, columnIndex, { label: event.target.value })
                                                        }
                                                        placeholder="e.g. Teacher National Code"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">{t('Field')}</Label>
                                                    <Select
                                                        value={column.source === '' ? '__static__' : column.source}
                                                        onValueChange={(source) => {
                                                            const safe = source === '__static__' ? '' : source;
                                                            const label = safe ? (fieldLabels[safe] ?? column.label) : column.label;
                                                            updateColumn(sheetIndex, columnIndex, { source: safe, static: '', label });
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Static')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="__static__">{t('Static value')}</SelectItem>
                                                            {fieldsForEntity(sheet.entity).map((key) => (
                                                                <SelectItem key={key} value={key}>
                                                                    {fieldLabels[key]}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">{t('Static Value')}</Label>
                                                    <Input
                                                        value={column.static}
                                                        disabled={Boolean(column.source)}
                                                        onChange={(event) =>
                                                            updateColumn(sheetIndex, columnIndex, { static: event.target.value })
                                                        }
                                                        placeholder="e.g. 2026-27"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-2 grid gap-2 sm:grid-cols-4">
                                                <label className="flex items-center gap-2 text-xs">
                                                    <Checkbox
                                                        checked={column.required}
                                                        onCheckedChange={(checked) =>
                                                            updateColumn(sheetIndex, columnIndex, { required: Boolean(checked) })
                                                        }
                                                    />
                                                    {t('Required')}
                                                </label>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">{t('Type')}</Label>
                                                    <Select
                                                        value={column.type}
                                                        onValueChange={(type) =>
                                                            updateColumn(sheetIndex, columnIndex, {
                                                                type: type as ColumnForm['type'],
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="auto">Auto</SelectItem>
                                                            <SelectItem value="text">Text</SelectItem>
                                                            <SelectItem value="number">Number</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1 sm:col-span-2">
                                                    <Label className="text-xs">{t('Lookup')}</Label>
                                                    <Select
                                                        value={column.lookup === '' ? '__none__' : column.lookup}
                                                        onValueChange={(lookup) =>
                                                            updateColumn(sheetIndex, columnIndex, { lookup: lookup === '__none__' ? '' : lookup })
                                                        }
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue placeholder={t('None')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="__none__">{t('No lookup')}</SelectItem>
                                                            {lookups.map((lookup) => (
                                                                <SelectItem key={lookup} value={lookup}>
                                                                    {lookup}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="mt-2"
                                    onClick={() => addColumn(sheetIndex)}
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    {t('Add Column')}
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Button type="button" size="sm" variant="outline" onClick={addSheet}>
                        <Plus className="mr-1 h-4 w-4" />
                        {t('Add Sheet')}
                    </Button>

                    <DialogFooter>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setTemplateOpen(false)}
                            disabled={saving}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={saveTemplate}
                            disabled={saving || !templateForm.name.trim() || templateForm.sheets.length === 0}
                        >
                            {saving ? `${t('Saving')}...` : editingIndex !== null ? t('Save Changes') : t('Save Template')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    };

    return (
        <DashboardLayout user={user} pageTitle={t('UDISE & SARAL Portal Records')}>
            <div className="space-y-6 p-4 sm:p-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <SignalHigh className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">{t('UDISE & SARAL Portal Records')}</CardTitle>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Label className="text-muted-foreground">{t('State')}</Label>
                                    <Select value={currentState} onValueChange={changeState}>
                                        <SelectTrigger className="w-44">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(states).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Badge variant="secondary">{academicYear}</Badge>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('Prepare ready-to-upload records for UDISE and SARAL (state) portals under this academic year.')}
                        </p>
                        {udiseCode && (
                            <div className="flex items-center gap-2 text-sm">
                                <Badge>UDISE: {udiseCode}</Badge>
                            </div>
                        )}
                    </CardHeader>
                </Card>

                <div className="space-y-4">
                    {presets.map((preset) => renderPreset(preset))}

                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-base">{t('Custom Templates')}</CardTitle>
                                </div>
                                <Button type="button" size="sm" onClick={openNewTemplate}>
                                    <Plus className="mr-1 h-4 w-4" />
                                    {t('New Template')}
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('Create your own templates to match any other portal format.')}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                            {customTemplates.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    {t('No custom templates yet.')}
                                </p>
                            ) : (
                                customTemplates.map((template, index) => renderTemplate(template, template.id ?? String(index)))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {renderTemplateDialog()}
        </DashboardLayout>
    );
}