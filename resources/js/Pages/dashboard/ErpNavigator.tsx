import { useLanguage } from '../../i18n/LanguageProvider';
import { useMemo, useState } from 'react';
import { Compass, Grid3X3, Search } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

interface NavigatorModule {
    name: string;
    href: string;
    feature: string;
}

interface NavigatorCategory {
    name: string;
    icon?: string;
    modules: NavigatorModule[];
}

interface ErpNavigatorProps {
    user: any;
    categories: NavigatorCategory[];
    orgName?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
    'Dashboard & Profiles': '🏠',
    Students: '👥',
    'Exams & Academics': '📚',
    'Fees & Accounts': '💰',
    'Attendance & Leave': '📅',
    Communication: '💬',
    Staff: '👔',
    'Documents & Certificates': '📁',
    'Library, Inventory & Facilities': '📖',
    'Admin & Settings': '⚙️',
};

export default function ErpNavigator({ user, categories, orgName }: ErpNavigatorProps) {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

    const filteredCategories = useMemo(() => {
        const query = search.trim().toLowerCase();

        const boostCategory = (module: NavigatorModule, category: string) => {
            const q = search.trim().toLowerCase();
            if (module.name.toLowerCase().startsWith(q)) return 3;
            if (module.feature.toLowerCase().startsWith(q)) return 3;
            if (category.toLowerCase().startsWith(q)) return 2;
            if (module.feature.toLowerCase().includes(q)) return 1;
            return module.name.toLowerCase().includes(q) ? 1 : 0;
        };

        return categories
            .map((category) => {
                const modules = category.modules
                    .filter((module) => {
                        if (activeCategory !== 'All' && category.name !== activeCategory) {
                            return false;
                        }

                        if (!query) {
                            return true;
                        }

                        return (
                            module.name.toLowerCase().includes(query) ||
                            module.feature.toLowerCase().includes(query) ||
                            category.name.toLowerCase().includes(query)
                        );
                    })
                    .sort((a, b) => boostCategory(b, category.name) - boostCategory(a, category.name));

                return { ...category, modules };
            })
            .filter((category) => category.modules.length > 0);
    }, [activeCategory, categories, search]);

    const totalModules = useMemo(
        () => categories.reduce((sum, category) => sum + category.modules.length, 0),
        [categories],
    );

    const resultCount = useMemo(
        () => filteredCategories.reduce((sum, category) => sum + category.modules.length, 0),
        [filteredCategories],
    );

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        <Compass className="h-6 w-6 text-blue-600" />
                        {t('ERP Navigator')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('Explore and jump to every module in the system.')}
                    </p>
                </div>

                <Card>
                    <CardContent className="flex flex-col gap-4 p-4">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('Search modules and pages...')}
                                className="pl-9"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant={activeCategory === 'All' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveCategory('All')}
                            >
                                <Grid3X3 className="mr-1.5 h-3.5 w-3.5" />
                                {t('All')} ({totalModules})
                            </Button>
                            {categoryNames.map((name) => (
                                <Button
                                    key={name}
                                    type="button"
                                    variant={activeCategory === name ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setActiveCategory(name)}
                                >
                                    <span className="mr-1.5">{CATEGORY_ICONS[name] ?? '•'}</span>
                                    {t(name)}
                                </Button>
                            ))}
                        </div>

                        {resultCount === 0 ? (
                            <div className="py-16 text-center">
                                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                    {t('No modules match your search.')}
                                </p>
                                <p className="text-sm text-gray-500">{t('Try a different keyword or category.')}</p>
                            </div>
                        ) : (
                            filteredCategories.map((category) => (
                                <div key={category.name}>
                                    <h3 className="mb-3 mt-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        <span>{CATEGORY_ICONS[category.name] ?? '•'}</span>
                                        {t(category.name)}
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                            {category.modules.length}
                                        </span>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                        {category.modules.map((module) => (
                                            <a
                                                key={`${category.name}-${module.name}`}
                                                href={module.href}
                                                className="group flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3 transition hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/40"
                                            >
                                                <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-300">
                                                    {t(module.name)}
                                                </span>
                                                <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                                                    {t(module.feature)}
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
