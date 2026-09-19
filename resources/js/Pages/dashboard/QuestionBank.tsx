import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { HelpCircle, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import type { RequestPayload } from '@inertiajs/core';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';

interface QuestionRow {
    id: string;
    question: string;
    type: string;
    options?: string[] | null;
    correct_answer?: string | null;
    marks: number;
    difficulty: string;
    class_id?: string | null;
    subject_id?: string | null;
    class?: string | null;
    subject?: string | null;
    is_active: boolean;
    created_by?: string | null;
}

interface OptionItem {
    id: string;
    name: string;
    label: string;
}

interface QuestionBankProps {
    user: any;
    organization?: any;
    questions: QuestionRow[];
    classes: OptionItem[];
    subjects: OptionItem[];
    selectedClassId?: string | null;
    selectedSubjectId?: string | null;
    selectedType?: string | null;
}

const TYPE_BADGE: Record<string, string> = {
    mcq: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    subjective: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    descriptive: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const DIFF_BADGE: Record<string, string> = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export default function QuestionBank(pageProps: QuestionBankProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const questions = pageProps.questions ?? [];
    const classes = pageProps.classes ?? [];
    const subjects = pageProps.subjects ?? [];

    const [selectedClassId, setSelectedClassId] = useState(pageProps.selectedClassId ?? '');
    const [selectedSubjectId, setSelectedSubjectId] = useState(pageProps.selectedSubjectId ?? '');
    const [selectedType, setSelectedType] = useState(pageProps.selectedType ?? '');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<QuestionRow | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        class_id: '',
        subject_id: '',
        type: 'subjective',
        question: '',
        marks: '1',
        difficulty: 'medium',
        correct_answer: '',
        is_active: true,
    });
    const [options, setOptions] = useState<string[]>(['', '', '', '']);

    const filter = (data: Record<string, string>) => {
        const next = { class_id: selectedClassId, subject_id: selectedSubjectId, type: selectedType, ...data };
        if ('class_id' in data) setSelectedClassId(data.class_id);
        if ('subject_id' in data) setSelectedSubjectId(data.subject_id);
        if ('type' in data) setSelectedType(data.type);
        router.visit('/question-bank', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            data: next,
            only: ['questions'],
        });
    };

    const payload = () => {
        const p: Record<string, unknown> = {
            class_id: form.class_id,
            subject_id: form.subject_id,
            type: form.type,
            question: form.question,
            marks: Number(form.marks),
            difficulty: form.difficulty,
            correct_answer: form.correct_answer,
            is_active: form.is_active,
        };
        if (form.type === 'mcq') p.options = options.filter((o) => o.trim() !== '');
        return p;
    };

    const openCreate = () => {
        setEditing(null);
        setForm({
            class_id: '',
            subject_id: '',
            type: 'subjective',
            question: '',
            marks: '1',
            difficulty: 'medium',
            correct_answer: '',
            is_active: true,
        });
        setOptions(['', '', '', '']);
        setShowModal(true);
    };

    const openEdit = (q: QuestionRow) => {
        setEditing(q);
        setForm({
            class_id: q.class_id ?? '',
            subject_id: q.subject_id ?? '',
            type: q.type,
            question: q.question,
            marks: String(q.marks),
            difficulty: q.difficulty,
            correct_answer: q.correct_answer ?? '',
            is_active: q.is_active,
        });
        setOptions(q.options && q.options.length ? q.options : ['', '', '', '']);
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const url = editing ? `/question-bank/${editing.id}` : '/question-bank';
        const method = editing ? 'patch' : 'post';
        const options = {
            preserveScroll: true,
            onSuccess: () => setShowModal(false),
            onFinish: () => setSaving(false),
        };
        if (editing) {
            router.patch(url, payload() as RequestPayload, options);
        } else {
            router.post(url, payload() as RequestPayload, options);
        }
    };

    const remove = (q: QuestionRow) => {
        if (!window.confirm(t('Delete this question?'))) return;
        setDeletingId(q.id);
        router.delete(`/question-bank/${q.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Question Bank')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Create and organize questions by subject and difficulty for reuse in exams.')}
                        </p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('Add Question')}
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-blue-500" />
                            {t('Filter')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                                <Label>{t('Class')}</Label>
                                <Select value={selectedClassId} onValueChange={(v) => filter({ class_id: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All classes')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((cls) => (
                                            <SelectItem key={cls.id} value={cls.id}>
                                                {cls.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Subject')}</Label>
                                <Select value={selectedSubjectId} onValueChange={(v) => filter({ subject_id: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All subjects')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((sub) => (
                                            <SelectItem key={sub.id} value={sub.id}>
                                                {sub.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('Type')}</Label>
                                <Select value={selectedType} onValueChange={(v) => filter({ type: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All types')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mcq">{t('MCQ')}</SelectItem>
                                        <SelectItem value="subjective">{t('Subjective')}</SelectItem>
                                        <SelectItem value="descriptive">{t('Descriptive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        {questions.length === 0 ? (
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                <HelpCircle className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                {t('No questions in the bank yet.')}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Question')}</TableHead>
                                        <TableHead>{t('Type')}</TableHead>
                                        <TableHead>{t('Difficulty')}</TableHead>
                                        <TableHead>{t('Class')}</TableHead>
                                        <TableHead>{t('Subject')}</TableHead>
                                        <TableHead>{t('Marks')}</TableHead>
                                        <TableHead className="text-right">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {questions.map((q) => (
                                        <TableRow key={q.id}>
                                            <TableCell>
                                                <p className="max-w-sm font-medium text-gray-900 dark:text-white">
                                                    {q.question}
                                                </p>
                                                {q.type === 'mcq' && q.options && q.options.length > 0 && (
                                                    <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                                                        {q.options.filter(Boolean).join(' | ')}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={TYPE_BADGE[q.type] ?? ''}>
                                                    {t(i18nType(q.type))}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={DIFF_BADGE[q.difficulty] ?? ''}>
                                                    {t(i18nDiff(q.difficulty))}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{q.class ?? '—'}</TableCell>
                                            <TableCell className="text-sm">{q.subject ?? '—'}</TableCell>
                                            <TableCell className="text-sm">{q.marks}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button size="icon" variant="ghost" onClick={() => openEdit(q)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => remove(q)}
                                                        disabled={deletingId === q.id}
                                                    >
                                                        {deletingId === q.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editing ? t('Edit Question') : t('Add Question')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Class')}</Label>
                                    <Select
                                        value={form.class_id}
                                        onValueChange={(v) => setForm({ ...form, class_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All classes')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map((cls) => (
                                                <SelectItem key={cls.id} value={cls.id}>
                                                    {cls.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Subject')}</Label>
                                    <Select
                                        value={form.subject_id}
                                        onValueChange={(v) => setForm({ ...form, subject_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All subjects')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjects.map((sub) => (
                                                <SelectItem key={sub.id} value={sub.id}>
                                                    {sub.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <Label>{t('Type')} *</Label>
                                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mcq">{t('MCQ')}</SelectItem>
                                            <SelectItem value="subjective">{t('Subjective')}</SelectItem>
                                            <SelectItem value="descriptive">{t('Descriptive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Difficulty')} *</Label>
                                    <Select
                                        value={form.difficulty}
                                        onValueChange={(v) => setForm({ ...form, difficulty: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="easy">{t('Easy')}</SelectItem>
                                            <SelectItem value="medium">{t('Medium')}</SelectItem>
                                            <SelectItem value="hard">{t('Hard')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Marks')} *</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={form.marks}
                                        onChange={(e) => setForm({ ...form, marks: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('Question')} *</Label>
                                <Textarea
                                    value={form.question}
                                    onChange={(e) => setForm({ ...form, question: e.target.value })}
                                    rows={2}
                                    required
                                />
                                {errors.question && <p className="mt-1 text-xs text-red-500">{errors.question}</p>}
                            </div>
                            {form.type === 'mcq' && (
                                <div className="space-y-2">
                                    <Label>{t('Options')}</Label>
                                    {options.map((opt, i) => (
                                        <Input
                                            key={i}
                                            value={opt}
                                            onChange={(e) => {
                                                const next = [...options];
                                                next[i] = e.target.value;
                                                setOptions(next);
                                            }}
                                            placeholder={`${t('Option')} ${i + 1}`}
                                        />
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setOptions([...options, ''])}
                                    >
                                        <Plus className="mr-1 h-3 w-3" />
                                        {t('Add Option')}
                                    </Button>
                                </div>
                            )}
                            <div>
                                <Label>{form.type === 'mcq' ? t('Correct Answer') : t('Answer Key')}</Label>
                                <Textarea
                                    value={form.correct_answer}
                                    onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editing ? t('Save Changes') : t('Add Question')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

function i18nType(type: string): string {
    const map: Record<string, string> = { mcq: 'MCQ', subjective: 'Subjective', descriptive: 'Descriptive' };
    return map[type] ?? type;
}

function i18nDiff(diff: string): string {
    const map: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    return map[diff] ?? diff;
}
