import { useLanguage } from '../../i18n/LanguageProvider';
import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, ListPlus, Plus, Trash2, Users, GraduationCap } from 'lucide-react';
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
    values: Record<string, string | null>;
    filledCount: number;
    requiredMissing: number;
    complete: boolean;
};

export type CustomFieldsProps = {
    user: any;
    definitions: { entity: string; fields: CustomFieldRow[] }[];
    records: { entity: string; records: CustomFieldRecord[]; totalFields: number; requiredFields: number }[];
    summary: {
        totalDefinitions: number;
        activeDefinitions: number;
        studentRecords: number;
        staffRecords: number;
        entityEntities: string[];
    };
};

const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown' },
];

export default function CustomFields({ user, definitions, records, summary }: CustomFieldsProps) {
    const { t } = useLanguage();
    const [tab, setTab] = useState<'fields' | 'records'>('fields');
    const [entityFilter, setEntityFilter] = useState<string>('student');
    const [addOpen, setAddOpen] = useState(false);
    const [entity, setEntity] = useState('student');
    const [label, setLabel] = useState('');
    const [fieldType, setFieldType] = useState('text');
    const [options, setOptions] = useState('');
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

    const submitDefinition = () => {
        if (!label.trim()) {
            toast.error(t('Field label is required.'));
            return;
        }
        if (
            fieldType === 'select' &&
            options
                .split(',')
                .map((option) => option.trim())
                .filter(Boolean).length === 0
        ) {
            toast.error(t('Add at least one option for the dropdown.'));
            return;
        }
        setSaving(true);
        router.post(
            '/custom-fields/definitions',
            {
                entity,
                label: label.trim(),
                field_type: fieldType,
                options:
                    fieldType === 'select'
                        ? options
                              .split(',')
                              .map((option) => option.trim())
                              .filter(Boolean)
                        : null,
                is_required: isRequired,
                show_in_admission: showInAdmission,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAddOpen(false);
                    setLabel('');
                    setOptions('');
                    setIsRequired(false);
                    setShowInAdmission(false);
                    toast.success(t('Custom field created.'));
                },
                onFinish: () => setSaving(false),
            },
        );
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
        setDraft(Object.fromEntries(Object.entries(record.values).map(([key, value]) => [key, value ?? ''])));
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

    const isRecordComplete = (record: CustomFieldRecord) => {
        const fields = fieldsFor;
        return fields.filter((field) => field.isRequired).every((field) => (draft[field.fieldKey] ?? '').trim());
    };

    return (
        <DashboardLayout user={user} pageTitle={t('Custom Fields & Data Records')}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="grid gap-3 sm:grid-cols-4">
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
                                    <p className="text-sm text-muted-foreground">{t('Student Records')}</p>
                                    <p className="text-2xl font-bold">{summary.studentRecords}</p>
                                </div>
                                <GraduationCap className="h-5 w-5 text-sky-600" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Staff Records')}</p>
                                    <p className="text-2xl font-bold">{summary.staffRecords}</p>
                                </div>
                                <Users className="h-5 w-5 text-amber-600" />
                            </CardContent>
                        </Card>
                    </div>
                    <Button onClick={() => setAddOpen(true)}>
                        <Plus className="mr-1 h-4 w-4" /> {t('Add Field')}
                    </Button>
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
                        {definitions.map((group) => (
                            <Card key={group.entity}>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        {group.entity === 'student' ? t('Student Fields') : t('Staff Fields')}
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
                        ))}
                    </div>
                )}

                {tab === 'records' && (
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <CardTitle className="text-base">{t('Data Records')}</CardTitle>
                                    <Select value={entityFilter} onValueChange={setEntityFilter}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="student">{t('Students')}</SelectItem>
                                            <SelectItem value="staff">{t('Staff')}</SelectItem>
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Add Custom Field')}</DialogTitle>
                        <DialogDescription>{t('Define an extra data field for students or staff.')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Applies To')}</Label>
                            <Select value={entity} onValueChange={setEntity}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">{t('Students')}</SelectItem>
                                    <SelectItem value="staff">{t('Staff')}</SelectItem>
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
                        {fieldType === 'select' && (
                            <div className="space-y-2">
                                <Label>{t('Options (comma separated)')}</Label>
                                <Input
                                    value={options}
                                    onChange={(e) => setOptions(e.target.value)}
                                    placeholder={t('e.g. A+, A-, B+, O+')}
                                />
                            </div>
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
                                    {field.fieldType === 'textarea' && (
                                        <Textarea
                                            value={draft[field.fieldKey] ?? ''}
                                            onChange={(e) =>
                                                setDraft((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))
                                            }
                                        />
                                    )}
                                    {field.fieldType === 'select' && (
                                        <Select
                                            value={draft[field.fieldKey] ?? ''}
                                            onValueChange={(value) =>
                                                setDraft((prev) => ({ ...prev, [field.fieldKey]: value }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select...')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {field.options.map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {field.fieldType === 'number' && (
                                        <Input
                                            type="number"
                                            value={draft[field.fieldKey] ?? ''}
                                            onChange={(e) =>
                                                setDraft((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))
                                            }
                                        />
                                    )}
                                    {field.fieldType === 'date' && (
                                        <Input
                                            type="date"
                                            value={draft[field.fieldKey] ?? ''}
                                            onChange={(e) =>
                                                setDraft((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))
                                            }
                                        />
                                    )}
                                    {field.fieldType === 'text' && (
                                        <Input
                                            value={draft[field.fieldKey] ?? ''}
                                            onChange={(e) =>
                                                setDraft((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))
                                            }
                                        />
                                    )}
                                </div>
                            ))}
                            <Button
                                className="w-full"
                                onClick={saveValues}
                                disabled={saving || !isRecordComplete(editing.record)}
                            >
                                {saving ? t('Saving...') : t('Save Values')}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
