import { router } from '@inertiajs/react';
import { Building2, ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import DashboardLayout from '../../DashboardLayout';
import { useLanguage } from '../../../i18n/LanguageProvider';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select } from '../../ui/select';
import { Textarea } from '../../ui/textarea';

interface Batch {
    id: number;
    course_id: number;
    name: string;
    academic_year_id: number | null;
    start_date: string | null;
    status: string;
}

interface Course {
    id: number;
    name: string;
    code: string | null;
    department: string | null;
    duration_years: number | null;
    total_semesters: number | null;
    description: string | null;
    status: string;
    batches_count: number;
    batches: Batch[];
}

interface AcademicYear {
    id: number;
    name: string;
}

interface CourseManagementProps {
    user: any;
    courses: Course[];
    academicYears: AcademicYear[];
    selectedSessionId: number | null;
}

export default function CourseManagement(pageProps: CourseManagementProps) {
    const { courses, academicYears, selectedSessionId } = pageProps;
    const { t } = useLanguage();

    const [showCourseForm, setShowCourseForm] = useState(false);
    const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
    const [expandedCourses, setExpandedCourses] = useState<Record<number, boolean>>({});

    const [courseName, setCourseName] = useState('');
    const [courseCode, setCourseCode] = useState('');
    const [courseDept, setCourseDept] = useState('');
    const [courseDuration, setCourseDuration] = useState('');
    const [courseTotalSems, setCourseTotalSems] = useState('');
    const [courseDesc, setCourseDesc] = useState('');
    const [saving, setSaving] = useState(false);

    const [addingBatchToCourseId, setAddingBatchToCourseId] = useState<number | null>(null);
    const [batchName, setBatchName] = useState('');
    const [batchStartDate, setBatchStartDate] = useState('');
    const [batchSaving, setBatchSaving] = useState(false);

    const resetCourseForm = () => {
        setCourseName('');
        setCourseCode('');
        setCourseDept('');
        setCourseDuration('');
        setCourseTotalSems('');
        setCourseDesc('');
        setEditingCourseId(null);
    };

    const submitCourse = (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        const payload = {
            name: courseName,
            code: courseCode || null,
            department: courseDept || null,
            duration_years: courseDuration ? parseInt(courseDuration, 10) : null,
            total_semesters: courseTotalSems ? parseInt(courseTotalSems, 10) : null,
            description: courseDesc || null,
        };

        const onFinish = () => setSaving(false);
        const onSuccess = () => {
            resetCourseForm();
            setShowCourseForm(false);
        };

        if (editingCourseId !== null) {
            router.patch(`/college/courses/${editingCourseId}`, payload, {
                preserveScroll: true,
                onSuccess,
                onFinish,
            });
        } else {
            router.post('/college/courses', payload, {
                preserveScroll: true,
                onSuccess,
                onFinish,
            });
        }
    };

    const editCourse = (course: Course) => {
        setEditingCourseId(course.id);
        setCourseName(course.name);
        setCourseCode(course.code ?? '');
        setCourseDept(course.department ?? '');
        setCourseDuration(course.duration_years?.toString() ?? '');
        setCourseTotalSems(course.total_semesters?.toString() ?? '');
        setCourseDesc(course.description ?? '');
        setShowCourseForm(true);
    };

    const deleteCourse = (course: Course) => {
        if (!window.confirm(t('Delete "{name}"? Batches will also be deleted.', { name: course.name }))) {
            return;
        }
        router.delete(`/college/courses/${course.id}`, { preserveScroll: true });
    };

    const submitBatch = (event: FormEvent) => {
        event.preventDefault();
        if (!addingBatchToCourseId) {
            return;
        }
        setBatchSaving(true);
        router.post(
            `/college/courses/${addingBatchToCourseId}/batches`,
            {
                name: batchName,
                start_date: batchStartDate || null,
                academic_year_id: selectedSessionId,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setBatchName('');
                    setBatchStartDate('');
                    setAddingBatchToCourseId(null);
                },
                onFinish: () => setBatchSaving(false),
            },
        );
    };

    const deleteBatch = (courseId: number, batchId: number) => {
        if (!window.confirm(t('Delete this batch?'))) {
            return;
        }
        router.delete(`/college/batches/${batchId}`, { preserveScroll: true });
    };

    const toggleExpanded = (courseId: number) => {
        setExpandedCourses((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
    };

    return (
        <DashboardLayout user={pageProps.user}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            <Building2 className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            {t('Courses & Batches')}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {t('Manage courses and their batches for the current academic session.')}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => {
                            resetCourseForm();
                            setShowCourseForm((v) => !v);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {showCourseForm ? t('Close') : t('New Course')}
                    </Button>
                </div>

                {showCourseForm && (
                    <form onSubmit={submitCourse} className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {editingCourseId !== null ? t('Edit Course') : t('New Course')}
                        </h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="space-y-1">
                                <Label>{t('Course Name *')}</Label>
                                <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} required />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Code')}</Label>
                                <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder={t('e.g. BSC-CS')} />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Department')}</Label>
                                <Input value={courseDept} onChange={(e) => setCourseDept(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Duration (years)')}</Label>
                                <Input type="number" min="1" max="8" value={courseDuration} onChange={(e) => setCourseDuration(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Total Semesters')}</Label>
                                <Input type="number" min="1" max="12" value={courseTotalSems} onChange={(e) => setCourseTotalSems(e.target.value)} />
                            </div>
                        </div>
                        <div className="mt-4 space-y-1">
                            <Label>{t('Description')}</Label>
                            <Textarea value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} rows={2} />
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button type="submit" disabled={saving || !courseName}>
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('Saving…')}
                                    </>
                                ) : editingCourseId !== null ? (
                                    t('Update')
                                ) : (
                                    t('Create')
                                )}
                            </Button>
                        </div>
                    </form>
                )}

                {courses.length === 0 ? (
                    <p className="rounded-lg border bg-card p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t('No courses created yet. Add your first course above.')}
                    </p>
                ) : (
                    courses.map((course) => {
                        const isExpanded = !!expandedCourses[course.id];

                        return (
                            <div key={course.id} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                <div className="flex items-center justify-between px-6 py-4">
                                    <div className="flex cursor-pointer items-center gap-3" onClick={() => toggleExpanded(course.id)}>
                                        {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                {course.name}
                                                {course.code && (
                                                    <Badge variant="secondary" className="ml-2 font-mono text-xs">
                                                        {course.code}
                                                    </Badge>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {course.department && <>{course.department} · </>}
                                                {t('{count} batch(es)', { count: course.batches_count })}
                                                {course.total_semesters && <> · {t('{count} semesters', { count: course.total_semesters })}</>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => editCourse(course)}>
                                            {t('Edit')}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => deleteCourse(course)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="border-t px-6 py-4">
                                        <div className="mb-2 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('Batches')}</h3>
                                            <Button variant="outline" size="sm" onClick={() => setAddingBatchToCourseId(add => add === course.id ? null : course.id)}>
                                                <Plus className="mr-1 h-3.5 w-3.5" /> {t('Add Batch')}
                                            </Button>
                                        </div>
                                        {addingBatchToCourseId === course.id && (
                                            <form onSubmit={submitBatch} className="mb-4 flex items-end gap-3 rounded border p-3">
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-xs">{t('Batch Name *')}</Label>
                                                    <Input
                                                        value={batchName}
                                                        onChange={(e) => setBatchName(e.target.value)}
                                                        placeholder={t('e.g. FY 2026')}
                                                        required
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="w-40 space-y-1">
                                                    <Label className="text-xs">{t('Start Date')}</Label>
                                                    <Input
                                                        type="date"
                                                        value={batchStartDate}
                                                        onChange={(e) => setBatchStartDate(e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <Button type="submit" size="sm" disabled={batchSaving || !batchName} className="h-8">
                                                    {batchSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('Save')}
                                                </Button>
                                            </form>
                                        )}
                                        {course.batches.length === 0 ? (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('No batches yet.')}</p>
                                        ) : (
                                            <ul className="divide-y text-sm">
                                                {course.batches.map((batch) => (
                                                    <li key={batch.id} className="flex items-center justify-between py-2">
                                                        <div>
                                                            <span className="font-medium text-gray-800 dark:text-gray-200">{batch.name}</span>
                                                            {batch.start_date && (
                                                                <span className="ml-2 text-xs text-gray-500">{t('Started')} {batch.start_date}</span>
                                                            )}
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={() => deleteBatch(course.id, batch.id)}>
                                                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </DashboardLayout>
    );
}