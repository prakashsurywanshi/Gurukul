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

interface TeacherTimeTableProps {
  user: any;
  accessToken?: string;
  classes?: Array<{
    id: string;
    name: string;
    section: string;
    teacher_id?: string | null;
    teacher_name?: string | null;
    room_number?: string | null;
  }>;
  teachers?: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
  }>;
  subjects?: Array<{
    id: string;
    name: string;
    code?: string | null;
  }>;
  entries?: TimeTableEntry[];
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

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const defaultPeriods = ['p1'];

const emptyForm = {
  classId: '',
  day: 'Monday',
  periodId: 'p1',
  subjectId: '',
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

export default function TeacherTimeTable({
  user,
  accessToken,
  classes = [],
  teachers = [],
  subjects = [],
  entries = [],
}: TeacherTimeTableProps) {
  const page = usePage<{ errors?: Record<string, string>; flash?: { success?: string; error?: string } }>();
  const isTeacherViewOnly = user?.role === 'teacher';
  const canManageTimetable = user?.role === 'admin' || user?.role === 'super_admin';
  const currentTeacherId = String(user?.id ?? '');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState(emptyForm);
  const [visiblePeriodCount, setVisiblePeriodCount] = useState(1);

  const normalizedSubjects = useMemo(
    () =>
      subjects
        .map((subject) => ({
          ...subject,
          id: String(subject.id),
          name: String(subject.name || '').trim(),
        }))
        .filter((subject) => subject.name.length > 0),
    [subjects]
  );

  useEffect(() => {
    if (page.props.flash?.success) {
      toast.success(page.props.flash.success);
    }

    if (page.props.flash?.error) {
      toast.error(page.props.flash.error);
    }
  }, [page.props.flash?.error, page.props.flash?.success]);

  const visibleTeachers = useMemo(
    () => (isTeacherViewOnly ? teachers.filter((teacher) => teacher.id === currentTeacherId) : teachers),
    [currentTeacherId, isTeacherViewOnly, teachers]
  );

  useEffect(() => {
    if (isTeacherViewOnly) {
      setSelectedTeacherId(currentTeacherId);
      return;
    }

    setSelectedTeacherId((current) => current || visibleTeachers[0]?.id || '');
  }, [currentTeacherId, isTeacherViewOnly, visibleTeachers]);

  const selectedTeacher = useMemo(
    () => visibleTeachers.find((teacher) => teacher.id === selectedTeacherId) || null,
    [selectedTeacherId, visibleTeachers]
  );

  const teacherClasses = useMemo(() => {
    if (!selectedTeacher) {
      return [];
    }

    return classes.filter(
      (classItem) =>
        classItem.teacher_id === selectedTeacher.id || classItem.teacher_name === selectedTeacher.name
    );
  }, [classes, selectedTeacher]);

  const teacherEntries = useMemo(
    () => entries.filter((entry) => entry.teacherId === selectedTeacherId),
    [entries, selectedTeacherId]
  );

  const periodIds = useMemo(() => {
    const discoveredPeriods = Array.from(new Set(teacherEntries.map((entry) => entry.periodId).filter(Boolean)));
    const highestExistingPeriod = discoveredPeriods.reduce((maxPeriod, periodId) => Math.max(maxPeriod, getPeriodOrder(periodId)), 0);
    const totalPeriods = Math.max(highestExistingPeriod, visiblePeriodCount, defaultPeriods.length);

    return Array.from({ length: totalPeriods }, (_, index) => `p${index + 1}`);
  }, [teacherEntries, visiblePeriodCount]);

  useEffect(() => {
    const highestExistingPeriod = teacherEntries.reduce((maxPeriod, entry) => Math.max(maxPeriod, getPeriodOrder(entry.periodId)), 0);
    setVisiblePeriodCount(Math.max(highestExistingPeriod, 1));
  }, [selectedTeacherId, teacherEntries]);

  const subjectOptions = useMemo(
    () => normalizedSubjects.map((subject) => subject.name),
    [normalizedSubjects]
  );

  const getClassLabel = (classId: string) => {
    const classItem = classes.find((item) => item.id === classId);
    return classItem ? `${classItem.name}-${classItem.section}` : 'Unassigned Class';
  };

  const getExistingEntry = (day: string, periodId: string) =>
    teacherEntries.find((entry) => entry.day === day && entry.periodId === periodId);

  const teacherTimeTable = useMemo(() => {
    if (!selectedTeacher) {
      return [];
    }

    return periodIds.map((periodId, periodIndex) => ({
      periodId,
      slots: days.map((day, dayIndex) => {
        const existingEntry = getExistingEntry(day, periodId);

        if (existingEntry) {
          return {
            ...existingEntry,
            classLabel: getClassLabel(existingEntry.classId),
          };
        }

        const assignedClass = teacherClasses[(periodIndex + dayIndex) % (teacherClasses.length || 1)];

        if (!assignedClass) {
          return {
            id: '',
            classId: '',
            day,
            periodId,
            subject: '-',
            subjectId: '',
            teacherId: selectedTeacher.id,
            teacherName: selectedTeacher.name,
            room: '-',
            classLabel: '-',
            startTime: '-',
            endTime: '-',
          };
        }

        return {
          id: '',
          classId: assignedClass.id,
          day,
          periodId,
          subject: subjectOptions[(periodIndex + dayIndex) % (subjectOptions.length || 1)] || 'Subject',
          subjectId: '',
          teacherId: selectedTeacher.id,
          teacherName: selectedTeacher.name,
          room: assignedClass.room_number || 'TBD',
          classLabel: `${assignedClass.name}-${assignedClass.section}`,
          startTime: '08:30',
          endTime: '09:15',
        };
      }),
    }));
  }, [classes, periodIds, selectedTeacher, subjectOptions, teacherClasses, teacherEntries]);

  const resetForm = () => {
    setEditingEntryId(null);
    setEntryForm(emptyForm);
    setShowEntryDialog(false);
  };

  const openCreateDialog = (day: string, periodId: string) => {
    setEditingEntryId(null);
    setEntryForm({
      classId: teacherClasses[0]?.id || '',
      day,
      periodId,
      subjectId: normalizedSubjects[0]?.id || '',
      room: '',
      startTime: '08:30',
      endTime: '09:15',
    });
    setShowEntryDialog(true);
  };

  const openEditDialog = (entry: TimeTableEntry) => {
    setEditingEntryId(entry.id);
    setEntryForm({
      classId: entry.classId,
      day: entry.day,
      periodId: entry.periodId,
      subjectId: entry.subjectId || '',
      room: entry.room,
      startTime: entry.startTime || '08:30',
      endTime: entry.endTime || '09:15',
    });
    setShowEntryDialog(true);
  };

  const handleSaveEntry = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedTeacher) {
      return;
    }

    if (!entryForm.classId) {
      toast.error('Please select a class for this timetable entry');
      return;
    }

    if (!entryForm.subjectId) {
      toast.error('Please select a subject for this timetable entry');
      return;
    }

    const subjectRecord = normalizedSubjects.find((subject) => subject.id === entryForm.subjectId);
    const targetClass = classes.find((classItem) => classItem.id === entryForm.classId);
    const nextEntry: TimeTableEntry = {
      id: editingEntryId || '',
      classId: entryForm.classId,
      day: entryForm.day,
      periodId: entryForm.periodId,
      subject: subjectRecord?.name || 'Subject',
      subjectId: entryForm.subjectId,
      teacherId: selectedTeacher.id,
      teacherName: selectedTeacher.name,
      room: entryForm.room || targetClass?.room_number || 'TBD',
      startTime: entryForm.startTime,
      endTime: entryForm.endTime,
    };

    const duplicateEntry = teacherEntries.some(
      (entry) =>
        entry.id !== editingEntryId &&
        entry.teacherId === selectedTeacher.id &&
        entry.day === nextEntry.day &&
        entry.periodId === nextEntry.periodId
    );

    if (duplicateEntry) {
      toast.error('This teacher already has an entry for the selected day and period');
      return;
    }

    const payload = {
      class_id: nextEntry.classId,
      day: nextEntry.day,
      period_code: nextEntry.periodId,
      subject_id: nextEntry.subjectId,
      teacher_id: nextEntry.teacherId,
      room_number: nextEntry.room,
      start_time: nextEntry.startTime,
      end_time: nextEntry.endTime,
    };

    const options = {
      preserveScroll: true,
      onSuccess: () => resetForm(),
      onError: () => {
        toast.error(editingEntryId ? 'Failed to update teacher timetable entry' : 'Failed to create teacher timetable entry');
      },
    };

    if (editingEntryId) {
      router.patch(`/class-time-table/${editingEntryId}`, payload, options);
      return;
    }

    router.post('/class-time-table', payload, options);
  };

  const handleDeleteEntry = (entryId: string) => {
    const confirmed = window.confirm('Delete this teacher timetable entry?');

    if (!confirmed) {
      return;
    }

    router.delete(`/class-time-table/${entryId}`, {
      preserveScroll: true,
      onError: () => {
        toast.error('Failed to delete teacher timetable entry');
      },
    });
  };

  return (
    <DashboardLayout user={user} activeTab="teacher-time-table" accessToken={accessToken}>
      <div className="min-h-full bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Teachers Time Table</h1>
              <p className="mt-1 text-sm text-slate-600">
                {canManageTimetable
                  ? 'View and manage weekly teaching allocation teacher-wise across classes and sections.'
                  : 'View your weekly teaching allocation across assigned classes and sections.'}
              </p>
            </div>

            <div className="flex w-full max-w-md gap-3">
              <div className="flex-1">
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId} disabled={isTeacherViewOnly}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleTeachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canManageTimetable ? (
                <>
                  <Button className="gap-2" onClick={() => openCreateDialog('Monday', periodIds[0] || 'p1')} disabled={!selectedTeacher || teacherClasses.length === 0}>
                    <Plus className="h-4 w-4" />
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setVisiblePeriodCount((current) => current + 1)}
                    disabled={!selectedTeacher}
                  >
                    <Plus className="h-4 w-4" />
                    Add Period
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {selectedTeacher && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Teacher</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{selectedTeacher.name}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{selectedTeacher.email}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Assigned Classes</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{teacherClasses.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{selectedTeacher.status || 'active'}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Weekly Teacher Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedTeacher ? (
                <p className="text-sm text-slate-500">Select a teacher to view the timetable.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">Period</th>
                        {days.map((day) => (
                          <th key={day} className="border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teacherTimeTable.map(({ periodId, slots }) => (
                        <tr key={periodId}>
                          <td className="border border-slate-200 bg-white px-4 py-4 align-top">
                            <p className="font-medium text-slate-900">{getPeriodLabel(periodId)}</p>
                          </td>
                          {slots.map((slot) => {
                            const savedEntry = Boolean(slot.id);

                            return (
                              <td key={`${periodId}-${slot.day}`} className="border border-slate-200 bg-white px-4 py-4 align-top">
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    <Badge variant="outline">{slot.subject}</Badge>
                                    <p className="text-sm font-medium text-slate-900">{slot.classLabel}</p>
                                    <p className="text-sm text-slate-500">
                                      {slot.startTime} - {slot.endTime}
                                    </p>
                                    <p className="text-sm text-slate-500">Room {slot.room}</p>
                                  </div>

                                  {canManageTimetable ? (
                                    <div className="flex gap-2">
                                      {savedEntry ? (
                                        <>
                                          <Button size="icon" variant="outline" onClick={() => openEditDialog(slot)} aria-label="Edit teacher timetable entry">
                                            <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button size="icon" variant="outline" className="text-red-600" onClick={() => handleDeleteEntry(slot.id)} aria-label="Delete teacher timetable entry">
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </>
                                      ) : (
                                        <Button size="sm" variant="outline" className="gap-2" onClick={() => openCreateDialog(slot.day, slot.periodId)}>
                                          <Plus className="h-3.5 w-3.5" />
                                          Create
                                        </Button>
                                      )}
                                    </div>
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
        </div>
      </div>

      <Dialog open={canManageTimetable && showEntryDialog} onOpenChange={(open) => (!open ? resetForm() : setShowEntryDialog(true))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntryId ? 'Edit Teacher Timetable Entry' : 'Create Teacher Timetable Entry'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEntry} className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={entryForm.classId} onValueChange={(value) => setEntryForm((current) => ({ ...current, classId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {teacherClasses.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name}-{classItem.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={entryForm.day} onValueChange={(value) => setEntryForm((current) => ({ ...current, day: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
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
                <Label>Period</Label>
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
                    setEntryForm((current) => ({ ...current, periodId: nextPeriodId }));
                    setVisiblePeriodCount((current) => Math.max(current, Number.parseInt(nextValue, 10) || 1));
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={entryForm.subjectId} onValueChange={(value) => setEntryForm((current) => ({ ...current, subjectId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {normalizedSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {normalizedSubjects.length === 0 ? (
                <p className="text-xs text-slate-500">No subjects found in the database yet. Add subjects first to create a timetable entry.</p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={entryForm.startTime} onChange={(event) => setEntryForm((current) => ({ ...current, startTime: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={entryForm.endTime} onChange={(event) => setEntryForm((current) => ({ ...current, endTime: event.target.value }))} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Room</Label>
              <Input value={entryForm.room} onChange={(event) => setEntryForm((current) => ({ ...current, room: event.target.value }))} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={normalizedSubjects.length === 0}>
                {editingEntryId ? 'Update Entry' : 'Create Entry'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
