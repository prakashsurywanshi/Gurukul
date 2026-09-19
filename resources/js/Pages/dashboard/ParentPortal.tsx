import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    ArrowLeftRight,
    Bot,
    BusFront,
    CalendarDays,
    CalendarHeart,
    CalendarCheck,
    ClipboardCheck,
    Clock3,
    FileClock,
    FolderOpen,
    GraduationCap,
    Handshake,
    HeartPulse,
    History,
    Image,
    IndianRupee,
    Library,
    Mail,
    MessageSquare,
    PenLine,
    Send,
    Sparkles,
    UserRound,
    Video,
} from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useLanguage } from '../../i18n/LanguageProvider';

interface Child {
    id: string;
    name: string;
    className: string;
    section: string;
}

interface CalendarEvent {
    title: string;
    type: string;
    is_holiday: boolean;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    location?: string;
    color?: string;
}

interface TimetableEntry {
    day: string;
    subject: string;
    teacher: string;
    period_order?: number;
    start_time?: string;
    end_time?: string;
    room_number?: string;
    period_type?: string;
}

interface AttendanceSummary {
    attendedDays: number;
    absent: number;
    leave: number;
}

interface AttendanceRecord {
    date: string;
    status: string;
    remarks?: string;
}

interface ExamResultRow {
    exam: string;
    subject: string;
    exam_date?: string;
    total_marks: number;
    obtained_marks: number;
    grade?: string;
    is_absent: boolean;
    remarks?: string;
}

interface PtmRow {
    title: string;
    date?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    status: string;
    appointment?: { slot_time?: string; status: string } | null;
}

interface AssessmentRow {
    name: string;
    term?: string;
    assessment_type?: string;
    total_marks?: number;
    weightage?: number;
    start_date?: string;
    end_date?: string;
}

interface ClassworkRow {
    title: string;
    subject: string;
    teacher: string;
    assign_date?: string;
    due_date?: string;
    description?: string;
    status: string;
}

interface PaymentRow {
    receipt_number: string;
    amount: number;
    payment_method: string;
    payment_date?: string;
    status: string;
    transaction_id?: string;
}

interface MessageRow {
    subject: string;
    message: string;
    priority: string;
    is_announcement: boolean;
    sender: string;
    created_at?: string;
}

interface TransportInfo {
    required: boolean;
    route?: string;
    vehicle?: string;
    pickup_point?: string;
    routes: Array<{ name: string; route_number?: string; description?: string; status: string }>;
}

interface LibraryBook {
    title: string;
    author: string;
    category: string;
    language: string;
    available_copies: number;
    rack_number?: string;
}

interface VisitRow {
    title: string;
    type: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    location?: string;
}

interface StudyCenterRow {
    title: string;
    subject: string;
    book?: string;
    term?: number;
    coverage_percent?: number;
}

interface HealthRecordRow {
    record_date?: string;
    blood_group?: string;
    height_cm?: number;
    weight_kg?: number;
    blood_pressure?: string;
    pulse?: string;
    allergies?: string;
    medical_conditions?: string;
    medications?: string;
    remarks?: string;
}

interface LiveClassRow {
    title: string;
    subject: string;
    provider: string;
    starts_at?: string;
    ends_at?: string;
    status: string;
    notes?: string;
}

interface ParentPortalProps {
    user: any;
    organization: { id: string; name: string; logo?: string };
    activeSession: string;
    children: Child[];
    selectedStudentId: string;
    tabs: {
        calendar: CalendarEvent[];
        timetable: TimetableEntry[];
        attendance: { summary: AttendanceSummary; records: AttendanceRecord[] };
        exams: ExamResultRow[];
        ptm: PtmRow[];
        osm: AssessmentRow[];
        classwork: ClassworkRow[];
        transactions: PaymentRow[];
        messages: MessageRow[];
        transport: TransportInfo;
        library: LibraryBook[];
        visits: VisitRow[];
        studyCenter: StudyCenterRow[];
        health: HealthRecordRow[];
        liveClasses: LiveClassRow[];
    };
}

const statusLabel: Record<string, string> = {
    present: 'present',
    absent: 'absent',
    late: 'late',
    half_day: 'half day',
    leave: 'leave',
    pending: 'pending',
    submitted: 'submitted',
    evaluated: 'evaluated',
    booked: 'booked',
    checked_in: 'checked in',
    completed: 'completed',
    scheduled: 'scheduled',
    cancelled: 'cancelled',
    success: 'success',
    active: 'active',
    inactive: 'inactive',
};

const statusTone: Record<string, string> = {
    present: 'bg-green-100 text-green-800',
    submitted: 'bg-green-100 text-green-800',
    evaluated: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    booked: 'bg-amber-100 text-amber-800',
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    pending: 'bg-amber-100 text-amber-800',
    late: 'bg-orange-100 text-orange-800',
    half_day: 'bg-orange-100 text-orange-800',
    leave: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
    inactive: 'bg-gray-100 text-gray-600',
};

function StatusBadge({ value }: { value: string }) {
    return <Badge className={statusTone[value] ?? 'bg-gray-100 text-gray-800'}>{statusLabel[value] ?? value}</Badge>;
}

function EmptyRow({ label }: { label: string }) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{label}</div>;
}

export default function ParentPortal({
    user,
    organization,
    activeSession,
    children,
    selectedStudentId,
    tabs,
}: ParentPortalProps) {
    const { t } = useLanguage();
    const page = usePage<{ url: string }>();
    const urlTab = new URLSearchParams(page.url.split('?')[1] ?? '').get('tab');
    const [activeTab, setActiveTab] = useState<string>(() =>
        urlTab &&
        [
            'calendar',
            'timetable',
            'attendance',
            'exams',
            'ptm',
            'osm',
            'classwork',
            'transactions',
            'sms',
            'whatsapp',
            'email',
            'transport',
            'library',
            'visits',
            'study-center',
            'health',
            'live-classes',
            'assistant',
        ].includes(urlTab)
            ? urlTab
            : 'calendar',
    );

    const switchChild = (childId: string) => {
        if (!childId) return;
        router.get(
            '/parent-portal',
            { student: childId, tab: activeTab },
            { preserveState: true, preserveScroll: true },
        );
    };

    const tabItems = [
        { value: 'calendar', label: t('Calendar'), icon: CalendarDays },
        { value: 'timetable', label: t('Timetable'), icon: Clock3 },
        { value: 'attendance', label: t('Attendance'), icon: ClipboardCheck },
        { value: 'exams', label: t('Exams & Reports'), icon: GraduationCap },
        { value: 'ptm', label: t('Meetings'), icon: Handshake },
        { value: 'osm', label: t('Evaluated Papers'), icon: PenLine },
        { value: 'classwork', label: t('Classwork & Logbook'), icon: CalendarHeart },
        { value: 'transactions', label: t('Transactions'), icon: ArrowLeftRight },
        { value: 'sms', label: t('SMS'), icon: MessageSquare },
        { value: 'whatsapp', label: t('WhatsApp'), icon: Send },
        { value: 'email', label: t('Email'), icon: Mail },
        { value: 'transport', label: t('Transport'), icon: BusFront },
        { value: 'library', label: t('Library'), icon: Library },
        { value: 'visits', label: t('School Visit'), icon: CalendarCheck },
        { value: 'study-center', label: t('Syllabus & Materials'), icon: FolderOpen },
        { value: 'health', label: t('Health Records'), icon: HeartPulse },
        { value: 'live-classes', label: t('Live Classes'), icon: Video },
        { value: 'assistant', label: t('AI Assistant'), icon: Bot },
    ];

    const activeChild = children.find((child) => child.id === selectedStudentId) ?? children[0];

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">{t('Parent Portal')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {organization.name} · {activeSession}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {activeChild && (
                            <Badge className="bg-primary/10 text-primary">
                                {t('Viewing:')} {activeChild.name}
                            </Badge>
                        )}
                        {children.length > 1 && (
                            <Select value={selectedStudentId} onValueChange={switchChild}>
                                <SelectTrigger className="w-52">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {children.map((child) => (
                                        <SelectItem key={child.id} value={child.id}>
                                            {child.name} · {child.className} {child.section}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="flex-wrap">
                        {tabItems.map((item) => (
                            <TabsTrigger key={item.value} value={item.value}>
                                <item.icon className="mr-1.5 h-4 w-4" />
                                {item.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="calendar" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Calendar')}</CardTitle>
                                <CardDescription>{t('School events and holidays')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {tabs.calendar.length === 0 ? (
                                    <EmptyRow label={t('No events scheduled yet')} />
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {tabs.calendar.map((event, index) => (
                                            <div
                                                key={index}
                                                className="flex items-start gap-3 rounded-lg border p-3"
                                                style={{
                                                    borderLeftColor: event.color ?? '#3b82f6',
                                                    borderLeftWidth: 4,
                                                }}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium">{event.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {event.start_date}
                                                        <span className="mx-1">·</span>
                                                        {event.type}
                                                        {event.start_time ? <span className="mx-1">·</span> : null}
                                                        {event.start_time}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap gap-2">
                                                        {event.is_holiday && <StatusBadge value="holiday" />}
                                                        {event.location ? (
                                                            <span className="text-xs text-muted-foreground">
                                                                {event.location}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="timetable" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Timetable')}</CardTitle>
                                <CardDescription>
                                    {activeChild
                                        ? `${activeChild.name} · ${activeChild.className} ${activeChild.section}`
                                        : ''}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {tabs.timetable.length === 0 ? (
                                    <EmptyRow label={t('No timetable entries yet')} />
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Day')}</TableHead>
                                                <TableHead>{t('Subject')}</TableHead>
                                                <TableHead>{t('Time')}</TableHead>
                                                <TableHead>{t('Room')}</TableHead>
                                                <TableHead>{t('Teacher')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tabs.timetable.map((entry, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="capitalize">{entry.day}</TableCell>
                                                    <TableCell className="font-medium">{entry.subject}</TableCell>
                                                    <TableCell>
                                                        {entry.start_time && entry.end_time
                                                            ? `${entry.start_time} - ${entry.end_time}`
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>{entry.room_number ?? '-'}</TableCell>
                                                    <TableCell>{entry.teacher}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="attendance" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-3xl">{tabs.attendance.summary.attendedDays}</CardTitle>
                                    <CardDescription>{t('Days attended')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-3xl text-red-600">
                                        {tabs.attendance.summary.absent}
                                    </CardTitle>
                                    <CardDescription>{t('Absent days')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-3xl">{tabs.attendance.summary.leave}</CardTitle>
                                    <CardDescription>{t('Leaves')}</CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Attendance')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {tabs.attendance.records.length === 0 ? (
                                    <EmptyRow label={t('No attendance records yet')} />
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Date')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                                <TableHead>{t('Remarks')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tabs.attendance.records.map((record, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{record.date}</TableCell>
                                                    <TableCell>
                                                        <StatusBadge value={record.status} />
                                                    </TableCell>
                                                    <TableCell>{record.remarks ?? '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="exams" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Exams & Reports')}</CardTitle>
                                <CardDescription>{activeChild ? activeChild.name : ''}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {tabs.exams.length === 0 ? (
                                    <EmptyRow label={t('No exam results yet')} />
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Exam')}</TableHead>
                                                <TableHead>{t('Subject')}</TableHead>
                                                <TableHead>{t('Date')}</TableHead>
                                                <TableHead>{t('Marks')}</TableHead>
                                                <TableHead>{t('Grade')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tabs.exams.map((result, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{result.exam}</TableCell>
                                                    <TableCell>{result.subject}</TableCell>
                                                    <TableCell>{result.exam_date ?? '-'}</TableCell>
                                                    <TableCell>
                                                        {result.is_absent ? (
                                                            <StatusBadge value="absent" />
                                                        ) : (
                                                            `${result.obtained_marks} / ${result.total_marks}`
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{result.grade ?? '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="ptm" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Meetings')}</CardTitle>
                                <CardDescription>{t('Parent-teacher meetings')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {tabs.ptm.length === 0 ? (
                                    <EmptyRow label={t('No meetings scheduled yet')} />
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {tabs.ptm.map((session, index) => (
                                            <div key={index} className="rounded-lg border p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-medium">{session.title}</p>
                                                    <StatusBadge value={session.status} />
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {session.date}
                                                    {session.start_time ? <span className="mx-1">·</span> : null}
                                                    {session.start_time}
                                                    {session.location ? <span className="mx-1">·</span> : null}
                                                    {session.location}
                                                </p>
                                                {session.appointment ? (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <StatusBadge value={session.appointment.status} />
                                                        {session.appointment.slot_time ? (
                                                            <span className="text-xs text-muted-foreground">
                                                                {session.appointment.slot_time}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        {t('No slot booked yet')}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="osm" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Evaluated Papers')}</CardTitle>
                                <CardDescription>{t('Assessments for the class')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {tabs.osm.length === 0 ? (
                                    <EmptyRow label={t('No assessments yet')} />
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {tabs.osm.map((assessment, index) => {
                                            const { t } = useLanguage();
                                            return (
                                                <div key={index} className="rounded-lg border p-3">
                                                    <p className="font-medium">{assessment.name}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {assessment.assessment_type ?? '-'}
                                                        {assessment.term ? <span className="mx-1">·</span> : null}
                                                        {assessment.term}
                                                        {assessment.start_date ? <span className="mx-1">·</span> : null}
                                                        {assessment.start_date}
                                                    </p>
                                                    <p className="mt-2 text-sm">
                                                        {assessment.total_marks
                                                            ? `${assessment.total_marks} marks`
                                                            : ''}
                                                        {assessment.weightage ? (
                                                            <span className="ml-2 text-xs text-muted-foreground">
                                                                {t('weightage')}
                                                                {assessment.weightage}%
                                                            </span>
                                                        ) : null}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="classwork" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Classwork & Logbook')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {tabs.classwork.length === 0 ? (
                                    <EmptyRow label={t('No assignments yet')} />
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {tabs.classwork.map((entry, index) => (
                                            <div key={index} className="rounded-lg border p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-medium">{entry.title}</p>
                                                    <StatusBadge value={entry.status} />
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {entry.subject}
                                                    <span className="mx-1">·</span>
                                                    {entry.assign_date}
                                                    {entry.due_date ? <span className="mx-1">→</span> : null}
                                                    {entry.due_date}
                                                </p>
                                                <p className="mt-2 line-clamp-2 text-sm">{entry.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="transactions" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Transactions')}</CardTitle>
                                <CardDescription>{activeChild ? activeChild.name : ''}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {tabs.transactions.length === 0 ? (
                                    <EmptyRow label={t('No fee transactions yet')} />
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Receipt')}</TableHead>
                                                <TableHead>{t('Date')}</TableHead>
                                                <TableHead>{t('Amount')}</TableHead>
                                                <TableHead>{t('Method')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tabs.transactions.map((payment, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-mono text-xs">
                                                        {payment.receipt_number}
                                                    </TableCell>
                                                    <TableCell>{payment.payment_date}</TableCell>
                                                    <TableCell className="font-medium">₹{payment.amount}</TableCell>
                                                    <TableCell className="capitalize">
                                                        {payment.payment_method}
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge value={payment.status} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sms" className="space-y-4">
                        <MessagesPanel messages={tabs.messages} channel="sms" t={t} />
                    </TabsContent>

                    <TabsContent value="whatsapp" className="space-y-4">
                        <MessagesPanel messages={tabs.messages} channel="whatsapp" t={t} />
                    </TabsContent>

                    <TabsContent value="email" className="space-y-4">
                        <MessagesPanel messages={tabs.messages} channel="email" t={t} />
                    </TabsContent>

                    <TabsContent value="transport" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Transport')}</CardTitle>
                                    <CardDescription>{activeChild ? activeChild.name : ''}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <BusFront className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{t('Route')}:</span>
                                        <span>{tabs.transport.route ?? t('Not assigned')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <History className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{t('Vehicle')}:</span>
                                        <span>{tabs.transport.vehicle ?? '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <PenLine className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{t('Pickup point')}:</span>
                                        <span>{tabs.transport.pickup_point ?? '-'}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Routes')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {tabs.transport.routes.length === 0 ? (
                                        <EmptyRow label={t('No routes available')} />
                                    ) : (
                                        <div className="space-y-2">
                                            {tabs.transport.routes.map((route, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between rounded-lg border p-2 text-sm"
                                                >
                                                    <div>
                                                        <p className="font-medium">{route.name}</p>
                                                        {route.description ? (
                                                            <p className="text-xs text-muted-foreground">
                                                                {route.description}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <StatusBadge value={route.status} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="library" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Library')}</CardTitle>
                                <CardDescription>{t('Available books')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {tabs.library.length === 0 ? (
                                    <EmptyRow label={t('No books listed yet')} />
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {tabs.library.map((book, index) => {
                                            const { t } = useLanguage();
                                            return (
                                                <div key={index} className="rounded-lg border p-3">
                                                    <p className="font-medium">{book.title}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {book.author}
                                                        <span className="mx-1">·</span>
                                                        {book.category}
                                                        <span className="mx-1">·</span>
                                                        {book.language}
                                                    </p>
                                                    <p className="mt-2 text-xs">
                                                        {t('Copies available')}: {book.available_copies}
                                                        {book.rack_number ? (
                                                            <span className="ml-2 text-muted-foreground">
                                                                {t('rack')}
                                                                {book.rack_number}
                                                            </span>
                                                        ) : null}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="visits" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('School Visit')}</CardTitle>
                                <CardDescription>{t('Upcoming events and visits')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {tabs.visits.length === 0 ? (
                                    <EmptyRow label={t('No upcoming visits')} />
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {tabs.visits.map((visit, index) => (
                                            <div key={index} className="rounded-lg border p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-medium">{visit.title}</p>
                                                    <StatusBadge value={visit.type} />
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {visit.start_date}
                                                    {visit.start_time ? <span className="mx-1">·</span> : null}
                                                    {visit.start_time}
                                                    {visit.location ? <span className="mx-1">·</span> : null}
                                                    {visit.location}
                                                </p>
                                                {visit.description ? (
                                                    <p className="mt-2 line-clamp-2 text-sm">{visit.description}</p>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="study-center" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Syllabus & Materials')}</CardTitle>
                                <CardDescription>
                                    {activeChild
                                        ? `${activeChild.name} · ${activeChild.className} ${activeChild.section}`
                                        : ''}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {tabs.studyCenter.length === 0 ? (
                                    <EmptyRow label={t('No syllabus units yet')} />
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {tabs.studyCenter.map((unit, index) => (
                                            <div key={index} className="rounded-lg border p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-medium">{unit.title}</p>
                                                    <Badge>{unit.subject}</Badge>
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {unit.book ? unit.book : ''}
                                                    {unit.term ? <span className="mx-1">·</span> : null}
                                                    {unit.term ? `Term ${unit.term}` : ''}
                                                    {unit.coverage_percent !== undefined ? (
                                                        <span className="mx-1">·</span>
                                                    ) : null}
                                                    {unit.coverage_percent !== undefined
                                                        ? `${unit.coverage_percent}% covered`
                                                        : ''}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="health" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Health Records')}</CardTitle>
                                <CardDescription>{activeChild ? activeChild.name : ''}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {tabs.health.length === 0 ? (
                                    <EmptyRow label={t('No health records yet')} />
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {tabs.health.map((record, index) => (
                                            <div key={index} className="rounded-lg border p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-medium">{record.record_date}</p>
                                                    {record.blood_group ? <Badge>{record.blood_group}</Badge> : null}
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {record.height_cm ? `Height: ${record.height_cm} cm` : ''}
                                                    {record.weight_kg ? <span className="mx-1">·</span> : null}
                                                    {record.weight_kg ? `Weight: ${record.weight_kg} kg` : ''}
                                                    {record.blood_pressure ? <span className="mx-1">·</span> : null}
                                                    {record.blood_pressure ? `BP: ${record.blood_pressure}` : ''}
                                                    {record.pulse ? <span className="mx-1">·</span> : null}
                                                    {record.pulse ? `Pulse: ${record.pulse}` : ''}
                                                </p>
                                                {record.allergies ? (
                                                    <p className="mt-2 text-sm">
                                                        <span className="font-medium">{t('Allergies')}: </span>
                                                        {record.allergies}
                                                    </p>
                                                ) : null}
                                                {record.medical_conditions ? (
                                                    <p className="mt-1 text-sm">
                                                        <span className="font-medium">{t('Conditions')}: </span>
                                                        {record.medical_conditions}
                                                    </p>
                                                ) : null}
                                                {record.medications ? (
                                                    <p className="mt-1 text-sm">
                                                        <span className="font-medium">{t('Medications')}: </span>
                                                        {record.medications}
                                                    </p>
                                                ) : null}
                                                {record.remarks ? (
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {record.remarks}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="live-classes" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Live Classes')}</CardTitle>
                                <CardDescription>{t('Upcoming and past online classes')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {tabs.liveClasses.length === 0 ? (
                                    <EmptyRow label={t('No online classes yet')} />
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {tabs.liveClasses.map((liveClass, index) => (
                                            <div key={index} className="rounded-lg border p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-medium">{liveClass.title}</p>
                                                    <StatusBadge value={liveClass.status} />
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {liveClass.subject}
                                                    <span className="mx-1">·</span>
                                                    {liveClass.provider}
                                                    <span className="mx-1">·</span>
                                                    {liveClass.starts_at}
                                                </p>
                                                {liveClass.notes ? (
                                                    <p className="mt-2 line-clamp-2 text-sm">{liveClass.notes}</p>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="assistant" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('AI Assistant')}</CardTitle>
                                    <CardDescription>{t('Quick answers and school contacts')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex items-start gap-2">
                                        <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                                        <p>
                                            {t(
                                                'Use the Parent Portal sections to view fees, attendance, timetable and more for your ward.',
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <UserRound className="mt-0.5 h-4 w-4 text-primary" />
                                        <p>
                                            {organization.name} · {activeSession}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <FileClock className="mt-0.5 h-4 w-4 text-primary" />
                                        <p>{t('Fee receipts and payment history are available under Transactions.')}</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Image className="mt-0.5 h-4 w-4 text-primary" />
                                        <p>
                                            {t(
                                                'School photos and documents are available under Gallery and Documents.',
                                            )}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Quick Links')}</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-2 sm:grid-cols-2">
                                    <QuickLink href="/fees" label={t('Fee Payments')} icon={IndianRupee} />
                                    <QuickLink
                                        href="/student-health"
                                        label={t('Health Records')}
                                        icon={ClipboardCheck}
                                    />

                                    <QuickLink href="/my-hostel" label={t('Hostel')} icon={FolderOpen} />
                                    <QuickLink
                                        href="/my-certificates"
                                        label={t('My Certificates')}
                                        icon={GraduationCap}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}

function MessagesPanel({
    messages,
    channel,
    t,
}: {
    messages: MessageRow[];
    channel: string;
    t: (key: string) => string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t(channel === 'whatsapp' ? 'WhatsApp' : channel === 'email' ? 'Email' : 'SMS')}</CardTitle>
                <CardDescription>{t('Messages from the school')}</CardDescription>
            </CardHeader>
            <CardContent>
                {messages.length === 0 ? (
                    <EmptyRow label={t('No messages yet')} />
                ) : (
                    <div className="space-y-3">
                        {messages.map((message, index) => (
                            <div key={index} className="rounded-lg border p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium">{message.subject}</p>
                                    <span className="flex items-center gap-2">
                                        {message.is_announcement ? <StatusBadge value="announcement" /> : null}
                                        <span className="text-xs text-muted-foreground">{message.created_at}</span>
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{message.sender}</p>
                                <p className="mt-2 line-clamp-2 text-sm">{message.message}</p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
    return (
        <a
            href={href}
            className="flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors hover:bg-accent"
        >
            <Icon className="h-4 w-4 text-muted-foreground" />
            {label}
        </a>
    );
}
