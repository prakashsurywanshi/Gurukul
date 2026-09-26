import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useMemo, useState } from 'react';
import { ChevronDown, Loader2, Megaphone, Send, Users } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Option {
    value: string;
    label: string;
}

interface BroadcastComposeProps {
    user: any;
    classOptions?: Option[];
    studentOptions?: Option[];
    staffOptions?: Option[];
    placeholders?: string[];
    channels?: string[];
}

const CHANNEL_LABELS: Record<string, string> = {
    email: 'Email',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
    qwa_whatsapp: 'QWA WhatsApp',
    push: 'Push Notification',
};

const GROUPS: { value: string; label: string }[] = [
    { value: 'all_parents', label: 'All Parents' },
    { value: 'all_staff', label: 'All Staff' },
    { value: 'due_fees', label: 'Parents with Due Fees' },
    { value: 'no_dues', label: 'Parents with No Dues' },
    { value: 'class_parents', label: 'Parents of Specific Class(es)' },
    { value: 'class_students', label: 'Students of Specific Class(es)' },
    { value: 'specific_students', label: 'Specific Student(s) / Parent(s)' },
    { value: 'specific_staff', label: 'Specific Staff' },
];

export default function BroadcastCompose(pageProps: BroadcastComposeProps) {
    const { t } = useLanguage();
    const errors = (usePage().props as any).errors ?? {};
    const broadcastProps = (usePage().props as any).broadcast ?? {};
    const [subject, setSubject] = useState(broadcastProps.subject ?? '');
    const [message, setMessage] = useState(broadcastProps.message ?? '');
    const [channels, setChannels] = useState<string[]>(broadcastProps.channels ?? ['whatsapp']);
    const [recipientGroup, setRecipientGroup] = useState(broadcastProps.recipient_group ?? 'all_parents');
    const [selectedClasses, setSelectedClasses] = useState<string[]>(broadcastProps.class_ids ?? []);
    const [selectedStudents, setSelectedStudents] = useState<string[]>(broadcastProps.student_ids ?? []);
    const [selectedStaff, setSelectedStaff] = useState<string[]>(broadcastProps.staff_ids ?? []);
    const [studentQuery, setStudentQuery] = useState('');
    const [staffQuery, setStaffQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const placeholders = pageProps.placeholders ?? [];
    const classOptions = pageProps.classOptions ?? [];
    const studentOptions = pageProps.studentOptions ?? [];
    const staffOptions = pageProps.staffOptions ?? [];

    const acceptPlaceholder = (placeholder: string) => {
        const token = `[${placeholder}]`;
        if (message.includes(token)) return;
        setMessage((current) => (current ? `${current} ${token}` : token));
    };

    const toggleChannel = (channel: string) => {
        setChannels((current) =>
            current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel],
        );
    };

    const toggleClass = (classId: string) => {
        setSelectedClasses((current) =>
            current.includes(classId) ? current.filter((c) => c !== classId) : [...current, classId],
        );
    };

    const toggleStudent = (studentId: string) => {
        setSelectedStudents((current) =>
            current.includes(studentId) ? current.filter((s) => s !== studentId) : [...current, studentId],
        );
    };

    const toggleStaff = (staffId: string) => {
        setSelectedStaff((current) =>
            current.includes(staffId) ? current.filter((s) => s !== staffId) : [...current, staffId],
        );
    };

    const visibleStudents = useMemo(() => {
        const query = studentQuery.trim().toLowerCase();
        if (!query) return studentOptions;
        return studentOptions.filter((option) => option.label.toLowerCase().includes(query));
    }, [studentQuery, studentOptions]);

    const visibleStaff = useMemo(() => {
        const query = staffQuery.trim().toLowerCase();
        if (!query) return staffOptions;
        return staffOptions.filter((option) => option.label.toLowerCase().includes(query));
    }, [staffQuery, staffOptions]);

    const recipientLabel = GROUPS.find((group) => group.value === recipientGroup)?.label ?? recipientGroup;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        router.post(
            '/communicate/broadcast',
            {
                subject,
                message,
                channels,
                recipient_group: recipientGroup,
                class_ids:
                    recipientGroup === 'class_parents' || recipientGroup === 'class_students' ? selectedClasses : undefined,
                student_ids: recipientGroup === 'specific_students' ? selectedStudents : undefined,
                staff_ids: recipientGroup === 'specific_staff' ? selectedStaff : undefined,
            },
            {
                onFinish: () => setIsSaving(false),
                onStart: () => setIsSending(true),
            },
        );
    };

    return (
        <DashboardLayout user={pageProps.user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-600 text-white">
                        <Megaphone className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Compose Broadcast Message')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Send one message to many parents or staff across multiple channels.')}
                        </p>
                    </div>
                </div>

                <PageError message={errors.recipient_group} />
                <PageError message={errors.qwa_delivery} />
                <PageError message={errors.class_ids} />
                <PageError message={errors.student_ids} />
                <PageError message={errors.staff_ids} />
                <PageError message={errors.subject} />

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Send className="h-4 w-4" />
                                {t('Target Channels')}
                            </CardTitle>
                            <CardDescription>{t('Select at least one delivery method.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {errors.channels && <PageError message={errors.channels} />}
                            <div className="flex flex-wrap gap-6">
                                {(pageProps.channels ?? ['email', 'sms', 'whatsapp', 'push']).map((channel) => (
                                    <label
                                        key={channel}
                                        className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                                    >
                                        <Checkbox
                                            checked={channels.includes(channel)}
                                            onCheckedChange={() => toggleChannel(channel)}
                                        />
                                        {t(CHANNEL_LABELS[channel] ?? channel)}
                                    </label>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">{t('Message')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>
                                    {t('Subject')} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder={t('e.g. Fee reminder for September')}
                                    maxLength={255}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>
                                    {t('Message Body')} <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={6}
                                    placeholder={t('Type your message here...')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Dynamic Placeholders')}</Label>
                                <div className="flex flex-wrap gap-2">
                                    {placeholders.map((placeholder) => (
                                        <button
                                            key={placeholder}
                                            type="button"
                                            onClick={() => acceptPlaceholder(placeholder)}
                                            className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-mono text-xs text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300"
                                            title={t('Click to insert placeholder')}
                                        >
                                            [{placeholder}]
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4" />
                                {t('Recipient Group')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label>{t('Who should receive this broadcast?')}</Label>
                                <Select value={recipientGroup} onValueChange={setRecipientGroup}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GROUPS.map((group) => (
                                            <SelectItem key={group.value} value={group.value}>
                                                {t(group.label)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {(recipientGroup === 'class_parents' || recipientGroup === 'class_students') && (
                                <div className="space-y-2">
                                    <Label>{t('Select Class(es)')}</Label>
                                    <div className="grid max-h-64 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-700">
                                        {classOptions.map((option) => (
                                            <label
                                                key={option.value}
                                                className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                                            >
                                                <Checkbox
                                                    checked={selectedClasses.includes(option.value)}
                                                    onCheckedChange={() => toggleClass(option.value)}
                                                />
                                                {option.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {recipientGroup === 'specific_staff' && (
                                <div className="space-y-2">
                                    <Label>{t('Select Staff Member(s)')}</Label>
                                    <Input
                                        value={staffQuery}
                                        onChange={(e) => setStaffQuery(e.target.value)}
                                        placeholder={t('Search staff...')}
                                        className="mb-2"
                                    />
                                    <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-700">
                                        {visibleStaff.map((option) => (
                                            <label
                                                key={option.value}
                                                className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                                            >
                                                <Checkbox
                                                    checked={selectedStaff.includes(option.value)}
                                                    onCheckedChange={() => toggleStaff(option.value)}
                                                />
                                                <span className="truncate">{option.label}</span>
                                            </label>
                                        ))}
                                        {visibleStaff.length === 0 && (
                                            <p className="col-span-full text-xs text-gray-500">
                                                {t('No matching staff found')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {recipientGroup === 'specific_students' && (
                                <div className="space-y-2">
                                    <Label>{t('Select Student(s)')}</Label>
                                    <Input
                                        value={studentQuery}
                                        onChange={(e) => setStudentQuery(e.target.value)}
                                        placeholder={t('Search students...')}
                                        className="mb-2"
                                    />
                                    <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-700">
                                        {visibleStudents.map((option) => (
                                            <label
                                                key={option.value}
                                                className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                                            >
                                                <Checkbox
                                                    checked={selectedStudents.includes(option.value)}
                                                    onCheckedChange={() => toggleStudent(option.value)}
                                                />
                                                <span className="truncate">{option.label}</span>
                                            </label>
                                        ))}
                                        {visibleStudents.length === 0 && (
                                            <p className="col-span-full text-xs text-gray-500">
                                                {t('No matching students found')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => router.visit('/communicate/broadcast')}>
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            className="bg-indigo-600 text-white hover:bg-indigo-700"
                            disabled={isSaving || isSending}
                        >
                            {isSending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            {t('Send Broadcast')}
                        </Button>
                    </div>
                </form>

                {recipientGroup && (
                    <p className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
                        <ChevronDown className="h-4 w-4" />
                        {t(recipientLabel)}
                        {(recipientGroup === 'class_parents' || recipientGroup === 'class_students') &&
                            selectedClasses.length > 0 &&
                            ` · ${selectedClasses.length} ${t('classes')}`}
                        {recipientGroup === 'specific_students' &&
                            selectedStudents.length > 0 &&
                            ` · ${selectedStudents.length} ${t('students')}`}
                        {recipientGroup === 'specific_staff' &&
                            selectedStaff.length > 0 &&
                            ` · ${selectedStaff.length} ${t('staff members')}`}
                    </p>
                )}
            </div>
        </DashboardLayout>
    );
}

function PageError({ message }: { message?: string | string[] }) {
    if (!message) return null;
    const text = Array.isArray(message) ? message[0] : message;
    return (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">{text}</div>
    );
}
