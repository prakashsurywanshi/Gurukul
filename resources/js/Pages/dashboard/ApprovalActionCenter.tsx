import { useState } from 'react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Loader2, Inbox, CheckCircle2, XCircle, Clock } from 'lucide-react';

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
    requests: ApprovalRequestItem[];
}

const statusBadge = (status: string) => {
    switch (status) {
        case 'pending': return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
        case 'approved': return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
        case 'rejected': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
    }
};

export default function ApprovalActionCenter({ requests }: Props) {
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [notes, setNotes] = useState<Record<number, string>>({});

    const act = (id: number, action: 'approve' | 'reject') => {
        setProcessingId(id);
        router.post(`/approvals/${id}/${action}`, { note: notes[id] || null }, {
            preserveScroll: true,
            onFinish: () => { setProcessingId(null); setNotes(prev => { const n = { ...prev }; delete n[id]; return n; }); },
        });
    };

    return (
        <DashboardLayout title="Action Center">
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Inbox className="h-6 w-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Approval Action Center</h1>
                        <p className="text-sm text-muted-foreground">Review and act on pending requests assigned to you.</p>
                    </div>
                </div>

                {requests.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <Inbox className="h-12 w-12 mx-auto mb-3 opacity-40" />
                            <p className="font-medium">No pending approvals</p>
                            <p className="text-sm mt-1">There are no requests awaiting your action right now.</p>
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
                                            {statusBadge(req.status)}
                                            {req.requester && <span className="text-xs text-muted-foreground">by {req.requester.name}</span>}
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {req.submittedAt ? new Date(req.submittedAt).toLocaleString() : ''}
                                    </span>
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
                                        <p className="text-sm font-medium">Approval Chain</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {req.steps.map((step, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    {i > 0 && <span className="text-muted-foreground">→</span>}
                                                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${step.status === 'approved' ? 'bg-green-50 border-green-300 text-green-700' : step.status === 'rejected' ? 'bg-red-50 border-red-300 text-red-700' : step.canAct ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                                                        {step.actorLabel}
                                                        {step.status === 'approved' && ' ✓'}
                                                        {step.status === 'rejected' && ' ✗'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Textarea
                                            className="flex-1"
                                            placeholder="Note (optional)"
                                            value={notes[req.id] || ''}
                                            onChange={e => setNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => act(req.id, 'approve')}
                                                disabled={processingId === req.id}
                                            >
                                                {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => act(req.id, 'reject')}
                                                disabled={processingId === req.id}
                                            >
                                                Reject
                                            </Button>
                                        </div>
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
