import { useLanguage } from '../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface ClassRecord {
    id: string;
    name: string;
    section: string;
    teacher_id?: string | null;
    teacher_name?: string | null;
    room_number?: string | null;
    capacity?: number;
    status?: string;
}

interface TeacherRecord {
    id: string;
    name: string;
    email: string;
    status: string;
}

interface SubjectRecord {
    id: string;
    name: string;
    code?: string | null;
}

interface StudentRecord {
    id: string;
    className: string;
    section: string;
    email: string;
}

interface TimeTableEntry {
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
}

interface ClassTimeTableProps {
    user: any;
    accessToken?: string;
    classes: ClassRecord[];
    teachers: TeacherRecord[];
    subjects: SubjectRecord[];
    entries: TimeTableEntry[];
    studentRecord?: StudentRecord | null;
}

interface TimetableConflictEntry extends TimeTableEntry {}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const defaultPeriods = ['p1'];

const emptyForm = {
    day: 'Monday',
    periodId: 'p1',
    subjectId: '',
    teacherId: '',
    room: '',
    startTime: '08:30',
    endTime: '09:15',
};

const getPeriodOrder = (periodId: string) => {
    const parsedOrder = Number.parseInt(periodId.replace(/\D+/g, ''), 10);
    return Number.isNaN(parsedOrder) || parsedOrder <= 0 ? 999 : parsedOrder;
};

const getPeriodLabel = (periodId: string) => `Period ${getPeriodOrder(periodId)}`;
const toPeriodId = (value: string) => `p${value.replace(/\D+/g, '')}`;
const toPeriodNumber = (periodId: string) => {
    const parsedOrder = Number.parseInt(periodId.replace(/\D+/g, ''), 10);
    return Number.isNaN(parsedOrder) || parsedOrder <= 0 ? '1' : String(parsedOrder);
};

export default function ClassTimeTable({
    user,
    accessToken,
    classes,
    teachers,
    subjects,
    entries,
    studentRecord = null,
}: ClassTimeTableProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: {
            success?: string;
            error?: string;
            timetableConflict?: TimetableConflictEntry | null;
        };
        errors?: Record<string, string>;
    }>();
    const flash = page.props.flash ?? {};
    const isStudentView = user?.role === 'student';
    const normalizedClasses = useMemo(
        () =>
            classes.map((classItem) => ({
                ...classItem,
                id: String(classItem.id),
                teacher_id: classItem.teacher_id ? String(classItem.teacher_id) : null,
            })),
        [classes],
    );
    const [selectedClassId, setSelectedClassId] = useState('');
    const [showEntryDialog, setShowEntryDialog] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [entryForm, setEntryForm] = useState(emptyForm);
    const [visiblePeriodCount, setVisiblePeriodCount] = useState(1);

    useEffect(() => {
        if (normalizedClasses.length === 0) {
            return;
        }

        const selectedClassStillExists = normalizedClasses.some((classItem) => classItem.id === selectedClassId);

        if (selectedClassId && selectedClassStillExists) {
            return;
        }

        if (isStudentView && studentRecord) {
            const matchedClass = normalizedClasses.find(
                (classItem) =>
                    String(classItem.name) === String(studentRecord.className) &&
                    String(classItem.section) === String(studentRecord.section),
            );

            if (matchedClass) {
                setSelectedClassId(matchedClass.id);
                return;
            }
        }

        setSelectedClassId(normalizedClasses[0].id);
    }, [isStudentView, normalizedClasses, selectedClassId, studentRecord]);

    const selectedClass = useMemo(
        () => normalizedClasses.find((classItem) => classItem.id === selectedClassId) || null,
        [normalizedClasses, selectedClassId],
    );

    const classEntries = useMemo(
        () => entries.filter((entry) => entry.classId === selectedClassId),
        [entries, selectedClassId],
    );

    const displayedClassEntries = useMemo(() => {
        const conflictEntry = flash.timetableConflict;

        if (!conflictEntry || conflictEntry.classId !== selectedClassId) {
            return classEntries;
        }

        const alreadyVisible = classEntries.some((entry) => entry.id === conflictEntry.id);

        return alreadyVisible ? classEntries : [...classEntries, conflictEntry];
    }, [classEntries, flash.timetableConflict, selectedClassId]);

    const periodIds = useMemo(() => {
        const discoveredPeriods = Array.from(
            new Set(displayedClassEntries.map((entry) => entry.periodId).filter(Boolean)),
        );
        const highestExistingPeriod = discoveredPeriods.reduce(
            (maxPeriod, periodId) => Math.max(maxPeriod, getPeriodOrder(periodId)),
            0,
        );
        const totalPeriods = Math.max(highestExistingPeriod, visiblePeriodCount, defaultPeriods.length);

        return Array.from({ length: totalPeriods }, (_, index) => `p${index + 1}`);
    }, [displayedClassEntries, visiblePeriodCount]);

    useEffect(() => {
        const highestExistingPeriod = displayedClassEntries.reduce(
            (maxPeriod, entry) => Math.max(maxPeriod, getPeriodOrder(entry.periodId)),
            0,
        );
        setVisiblePeriodCount(Math.max(highestExistingPeriod, 1));
    }, [selectedClassId, displayedClassEntries]);

    const getEntriesForSlot = (day: string, periodId: string) =>
        displayedClassEntries.filter((entry) => entry.day === day && entry.periodId === periodId);

    const timetable = useMemo(() => {
        if (!selectedClass) {
            return [];
        }

        return periodIds.map((periodId) => ({
            periodId,
            slots: days.map((day) => ({
                day,
                entries: getEntriesForSlot(day, periodId),
            })),
        }));
    }, [selectedClass, periodIds, displayedClassEntries]);

    const resetForm = () => {
        setEntryForm(emptyForm);
        setEditingEntryId(null);
        setShowEntryDialog(false);
    };

    const openCreateDialog = (day: string, periodId: string) => {
        setEditingEntryId(null);
        setEntryForm({
            day,
            periodId,
            subjectId: '',
            teacherId: selectedClass?.teacher_id ? String(selectedClass.teacher_id) : '',
            room: selectedClass?.room_number || '',
            startTime: '08:30',
            endTime: '09:15',
        });
        setShowEntryDialog(true);
    };

    const openEditDialog = (entry: TimeTableEntry) => {
        setEditingEntryId(entry.id);
        setEntryForm({
            day: entry.day,
            periodId: entry.periodId,
            subjectId: entry.subjectId,
            teacherId: entry.teacherId,
            room: entry.room,
            startTime: entry.startTime || '08:30',
            endTime: entry.endTime || '09:15',
        });
        setShowEntryDialog(true);
    };

    const handleSaveEntry = (event: React.FormEvent) => {
        event.preventDefault();

        if (!selectedClass) {
            toast.error('Please select a class first');
            return;
        }

        if (!entryForm.subjectId) {
            toast.error('Please select a subject');
            return;
        }

        if (!entryForm.teacherId) {
            toast.error('Please select a teacher');
            return;
        }

        const payload = {
            classId: selectedClass.id,
            day: entryForm.day,
            periodId: entryForm.periodId,
            subjectId: entryForm.subjectId,
            teacherId: entryForm.teacherId,
            room: entryForm.room,
            startTime: entryForm.startTime,
            endTime: entryForm.endTime,
        };

        const request = editingEntryId
            ? router.patch(`/class-time-table/${editingEntryId}`, payload, {
                  preserveScroll: true,
                  onSuccess: () => {
                      toast.success('Timetable entry updated');
                      resetForm();
                  },
                  onError: (errors) => {
                      toast.error(Object.values(errors)[0] || 'Failed to update timetable entry');
                  },
              })
            : router.post('/class-time-table', payload, {
                  preserveScroll: true,
                  onSuccess: () => {
                      toast.success('Timetable entry created');
                      resetForm();
                  },
                  onError: (errors) => {
                      toast.error(Object.values(errors)[0] || 'Failed to create timetable entry');
                  },
              });

        return request;
    };

    const handleDeleteEntry = (entryId: string) => {
        const confirmed = window.confirm('Delete this timetable entry?');
        if (!confirmed) {
            return;
        }

        router.delete(`/class-time-table/${entryId}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Timetable entry deleted');
            },
        });
    };

    return (
        <DashboardLayout user={user} activeTab="class-time-table" accessToken={accessToken}>
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    {flash.success ? (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                            {flash.success}
                        </div>
                    ) : null}
                    {flash.error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            {flash.error}
                        </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Class Time Table')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {isStudentView
                                    ? t('View the weekly timetable for your class.')
                                    : t('Review and manage the weekly teaching plan class-wise and section-wise.')}
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
                            <div className="flex w-full max-w-md gap-3">
                                <div className="flex-1">
                                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select class and section')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {normalizedClasses.map((classItem) => (
                                                <SelectItem key={classItem.id} value={classItem.id}>
                                                    {classItem.name}
                                                    {t('- Section')}
                                                    {classItem.section}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    className="gap-2"
                                    onClick={() => openCreateDialog('Monday', periodIds[0] || 'p1')}
                                    disabled={!selectedClass}
                                >
                                    <Plus className="h-4 w-4" />
                                    {t('Create')}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => setVisiblePeriodCount((current) => current + 1)}
                                    disabled={!selectedClass}
                                >
                                    <Plus className="h-4 w-4" />
                                    {t('Add Period')}
                                </Button>
                            </div>
                        )}
                    </div>

                    {selectedClass ? (
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-500">{t('Selected Class')}</p>
                                    <p className="mt-1 text-2xl font-bold text-slate-900">
                                        {selectedClass.name}-{selectedClass.section}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-500">{t('Class Teacher')}</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">
                                        {selectedClass.teacher_name || t('Not assigned')}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-500">{t('Room Number')}</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">
                                        {selectedClass.room_number || t('TBD')}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-500">{t('Weekly Entries')}</p>
                                    <p className="mt-1 text-2xl font-bold text-slate-900">
                                        {displayedClassEntries.length}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    ) : null}

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Weekly Schedule')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!selectedClass ? (
                                <p className="text-sm text-slate-500">{t('Select a class to view its timetable.')}</p>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full min-w-[980px] border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                    {t('Period')}
                                                </th>
                                                {days.map((day) => (
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
                                            {timetable.map(({ periodId, slots }) => (
                                                <tr key={periodId}>
                                                    <td className="border border-slate-200 bg-white px-4 py-4 align-top">
                                                        <p className="font-medium text-slate-900">
                                                            {getPeriodLabel(periodId)}
                                                        </p>
                                                    </td>
                                                    {slots.map((slot, index) => (
                                                        <td
                                                            key={`${periodId}-${days[index]}`}
                                                            className="border border-slate-200 bg-white px-4 py-4 align-top"
                                                        >
                                                            {slot.entries.length > 0 ? (
                                                                <div className="space-y-3">
                                                                    {slot.entries.map((entry, entryIndex) => (
                                                                        <div
                                                                            key={entry.id}
                                                                            className={
                                                                                entryIndex > 0
                                                                                    ? t(
                                                                                          'rounded-xl border border-blue-200 bg-blue-50 p-3',
                                                                                      )
                                                                                    : ''
                                                                            }
                                                                        >
                                                                            {entryIndex === 1 ? (
                                                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                                                                                    {t(
                                                                                        'Multiple entries found in this slot',
                                                                                    )}
                                                                                </p>
                                                                            ) : null}
                                                                            <div className="space-y-2">
                                                                                <Badge variant="outline">
                                                                                    {entry.subject}
                                                                                </Badge>
                                                                                <p className="text-sm font-medium text-slate-900">
                                                                                    {entry.teacherName}
                                                                                </p>
                                                                                <p className="text-sm text-slate-500">
                                                                                    {entry.startTime} - {entry.endTime}
                                                                                </p>
                                                                                <p className="text-sm text-slate-500">
                                                                                    {t('Room')}
                                                                                    {entry.room}
                                                                                </p>
                                                                            </div>

                                                                            {!isStudentView ? (
                                                                                <div className="mt-3 flex gap-2">
                                                                                    <Button
                                                                                        size="icon"
                                                                                        variant="outline"
                                                                                        onClick={() =>
                                                                                            openEditDialog(entry)
                                                                                        }
                                                                                        aria-label={t(
                                                                                            'Edit timetable entry',
                                                                                        )}
                                                                                    >
                                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                    <Button
                                                                                        size="icon"
                                                                                        variant="outline"
                                                                                        className="text-red-600"
                                                                                        onClick={() =>
                                                                                            handleDeleteEntry(entry.id)
                                                                                        }
                                                                                        aria-label={t(
                                                                                            'Delete timetable entry',
                                                                                        )}
                                                                                    >
                                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : !isStudentView ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="gap-2"
                                                                    onClick={() => openCreateDialog(slot.day, periodId)}
                                                                >
                                                                    <Plus className="h-3.5 w-3.5" />
                                                                    {t('Create')}
                                                                </Button>
                                                            ) : (
                                                                <p className="text-sm text-slate-400">
                                                                    {t('No class scheduled')}
                                                                </p>
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {!isStudentView &&
                    flash.timetableConflict &&
                    flash.timetableConflict.classId === selectedClassId ? (
                        <Card className="border-blue-300 bg-blue-50">
                            <CardHeader>
                                <CardTitle className="text-blue-900">{t('Conflicting Saved Entry')}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="space-y-1">
                                    <p className="font-medium text-blue-950">
                                        {flash.timetableConflict.day} •{' '}
                                        {getPeriodLabel(flash.timetableConflict.periodId)}
                                    </p>
                                    <p className="text-sm text-blue-900">
                                        {flash.timetableConflict.subject} • {flash.timetableConflict.teacherName}
                                    </p>
                                    <p className="text-sm text-blue-800">
                                        {flash.timetableConflict.startTime} - {flash.timetableConflict.endTime}
                                        {'• '}
                                        {t('Room')}
                                        {flash.timetableConflict.room}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => openEditDialog(flash.timetableConflict)}
                                        aria-label={t('Edit conflicting timetable entry')}
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="text-red-600"
                                        onClick={() => handleDeleteEntry(flash.timetableConflict.id)}
                                        aria-label={t('Delete conflicting timetable entry')}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            </div>

            <Dialog
                open={!isStudentView && showEntryDialog}
                onOpenChange={(open) => (!open ? resetForm() : setShowEntryDialog(true))}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingEntryId ? t('Edit Timetable Entry') : t('Create Timetable Entry')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveEntry} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Day')}</Label>
                                <Select
                                    value={entryForm.day}
                                    onValueChange={(value) =>
                                        setEntryForm((current) => ({
                                            ...current,
                                            day: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select day')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {days.map((day) => (
                                            <SelectItem key={day} value={day}>
                                                {day}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Period')}</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={toPeriodNumber(entryForm.periodId)}
                                    onChange={(event) => {
                                        const nextValue = event.target.value.replace(/\D+/g, '');
                                        if (!nextValue) {
                                            return;
                                        }

                                        const nextPeriodId = toPeriodId(nextValue);
                                        setEntryForm((current) => ({
                                            ...current,
                                            periodId: nextPeriodId,
                                        }));
                                        setVisiblePeriodCount((current) =>
                                            Math.max(current, Number.parseInt(nextValue, 10) || 1),
                                        );
                                    }}
                                    required
                                />

                                <p className="text-xs text-slate-500">
                                    {t('Use any positive period number. The timetable will grow automatically.')}
                                </p>
                                {page.props.errors?.periodId ? (
                                    <p className="text-sm text-red-600">{page.props.errors.periodId}</p>
                                ) : null}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('Subject')}</Label>
                            <Select
                                value={entryForm.subjectId}
                                onValueChange={(value) =>
                                    setEntryForm((current) => ({
                                        ...current,
                                        subjectId: value,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select subject')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {page.props.errors?.subjectId ? (
                                <p className="text-sm text-red-600">{page.props.errors.subjectId}</p>
                            ) : null}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Start Time')}</Label>
                                <Input
                                    type="time"
                                    value={entryForm.startTime}
                                    onChange={(event) =>
                                        setEntryForm((current) => ({
                                            ...current,
                                            startTime: event.target.value,
                                        }))
                                    }
                                    required
                                />

                                {page.props.errors?.startTime ? (
                                    <p className="text-sm text-red-600">{page.props.errors.startTime}</p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('End Time')}</Label>
                                <Input
                                    type="time"
                                    value={entryForm.endTime}
                                    onChange={(event) =>
                                        setEntryForm((current) => ({
                                            ...current,
                                            endTime: event.target.value,
                                        }))
                                    }
                                    required
                                />

                                {page.props.errors?.endTime ? (
                                    <p className="text-sm text-red-600">{page.props.errors.endTime}</p>
                                ) : null}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('Teacher')}</Label>
                            <Select
                                value={entryForm.teacherId}
                                onValueChange={(value) =>
                                    setEntryForm((current) => ({
                                        ...current,
                                        teacherId: value,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select teacher')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map((teacher) => (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                            {teacher.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {page.props.errors?.teacherId ? (
                                <p className="text-sm text-red-600">{page.props.errors.teacherId}</p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label>{t('Room')}</Label>
                            <Input
                                value={entryForm.room}
                                onChange={(event) =>
                                    setEntryForm((current) => ({
                                        ...current,
                                        room: event.target.value,
                                    }))
                                }
                            />

                            {page.props.errors?.room ? (
                                <p className="text-sm text-red-600">{page.props.errors.room}</p>
                            ) : null}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={resetForm}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit">{editingEntryId ? t('Update Entry') : t('Create Entry')}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
