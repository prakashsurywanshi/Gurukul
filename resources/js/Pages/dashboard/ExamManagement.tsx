import { useLanguage } from '../../i18n/LanguageProvider';
import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
    CircleCheckBig,
    Clock3,
    CalendarDays,
    Download,
    Eye,
    FileText,
    Pencil,
    Plus,
    Search,
    Trash2,
    Upload,
    X,
    BookOpen,
    Play,
    TimerReset,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Textarea } from '../ui/textarea';
import { formatDate, formatDateTime as formatDisplayDateTime } from '../ui/utils';

interface ExamManagementProps {
    user: any;
    students: any[];
    classOptions: { id: number; name: string; section: string }[];
    subjectOptions: { id: number; name: string }[];
    examGroups: GroupedExam[];
}

interface SubjectFormRow {
    id: string;
    subject: string;
    room_number: string;
    total_marks: string;
    passing_marks: string;
    exam_date: string;
    start_time: string;
    end_time: string;
}

interface ExamDefinition {
    groupId: string;
    name: string;
    publishStatus: 'draft' | 'published';
    studentIds: string[];
    createdAt: string;
}

interface GroupedExam {
    groupId: string;
    name: string;
    publishStatus: 'draft' | 'published';
    className?: string | null;
    section?: string | null;
    studentIds: string[];
    exams: any[];
    createdAt: string;
}

interface ExamResultRow {
    examId: string;
    examName: string;
    subject: string;
    class: string;
    section: string;
    studentId: string;
    studentName: string;
    marksObtained: number;
    totalMarks: number;
    passingMarks: number;
    grade: string;
    examDate: string;
}

type OnlineQuestionType = 'mcq' | 'true_false';

interface OnlineExamQuestion {
    id: string;
    type: OnlineQuestionType;
    question: string;
    options: string[];
    correctAnswer: string;
    marks: string;
}

interface OnlineExamRecord {
    id: string;
    title: string;
    subject: string;
    className: string;
    section: string;
    duration: string;
    startTime: string;
    endTime: string;
    negativeMarkingEnabled: boolean;
    negativeMarks: string;
    shuffleQuestions: boolean;
    status: 'draft' | 'published';
    questions: OnlineExamQuestion[];
    createdAt: string;
}

interface OnlineExamAttempt {
    id: string;
    userId: string;
    studentId: string | null;
    examId: string;
    examTitle: string;
    subject: string;
    className: string;
    section: string;
    startedAt: string;
    submittedAt: string;
    status: 'submitted' | 'auto_submitted';
    answers: Record<string, string>;
    questionOrder: string[];
    totalQuestions: number;
    attemptedQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    unansweredQuestions: number;
    totalMarks: number;
    obtainedMarks: number;
    negativeMarksApplied: number;
    percentage: number;
}

interface ActiveOnlineExamSession {
    userId: string;
    studentId: string | null;
    examId: string;
    startedAt: string;
    answers: Record<string, string>;
    questionOrder: string[];
}

const ONLINE_EXAMS_STORAGE_KEY = 'laravel_gurukul_online_exams';
const ONLINE_EXAM_ATTEMPTS_STORAGE_KEY = 'laravel_gurukul_online_exam_attempts';
const ONLINE_EXAM_ACTIVE_SESSION_STORAGE_KEY = 'laravel_gurukul_online_exam_active_session';
const createSubjectRow = (): SubjectFormRow => ({
    id: `subject_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    subject: '',
    room_number: '',
    total_marks: '100',
    passing_marks: '40',
    exam_date: '',
    start_time: '09:00',
    end_time: '12:00',
});

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

const getDefaultExamClassSelection = (classOptions: { id: number; name: string; section: string }[]) => ({
    className: classOptions[0]?.name || '',
    section: classOptions[0]?.section || '',
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

const loadStoredJson = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') {
        return fallback;
    }

    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        console.error(`Error loading ${key}:`, error);
        return fallback;
    }
};

const saveStoredJson = <T,>(key: string, value: T) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving ${key}:`, error);
    }
};

const formatDateTime = (value: string) => {
    return formatDisplayDateTime(value, value || '-');
};

const formatSeconds = (value: number) => {
    const safeValue = Math.max(0, value);
    const hours = Math.floor(safeValue / 3600);
    const minutes = Math.floor((safeValue % 3600) / 60);
    const seconds = safeValue % 60;

    return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
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

const calculateOnlineExamAttempt = (
    exam: OnlineExamRecord,
    answers: Record<string, string>,
    questionOrder: string[],
) => {
    const orderedQuestions = questionOrder
        .map((questionId) => exam.questions.find((question) => question.id === questionId))
        .filter(Boolean) as OnlineExamQuestion[];

    const questions = orderedQuestions.length > 0 ? orderedQuestions : exam.questions;
    const negativeMark = exam.negativeMarkingEnabled ? Number(exam.negativeMarks) || 0 : 0;

    let obtainedMarks = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unansweredQuestions = 0;
    let negativeMarksApplied = 0;

    questions.forEach((question) => {
        const selectedAnswer = (answers[question.id] || '').trim();
        const questionMarks = Number(question.marks) || 0;

        if (!selectedAnswer) {
            unansweredQuestions += 1;
            return;
        }

        if (selectedAnswer === question.correctAnswer) {
            correctAnswers += 1;
            obtainedMarks += questionMarks;
            return;
        }

        wrongAnswers += 1;
        if (negativeMark > 0) {
            obtainedMarks -= negativeMark;
            negativeMarksApplied += negativeMark;
        }
    });

    const totalMarks = questions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0);
    const attemptedQuestions = questions.length - unansweredQuestions;
    const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;

    return {
        totalQuestions: questions.length,
        attemptedQuestions,
        correctAnswers,
        wrongAnswers,
        unansweredQuestions,
        totalMarks,
        obtainedMarks: Number(obtainedMarks.toFixed(2)),
        negativeMarksApplied: Number(negativeMarksApplied.toFixed(2)),
        percentage,
    };
};

const getOnlineExamAvailability = (exam: OnlineExamRecord) => {
    if (exam.status !== 'published') {
        return {
            label: 'Draft',
            canAttend: false,
            badgeVariant: 'secondary' as const,
        };
    }

    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
        return {
            label: 'Schedule Missing',
            canAttend: false,
            badgeVariant: 'secondary' as const,
        };
    }

    if (now < startTime) {
        return {
            label: 'Upcoming',
            canAttend: false,
            badgeVariant: 'secondary' as const,
        };
    }

    if (now > endTime) {
        return {
            label: 'Closed',
            canAttend: false,
            badgeVariant: 'outline' as const,
        };
    }

    return {
        label: 'Live',
        canAttend: true,
        badgeVariant: 'default' as const,
    };
};

const getExamStatus = (group: GroupedExam) => {
    if (group.exams.length === 0) {
        return {
            label: 'No Subjects',
            badgeVariant: 'secondary' as const,
        };
    }

    const sortedSubjects = [...group.exams].sort((left, right) => {
        const leftTime = new Date(`${left.exam_date}T${left.start_time || '00:00'}`).getTime();
        const rightTime = new Date(`${right.exam_date}T${right.start_time || '00:00'}`).getTime();
        return leftTime - rightTime;
    });

    const startDate = new Date(`${sortedSubjects[0]?.exam_date}T${sortedSubjects[0]?.start_time || '00:00'}`);
    const endDate = new Date(
        `${sortedSubjects[sortedSubjects.length - 1]?.exam_date}T${sortedSubjects[sortedSubjects.length - 1]?.end_time || '23:59'}`,
    );
    const now = new Date();

    if (now > endDate) {
        return { label: 'Completed', badgeVariant: 'outline' as const };
    }

    if (now >= startDate && now <= endDate) {
        return { label: 'Ongoing', badgeVariant: 'default' as const };
    }

    return { label: 'Upcoming', badgeVariant: 'secondary' as const };
};

export default function ExamManagement({
    user,
    students,
    classOptions,
    subjectOptions,
    examGroups,
}: ExamManagementProps) {
    const { t } = useLanguage();
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const flash = page.props.flash ?? {};
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [viewGroup, setViewGroup] = useState<GroupedExam | null>(null);
    const [activePanel, setActivePanel] = useState<'create' | 'subjects' | 'evaluation' | null>('create');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedEvaluationExamId, setSelectedEvaluationExamId] = useState<string | null>(null);
    const [evaluationClass, setEvaluationClass] = useState('');
    const [evaluationSection, setEvaluationSection] = useState('');
    const [evaluationMarks, setEvaluationMarks] = useState<Record<string, string>>({});
    const [onlineExams, setOnlineExams] = useState<OnlineExamRecord[]>([]);
    const [showOnlineExamBuilder, setShowOnlineExamBuilder] = useState(false);
    const [editingOnlineExamId, setEditingOnlineExamId] = useState<string | null>(null);
    const [onlineExamForm, setOnlineExamForm] = useState(createOnlineExamForm);
    const [onlineQuestions, setOnlineQuestions] = useState<OnlineExamQuestion[]>([createOnlineQuestion()]);
    const onlineQuestionImportRef = useRef<HTMLInputElement | null>(null);
    const createFormRef = useRef<HTMLDivElement | null>(null);
    const subjectsFormRef = useRef<HTMLDivElement | null>(null);
    const evaluationFormRef = useRef<HTMLDivElement | null>(null);
    const defaultExamClassSelection = useMemo(() => getDefaultExamClassSelection(classOptions), [classOptions]);

    const [createForm, setCreateForm] = useState({
        name: '',
        publishStatus: 'draft',
        className: defaultExamClassSelection.className,
        section: defaultExamClassSelection.section,
    });

    const [subjectRows, setSubjectRows] = useState<SubjectFormRow[]>([createSubjectRow()]);

    useEffect(() => {
        setOnlineExams(loadStoredJson<OnlineExamRecord[]>(ONLINE_EXAMS_STORAGE_KEY, []));
    }, []);

    useEffect(() => {
        saveStoredJson(ONLINE_EXAMS_STORAGE_KEY, onlineExams);
    }, [onlineExams]);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const groupedExams = useMemo<GroupedExam[]>(() => examGroups || [], [examGroups]);

    const selectedGroup = useMemo(
        () => groupedExams.find((group) => group.groupId === selectedGroupId) || null,
        [groupedExams, selectedGroupId],
    );

    const studentsById = useMemo(
        () =>
            students.reduce<Record<string, any>>((acc, student) => {
                acc[student.id] = student;
                return acc;
            }, {}),
        [students],
    );

    const resultsRows = useMemo<ExamResultRow[]>(() => {
        return groupedExams.flatMap((group) =>
            group.exams.flatMap((exam) =>
                (exam.results || []).map((result: any) => {
                    const student = studentsById[result.student_id];
                    return {
                        examId: exam.id,
                        examName: group.name,
                        subject: exam.subject,
                        class: exam.class,
                        section: exam.section,
                        studentId: result.student_id,
                        studentName: student ? `${student.first_name} ${student.last_name}` : result.student_id,
                        marksObtained: result.marks_obtained,
                        totalMarks: exam.total_marks,
                        passingMarks: exam.passing_marks,
                        grade: result.grade,
                        examDate: exam.exam_date,
                    };
                }),
            ),
        );
    }, [groupedExams, studentsById]);

    const selectedEvaluationExam = useMemo(
        () => selectedGroup?.exams.find((exam) => exam.id === selectedEvaluationExamId) || null,
        [selectedEvaluationExamId, selectedGroup],
    );

    const evaluationBaseStudents = useMemo(() => {
        if (!selectedEvaluationExam) {
            return [];
        }

        return students;
    }, [selectedEvaluationExam, students]);

    const evaluationClassOptions = useMemo(
        () =>
            Array.from(new Set(evaluationBaseStudents.map((student) => String(student.class)))).sort((left, right) =>
                left.localeCompare(right, undefined, { numeric: true }),
            ),
        [evaluationBaseStudents],
    );

    const evaluationSectionOptions = useMemo(() => {
        if (!evaluationClass) {
            return [];
        }

        return Array.from(
            new Set(
                evaluationBaseStudents
                    .filter((student) => String(student.class) === evaluationClass)
                    .map((student) => String(student.section)),
            ),
        ).sort();
    }, [evaluationBaseStudents, evaluationClass]);

    const evaluationStudents = useMemo(() => {
        if (!selectedEvaluationExam) {
            return [];
        }

        if (!evaluationClass || !evaluationSection) {
            return [];
        }

        return evaluationBaseStudents.filter(
            (student) => String(student.class) === evaluationClass && String(student.section) === evaluationSection,
        );
    }, [evaluationBaseStudents, evaluationClass, evaluationSection, selectedEvaluationExam]);

    const validSubjectRows = useMemo(
        () =>
            subjectRows.filter(
                (row) =>
                    row.subject.trim() &&
                    row.exam_date &&
                    row.start_time &&
                    row.end_time &&
                    row.total_marks &&
                    row.passing_marks,
            ),
        [subjectRows],
    );

    const duplicateSubjects = useMemo(() => {
        const seen = new Set<string>();
        const duplicates = new Set<string>();

        subjectRows.forEach((row) => {
            const key = row.subject.trim().toLowerCase();
            if (!row.subject.trim()) {
                return;
            }

            if (seen.has(key)) {
                duplicates.add(key);
            } else {
                seen.add(key);
            }
        });

        return duplicates;
    }, [subjectRows]);

    const invalidTimeRows = useMemo(
        () => subjectRows.filter((row) => row.start_time && row.end_time && row.start_time >= row.end_time),
        [subjectRows],
    );

    const invalidMarksRows = useMemo(
        () =>
            subjectRows.filter(
                (row) =>
                    row.total_marks &&
                    row.passing_marks &&
                    (Number(row.passing_marks) <= 0 || Number(row.total_marks) <= Number(row.passing_marks)),
            ),
        [subjectRows],
    );

    const filteredGroups = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        return groupedExams.filter((group) => {
            if (!search) {
                return true;
            }

            return (
                group.name.toLowerCase().includes(search) ||
                group.publishStatus.toLowerCase().includes(search) ||
                group.exams.some(
                    (exam) =>
                        exam.subject.toLowerCase().includes(search) ||
                        String(exam.class).includes(search) ||
                        String(exam.section).toLowerCase().includes(search),
                )
            );
        });
    }, [groupedExams, searchTerm]);

    const stats = useMemo(() => {
        const total = groupedExams.length;
        const published = groupedExams.filter((group) => group.publishStatus === 'published').length;
        const draft = groupedExams.filter((group) => group.publishStatus === 'draft').length;
        const withSubjects = groupedExams.filter((group) => group.exams.length > 0).length;
        const withResults = groupedExams.filter((group) =>
            group.exams.some((exam) => resultsRows.some((row) => row.examId === exam.id)),
        ).length;
        return { total, published, draft, withSubjects, withResults };
    }, [groupedExams, resultsRows]);

    useEffect(() => {
        setCreateForm((current) => {
            if (selectedGroupId || (current.className && current.section)) {
                return current;
            }

            return {
                ...current,
                className: defaultExamClassSelection.className,
                section: defaultExamClassSelection.section,
            };
        });
    }, [defaultExamClassSelection, selectedGroupId]);

    const resetCreateForm = () => {
        setCreateForm({
            name: '',
            publishStatus: 'draft',
            className: defaultExamClassSelection.className,
            section: defaultExamClassSelection.section,
        });
        setActivePanel('create');
        setSelectedGroupId(null);
    };

    const resetSubjectForm = () => {
        setSubjectRows([createSubjectRow()]);
    };

    const scrollToPanel = (panelRef: React.RefObject<HTMLDivElement | null>) => {
        requestAnimationFrame(() => {
            panelRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });
    };

    const openSubjectsPanel = (group: GroupedExam) => {
        setSelectedGroupId(group.groupId);
        setSubjectRows(
            group.exams.length > 0
                ? group.exams.map((exam) => ({
                      id: exam.id,
                      subject: String(exam.subject_id ?? ''),
                      room_number: exam.room_number || '',
                      total_marks: String(exam.total_marks),
                      passing_marks: String(exam.passing_marks),
                      exam_date: exam.exam_date || '',
                      start_time: exam.start_time || '',
                      end_time: exam.end_time || '',
                  }))
                : [createSubjectRow()],
        );
        setActivePanel('subjects');
        scrollToPanel(subjectsFormRef);
    };

    const openEditRecord = (group: GroupedExam) => {
        setSelectedGroupId(group.groupId);
        setCreateForm({
            name: group.name,
            publishStatus: group.publishStatus,
            className: group.className || '',
            section: group.section || '',
        });
        setActivePanel('create');
        scrollToPanel(createFormRef);
    };

    const saveExamRecord = (e: React.FormEvent) => {
        e.preventDefault();

        if (!createForm.name.trim()) {
            toast.error('Please enter exam name');
            return;
        }

        if (!selectedGroupId) {
            router.post('/exams', createForm, {
                preserveScroll: true,
                onSuccess: () => {
                    setActivePanel(null);
                    setCreateForm({
                        name: '',
                        publishStatus: 'draft',
                        className: defaultExamClassSelection.className,
                        section: defaultExamClassSelection.section,
                    });
                },
            });
            return;
        }

        router.patch(`/exams/${selectedGroupId}`, createForm, {
            preserveScroll: true,
            onSuccess: () => {
                setActivePanel(null);
                setSelectedGroupId(null);
                setCreateForm({
                    name: '',
                    publishStatus: 'draft',
                    className: defaultExamClassSelection.className,
                    section: defaultExamClassSelection.section,
                });
            },
        });
    };

    const addSubjectRow = () => {
        setSubjectRows((current) => [...current, createSubjectRow()]);
    };

    const updateSubjectRow = (rowId: string, key: keyof SubjectFormRow, value: string) => {
        setSubjectRows((current) => current.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)));
    };

    const removeSubjectRow = (rowId: string) => {
        setSubjectRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== rowId)));
    };

    const saveSubjects = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedGroup) {
            toast.error('Please select exam record first');
            return;
        }

        if (validSubjectRows.length === 0) {
            toast.error('Add at least one subject');
            return;
        }

        if (duplicateSubjects.size > 0) {
            toast.error('Duplicate subject/class/section entries are not allowed');
            return;
        }

        if (invalidTimeRows.length > 0) {
            toast.error('End time must be after start time');
            return;
        }

        if (invalidMarksRows.length > 0) {
            toast.error('Pass marks must be less than max marks');
            return;
        }

        router.post(
            `/exams/${selectedGroup.groupId}/schedules`,
            {
                subjects: validSubjectRows.map((row) => ({
                    subject_id: Number(row.subject),
                    exam_date: row.exam_date,
                    start_time: row.start_time,
                    end_time: row.end_time,
                    room_number: row.room_number,
                    total_marks: Number(row.total_marks),
                    passing_marks: Number(row.passing_marks),
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setActivePanel(null);
                    setSelectedGroupId(null);
                    resetSubjectForm();
                },
            },
        );
    };

    const deleteExamRecord = (group: GroupedExam) => {
        if (!window.confirm(`Delete exam ${group.name}?`)) {
            return;
        }

        router.delete(`/exams/${group.groupId}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedGroupId === group.groupId) {
                    setSelectedGroupId(null);
                    setActivePanel(null);
                    resetCreateForm();
                    resetSubjectForm();
                }
            },
        });
    };

    const openEvaluationPanel = (group: GroupedExam) => {
        setSelectedGroupId(group.groupId);
        setSelectedEvaluationExamId(null);
        setEvaluationClass('');
        setEvaluationSection('');
        setEvaluationMarks({});
        setActivePanel('evaluation');
        scrollToPanel(evaluationFormRef);
    };

    const openSubjectEvaluation = (examId: string) => {
        setSelectedEvaluationExamId(examId);
        setEvaluationClass('');
        setEvaluationSection('');

        const nextMarks: Record<string, string> = {};
        const examData = selectedGroup?.exams.find((exam) => exam.id === examId);
        (examData?.results || []).forEach((result: any) => {
            nextMarks[result.student_id] = String(result.marks_obtained);
        });
        setEvaluationMarks(nextMarks);
        scrollToPanel(evaluationFormRef);
    };

    const saveEvaluationMarks = () => {
        if (!selectedEvaluationExam) {
            toast.error('Please select a subject for evaluation');
            return;
        }

        const resultsPayload: { student_id: number; marks_obtained: number }[] = [];

        for (const student of evaluationStudents) {
            const rawMarks = evaluationMarks[student.id];
            if (rawMarks === undefined || rawMarks === '') {
                continue;
            }

            const marksObtained = parseFloat(rawMarks);
            if (
                Number.isNaN(marksObtained) ||
                marksObtained < 0 ||
                marksObtained > selectedEvaluationExam.total_marks
            ) {
                toast.error(`Invalid marks for ${student.first_name} ${student.last_name}`);
                return;
            }

            resultsPayload.push({
                student_id: Number(student.id),
                marks_obtained: marksObtained,
            });
        }

        if (resultsPayload.length === 0) {
            toast.success('No marks entered to save');
            return;
        }

        router.post(
            `/exams/schedules/${selectedEvaluationExam.id}/results`,
            {
                results: resultsPayload,
            },
            {
                preserveScroll: true,
            },
        );
    };

    const resetOnlineExamBuilder = () => {
        setEditingOnlineExamId(null);
        setOnlineExamForm(createOnlineExamForm());
        setOnlineQuestions([createOnlineQuestion()]);
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
                        options:
                            nextType === 'true_false'
                                ? ['True', 'False']
                                : question.options.length === 4
                                  ? question.options
                                  : ['', '', '', ''],
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
            current.map((question) =>
                question.id === questionId
                    ? {
                          ...question,
                          options: question.options.map((option, index) => (index === optionIndex ? value : option)),
                      }
                    : question,
            ),
        );
    };

    const removeOnlineQuestion = (questionId: string) => {
        setOnlineQuestions((current) =>
            current.length === 1 ? current : current.filter((question) => question.id !== questionId),
        );
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
            setOnlineQuestions(exam.questions);
        } else {
            resetOnlineExamBuilder();
        }

        setShowOnlineExamBuilder(true);
    };

    const saveOnlineExam = (event: React.FormEvent) => {
        event.preventDefault();

        if (!onlineExamForm.title.trim() || !onlineExamForm.subject.trim()) {
            toast.error('Please enter online exam title and subject');
            return;
        }

        if (!onlineExamForm.className || !onlineExamForm.section) {
            toast.error('Please select class and section for the online exam');
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
            const filledOptions =
                question.type === 'true_false' ? true : question.options.slice(0, 4).every((option) => option.trim());
            const hasCorrectAnswer = question.correctAnswer.trim();

            return hasQuestion && hasMarks && filledOptions && hasCorrectAnswer;
        });

        if (validQuestions.length === 0) {
            toast.error('Add at least one valid question');
            return;
        }

        const payload: OnlineExamRecord = {
            id: editingOnlineExamId || `online_exam_${Date.now()}`,
            ...onlineExamForm,
            questions: validQuestions,
            createdAt:
                onlineExams.find((exam) => exam.id === editingOnlineExamId)?.createdAt || new Date().toISOString(),
        };

        if (editingOnlineExamId) {
            setOnlineExams((current) => current.map((exam) => (exam.id === editingOnlineExamId ? payload : exam)));
            toast.success('Online exam updated successfully');
        } else {
            setOnlineExams((current) => [payload, ...current]);
            toast.success('Online exam created successfully');
        }

        setShowOnlineExamBuilder(false);
        resetOnlineExamBuilder();
    };

    const deleteOnlineExam = (examId: string) => {
        setOnlineExams((current) => current.filter((exam) => exam.id !== examId));
        if (editingOnlineExamId === examId) {
            setShowOnlineExamBuilder(false);
            resetOnlineExamBuilder();
        }
        toast.success('Online exam deleted successfully');
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
            const getValue = (row: string[], keys: string[]) => {
                const index = headers.findIndex((header) => keys.includes(header));
                return index >= 0 ? row[index] || '' : '';
            };

            const importedQuestions = lines
                .slice(1)
                .map((line) => {
                    const row = parseCsvLine(line);
                    const typeValue = getValue(row, ['question_type', 'type']).toLowerCase();
                    const type: OnlineQuestionType = typeValue === 'true_false' ? 'true_false' : 'mcq';
                    const question = getValue(row, ['question_text', 'question']);
                    const optionA = getValue(row, ['option_a', 'a']);
                    const optionB = getValue(row, ['option_b', 'b']);
                    const optionC = getValue(row, ['option_c', 'c']);
                    const optionD = getValue(row, ['option_d', 'd']);
                    const correctAnswer = getValue(row, ['correct_answer', 'answer']);
                    const marks = getValue(row, ['marks']);

                    const nextQuestion = createOnlineQuestion(type);
                    nextQuestion.question = question;
                    nextQuestion.correctAnswer = correctAnswer;
                    nextQuestion.marks = marks || '1';
                    nextQuestion.options =
                        type === 'true_false' ? ['True', 'False'] : [optionA, optionB, optionC, optionD];
                    return nextQuestion;
                })
                .filter((question) => question.question.trim());

            if (importedQuestions.length === 0) {
                toast.error('No valid questions found in CSV');
                event.target.value = '';
                return;
            }

            setOnlineQuestions((current) => [...current, ...importedQuestions]);
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
        toast.success('Online exam question sample CSV downloaded');
    };

    const canCreateExam = ['super_admin', 'admin', 'teacher'].includes(user.role);

    return (
        <DashboardLayout user={user} activeTab="examination">
            <div className="p-3 md:p-4 lg:p-5 space-y-5">
                <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="w-full text-left">
                        <h1 className="text-3xl font-bold text-gray-900">{t('Exam Management')}</h1>
                        <p className="mt-1 text-gray-600">
                            {t('Create exam records, add subjects, and manage exam results in one place.')}
                        </p>
                    </div>

                    {canCreateExam && (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                className="gap-2"
                                onClick={() => {
                                    resetCreateForm();
                                    setActivePanel('create');
                                }}
                            >
                                <Plus className="w-4 h-4" />
                                {t('Create Exam')}
                            </Button>
                        </div>
                    )}
                </div>

                {canCreateExam && activePanel === 'create' && (
                    <div ref={createFormRef}>
                        <Card>
                            <CardHeader className="flex flex-row items-start justify-between gap-4">
                                <div>
                                    <CardTitle>
                                        {selectedGroupId ? t('Edit Exam Record') : t('Create Exam Record')}
                                    </CardTitle>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {t('Step 1: create the exam by name and publish status.')}
                                    </p>
                                </div>
                                <Button type="button" variant="outline" onClick={() => setActivePanel(null)}>
                                    {t('Cancel')}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={saveExamRecord} className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{t('Exam Name')}</Label>
                                        <Input
                                            value={createForm.name}
                                            onChange={(e) =>
                                                setCreateForm({
                                                    ...createForm,
                                                    name: e.target.value,
                                                })
                                            }
                                            placeholder={t('e.g., Mid Term Examination')}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Publish Status')}</Label>
                                        <Select
                                            value={createForm.publishStatus}
                                            onValueChange={(value) =>
                                                setCreateForm({
                                                    ...createForm,
                                                    publishStatus: value,
                                                })
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
                                    <div className="md:col-span-2 flex justify-end">
                                        <Button type="submit">
                                            {selectedGroupId ? t('Update Record') : t('Create Record')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {canCreateExam && activePanel === 'subjects' && selectedGroup && (
                    <div ref={subjectsFormRef}>
                        <Card>
                            <CardHeader className="flex flex-row items-start justify-between gap-4">
                                <div>
                                    <CardTitle>
                                        {t('Add Subjects:')}
                                        {selectedGroup.name}
                                    </CardTitle>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {t('Step 2: add subject papers to this exam record.')}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={resetSubjectForm}>
                                        {t('Reset')}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setActivePanel(null)}>
                                        {t('Cancel')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={saveSubjects} className="space-y-4">
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="gap-2"
                                            onClick={addSubjectRow}
                                        >
                                            <Plus className="w-4 h-4" />
                                            {t('Add Subject')}
                                        </Button>
                                    </div>

                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="min-w-[180px]">{t('Subject')}</TableHead>
                                                    <TableHead className="min-w-[150px]">{t('Date')}</TableHead>
                                                    <TableHead className="min-w-[140px]">{t('Start Time')}</TableHead>
                                                    <TableHead className="min-w-[140px]">{t('End Time')}</TableHead>
                                                    <TableHead className="min-w-[140px]">{t('Room Number')}</TableHead>
                                                    <TableHead className="min-w-[120px]">{t('Max Marks')}</TableHead>
                                                    <TableHead className="min-w-[120px]">{t('Min Marks')}</TableHead>
                                                    <TableHead className="min-w-[90px] text-right">
                                                        {t('Action')}
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {subjectRows.map((row, index) => {
                                                    const duplicateKey = row.subject.trim().toLowerCase();

                                                    return (
                                                        <TableRow key={row.id} className="align-top">
                                                            <TableCell>
                                                                <div className="space-y-1">
                                                                    <Select
                                                                        value={row.subject}
                                                                        onValueChange={(value) =>
                                                                            updateSubjectRow(row.id, 'subject', value)
                                                                        }
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue
                                                                                placeholder={`Subject ${index + 1}`}
                                                                            />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {subjectOptions.map((option) => (
                                                                                <SelectItem
                                                                                    key={option.id}
                                                                                    value={String(option.id)}
                                                                                >
                                                                                    {option.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    {duplicateSubjects.has(duplicateKey) &&
                                                                        row.subject && (
                                                                            <p className="text-xs text-rose-600">
                                                                                {t('Duplicate subject.')}
                                                                            </p>
                                                                        )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="date"
                                                                    value={row.exam_date}
                                                                    onChange={(e) =>
                                                                        updateSubjectRow(
                                                                            row.id,
                                                                            'exam_date',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="time"
                                                                    value={row.start_time}
                                                                    onChange={(e) =>
                                                                        updateSubjectRow(
                                                                            row.id,
                                                                            'start_time',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="time"
                                                                    value={row.end_time}
                                                                    onChange={(e) =>
                                                                        updateSubjectRow(
                                                                            row.id,
                                                                            'end_time',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    value={row.room_number}
                                                                    onChange={(e) =>
                                                                        updateSubjectRow(
                                                                            row.id,
                                                                            'room_number',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    placeholder={t('Room No')}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    value={row.total_marks}
                                                                    onChange={(e) =>
                                                                        updateSubjectRow(
                                                                            row.id,
                                                                            'total_marks',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    value={row.passing_marks}
                                                                    onChange={(e) =>
                                                                        updateSubjectRow(
                                                                            row.id,
                                                                            'passing_marks',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {subjectRows.length > 1 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => removeSubjectRow(row.id)}
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button type="submit">{t('Save Subjects')}</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {canCreateExam && activePanel === 'evaluation' && selectedGroup && (
                    <div ref={evaluationFormRef}>
                        <Card>
                            <CardHeader className="flex flex-row items-start justify-between gap-4">
                                <div>
                                    <CardTitle>
                                        {t('Marks Evaluation:')}
                                        {selectedGroup.name}
                                    </CardTitle>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {t(
                                            'First choose a subject from this exam, then enter student marks for any class and section.',
                                        )}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setActivePanel(null);
                                        setSelectedEvaluationExamId(null);
                                        setEvaluationClass('');
                                        setEvaluationSection('');
                                        setEvaluationMarks({});
                                    }}
                                >
                                    {t('Close')}
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Subject')}</TableHead>
                                                <TableHead>{t('Date')}</TableHead>
                                                <TableHead>{t('Total')}</TableHead>
                                                <TableHead>{t('Min')}</TableHead>
                                                <TableHead className="text-right">{t('Action')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedGroup.exams.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center text-slate-500">
                                                        {t('Add subjects first before evaluating marks.')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                selectedGroup.exams.map((exam) => (
                                                    <TableRow key={exam.id}>
                                                        <TableCell className="font-medium">{exam.subject}</TableCell>
                                                        <TableCell>{formatDate(exam.exam_date)}</TableCell>
                                                        <TableCell>{exam.total_marks}</TableCell>
                                                        <TableCell>{exam.passing_marks}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openSubjectEvaluation(exam.id)}
                                                            >
                                                                {t('Evaluate')}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {selectedEvaluationExam && (
                                    <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                                        <div className="flex flex-col gap-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900">
                                                    {selectedEvaluationExam.subject}
                                                </h3>
                                                <p className="text-sm text-slate-500">
                                                    {t('Total Marks:')}
                                                    {selectedEvaluationExam.total_marks}
                                                    {'| '}
                                                    {t('Min Marks:')}
                                                    {selectedEvaluationExam.passing_marks}
                                                </p>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label>{t('Class')}</Label>
                                                    <Select
                                                        value={evaluationClass}
                                                        onValueChange={(value) => {
                                                            setEvaluationClass(value);
                                                            setEvaluationSection('');
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Select class')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {evaluationClassOptions.map((option) => (
                                                                <SelectItem key={option} value={option}>
                                                                    {option}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>{t('Section')}</Label>
                                                    <Select
                                                        value={evaluationSection}
                                                        onValueChange={setEvaluationSection}
                                                        disabled={!evaluationClass}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Select section')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {evaluationSectionOptions.map((option) => (
                                                                <SelectItem key={option} value={option}>
                                                                    {t('Section')}
                                                                    {option}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Student')}</TableHead>
                                                        <TableHead>{t('Roll No')}</TableHead>
                                                        <TableHead>{t('Class')}</TableHead>
                                                        <TableHead>{t('Section')}</TableHead>
                                                        <TableHead>{t('Total Marks')}</TableHead>
                                                        <TableHead>{t('Min Marks')}</TableHead>
                                                        <TableHead>{t('Marks Obtained')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {!evaluationClass || !evaluationSection ? (
                                                        <TableRow>
                                                            <TableCell
                                                                colSpan={7}
                                                                className="text-center text-slate-500"
                                                            >
                                                                {t('Select class and section to evaluate students.')}
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : evaluationStudents.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell
                                                                colSpan={7}
                                                                className="text-center text-slate-500"
                                                            >
                                                                {t('No students found for')}
                                                                {evaluationClass}
                                                                {t('Section')}
                                                                {evaluationSection}.
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        evaluationStudents.map((student) => (
                                                            <TableRow key={student.id}>
                                                                <TableCell className="font-medium">
                                                                    {student.first_name} {student.last_name}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {student.roll_number || student.id}
                                                                </TableCell>
                                                                <TableCell>{student.class}</TableCell>
                                                                <TableCell>{student.section}</TableCell>
                                                                <TableCell>
                                                                    {selectedEvaluationExam.total_marks}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {selectedEvaluationExam.passing_marks}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        max={selectedEvaluationExam.total_marks}
                                                                        value={evaluationMarks[student.id] || ''}
                                                                        onChange={(e) =>
                                                                            setEvaluationMarks((current) => ({
                                                                                ...current,
                                                                                [student.id]: e.target.value,
                                                                            }))
                                                                        }
                                                                        placeholder={t('Enter marks')}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="flex justify-end">
                                            <Button type="button" onClick={saveEvaluationMarks}>
                                                {t('Save Marks')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="flex flex-wrap gap-3 lg:flex-nowrap">
                    <Card className="min-w-[120px] flex-1">
                        <CardContent className="px-4 py-3 text-left">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">{t('Total')}</p>
                            <p className="mt-1 text-xl font-bold">{stats.total}</p>
                        </CardContent>
                    </Card>
                    <Card className="min-w-[120px] flex-1">
                        <CardContent className="px-4 py-3 text-left">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">{t('Published')}</p>
                            <p className="mt-1 text-xl font-bold">{stats.published}</p>
                        </CardContent>
                    </Card>
                    <Card className="min-w-[120px] flex-1">
                        <CardContent className="px-4 py-3 text-left">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">{t('Draft')}</p>
                            <p className="mt-1 text-xl font-bold">{stats.draft}</p>
                        </CardContent>
                    </Card>
                    <Card className="min-w-[120px] flex-1">
                        <CardContent className="px-4 py-3 text-left">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">{t('With Subjects')}</p>
                            <p className="mt-1 text-xl font-bold">{stats.withSubjects}</p>
                        </CardContent>
                    </Card>
                    <Card className="min-w-[120px] flex-1">
                        <CardContent className="px-4 py-3 text-left">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">{t('With Results')}</p>
                            <p className="mt-1 text-xl font-bold">{stats.withResults}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="gap-3 pb-4">
                        <div className="flex flex-col items-start gap-4">
                            <CardTitle className="text-left">{t('Exam Records')}</CardTitle>
                            <div className="relative min-w-[260px]">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('Search exam records')}
                                    className="h-9 pl-10"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {filteredGroups.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">{t('No exam records found.')}</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Exam Name')}</TableHead>
                                            <TableHead>{t('Publish')}</TableHead>
                                            <TableHead>{t('Subjects')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredGroups.map((group) => {
                                            const status = getExamStatus(group);
                                            return (
                                                <TableRow key={group.groupId}>
                                                    <TableCell className="font-medium">{group.name}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                group.publishStatus === 'published'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {group.publishStatus}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{group.exams.length}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={status.badgeVariant}>{t(status.label)}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openSubjectsPanel(group)}
                                                            >
                                                                <BookOpen className="mr-1 h-4 w-4" />
                                                                {t('Subjects')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openEvaluationPanel(group)}
                                                            >
                                                                <FileText className="mr-1 h-4 w-4" />
                                                                {t('Evaluate')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openEditRecord(group)}
                                                            >
                                                                <Pencil className="mr-1 h-4 w-4" />
                                                                {t('Edit')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setViewGroup(group);
                                                                    setShowDetailsDialog(true);
                                                                }}
                                                            >
                                                                <Eye className="mr-1 h-4 w-4" />
                                                                {t('View')}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => deleteExamRecord(group)}
                                                            >
                                                                <Trash2 className="mr-1 h-4 w-4" />
                                                                {t('Delete')}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="gap-3 pb-4">
                        <div className="flex flex-col items-start gap-2">
                            <CardTitle className="text-left">{t('Exam Results')}</CardTitle>
                            <p className="text-sm text-slate-500">
                                {t('Results entered from the Exams page are shown here.')}
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {resultsRows.length === 0 ? (
                            <div className="py-12 text-center text-slate-500">
                                {t('No exam results available yet.')}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Exam')}</TableHead>
                                            <TableHead>{t('Subject')}</TableHead>
                                            <TableHead>{t('Student')}</TableHead>
                                            <TableHead>{t('Class / Section')}</TableHead>
                                            <TableHead>{t('Marks')}</TableHead>
                                            <TableHead>{t('Grade')}</TableHead>
                                            <TableHead>{t('Date')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {resultsRows.map((result) => (
                                            <TableRow key={`${result.examId}-${result.studentId}`}>
                                                <TableCell className="font-medium">{result.examName}</TableCell>
                                                <TableCell>{result.subject}</TableCell>
                                                <TableCell>{result.studentName}</TableCell>
                                                <TableCell>
                                                    {result.class} / {result.section}
                                                </TableCell>
                                                <TableCell>
                                                    {result.marksObtained}/{result.totalMarks}
                                                </TableCell>
                                                <TableCell>{t(result.grade)}</TableCell>
                                                <TableCell>
                                                    {result.examDate ? formatDate(result.examDate) : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog
                    open={showDetailsDialog}
                    onOpenChange={(open) => {
                        setShowDetailsDialog(open);
                        if (!open) {
                            setViewGroup(null);
                        }
                    }}
                >
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t('Exam Details')}</DialogTitle>
                        </DialogHeader>
                        {viewGroup && (
                            <div className="space-y-6">
                                {(() => {
                                    const viewResultsCount = viewGroup.exams.reduce(
                                        (count, exam) =>
                                            count + resultsRows.filter((row) => row.examId === exam.id).length,
                                        0,
                                    );

                                    return (
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <Card>
                                                <CardContent className="pt-6">
                                                    <p className="text-sm text-slate-500">{t('Exam')}</p>
                                                    <p className="font-semibold">{viewGroup.name}</p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="pt-6">
                                                    <p className="text-sm text-slate-500">{t('Publish')}</p>
                                                    <Badge
                                                        variant={
                                                            viewGroup.publishStatus === 'published'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {viewGroup.publishStatus}
                                                    </Badge>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="pt-6">
                                                    <p className="text-sm text-slate-500">{t('Results')}</p>
                                                    <p className="font-semibold">{viewResultsCount}</p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    );
                                })()}

                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold">{t('Subjects')}</h3>
                                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('Subject')}</TableHead>
                                                    <TableHead>{t('Class')}</TableHead>
                                                    <TableHead>{t('Date')}</TableHead>
                                                    <TableHead>{t('Time')}</TableHead>
                                                    <TableHead>{t('Marks')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {viewGroup.exams.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center text-slate-500">
                                                            {t('No subjects added yet.')}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    viewGroup.exams.map((exam) => (
                                                        <TableRow key={exam.id}>
                                                            <TableCell>{exam.subject}</TableCell>
                                                            <TableCell>
                                                                {exam.class} / {exam.section}
                                                            </TableCell>
                                                            <TableCell>{formatDate(exam.exam_date)}</TableCell>
                                                            <TableCell>
                                                                {exam.start_time} - {exam.end_time}
                                                            </TableCell>
                                                            <TableCell>
                                                                {exam.total_marks}/{exam.passing_marks}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
