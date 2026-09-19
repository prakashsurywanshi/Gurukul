import { useLanguage } from '../../i18n/LanguageProvider';
import { Fragment, useMemo, useState } from 'react';
import {
    CheckCircle2,
    ClipboardList,
    ListPlus,
    Plus,
    Trash2,
    Users,
    GraduationCap,
    Phone,
    BookOpen,
    Package,
    Boxes,
    UserPlus,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

export type CustomFieldRow = {
    id: number;
    label: string;
    fieldKey: string;
    fieldType: string;
    options: string[];
    pattern: string | null;
    patternMessage: string | null;
    minValue: number | null;
    maxValue: number | null;
    minLength: number | null;
    maxLength: number | null;
    isRequired: boolean;
    isActive: boolean;
    showInAdmission: boolean;
    sortOrder: number;
};

export type CustomFieldRecord = {
    entityId: number;
    name: string;
    admissionNo: string | null;
    secondary: string | null;
    values: Record<string, string | string[] | null>;
    filledCount: number;
    requiredMissing: number;
    complete: boolean;
};

export type CustomFieldsProps = {
    user: any;
    definitions: { entity: string; fields: CustomFieldRow[] }[];
    records: {
        entity: string;
        label: string;
        records: CustomFieldRecord[];
        totalFields: number;
        requiredFields: number;
    }[];
    summary: {
        totalDefinitions: number;
        activeDefinitions: number;
        recordCounts: Record<string, number>;
        entityEntities: string[];
        entityLabels: Record<string, string>;
    };
};

const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown' },
    { value: 'url', label: 'URL' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio Group' },
    { value: 'multi-select', label: 'Multi-select' },
    { value: 'currency', label: 'Currency' },
    { value: 'file', label: 'File' },
];

const OPTIONED_TYPES = ['select', 'radio', 'multi-select'];

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    student: GraduationCap,
    staff: Users,
    lead: UserPlus,
    book: BookOpen,
    asset: Package,
    inventory: Boxes,
};

const ENTITY_LABELS: Record<string, string> = {
    student: 'Students',
    staff: 'Staff',
    lead: 'Leads',
    book: 'Books',
    asset: 'Assets',
    inventory: 'Inventory',
};

export default function CustomFields({ user, definitions, records, summary }: CustomFieldsProps) {
    const { t } = useLanguage();
    const [tab, setTab] = useState<'fields' | 'records'>('fields');
    const [entityFilter, setEntityFilter] = useState<string>('student');
    const [addOpen, setAddOpen] = useState(false);
    const [entity, setEntity] = useState('student');
    const [label, setLabel] = useState('');
    const [fieldType, setFieldType] = useState('text');
    const [options, setOptions] = useState('');
    const [pattern, setPattern] = useState('');
    const [patternMessage, setPatternMessage] = useState('');
    const [minValue, setMinValue] = useState('');
    const [maxValue, setMaxValue] = useState('');
    const [minLength, setMinLength] = useState('');
    const [maxLength, setMaxLength] = useState('');
    const [isRequired, setIsRequired] = useState(false);
    const [showInAdmission, setShowInAdmission] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<{ entity: string; record: CustomFieldRecord } | null>(null);
    const [draft, setDraft] = useState<Record<string, string>>({});

    const fieldsFor = useMemo(
        () => definitions.find((group) => group.entity === entityFilter)?.fields ?? [],
        [definitions, entityFilter],
    );
    const recordsFor = useMemo(
        () => records.find((group) => group.entity === entityFilter)?.records ?? [],
        [records, entityFilter],
    );
    const totalFields = useMemo(
        () => records.find((group) => group.entity === entityFilter)?.totalFields ?? 0,
        [records, entityFilter],
    );
    const requiredFields = useMemo(
        () => records.find((group) => group.entity === entityFilter)?.requiredFields ?? 0,
        [records, entityFilter],
    );
    const completeCount = useMemo(() => recordsFor.filter((record) => record.complete).length, [recordsFor]);

    const isOptioned = OPTIONED_TYPES.includes(fieldType);
    const needsNumericRange = fieldType === 'number' || fieldType === 'currency';
    const needsLength = ['text', 'textarea', 'url', 'email', 'phone', 'file'].includes(fieldType);

    const submitDefinition = () => {
        if (!label.trim()) {
            toast.error(t('Field label is required.'));
            return;
        }
        if (
            isOptioned &&
            options
                .split(',')
                .map((option) => option.trim())
                .filter(Boolean).length === 0
        ) {
            toast.error(t('Add at least one option.'));
            return;
        }
        setSaving(true);
        router.post(
            '/custom-fields/definitions',
            {
                entity,
                label: label.trim(),
                field_type: fieldType,
                options: isOptioned
                    ? options
                          .split(',')
                          .map((option) => option.trim())
                          .filter(Boolean)
                    : null,
                pattern: pattern.trim() || null,
                pattern_message: patternMessage.trim() || null,
                min_value: minValue !== '' ? Number(minValue) : null,
                max_value: maxValue !== '' ? Number(maxValue) : null,
                min_length: minLength !== '' ? Number(minLength) : null,
                max_length: maxLength !== '' ? Number(maxLength) : null,
                is_required: isRequired,
                show_in_admission: showInAdmission,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAddOpen(false);
                    resetAddState();
                    toast.success(t('Custom field created.'));
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const resetAddState = () => {
        setLabel('');
        setOptions('');
        setPattern('');
        setPatternMessage('');
        setMinValue('');
        setMaxValue('');
        setMinLength('');
        setMaxLength('');
        setIsRequired(false);
        setShowInAdmission(false);
    };

    const toggleField = (field: CustomFieldRow) => {
        router.patch(
            `/custom-fields/definitions/${field.id}`,
            { is_active: !field.isActive },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(field.isActive ? t('Field deactivated.') : t('Field activated.')),
            },
        );
    };

    const deleteField = (field: CustomFieldRow) => {
        router.delete(`/custom-fields/definitions/${field.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Custom field removed.')),
        });
    };

    const openEdit = (entityName: string, record: CustomFieldRecord) => {
        setEditing({ entity: entityName, record });
        setDraft(
            Object.fromEntries(
                Object.entries(record.values).map(([key, value]) => [key, typeof value === 'string' ? value : '']),
            ),
        );
    };

    const saveValues = () => {
        if (!editing) return;
        setSaving(true);
        router.post(
            '/custom-fields/values',
            {
                entity: editing.entity,
                entity_id: editing.record.entityId,
                values: draft,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditing(null);
                    toast.success(t('Custom field values saved.'));
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const renderValueInput = (field: CustomFieldRow) => {
        const fieldType = field.fieldType;

        if (fieldType === 'textarea') {
            return (
                <Textarea
                    rows={3}
                    value={draft[field.fieldKey] ?? ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))}
                />
            );
        }

        if (fieldType === 'select') {
            return (
                <Select
                    value={draft[field.fieldKey] || undefined}
                    onValueChange={(value) => setDraft((prev) => ({ ...prev, [field.fieldKey]: value }))}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t('Select')} />
                    </SelectTrigger>
                    <SelectContent>
                        {field.options.map((option) => (
                            <SelectItem key={option} value={option}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        }

        if (fieldType === 'number' || fieldType === 'currency') {
            return (
                <Input
                    type="number"
                    step={fieldType === 'currency' ? '0.01' : 'any'}
                    value={draft[field.fieldKey] ?? ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))}
                />
            );
        }

        if (fieldType === 'date') {
            return (
                <Input
                    type="date"
                    value={draft[field.fieldKey] ?? ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))}
                />
            );
        }

        if (fieldType === 'email') {
            return (
                <Input
                    type="email"
                    value={draft[field.fieldKey] ?? ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))}
                />
            );
        }

        if (fieldType === 'url' || fieldType === 'file') {
            return (
                <Input
                    type={fieldType === 'url' ? 'url' : 'text'}
                    placeholder={fieldType === 'file' ? t('/uploads/… or https://…') : undefined}
                    value={draft[field.fieldKey] ?? ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))}
                />
            );
        }

        return (
            <Input
                type="text"
                inputMode={fieldType === 'phone' ? 'tel' : undefined}
                value={draft[field.fieldKey] ?? ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))}
            />
        );
    };

    return (
        <DashboardLayout user={user} pageTitle={t('Custom Fields & Data Records')}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="grid flex-1 gap-3 sm:grid-cols-3">
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Total Fields')}</p>
                                    <p className="text-2xl font-bold">{summary.totalDefinitions}</p>
                                </div>
                                <ListPlus className="h-5 w-5 text-primary" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Active Fields')}</p>
                                    <p className="text-2xl font-bold text-emerald-600">{summary.activeDefinitions}</p>
                                </div>
                                <ClipboardList className="h-5 w-5 text-emerald-600" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Entities')}</p>
                                    <p className="text-2xl font-bold">{summary.entityEntities.length}</p>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-sky-600" />
                            </CardContent>
                        </Card>
                    </div>
                    <Button onClick={() => setAddOpen(true)}>
                        <Plus className="mr-1 h-4 w-4" /> {t('Add Field')}
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {summary.entityEntities.map((entityKey) => {
                        const Icon = ENTITY_ICONS[entityKey] ?? ClipboardList;
                        return (
                            <Card key={entityKey}>
                                <CardContent className="flex items-center justify-between pt-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {t(summary.entityLabels[entityKey] ?? entityKey)}
                                        </p>
                                        <p className="text-xl font-bold">{summary.recordCounts[entityKey] ?? 0}</p>
                                    </div>
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {(['fields', 'records'] as const).map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setTab(value)}
                            className={`rounded-md px-3 py-1 text-sm ${
                                tab === value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/60'
                            }`}
                        >
                            {value === 'fields' ? t('Field Definitions') : t('Data Records & Validator')}
                        </button>
                    ))}
                </div>

                {tab === 'fields' && (
                    <div className="space-y-4">
                        {definitions.map((group) => {
                            const EntityIcon = ENTITY_ICONS[group.entity] ?? ClipboardList;
                            return (
                                <Card key={group.entity}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <EntityIcon className="h-4 w-4 text-muted-foreground" />
                                            {t(ENTITY_LABELS[group.entity] ?? group.entity)}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        {group.fields.length === 0 && (
                                            <p className="py-4 text-sm text-muted-foreground">
                                                {t('No fields defined for this entity.')}
                                            </p>
                                        )}
                                        <div className="space-y-2">
                                            {group.fields.map((field) => (
                                                <div
                                                    key={field.id}
                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-medium">{field.label}</p>
                                                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                                            {field.fieldKey}
                                                        </code>
                                                        <Badge variant="outline">
                                                            {FIELD_TYPES.find((type) => type.value === field.fieldType)
                                                                ?.label ?? field.fieldType}
                                                        </Badge>
                                                        {field.isRequired && (
                                                            <Badge variant="destructive">{t('Required')}</Badge>
                                                        )}
                                                        {field.showInAdmission && (
                                                            <Badge variant="secondary">{t('Admission Form')}</Badge>
                                                        )}
                                                        {!field.isActive && (
                                                            <Badge variant="outline">{t('Inactive')}</Badge>
                                                        )}
                                                        {field.pattern && (
                                                            <Badge variant="outline">{t('Pattern rule')}</Badge>
                                                        )}
                                                        {(field.minValue !== null ||
                                                            field.maxValue !== null ||
                                                            field.minLength !== null ||
                                                            field.maxLength !== null) && (
                                                            <Badge variant="outline">{t('Rules')}</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => toggleField(field)}
                                                        >
                                                            {field.isActive ? t('Deactivate') : t('Activate')}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                router.patch(
                                                                    `/custom-fields/definitions/${field.id}`,
                                                                    {
                                                                        is_required: !field.isRequired,
                                                                    },
                                                                    { preserveScroll: true },
                                                                )
                                                            }
                                                        >
                                                            {field.isRequired ? t('Make Optional') : t('Make Required')}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => deleteField(field)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {tab === 'records' && (
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <CardTitle className="text-base">{t('Data Records')}</CardTitle>
                                    <Select value={entityFilter} onValueChange={setEntityFilter}>
                                        <SelectTrigger className="w-44">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {summary.entityEntities.map((entityKey) => (
                                                <SelectItem key={entityKey} value={entityKey}>
                                                    {t(summary.entityLabels[entityKey] ?? entityKey)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>
                                        {t('Complete')}: {completeCount}/{recordsFor.length}
                                    </span>
                                    <span>
                                        {t('Required Fields')}: {requiredFields}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {recordsFor.length === 0 && (
                                <p className="py-8 text-center text-muted-foreground">{t('No records available.')}</p>
                            )}
                            {fieldsFor.length === 0 && recordsFor.length > 0 && (
                                <p className="py-6 text-center text-muted-foreground">
                                    {t('Add fields first, then fill in values for each record.')}
                                </p>
                            )}
                            <div className="space-y-2">
                                {recordsFor.map((record) => (
                                    <div
                                        key={record.entityId}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            {record.complete ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <ClipboardList className="h-4 w-4 text-amber-600" />
                                            )}
                                            <p className="font-medium">{record.name}</p>
                                            {record.secondary && <Badge variant="outline">{record.secondary}</Badge>}
                                            {record.requiredMissing > 0 && (
                                                <Badge variant="destructive">
                                                    {t('Missing')} {record.requiredMissing}
                                                </Badge>
                                            )}
                                            {record.complete && totalFields > 0 && (
                                                <Badge variant="default">{t('Complete')}</Badge>
                                            )}
                                            {!record.complete && totalFields > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    {record.filledCount}/{totalFields} {t('filled')}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEdit(entityFilter, record)}
                                        >
                                            {t('Fill Values')}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Add Custom Field')}</DialogTitle>
                        <DialogDescription>
                            {t('Define an extra data field for any module with validation rules.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Applies To')}</Label>
                            <Select value={entity} onValueChange={setEntity}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {summary.entityEntities.map((entityKey) => (
                                        <SelectItem key={entityKey} value={entityKey}>
                                            {t(summary.entityLabels[entityKey] ?? entityKey)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Field Label')}</Label>
                            <Input
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder={t('e.g. Blood Group')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Field Type')}</Label>
                            <Select value={fieldType} onValueChange={setFieldType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FIELD_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {t(type.label)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {isOptioned && (
                            <div className="space-y-2">
                                <Label>{t('Options (comma separated)')}</Label>
                                <Input
                                    value={options}
                                    onChange={(e) => setOptions(e.target.value)}
                                    placeholder={t('e.g. A+, A-, B+, O+')}
                                />
                            </div>
                        )}
                        {needsLength && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>{t('Min Length')}</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={minLength}
                                        onChange={(e) => setMinLength(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Max Length')}</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={maxLength}
                                        onChange={(e) => setMaxLength(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        {needsNumericRange && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>{t('Min Value')}</Label>
                                    <Input
                                        type="number"
                                        value={minValue}
                                        onChange={(e) => setMinValue(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Max Value')}</Label>
                                    <Input
                                        type="number"
                                        value={maxValue}
                                        onChange={(e) => setMaxValue(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        {fieldType === 'text' && (
                            <Fragment>
                                <div className="space-y-2">
                                    <Label>{t('Validation Pattern (regex)')}</Label>
                                    <Input
                                        value={pattern}
                                        onChange={(e) => setPattern(e.target.value)}
                                        placeholder={t('e.g. ^[A-Z]{2}[0-9]{4}$')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Pattern Error Message')}</Label>
                                    <Input
                                        value={patternMessage}
                                        onChange={(e) => setPatternMessage(e.target.value)}
                                        placeholder={t('Custom message shown when the pattern fails')}
                                    />
                                </div>
                            </Fragment>
                        )}
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={isRequired}
                                    onChange={(e) => setIsRequired(e.target.checked)}
                                    className="h-4 w-4"
                                />
                                {t('Required field')}
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={showInAdmission}
                                    onChange={(e) => setShowInAdmission(e.target.checked)}
                                    className="h-4 w-4"
                                />
                                {t('Show in admission form')}
                            </label>
                        </div>
                        <Button className="w-full" onClick={submitDefinition} disabled={saving}>
                            {saving ? t('Saving...') : t('Save Field')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t('Edit Values')} — {editing?.record.name}
                        </DialogTitle>
                        <DialogDescription>{t('Fill the custom field values for this record.')}</DialogDescription>
                    </DialogHeader>
                    {editing && (
                        <div className="space-y-4">
                            {fieldsFor.map((field) => (
                                <div key={field.id} className="space-y-2">
                                    <Label>
                                        {field.label}
                                        {field.isRequired && <span className="text-destructive"> *</span>}
                                    </Label>
                                    {renderValueInput(field)}
                                </div>
                            ))}
                            <Button className="w-full" onClick={saveValues} disabled={saving}>
                                {saving ? t('Saving...') : t('Save Values')}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
