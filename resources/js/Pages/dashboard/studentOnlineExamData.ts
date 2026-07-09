import { formatDateTime as formatDisplayDateTime } from '../ui/utils';

export type OnlineQuestionType = 'mcq' | 'true_false';

export interface OnlineExamQuestion {
  id: string;
  type: OnlineQuestionType;
  question: string;
  options: string[];
  correctAnswer: string;
  marks: string;
}

export interface OnlineExamRecord {
  id: string;
  title: string;
  subject: string;
  className: string;
  section: string;
  targetClassSections: { className: string; section: string }[];
  duration: string;
  startTime: string;
  endTime: string;
  negativeMarkingEnabled: boolean;
  negativeMarks: string;
  shuffleQuestions: boolean;
  status: 'draft' | 'published';
  questions: OnlineExamQuestion[];
  createdAt: string;
  attemptsCount?: number;
}

export interface OnlineExamAttempt {
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
  questionSnapshot: OnlineExamQuestion[];
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

export interface ActiveOnlineExamSession {
  userId: string;
  studentId: string | null;
  examId: string;
  startedAt: string;
  answers: Record<string, string>;
  questionOrder: string[];
}

export interface StudentOnlineExamRecord {
  id: string;
  name: string;
  email: string;
  className: string;
  section: string;
}

export const ONLINE_EXAM_ACTIVE_SESSION_STORAGE_KEY = 'laravel_gurukul_online_exam_active_session';

export const loadStoredJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return fallback;
  }
};

export const saveStoredJson = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
};

export const shuffleQuestionOrder = (questions: OnlineExamQuestion[]) => {
  const order = questions.map((question) => question.id);

  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  return order;
};

export const formatDateTime = (value: string) => {
  return formatDisplayDateTime(value, value || '-');
};

export const getOnlineExamAvailability = (exam: OnlineExamRecord) => {
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

export const calculateOnlineExamAttempt = (
  exam: OnlineExamRecord,
  answers: Record<string, string>,
  questionOrder: string[]
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

export const getAttemptQuestions = (exam: OnlineExamRecord | null, attempt: OnlineExamAttempt) => {
  if (attempt.questionSnapshot.length > 0) {
    return attempt.questionSnapshot;
  }

  if (!exam) {
    return [];
  }

  const orderedQuestions = attempt.questionOrder
    .map((questionId) => exam.questions.find((question) => question.id === questionId))
    .filter(Boolean) as OnlineExamQuestion[];

  return orderedQuestions.length > 0 ? orderedQuestions : exam.questions;
};
