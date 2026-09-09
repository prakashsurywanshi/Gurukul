import { useLanguage } from '../../i18n/LanguageProvider';
import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    BellRing,
    Book,
    CalendarDays,
    ClipboardCheck,
    IndianRupee,
    FileBadge2,
    FileText,
    MessageSquare,
    School,
    TrendingDown,
    UserPlus,
    Users,
} from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { NoticeBoardPanel, NoticeBoardPreviewAction, type Notice } from './notice-board/NoticeBoardPanel';

interface DashboardHomeProps {
    user: any;
    dashboardType?: 'admin' | 'student';
    activeSession?: string | null;
    organization?: {
        id: number;
        name: string;
        logo?: string | null;
    } | null;
    stats: any;
    studentRecord?: {
        id: string;
        name: string;
        admissionNo: string;
        rollNumber: string;
        className: string;
        section: string;
    } | null;
    notices?: Notice[];
}

const adminQuickActions = [
    {
        label: 'Student Management',
        description: 'Review admissions, student profiles, and recent enrollments.',
        route: '/search_students',
        color: 'bg-sky-50 text-sky-900 border-sky-200',
    },
    {
        label: 'Fee Collection',
        description: 'Track pending dues and collect school fees.',
        route: '/fees',
        color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    },
    {
        label: 'Attendance',
        description: 'Mark class attendance and monitor daily presence.',
        route: '/attendance',
        color: 'bg-blue-50 text-blue-900 border-blue-200',
    },
    {
        label: 'Online Exams',
        description: 'Create, monitor, and review online examinations.',
        route: '/online-exams',
        color: 'bg-rose-50 text-rose-900 border-rose-200',
    },
];

const studentQuickActions = [
    {
        label: 'My Fees',
        description: 'Review paid and pending fee records.',
        route: '/fees',
        color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    },
    {
        label: 'Homework',
        description: 'Check assignments and submit pending work.',
        route: '/homework',
        color: 'bg-sky-50 text-sky-900 border-sky-200',
    },
    {
        label: 'Online Exams',
        description: 'Open your upcoming online tests and results.',
        route: '/online-exams',
        color: 'bg-rose-50 text-rose-900 border-rose-200',
    },
    {
        label: 'Certificates',
        description: 'Download your issued certificates and IDs.',
        route: '/my-certificates',
        color: 'bg-violet-50 text-violet-900 border-violet-200',
    },
];

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount || 0);

export function DashboardHome({
    user,
    dashboardType = 'admin',
    activeSession = null,
    organization,
    stats,
    studentRecord = null,
    notices = [],
}: DashboardHomeProps) {
    const { t } = useLanguage();
    const isStudent = dashboardType === 'student' || user.role === 'student';

    return (
        <DashboardLayout user={user} activeTab="dashboard" onLogout={() => {}}>
            <div className="space-y-6 bg-slate-50/70 p-4 sm:p-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col items-start gap-4">
                        <div className="max-w-3xl text-left">
                            <p className="text-sm font-medium text-slate-500">
                                {organization?.name || t('School Dashboard')}
                            </p>
                            <h1 className="mt-1 text-3xl font-bold text-slate-900">
                                {isStudent
                                    ? `Welcome back, ${studentRecord?.name || user.name}`
                                    : t('Welcome back, {user.name}', { 'user.name': user.name })}
                            </h1>
                            <p className="mt-2 text-sm text-slate-500">
                                {isStudent
                                    ? `${studentRecord?.className || '-'} / Section ${studentRecord?.section || '-'}`
                                    : t(
                                          'A live operational snapshot of students, academics, fees, and campus activity for the selected session.',
                                      )}
                            </p>
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                                <span className="uppercase tracking-[0.18em] text-slate-400">
                                    {t('Current Session')}
                                </span>
                                <span>{activeSession || t('Not set')}</span>
                            </div>
                        </div>

                        {isStudent && studentRecord ? (
                            <div className="grid w-full gap-3 sm:max-w-md sm:grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                        {t('Admission No')}
                                    </p>
                                    <p className="mt-2 font-semibold text-slate-900">
                                        {studentRecord.admissionNo || t('N/A')}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                        {t('Roll Number')}
                                    </p>
                                    <p className="mt-2 font-semibold text-slate-900">
                                        {studentRecord.rollNumber || t('N/A')}
                                    </p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                {isStudent ? (
                    <StudentDashboard stats={stats} notices={notices} />
                ) : (
                    <AdminDashboard stats={stats} notices={notices} />
                )}
            </div>
        </DashboardLayout>
    );
}

function AdminDashboard({ stats, notices }: { stats: any; notices: Notice[] }) {
    const { t } = useLanguage();
    const cards = [
        {
            title: 'Students',
            value: stats?.students?.total || 0,
            helper: `${stats?.students?.active || 0} active learners`,
            icon: Users,
            color: 'bg-sky-600',
        },
        {
            title: 'Fee Collection',
            value: formatCurrency(stats?.fees?.collected || 0),
            helper: `${stats?.fees?.collectionRate || 0}% collected`,
            icon: IndianRupee,
            color: 'bg-emerald-600',
        },
        {
            title: 'Pending Dues',
            value: formatCurrency(stats?.fees?.pending || 0),
            helper: `${stats?.fees?.pendingCount || 0} pending fee records`,
            icon: TrendingDown,
            color: 'bg-blue-600',
        },
        {
            title: 'Today Attendance',
            value: `${stats?.attendance?.percentage || '0.00'}%`,
            helper: `${stats?.attendance?.today || 0} present, ${stats?.attendance?.absent_today || 0} absent`,
            icon: ClipboardCheck,
            color: 'bg-indigo-600',
        },
        {
            title: 'Library Alerts',
            value: stats?.library?.overdue || 0,
            helper: `${stats?.library?.issued || 0} books currently issued`,
            icon: Book,
            color: 'bg-fuchsia-600',
        },
        {
            title: 'Active Staff',
            value: stats?.staff?.active || 0,
            helper: `${stats?.classes?.total || 0} active classes`,
            icon: School,
            color: 'bg-rose-600',
        },
    ];

    return (
        <>
            <div className="grid gap-4 md:grid-cols-3">
                {cards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <Card
                            key={card.title}
                            className="border-slate-200 shadow-sm transition-transform hover:-translate-y-0.5"
                        >
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">{t(card.title)}</p>
                                        <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                                        <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
                                    </div>
                                    <div className={`${card.color} rounded-2xl p-3 text-white`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                        <div>
                            <CardTitle>{t('Quick Actions')}</CardTitle>
                            <CardDescription>{t('Jump into the core admin workflows.')}</CardDescription>
                        </div>
                        <BellRing className="h-5 w-5 text-slate-400" />
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                        {adminQuickActions.map((action) => (
                            <button
                                key={action.label}
                                type="button"
                                onClick={() => router.visit(action.route)}
                                className={`rounded-2xl border p-4 text-left transition hover:shadow-sm ${action.color}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">{t(action.label)}</p>
                                        <p className="mt-1 text-sm opacity-80">{t(action.description)}</p>
                                    </div>
                                    <ArrowRight className="mt-1 h-4 w-4 shrink-0" />
                                </div>
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>{t('Campus Snapshot')}</CardTitle>
                        <CardDescription>{t('Daily operations at a glance.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                    {t('Class Occupancy')}
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">
                                    {stats?.classes?.averageOccupancy || 0}%
                                </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                    {t('Unread Messages')}
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">
                                    {stats?.communication?.unread || 0}
                                </p>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">{t('Attendance Coverage')}</span>
                                <span className="text-sm text-slate-500">
                                    {stats?.attendance?.today || 0}/{stats?.attendance?.total_today || 0}
                                </span>
                            </div>
                            <div className="mt-3 h-2 rounded-full bg-slate-100">
                                <div
                                    className="h-2 rounded-full bg-sky-500"
                                    style={{
                                        width: `${Math.min(Number(stats?.attendance?.percentage || 0), 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>
                                    {stats?.fees?.pendingCount || 0}
                                    {t('fee records and')}
                                    {stats?.library?.overdue || 0}
                                    {t('overdue library issues still need follow-up.')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                <AdminListCard
                    title={t('Recent Admissions')}
                    description="Newest student entries in the system."
                    icon={UserPlus}
                    emptyLabel="No recent admissions available."
                    items={(stats?.students?.recentAdmissions || []).map((student: any) => (
                        <div key={student.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-slate-900">{student.name}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {student.className}
                                        {t('/ Section')}
                                        {student.section}
                                    </p>
                                </div>
                                <Badge variant="outline">{student.admissionDate}</Badge>
                            </div>
                        </div>
                    ))}
                />

                <AdminListCard
                    title={t('Fee Follow-ups')}
                    description="Highest-priority pending collections."
                    icon={TrendingDown}
                    emptyLabel="No pending fee follow-ups right now."
                    items={(stats?.fees?.followUps || []).map((fee: any) => (
                        <div key={fee.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-slate-900">{fee.studentName}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {fee.className}
                                        {t('/ Section')}
                                        {fee.section}
                                    </p>
                                </div>
                                <Badge variant={fee.status === 'partial' ? 'secondary' : 'outline'}>
                                    {t(fee.status)}
                                </Badge>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-sm">
                                <span className="text-slate-500">
                                    {t('Due by')}
                                    {fee.dueDate}
                                </span>
                                <span className="font-semibold text-slate-900">{formatCurrency(fee.dueAmount)}</span>
                            </div>
                        </div>
                    ))}
                />

                <AdminListCard
                    title={t('Upcoming Exams')}
                    description="Near-term exam schedule overview."
                    icon={CalendarDays}
                    emptyLabel="No upcoming exams scheduled."
                    items={(stats?.exams?.upcoming || []).map((exam: any) => (
                        <div key={exam.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-slate-900">{exam.name}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {exam.subject} • {exam.className}-{exam.section}
                                    </p>
                                </div>
                                <Badge variant="outline">{exam.examDate}</Badge>
                            </div>
                            <p className="mt-3 text-sm text-slate-500">
                                {t('Starts at {time}', {
                                    time: exam.startTime,
                                })}
                            </p>
                        </div>
                    ))}
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <AdminListCard
                    title={t('Library Alerts')}
                    description="Open issue records that may need attention."
                    icon={Book}
                    emptyLabel="No library alerts at the moment."
                    items={(stats?.library?.alerts || []).map((alert: any) => (
                        <div key={alert.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-slate-900">{alert.bookTitle}</p>
                                    <p className="mt-1 text-sm text-slate-500">{alert.studentName}</p>
                                </div>
                                <Badge variant={alert.status === 'overdue' ? 'destructive' : 'secondary'}>
                                    {t(alert.status)}
                                </Badge>
                            </div>
                            <p className="mt-3 text-sm text-slate-500">
                                {t('Due date: {date}', { date: alert.dueDate })}
                            </p>
                        </div>
                    ))}
                />

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t('Notice Board')}</CardTitle>
                            <CardDescription>{t('Latest school-wide announcements.')}</CardDescription>
                        </div>
                        <FileText className="h-5 w-5 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <NoticeBoardPanel notices={notices} singleColumn />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

function StudentDashboard({ stats, notices }: { stats: any; notices: Notice[] }) {
    const { t } = useLanguage();
    const cards = [
        {
            title: 'Attendance',
            value: `${stats?.overview?.attendancePercentage || '0.00'}%`,
            helper: `${stats?.attendance?.present || 0} present days out of ${stats?.attendance?.total || 0}`,
            icon: ClipboardCheck,
            color: 'bg-sky-600',
        },
        {
            title: 'Pending Fees',
            value: formatCurrency(stats?.overview?.pendingFees || 0),
            helper: `${stats?.fees?.pendingCount || 0} fee records pending`,
            icon: IndianRupee,
            color: 'bg-blue-600',
        },
        {
            title: 'Certificates',
            value: stats?.overview?.certificateCount || 0,
            helper: 'Issued certificates available in your portal',
            icon: FileBadge2,
            color: 'bg-violet-600',
        },
        {
            title: 'Homework',
            value: stats?.overview?.homeworkPending || 0,
            helper: 'Assignments still waiting for submission',
            icon: FileText,
            color: 'bg-emerald-600',
        },
        {
            title: 'Upcoming Exams',
            value: stats?.overview?.upcomingExamCount || 0,
            helper: 'Scheduled online exams ahead',
            icon: CalendarDays,
            color: 'bg-rose-600',
        },
        {
            title: 'Messages',
            value: stats?.overview?.unreadMessages || 0,
            helper: 'Unread communication items',
            icon: MessageSquare,
            color: 'bg-indigo-600',
        },
    ];

    return (
        <>
            <div className="grid gap-4 md:grid-cols-3">
                {cards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <Card
                            key={card.title}
                            className="border-slate-200 shadow-sm transition-transform hover:-translate-y-0.5"
                        >
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">{t(card.title)}</p>
                                        <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                                        <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
                                    </div>
                                    <div className={`${card.color} rounded-2xl p-3 text-white`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle>{t('Notice Board')}</CardTitle>
                        <CardDescription>{t('Latest student-facing announcements from the school.')}</CardDescription>
                    </div>
                    <NoticeBoardPreviewAction href="/communication/notice-board" />
                </CardHeader>
                <CardContent>
                    <NoticeBoardPanel notices={notices} />
                </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                        <div>
                            <CardTitle>{t('Quick Actions')}</CardTitle>
                            <CardDescription>{t('Open the tools you use most often.')}</CardDescription>
                        </div>
                        <BellRing className="h-5 w-5 text-slate-400" />
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                        {studentQuickActions.map((action) => (
                            <button
                                key={action.label}
                                type="button"
                                onClick={() => router.visit(action.route)}
                                className={`rounded-2xl border p-4 text-left transition hover:shadow-sm ${action.color}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">{t(action.label)}</p>
                                        <p className="mt-1 text-sm opacity-80">{t(action.description)}</p>
                                    </div>
                                    <ArrowRight className="mt-1 h-4 w-4 shrink-0" />
                                </div>
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>{t('My Summary')}</CardTitle>
                        <CardDescription>{t('Your academic and account status at a glance.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                    {t('Present Days')}
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">
                                    {stats?.attendance?.present || 0}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                    {t('Library Issues')}
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">
                                    {stats?.library?.issued || 0}
                                </p>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">{t('Attendance Progress')}</span>
                                <span className="text-sm text-slate-500">
                                    {stats?.attendance?.present || 0}/{stats?.attendance?.total || 0}
                                </span>
                            </div>
                            <div className="mt-3 h-2 rounded-full bg-slate-100">
                                <div
                                    className="h-2 rounded-full bg-sky-500"
                                    style={{
                                        width: `${Math.min(Number(stats?.attendance?.percentage || 0), 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>
                                    {stats?.fees?.pendingCount || 0}
                                    {t('fee item(s),')}
                                    {stats?.homework?.pendingCount || 0}
                                    {t('homework item(s), and')}
                                    {stats?.library?.overdue || 0}
                                    {t('overdue library issue(s) need attention.')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                <AdminListCard
                    title={t('Homework')}
                    description="Assignments for your class."
                    icon={FileText}
                    emptyLabel="No homework assigned yet."
                    items={(stats?.homework?.items || []).map((item: any) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-slate-900">{t(item.title)}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {item.subject} • {item.teacher}
                                    </p>
                                </div>
                                <Badge variant={item.status === 'submitted' ? 'secondary' : 'outline'}>
                                    {t(item.status)}
                                </Badge>
                            </div>
                            <p className="mt-3 text-sm text-slate-500">
                                {t('Due date: {date}', { date: item.dueDate })}
                            </p>
                        </div>
                    ))}
                />

                <AdminListCard
                    title={t('Upcoming Exams')}
                    description="Your scheduled online examinations."
                    icon={CalendarDays}
                    emptyLabel="No upcoming online exams found."
                    items={(stats?.exams?.upcoming || []).map((exam: any) => (
                        <div key={exam.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-slate-900">{t(exam.title)}</p>
                                    <p className="mt-1 text-sm text-slate-500">{exam.subject}</p>
                                </div>
                                <Badge variant="outline">
                                    {exam.duration}
                                    {t('mins')}
                                </Badge>
                            </div>
                            <p className="mt-3 text-sm text-slate-500">
                                {t('Starts at {time}', {
                                    time: exam.startTime,
                                })}
                            </p>
                        </div>
                    ))}
                />

                <AdminListCard
                    title={t('Library Desk')}
                    description="Books currently issued to you."
                    icon={Book}
                    emptyLabel="No library books are currently issued."
                    items={(stats?.library?.items || []).map((item: any) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-slate-900">{t(item.title)}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {t('Due date: {date}', {
                                            date: item.dueDate,
                                        })}
                                    </p>
                                </div>
                                <Badge variant={item.status === 'overdue' ? 'destructive' : 'secondary'}>
                                    {t(item.status)}
                                </Badge>
                            </div>
                        </div>
                    ))}
                />
            </div>
        </>
    );
}

function AdminListCard({
    title,
    description,
    icon: Icon,
    items,
    emptyLabel,
}: {
    title: string;
    description: string;
    icon: any;
    items: React.ReactNode[];
    emptyLabel: string;
}) {
    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                <Icon className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent className="space-y-3">
                {items.length > 0 ? items : <p className="text-sm text-slate-500">{emptyLabel}</p>}
            </CardContent>
        </Card>
    );
}

export default DashboardHome;
