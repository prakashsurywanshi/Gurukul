import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { LifeBuoy, Plus, Send, ChevronDown, ChevronUp } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { router } from '@inertiajs/react';

interface TicketReply {
    id: string;
    message: string;
    user: string;
    created_at?: string | null;
}

interface Ticket {
    id: string;
    subject: string;
    department: string;
    priority: string;
    status: string;
    created_by?: string | null;
    created_at?: string | null;
    resolved_at?: string | null;
    student?: { id: string; name: string } | null;
    replies: TicketReply[];
}

interface ContactSupportProps {
    user: any;
    organization?: { id: number; name: string } | null;
    tickets: Ticket[];
}

const DEPARTMENTS = ['academics', 'fees', 'transport', 'hostel', 'library', 'other'] as const;
const PRIORITIES = ['low', 'medium', 'high'] as const;
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
const STATUS_COLORS: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-amber-100 text-amber-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    closed: 'bg-gray-100 text-gray-500',
};
const PRIORITY_COLORS: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-red-100 text-red-800',
};

const emptyForm = { subject: '', department: 'other', priority: 'medium', message: '', student_id: '' };

export default function ContactSupport({ user, organization, tickets }: ContactSupportProps) {
    const { t } = useLanguage();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [replyTicketId, setReplyTicketId] = useState<string | null>(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const isAdmin = ['super_admin', 'admin'].includes(user.role);
    const openTickets = tickets.filter((tk) => tk.status === 'open').length;
    const inProgress = tickets.filter((tk) => tk.status === 'in_progress').length;
    const resolved = tickets.filter((tk) => tk.status === 'resolved').length;

    const submitTicket = () => {
        const payload: Record<string, any> = {
            subject: form.subject,
            department: form.department,
            priority: form.priority,
            message: form.message,
        };
        if (form.student_id) payload.student_id = Number(form.student_id);
        router.post('/contact-support', payload, {
            onSuccess: () => {
                setDialogOpen(false);
                setForm(emptyForm);
            },
        });
    };

    const submitReply = () => {
        if (!replyTicketId || !replyMessage.trim()) return;
        router.post(
            `/contact-support/${replyTicketId}/reply`,
            { message: replyMessage },
            {
                onSuccess: () => {
                    setReplyTicketId(null);
                    setReplyMessage('');
                },
            },
        );
    };

    const updateStatus = (ticketId: string, status: string) => {
        router.patch(`/contact-support/${ticketId}`, { status });
    };

    return (
        <DashboardLayout user={user} activeTab="contact-support">
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('Contact Support')}</h1>
                        <p className="text-gray-600 mt-1">{t('Submit and track support requests')}</p>
                    </div>
                    <Button
                        className="gap-2"
                        onClick={() => {
                            setForm(emptyForm);
                            setDialogOpen(true);
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        {t('New Ticket')}
                    </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <LifeBuoy className="w-5 h-5 text-blue-600" />
                            <div>
                                <div className="text-xl font-bold">{openTickets}</div>
                                <div className="text-xs text-gray-500">{t('Open')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <LifeBuoy className="w-5 h-5 text-amber-600" />
                            <div>
                                <div className="text-xl font-bold">{inProgress}</div>
                                <div className="text-xs text-gray-500">{t('In Progress')}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                            <LifeBuoy className="w-5 h-5 text-emerald-600" />
                            <div>
                                <div className="text-xl font-bold">{resolved}</div>
                                <div className="text-xs text-gray-500">{t('Resolved')}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('My Tickets')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {tickets.map((tk) => (
                            <div key={tk.id} className="border rounded-lg p-4">
                                <div
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedId(expandedId === tk.id ? null : tk.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <div className="font-medium">{tk.subject}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {t(tk.department)} &middot; {tk.created_by || '-'} &middot;{' '}
                                                {tk.created_at?.slice(0, 10) || '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={`${PRIORITY_COLORS[tk.priority] || ''} text-xs`}>
                                            {tk.priority}
                                        </Badge>
                                        <Badge className={`${STATUS_COLORS[tk.status] || ''} text-xs`}>
                                            {tk.status.replace('_', ' ')}
                                        </Badge>
                                        {isAdmin && tk.status !== 'closed' && (
                                            <Select value={tk.status} onValueChange={(v) => updateStatus(tk.id, v)}>
                                                <SelectTrigger
                                                    className="w-32 h-7 text-xs"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {STATUSES.map((s) => (
                                                        <SelectItem key={s} value={s}>
                                                            {s.replace('_', ' ')}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {expandedId === tk.id ? (
                                            <ChevronUp className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        )}
                                    </div>
                                </div>
                                {expandedId === tk.id && (
                                    <div className="mt-4 space-y-3">
                                        {tk.replies.map((rp) => (
                                            <div key={rp.id} className="bg-gray-50 rounded p-3">
                                                <div className="text-xs font-medium text-gray-700">
                                                    {rp.user}{' '}
                                                    <span className="text-gray-400">
                                                        {rp.created_at?.slice(0, 16)?.replace('T', ' ') || ''}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">{rp.message}</p>
                                            </div>
                                        ))}
                                        {tk.status !== 'closed' && (
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder={t('Type a reply...')}
                                                    value={replyTicketId === tk.id ? replyMessage : ''}
                                                    onChange={(e) => {
                                                        setReplyTicketId(tk.id);
                                                        setReplyMessage(e.target.value);
                                                    }}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={submitReply}
                                                    disabled={replyTicketId !== tk.id || !replyMessage.trim()}
                                                >
                                                    <Send className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {tickets.length === 0 && (
                            <p className="text-center text-gray-500 py-10">{t('No records found.')}</p>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{t('New Support Ticket')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('Subject')}</label>
                                <Input
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('Department')}</label>
                                    <Select
                                        value={form.department}
                                        onValueChange={(v) => setForm({ ...form, department: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DEPARTMENTS.map((d) => (
                                                <SelectItem key={d} value={d}>
                                                    {t(d.charAt(0).toUpperCase() + d.slice(1))}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('Priority')}</label>
                                    <Select
                                        value={form.priority}
                                        onValueChange={(v) => setForm({ ...form, priority: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRIORITIES.map((p) => (
                                                <SelectItem key={p} value={p}>
                                                    {t(p.charAt(0).toUpperCase() + p.slice(1))}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('Message')}</label>
                                <Textarea
                                    rows={4}
                                    value={form.message}
                                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button onClick={submitTicket} disabled={!form.subject || !form.message}>
                                {t('Submit')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
