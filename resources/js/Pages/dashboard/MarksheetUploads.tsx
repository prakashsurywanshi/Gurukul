import { FormEvent, useState } from 'react';
import { CheckCircle2, Clock, Download, FileDown, FileX, Loader2, Search, Trash2, Upload } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface StudentOption {
    id: number;
    name: string;
    roll_number?: string | null;
    class_id?: number | null;
}

interface ClassOption {
    id: number;
    name: string;
    section?: string | null;
}

interface ExamOption {
    id: number;
    name: string;
    exam_type?: string | null;
}

interface MarksheetRecord {
    id: number;
    title: string;
    original_name: string;
    size_bytes: number;
    status: string;
    created_at: string;
    student?: { id: number; name: string; roll_number?: string | null } | null;
    exam?: { id: number; name: string } | null;
}

interface MarksheetUploadsProps {
    user: any;
    uploads: MarksheetRecord[];
    classes: ClassOption[];
    students: StudentOption[];
    exams: ExamOption[];
    filters: { search: string; status: string; exam_id: number };
}

const STATUS_BADGE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    uploaded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    verified: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const ALL_EXAMS_VALUE = '__all__';

export default function MarksheetUploads(pageProps: MarksheetUploadsProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const uploads = pageProps.uploads ?? [];
    const classes = pageProps.classes ?? [];
    const students = pageProps.students ?? [];
    const exams = pageProps.exams ?? [];

    const [search, setSearch] = useState(pageProps.filters?.search ?? '');
    const [status, setStatus] = useState(pageProps.filters?.status ?? '');
    const [examFilter, setExamFilter] = useState(String(pageProps.filters?.exam_id ?? ''));
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [verifyingId, setVerifyingId] = useState<number | null>(null);
    const [form, setForm] = useState({
        class_id: '',
        student_id: '',
        exam_id: '',
        title: '',
    });
    const [file, setFile] = useState<File | null>(null);

    const canManage = ['admin', 'super_admin'].includes(pageProps.user?.role);

    const classStudents = form.class_id ? students.filter((s) => s.class_id === Number(form.class_id)) : students;

    const applyFilters = () => {
        router.get(
            '/marksheet/upload-list',
            { search, status, exam_id: examFilter },
            { preserveState: true, replace: true },
        );
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setSaving(true);
        const fd = new FormData();
        fd.append('student_id', form.student_id);
        fd.append('exam_id', form.exam_id);
        fd.append('title', form.title);
        fd.append('marksheet_file', file);
        router.post('/marksheet/upload', fd, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false),
            onFinish: () => setSaving(false),
        });
    };

    const remove = (record: MarksheetRecord) => {
        if (!window.confirm(t('Delete this marksheet upload?'))) return;
        setDeletingId(record.id);
        router.delete(`/marksheet/upload-list/${record.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const verify = (record: MarksheetRecord) => {
        setVerifyingId(record.id);
        router.post(
            `/marksheet/upload-list/${record.id}/verify`,
            {},
            { preserveScroll: true, onFinish: () => setVerifyingId(null) },
        );
    };

    return (
        <DashboardLayout user={pageProps.user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Upload Marksheet')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Upload a PDF marksheet for a student against an exam or term.')}
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={() => setShowModal(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            {t('Upload Marksheet')}
                        </Button>
                    )}
                </div>

                <Card>
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <Label>{t('Search')}</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    placeholder={t('Search by student or title...')}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="sm:w-44">
                            <Label>{t('Status')}</Label>
                            <select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    router.get(
                                        '/marksheet/upload-list',
                                        { search, status: e.target.value, exam_id: examFilter },
                                        { preserveState: true, replace: true },
                                    );
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">{t('All')}</option>
                                <option value="pending">{t('Pending')}</option>
                                <option value="uploaded">{t('Uploaded')}</option>
                                <option value="verified">{t('Verified')}</option>
                                <option value="failed">{t('Failed')}</option>
                            </select>
                        </div>
                        <div className="sm:w-52">
                            <Label>{t('Exam / Term')}</Label>
                            <Select
                                value={examFilter}
                                onValueChange={(value) => {
                                    const next = value === ALL_EXAMS_VALUE ? '' : value;
                                    setExamFilter(next);
                                    router.get(
                                        '/marksheet/upload-list',
                                        { search, status, exam_id: next },
                                        { preserveState: true, replace: true },
                                    );
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('All exams')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_EXAMS_VALUE}>{t('All exams')}</SelectItem>
                                    {exams.map((exam) => (
                                        <SelectItem key={exam.id} value={String(exam.id)}>
                                            {exam.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" onClick={applyFilters}>
                            {t('Filter')}
                        </Button>
                    </CardContent>
                </Card>

                <div className="overflow-hidden rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-700">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Student')}</TableHead>
                                <TableHead>{t('Title')}</TableHead>
                                <TableHead>{t('Exam')}</TableHead>
                                <TableHead>{t('Size')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead className="text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {uploads.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                        {t('No marksheets uploaded yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                uploads.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-gray-100">
                                                    {record.student?.name ?? '-'}
                                                </p>
                                                {record.student?.roll_number && (
                                                    <p className="text-xs text-gray-500">
                                                        {t('Roll No:')}
                                                        {record.student.roll_number}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="max-w-xs truncate font-medium text-gray-800 dark:text-gray-100">
                                                {record.title}
                                            </p>
                                            <p className="max-w-xs truncate text-xs text-gray-500">
                                                {record.original_name}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {record.exam?.name ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {record.size_bytes > 0
                                                ? `${(record.size_bytes / 1024).toFixed(0)} KB`
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={STATUS_BADGE[record.status] ?? ''}>
                                                {t(
                                                    record.status === 'uploaded'
                                                        ? 'Uploaded'
                                                        : record.status === 'verified'
                                                          ? 'Verified'
                                                          : record.status === 'failed'
                                                            ? 'Failed'
                                                            : 'Pending',
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button type="button" variant="ghost" size="sm" asChild>
                                                    <a
                                                        href={`/marksheet/upload-list/${record.id}/download`}
                                                        className="gap-1.5"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        {t('Download')}
                                                    </a>
                                                </Button>
                                                {canManage && record.status !== 'verified' && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => verify(record)}
                                                        disabled={verifyingId === record.id}
                                                        className="gap-1.5 text-green-600"
                                                    >
                                                        {verifyingId === record.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        )}
                                                        {t('Verify')}
                                                    </Button>
                                                )}
                                                {canManage && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => remove(record)}
                                                        disabled={deletingId === record.id}
                                                        className="text-red-600 hover:bg-red-50"
                                                    >
                                                        {deletingId === record.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:border dark:border-gray-700">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold">{t('Upload Marksheet')}</h2>
                            <p className="text-sm text-gray-500">
                                {t('Upload a PDF marksheet for a student against an exam or term.')}
                            </p>
                        </div>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <Label>{t('Class')} *</Label>
                                <Select
                                    value={form.class_id}
                                    onValueChange={(value) => setForm({ ...form, class_id: value, student_id: '' })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder={t('Select class')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.section ? `${c.name} - ${c.section}` : c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Student')} *</Label>
                                <Select
                                    value={form.student_id}
                                    onValueChange={(value) => setForm({ ...form, student_id: value })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder={t('Select student')} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72">
                                        {classStudents.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                                {s.roll_number ? ` (${s.roll_number})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors?.student_id && <p className="mt-1 text-sm text-red-500">{errors.student_id}</p>}
                            </div>
                            <div>
                                <Label>{t('Exam / Term Link')} *</Label>
                                <Select
                                    value={form.exam_id}
                                    onValueChange={(value) => setForm({ ...form, exam_id: value })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder={t('Select exam / term')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exams.map((exam) => (
                                            <SelectItem key={exam.id} value={String(exam.id)}>
                                                {exam.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors?.exam_id && <p className="mt-1 text-sm text-red-500">{errors.exam_id}</p>}
                            </div>
                            <div>
                                <Label>{t('Document Title')} *</Label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder={t('e.g. Final Term Marksheet')}
                                    className="mt-1"
                                    required
                                />
                            </div>
                            <div>
                                <Label>{t('Marksheet PDF File')} *</Label>
                                <Input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                    className="mt-1"
                                    required
                                />
                                {errors?.marksheet_file && (
                                    <p className="mt-1 text-sm text-red-500">{errors.marksheet_file}</p>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving || !file}>
                                    {saving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="mr-2 h-4 w-4" />
                                    )}
                                    {t('Upload')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
