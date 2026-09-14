import { useState } from 'react';
import { Check, Laptop, Moon, Palette, Save, Sun } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useLanguage } from '../../i18n/LanguageProvider';
import { toast } from 'sonner';
import { DEFAULT_PANEL_APPEARANCE, PANEL_DENSITIES, PANEL_FONTS, type PanelAppearance } from '../../lib/panelTheme';

interface ThemesProps {
    user: any;
    theme?: string | null;
    appearance?: PanelAppearance | null;
    fontOptions?: string[];
    densityOptions?: string[];
}

type Theme = 'light' | 'dark' | 'system';

const THEMES: { key: Theme; label: string; description: string; icon: typeof Sun }[] = [
    { key: 'light', label: 'Light', description: 'Bright interface for daytime use.', icon: Sun },
    { key: 'dark', label: 'Dark', description: 'Reduced glare for low-light rooms.', icon: Moon },
    { key: 'system', label: 'System', description: 'Follow your device appearance.', icon: Laptop },
];

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark' || value === 'system';

export default function Themes(pageProps: ThemesProps) {
    const { user, fontOptions = [], densityOptions = [] } = pageProps;
    const { t } = useLanguage();
    const [theme, setTheme] = useState<Theme>(() => {
        const serverTheme = pageProps.theme;
        try {
            const stored = localStorage.getItem('gurukul-theme') as Theme | null;
            if (isTheme(stored)) return stored;
        } catch {
            /* ignore */
        }
        return isTheme(serverTheme) ? serverTheme : 'system';
    });
    const [appearance, setAppearance] = useState<PanelAppearance>({
        ...DEFAULT_PANEL_APPEARANCE,
        ...(pageProps.appearance ?? {}),
    });
    const [saving, setSaving] = useState(false);

    const applyTheme = (next: Theme) => {
        setTheme(next);

        try {
            localStorage.setItem('gurukul-theme', next);
        } catch {
            /* ignore */
        }

        const root = document.documentElement;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        root.classList.toggle('dark', next === 'dark' || (next === 'system' && prefersDark));

        if (next === 'light') {
            root.classList.add('light');
        } else {
            root.classList.remove('light');
        }
    };

    const selectTheme = (next: Theme) => {
        applyTheme(next);
        router.patch('/settings/themes', { theme: next });
        setTimeout(preview, 0);
    };

    const preview = () => {
        const root = document.documentElement;
        root.classList.toggle(
            'dark',
            theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
        );
        if (theme === 'light') {
            root.classList.add('light');
        } else {
            root.classList.remove('light');
        }
    };

    const saveAppearance = () => {
        setSaving(true);
        router.patch('/settings/themes/appearance', appearance as any, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Branding saved.')),
            onError: () => toast.error(t('Failed to save branding.')),
            onFinish: () => setSaving(false),
        });
    };

    const updateAppearance = (key: keyof PanelAppearance, value: string | boolean) => {
        setAppearance((current) => ({ ...current, [key]: value }));
    };

    const fontChoices = fontOptions.length ? fontOptions : PANEL_FONTS;
    const densities = densityOptions.length ? densityOptions : PANEL_DENSITIES;

    return (
        <DashboardLayout user={user} appearance={appearance}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                        <Palette className="mr-2 inline-block h-6 w-6 text-[var(--primary)]" />
                        {t('Dashboard Themes')}
                    </h1>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {t('Choose how the dashboard looks and matches your brand.')}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {THEMES.map((themeItem) => {
                        const Icon = themeItem.icon;
                        const active = theme === themeItem.key;

                        return (
                            <Card
                                key={themeItem.key}
                                className={`cursor-pointer transition ${
                                    active ? 'ring-2 ring-[var(--primary)]' : 'hover:shadow-md'
                                }`}
                                onClick={() => {
                                    selectTheme(themeItem.key);
                                }}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <span className="rounded-lg bg-[var(--accent)] p-2 text-[var(--primary)]">
                                            <Icon className="h-6 w-6" />
                                        </span>
                                        {active && (
                                            <Badge className="bg-[var(--accent)] text-[var(--foreground)]">
                                                <Check className="mr-1 h-3 w-3" />
                                                {t('Active')}
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <CardTitle className="text-base">{t(themeItem.label)}</CardTitle>
                                    <CardDescription className="mt-1">{t(themeItem.description)}</CardDescription>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-base">{t('Branding')}</CardTitle>
                                <CardDescription className="mt-1">
                                    {t('Colors, font and density apply across the dashboard.')}
                                </CardDescription>
                            </div>
                            <Button onClick={saveAppearance} disabled={saving} className="gap-2">
                                <Save className="h-4 w-4" />
                                {saving ? t('Saving...') : t('Save Branding')}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                                    {t('Primary color')}
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={appearance.primary_color}
                                        onChange={(event) => updateAppearance('primary_color', event.target.value)}
                                        className="h-9 w-12 cursor-pointer rounded border border-[var(--border)] bg-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={appearance.primary_color}
                                        onChange={(event) => updateAppearance('primary_color', event.target.value)}
                                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                                    {t('Accent color')}
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={appearance.accent_color}
                                        onChange={(event) => updateAppearance('accent_color', event.target.value)}
                                        className="h-9 w-12 cursor-pointer rounded border border-[var(--border)] bg-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={appearance.accent_color}
                                        onChange={(event) => updateAppearance('accent_color', event.target.value)}
                                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                                    {t('Font')}
                                </label>
                                <select
                                    value={appearance.font_family}
                                    onChange={(event) => updateAppearance('font_family', event.target.value)}
                                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)]"
                                >
                                    {fontChoices.map((font) => (
                                        <option key={font} value={font}>
                                            {font}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                                    {t('Density')}
                                </label>
                                <select
                                    value={appearance.density}
                                    onChange={(event) => updateAppearance('density', event.target.value)}
                                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)]"
                                >
                                    {densities.map((density) => (
                                        <option key={density} value={density}>
                                            {t(density.charAt(0).toUpperCase() + density.slice(1))}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                            <input
                                type="checkbox"
                                checked={appearance.show_logo}
                                onChange={(event) => updateAppearance('show_logo', event.target.checked)}
                                className="h-4 w-4 rounded border-[var(--border)]"
                            />
                            <span className="text-sm font-medium text-[var(--foreground)]">
                                {t('Show school logo')}
                            </span>
                        </label>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Preview')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                                <p className="text-sm font-medium text-[var(--foreground)]">{t('Card')}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">{t('sample text')}</p>
                            </div>
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--accent)] p-3">
                                <p className="text-sm font-medium text-[var(--foreground)]">{t('Accent')}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">{t('highlight')}</p>
                            </div>
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-3">
                                <p className="text-sm font-medium text-[var(--foreground)]">{t('Surface')}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">{t('muted surface')}</p>
                            </div>
                            <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                                <span
                                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                                    style={{ backgroundColor: appearance.primary_color, color: '#ffffff' }}
                                >
                                    {t('Primary')}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}