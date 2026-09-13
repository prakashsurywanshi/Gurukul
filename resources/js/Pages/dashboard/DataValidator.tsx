import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { router } from '@inertiajs/react';

interface CheckItem {
    id: string;
    label: string;
}

interface ValidationCheck {
    id: string;
    title: string;
    severity: string;
    count: number;
    items: CheckItem[];
}

interface DataValidatorProps {
    user: any;
    organization?: { id: number; name: string } | null;
    checks: ValidationCheck[];
}

const SEVERITY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
    error: { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    warning: { icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
};

export default function DataValidator({ user, organization, checks }: DataValidatorProps) {
    const { t } = useLanguage();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const totalErrors = checks.filter((c) => c.severity === 'error').reduce((sum, c) => sum + c.count, 0);
    const totalWarnings = checks.filter((c) => c.severity === 'warning').reduce((sum, c) => sum + c.count, 0);
    const cleanChecks = checks.filter((c) => c.count === 0).length;

    return (
        <DashboardLayout user={user} activeTab="data-validator">
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('Data Validator')}</h1>
                        <p className="text-gray-600 mt-1">{t('Validate and audit imported records for correctness')}</p>
                    </div>
                    <Button variant="outline" className="gap-2" onClick={() => router.reload({ only: ['checks'] })}>
                        <RefreshCw className="w-4 h-4" />
                        {t('Re-run Checks')}
                    </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <div>
                                <div className="text-xl font-bold">{totalErrors}</div>
                                <div className="text-xs text-gray-500">{t('Errors')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            <div>
                                <div className="text-xl font-bold">{totalWarnings}</div>
                                <div className="text-xs text-gray-500">{t('Warnings')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            <div>
                                <div className="text-xl font-bold">{cleanChecks}</div>
                                <div className="text-xs text-gray-500">{t('Clean')}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-3">
                    {checks.map((check) => {
                        const cfg = SEVERITY_CONFIG[check.severity] || SEVERITY_CONFIG.warning;
                        const Icon = cfg.icon;
                        const isExpanded = expandedId === check.id && check.items.length > 0;

                        return (
                            <Card key={check.id} className={`border ${cfg.bg}`}>
                                <CardContent className="py-4">
                                    <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => setExpandedId(isExpanded ? null : check.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-5 h-5 ${cfg.color}`} />
                                            <div>
                                                <div className="font-medium text-gray-900">{check.title}</div>
                                                <div className="text-xs text-gray-500">
                                                    {check.items.length > 0
                                                        ? t('showing {count} of {total} samples', {
                                                              count: Math.min(check.items.length, 5).toString(),
                                                              total: check.count.toString(),
                                                          })
                                                        : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge
                                                className={`${check.count === 0 ? 'bg-emerald-100 text-emerald-800' : check.severity === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'} text-xs`}
                                            >
                                                {check.count === 0 ? t('Clean') : check.count}
                                            </Badge>
                                            {check.items.length > 0 &&
                                                (isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                ))}
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="mt-3 border-t pt-3 space-y-1">
                                            {check.items.map((item, idx) => (
                                                <div key={idx} className="text-sm text-gray-700 pl-8">
                                                    {item.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                    {checks.length === 0 && <p className="text-center text-gray-500 py-10">{t('No records found.')}</p>}
                </div>
            </div>
        </DashboardLayout>
    );
}
