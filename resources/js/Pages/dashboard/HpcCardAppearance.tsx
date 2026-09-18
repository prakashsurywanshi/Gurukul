import { useState } from 'react';
import { GraduationCap, Palette, Save } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { useLanguage } from '../../i18n/LanguageProvider';

interface HpcCardAppearanceProps {
    user: any;
    settings: {
        primary_color: string;
        accent_color: string;
        font_size: string;
        show_logo: boolean;
        show_grades: boolean;
    };
}

const SAMPLE_GRADES = [
    { label: 'Mathematics', value: 'A' },
    { label: 'Science', value: 'A' },
    { label: 'English', value: 'B' },
    { label: 'Social Studies', value: 'A' },
];

export default function HpcCardAppearance(pageProps: HpcCardAppearanceProps) {
    const { user, settings } = pageProps;
    const { t } = useLanguage();

    const [primaryColor, setPrimaryColor] = useState(settings.primary_color);
    const [accentColor, setAccentColor] = useState(settings.accent_color);
    const [fontSize, setFontSize] = useState(settings.font_size);
    const [showLogo, setShowLogo] = useState(settings.show_logo);
    const [showGrades, setShowGrades] = useState(settings.show_grades);

    const save = () => {
        router.post('/hpc/card-appearance', {
            primary_color: primaryColor,
            accent_color: accentColor,
            font_size: fontSize,
            show_logo: showLogo,
            show_grades: showGrades,
        });
    };

    const previewFontSize = fontSize === 'small' ? '12px' : fontSize === 'large' ? '15px' : '13.5px';

    return (
        <DashboardLayout user={user}>
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold dark:text-white">{t('hpc.appearanceTitle')}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('hpc.appearanceSubtitle')}</p>
                    </div>
                    <Button onClick={save}>
                        <Save className="h-4 w-4 mr-2" />
                        {t('hpc.saveAppearance')}
                    </Button>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="h-5 w-5" />
                                {t('hpc.appearanceSettings')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('hpc.primaryColor')}</Label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="h-9 w-12 rounded-md border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
                                        />

                                        <input
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label>{t('hpc.accentColor')}</Label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={accentColor}
                                            onChange={(e) => setAccentColor(e.target.value)}
                                            className="h-9 w-12 rounded-md border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
                                        />

                                        <input
                                            value={accentColor}
                                            onChange={(e) => setAccentColor(e.target.value)}
                                            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label>{t('hpc.fontSize')}</Label>
                                <select
                                    value={fontSize}
                                    onChange={(e) => setFontSize(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                >
                                    <option value="small">{t('Small')}</option>
                                    <option value="normal">{t('Normal')}</option>
                                    <option value="large">{t('Large')}</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={showLogo}
                                        onChange={(e) => setShowLogo(e.target.checked)}
                                        className="h-4 w-4"
                                    />

                                    <span className="text-sm dark:text-white">{t('hpc.showLogo')}</span>
                                </label>
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={showGrades}
                                        onChange={(e) => setShowGrades(e.target.checked)}
                                        className="h-4 w-4"
                                    />

                                    <span className="text-sm dark:text-white">{t('hpc.showGrades')}</span>
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('hpc.livePreview')}</CardTitle>
                            <CardDescription>{t('hpc.previewHint')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-center bg-slate-100 py-10 dark:bg-slate-900/40">
                                <div
                                    className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                                    style={{ fontSize: previewFontSize }}
                                >
                                    <div
                                        className="flex items-center gap-3 px-5 py-4 text-white"
                                        style={{ background: primaryColor }}
                                    >
                                        {showLogo ? (
                                            <GraduationCap className="h-8 w-8 shrink-0 opacity-90" />
                                        ) : (
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                                                {t('SG')}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.25em] opacity-85">
                                                {t('hpc.progressCardLabel')}
                                            </p>
                                            <h3 className="text-base font-bold leading-tight">
                                                {t('hpc.sampleCardTitle')}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="space-y-4 px-5 py-4">
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                    {t('Student Name')}
                                                </p>
                                                <p className="font-semibold text-slate-900">{t('hpc.sampleStudent')}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                    {t('Class')}
                                                </p>
                                                <p className="font-semibold text-slate-900">{t('6-A')}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                    {t('hpc.sessionCol')}
                                                </p>
                                                <p className="font-semibold text-slate-900">{t('hpc.sampleSession')}</p>
                                            </div>
                                        </div>

                                        {showGrades ? (
                                            <div className="overflow-hidden rounded-xl border border-slate-100">
                                                {SAMPLE_GRADES.map((row, index) => (
                                                    <div
                                                        key={row.label}
                                                        className={`flex items-center justify-between px-4 py-2.5 ${
                                                            index % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                                                        }`}
                                                    >
                                                        <span className="text-slate-600">{row.label}</span>
                                                        <Badge
                                                            className="font-semibold"
                                                            style={{ background: accentColor }}
                                                        >
                                                            {row.value}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
                                                {t('hpc.gradesHiddenHint')}
                                            </div>
                                        )}

                                        <div
                                            className="flex items-center justify-between rounded-xl px-4 py-3 text-white"
                                            style={{ background: accentColor }}
                                        >
                                            <span className="text-sm font-semibold">{t('hpc.overallOutcome')}</span>
                                            <span className="text-lg font-bold">{showGrades ? 'A+' : '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
