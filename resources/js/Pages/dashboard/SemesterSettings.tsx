import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { GraduationCap, Plus, RefreshCcw, Star, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';

interface SemesterProps {
    user: {
        organization_id?: number | null;
    };
    academicYear: {
        id: number;
        name: string;
        start_date: string;
        end_date: string;
    };
    semesters: {
        id: number;
        name: string;
        sem_no: number;
        start_date: string;
        end_date: string;
        is_current: boolean;
    }[];
    nextSemNo: number;
}

export default function SemesterSettings({ user, academicYear, semesters, nextSemNo }: SemesterProps) {
    const { t } = useLanguage();
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const flash = page.props.flash ?? {};

    const [formData, setFormData] = useState({
        name: `${t('Semester')} ${nextSemNo}`,
        start_date: academicYear.start_date,
        end_date: academicYear.end_date,
    });

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.post(
            '/semesters',
            {
                name: formData.name,
                sem_no: nextSemNo,
                start_date: formData.start_date,
                end_date: formData.end_date,
            },
            { preserveScroll: true },
        );
    };

    const setCurrent = (id: number) => {
        router.patch(`/semesters/${id}/current`, {}, { preserveScroll: true });
    };

    const deleteSemester = (id: number) => {
        if (!window.confirm(t('Delete this semester? This cannot be undone.'))) {
            return;
        }

        router.delete(`/semesters/${id}`, { preserveScroll: true });
    };

    return (
        <DashboardLayout user={user} activeTab="settings">
            <div className="min-h-full bg-slate-50 p-8 dark:bg-[var(--background)]">
                <div className="mx-auto max-w-3xl space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-[var(--foreground)]">
                                {t('Semesters')}
                            </h1>
                            <p className="mt-1 text-sm text-slate-600 dark:text-[var(--muted-foreground)]">
                                {academicYear.name}
                            </p>
                        </div>
                        <Button type="button" variant="outline" onClick={() => router.get('/settings')}>
                            <RefreshCcw className="h-4 w-4" />
                            {t('Back to Settings')}
                        </Button>
                    </div>

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

                    <Card className="border-slate-200 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-[var(--foreground)]">
                                <GraduationCap className="h-5 w-5 text-blue-500" />
                                {t('Semesters (College Mode)')}
                            </CardTitle>
                            <CardDescription>
                                {t('Divide the current academic session into semesters and manage which one is active.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {semesters.length === 0 ? (
                                <p className="py-6 text-center text-sm text-slate-500">
                                    {t('No semesters created yet for this session.')}
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {semesters.map((semester) => (
                                        <div
                                            key={semester.id}
                                            className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[var(--border)]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                                                    {semester.sem_no}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-[var(--foreground)]">
                                                        {semester.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {semester.start_date} - {semester.end_date}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {semester.is_current && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                                                        <Star className="h-3 w-3" />
                                                        {t('Current')}
                                                    </span>
                                                )}
                                                {!semester.is_current && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrent(semester.id)}
                                                    >
                                                        {t('Mark Current')}
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteSemester(semester.id)}
                                                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
                        <CardHeader>
                            <CardTitle className="text-slate-900 dark:text-[var(--foreground)]">
                                {t('Add Semester')}
                            </CardTitle>
                            <CardDescription>
                                {t('Semesters are numbered automatically. Set the dates within the academic session.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid gap-6 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>{t('Semester Number')}</Label>
                                        <Input value={nextSemNo} disabled readOnly />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="semester-name">{t('Semester Name')}</Label>
                                        <Input
                                            id="semester-name"
                                            value={formData.name}
                                            onChange={(event) =>
                                                setFormData({ ...formData, name: event.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="semester-start">{t('Start Date')}</Label>
                                        <Input
                                            id="semester-start"
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(event) =>
                                                setFormData({ ...formData, start_date: event.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="semester-end">{t('End Date')}</Label>
                                        <Input
                                            id="semester-end"
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(event) =>
                                                setFormData({ ...formData, end_date: event.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                                        <Plus className="h-4 w-4" />
                                        {t('Add Semester')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}