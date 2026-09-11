import { router, usePage, Link } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { FilePlus2, Save } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';

interface AdmissionSection {
    key: string;
    label: string;
    description: string;
}

interface AdmissionCustomField {
    id: number;
    label: string;
    fieldType: string;
    isRequired: boolean;
    isActive: boolean;
    showInAdmission: boolean;
}

interface AdmissionSettingsProps {
    user: any;
    settings: {
        enable_public_form: boolean;
        require_verification: boolean;
        require_documents: boolean;
        sections: Record<string, boolean>;
    };
    customFields: AdmissionCustomField[];
    sectionOptions: AdmissionSection[];
}

interface PageProps {
    user: any;
    settings?: AdmissionSettingsProps['settings'];
    customFields?: AdmissionCustomField[];
    sectionOptions?: AdmissionSection[];
}

export default function AdmissionSettings({
    user,
    settings,
    customFields,
    sectionOptions = [],
}: AdmissionSettingsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash ?? {};

    const [form, setForm] = useState({
        enablePublicForm: settings?.enable_public_form ?? true,
        requireVerification: settings?.require_verification ?? true,
        requireDocuments: settings?.require_documents ?? false,
        sections: settings?.sections ?? {},
    });
    const [selectedFields, setSelectedFields] = useState<Record<number, boolean>>(
        Object.fromEntries((customFields ?? []).map((field) => [field.id, field.showInAdmission])),
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);

        router.patch(
            '/admission-settings',
            {
                enable_public_form: form.enablePublicForm,
                require_verification: form.requireVerification,
                require_documents: form.requireDocuments,
                sections: form.sections,
                customFieldIds: Object.entries(selectedFields)
                    .filter(([, enabled]) => enabled)
                    .map(([id]) => Number(id)),
            },
            {
                preserveScroll: true,
                onSuccess: () => setIsSaving(false),
                onError: () => setIsSaving(false),
            },
        );
    };

    const toggleSection = (key: string) => {
        setForm((previous) => ({
            ...previous,
            sections: { ...previous.sections, [key]: !(previous.sections[key] ?? true) },
        }));
    };

    const toggleField = (id: number) => {
        setSelectedFields((previous) => ({ ...previous, [id]: !(previous[id] ?? false) }));
    };

    const activeCustomFields = (customFields ?? []).filter((field) => field.isActive);

    return (
        <DashboardLayout user={user} activeTab="admission-settings">
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            {t('admission_settings')} <span className="sr-only">Admission Settings</span>
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Configure the public admission form behaviour and which fields are shown to applicants.
                        </p>
                    </div>
                    <Button type="submit" form="admission-settings-form" disabled={isSaving}>
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>

                {flash.success && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                )}
                {flash.error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        {flash.error}
                    </div>
                )}

                <form id="admission-settings-form" onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Admission Preferences</CardTitle>
                            <CardDescription>
                                Control how applicants reach and use the public admission form.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <p className="font-medium text-slate-900">Enable Public Admission Form</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Allow visitors to submit admission applications from the school website.
                                    </p>
                                </div>
                                <Switch
                                    checked={form.enablePublicForm}
                                    onCheckedChange={(checked) =>
                                        setForm((previous) => ({ ...previous, enablePublicForm: checked }))
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <p className="font-medium text-slate-900">Require Email / Phone Verification</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Ask applicants to verify their contact details with an OTP before submitting.
                                    </p>
                                </div>
                                <Switch
                                    checked={form.requireVerification}
                                    onCheckedChange={(checked) =>
                                        setForm((previous) => ({ ...previous, requireVerification: checked }))
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <p className="font-medium text-slate-900">Require Documents at Submission</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Make document uploads mandatory on the admission form.
                                    </p>
                                </div>
                                <Switch
                                    checked={form.requireDocuments}
                                    onCheckedChange={(checked) =>
                                        setForm((previous) => ({ ...previous, requireDocuments: checked }))
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Form Sections</CardTitle>
                            <CardDescription>
                                Choose which sections appear on the public admission form.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {sectionOptions.map((section) => (
                                <div
                                    key={section.key}
                                    className="flex items-center justify-between rounded-lg border p-4"
                                >
                                    <div>
                                        <p className="font-medium text-slate-900">{section.label}</p>
                                        <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                                    </div>
                                    <Switch
                                        checked={form.sections[section.key] ?? true}
                                        onCheckedChange={() => toggleSection(section.key)}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Admission Form Fields</CardTitle>
                            <CardDescription>
                                Custom fields shown on the admission form. Manage shared definitions on the{' '}
                                <Link href="/custom-fields" className="text-blue-600 hover:underline">
                                    Custom Fields
                                </Link>{' '}
                                page.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {activeCustomFields.length > 0 ? (
                                <div className="space-y-3">
                                    {activeCustomFields.map((field) => (
                                        <div
                                            key={field.id}
                                            className="flex items-center justify-between rounded-lg border p-4"
                                        >
                                            <div>
                                                <p className="font-medium text-slate-900">{field.label}</p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {field.fieldType}
                                                    {field.isRequired ? ' · Required' : ' · Optional'}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={selectedFields[field.id] ?? false}
                                                onCheckedChange={() => toggleField(field.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                                    <FilePlus2 className="h-8 w-8 text-slate-400" />
                                    <p className="mt-3 text-sm font-medium text-slate-700">
                                        No custom admission fields yet
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Create custom fields on the Custom Fields page, then enable them for the
                                        admission form here.
                                    </p>
                                    <Link href="/custom-fields">
                                        <Button variant="outline" className="mt-4">
                                            Create Custom Field
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </form>
            </div>
        </DashboardLayout>
    );
}
