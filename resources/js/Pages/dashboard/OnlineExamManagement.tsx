import { useLanguage } from '../../i18n/LanguageProvider';
import React, { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Download,
    Eye,
    Pencil,
    Plus,
    Search,
    Trash2,
    Upload,
} from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { formatDateTime, OnlineExamQuestion, OnlineExamRecord, OnlineQuestionType } from './studentOnlineExamData';

interface OnlineExamManagementProps {
    user: any;
    onlineExams: OnlineExamRecord[];
    classOptions: string[];
    sectionOptions: string[];
    classSectionOptions: {
        className: string;
        section: string;
        label: string;
        value: string;
    }[];
}

const createOnlineQuestion = (type: OnlineQuestionType = 'mcq'): OnlineExamQuestion => ({
    id: `online_question_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    question: '',
    options: type === 'true_false' ? ['True', 'False'] : ['', '', '', ''],
    correctAnswer: '',
    marks: '1',
});

const createOnlineExamForm = () => ({
    title: '',
    subject: '',
    className: '',
    section: '',
    duration: '60',
    startTime: '',
    endTime: '',
    negativeMarkingEnabled: false,
    negativeMarks: '0',
    shuffleQuestions: false,
    status: 'draft' as 'draft' | 'published',
});

const parseCsvLine = (line: string) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
};

const resolveImportedCorrectAnswer = (rawCorrectAnswer: string, type: OnlineQuestionType, options: string[]) => {
    const normalizedAnswer = rawCorrectAnswer.trim();
    if (!normalizedAnswer) {
        return '';
    }

    if (type === 'true_false') {
        const value = normalizedAnswer.toLowerCase();
        if (['true', 't', '1', 'yes'].includes(value)) {
            return 'True';
        }

        if (['false', 'f', '0', 'no'].includes(value)) {
            return 'False';
        }
    }

    const cleanedOptions = options.map((option) => option.trim());
    const upperAnswer = normalizedAnswer.toUpperCase();

    if (['A', 'B', 'C', 'D'].includes(upperAnswer)) {
        return cleanedOptions[upperAnswer.charCodeAt(0) - 65] || '';
    }

    if (['1', '2', '3', '4'].includes(normalizedAnswer)) {
        return cleanedOptions[Number(normalizedAnswer) - 1] || '';
    }

    return cleanedOptions.find((option) => option.toLowerCase() === normalizedAnswer.toLowerCase()) || normalizedAnswer;
};

const buildImportedQuestion = (rawQuestion: Record<string, unknown>) => {
    const typeValue = String(rawQuestion.question_type || rawQuestion.type || 'mcq').toLowerCase();
    const type: OnlineQuestionType = typeValue === 'true_false' ? 'true_false' : 'mcq';
    const questionText = String(rawQuestion.question_text || rawQuestion.question || '').trim();
    const marks = String(rawQuestion.marks || '1').trim();
    const optionA = String(rawQuestion.option_a || rawQuestion.a || '').trim();
    const optionB = String(rawQuestion.option_b || rawQuestion.b || '').trim();
    const optionC = String(rawQuestion.option_c || rawQuestion.c || '').trim();
    const optionD = String(rawQuestion.option_d || rawQuestion.d || '').trim();
    const options = type === 'true_false' ? ['True', 'False'] : [optionA, optionB, optionC, optionD];
    const correctAnswer = resolveImportedCorrectAnswer(
        String(rawQuestion.correct_answer || rawQuestion.answer || ''),
        type,
        options,
    );

    const hasValidOptions = type === 'true_false' || options.every((option) => option.trim());
    const hasValidMarks = Number(marks) > 0;
    const hasValidCorrectAnswer = options.some((option) => option.trim() === correctAnswer.trim());

    if (!questionText || !hasValidOptions || !hasValidMarks || !hasValidCorrectAnswer) {
        return null;
    }

    return {
        ...createOnlineQuestion(type),
        question: questionText,
        options,
        correctAnswer,
        marks,
    };
};

export default function OnlineExamManagement({
    user,
    onlineExams,
    classOptions,
    sectionOptions,
    classSectionOptions,
}: OnlineExamManagementProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const canManageOnlineExams = ['super_admin', 'admin', 'teacher'].includes(user.role);
    const [showOnlineExamBuilder, setShowOnlineExamBuilder] = useState(false);
    const [editingOnlineExamId, setEditingOnlineExamId] = useState<string | null>(null);
    const [onlineExamForm, setOnlineExamForm] = useState(createOnlineExamForm);
    const [onlineQuestions, setOnlineQuestions] = useState<OnlineExamQuestion[]>([createOnlineQuestion()]);
    const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
    const [assignmentClass, setAssignmentClass] = useState('');
    const [assignmentSection, setAssignmentSection] = useState('');
    const [questionSource, setQuestionSource] = useState<'manual' | 'import'>('manual');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingExam, setViewingExam] = useState<OnlineExamRecord | null>(null);
    const onlineQuestionImportRef = useRef<HTMLInputElement | null>(null);

    const filteredOnlineExams = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        if (!normalizedSearch) {
            return onlineExams;
        }

        return onlineExams.filter((exam) =>
            [exam.title, exam.subject, exam.className, exam.section, exam.status].some((value) =>
                String(value).toLowerCase().includes(normalizedSearch),
            ),
        );
    }, [onlineExams, searchTerm]);

    const stats = useMemo(() => {
        const totalExams = onlineExams.length;
        const publishedExams = onlineExams.filter((exam) => exam.status === 'published').length;
        const draftExams = onlineExams.filter((exam) => exam.status === 'draft').length;
        const totalQuestions = onlineExams.reduce((sum, exam) => sum + exam.questions.length, 0);

        return { totalExams, publishedExams, draftExams, totalQuestions };
    }, [onlineExams]);

    const totalMarks = useMemo(
        () => onlineQuestions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0),
        [onlineQuestions],
    );

    const resetOnlineExamBuilder = () => {
        setEditingOnlineExamId(null);
        setOnlineExamForm(createOnlineExamForm());
        setOnlineQuestions([createOnlineQuestion()]);
        setSelectedAssignments([]);
        setAssignmentClass('');
        setAssignmentSection('');
        setQuestionSource('manual');
    };

    const assignmentSectionOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    classSectionOptions
                        .filter((opt) => !assignmentClass || opt.className === assignmentClass)
                        .map((opt) => opt.section),
                ),
            ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        [classSectionOptions, assignmentClass],
    );

    const addAssignment = () => {
        if (!assignmentClass || !assignmentSection) {
            toast.error('Select class and section first');
            return;
        }
        const value = `${assignmentClass}::${assignmentSection}`;
        if (!selectedAssignments.includes(value)) {
            setSelectedAssignments((current) => [...current, value]);
        }
        setAssignmentClass('');
        setAssignmentSection('');
    };

    const removeAssignment = (value: string) => {
        setSelectedAssignments((current) => current.filter((item) => item !== value));
    };

    const openOnlineExamEditor = (exam?: OnlineExamRecord) => {
        if (exam) {
            setEditingOnlineExamId(exam.id);
            setOnlineExamForm({
                title: exam.title,
                subject: exam.subject,
                className: exam.className,
                section: exam.section,
                duration: exam.duration,
                startTime: exam.startTime,
                endTime: exam.endTime,
                negativeMarkingEnabled: exam.negativeMarkingEnabled,
                negativeMarks: exam.negativeMarks,
                shuffleQuestions: exam.shuffleQuestions,
                status: exam.status,
            });
            setOnlineQuestions(exam.questions.length > 0 ? exam.questions : [createOnlineQuestion()]);
            setSelectedAssignments(
                (exam.targetClassSections || []).map((assignment) => `${assignment.className}::${assignment.section}`),
            );
        } else {
            resetOnlineExamBuilder();
        }

        setShowOnlineExamBuilder(true);
    };

    const addOnlineQuestion = (type: OnlineQuestionType) => {
        setOnlineQuestions((current) => [...current, createOnlineQuestion(type)]);
    };

    const updateOnlineQuestion = (
        questionId: string,
        key: keyof OnlineExamQuestion,
        value: string | string[] | OnlineQuestionType,
    ) => {
        setOnlineQuestions((current) =>
            current.map((question) => {
                if (question.id !== questionId) {
                    return question;
                }

                if (key === 'type') {
                    const nextType = value as OnlineQuestionType;
                    return {
                        ...question,
                        type: nextType,
                        options: nextType === 'true_false' ? ['True', 'False'] : ['', '', '', ''],
                        correctAnswer: '',
                    };
                }

                return {
                    ...question,
                    [key]: value,
                };
            }),
        );
    };

    const updateOnlineQuestionOption = (questionId: string, optionIndex: number, value: string) => {
        setOnlineQuestions((current) =>
            current.map((question) => {
                if (question.id !== questionId) {
                    return question;
                }

                const nextOptions = question.options.map((option, index) => (index === optionIndex ? value : option));
                const hasMatchingAnswer = nextOptions.some((option) => option.trim() === question.correctAnswer.trim());

                return {
                    ...question,
                    options: nextOptions,
                    correctAnswer: hasMatchingAnswer ? question.correctAnswer : '',
                };
            }),
        );
    };

    const removeOnlineQuestion = (questionId: string) => {
        setOnlineQuestions((current) =>
            current.length === 1 ? current : current.filter((question) => question.id !== questionId),
        );
    };

    const saveOnlineExam = (event: FormEvent) => {
        event.preventDefault();

        if (!onlineExamForm.title.trim()) {
            toast.error('Please enter exam title');
            return;
        }

        if (selectedAssignments.length === 0) {
            toast.error('Please select at least one class section');
            return;
        }

        if (!onlineExamForm.duration || Number(onlineExamForm.duration) <= 0) {
            toast.error('Please enter a valid exam duration');
            return;
        }

        if (
            !onlineExamForm.startTime ||
            !onlineExamForm.endTime ||
            onlineExamForm.startTime >= onlineExamForm.endTime
        ) {
            toast.error('End time must be after start time');
            return;
        }

        if (onlineExamForm.negativeMarkingEnabled && Number(onlineExamForm.negativeMarks) < 0) {
            toast.error('Negative marking value cannot be negative');
            return;
        }

        const validQuestions = onlineQuestions.filter((question) => {
            const hasQuestion = question.question.trim();
            const hasMarks = Number(question.marks) > 0;
            const hasValidOptions =
                question.type === 'true_false' ? true : question.options.slice(0, 4).every((option) => option.trim());
            const hasCorrectAnswer = question.correctAnswer.trim();

            return hasQuestion && hasMarks && hasValidOptions && hasCorrectAnswer;
        });

        if (validQuestions.length === 0) {
            toast.error('Add at least one valid question');
            return;
        }

        const payload = {
            ...onlineExamForm,
            className: '',
            section: '',
            targetClassSections: selectedAssignments.map((assignment) => {
                const [className, section] = assignment.split('::');
                return { className, section };
            }),
            duration: Number(onlineExamForm.duration),
            negativeMarks: Number(onlineExamForm.negativeMarks || 0),
            questions: validQuestions,
        };

        const submit = editingOnlineExamId
            ? () =>
                  router.patch(`/online-exams/${editingOnlineExamId}`, payload, {
                      preserveScroll: true,
                      onSuccess: () => {
                          setShowOnlineExamBuilder(false);
                          resetOnlineExamBuilder();
                          toast.success('Online exam updated successfully');
                      },
                  })
            : () =>
                  router.post('/online-exams', payload, {
                      preserveScroll: true,
                      onSuccess: () => {
                          setShowOnlineExamBuilder(false);
                          resetOnlineExamBuilder();
                          toast.success('Online exam created successfully');
                      },
                  });

        submit();
    };

    const deleteOnlineExam = (examId: string) => {
        const confirmed = window.confirm('Delete this online exam?');
        if (!confirmed) {
            return;
        }

        router.delete(`/online-exams/${examId}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (editingOnlineExamId === examId) {
                    setShowOnlineExamBuilder(false);
                    resetOnlineExamBuilder();
                }
                toast.success('Online exam deleted successfully');
            },
        });
    };

    const handleOnlineQuestionImport = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const content = String(reader.result || '').trim();
            if (!content) {
                toast.error('Selected CSV file is empty');
                event.target.value = '';
                return;
            }

            const lines = content.split(/\r?\n/).filter(Boolean);
            if (lines.length < 2) {
                toast.error('CSV must include header and at least one question row');
                event.target.value = '';
                return;
            }

            const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
            const importedQuestions = lines
                .slice(1)
                .map((line) => {
                    const row = parseCsvLine(line);
                    const rawQuestion = headers.reduce<Record<string, string>>((acc, header, index) => {
                        acc[header] = row[index] || '';
                        return acc;
                    }, {});

                    return buildImportedQuestion(rawQuestion);
                })
                .filter(Boolean) as OnlineExamQuestion[];

            if (importedQuestions.length === 0) {
                toast.error('No valid questions found in CSV');
                event.target.value = '';
                return;
            }

            setOnlineQuestions((current) => {
                const onlyBlankStarter =
                    current.length === 1 &&
                    !current[0].question.trim() &&
                    current[0].options.every((option) => !option.trim()) &&
                    !current[0].correctAnswer.trim();

                return onlyBlankStarter ? importedQuestions : [...current, ...importedQuestions];
            });

            toast.success(`${importedQuestions.length} question${importedQuestions.length === 1 ? '' : 's'} imported`);
            event.target.value = '';
        };

        reader.readAsText(file);
    };

    const downloadOnlineQuestionSample = () => {
        const headers = [
            'question_type',
            'question_text',
            'option_a',
            'option_b',
            'option_c',
            'option_d',
            'correct_answer',
            'marks',
        ];

        const rows = [
            ['mcq', 'What is 2 + 2?', '2', '3', '4', '5', '4', '1'],
            ['mcq', 'Which planet is known as the Red Planet?', 'Earth', 'Mars', 'Jupiter', 'Venus', 'B', '2'],
            ['true_false', 'The earth revolves around the sun.', 'True', 'False', '', '', 'True', '1'],
        ];

        const csvContent = [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'online-exam-questions-sample.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Sample CSV downloaded');
    };

    return (
        <DashboardLayout user={user} activeTab="online-exams">
            <div className="space-y-5 p-3 md:p-4 lg:p-5">
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

                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-3xl font-bold text-slate-900">{t('Online Exams')}</h1>
                        <p className="mt-1 max-w-3xl text-sm text-slate-600">
                            {t(
                                'Create class-wise online exams, import questions in bulk, and publish them for students to attend.',
                            )}
                        </p>
                    </div>

                    {canManageOnlineExams ? (
                        <Button type="button" className="shrink-0 gap-2" onClick={() => openOnlineExamEditor()}>
                            <Plus className="h-4 w-4" />
                            {t('Create Quiz')}
                        </Button>
                    ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">{t('Total Quizzes')}</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalExams}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">{t('Published')}</p>
                            <p className="mt-2 text-2xl font-bold text-emerald-600">{stats.publishedExams}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">{t('Draft')}</p>
                            <p className="mt-2 text-2xl font-bold text-blue-600">{stats.draftExams}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">{t('Questions Banked')}</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalQuestions}</p>
                        </CardContent>
                    </Card>
                </div>

                {classSectionOptions.length === 0 ? (
                    <Card>
                        <CardContent className="py-6 text-sm text-slate-600">
                            {t('Create class and section records first so online exams can be assigned correctly.')}
                        </CardContent>
                    </Card>
                ) : null}

                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>{t('Quiz Builder')}</CardTitle>
                            <p className="mt-1 text-sm text-slate-500">
                                {t(
                                    'Define exam details, add questions manually or via CSV, and save the paper in one place.',
                                )}
                            </p>
                        </div>
                        {!showOnlineExamBuilder && canManageOnlineExams ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={() => openOnlineExamEditor()}
                            >
                                <Plus className="h-4 w-4" />
                                {t('Start Builder')}
                            </Button>
                        ) : null}
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {showOnlineExamBuilder ? (
                            <form onSubmit={saveOnlineExam} className="grid gap-6 lg:grid-cols-3">
                                <div className="space-y-6 lg:col-span-2">
                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="mb-5 flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-xl font-semibold text-slate-900">
                                                    {editingOnlineExamId
                                                        ? t('Edit Online Exam')
                                                        : t('Create Online Exam')}
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {t(
                                                        'Set the exam title, audience, status, and schedule before publishing it.',
                                                    )}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setShowOnlineExamBuilder(false);
                                                    resetOnlineExamBuilder();
                                                }}
                                            >
                                                {t('Cancel')}
                                            </Button>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>{t('Exam Title')}</Label>
                                                <Input
                                                    value={onlineExamForm.title}
                                                    onChange={(e) =>
                                                        setOnlineExamForm((current) => ({
                                                            ...current,
                                                            title: e.target.value,
                                                        }))
                                                    }
                                                    placeholder={t('e.g., Mathematics Weekly Quiz')}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Status')}</Label>
                                                <Select
                                                    value={onlineExamForm.status}
                                                    onValueChange={(value) =>
                                                        setOnlineExamForm((current) => ({
                                                            ...current,
                                                            status: value as 'draft' | 'published',
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('Select status')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="draft">{t('Draft')}</SelectItem>
                                                        <SelectItem value="published">{t('Published')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2 md:col-span-3">
                                                <Label>{t('Assign Class Sections')}</Label>
                                                <div className="flex gap-2">
                                                    <Select
                                                        value={assignmentClass}
                                                        onValueChange={(value) => {
                                                            setAssignmentClass(value);
                                                            const firstSection =
                                                                classSectionOptions
                                                                    .filter((opt) => opt.className === value)
                                                                    .map((opt) => opt.section)
                                                                    .sort((a, b) =>
                                                                        a.localeCompare(b, undefined, {
                                                                            numeric: true,
                                                                        }),
                                                                    )[0] || '';
                                                            setAssignmentSection(firstSection);
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Select class')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {classOptions.map((cls) => (
                                                                <SelectItem key={cls} value={cls}>
                                                                    {cls}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select
                                                        value={assignmentSection}
                                                        onValueChange={setAssignmentSection}
                                                        disabled={!assignmentClass}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Select section')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {assignmentSectionOptions.map((section) => (
                                                                <SelectItem key={section} value={section}>
                                                                    {section}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button type="button" variant="outline" onClick={addAssignment}>
                                                        {t('Add')}
                                                    </Button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
                                                    {selectedAssignments.length > 0 ? (
                                                        selectedAssignments.map((assignment) => {
                                                            const [cls, sec] = assignment.split('::');
                                                            return (
                                                                <Badge
                                                                    key={assignment}
                                                                    variant="secondary"
                                                                    className="cursor-pointer"
                                                                    onClick={() => removeAssignment(assignment)}
                                                                >
                                                                    {cls} - {sec}
                                                                </Badge>
                                                            );
                                                        })
                                                    ) : (
                                                        <p className="text-sm text-slate-500">
                                                            {t('No class sections assigned yet.')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h4 className="text-base font-semibold text-slate-900">
                                                    {t('Questions')}
                                                </h4>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {t(
                                                        'Add MCQ or true/false questions manually, or import them in the sample CSV format.',
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    variant={questionSource === 'manual' ? 'default' : 'outline'}
                                                    onClick={() => setQuestionSource('manual')}
                                                >
                                                    {t('Manual')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={questionSource === 'import' ? 'default' : 'outline'}
                                                    onClick={() => setQuestionSource('import')}
                                                >
                                                    {t('Import CSV')}
                                                </Button>
                                            </div>
                                        </div>

                                        {questionSource === 'manual' ? (
                                            <div className="space-y-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="gap-2"
                                                        onClick={() => addOnlineQuestion('mcq')}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        {t('Add MCQ')}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="gap-2"
                                                        onClick={() => addOnlineQuestion('true_false')}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        {t('Add True / False')}
                                                    </Button>
                                                </div>

                                                {onlineQuestions.map((question, index) => (
                                                    <div
                                                        key={question.id}
                                                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                                    >
                                                        <div className="mb-4 flex items-start justify-between gap-3">
                                                            <div className="flex items-start gap-3">
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                                                                    {index + 1}
                                                                </div>
                                                                <div>
                                                                    <h5 className="font-medium text-slate-900">
                                                                        {t('Question')}
                                                                        {index + 1}
                                                                    </h5>
                                                                    <p className="text-sm text-slate-500 capitalize">
                                                                        {question.type.replace('_', ' / ')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Select
                                                                    value={question.type}
                                                                    onValueChange={(value) =>
                                                                        updateOnlineQuestion(
                                                                            question.id,
                                                                            'type',
                                                                            value as OnlineQuestionType,
                                                                        )
                                                                    }
                                                                >
                                                                    <SelectTrigger className="w-[150px] bg-white">
                                                                        <SelectValue placeholder={t('Type')} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="mcq">{t('MCQ')}</SelectItem>
                                                                        <SelectItem value="true_false">
                                                                            {t('True / False')}
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                {onlineQuestions.length > 1 ? (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            removeOnlineQuestion(question.id)
                                                                        }
                                                                    >
                                                                        <Trash2 className="h-4 w-4 text-rose-600" />
                                                                    </Button>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <Label>{t('Question')}</Label>
                                                                <Textarea
                                                                    value={question.question}
                                                                    onChange={(e) =>
                                                                        updateOnlineQuestion(
                                                                            question.id,
                                                                            'question',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    placeholder={t('Enter your question here...')}
                                                                />
                                                            </div>

                                                            <div className="grid gap-4 md:grid-cols-2">
                                                                {question.options.map((option, optionIndex) => (
                                                                    <div
                                                                        key={`${question.id}_${optionIndex}`}
                                                                        className="space-y-2"
                                                                    >
                                                                        <Label>
                                                                            {question.type === 'true_false'
                                                                                ? optionIndex === 0
                                                                                    ? t('Option: True')
                                                                                    : t('Option: False')
                                                                                : `Option ${String.fromCharCode(65 + optionIndex)}`}
                                                                        </Label>
                                                                        <Input
                                                                            value={option}
                                                                            disabled={question.type === 'true_false'}
                                                                            onChange={(e) =>
                                                                                updateOnlineQuestionOption(
                                                                                    question.id,
                                                                                    optionIndex,
                                                                                    e.target.value,
                                                                                )
                                                                            }
                                                                            className="bg-white"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <div className="grid gap-4 md:grid-cols-2">
                                                                <div className="space-y-2">
                                                                    <Label>{t('Correct Answer')}</Label>
                                                                    <Select
                                                                        value={question.correctAnswer}
                                                                        onValueChange={(value) =>
                                                                            updateOnlineQuestion(
                                                                                question.id,
                                                                                'correctAnswer',
                                                                                value,
                                                                            )
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="bg-white">
                                                                            <SelectValue
                                                                                placeholder={t('Select correct answer')}
                                                                            />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {question.options
                                                                                .filter((option) => option.trim())
                                                                                .map((option) => (
                                                                                    <SelectItem
                                                                                        key={`${question.id}_${option}`}
                                                                                        value={option}
                                                                                    >
                                                                                        {option}
                                                                                    </SelectItem>
                                                                                ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>{t('Marks')}</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        value={question.marks}
                                                                        onChange={(e) =>
                                                                            updateOnlineQuestion(
                                                                                question.id,
                                                                                'marks',
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                        className="bg-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <input
                                                    ref={onlineQuestionImportRef}
                                                    type="file"
                                                    accept=".csv"
                                                    className="hidden"
                                                    onChange={handleOnlineQuestionImport}
                                                />

                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="gap-2"
                                                        onClick={() => onlineQuestionImportRef.current?.click()}
                                                    >
                                                        <Upload className="h-4 w-4" />
                                                        {t('Import Questions CSV')}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="gap-2"
                                                        onClick={downloadOnlineQuestionSample}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                        {t('Download Sample CSV')}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    {t(
                                                        'CSV format: question_type, question_text, option_a, option_b, option_c, option_d, correct_answer, marks',
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        <div className="mt-6 space-y-3">
                                            {onlineQuestions.map((question, index) => (
                                                <div
                                                    key={`summary_${question.id}`}
                                                    className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4"
                                                >
                                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-900">
                                                            {question.question.trim() || t('Untitled question')}
                                                        </p>
                                                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                                            <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">
                                                                {question.type === 'mcq' ? t('MCQ') : t('True / False')}
                                                            </span>
                                                            <span>
                                                                {t('Marks:')}
                                                                {question.marks || '0'}
                                                            </span>
                                                            <span>
                                                                {t('Correct:')}
                                                                {question.correctAnswer || t('Not set')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <h4 className="mb-4 text-base font-semibold text-slate-900">
                                            {t('Exam Settings')}
                                        </h4>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>{t('Duration (minutes)')}</Label>
                                                <div className="relative">
                                                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={onlineExamForm.duration}
                                                        onChange={(e) =>
                                                            setOnlineExamForm((current) => ({
                                                                ...current,
                                                                duration: e.target.value,
                                                            }))
                                                        }
                                                        className="pl-10"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Negative Marks Value')}</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.25"
                                                    disabled={!onlineExamForm.negativeMarkingEnabled}
                                                    value={onlineExamForm.negativeMarks}
                                                    onChange={(e) =>
                                                        setOnlineExamForm((current) => ({
                                                            ...current,
                                                            negativeMarks: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                                            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={onlineExamForm.negativeMarkingEnabled}
                                                    onChange={(e) =>
                                                        setOnlineExamForm((current) => ({
                                                            ...current,
                                                            negativeMarkingEnabled: e.target.checked,
                                                        }))
                                                    }
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />

                                                <div>
                                                    <div className="font-medium text-slate-900">
                                                        {t('Enable Negative Marking')}
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {t('Deduct marks for wrong answers.')}
                                                    </div>
                                                </div>
                                            </label>
                                            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={onlineExamForm.shuffleQuestions}
                                                    onChange={(e) =>
                                                        setOnlineExamForm((current) => ({
                                                            ...current,
                                                            shuffleQuestions: e.target.checked,
                                                        }))
                                                    }
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />

                                                <div>
                                                    <div className="font-medium text-slate-900">
                                                        {t('Shuffle Questions')}
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {t('Randomize question order for students.')}
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <h4 className="mb-4 text-base font-semibold text-slate-900">
                                            {t('Schedule Exam')}
                                        </h4>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>{t('Start Time')}</Label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <Input
                                                        type="datetime-local"
                                                        value={onlineExamForm.startTime}
                                                        onChange={(e) =>
                                                            setOnlineExamForm((current) => ({
                                                                ...current,
                                                                startTime: e.target.value,
                                                            }))
                                                        }
                                                        className="pl-10"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('End Time')}</Label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <Input
                                                        type="datetime-local"
                                                        value={onlineExamForm.endTime}
                                                        onChange={(e) =>
                                                            setOnlineExamForm((current) => ({
                                                                ...current,
                                                                endTime: e.target.value,
                                                            }))
                                                        }
                                                        className="pl-10"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-1">
                                    <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <h4 className="mb-4 text-base font-semibold text-slate-900">
                                            {t('Exam Summary')}
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="rounded-lg bg-blue-50 p-4">
                                                <div className="text-2xl font-bold text-blue-700">
                                                    {onlineQuestions.length}
                                                </div>
                                                <div className="text-sm text-blue-700">{t('Total Questions')}</div>
                                            </div>
                                            <div className="rounded-lg bg-emerald-50 p-4">
                                                <div className="text-2xl font-bold text-emerald-700">{totalMarks}</div>
                                                <div className="text-sm text-emerald-700">{t('Total Marks')}</div>
                                            </div>
                                            <div className="rounded-lg bg-violet-50 p-4">
                                                <div className="text-2xl font-bold text-violet-700">
                                                    {onlineExamForm.duration || '0'}
                                                    {t('min')}
                                                </div>
                                                <div className="text-sm text-violet-700">{t('Duration')}</div>
                                            </div>
                                            <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-600">{t('Assigned To')}</span>
                                                    <span className="font-medium text-slate-900">
                                                        {selectedAssignments.length > 0
                                                            ? `${selectedAssignments.length} class section(s)`
                                                            : '-'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-600">{t('Negative Marking')}</span>
                                                    <span className="font-medium text-slate-900">
                                                        {onlineExamForm.negativeMarkingEnabled ? t('Yes') : t('No')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-600">{t('Shuffle Questions')}</span>
                                                    <span className="font-medium text-slate-900">
                                                        {onlineExamForm.shuffleQuestions ? t('Yes') : t('No')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-600">{t('Status')}</span>
                                                    <span className="font-medium capitalize text-slate-900">
                                                        {t(onlineExamForm.status)}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button type="submit" className="w-full gap-2">
                                                <CheckCircle className="h-4 w-4" />
                                                {editingOnlineExamId
                                                    ? t('Update Online Exam')
                                                    : t('Create Online Exam')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                                {t(
                                    'Start the builder to create a class-based online exam with timer, question bank, and publishing controls.',
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="gap-3 pb-4">
                        <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle>{t('Saved Online Exams')}</CardTitle>
                                <p className="mt-1 text-sm text-slate-500">
                                    {t('Review schedules, assigned class sections, question counts, and submissions.')}
                                </p>
                            </div>
                            <div className="relative min-w-[260px]">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('Search by exam, subject, class, or status')}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Exam')}</TableHead>
                                        <TableHead>{t('Assigned Classes')}</TableHead>
                                        <TableHead>{t('Duration')}</TableHead>
                                        <TableHead>{t('Schedule')}</TableHead>
                                        <TableHead>{t('Questions')}</TableHead>
                                        <TableHead>{t('Submissions')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead className="text-right">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOnlineExams.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                                                {t('No online exams found.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredOnlineExams.map((exam) => (
                                            <TableRow key={exam.id}>
                                                <TableCell>
                                                    <div className="font-medium text-slate-900">{t(exam.title)}</div>
                                                    <div className="text-sm text-slate-500">{exam.subject}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-slate-900">
                                                        {(exam.targetClassSections || [])
                                                            .slice(0, 2)
                                                            .map(
                                                                (assignment) =>
                                                                    `${assignment.className}-${assignment.section}`,
                                                            )
                                                            .join(', ') || `${exam.className} / ${exam.section}`}
                                                    </div>
                                                    {(exam.targetClassSections || []).length > 2 ? (
                                                        <div className="text-sm text-slate-500">
                                                            +{exam.targetClassSections.length - 2}
                                                            {t('more')}
                                                        </div>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell>
                                                    {exam.duration}
                                                    {t('mins')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-slate-900">
                                                        {formatDateTime(exam.startTime)}
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {formatDateTime(exam.endTime)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{exam.questions.length}</TableCell>
                                                <TableCell>{exam.attemptsCount || 0}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={exam.status === 'published' ? 'default' : 'secondary'}
                                                    >
                                                        {t(exam.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => setViewingExam(exam)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openOnlineExamEditor(exam)}
                                                        >
                                                            <Pencil className="mr-1 h-4 w-4" />
                                                            {t('Edit')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => deleteOnlineExam(exam.id)}
                                                        >
                                                            <Trash2 className="mr-1 h-4 w-4" />
                                                            {t('Delete')}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {!canManageOnlineExams ? (
                    <Card>
                        <CardContent className="py-12 text-center text-slate-600">
                            {t(
                                'You can view online exams from this module, but only admin and teacher roles can create or edit them.',
                            )}
                        </CardContent>
                    </Card>
                ) : null}

                <Dialog open={Boolean(viewingExam)} onOpenChange={(open) => !open && setViewingExam(null)}>
                    <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{viewingExam?.title || t('Exam Details')}</DialogTitle>
                        </DialogHeader>

                        {viewingExam ? (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">{t('Subject')}</p>
                                        <p className="mt-2 font-medium text-slate-900">{viewingExam.subject || '-'}</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            {t('Duration')}
                                        </p>
                                        <p className="mt-2 font-medium text-slate-900">
                                            {viewingExam.duration}
                                            {t('mins')}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            {t('Questions')}
                                        </p>
                                        <p className="mt-2 font-medium text-slate-900">
                                            {viewingExam.questions.length}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">{t('Status')}</p>
                                        <div className="mt-2">
                                            <Badge
                                                variant={viewingExam.status === 'published' ? 'default' : 'secondary'}
                                            >
                                                {t(viewingExam.status)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-lg border border-slate-200 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            {t('Assigned Class Sections')}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {(viewingExam.targetClassSections || []).length > 0 ? (
                                                viewingExam.targetClassSections.map((assignment) => (
                                                    <Badge
                                                        key={`${viewingExam.id}_${assignment.className}_${assignment.section}`}
                                                        variant="outline"
                                                    >
                                                        {assignment.className}
                                                        {t('/ Section')}
                                                        {assignment.section}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-sm text-slate-500">
                                                    {viewingExam.className}
                                                    {t('/ Section')}
                                                    {viewingExam.section}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            {t('Exam Schedule')}
                                        </p>
                                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                                            <div>
                                                <span className="font-medium text-slate-900">{t('Start:')}</span>{' '}
                                                {formatDateTime(viewingExam.startTime)}
                                            </div>
                                            <div>
                                                <span className="font-medium text-slate-900">{t('End:')}</span>{' '}
                                                {formatDateTime(viewingExam.endTime)}
                                            </div>
                                            <div>
                                                <span className="font-medium text-slate-900">
                                                    {t('Shuffle Questions:')}
                                                </span>{' '}
                                                {viewingExam.shuffleQuestions ? t('Yes') : t('No')}
                                            </div>
                                            <div>
                                                <span className="font-medium text-slate-900">
                                                    {t('Negative Marking:')}
                                                </span>{' '}
                                                {viewingExam.negativeMarkingEnabled
                                                    ? `${viewingExam.negativeMarks} marks`
                                                    : t('No')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900">
                                            {t('Questions and Options')}
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            {t(
                                                'Review the full exam paper, including answer choices and the saved correct answer.',
                                            )}
                                        </p>
                                    </div>

                                    {viewingExam.questions.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                            {t('No questions available for this exam.')}
                                        </div>
                                    ) : (
                                        viewingExam.questions.map((question, index) => (
                                            <div key={question.id} className="rounded-xl border border-slate-200 p-5">
                                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                    <div>
                                                        <p className="text-sm text-slate-500">
                                                            {t('Question')}
                                                            {index + 1}
                                                        </p>
                                                        <h4 className="mt-1 font-medium text-slate-900">
                                                            {question.question || t('Untitled question')}
                                                        </h4>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="outline">
                                                            {question.type === 'mcq' ? t('MCQ') : t('True / False')}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            {t('Marks:')}
                                                            {question.marks}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                    {question.options.map((option, optionIndex) => {
                                                        const isCorrectAnswer = option === question.correctAnswer;

                                                        return (
                                                            <div
                                                                key={`${question.id}_${option}_${optionIndex}`}
                                                                className={`rounded-lg border px-4 py-3 ${
                                                                    isCorrectAnswer
                                                                        ? 'border-emerald-200 bg-emerald-50'
                                                                        : 'border-slate-200 bg-slate-50'
                                                                }`}
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div>
                                                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                                                            {t('Option')}
                                                                            {String.fromCharCode(65 + optionIndex)}
                                                                        </p>
                                                                        <p className="mt-1 text-sm text-slate-900">
                                                                            {option || '-'}
                                                                        </p>
                                                                    </div>
                                                                    {isCorrectAnswer ? (
                                                                        <Badge>{t('Correct Answer')}</Badge>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
