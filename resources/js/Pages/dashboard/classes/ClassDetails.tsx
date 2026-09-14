import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useLanguage } from '../../../i18n/LanguageProvider';
import {
    ArrowLeft,
    BookOpen,
    Building2,
    CalendarDays,
    DoorOpen,
    GraduationCap,
    LayoutDashboard,
    Users,
} from 'lucide-react';
import DashboardLayout from '../../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '../../ui/breadcrumb';
import { InfoRow, OpenPageButton, StatChip } from '../../ui/hub';

interface ClassDetailsProps {
    user: any;
    classId: string;
    classInfo?: any | null;
    hub?: {
        subjects?: {
            id: string;
            name: string;
            code?: string | null;
            teacher_id?: string | null;
            teacher_name?: string | null;
        }[];
        timetable?: {
            id: string;
            classId: string;
            day: string;
            periodId: string;
            subject: string;
            subjectId: string;
            teacherId: string;
            teacherName: string;
            room: string;
            startTime: string;
            endTime: string;
        }[];
    };
}

export default function ClassDetails({ user, classId, classInfo, hub }: ClassDetailsProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { staffPermissions } = props as any;

    const isManagedStaffRole = ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'].includes(user?.role);
    const can = (feature: string) => !isManagedStaffRole || Boolean(staffPermissions?.[feature]?.view);

    const subjects = hub?.subjects || [];
    const timetable = hub?.timetable || [];

    const capacity = classInfo?.capacity ? Number(classInfo.capacity) : 0;
    const capacityPct = capacity > 0 ? Math.round(((classInfo?.student_count ?? 0) / capacity) * 100) : 0;

    const hubTabs = [
        { id: 'overview', label: t('Overview'), icon: LayoutDashboard, enabled: true },
        { id: 'subjects', label: t('Subjects'), icon: BookOpen, enabled: true },
        { id: 'timetable', label: t('Timetable'), icon: CalendarDays, enabled: can('Class Time Table') },
        { id: 'students', label: t('Students'), icon: Users, enabled: true },
    ].filter((tab) => tab.enabled);

    if (!classInfo) {
        return (
            <DashboardLayout user={user} activeTab="classes">
                <div className="min-h-full bg-slate-50 p-8">
                    <div className="mx-auto max-w-5xl space-y-6">
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/classes">
                                <ArrowLeft className="h-4 w-4" />
                                {t('Back to Classes')}
                            </Link>
                        </Button>
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-lg font-semibold text-slate-900">{t('Class not found')}</p>
                                <p className="mt-2 text-sm text-slate-500">
                                    {t('The requested class could not be loaded.')}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={user} activeTab="classes">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <Button asChild variant="outline" className="mb-4 gap-2">
                                <Link href="/classes">
                                    <ArrowLeft className="h-4 w-4" />
                                    {t('Back to Classes')}
                                </Link>
                            </Button>
                            <Breadcrumb className="mb-2">
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink asChild>
                                            <Link href="/classes">{t('Classes')}</Link>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>
                                            {classInfo.name}
                                            {classInfo.section ? ` - ${classInfo.section}` : ''}
                                        </BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                            <h1 className="text-3xl font-bold text-slate-900">
                                {classInfo.name}
                                {classInfo.section ? ` - ${classInfo.section}` : ''}
                            </h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {classInfo.teacher_name
                                    ? `${t('Class Teacher')}: ${classInfo.teacher_name}`
                                    : t('No class teacher assigned yet.')}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {classInfo.student_count > 0 && (
                                <Badge variant="outline" className="px-3 py-1 text-sm">
                                    {classInfo.student_count}
                                    {t(' Students')}
                                </Badge>
                            )}
                            {classInfo.status === 'inactive' ? (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{t('Inactive')}</Badge>
                            ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{t('Active')}</Badge>
                            )}
                        </div>
                    </div>

                    <Tabs defaultValue="overview">
                        <div className="overflow-x-auto">
                            <TabsList className="h-10">
                                {hubTabs.map((tab) => (
                                    <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 px-3">
                                        <tab.icon className="h-4 w-4" />
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <TabsContent value="overview" className="m-0 space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <StatChip label={t('Students Enrolled')} value={classInfo.student_count ?? 0} />
                                <StatChip label={t('Subjects')} value={subjects.length} />
                                <StatChip label={t('Timetable Entries')} value={timetable.length} tone={timetable.length ? 'success' : 'default'} />
                                <StatChip label={t('Capacity Utilisation')} value={capacityPct > 0 ? `${capacityPct}%` : '-'} tone={capacityPct >= 100 ? 'danger' : 'default'} />
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Class Information')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <InfoRow icon={GraduationCap} label={t('Class & Section')} value={`${classInfo.name}${classInfo.section ? ` - ${classInfo.section}` : ''}`} />
                                    <InfoRow icon={DoorOpen} label={t('Room')} value={classInfo.room_number} />
                                    <InfoRow icon={Users} label={t('Capacity')} value={classInfo.capacity ?? '-'} />
                                    <InfoRow icon={Building2} label={t('Academic Year')} value={classInfo.academic_year} />
                                    <InfoRow icon={Users} label={t('Class Teacher')} value={classInfo.teacher_name} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="subjects" className="m-0 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookOpen className="h-5 w-5 text-blue-600" />
                                        {t('Subjects')}
                                        <Badge variant="outline">{subjects.length}</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {subjects.length === 0 ? (
                                        <p className="text-sm text-slate-500">{t('No subjects assigned to this class yet.')}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {subjects.map((subject) => (
                                                <div
                                                    key={subject.id}
                                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                                                >
                                                    <div>
                                                        <p className="font-medium text-slate-900">{subject.name}</p>
                                                        <p className="text-sm text-slate-500">
                                                            {subject.code || '-'}
                                                            {subject.teacher_name ? ` · ${subject.teacher_name}` : ''}
                                                        </p>
                                                    </div>
                                                    {subject.teacher_name ? (
                                                        <Badge variant="outline">{subject.teacher_name}</Badge>
                                                    ) : (
                                                        <Badge variant="outline">{t('No Teacher')}</Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <OpenPageButton href="/class-time-table" label={t('Open Class Time Table')} />
                        </TabsContent>

                        {can('Class Time Table') && (
                            <TabsContent value="timetable" className="m-0 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CalendarDays className="h-5 w-5 text-blue-600" />
                                            {t('Class Timetable')}
                                            <Badge variant="outline">{timetable.length}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {timetable.length === 0 ? (
                                            <p className="text-sm text-slate-500">{t('No timetable entries for this class yet.')}</p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b text-left text-slate-500">
                                                            <th className="py-2 pr-4 font-medium">{t('Day')}</th>
                                                            <th className="py-2 pr-4 font-medium">{t('Period')}</th>
                                                            <th className="py-2 pr-4 font-medium">{t('Subject')}</th>
                                                            <th className="py-2 pr-4 font-medium">{t('Teacher')}</th>
                                                            <th className="py-2 font-medium">{t('Time')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {timetable.map((entry) => (
                                                            <tr key={entry.id} className="border-b last:border-0">
                                                                <td className="py-2 pr-4 capitalize">{entry.day}</td>
                                                                <td className="py-2 pr-4">{entry.periodId || '-'}</td>
                                                                <td className="py-2 pr-4 font-medium text-slate-900">{entry.subject}</td>
                                                                <td className="py-2 pr-4 text-slate-600">{entry.teacherName}</td>
                                                                <td className="py-2 text-slate-600">
                                                                    {entry.startTime} – {entry.endTime}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                                <OpenPageButton href="/class-time-table" label={t('Open Class Time Table')} />
                            </TabsContent>
                        )}

                        <TabsContent value="students" className="m-0 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-blue-600" />
                                        {t('Students Enrolled')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        <StatChip label={t('Active Students')} value={classInfo.student_count ?? 0} tone="success" />
                                        <StatChip label={t('Capacity')} value={classInfo.capacity ?? '-'} />
                                        <StatChip label={t('Capacity Utilisation')} value={capacityPct > 0 ? `${capacityPct}%` : '-'} tone={capacityPct >= 100 ? 'danger' : 'default'} />
                                    </div>
<p className="mt-4 text-sm text-slate-500">
        {t('Manage the full student list for this class from the search.')}
    </p>
                                </CardContent>
                            </Card>
                            <OpenPageButton href="/search_students" label={t('Open Search Students')} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </DashboardLayout>
    );
}