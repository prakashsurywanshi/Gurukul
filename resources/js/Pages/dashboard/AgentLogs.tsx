import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { History } from 'lucide-react';

type AgentLogsProps = {
    user: any;
};

export default function AgentLogs({ user }: AgentLogsProps) {
    const { t } = useLanguage();

    return (
        <DashboardLayout user={user} pageTitle={t('Agent Logs')}>
            <div className="space-y-6">
                <Card>
                    <CardContent className="flex items-start gap-4 pt-6">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <History className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">{t('Agent Logs')}</h1>
                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                {t('Audit trail of actions performed by admission agents on leads.')}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Agent Logs')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <p className="py-10 text-center text-muted-foreground">{t('No records found.')}</p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
