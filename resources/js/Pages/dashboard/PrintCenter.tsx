import { useLanguage } from '../../i18n/LanguageProvider';
import { BadgeDollarSign, FileBarChart, FileText, IdCard, LayoutDashboard, Printer, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface PrintCenterProps {
    user: any;
    organization?: { name?: string } | null;
    documents: Array<{ key: string; url: string; kind: 'report' | 'idcard' | 'finance' }>;
}

const KIND_META: Record<'report' | 'idcard' | 'finance', { label: string; icon: typeof FileText }> = {
    report: { label: 'Reports & Cards', icon: FileBarChart },
    idcard: { label: 'ID Cards', icon: IdCard },
    finance: { label: 'Finance Documents', icon: BadgeDollarSign },
};

export default function PrintCenter(pageProps: PrintCenterProps) {
    const { t } = useLanguage();
    const user = pageProps.user;
    const documents = pageProps.documents ?? [];

    return (
        <DashboardLayout user={user}>
            <div className="min-h-full bg-slate-50 p-8 dark:bg-slate-950">
                <div className="mx-auto max-w-6xl space-y-6">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            <Printer className="h-6 w-6 text-indigo-500" />
                            {t('Print & Export Center')}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {t(
                                'Central hub to open, print and export every document your school generates. Server-side PDF downloads use the configured PDF engine.',
                            )}
                        </p>
                    </div>

                    {(['report', 'idcard', 'finance'] as const).map((kind) => {
                        const group = documents.filter((doc) => doc.kind === kind);
                        if (group.length === 0) return null;
                        const meta = KIND_META[kind];
                        const Icon = meta.icon;

                        return (
                            <Card key={kind}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Icon className="h-5 w-5 text-indigo-500" />
                                        {t(meta.label)}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {group.map((doc) => (
                                            <div
                                                key={doc.key}
                                                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                            >
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-semibold text-gray-900 dark:text-white">
                                                        {t(`printCenter.${doc.key}`)}
                                                    </p>
                                                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                                        {t(`printCenter.${doc.key}.desc`)}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="shrink-0 gap-2"
                                                    onClick={() => {
                                                        window.open(doc.url, '_blank');
                                                    }}
                                                >
                                                    <LayoutDashboard className="h-4 w-4" />
                                                    {t('Open')}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                                {t('How downloads work')}
                            </CardTitle>
                            <CardDescription>
                                {t(
                                    'Documents open in the generator where you pick the record and choose Print to download a PDF from your browser, or use the dedicated PDF export buttons that generate the file server-side.',
                                )}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
