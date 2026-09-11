import { FormEvent, useState } from 'react';
import { Layers, Plus, Star } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface HpcFrameworkRecord {
    id: number;
    name: string;
    description?: string | null;
    criteria?: string[] | null;
    is_default: boolean;
    cards_count: number;
}

interface HpcFrameworksProps {
    user: any;
    frameworks: HpcFrameworkRecord[];
}

export default function HpcFrameworks(pageProps: HpcFrameworksProps) {
    const { user, frameworks } = pageProps;
    const { t } = useLanguage();

    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [criteriaInput, setCriteriaInput] = useState('');

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const criteria =
            criteriaInput
                .split(',')
                .map((c) => c.trim())
                .filter(Boolean) ?? [];
        router.post('/hpc/frameworks', {
            name,
            description: description || null,
            criteria: criteria.length ? criteria : null,
        });
        setShowForm(false);
        setName('');
        setDescription('');
        setCriteriaInput('');
    };

    return (
        <DashboardLayout user={user}>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">{t('hpc.frameworksTitle')}</h1>
                    <Button onClick={() => setShowForm((v) => !v)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('hpc.createFramework')}
                    </Button>
                </div>

                {showForm && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('hpc.createFrameworkTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('hpc.frameworkName')}</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-1"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>{t('hpc.description')}</Label>
                                    <Input
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label>{t('hpc.criteria')}</Label>
                                    <Input
                                        value={criteriaInput}
                                        onChange={(e) => setCriteriaInput(e.target.value)}
                                        className="mt-1"
                                        placeholder={t('hpc.criteriaPlaceholder')}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">{t('hpc.criteriaHint')}</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <Button type="submit">
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t('hpc.saveFramework')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            {t('hpc.frameworksList')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {frameworks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Layers className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                <p className="mt-4 text-sm font-medium dark:text-white">{t('hpc.noFrameworks')}</p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {t('hpc.noFrameworksDesc')}
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('hpc.frameworkName')}</TableHead>
                                        <TableHead>{t('hpc.description')}</TableHead>
                                        <TableHead>{t('hpc.criteria')}</TableHead>
                                        <TableHead>{t('hpc.cardsCount')}</TableHead>
                                        <TableHead>{t('hpc.defaultCol')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {frameworks.map((framework) => (
                                        <TableRow key={framework.id}>
                                            <TableCell className="font-medium dark:text-white">
                                                {framework.name}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                                                {framework.description ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(framework.criteria ?? []).length === 0 ? (
                                                        <span className="text-gray-400">—</span>
                                                    ) : (
                                                        (framework.criteria ?? []).map((criterion) => (
                                                            <span
                                                                key={criterion}
                                                                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800 dark:text-gray-300"
                                                            >
                                                                {criterion}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{framework.cards_count}</TableCell>
                                            <TableCell>
                                                {framework.is_default ? (
                                                    <Badge className="bg-primary/10 text-primary">
                                                        <Star className="h-3 w-3 mr-1" />
                                                        {t('hpc.defaultLabel')}
                                                    </Badge>
                                                ) : (
                                                    '—'
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
