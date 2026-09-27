import { useLanguage } from '../../../i18n/LanguageProvider';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Loader2, Sparkles, Save } from 'lucide-react';
import DashboardLayout from '../../DashboardLayout';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Checkbox } from '../../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { MarathiInput } from '../../../components/regional/MarathiInput';
import { transliterateText } from '../../../lib/transliterateText';
import { toast } from 'sonner';
import AdmissionCustomFields, { AdmissionCustomField } from './AdmissionCustomFields';

interface CreateStudentProps {
    user: any;
    classRecords: {
        id: number;
        name: string;
        section: string;
    }[];
    admissionCustomFields: AdmissionCustomField[];
}

export default function CreateStudent({ user, classRecords, admissionCustomFields = [] }: CreateStudentProps) {
    const { t } = useLanguage();
    const { languageSettings } = usePage().props as any;
    const regionalLanguage = languageSettings?.regional_language ?? 'mr';
    const regionalLanguageLabel =
        regionalLanguage === 'mr' ? t('Marathi') : regionalLanguage === 'hi' ? t('Hindi') : t('Regional');

    const [formData, setFormData] = useState({
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
        aadhar_number: '',
        register_no: '',
        udise_student_id: '',
        saral_student_id: '',
        admission_date: new Date().toISOString().split('T')[0],
        father_name: '',
        father_phone: '',
        father_occupation: '',
        mother_name: '',
        mother_phone: '',
        mother_occupation: '',
        permanent_address: '',
        current_address: '',
        same_as_permanent: true,
        city: '',
        state: '',
        pincode: '',
        category: '',
        religion: '',
        caste: '',
        previous_school: '',
    });
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | string[]>>({});
    const [generatingAll, setGeneratingAll] = useState(false);
    const hasCustomFields = admissionCustomFields.length > 0;

    const NAME_SYNC_PAIRS: ReadonlyArray<[string, string]> = [
        ['first_name', 'first_name_mr'],
        ['middle_name', 'middle_name_mr'],
        ['last_name', 'last_name_mr'],
    ];

    // Regional fields that were auto-filled from the English input stay in
    // sync while the user keeps typing. A manual edit unsyncs that field.
    const autoSyncedRef = useRef<Record<string, boolean>>({
        first_name_mr: false,
        middle_name_mr: false,
        last_name_mr: false,
    });

    useEffect(() => {
        let active = true;
        const timers: number[] = [];

        for (const [sourceField, targetField] of NAME_SYNC_PAIRS) {
            const sourceText = String(formData[sourceField] ?? '').trim();
            const targetText = String(formData[targetField] ?? '');

            if (!sourceText) {
                continue;
            }
            if (targetText.trim() !== '' && !autoSyncedRef.current[targetField]) {
                continue;
            }

            const timer = window.setTimeout(async () => {
                if (!active) {
                    return;
                }
                try {
                    const transliterated = await transliterateText(sourceText);
                    if (!active) {
                        return;
                    }
                    if (transliterated) {
                        setFormData((current) => {
                            if (String(current[sourceField] ?? '').trim() !== sourceText) {
                                return current;
                            }
                            if (
                                String(current[targetField] ?? '').trim() !== '' &&
                                !autoSyncedRef.current[targetField]
                            ) {
                                return current;
                            }
                            return { ...current, [targetField]: transliterated };
                        });
                        autoSyncedRef.current[targetField] = true;
                    }
                } catch {
                    // Transient failure: the Generate buttons remain available.
                }
            }, 400);
            timers.push(timer);
        }

        return () => {
            active = false;
            timers.forEach((timer) => window.clearTimeout(timer));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.first_name, formData.middle_name, formData.last_name]);

    const classOptions = useMemo(
        () =>
            Array.from(new Set(classRecords.map((classRecord) => String(classRecord.name)))).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true }),
            ),
        [classRecords],
    );

    const sectionOptionsByClass = useMemo(() => {
        return classRecords.reduce<Record<string, string[]>>((accumulator, classRecord) => {
            const className = String(classRecord.name);
            const sectionName = String(classRecord.section);

            if (!accumulator[className]) {
                accumulator[className] = [];
            }

            if (!accumulator[className].includes(sectionName)) {
                accumulator[className].push(sectionName);
                accumulator[className].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            }

            return accumulator;
        }, {});
    }, [classRecords]);

    const formSectionOptions = useMemo(
        () => (formData.class ? sectionOptionsByClass[formData.class] || [] : []),
        [formData.class, sectionOptionsByClass],
    );

    const handleInputChange = (field: string, value: any) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const handleRegionalInputChange = (field: string, value: string) => {
        autoSyncedRef.current[field] = false;
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...formData,
            permanent_address: formData.permanent_address,
            current_address: formData.same_as_permanent ? formData.permanent_address : formData.current_address,
            custom_fields: customFieldValues,
        };

        router.post('/students', payload, {
            onError: (errors) => {
                const emailErrors = Array.isArray(errors.email) ? errors.email : errors.email ? [errors.email] : [];
                const firstError = emailErrors[0] || Object.values(errors).flat()[0] || 'Failed to add student';

                if (emailErrors.length > 0) {
                    window.alert(String(firstError));
                    return;
                }

                toast.error(String(firstError));
            },
        });
    };

    const handleGenerateAllMarathi = async () => {
        const pairs: [string, string][] = [
            ['first_name', 'first_name_mr'],
            ['middle_name', 'middle_name_mr'],
            ['last_name', 'last_name_mr'],
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
            toast.error(t('Failed to auto-generate'));
        } finally {
            setGeneratingAll(false);
        }
    };

    return (
        <DashboardLayout user={user} activeTab="search_students">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <Button asChild variant="outline" className="mb-4 gap-2">
                                <Link href="/students">
                                    <ArrowLeft className="h-4 w-4" />
                                    {t('Back to Students')}
                                </Link>
                            </Button>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Add New Student')}</h1>
                            <p className="mt-1 text-sm text-slate-600">{t("Enter the student's details below.")}</p>
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
                            <Button type="submit" form="create-student-form" className="gap-2">
                                <Save className="h-4 w-4" />
                                {t('Add Student')}
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <form id="create-student-form" onSubmit={handleSubmit} className="space-y-6">
                            <Tabs defaultValue="personal">
                                <TabsList className={`grid w-full ${hasCustomFields ? 'grid-cols-5' : 'grid-cols-4'}`}>
                                    <TabsTrigger value="personal">{t('Personal')}</TabsTrigger>
                                    <TabsTrigger value="academic">{t('Academic')}</TabsTrigger>
                                    <TabsTrigger value="parent">{t('Parent')}</TabsTrigger>
                                    <TabsTrigger value="address">{t('Address')}</TabsTrigger>
                                    {hasCustomFields && (
                                        <TabsTrigger value="custom">{t('Admission Fields')}</TabsTrigger>
                                    )}
                                </TabsList>

                                <TabsContent value="personal" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('First Name *')}</Label>
                                            <Input
                                                value={formData.first_name}
                                                onChange={(e) => handleInputChange('first_name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>
                                                {t('First Name')} ({regionalLanguageLabel}) *
                                            </Label>
                                            <MarathiInput
                                                value={formData.first_name_mr}
                                                onChange={(value) => handleRegionalInputChange('first_name_mr', value)}
                                                required
                                                label={`${t('First Name')} (${regionalLanguageLabel})`}
                                                fieldId="first_name_mr"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Middle Name / Father Name *')}</Label>
                                            <Input
                                                value={formData.middle_name}
                                                onChange={(e) => handleInputChange('middle_name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>
                                                {t('Middle Name / Father Name')} ({regionalLanguageLabel}) *
                                            </Label>
                                            <MarathiInput
                                                value={formData.middle_name_mr}
                                                onChange={(value) => handleRegionalInputChange('middle_name_mr', value)}
                                                required
                                                label={`${t('Middle Name / Father Name')} (${regionalLanguageLabel})`}
                                                fieldId="middle_name_mr"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Last Name *')}</Label>
                                            <Input
                                                value={formData.last_name}
                                                onChange={(e) => handleInputChange('last_name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>
                                                {t('Last Name')} ({regionalLanguageLabel}) *
                                            </Label>
                                            <MarathiInput
                                                value={formData.last_name_mr}
                                                onChange={(value) => handleRegionalInputChange('last_name_mr', value)}
                                                required
                                                label={`${t('Last Name')} (${regionalLanguageLabel})`}
                                                fieldId="last_name_mr"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Gender *')}</Label>
                                            <Select
                                                value={formData.gender}
                                                onValueChange={(v) => handleInputChange('gender', v)}
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
                                            <Label>{t('Date of Birth *')}</Label>
                                            <Input
                                                type="date"
                                                value={formData.date_of_birth}
                                                onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Blood Group')}</Label>
                                            <Select
                                                value={formData.blood_group}
                                                onValueChange={(v) => handleInputChange('blood_group', v)}
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
                                                onValueChange={(v) => handleInputChange('preferred_language', v)}
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
                                        <div className="space-y-2">
                                            <Label>{t('Admission Date *')}</Label>
                                            <Input
                                                type="date"
                                                value={formData.admission_date}
                                                onChange={(e) => handleInputChange('admission_date', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Email')}</Label>
                                            <Input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Phone')}</Label>
                                            <Input
                                                value={formData.phone}
                                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="academic" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('Class *')}</Label>
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
                                                    {classOptions.map((c) => (
                                                        <SelectItem key={c} value={c}>
                                                            {c}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Section *')}</Label>
                                            <Select
                                                value={formData.section}
                                                onValueChange={(v) => handleInputChange('section', v)}
                                                disabled={formSectionOptions.length === 0}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select section')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {formSectionOptions.map((s) => (
                                                        <SelectItem key={s} value={s}>
                                                            {t('Section')}
                                                            {s}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Roll Number')}</Label>
                                            <Input
                                                value={formData.roll_number}
                                                onChange={(e) => handleInputChange('roll_number', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Aadhaar Number')}</Label>
                                            <Input
                                                value={formData.aadhar_number}
                                                onChange={(e) => handleInputChange('aadhar_number', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Register No.')}</Label>
                                            <Input
                                                value={formData.register_no}
                                                onChange={(e) => handleInputChange('register_no', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('UDISE Student ID')}</Label>
                                            <Input
                                                value={formData.udise_student_id}
                                                onChange={(e) => handleInputChange('udise_student_id', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('SARAL Student ID')}</Label>
                                            <Input
                                                value={formData.saral_student_id}
                                                onChange={(e) => handleInputChange('saral_student_id', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Category')}</Label>
                                            <Select
                                                value={formData.category}
                                                onValueChange={(v) => handleInputChange('category', v)}
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
                                        <div className="space-y-2">
                                            <Label>{t('Previous School')}</Label>
                                            <Input
                                                value={formData.previous_school}
                                                onChange={(e) => handleInputChange('previous_school', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="parent" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t("Father's Name")}</Label>
                                            <Input
                                                value={formData.father_name}
                                                onChange={(e) => handleInputChange('father_name', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("Father's Phone")}</Label>
                                            <Input
                                                value={formData.father_phone}
                                                onChange={(e) => handleInputChange('father_phone', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("Father's Occupation")}</Label>
                                            <Input
                                                value={formData.father_occupation}
                                                onChange={(e) => handleInputChange('father_occupation', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("Mother's Name")}</Label>
                                            <Input
                                                value={formData.mother_name}
                                                onChange={(e) => handleInputChange('mother_name', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("Mother's Phone")}</Label>
                                            <Input
                                                value={formData.mother_phone}
                                                onChange={(e) => handleInputChange('mother_phone', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("Mother's Occupation")}</Label>
                                            <Input
                                                value={formData.mother_occupation}
                                                onChange={(e) => handleInputChange('mother_occupation', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="address" className="space-y-4 mt-4">
                                    <div className="space-y-6">
                                        <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                                            <Checkbox
                                                checked={formData.same_as_permanent}
                                                onCheckedChange={(checked) =>
                                                    handleInputChange('same_as_permanent', Boolean(checked))
                                                }
                                            />
                                            <span className="text-sm font-medium text-slate-700">
                                                {t('Same as Permanent Address')}
                                            </span>
                                        </label>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2 col-span-2">
                                                <Label>{t('Permanent Address')}</Label>
                                                <Input
                                                    value={formData.permanent_address}
                                                    onChange={(e) =>
                                                        handleInputChange('permanent_address', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('City')}</Label>
                                                <Input
                                                    value={formData.city}
                                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('State')}</Label>
                                                <Input
                                                    value={formData.state}
                                                    onChange={(e) => handleInputChange('state', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <Label>{t('Pincode')}</Label>
                                                <Input
                                                    value={formData.pincode}
                                                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {!formData.same_as_permanent && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2 col-span-2">
                                                    <Label>{t('Correspondence Address')}</Label>
                                                    <Input
                                                        value={formData.current_address}
                                                        onChange={(e) =>
                                                            handleInputChange('current_address', e.target.value)
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                {hasCustomFields && (
                                    <TabsContent value="custom" className="space-y-4 mt-4">
                                        <AdmissionCustomFields
                                            fields={admissionCustomFields}
                                            values={customFieldValues}
                                            onChange={(fieldKey, value) =>
                                                setCustomFieldValues((current) => ({ ...current, [fieldKey]: value }))
                                            }
                                        />
                                    </TabsContent>
                                )}
                            </Tabs>
                        </form>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
