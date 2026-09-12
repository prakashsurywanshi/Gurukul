import { useLanguage } from '../../i18n/LanguageProvider';
import { BookMarked, Layers, LibraryBig } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface CategoryRow {
    name: string;
    count: number;
    available: number;
}

export default function BookCategories({
    user,
    categories,
    totalBooks,
}: {
    user: any;
    categories: CategoryRow[];
    totalBooks: number;
}) {
    const { t } = useLanguage();

    return (
        <DashboardLayout user={user} activeTab="book-categories">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Book Categories')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Browse library categories and how many titles each holds.')}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <Layers className="h-8 w-8 text-indigo-600" />
                                <div>
                                    <p className="text-xs text-slate-500">{t('Categories')}</p>
                                    <p className="text-lg font-semibold">{categories.length}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <BookMarked className="h-8 w-8 text-indigo-600" />
                                <div>
                                    <p className="text-xs text-slate-500">{t('Total Titles')}</p>
                                    <p className="text-lg font-semibold">{totalBooks}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <LibraryBig className="h-8 w-8 text-indigo-600" />
                                <div>
                                    <p className="text-xs text-slate-500">{t('Copies Available')}</p>
                                    <p className="text-lg font-semibold">
                                        {categories.reduce((sum, category) => sum + category.available, 0)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Category List')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Category')}</TableHead>
                                        <TableHead className="text-right">{t('Titles')}</TableHead>
                                        <TableHead className="text-right">{t('Copies Available')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.map((category) => (
                                        <TableRow key={category.name}>
                                            <TableCell className="font-medium text-slate-800">
                                                {category.name}
                                            </TableCell>
                                            <TableCell className="text-right text-sm">{category.count}</TableCell>
                                            <TableCell className="text-right text-sm">{category.available}</TableCell>
                                        </TableRow>
                                    ))}
                                    {categories.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="py-8 text-center text-slate-400">
                                                {t('No categories yet. Add books in the library catalog.')}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
