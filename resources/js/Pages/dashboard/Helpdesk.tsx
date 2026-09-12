import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { ChevronDown, LifeBuoy, Loader2, Plus, Send, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface Reply {
    id: string;
    message: string;
    user: string;
    role?: string | null;
    created_at: string;
}

interface Ticket {
    id: string;
    reference?: string;
    subject: string;
    department: string;
    priority: string;
    status: string;
    message_count?: number;
    student: string;
    class?: string | null;
    created_at?: string | null;
    resolved_at?: string | null;
    assignee?: string | null;
    creator_role?: string | null;
    replies: Reply[];
    expanded?: boolean;
}

interface StaffMember {
    id: string;
    label: string;
}

interface HelpdeskProps {
    user: any;
    organization?: any;
    tickets: Ticket[];
    staffMembers: StaffMember[];
    isStaff: boolean;
    canManage: boolean;
    selectedStatus?: string | null;
    selectedDepartment?: string | null;
}

const STATUS_BADGE: Record<string, string> = {
    open: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    resolved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

const PRIORITY_BADGE: Record<string, string> = {
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export default function Helpdesk(pageProps: HelpdeskProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const tickets = pageProps.tickets ?? [];
    const staffMembers = pageProps.staffMembers ?? [];
    const isStaff = pageProps.isStaff ?? false;
    const canManage = pageProps.canManage ?? false;

    const [selectedStatus, setSelectedStatus] = useState(pageProps.selectedStatus ?? '');
    const [selectedDepartment, setSelectedDepartment] = useState(pageProps.selectedDepartment ?? '');
    const [expandedId, setExpandedId] = useState<string | null>(tickets[0]?.id ?? null);
    const [showModal, setShowModal] = useState(false);
    const [replyId, setReplyId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        student_id: '',
        subject: '',
        department: 'academics',
        priority: 'medium',
        message: '',
    });

    const filter = (data: Record<string, string>) => {
        const next = { status: selectedStatus, department: selectedDepartment, ...data };
        if ('status' in data) setSelectedStatus(data.status);
        if ('department' in data) setSelectedDepartment(data.department);
        router.visit('/helpdesk', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: next,
            only: ['tickets'],
        });
    };

    const openCreate = () => {
        setForm({ student_id: '', subject: '', department: 'academics', priority: 'medium', message: '' });
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const data: Record<string, string> = {
            subject: form.subject,
            department: form.department,
            message: form.message,
        };
        if (isStaff && form.student_id) data.student_id = form.student_id;
        if (form.priority) data.priority = form.priority;

        router.post('/helpdesk', data, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false),
            onFinish: () => setSaving(false),
        });
    };

    const postReply = (ticketId: string) => {
        if (!replyText.trim()) return;
        setSaving(true);
        router.post(
            `/helpdesk/${ticketId}/reply`,
            { message: replyText },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setReplyText('');
                    setReplyId(null);
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const updateTicket = (ticket: Ticket, data: Record<string, string>) => {
        router.patch(`/helpdesk/${ticket.id}`, data, { preserveScroll: true });
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Parent Helpdesk')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isStaff
                                ? t('Respond to queries raised by students and parents.')
                                : t('Raise a query with the school and track its status here.')}
                        </p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('New Ticket')}
                    </Button>
                </div>

                {!isStaff && (
                    <Card>
                        <CardContent className="py-3 text-sm text-gray-600 dark:text-gray-300">
                            {t('Raising ticket as')}: <strong>{user.name}</strong>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Filter')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label>{t('Status')}</Label>
                                <Select value={selectedStatus} onValueChange={(v) => filter({ status: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All statuses')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">{t('Open')}</SelectItem>
                                        <SelectItem value="in_progress">{t('In Progress')}</SelectItem>
                                        <SelectItem value="resolved">{t('Resolved')}</SelectItem>
                                        <SelectItem value="closed">{t('Closed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Department')}</Label>
                                <Select value={selectedDepartment} onValueChange={(v) => filter({ department: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All departments')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="academics">{t('Academics')}</SelectItem>
                                        <SelectItem value="fees">{t('Fees')}</SelectItem>
                                        <SelectItem value="transport">{t('Transport')}</SelectItem>
                                        <SelectItem value="hostel">{t('Hostel')}</SelectItem>
                                        <SelectItem value="library">{t('Library')}</SelectItem>
                                        <SelectItem value="other">{t('Other')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {tickets.length === 0 ? (
                    <Card>
                        <CardContent>
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                <LifeBuoy className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                {t('No support tickets yet.')}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {tickets.map((ticket) => (
                            <Card key={ticket.id}>
                                <CardHeader className="cursor-pointer py-4" onClick={() => toggleExpand(ticket.id)}>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <ChevronDown
                                            className={`h-4 w-4 text-gray-400 transition-transform ${expandedId === ticket.id ? 'rotate-180' : ''}`}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {ticket.subject}
                                        </span>
                                        <span className="font-mono text-xs text-gray-400">
                                            {ticket.reference}
                                            {typeof ticket.message_count === 'number' &&
                                                ` · ${ticket.message_count} ${t('messages')}`}
                                        </span>
                                        <Badge className={STATUS_BADGE[ticket.status] ?? ''}>
                                            {t(i18nStatus(ticket.status))}
                                        </Badge>
                                        <Badge className={PRIORITY_BADGE[ticket.priority] ?? ''}>
                                            {t(i18nPriority(ticket.priority))}
                                        </Badge>
                                        <Badge variant="outline">{t(i18nDepartment(ticket.department))}</Badge>
                                    </div>
                                    <CardDescription className="mt-1 text-xs">
                                        {isStaff && <span className="mr-3">{ticket.student}</span>}
                                        {isStaff && ticket.class && <span className="mr-3">{ticket.class}</span>}
                                        <span className="mr-3">{formatDate(ticket.created_at)}</span>
                                        {ticket.assignee && (
                                            <span>
                                                {t('Assigned to')}: {ticket.assignee}
                                            </span>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                {expandedId === ticket.id && (
                                    <CardContent className="space-y-4">
                                        <div className="space-y-3">
                                            {ticket.replies.map((reply) => (
                                                <div
                                                    key={reply.id}
                                                    className={`rounded-lg border p-3 ${reply.role === 'student' ? 'bg-gray-50 dark:bg-gray-900/40' : 'bg-blue-50 dark:bg-blue-900/20'}`}
                                                >
                                                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                        <span className="font-medium text-gray-800 dark:text-gray-200">
                                                            {reply.user}
                                                        </span>
                                                        <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                                                            {reply.role === 'student' ? t('Student') : t('Staff')}
                                                        </span>
                                                        <span>{formatDate(reply.created_at)}</span>
                                                    </div>
                                                    <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                                                        {reply.message}
                                                    </p>
                                                </div>
                                            ))}
                                            {ticket.replies.length === 0 && (
                                                <p className="text-sm text-gray-400">{t('No replies yet.')}</p>
                                            )}
                                        </div>

                                        {ticket.status !== 'closed' && (
                                            <div className="space-y-2">
                                                <Textarea
                                                    rows={2}
                                                    value={replyId === ticket.id ? replyText : ''}
                                                    onChange={(e) => {
                                                        setReplyId(ticket.id);
                                                        setReplyText(e.target.value);
                                                    }}
                                                    placeholder={t('Type your reply...')}
                                                />
                                                <div className="flex justify-end">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => postReply(ticket.id)}
                                                        disabled={saving || replyId !== ticket.id || !replyText.trim()}
                                                    >
                                                        {saving && replyId === ticket.id && (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        )}
                                                        <Send className="mr-1 h-4 w-4" />
                                                        {t('Send Reply')}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {canManage && (
                                            <div className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-3">
                                                <div>
                                                    <Label>{t('Status')}</Label>
                                                    <Select
                                                        value={ticket.status}
                                                        onValueChange={(v) =>
                                                            updateTicket(ticket, {
                                                                status: v,
                                                                priority: ticket.priority || 'medium',
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="open">{t('Open')}</SelectItem>
                                                            <SelectItem value="in_progress">
                                                                {t('In Progress')}
                                                            </SelectItem>
                                                            <SelectItem value="resolved">{t('Resolved')}</SelectItem>
                                                            <SelectItem value="closed">{t('Closed')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>{t('Priority')}</Label>
                                                    <Select
                                                        value={ticket.priority}
                                                        onValueChange={(v) =>
                                                            updateTicket(ticket, { status: ticket.status, priority: v })
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="low">{t('Low')}</SelectItem>
                                                            <SelectItem value="medium">{t('Medium')}</SelectItem>
                                                            <SelectItem value="high">{t('High')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>{t('Assign to')}</Label>
                                                    <Select
                                                        value="none"
                                                        onValueChange={(v) =>
                                                            v !== 'none' &&
                                                            updateTicket(ticket, {
                                                                status: ticket.status,
                                                                priority: ticket.priority || 'medium',
                                                                assigned_to: v as string,
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Unassigned')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">{t('Unassigned')}</SelectItem>
                                                            {staffMembers.map((staff) => (
                                                                <SelectItem key={staff.id} value={staff.id}>
                                                                    {staff.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('New Ticket')}</h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <Label>{t('Subject')} *</Label>
                                <Input
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Department')} *</Label>
                                    <Select
                                        value={form.department}
                                        onValueChange={(v) => setForm({ ...form, department: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="academics">{t('Academics')}</SelectItem>
                                            <SelectItem value="fees">{t('Fees')}</SelectItem>
                                            <SelectItem value="transport">{t('Transport')}</SelectItem>
                                            <SelectItem value="hostel">{t('Hostel')}</SelectItem>
                                            <SelectItem value="library">{t('Library')}</SelectItem>
                                            <SelectItem value="other">{t('Other')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {isStaff && (
                                    <div>
                                        <Label>{t('Priority')}</Label>
                                        <Select
                                            value={form.priority}
                                            onValueChange={(v) => setForm({ ...form, priority: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">{t('Low')}</SelectItem>
                                                <SelectItem value="medium">{t('Medium')}</SelectItem>
                                                <SelectItem value="high">{t('High')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <div>
                                <Label>{t('Message')} *</Label>
                                <Textarea
                                    rows={4}
                                    value={form.message}
                                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('Create Ticket')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

function formatDate(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}

function i18nStatus(status: string): string {
    return { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' }[status] ?? status;
}

function i18nPriority(priority: string): string {
    return { low: 'Low', medium: 'Medium', high: 'High' }[priority] ?? priority;
}

function i18nDepartment(department: string): string {
    return (
        {
            academics: 'Academics',
            fees: 'Fees',
            transport: 'Transport',
            hostel: 'Hostel',
            library: 'Library',
            other: 'Other',
        }[department] ?? department
    );
}
