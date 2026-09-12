import { Palette, Sparkles, Send } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

type Festival = {
    id: number;
    title: string;
    message: string | null;
    festivalDate: string | null;
    status: string;
    sentCount: number;
};

type CreativesProps = {
    user: any;
    festivals: Festival[];
};

export default function Creatives({ user, festivals }: CreativesProps) {
    const { t } = useLanguage();

    return (
        <DashboardLayout user={user} pageTitle={t('Creatives')}>
            <div className="space-y-6">
                <Card>
                    <CardContent className="flex items-start gap-4 pt-6">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">{t('Creatives')}</h1>
                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                {t(
                                    'Design gallery — greeting card designs and creative assets used across engagement and festival campaigns.',
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Festival Designs')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {festivals.length === 0 ? (
                            <p className="py-10 text-center text-muted-foreground">{t('No records found.')}</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Title')}</TableHead>
                                        <TableHead>{t('Message')}</TableHead>
                                        <TableHead>{t('Festival Date')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead>{t('Sent')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {festivals.map((festival) => (
                                        <TableRow key={festival.id}>
                                            <TableCell>
                                                <span className="inline-flex items-center gap-2">
                                                    <Palette className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">{festival.title}</span>
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                                                {festival.message ?? '—'}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm">
                                                {festival.festivalDate ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                {festival.status === 'sent' ? (
                                                    <Badge variant="default">{t('Sent')}</Badge>
                                                ) : (
                                                    <Badge variant="secondary">{t('Draft')}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center gap-1 text-sm">
                                                    <Send className="h-3.5 w-3.5" />
                                                    {festival.sentCount}
                                                </span>
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
