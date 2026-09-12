import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, Loader2, Pencil, Save, Users } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

interface HrSettingsProps {
    user: any;
    hrSettings?: typeof defaultFormData;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const defaultFormData = {
    saturday_pattern: 'no_saturdays_off',
    weekly_off_days: ['Sunday'] as string[],
};

const SATURDAY_PATTERNS: { value: string; label: string; description: string }[] = [
    { value: 'no_saturdays_off', label: 'No Saturdays Off', description: 'All Saturdays are working days' },
    { value: 'every_saturday_off', label: 'Every Saturday Off', description: 'All Saturdays are holidays' },
    {
        value: 'last_saturday_off',
        label: 'Last Saturday Off',
        description: 'Only the last Saturday of each month is off',
    },
    { value: 'alternate_first_third', label: '1st & 3rd Saturday Off', description: '2nd & 4th Saturdays are working' },
    {
        value: 'alternate_second_fourth',
        label: '2nd & 4th Saturday Off',
        description: '1st & 3rd Saturdays are working',
    },
];

export default function HrSettings(pageProps: HrSettingsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [formData, setFormData] = useState({
        ...defaultFormData,
        ...(pageProps.hrSettings ?? {}),
    });

    useEffect(() => {
        setFormData({ ...defaultFormData, ...(pageProps.hrSettings ?? {}) });
    }, [pageProps.hrSettings]);

    useEffect(() => {
        if (flash.success) {
            setSuccessMessage(flash.success);
            setTimeout(() => setSuccessMessage(''), 5000);
        }
        if (flash.error) {
            setErrorMessage(flash.error);
            setTimeout(() => setErrorMessage(''), 5000);
        }
    }, [flash.error, flash.success]);

    const toggleDay = (day: string) => {
        setFormData((current) => {
            const days = [...current.weekly_off_days];
            if (days.includes(day)) {
                return { ...current, weekly_off_days: days.filter((d) => d !== day) };
            }
            return { ...current, weekly_off_days: [...days, day] };
        });
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        router.patch('/settings/hr', formData, {
            onFinish: () => setIsSaving(false),
        });
    };

    const selectedPattern =
        SATURDAY_PATTERNS.find((p) => p.value === formData.saturday_pattern) ?? SATURDAY_PATTERNS[0];

    return (
        <DashboardLayout user={pageProps.user}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-600 text-white">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {t('HR Settings')}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('Working days, weekly offs and holiday configuration.')}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {!isEditing && (
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                                <Pencil className="mr-2 h-4 w-4" /> {t('Edit')}
                            </Button>
                        )}
                        {isEditing && (
                            <>
                                <Button variant="outline" onClick={() => setIsEditing(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button
                                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                                    onClick={handleSubmit}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    {t('Save')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {successMessage && (
                    <div className="rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4" />
                            {successMessage}
                        </div>
                    </div>
                )}

                {errorMessage && (
                    <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                        {errorMessage}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <CalendarDays className="h-4 w-4" />
                            {t('Weekly Working Pattern')}
                        </CardTitle>
                        <CardDescription>
                            {t('Define the weekly off pattern used for staff attendance and leave balances.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>{t('Saturday Pattern')}</Label>
                            <Select
                                value={formData.saturday_pattern}
                                disabled={!isEditing}
                                onValueChange={(v) => setFormData((c) => ({ ...c, saturday_pattern: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SATURDAY_PATTERNS.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {t(p.label)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">{t(selectedPattern.description)}</p>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('Weekly Off Days')}</Label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {WEEKDAYS.map((day) => {
                                    const selected = formData.weekly_off_days.includes(day);
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            disabled={!isEditing}
                                            onClick={() => toggleDay(day)}
                                            className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                                                selected
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            {t(day)}
                                            {selected && (
                                                <Badge className="ml-1.5 hidden bg-indigo-100 text-indigo-700 sm:inline-flex">
                                                    OFF
                                                </Badge>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-slate-500">
                                {t('Selected days are treated as weekly holidays for attendance and leave.')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
