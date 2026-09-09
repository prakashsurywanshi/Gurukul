import { router, Link, usePage } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';
import { Pencil, PenLine, Save } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

interface LanguageSettingsProps {
    dual_language_enabled: boolean;
    regional_language: string;
    regional_language_name: string;
    universal_language_enabled: boolean;
    available_universal_languages: string[];
    primary_language: string;
    languages: Record<string, string>;
}

interface LanguageSettingsPageProps {
    user: any;
    languageSettings?: LanguageSettingsProps | null;
}

const defaultFormData = {
    dualLanguageEnabled: false,
    regionalLanguage: 'mr',
    universalLanguageEnabled: false,
    availableUniversalLanguages: ['en', 'mr', 'hi'] as string[],
};

export default function LanguageSettings({ user, languageSettings }: LanguageSettingsPageProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash ?? {};
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(defaultFormData);

    useEffect(() => {
        setFormData({
            dualLanguageEnabled: languageSettings?.dual_language_enabled ?? false,
            regionalLanguage: languageSettings?.regional_language ?? 'mr',
            universalLanguageEnabled: languageSettings?.universal_language_enabled ?? false,
            availableUniversalLanguages: languageSettings?.available_universal_languages ?? ['en', 'mr', 'hi'],
        });
    }, [languageSettings]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.patch(
            '/settings/language',
            {
                dualLanguageEnabled: formData.dualLanguageEnabled,
                regionalLanguage: formData.regionalLanguage,
                universalLanguageEnabled: formData.universalLanguageEnabled,
                availableUniversalLanguages: formData.availableUniversalLanguages,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsEditing(false);
                },
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="language-settings">
            <div className="min-h-full bg-slate-50 p-8 dark:bg-[var(--background)]">
                <div className="mx-auto max-w-4xl space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-[var(--foreground)]">
                                {t('Language Settings')}
                            </h1>
                            <p className="mt-1 text-sm text-slate-600 dark:text-[var(--muted-foreground)]">
                                {t(
                                    'Universal languages set the dashboard and website language. The regional language is used only for student records and regional outputs like certificates.',
                                )}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant={isEditing ? 'outline' : 'default'}
                            onClick={() => {
                                setIsEditing((current) => !current);
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                            {isEditing ? t('Cancel Edit') : t('Edit Setting')}
                        </Button>
                    </div>

                    <Card className="border-slate-200 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
                        <CardHeader>
                            <CardTitle className="text-slate-900 dark:text-[var(--foreground)]">
                                {t('Language')}
                            </CardTitle>
                            <CardDescription>
                                {t(
                                    'Universal languages set the dashboard and website language. The regional language is used only for student records and regional outputs like certificates.',
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {flash.success && (
                                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                                    {flash.success}
                                </div>
                            )}
                            {flash.error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                    {flash.error}
                                </div>
                            )}

                            <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--secondary)]">
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-[var(--foreground)]">
                                        {t('Dual Language Mode')}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-[var(--muted-foreground)]">
                                        {t(
                                            'For regional language schools. Saves record data (student information, certificates, etc.) in English and the selected regional language.',
                                        )}
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.dualLanguageEnabled}
                                    disabled={!isEditing}
                                    onCheckedChange={(checked) =>
                                        setFormData({
                                            ...formData,
                                            dualLanguageEnabled: checked,
                                        })
                                    }
                                />
                            </div>

                            <div
                                className={`grid gap-6 md:grid-cols-2 ${!isEditing && !formData.dualLanguageEnabled ? 'opacity-60' : ''}`}
                            >
                                <div className="space-y-2">
                                    <Label>{t('Primary Language')}</Label>
                                    <Input value="English" disabled readOnly />
                                    <p className="text-xs text-slate-500">
                                        {t('English is compulsory and always the default language.')}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('Regional Language')}</Label>
                                    <Select
                                        value={formData.regionalLanguage}
                                        disabled={!isEditing}
                                        onValueChange={(value) =>
                                            setFormData({
                                                ...formData,
                                                regionalLanguage: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select regional language')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {languageSettings?.languages ? (
                                                Object.entries(languageSettings.languages)
                                                    .filter(([code]) => code !== 'en')
                                                    .map(([code, name]) => (
                                                        <SelectItem key={code} value={code}>
                                                            {name}
                                                        </SelectItem>
                                                    ))
                                            ) : (
                                                <>
                                                    <SelectItem value="mr">मराठी (Marathi)</SelectItem>
                                                    <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-500">
                                        {formData.dualLanguageEnabled
                                            ? t(
                                                  'Regional-language data (e.g. Marathi) is stored alongside English and used on certificates, ID cards and marksheets.',
                                              )
                                            : t(
                                                  'Enable Dual Language Mode to choose which regional language records are stored in.',
                                              )}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--secondary)]">
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-[var(--foreground)]">
                                        {t('Universal Language Mode')}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-[var(--muted-foreground)]">
                                        {t(
                                            'Select which languages the dashboard (admin panel) and public website are available in.',
                                        )}
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.universalLanguageEnabled}
                                    disabled={!isEditing}
                                    onCheckedChange={(checked) =>
                                        setFormData({
                                            ...formData,
                                            universalLanguageEnabled: checked,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>{t('Available Languages')}</Label>
                                <p className="text-xs text-slate-500">
                                    {t(
                                        'The languages offered in the dashboard language selector and on the website. English is always included.',
                                    )}
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {(languageSettings?.languages
                                        ? Object.entries(languageSettings.languages)
                                        : [
                                              ['en', 'English'],
                                              ['mr', 'मराठी (Marathi)'],
                                              ['hi', 'हिन्दी (Hindi)'],
                                          ]
                                    ).map(([code, name]) => (
                                        <label
                                            key={code}
                                            className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                                                formData.availableUniversalLanguages.includes(code)
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-[var(--border)] dark:bg-[var(--card)]'
                                            }`}
                                        >
                                            <span className="text-sm font-medium text-slate-800 dark:text-[var(--foreground)]">
                                                {name}
                                            </span>
                                            <Switch
                                                checked={
                                                    code === 'en' || formData.availableUniversalLanguages.includes(code)
                                                }
                                                disabled={!isEditing || code === 'en'}
                                                onCheckedChange={(checked) => {
                                                    setFormData((current) => {
                                                        const next = checked
                                                            ? [...current.availableUniversalLanguages, code]
                                                            : current.availableUniversalLanguages.filter(
                                                                  (c) => c !== code,
                                                              );
                                                        return {
                                                            ...current,
                                                            availableUniversalLanguages: next,
                                                        };
                                                    });
                                                }}
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button asChild variant="outline" className="gap-2">
                                    <Link href="/settings/language-translations">
                                        <PenLine className="h-4 w-4" />
                                        {t('Language Manual Entry')}
                                    </Link>
                                </Button>
                            </div>

                            {isEditing && (
                                <form onSubmit={handleSubmit} className="flex justify-end">
                                    <Button type="submit">
                                        <Save className="h-4 w-4" />
                                        {t('Save Settings')}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
