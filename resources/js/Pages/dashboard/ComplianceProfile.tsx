import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Building2, Save, SlidersHorizontal } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

const PROFILE_FIELDS = [
    'udise_code',
    'affiliation_no',
    'board',
    'affiliated_year',
    'school_category',
    'grades_offered',
    'medium_of_instruction',
    'shift_timings',
] as const;

const FIELD_SETTINGS = [
    'enable_udise_display',
    'enable_affiliation_details',
    'enable_board_details',
    'enable_recognitions',
    'enable_grades_offered',
    'enable_medium_of_instruction',
    'enable_shift_timings',
] as const;

type ProfileShape = Record<(typeof PROFILE_FIELDS)[number], string>;
type FieldShape = Record<(typeof FIELD_SETTINGS)[number], boolean>;

export default function ComplianceProfile({
    user,
    profile,
    fields,
}: {
    user: any;
    profile: ProfileShape;
    fields: FieldShape;
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [form, setForm] = useState<ProfileShape>(profile);
    const [fieldForm, setFieldForm] = useState<FieldShape>(fields);
    const [tab, setTab] = useState('profile');
    const [processing, setProcessing] = useState(false);

    const showFlash = () => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    };

    useEffect(() => {
        showFlash();
    }, [flash.error, flash.success]);

    const save = () => {
        setProcessing(true);
        router.patch(
            '/compliance/profile',
            { profile: form, fields: fieldForm },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success(t('Compliance profile saved.'));
                },
                onError: () => toast.error(t('Failed to save compliance settings.')),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const updateProfile = (key: keyof ProfileShape, value: string) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const toggleField = (key: keyof FieldShape, value: boolean) => {
        setFieldForm((current) => ({ ...current, [key]: value }));
    };

    return (
        <DashboardLayout user={user} activeTab="compliance">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('School Profile')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Maintain regulatory school details and field visibility for compliance.')}
                            </p>
                        </div>
                        <Button onClick={save} disabled={processing} className="gap-2">
                            <Save className="h-4 w-4" />
                            {processing ? t('Saving...') : t('Save')}
                        </Button>
                    </div>

                    <Tabs value={tab} onValueChange={setTab}>
                        <TabsList>
                            <TabsTrigger value="profile">
                                <Building2 className="mr-2 h-4 w-4" />
                                {t('School Profile')}
                            </TabsTrigger>
                            <TabsTrigger value="fields">
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                {t('Field Settings')}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile" className="mt-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>{t('Regulatory Profile')}</CardTitle>
                                    <CardDescription>
                                        {t('Details used for board and regulatory reporting.')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 sm:grid-cols-2">
                                    {PROFILE_FIELDS.map((key) => (
                                        <div key={key} className="space-y-1.5">
                                            <Label htmlFor={`profile-${key}`}>{t(labelFor(key))}</Label>
                                            <Input
                                                id={`profile-${key}`}
                                                value={form[key]}
                                                onChange={(event) => updateProfile(key, event.target.value)}
                                                maxLength={120}
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="fields" className="mt-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>{t('Field Visibility')}</CardTitle>
                                    <CardDescription>
                                        {t('Toggle which regulatory fields are tracked and displayed.')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 sm:grid-cols-2">
                                    {FIELD_SETTINGS.map((key) => (
                                        <label
                                            key={key}
                                            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={fieldForm[key]}
                                                onChange={(event) => toggleField(key, event.target.checked)}
                                                className="mt-1 h-4 w-4 rounded border-slate-300 accent-indigo-600"
                                            />
                                            <span className="text-sm font-medium text-slate-800">
                                                {t(labelFor(key))}
                                            </span>
                                        </label>
                                    ))}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </DashboardLayout>
    );
}

function labelFor(key: string): string {
    const labels: Record<string, string> = {
        udise_code: 'UDISE Code',
        affiliation_no: 'Affiliation No.',
        board: 'Board',
        affiliated_year: 'Affiliated Year',
        school_category: 'School Category',
        grades_offered: 'Grades Offered',
        medium_of_instruction: 'Medium of Instruction',
        shift_timings: 'Shift Timings',
        enable_udise_display: 'Show UDISE code',
        enable_affiliation_details: 'Show affiliation details',
        enable_board_details: 'Show board details',
        enable_recognitions: 'Show recognitions',
        enable_grades_offered: 'Show grades offered',
        enable_medium_of_instruction: 'Show medium of instruction',
        enable_shift_timings: 'Show shift timings',
    };

    return labels[key] ?? key;
}
