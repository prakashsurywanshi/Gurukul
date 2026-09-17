import { router, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Save } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface DisclosureSection {
    key: string;
    label: string;
    description: string;
    multiline: boolean;
}

interface CbseDisclosureProps {
    user: any;
    disclosure: Record<string, string>;
    sectionOptions: DisclosureSection[];
}

interface PageProps {
    user: any;
    disclosure?: Record<string, string>;
    sectionOptions?: DisclosureSection[];
}

export default function CbseDisclosure({ user, disclosure, sectionOptions = [] }: CbseDisclosureProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash ?? {};

    const [sections, setSections] = useState<Record<string, string>>(disclosure ?? {});
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);

        router.patch(
            '/website-cms/cbse-disclosure',
            { sections },
            {
                preserveScroll: true,
                onSuccess: () => setIsSaving(false),
                onError: () => setIsSaving(false),
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="cbse-disclosure">
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            {t('cbse_disclosure')} <span className="sr-only">{t('CBSE Disclosure')}</span>
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Edit the mandatory disclosure published publicly on the school website.
                        </p>
                    </div>
                    <Button type="submit" form="cbse-disclosure-form" disabled={isSaving}>
                        <Save className="h-4 w-4" />
                        {isSaving ? t('Saving...') : t('Save Disclosure')}
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

                <form id="cbse-disclosure-form" onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {sectionOptions.map((section) => {
                            const Control = section.multiline ? Textarea : Input;

                            return (
                                <Card key={section.key}>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">{section.label}</CardTitle>
                                        <CardDescription>{section.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Label htmlFor={`disclosure-${section.key}`} className="sr-only">
                                            {section.label}
                                        </Label>
                                        <Control
                                            id={`disclosure-${section.key}`}
                                            rows={section.multiline ? 5 : 1}
                                            value={sections[section.key] ?? ''}
                                            onChange={(event) =>
                                                setSections((previous) => ({
                                                    ...previous,
                                                    [section.key]: event.target.value,
                                                }))
                                            }
                                            placeholder={section.multiline ? t('Enter details...') : t('Enter value...')}
                                        />
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
