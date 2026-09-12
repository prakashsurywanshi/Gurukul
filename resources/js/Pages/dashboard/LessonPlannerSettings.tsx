import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useEffect, useState } from 'react';
import { BookOpenCheck, Pencil, Save } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

interface LessonPlannerSettingsProps {
    user: any;
    lessonPlannerSettings?: typeof defaultFormData | null;
}

const defaultFormData = {
    default_duration: 40,
    require_approval: true,
    auto_carry_forward: true,
};

export default function LessonPlannerSettings({ user, lessonPlannerSettings }: LessonPlannerSettingsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<typeof defaultFormData>({
        ...defaultFormData,
        ...(lessonPlannerSettings ?? {}),
    });

    useEffect(() => {
        setFormData({
            ...defaultFormData,
            ...(lessonPlannerSettings ?? {}),
        });
    }, [lessonPlannerSettings]);

    useEffect(() => {
        if (flash.success) {
            setIsEditing(false);
        }
    }, [flash.success]);

    const updateField = (field: keyof typeof defaultFormData, value: string | boolean | number) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.patch(
            '/lesson-plan/settings',
            {
                ...formData,
                default_duration: Number(formData.default_duration),
            },
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{t('Lesson Planner Settings')}</h2>
                        <p className="text-sm text-slate-500">
                            {t('How lesson plans are written, approved and carried forward.')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {!isEditing ? (
                            <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                                <Pencil className="h-4 w-4" />
                                {t('Edit')}
                            </Button>
                        ) : (
                            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                                {t('Cancel')}
                            </Button>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <BookOpenCheck className="mr-2 inline-block h-5 w-5 text-indigo-600" />
                                {t('Lesson Plan Defaults')}
                            </CardTitle>
                            <CardDescription>
                                {t('Default behaviour applied when teachers create lesson plans.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                                <div>
                                    <p className="font-medium text-slate-900">{t('Require Approval')}</p>
                                    <p className="text-sm text-slate-500">
                                        {t('Lesson plans must be approved by an admin before they count as final.')}
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.require_approval}
                                    disabled={!isEditing}
                                    onCheckedChange={(value) => updateField('require_approval', value)}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                                <div>
                                    <p className="font-medium text-slate-900">{t('Auto Carry Forward')}</p>
                                    <p className="text-sm text-slate-500">
                                        {t('Plans not taught on the scheduled day are automatically carried forward.')}
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.auto_carry_forward}
                                    disabled={!isEditing}
                                    onCheckedChange={(value) => updateField('auto_carry_forward', value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Default Duration (minutes)')}</Label>
                                <Input
                                    type="number"
                                    min={5}
                                    max={180}
                                    className="max-w-xs"
                                    value={formData.default_duration}
                                    disabled={!isEditing}
                                    onChange={(event) => updateField('default_duration', event.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {isEditing ? (
                        <div className="flex justify-end">
                            <Button type="submit">
                                <Save className="h-4 w-4" />
                                {t('Save Settings')}
                            </Button>
                        </div>
                    ) : null}
                </form>
            </div>
        </DashboardLayout>
    );
}
