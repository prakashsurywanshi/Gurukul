import { FormEvent, useState } from 'react';
import { FileText, LayoutTemplate, Plus } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface HpcCardRecord {
    id: number;
    name: string;
    card_type: string;
    description?: string | null;
    is_active: boolean;
    framework?: { id: number; name: string } | null;
}

interface HpcCardsProps {
    user: any;
    cards: HpcCardRecord[];
    frameworks: { id: number; name: string }[];
}

export default function HpcCards(pageProps: HpcCardsProps) {
    const { user, cards, frameworks } = pageProps;
    const { t } = useLanguage();

    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [frameworkId, setFrameworkId] = useState('');
    const [cardType, setCardType] = useState('academic');
    const [description, setDescription] = useState('');

    const submit = (e: FormEvent) => {
        e.preventDefault();
        router.post('/hpc/cards', {
            name,
            framework_id: frameworkId ? Number(frameworkId) : null,
            card_type: cardType,
            description: description || null,
        });
        setShowForm(false);
        setName('');
        setFrameworkId('');
        setDescription('');
    };

    return (
        <DashboardLayout user={user}>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">{t('hpc.cardsTitle')}</h1>
                    <Button onClick={() => setShowForm((v) => !v)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('hpc.createCard')}
                    </Button>
                </div>

                {showForm && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('hpc.createCardTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('hpc.cardName')}</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-1"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>{t('hpc.framework')}</Label>
                                    <select
                                        value={frameworkId}
                                        onChange={(e) => setFrameworkId(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                    >
                                        <option value="">{t('hpc.noFramework')}</option>
                                        {frameworks.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label>{t('hpc.cardType')}</Label>
                                    <select
                                        value={cardType}
                                        onChange={(e) => setCardType(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                    >
                                        <option value="academic">{t('Academic')}</option>
                                        <option value="co_curricular">{t('Co-curricular')}</option>
                                        <option value="combined">{t('Combined')}</option>
                                    </select>
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
                                    <Button type="submit">
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t('hpc.saveCard')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LayoutTemplate className="h-5 w-5" />
                            {t('hpc.progressCards')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {cards.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                <p className="mt-4 text-sm font-medium dark:text-white">{t('hpc.noCards')}</p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('hpc.noCardsDesc')}</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('hpc.cardName')}</TableHead>
                                        <TableHead>{t('hpc.cardType')}</TableHead>
                                        <TableHead>{t('hpc.framework')}</TableHead>
                                        <TableHead>{t('hpc.description')}</TableHead>
                                        <TableHead>{t('hpc.statusCol')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cards.map((card) => (
                                        <TableRow key={card.id}>
                                            <TableCell className="font-medium dark:text-white">{card.name}</TableCell>
                                            <TableCell>{t('hpc.type.' + card.card_type)}</TableCell>
                                            <TableCell>{card.framework?.name ?? '—'}</TableCell>
                                            <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                                                {card.description ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        card.is_active
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                            : 'bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
                                                    }
                                                >
                                                    {card.is_active ? t('hpc.active') : t('hpc.inactive')}
                                                </Badge>
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
