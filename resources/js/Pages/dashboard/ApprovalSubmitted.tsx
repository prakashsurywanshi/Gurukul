import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Send, CheckCircle2, XCircle, Clock, Ban } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageProvider';

type ApprovalStep = {
    stepNo: number;
    actorType: string;
    actorValue: string;
    actorLabel: string;
    status: string;
    note?: string;
    actedBy?: string;
    actedAt?: string;
    canAct: boolean;
};

type ApprovalRequestItem = {
    id: number;
    module: string;
    moduleLabel: string;
    title: string;
    summary: string;
    detail: Record<string, string>;
    status: string;
    currentStep: number;
    submittedAt?: string;
    completedAt?: string;
    requester?: { id: string; name: string; email?: string };
    steps: ApprovalStep[];
    canCancel: boolean;
};

interface Props {
    user: any;
    requests: ApprovalRequestItem[];
}

const statusBadge = (status: string, t: (key: string) => string) => {
    switch (status) {
        case 'pending': return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{t('Pending')}</Badge>;
        case 'approved': return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />{t('Approved')}</Badge>;
        case 'rejected': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{t('Rejected')}</Badge>;
        case 'cancelled': return <Badge variant="secondary"><Ban className="h-3 w-3 mr-1" />{t('Cancelled')}</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
    }
};

export default function ApprovalSubmitted({ user, requests }: Props) {
    const { t } = useLanguage();
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    const cancel = (id: number) => {
        setCancellingId(id);
        router.post(`/approvals/${id}/cancel`, {}, {
            preserveScroll: true,
            onFinish: () => setCancellingId(null),
        });
    };

    return (
        <DashboardLayout user={user} activeTab="approvals-submitted">
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Send className="h-6 w-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">{t('My Submitted Requests')}</h1>
                        <p className="text-sm text-muted-foreground">{t('Track approval requests you have submitted.')}</p>
                    </div>
                </div>

                {requests.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <Send className="h-12 w-12 mx-auto mb-3 opacity-40" />
                            <p className="font-medium">{t('No submitted requests')}</p>
                            <p className="text-sm mt-1">{t('Requests you submit for approval will appear here.')}</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {requests.map(req => (
                            <Card key={req.id}>
                                <CardHeader className="flex flex-row items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">{req.title}</CardTitle>
                                        <CardDescription>{req.summary}</CardDescription>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary">{req.moduleLabel}</Badge>
                                            {statusBadge(req.status, t)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {req.canCancel && (
                                            <Button size="sm" variant="outline" onClick={() => cancel(req.id)} disabled={cancellingId === req.id}>
                                                {cancellingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4 mr-1" />}
                                                Cancel Request
                                            </Button>
                                        )}
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {req.submittedAt ? new Date(req.submittedAt).toLocaleString() : ''}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {Object.keys(req.detail).length > 0 && (
                                        <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 p-3 rounded-md">
                                            {Object.entries(req.detail).map(([k, v]) => (
                                                <div key={k}><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{v}</span></div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">{t('Approval Chain')}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {req.steps.map((step, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    {i > 0 && <span className="text-muted-foreground">→</span>}
                                                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${step.status === 'approved' ? 'bg-green-50 border-green-300 text-green-700' : step.status === 'rejected' ? 'bg-red-50 border-red-300 text-red-700' : step.status === 'skipped' ? 'bg-muted border-border text-muted-foreground' : step.canAct ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                                                        {step.actorLabel}
                                                        {step.status === 'approved' && ' ✓'}
                                                        {step.status === 'rejected' && ' ✗'}
                                                        {step.status === 'skipped' && ' (skipped)'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {req.steps.some(s => s.note) && (
                                            <div className="bg-muted/30 p-3 rounded-md space-y-1">
                                                {req.steps.filter(s => s.note).map((s, i) => (
                                                    <p key={i} className="text-xs text-muted-foreground">
                                                        <strong>{s.actorLabel}</strong>: {s.note}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}