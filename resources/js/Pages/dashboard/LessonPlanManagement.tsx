import { useLanguage } from '../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { BadgeCheck, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface LessonPlanManagementProps {
    user: any;
    classes?: ClassRecord[];
    teachers?: TeacherRecord[];
    entries?: TimeTableEntry[];
    lessonPlans?: LessonPlanEntry[];
    studentRecord?: StudentLessonRecord | null;
}

type LessonPlanStatus = 'planned' | 'in_progress' | 'completed' | 'carried_forward';

type ClassRecord = {
    id: string;
    name: string;
    section: string;
};

type TeacherRecord = {
    id: string;
    name: string;
};

type TimeTableEntry = {
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
};

type LessonPlanEntry = {
    id: string;
    timetableEntryId: string;
    classId: string;
    day: string;
    periodId: string;
    subject: string;
    teacherName: string;
    room: string;
    startTime: string;
    endTime: string;
    lessonDate: string;
    lessonTitle: string;
    topic: string;
    status: LessonPlanStatus;
    approvedBy: string | null;
    approvedByName: string | null;
    approvedAt: string | null;
};

type StudentLessonRecord = {
    id: string;
    classId: string;
    className: string;
    section: string;
    email: string;
};

const statusOptions: LessonPlanStatus[] = ['planned', 'in_progress', 'completed', 'carried_forward'];
const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyForm = {
    timetableEntryId: '',
    lessonDate: '',
    lessonTitle: '',
    topic: '',
    status: 'planned' as LessonPlanStatus,
};

export default function LessonPlanManagement({
    user,
    classes = [],
    teachers = [],
    entries = [],
    lessonPlans = [],
    studentRecord = null,
}: LessonPlanManagementProps) {
    const { t } = useLanguage();
    const page = usePage<{
        errors?: Record<string, string>;
        flash?: { success?: string; error?: string };
    }>();
    const isStudentView = user?.role === 'student';
    const isTeacherScopedView = user?.role === 'teacher';
    const isAdminView = user?.role === 'admin' || user?.role === 'super_admin';
    const currentTeacherId = String(user?.id ?? '');
    const [planningMode, setPlanningMode] = useState<'class' | 'teacher'>('class');
    const [selectedClassId, setSelectedClassId] = useState(studentRecord?.classId || classes[0]?.id || '');
    const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '');
    const [showPlanDialog, setShowPlanDialog] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [planForm, setPlanForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (page.props.flash?.success) {
            toast.success(page.props.flash.success);
        }
        if (page.props.flash?.error) {
            toast.error(page.props.flash.error);
        }
    }, [page.props.flash?.error, page.props.flash?.success]);

    useEffect(() => {
        if (isStudentView && studentRecord?.classId && selectedClassId !== studentRecord.classId) {
            setSelectedClassId(studentRecord.classId);
        }
    }, [isStudentView, selectedClassId, studentRecord]);

    useEffect(() => {
        if (!selectedClassId && classes.length > 0) {
            setSelectedClassId(classes[0].id);
        }
    }, [classes, selectedClassId]);

    useEffect(() => {
        if (!selectedTeacherId && teachers.length > 0) {
            setSelectedTeacherId(teachers[0].id);
        }
    }, [selectedTeacherId, teachers]);

    useEffect(() => {
        if (isTeacherScopedView) {
            setSelectedTeacherId(currentTeacherId);
        }
    }, [currentTeacherId, isTeacherScopedView]);

    const scopedTeachers = useMemo(
        () => (isTeacherScopedView ? teachers.filter((teacher) => teacher.id === currentTeacherId) : teachers),
        [currentTeacherId, isTeacherScopedView, teachers],
    );

    const scopedEntries = useMemo(
        () => (isTeacherScopedView ? entries.filter((entry) => entry.teacherId === currentTeacherId) : entries),
        [currentTeacherId, entries, isTeacherScopedView],
    );

    const scopedClassIds = useMemo(() => new Set(scopedEntries.map((entry) => entry.classId)), [scopedEntries]);

    const scopedClasses = useMemo(
        () => (isTeacherScopedView ? classes.filter((classItem) => scopedClassIds.has(classItem.id)) : classes),
        [classes, isTeacherScopedView, scopedClassIds],
    );

    useEffect(() => {
        if (!selectedClassId && scopedClasses.length > 0) {
            setSelectedClassId(scopedClasses[0].id);
        }
    }, [scopedClasses, selectedClassId]);

    useEffect(() => {
        if (
            isTeacherScopedView &&
            selectedClassId &&
            !scopedClasses.some((classItem) => classItem.id === selectedClassId)
        ) {
            setSelectedClassId(scopedClasses[0]?.id || '');
        }
    }, [isTeacherScopedView, scopedClasses, selectedClassId]);

    const selectedClass = useMemo(
        () => scopedClasses.find((classItem) => classItem.id === selectedClassId) || null,
        [scopedClasses, selectedClassId],
    );

    const selectedTeacher = useMemo(
        () => scopedTeachers.find((teacher) => teacher.id === selectedTeacherId) || null,
        [scopedTeachers, selectedTeacherId],
    );

    const filteredTimetableEntries = useMemo(() => {
        return scopedEntries
            .filter((entry) => {
                if (planningMode === 'teacher' && !isStudentView) {
                    return entry.teacherId === selectedTeacherId;
                }

                return entry.classId === selectedClassId;
            })
            .sort((left, right) => {
                const leftDayIndex = dayOrder.indexOf(left.day);
                const rightDayIndex = dayOrder.indexOf(right.day);

                if (leftDayIndex !== rightDayIndex) {
                    return leftDayIndex - rightDayIndex;
                }

                return left.startTime.localeCompare(right.startTime);
            });
    }, [isStudentView, planningMode, scopedEntries, selectedClassId, selectedTeacherId]);

    const visibleEntryIds = useMemo(
        () => new Set(filteredTimetableEntries.map((entry) => entry.id)),
        [filteredTimetableEntries],
    );

    const filteredLessonPlans = useMemo(() => {
        return lessonPlans
            .filter((plan) => visibleEntryIds.has(plan.timetableEntryId))
            .sort((left, right) => {
                const dateCompare = left.lessonDate.localeCompare(right.lessonDate);
                if (dateCompare !== 0) {
                    return dateCompare;
                }
                return left.startTime.localeCompare(right.startTime);
            });
    }, [lessonPlans, visibleEntryIds]);

    const weeklyTimetable = useMemo(() => {
        const periodMap = new Map<
            string,
            {
                periodId: string;
                startTime: string;
                endTime: string;
                slots: Record<string, TimeTableEntry | null>;
            }
        >();

        filteredTimetableEntries.forEach((entry) => {
            if (!periodMap.has(entry.periodId)) {
                periodMap.set(entry.periodId, {
                    periodId: entry.periodId,
                    startTime: entry.startTime,
                    endTime: entry.endTime,
                    slots: Object.fromEntries(dayOrder.map((day) => [day, null])) as Record<
                        string,
                        TimeTableEntry | null
                    >,
                });
            }

            const row = periodMap.get(entry.periodId);
            if (row) {
                row.slots[entry.day] = entry;
            }
        });

        return Array.from(periodMap.values()).sort((left, right) => left.startTime.localeCompare(right.startTime));
    }, [filteredTimetableEntries]);

    const lessonStats = useMemo(() => {
        const total = filteredLessonPlans.length;
        const completed = filteredLessonPlans.filter((plan) => plan.status === 'completed').length;
        const inProgress = filteredLessonPlans.filter((plan) => plan.status === 'in_progress').length;
        const carriedForward = filteredLessonPlans.filter((plan) => plan.status === 'carried_forward').length;
        return { total, completed, inProgress, carriedForward };
    }, [filteredLessonPlans]);

    const timetableEntryOptions = useMemo(
        () =>
            filteredTimetableEntries.map((entry) => ({
                ...entry,
                label: `${entry.day} | ${entry.startTime} - ${entry.endTime} | ${entry.subject} | ${entry.teacherName}`,
            })),
        [filteredTimetableEntries],
    );

    const getPlansForEntry = (timetableEntryId: string) =>
        filteredLessonPlans.filter((plan) => plan.timetableEntryId === timetableEntryId);

    const resetDialog = () => {
        setEditingPlanId(null);
        setPlanForm(emptyForm);
        setShowPlanDialog(false);
    };

    const openCreateDialog = (entry?: TimeTableEntry) => {
        setEditingPlanId(null);
        setPlanForm({
            timetableEntryId: entry?.id || filteredTimetableEntries[0]?.id || '',
            lessonDate: '',
            lessonTitle: '',
            topic: '',
            status: 'planned',
        });
        setShowPlanDialog(true);
    };

    const openEditDialog = (plan: LessonPlanEntry) => {
        setEditingPlanId(plan.id);
        setPlanForm({
            timetableEntryId: plan.timetableEntryId,
            lessonDate: plan.lessonDate,
            lessonTitle: plan.lessonTitle,
            topic: plan.topic,
            status: plan.status,
        });
        setShowPlanDialog(true);
    };

    const handleSavePlan = (event: React.FormEvent) => {
        event.preventDefault();

        if (
            !planForm.timetableEntryId ||
            !planForm.lessonDate ||
            !planForm.lessonTitle.trim() ||
            !planForm.topic.trim()
        ) {
            toast.error('Please add lesson date, lesson, and topic');
            return;
        }

        setSubmitting(true);

        const payload = {
            timetableEntryId: planForm.timetableEntryId,
            lessonDate: planForm.lessonDate,
            lessonTitle: planForm.lessonTitle.trim(),
            topic: planForm.topic.trim(),
            status: planForm.status,
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                resetDialog();
            },
            onError: () => {
                toast.error(editingPlanId ? 'Failed to update lesson plan' : 'Failed to create lesson plan');
            },
            onFinish: () => setSubmitting(false),
        };

        if (editingPlanId) {
            router.patch(`/lesson-plan/${editingPlanId}`, payload, options);
            return;
        }

        router.post('/lesson-plan', payload, options);
    };

    const handleDeletePlan = (planId: string) => {
        const confirmed = window.confirm('Delete this lesson plan?');
        if (!confirmed) {
            return;
        }

        router.delete(`/lesson-plan/${planId}`, {
            preserveScroll: true,
            onError: () => {
                toast.error('Failed to delete lesson plan');
            },
        });
    };

    const handleApprovePlan = (plan: LessonPlanEntry, approved: boolean) => {
        router.patch(
            `/lesson-plan/${plan.id}/approve`,
            { approved },
            {
                preserveScroll: true,
                onError: () => {
                    toast.error('Failed to update lesson plan approval');
                },
            },
        );
    };

    const canCreatePlan = filteredTimetableEntries.length > 0;

    return (
        <DashboardLayout user={user} activeTab="lesson-plan">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Lesson Plans')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {isStudentView
                                    ? t(
                                          'View the lesson plan for your class from the backend timetable and lesson records.',
                                      )
                                    : t(
                                          'Create and manage date-wise lesson plans from the real timetable and class schedule.',
                                      )}
                            </p>
                        </div>

                        {isStudentView ? (
                            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                {studentRecord ? (
                                    <span>
                                        {studentRecord.className}
                                        {t('- Section')}
                                        {studentRecord.section}
                                    </span>
                                ) : (
                                    <span>{t('Student class not found.')}</span>
                                )}
                            </div>
                        ) : (
                            <div className="flex w-full max-w-3xl flex-col gap-3 sm:flex-row">
                                <div className="w-full sm:w-44">
                                    <Select
                                        value={planningMode}
                                        onValueChange={(value) => setPlanningMode(value as 'class' | 'teacher')}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select view')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="class">{t('Class-wise')}</SelectItem>
                                            <SelectItem value="teacher">{t('Teacher-wise')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1">
                                    {planningMode === 'class' ? (
                                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select class and section')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {scopedClasses.map((classItem) => (
                                                    <SelectItem key={classItem.id} value={classItem.id}>
                                                        {classItem.name}
                                                        {t('- Section')}
                                                        {classItem.section}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select teacher')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {scopedTeachers.map((teacher) => (
                                                    <SelectItem key={teacher.id} value={teacher.id}>
                                                        {teacher.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                <Button className="gap-2" onClick={() => openCreateDialog()} disabled={!canCreatePlan}>
                                    <Plus className="h-4 w-4" />
                                    {t('Create')}
                                </Button>
                            </div>
                        )}
                    </div>

                    {(planningMode === 'class' ? selectedClass : selectedTeacher) || isStudentView ? (
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-500">
                                        {planningMode === 'class' || isStudentView
                                            ? t('Selected Class')
                                            : t('Selected Teacher')}
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-slate-900">
                                        {isStudentView
                                            ? `${studentRecord?.className || '-'}-${studentRecord?.section || '-'}`
                                            : planningMode === 'class'
                                              ? `${selectedClass?.name}-${selectedClass?.section}`
                                              : selectedTeacher?.name}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-500">{t('Total Plans')}</p>
                                    <p className="mt-1 text-2xl font-bold text-slate-900">{lessonStats.total}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-500">{t('In Progress')}</p>
                                    <p className="mt-1 text-2xl font-bold text-blue-600">{lessonStats.inProgress}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-500">{t('Completed')}</p>
                                    <p className="mt-1 text-2xl font-bold text-emerald-600">{lessonStats.completed}</p>
                                </CardContent>
                            </Card>
                        </div>
                    ) : null}

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Weekly Lesson Planning')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {planningMode === 'class' && !selectedClassId ? (
                                <p className="text-sm text-slate-500">
                                    {t('Select a class to begin planning lessons.')}
                                </p>
                            ) : planningMode === 'teacher' && !isStudentView && !selectedTeacherId ? (
                                <p className="text-sm text-slate-500">
                                    {t('Select a teacher to begin planning lessons.')}
                                </p>
                            ) : filteredTimetableEntries.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    {t('No timetable entries found for this')}
                                    {isStudentView || planningMode === 'class' ? t('class') : t('teacher')}
                                    {'. '}
                                    {t('Create the timetable first.')}
                                </p>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full min-w-[980px] border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                    {t('Period')}
                                                </th>
                                                {dayOrder.map((day) => (
                                                    <th
                                                        key={day}
                                                        className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700"
                                                    >
                                                        {day}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {weeklyTimetable.map((row) => (
                                                <tr key={row.periodId}>
                                                    <td className="border border-slate-200 bg-white px-4 py-4 align-top">
                                                        <p className="font-medium text-slate-900">
                                                            {row.periodId.toUpperCase()}
                                                        </p>
                                                        <p className="text-sm text-slate-500">
                                                            {row.startTime} - {row.endTime}
                                                        </p>
                                                    </td>
                                                    {dayOrder.map((day) => {
                                                        const entry = row.slots[day];

                                                        if (!entry) {
                                                            return (
                                                                <td
                                                                    key={`${row.periodId}-${day}`}
                                                                    className="border border-slate-200 bg-slate-50 px-4 py-4 align-top"
                                                                >
                                                                    <p className="text-sm text-slate-400">
                                                                        {t('No timetable entry')}
                                                                    </p>
                                                                </td>
                                                            );
                                                        }

                                                        const entryPlans = getPlansForEntry(entry.id);
                                                        const latestPlan = entryPlans[entryPlans.length - 1];

                                                        return (
                                                            <td
                                                                key={`${row.periodId}-${day}`}
                                                                className="border border-slate-200 bg-white px-4 py-4 align-top"
                                                            >
                                                                <div className="space-y-3">
                                                                    <div className="space-y-2">
                                                                        <Badge variant="outline">{entry.subject}</Badge>
                                                                        <p className="text-sm font-medium text-slate-900">
                                                                            {entry.teacherName}
                                                                        </p>
                                                                        <p className="text-sm text-slate-500">
                                                                            {t('Room')}
                                                                            {entry.room}
                                                                        </p>
                                                                        <p className="text-sm text-slate-500">
                                                                            {t('Plans:')}
                                                                            {entryPlans.length}
                                                                        </p>
                                                                        {latestPlan ? (
                                                                            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                                                                                <div className="flex items-center justify-between gap-2">
                                                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                                        {t('Latest Plan')}
                                                                                    </p>
                                                                                    <Badge
                                                                                        variant={
                                                                                            latestPlan.status ===
                                                                                            'completed'
                                                                                                ? 'default'
                                                                                                : 'secondary'
                                                                                        }
                                                                                    >
                                                                                        {latestPlan.status.replace(
                                                                                            '_',
                                                                                            ' ',
                                                                                        )}
                                                                                    </Badge>
                                                                                </div>
                                                                                <p className="text-sm font-medium text-slate-900">
                                                                                    {latestPlan.lessonTitle}
                                                                                </p>
                                                                                <p className="text-sm text-slate-600">
                                                                                    {latestPlan.topic}
                                                                                </p>
                                                                                <p className="text-xs text-slate-500">
                                                                                    {t('Date:')}
                                                                                    {latestPlan.lessonDate}
                                                                                </p>
                                                                                {latestPlan.approvedBy ? (
                                                                                    <p className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                                                                                        <BadgeCheck className="h-3.5 w-3.5" />
                                                                                        {t('Approved')}
                                                                                        {latestPlan.approvedByName
                                                                                            ? ` · ${latestPlan.approvedByName}`
                                                                                            : ''}
                                                                                    </p>
                                                                                ) : null}
                                                                                {!isStudentView ? (
                                                                                    <div className="flex gap-2">
                                                                                        {isAdminView ? (
                                                                                            latestPlan.approvedBy ? (
                                                                                                <Button
                                                                                                    type="button"
                                                                                                    size="sm"
                                                                                                    variant="outline"
                                                                                                    onClick={() =>
                                                                                                        handleApprovePlan(
                                                                                                            latestPlan,
                                                                                                            false,
                                                                                                        )
                                                                                                    }
                                                                                                >
                                                                                                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                                                                                                    {t(
                                                                                                        'Withdraw Approval',
                                                                                                    )}
                                                                                                </Button>
                                                                                            ) : (
                                                                                                <Button
                                                                                                    type="button"
                                                                                                    size="sm"
                                                                                                    variant="outline"
                                                                                                    className="text-emerald-700"
                                                                                                    onClick={() =>
                                                                                                        handleApprovePlan(
                                                                                                            latestPlan,
                                                                                                            true,
                                                                                                        )
                                                                                                    }
                                                                                                >
                                                                                                    <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
                                                                                                    {t('Approve')}
                                                                                                </Button>
                                                                                            )
                                                                                        ) : null}
                                                                                        <Button
                                                                                            type="button"
                                                                                            size="icon"
                                                                                            variant="outline"
                                                                                            onClick={() =>
                                                                                                openEditDialog(
                                                                                                    latestPlan,
                                                                                                )
                                                                                            }
                                                                                            aria-label={t(
                                                                                                'Edit lesson plan',
                                                                                            )}
                                                                                        >
                                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                        <Button
                                                                                            type="button"
                                                                                            size="icon"
                                                                                            variant="outline"
                                                                                            className="text-red-600"
                                                                                            onClick={() =>
                                                                                                handleDeletePlan(
                                                                                                    latestPlan.id,
                                                                                                )
                                                                                            }
                                                                                            aria-label={t(
                                                                                                'Delete lesson plan',
                                                                                            )}
                                                                                        >
                                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                    </div>
                                                                                ) : null}
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                    {!isStudentView ? (
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => openCreateDialog(entry)}
                                                                        >
                                                                            <Plus className="mr-2 h-3.5 w-3.5" />
                                                                            {t('Create Lesson')}
                                                                        </Button>
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Date-wise Lesson Plans')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {filteredLessonPlans.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    {t('No lesson plans created for this')}
                                    {isStudentView || planningMode === 'class' ? t('class') : t('teacher')}
                                    {t('yet.')}
                                </p>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full min-w-[1100px] border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                    {t('Date')}
                                                </th>
                                                <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                    {t('Day')}
                                                </th>
                                                <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                    {t('Period')}
                                                </th>
                                                <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                    {t('Subject')}
                                                </th>
                                                <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                    {t('Teacher')}
                                                </th>
                                                <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                    {t('Lesson')}
                                                </th>
                                                <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                    {t('Topic')}
                                                </th>
                                                <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                    {t('Status')}
                                                </th>
                                                <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                    {t('Approval')}
                                                </th>
                                                {!isStudentView ? (
                                                    <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                        {t('Actions')}
                                                    </th>
                                                ) : null}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredLessonPlans.map((plan) => (
                                                <tr key={plan.id}>
                                                    <td className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                                        {plan.lessonDate}
                                                    </td>
                                                    <td className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                                        {plan.day}
                                                    </td>
                                                    <td className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                                        {plan.periodId.toUpperCase()} | {plan.startTime} -{' '}
                                                        {plan.endTime}
                                                    </td>
                                                    <td className="border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900">
                                                        {plan.subject}
                                                    </td>
                                                    <td className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                                        {plan.teacherName}
                                                    </td>
                                                    <td className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                                        {plan.lessonTitle}
                                                    </td>
                                                    <td className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                                        {plan.topic}
                                                    </td>
                                                    <td className="border border-slate-200 bg-white px-4 py-3 text-sm">
                                                        <Badge
                                                            variant={
                                                                plan.status === 'completed' ? 'default' : 'secondary'
                                                            }
                                                        >
                                                            {plan.status.replace('_', ' ')}
                                                        </Badge>
                                                    </td>
                                                    <td className="border border-slate-200 bg-white px-4 py-3 text-sm">
                                                        {plan.approvedBy ? (
                                                            <div className="flex items-center gap-1 text-emerald-700">
                                                                <BadgeCheck className="h-3.5 w-3.5" />
                                                                <span>
                                                                    {t('Approved')}
                                                                    {plan.approvedByName
                                                                        ? ` · ${plan.approvedByName}`
                                                                        : ''}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">
                                                                {t('Pending approval')}
                                                            </span>
                                                        )}
                                                        {isAdminView ? (
                                                            plan.approvedBy ? (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="mt-1 h-6 text-xs"
                                                                    onClick={() => handleApprovePlan(plan, false)}
                                                                >
                                                                    {t('Withdraw')}
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="mt-1 h-6 text-xs text-emerald-700"
                                                                    onClick={() => handleApprovePlan(plan, true)}
                                                                >
                                                                    {t('Approve')}
                                                                </Button>
                                                            )
                                                        ) : null}
                                                    </td>
                                                    {!isStudentView ? (
                                                        <td className="border border-slate-200 bg-white px-4 py-3 text-sm">
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => openEditDialog(plan)}
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-red-600"
                                                                    onClick={() => handleDeletePlan(plan.id)}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    ) : null}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog
                open={!isStudentView && showPlanDialog}
                onOpenChange={(open) => (!open ? resetDialog() : setShowPlanDialog(true))}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingPlanId ? t('Edit Lesson Plan') : t('Create Lesson Plan')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSavePlan} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Timetable Period')}</Label>
                            <Select
                                value={planForm.timetableEntryId}
                                onValueChange={(value) =>
                                    setPlanForm((current) => ({
                                        ...current,
                                        timetableEntryId: value,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select timetable period')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {timetableEntryOptions.map((entry) => (
                                        <SelectItem key={entry.id} value={entry.id}>
                                            {t(entry.label)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {page.props.errors?.timetableEntryId ? (
                                <p className="text-sm text-red-600">{page.props.errors.timetableEntryId}</p>
                            ) : null}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Lesson Date')}</Label>
                                <Input
                                    type="date"
                                    value={planForm.lessonDate}
                                    onChange={(event) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            lessonDate: event.target.value,
                                        }))
                                    }
                                />

                                {page.props.errors?.lessonDate ? (
                                    <p className="text-sm text-red-600">{page.props.errors.lessonDate}</p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Status')}</Label>
                                <Select
                                    value={planForm.status}
                                    onValueChange={(value) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            status: value as LessonPlanStatus,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status.replace('_', ' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('Lesson')}</Label>
                            <Input
                                value={planForm.lessonTitle}
                                onChange={(event) =>
                                    setPlanForm((current) => ({
                                        ...current,
                                        lessonTitle: event.target.value,
                                    }))
                                }
                                placeholder={t('e.g., Algebraic Expressions')}
                            />

                            {page.props.errors?.lessonTitle ? (
                                <p className="text-sm text-red-600">{page.props.errors.lessonTitle}</p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label>{t('Topic')}</Label>
                            <Input
                                value={planForm.topic}
                                onChange={(event) =>
                                    setPlanForm((current) => ({
                                        ...current,
                                        topic: event.target.value,
                                    }))
                                }
                                placeholder={t('e.g., Simplification and factorization')}
                            />

                            {page.props.errors?.topic ? (
                                <p className="text-sm text-red-600">{page.props.errors.topic}</p>
                            ) : null}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={resetDialog}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {editingPlanId ? t('Update Plan') : t('Create Plan')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
