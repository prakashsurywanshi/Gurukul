import { useState } from 'react';
import { Palette, Save } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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

    return (
        <DashboardLayout user={user}>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">{t('hpc.appearanceTitle')}</h1>
                    <Button onClick={save}>
                        <Save className="h-4 w-4 mr-2" />
                        {t('hpc.saveAppearance')}
                    </Button>
                </div>

                <Card>
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
                                <option value="small">Small</option>
                                <option value="normal">Normal</option>
                                <option value="large">Large</option>
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
            </div>
        </DashboardLayout>
    );
}
