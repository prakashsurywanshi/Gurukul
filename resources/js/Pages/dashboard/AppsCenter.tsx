import { FormEvent, useMemo, useState } from 'react';
import {
    ArrowUpRight,
    Bot,
    Copy,
    FileBadge,
    FileClock,
    FileSpreadsheet,
    FileText,
    Loader2,
    PanelsTopLeft,
    ScanEye,
    Sparkles,
    Wand2,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useLanguage } from '../../i18n/LanguageProvider';

interface AppCard {
    id: string;
    label: string;
    description: string;
    icon: string;
    type: 'action' | 'link';
    category: string;
    status: 'live' | 'coming_soon';
    route: string;
}

interface AppResult {
    app: string;
    content: string;
    meta: { subject: string; class: string; marks: number };
}

interface AppsCenterProps {
    user: any;
    apps: AppCard[];
    aiConfigured: boolean;
    result: AppResult | null;
}

const ICONS: Record<string, typeof Wand2> = {
    FileText,
    ScanEye,
    FileSpreadsheet,
    Bot,
    FileBadge,
    FileClock,
};

export default function AppsCenter(pageProps: AppsCenterProps) {
    const { t } = useLanguage();
    const { user, apps, aiConfigured, result } = pageProps;
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [generatorOpen, setGeneratorOpen] = useState(false);
    const [form, setForm] = useState({ subject: '', class: '', total_marks: '', sections: '' });
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');

    const categories = useMemo(() => Array.from(new Set(apps.map((app) => app.category))), [apps]);

    const filteredApps = useMemo(
        () =>
            apps.filter((app) => {
                const matchesCategory = category === 'all' || app.category === category;
                const query = search.trim().toLowerCase();
                const matchesSearch =
                    query === '' ||
                    app.label.toLowerCase().includes(query) ||
                    app.description.toLowerCase().includes(query) ||
                    app.category.toLowerCase().includes(query);

                return matchesCategory && matchesSearch;
            }),
        [apps, category, search],
    );

    const generate = (event: FormEvent) => {
        event.preventDefault();
        setGenerating(true);

        router.post('/apps/question-paper', form, {
            preserveScroll: true,
            onSuccess: () => {
                setGenerating(false);
                setGeneratorOpen(false);
                setForm({ subject: '', class: '', total_marks: '', sections: '' });
            },
            onError: () => setGenerating(false),
        });
    };

    const copyResult = async () => {
        if (!result) {
            return;
        }
        await navigator.clipboard.writeText(result.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openApp = (app: AppCard) => {
        if (app.type === 'link') {
            router.visit(app.route);
            return;
        }

        if (app.id === 'question-paper') {
            setGeneratorOpen(true);
        }
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            <PanelsTopLeft className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            {t('Apps Center')}</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('AI and productivity tools for your school.')}</p>
                    </div>
                    {!aiConfigured && (
                        <Badge variant="outline">AI provider not configured — some apps are unavailable</Badge>
                    )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={category === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCategory('all')}
                        >
                            {t('All')}</Button>
                        {categories.map((entry) => (
                            <Button
                                key={entry}
                                variant={category === entry ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCategory(entry)}
                            >
                                {entry}
                            </Button>
                        ))}
                    </div>
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t('Search apps…')}
                        className="sm:w-64"
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredApps.length === 0 && (
                        <div className="col-span-full rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400 dark:border-gray-700">{t('No apps match your search.')}</div>
                    )}
                    {filteredApps.map((app) => {
                        const Icon = ICONS[app.icon] ?? Wand2;
                        const isAction = app.type === 'action';
                        const isComingSoon = app.status === 'coming_soon';
                        const disabled = isComingSoon || (isAction && !aiConfigured);

                        return (
                            <Card
                                key={app.id}
                                className={`transition hover:shadow-md ${disabled ? 'opacity-60' : 'cursor-pointer'} ${app.id === 'question-paper' ? 'ring-1 ring-indigo-200 dark:ring-indigo-500/40' : ''}`}
                                onClick={() => !disabled && openApp(app)}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        {isComingSoon ? (
                                            <Badge variant="secondary">{t('Coming soon')}</Badge>
                                        ) : (
                                            <>
                                                {isAction && <Badge variant="secondary">AI</Badge>}
                                                {app.type === 'link' && (
                                                    <ArrowUpRight className="h-4 w-4 text-gray-400" />
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <CardTitle className="text-base">{app.label}</CardTitle>
                                    <CardDescription>{app.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        variant={app.id === 'question-paper' ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={disabled}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            openApp(app);
                                        }}
                                    >
                                        {isComingSoon ? t('Coming soon') : app.type === 'action' ? t('Open') : t('Launch')}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {result && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-indigo-500" />{t('Generated Question Paper')}</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                        {result.meta.subject} · {result.meta.class} · {result.meta.marks} marks
                                    </Badge>
                                    <Button variant="outline" size="sm" onClick={copyResult}>
                                        {copied ? (
                                            'Copied!'
                                        ) : (
                                            <>
                                                <Copy className="mr-2 h-4 w-4" />
                                                {t('Copy')}</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800/50">
                                {result.content}
                            </pre>
                        </CardContent>
                    </Card>
                )}

                <Dialog open={generatorOpen} onOpenChange={setGeneratorOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{t('Question Paper Generator')}</DialogTitle>
                            <DialogDescription>{t('Describe the paper and generate a complete question set with AI.')}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={generate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label>Subject *</Label>
                                <Input
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    required
                                    placeholder={t('e.g. Mathematics')}
                                />
                            </div>
                            <div>
                                <Label>Class *</Label>
                                <Input
                                    value={form.class}
                                    onChange={(e) => setForm({ ...form, class: e.target.value })}
                                    required
                                    placeholder={t('e.g. Class 10')}
                                />
                            </div>
                            <div>
                                <Label>{t('Total Marks')}</Label>
                                <Input
                                    type="number"
                                    min="10"
                                    max="500"
                                    value={form.total_marks}
                                    onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                                    placeholder="100"
                                />
                            </div>
                            <div>
                                <Label>{t('Class Level')}</Label>
                                <Input
                                    value={form.class}
                                    onChange={(e) => setForm({ ...form, class: e.target.value })}
                                    disabled={false}
                                    placeholder={t('Same as class')}
                                    className="opacity-50"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label>{t('Sections')}</Label>
                                <Textarea
                                    rows={2}
                                    value={form.sections}
                                    onChange={(e) => setForm({ ...form, sections: e.target.value })}
                                    placeholder={t('Optional custom section breakdown')}
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 sm:col-span-2">
                                <Button type="button" variant="outline" onClick={() => setGeneratorOpen(false)}>
                                    {t('Cancel')}</Button>
                                <Button type="submit" disabled={generating || !aiConfigured}>
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating…
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="mr-2 h-4 w-4" />
                                            Generate
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
