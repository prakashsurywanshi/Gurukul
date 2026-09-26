import { useLanguage } from '../../../i18n/LanguageProvider';
import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Loader2, Save, Sparkles } from 'lucide-react';
import DashboardLayout from '../../DashboardLayout';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { MarathiInput } from '../../../components/regional/MarathiInput';
import { transliterateText } from '../../../lib/transliterateText';
import { getCsrfToken } from '../../../lib/csrf';
import { toast } from 'sonner';
import AdmissionCustomFields, { AdmissionCustomField } from './AdmissionCustomFields';

interface EditStudentProps {
    user: any;
    studentId: string;
    student?: any | null;
    classRecords: {
        id: number;
        name: string;
        section: string;
    }[];
    admissionCustomFields: AdmissionCustomField[];
    admissionCustomFieldValues: Record<string, string | string[]>;
}

const emptyForm = {
    admission_no: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    middle_name_mr: '',
    first_name_mr: '',
    last_name_mr: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    preferred_language: 'en',
    class: '',
    section: '',
    roll_number: '',
    admission_date: '',
    father_name: '',
    father_name_mr: '',
    father_phone: '',
    father_occupation: '',
    father_occupation_mr: '',
    mother_name: '',
    mother_name_mr: '',
    mother_phone: '',
    mother_occupation: '',
    mother_occupation_mr: '',
    address: '',
    address_mr: '',
    city: '',
    city_mr: '',
    state: '',
    state_mr: '',
    pincode: '',
    category: '',
    religion: '',
    religion_mr: '',
    caste: '',
    caste_mr: '',
    previous_school: '',
    previous_school_mr: '',
    transport_required: false,
    transport_pickup_point: '',
    transport_pickup_point_mr: '',
    transport_vehicle: '',
    transport_route_details: '',
    transport_route_details_mr: '',
    hostel_required: false,
    status: 'active',
};

export default function EditStudent({
    user,
    studentId,
    student,
    classRecords,
    admissionCustomFields = [],
    admissionCustomFieldValues = {},
}: EditStudentProps) {
    const { t } = useLanguage();
    const { languageSettings } = usePage().props as any;
    const dualLanguageEnabled = Boolean(languageSettings?.dual_language_enabled);
    const regionalLanguage = languageSettings?.regional_language ?? 'mr';
    const regionalLanguageLabel =
        regionalLanguage === 'mr' ? t('Marathi') : regionalLanguage === 'hi' ? t('Hindi') : t('Regional');
    const [formData, setFormData] = useState(emptyForm);
    const [customFieldValues, setCustomFieldValues] =
        useState<Record<string, string | string[]>>(admissionCustomFieldValues);
    const [loading, setLoading] = useState(true);
    const [translating, setTranslating] = useState<string | null>(null);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [originalAdmissionNo, setOriginalAdmissionNo] = useState('');

    useEffect(() => {
        if (student) {
            setOriginalAdmissionNo(student.admission_no || '');
            setFormData({
                admission_no: student.admission_no || '',
                first_name: student.first_name || '',
                middle_name: student.middle_name || '',
                last_name: student.last_name || '',
                middle_name_mr: student.middle_name_mr || '',
                first_name_mr: student.first_name_mr || '',
                last_name_mr: student.last_name_mr || '',
                email: student.email || '',
                phone: student.phone || '',
                date_of_birth: student.date_of_birth || '',
                gender: student.gender || '',
                blood_group: student.blood_group || '',
                preferred_language: student.preferred_language || 'en',
                class: student.class || '',
                section: student.section || '',
                roll_number: student.roll_number || '',
                admission_date: student.admission_date || '',
                father_name: student.father_name || '',
                father_name_mr: student.father_name_mr || '',
                father_phone: student.father_phone || '',
                father_occupation: student.father_occupation || '',
                father_occupation_mr: student.father_occupation_mr || '',
                mother_name: student.mother_name || '',
                mother_name_mr: student.mother_name_mr || '',
                mother_phone: student.mother_phone || '',
                mother_occupation: student.mother_occupation || '',
                mother_occupation_mr: student.mother_occupation_mr || '',
                address: student.address || '',
                address_mr: student.address_mr || '',
                city: student.city || '',
                city_mr: student.city_mr || '',
                state: student.state || '',
                state_mr: student.state_mr || '',
                pincode: student.pincode || '',
                category: student.category || '',
                religion: student.religion || '',
                religion_mr: student.religion_mr || '',
                caste: student.caste || '',
                caste_mr: student.caste_mr || '',
                previous_school: student.previous_school || '',
                previous_school_mr: student.previous_school_mr || '',
                transport_required: Boolean(student.transport_required),
                transport_pickup_point: student.transport_pickup_point || '',
                transport_pickup_point_mr: student.transport_pickup_point_mr || '',
                transport_vehicle: student.transport_vehicle || '',
                transport_route_details: student.transport_route_details || '',
                transport_route_details_mr: student.transport_route_details_mr || '',
                hostel_required: Boolean(student.hostel_required),
                status: student.status || 'active',
            });
        }

        setLoading(false);
    }, [student, studentId]);

    const classOptions = Array.from(new Set(classRecords.map((classRecord) => String(classRecord.name)))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
    );

    const sectionOptions = formData.class
        ? Array.from(
              new Set(
                  classRecords
                      .filter((classRecord) => String(classRecord.name) === String(formData.class))
                      .map((classRecord) => String(classRecord.section)),
              ),
          ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        : [];

    const updateField = (field: string, value: string | boolean) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const handleAutoGenerate = async (
        sourceField: string,
        targetField: string,
        mode: 'transliterate' | 'translate' = 'translate',
    ) => {
        const sourceText = String(formData[sourceField] ?? '').trim();
        if (!sourceText) {
            return;
        }

        setTranslating(targetField);
        try {
            if (mode === 'transliterate') {
                const transliterated = await transliterateText(sourceText);
                if (transliterated) {
                    setFormData((current) => ({ ...current, [targetField]: transliterated }));
                }
            } else {
                const response = await fetch('/settings/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        text: sourceText,
                        target: regionalLanguage,
                        source: 'en',
                    }),
                });
                const payload = await response.json();
                if (payload?.translated) {
                    setFormData((current) => ({
                        ...current,
                        [targetField]: payload.translated,
                    }));
                }
            }
        } catch (error) {
            console.error('Auto-generate failed', error);
            toast.error(t('Failed to auto-generate'));
        } finally {
            setTranslating(null);
        }
    };

    const handleGenerateAllMarathi = async () => {
        const pairs: [string, string][] = [
            ['first_name', 'first_name_mr'],
            ['middle_name', 'middle_name_mr'],
            ['last_name', 'last_name_mr'],
            ['father_name', 'father_name_mr'],
            ['mother_name', 'mother_name_mr'],
        ];
        const emptyTargets = pairs.filter(([, targetField]) => !String(formData[targetField]).trim());

        if (emptyTargets.length === 0) {
            return;
        }

        setGeneratingAll(true);
        try {
            const nextForm = { ...formData };
            for (const [sourceField, targetField] of pairs) {
                const sourceText = String(nextForm[sourceField] ?? '').trim();
                if (!sourceText) {
                    continue;
                }
                const transliterated = await transliterateText(sourceText);
                if (transliterated) {
                    nextForm[targetField] = transliterated;
                }
            }
            setFormData(nextForm);
        } catch (error) {
            console.error('Auto-generate all failed', error);
            toast.error(t('Failed to auto-generate'));
        } finally {
            setGeneratingAll(false);
        }
    };

    const renderMarathiRow = (
        label: string,
        sourceField: string,
        targetField: string,
        required = false,
        mode: 'transliterate' | 'translate' = 'translate',
    ) => (
        <div className="space-y-2">
            <Label>
                {label} <span className="font-normal text-slate-500">({regionalLanguageLabel})</span>
            </Label>
            <MarathiInput
                value={formData[targetField]}
                onChange={(value) => updateField(targetField, value)}
                required={required}
                label={`${label} (${regionalLanguageLabel})`}
                fieldId={targetField}
                onAutoGenerate={() => handleAutoGenerate(sourceField, targetField, mode)}
                autoGenerating={translating === targetField}
            />
        </div>
    );

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        router.patch(`/students/${studentId}`, {
            ...formData,
            admission_no: originalAdmissionNo,
            custom_fields: customFieldValues,
        });
    };

    if (loading) {
        return (
            <DashboardLayout user={user} activeTab="search_students">
                <div className="min-h-full bg-slate-50 p-8">
                    <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                        {t('Loading student details...')}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={user} activeTab="search_students">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <Button asChild variant="outline" className="mb-4 gap-2">
                                <Link href={`/students/${studentId}`}>
                                    <ArrowLeft className="h-4 w-4" />
                                    {t('Back to Student Details')}
                                </Link>
                            </Button>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Edit Student')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Update academic, personal, and parent information.')}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                disabled={generatingAll}
                                onClick={handleGenerateAllMarathi}
                            >
                                {generatingAll ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                {regionalLanguage === 'hi'
                                    ? t('Generate all Hindi fields')
                                    : t('Generate all Marathi fields')}
                            </Button>
                            <Button type="submit" form="edit-student-form" className="gap-2">
                                <Save className="h-4 w-4" />
                                {t('Save Changes')}
                            </Button>
                        </div>
                    </div>

                    <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold text-slate-900">
                                    {t('Student Information')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>{t('Admission Number')}</Label>
                                    <Input
                                        value={formData.admission_no}
                                        disabled
                                        readOnly
                                        className="cursor-not-allowed bg-slate-100 text-slate-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Status')}</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => updateField('status', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('First Name')}</Label>
                                    <Input
                                        value={formData.first_name}
                                        onChange={(e) => updateField('first_name', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Middle Name / Father Name')}</Label>
                                    <Input
                                        value={formData.middle_name}
                                        onChange={(e) => updateField('middle_name', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Last Name')}</Label>
                                    <Input
                                        value={formData.last_name}
                                        onChange={(e) => updateField('last_name', e.target.value)}
                                        required
                                    />
                                </div>
                                {renderMarathiRow('First Name', 'first_name', 'first_name_mr', true, 'transliterate')}
                                {renderMarathiRow(
                                    'Middle Name / Father Name',
                                    'middle_name',
                                    'middle_name_mr',
                                    true,
                                    'transliterate',
                                )}
                                {renderMarathiRow('Last Name', 'last_name', 'last_name_mr', true, 'transliterate')}
                                <div className="space-y-2">
                                    <Label>{t('Email')}</Label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => updateField('email', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Phone')}</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => updateField('phone', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Date of Birth')}</Label>
                                    <Input
                                        type="date"
                                        value={formData.date_of_birth}
                                        onChange={(e) => updateField('date_of_birth', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Admission Date')}</Label>
                                    <Input
                                        type="date"
                                        value={formData.admission_date}
                                        onChange={(e) => updateField('admission_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Gender')}</Label>
                                    <Select
                                        value={formData.gender}
                                        onValueChange={(value) => updateField('gender', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select gender')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">{t('Male')}</SelectItem>
                                            <SelectItem value="female">{t('Female')}</SelectItem>
                                            <SelectItem value="other">{t('Other')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Blood Group')}</Label>
                                    <Select
                                        value={formData.blood_group}
                                        onValueChange={(value) => updateField('blood_group', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select blood group')} />
                                        </SelectTrigger>
<SelectContent>
                                            <SelectItem value="A+">{t('A+')}</SelectItem>
                                            <SelectItem value="A-">{t('A-')}</SelectItem>
                                            <SelectItem value="B+">{t('B+')}</SelectItem>
                                            <SelectItem value="B-">{t('B-')}</SelectItem>
                                            <SelectItem value="AB+">{t('AB+')}</SelectItem>
                                            <SelectItem value="AB-">{t('AB-')}</SelectItem>
                                            <SelectItem value="O+">{t('O+')}</SelectItem>
                                            <SelectItem value="O-">{t('O-')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Preferred Language')}</Label>
                                    <Select
                                        value={formData.preferred_language}
                                        onValueChange={(value) => updateField('preferred_language', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select language')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">{t('English')}</SelectItem>
                                            <SelectItem value="mr">{t('Marathi')}</SelectItem>
                                            <SelectItem value="hi">{t('Hindi')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-500">
                                        {t('Used when regional WhatsApp templates are sent in Auto language.')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold text-slate-900">
                                    {t('Academic Details')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>{t('Class')}</Label>
                                    <Select
                                        value={formData.class}
                                        onValueChange={(value) =>
                                            setFormData((current) => ({
                                                ...current,
                                                class: value,
                                                section: '',
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select class')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classOptions.map((className) => (
                                                <SelectItem key={className} value={className}>
                                                    {className}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Section')}</Label>
                                    <Select
                                        value={formData.section}
                                        onValueChange={(value) => updateField('section', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select section')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sectionOptions.map((section) => (
                                                <SelectItem key={section} value={section}>
                                                    {t('Section')}
                                                    {section}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Roll Number')}</Label>
                                    <Input
                                        value={formData.roll_number}
                                        onChange={(e) => updateField('roll_number', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Category')}</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(value) => updateField('category', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select category')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="General">{t('General')}</SelectItem>
                                            <SelectItem value="OBC">{t('OBC')}</SelectItem>
                                            <SelectItem value="SC">{t('SC')}</SelectItem>
                                            <SelectItem value="ST">{t('ST')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>{t('Previous School')}</Label>
                                    <Input
                                        value={formData.previous_school}
                                        onChange={(e) => updateField('previous_school', e.target.value)}
                                    />
                                </div>
                                {dualLanguageEnabled && (
                                    <div className="space-y-2 md:col-span-2">
                                        {renderMarathiRow('Previous School', 'previous_school', 'previous_school_mr')}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold text-slate-900">
                                    {t('Parent Details')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>{t("Father's Name")}</Label>
                                    <Input
                                        value={formData.father_name}
                                        onChange={(e) => updateField('father_name', e.target.value)}
                                    />
                                </div>
                                {dualLanguageEnabled &&
                                    renderMarathiRow(
                                        "Father's Name",
                                        'father_name',
                                        'father_name_mr',
                                        false,
                                        'transliterate',
                                    )}
                                <div className="space-y-2">
                                    <Label>{t("Father's Phone")}</Label>
                                    <Input
                                        value={formData.father_phone}
                                        onChange={(e) => updateField('father_phone', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("Father's Occupation")}</Label>
                                    <Input
                                        value={formData.father_occupation}
                                        onChange={(e) => updateField('father_occupation', e.target.value)}
                                    />
                                </div>
                                {dualLanguageEnabled &&
                                    renderMarathiRow(
                                        "Father's Occupation",
                                        'father_occupation',
                                        'father_occupation_mr',
                                    )}
                                <div className="space-y-2">
                                    <Label>{t("Mother's Name")}</Label>
                                    <Input
                                        value={formData.mother_name}
                                        onChange={(e) => updateField('mother_name', e.target.value)}
                                    />
                                </div>
                                {dualLanguageEnabled &&
                                    renderMarathiRow(
                                        "Mother's Name",
                                        'mother_name',
                                        'mother_name_mr',
                                        false,
                                        'transliterate',
                                    )}
                                <div className="space-y-2">
                                    <Label>{t("Mother's Phone")}</Label>
                                    <Input
                                        value={formData.mother_phone}
                                        onChange={(e) => updateField('mother_phone', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("Mother's Occupation")}</Label>
                                    <Input
                                        value={formData.mother_occupation}
                                        onChange={(e) => updateField('mother_occupation', e.target.value)}
                                    />
                                </div>
                                {dualLanguageEnabled &&
                                    renderMarathiRow(
                                        "Mother's Occupation",
                                        'mother_occupation',
                                        'mother_occupation_mr',
                                    )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold text-slate-900">{t('Address')}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label>{t('Address')}</Label>
                                    <Input
                                        value={formData.address}
                                        onChange={(e) => updateField('address', e.target.value)}
                                    />
                                </div>
                                {dualLanguageEnabled && (
                                    <div className="space-y-2 md:col-span-2">
                                        {renderMarathiRow('Address', 'address', 'address_mr')}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>{t('City')}</Label>
                                    <Input
                                        value={formData.city}
                                        onChange={(e) => updateField('city', e.target.value)}
                                    />
                                </div>
                                {dualLanguageEnabled && renderMarathiRow('City', 'city', 'city_mr')}
                                <div className="space-y-2">
                                    <Label>{t('State')}</Label>
                                    <Input
                                        value={formData.state}
                                        onChange={(e) => updateField('state', e.target.value)}
                                    />
                                </div>
                                {dualLanguageEnabled && renderMarathiRow('State', 'state', 'state_mr')}
                                <div className="space-y-2">
                                    <Label>{t('Pincode')}</Label>
                                    <Input
                                        value={formData.pincode}
                                        onChange={(e) => updateField('pincode', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Religion')}</Label>
                                    <Input
                                        value={formData.religion}
                                        onChange={(e) => updateField('religion', e.target.value)}
                                    />
                                </div>
                                {dualLanguageEnabled && renderMarathiRow('Religion', 'religion', 'religion_mr')}
                                <div className="space-y-2">
                                    <Label>{t('Caste')}</Label>
                                    <Input
                                        value={formData.caste}
                                        onChange={(e) => updateField('caste', e.target.value)}
                                    />
                                </div>
                                {dualLanguageEnabled && renderMarathiRow('Caste', 'caste', 'caste_mr')}
                            </CardContent>
                        </Card>

                        {admissionCustomFields.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold text-slate-900">
                                        {t('Admission Fields')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <AdmissionCustomFields
                                        fields={admissionCustomFields}
                                        values={customFieldValues}
                                        onChange={(fieldKey, value) =>
                                            setCustomFieldValues((current) => ({ ...current, [fieldKey]: value }))
                                        }
                                    />
                                </CardContent>
                            </Card>
                        )}
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
