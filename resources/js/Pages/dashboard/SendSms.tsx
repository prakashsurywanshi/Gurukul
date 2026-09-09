import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { MessageSquareText, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';

type AudienceType = 'staff' | 'students' | 'class_section';

type SmsHistoryItem = {
    id: string;
    to: string;
    subject: string;
    preview: string;
    queuedAt: string;
    status: string;
    recipientCount: number;
    recipientPhones: string[];
    providerName?: string | null;
    providerReference?: string | null;
    errorMessage?: string | null;
    sentAt?: string | null;
};

type StaffRecord = {
    id: string;
    name: string;
    phone: string;
    role: string;
};

type StudentRecord = {
    id: string;
    name: string;
    phone: string;
    class: string;
    section: string;
};

interface SendSmsProps {
    user: any;
    staffRecords?: StaffRecord[];
    studentRecords?: StudentRecord[];
    smsHistory?: SmsHistoryItem[];
    smsConfigured?: { enabled: boolean; configured: boolean; provider?: string | null; providerSupported: boolean };
}

const roleLabels: Record<string, string> = {
    admin: 'Admins',
    teacher: 'Teachers',
    receptionist: 'Receptionists',
    accountant: 'Accountants',
    librarian: 'Librarians',
};

const toTitleCase = (value: string) =>
    value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

export default function SendSms({
    user,
    staffRecords = [],
    studentRecords = [],
    smsHistory = [],
    smsConfigured,
}: SendSmsProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    }>();
    const [showSmsDialog, setShowSmsDialog] = useState(false);
    const [history, setHistory] = useState<SmsHistoryItem[]>(smsHistory);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;
    const [form, setForm] = useState({
        audienceType: 'students' as AudienceType,
        staffRole: 'teacher',
        selectedStaffRoles: [] as string[],
        targetClass: '',
        targetSection: '',
        selectedGroups: [] as string[],
        subject: '',
        content: '',
    });

    useEffect(() => {
        setHistory(smsHistory);
    }, [smsHistory]);

    useEffect(() => {
        if (page.props.flash?.success) {
            toast.success(page.props.flash.success);
        }

        if (page.props.flash?.error) {
            toast.error(page.props.flash.error);
        }
    }, [page.props.flash?.error, page.props.flash?.success]);

    const classOptions = useMemo(
        () =>
            Array.from(new Set(studentRecords.map((student) => String(student.class)))).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true }),
            ),
        [studentRecords],
    );

    const sectionOptions = useMemo(() => {
        return Array.from(
            new Set(
                studentRecords
                    .filter((student) => !form.targetClass || String(student.class) === form.targetClass)
                    .map((student) => String(student.section)),
            ),
        ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [form.targetClass, studentRecords]);

    const staffRoleOptions = useMemo(
        () => Array.from(new Set(staffRecords.map((staff) => String(staff.role)))).sort(),
        [staffRecords],
    );

    const sentTotalPages = Math.max(1, Math.ceil(history.length / rowsPerPage));
    const paginatedHistory = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return history.slice(startIndex, startIndex + rowsPerPage);
    }, [history, currentPage]);

    useEffect(() => {
        setCurrentPage((current) => Math.min(current, sentTotalPages));
    }, [sentTotalPages]);

    const resetForm = () => {
        setForm({
            audienceType: 'students',
            staffRole: 'teacher',
            selectedStaffRoles: [],
            targetClass: '',
            targetSection: '',
            selectedGroups: [],
            subject: '',
            content: '',
        });
    };

    const addSelectedGroup = () => {
        if (!form.targetClass || !form.targetSection) {
            toast.error('Select class and section first');
            return;
        }

        const value = `${form.targetClass}-${form.targetSection}`;
        setForm((current) => ({
            ...current,
            selectedGroups: current.selectedGroups.includes(value)
                ? current.selectedGroups
                : [...current.selectedGroups, value],
            targetClass: '',
            targetSection: '',
        }));
    };

    const toggleGroupSelection = (group: string) => {
        setForm((current) => ({
            ...current,
            selectedGroups: current.selectedGroups.includes(group)
                ? current.selectedGroups.filter((item) => item !== group)
                : [...current.selectedGroups, group],
        }));
    };

    const addSelectedStaffRole = () => {
        if (!form.staffRole) {
            toast.error('Select a staff group first');
            return;
        }

        setForm((current) => ({
            ...current,
            selectedStaffRoles: current.selectedStaffRoles.includes(current.staffRole)
                ? current.selectedStaffRoles
                : [...current.selectedStaffRoles, current.staffRole],
            staffRole: 'teacher',
        }));
    };

    const toggleStaffRoleSelection = (role: string) => {
        setForm((current) => ({
            ...current,
            selectedStaffRoles: current.selectedStaffRoles.includes(role)
                ? current.selectedStaffRoles.filter((item) => item !== role)
                : [...current.selectedStaffRoles, role],
        }));
    };

    const handleSend = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (form.audienceType === 'staff' && form.selectedStaffRoles.length === 0) {
            toast.error('Select at least one staff group');
            return;
        }

        if (form.audienceType === 'class_section' && form.selectedGroups.length === 0) {
            toast.error('Select at least one class and section group');
            return;
        }

        router.post(
            '/communication/send-sms',
            {
                audienceType: form.audienceType,
                selectedStaffRoles: form.selectedStaffRoles,
                selectedGroups: form.selectedGroups,
                subject: form.subject,
                content: form.content,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    resetForm();
                    setShowSmsDialog(false);
                    setCurrentPage(1);
                },
            },
        );
    };

    const handleDeleteHistory = (smsId: string) => {
        if (!window.confirm('Delete this SMS history entry?')) {
            return;
        }

        router.delete(`/communication/send-sms/${smsId}`, {
            preserveScroll: true,
            onSuccess: () => {
                setCurrentPage(1);
            },
        });
    };

    const statusStyle = (status: string) => {
        const normalized = status.toLowerCase();
        if (['sent', 'completed'].includes(normalized)) {
            return 'bg-green-50 text-green-700 border-green-200';
        }
        if (['partial', 'processing', 'queued'].includes(normalized)) {
            return 'bg-amber-50 text-amber-700 border-amber-200';
        }
        if (['failed', 'cancelled'].includes(normalized)) {
            return 'bg-red-50 text-red-700 border-red-200';
        }
        return 'bg-slate-50 text-slate-700 border-slate-200';
    };

    return (
        <DashboardLayout user={user} activeTab="send-sms">
            <div className="space-y-6 p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-3xl font-bold text-slate-900">{t('Send SMS')}</h1>
                        <p className="mt-1 text-slate-600">
                            {t(
                                'Send transactional SMS alerts to staff, students, or specific class sections via your configured SMS gateway.',
                            )}
                        </p>
                    </div>

                    <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 self-start md:shrink-0" disabled={!smsConfigured?.configured}>
                                <Plus className="h-4 w-4" />
                                {t('New SMS')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{t('Compose SMS')}</DialogTitle>
                                <DialogDescription>
                                    {t(
                                        'Queue an SMS alert for all staff, role-wise staff, all students, or class sections.',
                                    )}
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleSend} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{t('Audience Type')}</Label>
                                        <Select
                                            value={form.audienceType}
                                            onValueChange={(value: AudienceType) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    audienceType: value,
                                                    staffRole: value === 'staff' ? current.staffRole : 'teacher',
                                                    selectedStaffRoles:
                                                        value === 'staff' ? current.selectedStaffRoles : [],
                                                    targetClass: value === 'class_section' ? current.targetClass : '',
                                                    targetSection:
                                                        value === 'class_section' ? current.targetSection : '',
                                                    selectedGroups:
                                                        value === 'class_section' ? current.selectedGroups : [],
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="staff">
                                                    {t('All Staff / Role-wise Staff')}
                                                </SelectItem>
                                                <SelectItem value="students">{t('All Students')}</SelectItem>
                                                <SelectItem value="class_section">
                                                    {t('Students by Class & Section')}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {form.audienceType === 'staff' ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('Staff Group')}</Label>
                                                <Select
                                                    value={form.staffRole}
                                                    onValueChange={(value) =>
                                                        setForm((current) => ({ ...current, staffRole: value }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {staffRoleOptions.map((role) => (
                                                            <SelectItem key={role} value={role}>
                                                                {roleLabels[role] || toTitleCase(role)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>&nbsp;</Label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={addSelectedStaffRole}
                                                >
                                                    {t('Add Staff Group')}
                                                </Button>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>{t('Selected Staff Groups')}</Label>
                                                <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
                                                    {form.selectedStaffRoles.length > 0 ? (
                                                        form.selectedStaffRoles.map((role) => (
                                                            <Badge
                                                                key={role}
                                                                variant="secondary"
                                                                className="cursor-pointer"
                                                                onClick={() => toggleStaffRoleSelection(role)}
                                                            >
                                                                {roleLabels[role] || toTitleCase(role)}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-slate-500">
                                                            {t('No staff groups selected yet.')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>{t('Quick Multi-Select')}</Label>
                                                <div className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-2">
                                                    {staffRoleOptions.map((role) => (
                                                        <label
                                                            key={role}
                                                            className="flex items-center gap-2 text-sm text-slate-700"
                                                        >
                                                            <Checkbox
                                                                checked={form.selectedStaffRoles.includes(role)}
                                                                onCheckedChange={() => toggleStaffRoleSelection(role)}
                                                            />

                                                            <span>{roleLabels[role] || toTitleCase(role)}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : null}

                                    {form.audienceType === 'class_section' ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('Class')}</Label>
                                                <Select
                                                    value={form.targetClass}
                                                    onValueChange={(value) => {
                                                        const sections = Array.from(
                                                            new Set(
                                                                studentRecords
                                                                    .filter((s) => String(s.class) === value)
                                                                    .map((s) => String(s.section)),
                                                            ),
                                                        ).sort((a, b) =>
                                                            a.localeCompare(b, undefined, { numeric: true }),
                                                        );
                                                        setForm((current) => ({
                                                            ...current,
                                                            targetClass: value,
                                                            targetSection: sections[0] || '',
                                                        }));
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('Select class')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {classOptions.map((className) => (
                                                            <SelectItem key={className} value={className}>
                                                                {className}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Section')}</Label>
                                                <Select
                                                    value={form.targetSection}
                                                    onValueChange={(value) =>
                                                        setForm((current) => ({ ...current, targetSection: value }))
                                                    }
                                                    disabled={!form.targetClass}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('Select section')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {sectionOptions.map((section) => (
                                                            <SelectItem key={section} value={section}>
                                                                {t('Section')}
                                                                {section}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <Label>{t('Selected Groups')}</Label>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={addSelectedGroup}
                                                    >
                                                        {t('Add Group')}
                                                    </Button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
                                                    {form.selectedGroups.length > 0 ? (
                                                        form.selectedGroups.map((group) => (
                                                            <Badge
                                                                key={group}
                                                                variant="secondary"
                                                                className="cursor-pointer"
                                                                onClick={() => toggleGroupSelection(group)}
                                                            >
                                                                {group}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-slate-500">
                                                            {t('No class-section groups selected yet.')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : null}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sms-subject">{t('Subject')}</Label>
                                    <Input
                                        id="sms-subject"
                                        value={form.subject}
                                        onChange={(event) =>
                                            setForm((current) => ({ ...current, subject: event.target.value }))
                                        }
                                        maxLength={160}
                                        required
                                    />

                                    {page.props.errors?.subject ? (
                                        <p className="text-sm text-red-600">{page.props.errors.subject}</p>
                                    ) : null}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sms-content">{t('Message Body')}</Label>
                                    <Textarea
                                        id="sms-content"
                                        rows={4}
                                        value={form.content}
                                        onChange={(event) =>
                                            setForm((current) => ({ ...current, content: event.target.value }))
                                        }
                                        maxLength={160}
                                        placeholder={t('Optional. Falls back to the subject when empty.')}
                                    />

                                    <p className="text-xs text-slate-500">
                                        {form.content.length}/160{' '}
                                        {t('characters (single SMS up to 160 chars on standard templates)')}
                                    </p>

                                    {page.props.errors?.content ? (
                                        <p className="text-sm text-red-600">{page.props.errors.content}</p>
                                    ) : null}
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setShowSmsDialog(false)}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button type="submit" className="gap-2">
                                        <Send className="h-4 w-4" />
                                        {t('Queue SMS')}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {!smsConfigured?.configured ? (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <MessageSquareText className="h-5 w-5 shrink-0" />
                        <div>
                            <p className="font-medium">{t('SMS gateway is not configured.')}</p>
                            <p className="mt-0.5">
                                {t(
                                    'Enable SMS and add a valid provider API key from Communication Settings before sending alerts.',
                                )}
                            </p>
                        </div>
                    </div>
                ) : smsConfigured?.provider ? (
                    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                        <MessageSquareText className="h-5 w-5 shrink-0" />
                        <div>
                            <p className="font-medium">
                                {t('SMS gateway ready')} — {smsConfigured.provider}
                            </p>
                            <p className="mt-0.5">{t('Messages are delivered by a queue worker in the background.')}</p>
                        </div>
                    </div>
                ) : null}

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <MessageSquareText className="h-5 w-5 text-blue-600" />
                            <div>
                                <CardTitle>{t('Sent SMS History')}</CardTitle>
                                <CardDescription>
                                    {t('Track queued and delivered SMS campaigns along with provider responses.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {history.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-500">{t('No SMS campaigns yet.')}</p>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Recipients')}</TableHead>
                                            <TableHead>{t('Subject')}</TableHead>
                                            <TableHead>{t('Queued At')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead>{t('Count')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedHistory.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <p className="font-medium text-slate-900">{item.to}</p>
                                                    {(item.recipientPhones ?? []).length > 0 ? (
                                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                                            {(item.recipientPhones ?? [])
                                                                .slice(0, 3)
                                                                .map((phone) => `+${phone}`)
                                                                .join(', ')}
                                                            {(item.recipientPhones ?? []).length > 3
                                                                ? ` +${(item.recipientPhones ?? []).length - 3} more`
                                                                : ''}
                                                        </p>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-slate-900">{item.subject}</p>
                                                    {item.providerName ? (
                                                        <p className="text-xs text-slate-500">{item.providerName}</p>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    {item.queuedAt}
                                                </TableCell>
                                                <TableCell>
                                                    <span
                                                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle(item.status)}`}
                                                    >
                                                        {t(item.status)}
                                                    </span>
                                                    {item.errorMessage ? (
                                                        <p
                                                            className="mt-1 max-w-xs truncate text-xs text-red-600"
                                                            title={item.errorMessage}
                                                        >
                                                            {item.errorMessage}
                                                        </p>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    {item.recipientCount}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        title={t('Delete history entry')}
                                                        onClick={() => handleDeleteHistory(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {sentTotalPages > 1 ? (
                                    <div className="mt-4 flex items-center justify-between">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage((value) => value - 1)}
                                        >
                                            {t('Previous')}
                                        </Button>
                                        <span className="text-sm text-slate-500">
                                            {currentPage} / {sentTotalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPage === sentTotalPages}
                                            onClick={() => setCurrentPage((value) => value + 1)}
                                        >
                                            {t('Next')}
                                        </Button>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
