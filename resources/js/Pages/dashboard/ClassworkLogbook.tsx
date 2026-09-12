import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BookOpenCheck } from 'lucide-react';

type ClassworkLogbookProps = {
    user: any;
};

export default function ClassworkLogbook({ user }: ClassworkLogbookProps) {
    const { t } = useLanguage();

    return (
        <DashboardLayout user={user} pageTitle={t('Classwork & Logbook')}>
            <div className="space-y-6">
                <Card>
                    <CardContent className="flex items-start gap-4 pt-6">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <BookOpenCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">{t('Classwork & Logbook')}</h1>
                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                {t('Record daily classwork activities and keep a teaching logbook.')}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Classwork & Logbook')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <p className="py-10 text-center text-muted-foreground">{t('No records found.')}</p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
