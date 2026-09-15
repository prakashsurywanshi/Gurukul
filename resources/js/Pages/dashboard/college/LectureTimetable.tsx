import { router } from '@inertiajs/react';
import { CalendarDays, Loader2, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import DashboardLayout from '../../DashboardLayout';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select } from '../../ui/select';
import { Textarea } from '../../ui/textarea';

interface ClassOption {
    id: number;
    name: string;
    section: string;
}

interface Lecture {
    id: number;
    class_id: number;
    subject_id: number | null;
    subject_name: string | null;
    subject_code: string | null;
    teacher_id: number | null;
    teacher_name: string | null;
    semester_id: number | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room: string | null;
}

interface Subject {
    id: number;
    name: string;
    code: string | null;
}

interface Teacher {
    id: number;
    name: string;
}

interface DayOption {
    value: number;
    label: string;
}

interface LectureTimetableProps {
    user: any;
    classes: ClassOption[];
    selectedClassId: number | null;
    selectedClassName: string | null;
    lectures: Lecture[];
    subjects: Subject[];
    teachers: Teacher[];
    semester: { id: number; name: string; sem_no: number } | null;
    daysOfWeek: DayOption[];
}

const TIME_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

export default function LectureTimetable(pageProps: LectureTimetableProps) {
    const { classes, selectedClassId, selectedClassName, lectures, subjects, teachers, semester, daysOfWeek } = pageProps;

    const [classId, setClassId] = useState(selectedClassId?.toString() ?? '');
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formDay, setFormDay] = useState('');
    const [formStart, setFormStart] = useState('');
    const [formEnd, setFormEnd] = useState('');
    const [formSubject, setFormSubject] = useState('');
    const [formTeacher, setFormTeacher] = useState('');
    const [formRoom, setFormRoom] = useState('');

    const resetForm = () => {
        setFormDay('');
        setFormStart('');
        setFormEnd('');
        setFormSubject('');
        setFormTeacher('');
        setFormRoom('');
    };

    const switchClass = (newClassId: string) => {
        setClassId(newClassId);
        router.get('/college/lectures', { class_id: newClassId }, { preserveState: true, replace: true });
    };

    const submitLecture = (event: FormEvent) => {
        event.preventDefault();
        if (!selectedClassId) {
            return;
        }
        setSaving(true);
        router.post(
            '/college/lectures',
            {
                class_id: selectedClassId,
                day_of_week: parseInt(formDay, 10),
                start_time: formStart,
                end_time: formEnd,
                subject_id: formSubject ? parseInt(formSubject, 10) : null,
                teacher_id: formTeacher ? parseInt(formTeacher, 10) : null,
                semester_id: semester?.id ?? null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    resetForm();
                    setShowForm(false);
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const deleteLecture = (lecture: Lecture) => {
        if (!window.confirm('Remove this lecture?')) {
            return;
        }
        router.delete(`/college/lectures/${lecture.id}`, { preserveScroll: true });
    };

    const lecturesByDay: Record<number, Lecture[]> = {};
    daysOfWeek.forEach((d) => (lecturesByDay[d.value] = []));
    lectures.forEach((lecture) => {
        if (lecturesByDay[lecture.day_of_week]) {
            lecturesByDay[lecture.day_of_week].push(lecture);
        }
    });

    Object.keys(lecturesByDay).forEach((day) => {
        lecturesByDay[Number(day)].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return (
        <DashboardLayout user={pageProps.user}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            <CalendarDays className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            Lecture Timetable
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Weekly lecture schedule per class.
                            {semester && (
                                <Badge variant="outline" className="ml-2">
                                    {semester.name}
                                </Badge>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="w-64 space-y-1">
                        <Label>Class</Label>
                        <Select
                            value={classId}
                            onValueChange={switchClass}
                        >
                            <option value="">Select class…</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}{c.section ? ` ${c.section}` : ''}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex-1" />
                    {selectedClassId && (
                        <Button
                            size="sm"
                            onClick={() => {
                                resetForm();
                                setShowForm((v) => !v);
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {showForm ? 'Close' : 'Add Lecture'}
                        </Button>
                    )}
                </div>

                {showForm && selectedClassId && (
                    <form onSubmit={submitLecture} className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">New Lecture</h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                            <div className="space-y-1">
                                <Label>Day *</Label>
                                <Select value={formDay} onValueChange={setFormDay} required>
                                    <option value="">Select day…</option>
                                    {daysOfWeek.map((d) => (
                                        <option key={d.value} value={d.value}>
                                            {d.label}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Start Time *</Label>
                                <select
                                    className="w-full rounded-md border bg-white px-2 py-2 text-sm dark:bg-gray-800"
                                    value={formStart}
                                    onChange={(e) => setFormStart(e.target.value)}
                                    required
                                >
                                    <option value="">Select…</option>
                                    {TIME_SLOTS.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>End Time *</Label>
                                <select
                                    className="w-full rounded-md border bg-white px-2 py-2 text-sm dark:bg-gray-800"
                                    value={formEnd}
                                    onChange={(e) => setFormEnd(e.target.value)}
                                    required
                                >
                                    <option value="">Select…</option>
                                    {TIME_SLOTS.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>Room</Label>
                                <Input value={formRoom} onChange={(e) => setFormRoom(e.target.value)} placeholder="e.g. Lab 2" />
                            </div>
                            <div className="space-y-1">
                                <Label>Subject</Label>
                                <Select value={formSubject} onValueChange={setFormSubject}>
                                    <option value="">None</option>
                                    {subjects.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}{s.code ? ` (${s.code})` : ''}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Teacher</Label>
                                <Select value={formTeacher} onValueChange={setFormTeacher}>
                                    <option value="">None</option>
                                    {teachers.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button type="submit" disabled={saving || !formDay || !formStart || !formEnd}>
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    'Add Lecture'
                                )}
                            </Button>
                        </div>
                    </form>
                )}

                {!selectedClassId ? (
                    <p className="rounded-lg border bg-card p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        Select a class to view its weekly timetable.
                    </p>
                ) : lectures.length === 0 ? (
                    <p className="rounded-lg border bg-card p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No lectures scheduled for this class yet.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {daysOfWeek.map((day) => {
                            const dayLectures = lecturesByDay[day.value] ?? [];
                            return (
                                <div key={day.value} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                    <div className="border-b px-4 py-2">
                                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{day.label}</h3>
                                        <p className="text-xs text-gray-500">{dayLectures.length} lecture{dayLectures.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <ul className="divide-y">
                                        {dayLectures.map((lecture) => (
                                            <li key={lecture.id} className="flex items-start justify-between px-4 py-2">
                                                <div className="text-xs text-gray-700 dark:text-gray-300">
                                                    <p className="font-medium">
                                                        {lecture.start_time} – {lecture.end_time}
                                                    </p>
                                                    <p>{lecture.subject_name ?? '—'}</p>
                                                    {lecture.teacher_name && (
                                                        <p className="text-gray-500">{lecture.teacher_name}</p>
                                                    )}
                                                    {lecture.room && (
                                                        <p className="text-gray-400">{lecture.room}</p>
                                                    )}
                                                </div>
                                                <button
                                                    className="ml-2 mt-0.5 text-red-400 hover:text-red-600"
                                                    onClick={() => deleteLecture(lecture)}
                                                    title="Remove"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </li>
                                        ))}
                                        {dayLectures.length === 0 && (
                                            <li className="px-4 py-4 text-xs text-gray-400">No lectures</li>
                                        )}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}