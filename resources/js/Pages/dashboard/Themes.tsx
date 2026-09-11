import { useState } from 'react';
import { Check, Laptop, Moon, Palette, Sun } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface ThemesProps {
    user: any;
}

type Theme = 'light' | 'dark' | 'system';

const THEMES: { key: Theme; label: string; description: string; icon: typeof Sun }[] = [
    { key: 'light', label: 'Light', description: 'Bright interface for daytime use.', icon: Sun },
    { key: 'dark', label: 'Dark', description: 'Reduced glare for low-light rooms.', icon: Moon },
    { key: 'system', label: 'System', description: 'Follow your device appearance.', icon: Laptop },
];

export default function Themes(pageProps: ThemesProps) {
    const { user } = pageProps;
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const stored = localStorage.getItem('gurukul-theme') as Theme | null;
            return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
        } catch {
            return 'system';
        }
    });

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

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        <Palette className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        Dashboard Themes
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Choose how the dashboard looks on this device. Preferences are saved locally.
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
                                    active ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'
                                }`}
                                onClick={() => {
                                    applyTheme(themeItem.key);
                                    setTimeout(preview, 0);
                                }}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                            <Icon className="h-6 w-6" />
                                        </span>
                                        {active && (
                                            <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">
                                                <Check className="mr-1 h-3 w-3" />
                                                Active
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <CardTitle className="text-base">{themeItem.label}</CardTitle>
                                    <CardDescription className="mt-1">{themeItem.description}</CardDescription>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Card</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">sample text</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-indigo-50 p-3 dark:border-gray-700 dark:bg-indigo-500/10">
                                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Accent</p>
                                <p className="text-xs text-indigo-500 dark:text-indigo-400">indigo highlight</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Sidebar</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">muted surface</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                                    Status
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
