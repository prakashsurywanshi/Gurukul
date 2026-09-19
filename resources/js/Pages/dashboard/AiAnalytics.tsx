import { router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
    BellRing,
    Bot,
    BusFront,
    RefreshCw,
    Route,
    ShieldAlert,
    Sparkles,
    TrendingUp,
    Trophy,
    Users,
    Wallet,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface AiRow {
    id: number;
    category: string;
    entity_type: string;
    entity_id: number;
    score: number;
    tier: string;
    breakdown: Record<string, number>;
    context: Record<string, unknown>;
    narrative: string | null;
    computed_at: string | null;
}

interface AlertItem {
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string | null;
}

interface AiAnalyticsProps {
    user: any;
    organization?: { id: number; name: string };
    computedAt: string | null;
    overview: { leads: number; fees: number; students: number; routes: number; highRisk: number };
    leads: AiRow[];
    feeDefaulters: AiRow[];
    riskStudents: AiRow[];
    routes: AiRow[];
    alerts: AlertItem[];
    aiConfigured: boolean;
    canManage: boolean;
}

const TIER_STYLES: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300',
    medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
    low: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
};

const TIER_KEYS: Record<string, string> = {
    high: 'tier_high',
    medium: 'tier_medium',
    low: 'tier_low',
};

function scoreColor(score: number): string {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-emerald-500';
}

function TierBadge({ tier }: { tier: string }) {
    const { t } = useLanguage();
    return (
        <Badge variant="outline" className={TIER_STYLES[tier] ?? ''}>
            {t(TIER_KEYS[tier] ?? tier)}
        </Badge>
    );
}

function ScoreBar({ score }: { score: number }) {
    return (
        <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={score} className="h-2" indicatorClassName={scoreColor(score)} />
            <span className="text-sm font-medium tabular-nums">{score}</span>
        </div>
    );
}

function breakdownChips(row: AiRow) {
    return Object.entries(row.breakdown)
        .filter(([, points]) => points > 0)
        .map(([key, points]) => (
            <Badge key={key} variant="secondary" className="text-xs">
                {key}: +{points}
            </Badge>
        ));
}

export default function AiAnalytics(pageProps: AiAnalyticsProps) {
    const { t } = useLanguage();
    const { flash } = usePage().props as any;
    const user = pageProps.user;
    const organization = pageProps.organization;
    const computedAt = pageProps.computedAt;

    const refresh = () => {
        const confirmed = window.confirm(t('ai_analytics_refresh_confirm'));
        if (!confirmed) return;
        router.post('/ai-analytics/refresh', {}, { preserveScroll: true });
    };

    const overviewCards = [
        { label: t('ai_analytics_leads'), value: pageProps.overview.leads, icon: Trophy },
        { label: t('ai_analytics_fee_records'), value: pageProps.overview.fees, icon: Wallet },
        { label: t('ai_analytics_students'), value: pageProps.overview.students, icon: Users },
        { label: t('ai_analytics_route_suggestions'), value: pageProps.overview.routes, icon: Route },
        { label: t('ai_analytics_high_risk'), value: pageProps.overview.highRisk, icon: ShieldAlert },
    ];

    return (
        <DashboardLayout page={{ id: 'ai-analytics', label: t('ai_analytics_title'), icon: Sparkles }} user={user}>
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">{t('ai_analytics_title')}</h1>
                        <p className="text-muted-foreground text-sm">
                            {computedAt
                                ? `${t('ai_analytics_last_computed')} ${new Date(computedAt).toLocaleString()}`
                                : t('ai_analytics_not_computed')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!pageProps.aiConfigured && (
                            <Badge variant="outline" className="gap-1">
                                <Bot className="h-3.5 w-3.5" />
                                {t('ai_analytics_narrative_off')}
                            </Badge>
                        )}
                        <Button onClick={refresh} disabled={!pageProps.canManage}>
                            <RefreshCw className="h-4 w-4" />
                            {t('ai_analytics_refresh')}
                        </Button>
                    </div>
                </div>

                {flash?.success && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                        {flash.success}
                    </div>
                )}

                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                    {overviewCards.map((card) => (
                        <Card key={card.label}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                                <card.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{card.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Tabs defaultValue="leads">
                    <TabsList className="flex-wrap">
                        <TabsTrigger value="leads">{t('ai_analytics_tab_leads')}</TabsTrigger>
                        <TabsTrigger value="fees">{t('ai_analytics_tab_defaulters')}</TabsTrigger>
                        <TabsTrigger value="students">{t('ai_analytics_tab_risk')}</TabsTrigger>
                        <TabsTrigger value="routes">{t('ai_analytics_tab_routes')}</TabsTrigger>
                        <TabsTrigger value="alerts">{t('ai_analytics_tab_alerts')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="leads" className="space-y-3">
                        {pageProps.leads.length === 0 && (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    {t('ai_analytics_empty_leads')}
                                </CardContent>
                            </Card>
                        )}
                        {pageProps.leads.map((row) => (
                            <Card key={row.id}>
                                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                                    <div className="space-y-1">
                                        <div className="font-medium">
                                            {String(row.context.name ?? `#${row.entity_id}`)}
                                        </div>
                                        <div className="text-muted-foreground text-sm">
                                            {[row.context.source, row.context.priority, row.context.status]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-wrap gap-1">{breakdownChips(row)}</div>
                                        <ScoreBar score={row.score} />
                                        <TierBadge tier={row.tier} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="fees" className="space-y-3">
                        {pageProps.feeDefaulters.length === 0 && (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    {t('ai_analytics_empty_defaulters')}
                                </CardContent>
                            </Card>
                        )}
                        {pageProps.feeDefaulters.map((row) => (
                            <Card key={row.id}>
                                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                                    <div className="space-y-1">
                                        <div className="font-medium">
                                            {String(
                                                row.context.student_name ??
                                                    `#${row.context.student_id ?? row.entity_id}`,
                                            )}
                                        </div>
                                        <div className="text-muted-foreground text-sm">
                                            {t('ai_analytics_balance')}: {Number(row.context.balance).toLocaleString()}{' '}
                                            · {t('ai_analytics_due')}: {String(row.context.due_date ?? '—')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-wrap gap-1">{breakdownChips(row)}</div>
                                        <ScoreBar score={row.score} />
                                        <TierBadge tier={row.tier} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="students" className="space-y-3">
                        {pageProps.riskStudents.length === 0 && (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    {t('ai_analytics_empty_risk')}
                                </CardContent>
                            </Card>
                        )}
                        {pageProps.riskStudents.map((row) => (
                            <Card key={row.id}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">
                                            {String(row.context.name ?? `#${row.entity_id}`)}
                                        </CardTitle>
                                        {row.narrative && (
                                            <CardDescription className="text-sm max-w-3xl">
                                                {row.narrative}
                                            </CardDescription>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <ScoreBar score={row.score} />
                                        <TierBadge tier={row.tier} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1">{breakdownChips(row)}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="routes" className="space-y-3">
                        {pageProps.routes.length === 0 && (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                    <BusFront className="h-6 w-6" />
                                    {t('ai_analytics_empty_routes')}
                                </CardContent>
                            </Card>
                        )}
                        {pageProps.routes.map((row) => {
                            const title = String((row.context as any).title ?? '');
                            const detail = String((row.context as any).detail ?? '');
                            const severity = String((row.context as any).severity ?? 'low');
                            const severityStyle =
                                severity === 'high'
                                    ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                                    : severity === 'medium'
                                      ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300';
                            return (
                                <Card key={row.id}>
                                    <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 font-medium">
                                                {severity === 'high' ? (
                                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                                ) : (
                                                    <Route className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                {title}
                                            </div>
                                            <div className="text-muted-foreground text-sm">{detail}</div>
                                        </div>
                                        <Badge variant="outline" className={severityStyle}>
                                            {severity}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </TabsContent>

                    <TabsContent value="alerts" className="space-y-3">
                        {pageProps.alerts.length === 0 && (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    {t('ai_analytics_empty_alerts')}
                                </CardContent>
                            </Card>
                        )}
                        {pageProps.alerts.map((alert) => (
                            <Card key={alert.id}>
                                <CardContent className="flex items-start justify-between gap-3 py-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 font-medium">
                                            <BellRing className="h-4 w-4 text-muted-foreground" />
                                            {alert.title}
                                        </div>
                                        <div className="text-muted-foreground text-sm">{alert.message}</div>
                                    </div>
                                    {alert.created_at && (
                                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                                            {new Date(alert.created_at).toLocaleString()}
                                        </span>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
