import React, { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, Flag } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  ActiveOnlineExamSession,
  ONLINE_EXAM_ACTIVE_SESSION_STORAGE_KEY,
  OnlineExamAttempt,
  OnlineExamQuestion,
  OnlineExamRecord,
  StudentOnlineExamRecord,
  formatDateTime,
  getOnlineExamAvailability,
  loadStoredJson,
  saveStoredJson,
  shuffleQuestionOrder,
} from './studentOnlineExamData';

interface StudentOnlineExamsProps {
  user: any;
  onlineExams: OnlineExamRecord[];
  attempts: OnlineExamAttempt[];
  studentRecord: StudentOnlineExamRecord | null;
}

export default function StudentOnlineExams({ user, onlineExams, attempts, studentRecord }: StudentOnlineExamsProps) {
  const flash = (usePage().props as any).flash ?? {};
  const [activeSession, setActiveSession] = useState<ActiveOnlineExamSession | null>(null);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const storedSession = loadStoredJson<ActiveOnlineExamSession | null>(ONLINE_EXAM_ACTIVE_SESSION_STORAGE_KEY, null);
    if (!storedSession || storedSession.userId !== String(user.id)) {
      return;
    }

    setActiveSession(storedSession);
    setActiveExamId(storedSession.examId);
    setAnswers(storedSession.answers || {});
  }, [user.id]);

  const studentAttempts = useMemo(
    () =>
      [...attempts].sort(
        (left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime()
      ),
    [attempts]
  );

  const attemptsByExamId = useMemo(
    () =>
      studentAttempts.reduce<Record<string, OnlineExamAttempt>>((accumulator, attempt) => {
        accumulator[String(attempt.examId)] = attempt;
        return accumulator;
      }, {}),
    [studentAttempts]
  );

  const recentAttempt = useMemo(() => {
    const recentAttemptId = flash.recentAttemptId ? String(flash.recentAttemptId) : '';

    if (!recentAttemptId) {
      return null;
    }

    return studentAttempts.find((attempt) => String(attempt.id) === recentAttemptId) || null;
  }, [flash.recentAttemptId, studentAttempts]);

  const availableExams = useMemo(
    () =>
      [...onlineExams].sort(
        (left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
      ),
    [onlineExams]
  );

  const activeExam = useMemo(
    () => availableExams.find((exam) => exam.id === activeExamId) || null,
    [activeExamId, availableExams]
  );

  const currentAttempt = useMemo(
    () => (activeExam ? attemptsByExamId[String(activeExam.id)] || null : null),
    [activeExam, attemptsByExamId]
  );

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    if (!activeExam || currentAttempt) {
      persistActiveSession(null);
      setAnswers({});
      setActiveExamId(null);
    }
  }, [activeExam, activeSession, currentAttempt]);

  const currentQuestionOrder = useMemo(() => {
    if (!activeExam) {
      return [];
    }

    return activeSession?.examId === activeExam.id && activeSession.questionOrder.length > 0
      ? activeSession.questionOrder
      : activeExam.questions.map((question) => question.id);
  }, [activeExam, activeSession]);

  const currentQuestions = useMemo(() => {
    if (!activeExam) {
      return [];
    }

    return currentQuestionOrder
      .map((questionId) => activeExam.questions.find((question) => question.id === questionId))
      .filter(Boolean) as OnlineExamQuestion[];
  }, [activeExam, currentQuestionOrder]);

  const currentQuestion = currentQuestions[currentQuestionIndex] || null;

  const answeredCount = useMemo(
    () => Object.values(answers).filter((answer) => answer.trim()).length,
    [answers]
  );

  const flaggedCount = useMemo(
    () => Object.values(flaggedQuestions).filter(Boolean).length,
    [flaggedQuestions]
  );

  useEffect(() => {
    if (!activeSession || !activeExam) {
      return;
    }

    const examDurationInSeconds = (Number(activeExam.duration) || 0) * 60;
    const startedAtTime = new Date(activeSession.startedAt).getTime();

    if (Number.isNaN(startedAtTime)) {
      setTimeRemaining(examDurationInSeconds);
      return;
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtTime) / 1000));
    setTimeRemaining(Math.max(0, examDurationInSeconds - elapsedSeconds));
  }, [activeExam, activeSession]);

  useEffect(() => {
    if (!activeExam || !activeSession) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimeRemaining((previous) => {
        if (previous <= 1) {
          window.clearInterval(intervalId);
          submitExam(true);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeExam, activeSession]);

  const persistActiveSession = (session: ActiveOnlineExamSession | null) => {
    setActiveSession(session);
    saveStoredJson(ONLINE_EXAM_ACTIVE_SESSION_STORAGE_KEY, session);
  };

  const startExam = (exam: OnlineExamRecord) => {
    const existingAttempt = attemptsByExamId[String(exam.id)] || null;

    if (existingAttempt) {
      persistActiveSession(null);
      setActiveExamId(null);
      router.visit(`/online-exams/results/${existingAttempt.id}`);
      return;
    }

    const nextSession: ActiveOnlineExamSession =
      activeSession && activeSession.examId === exam.id && activeSession.userId === String(user.id)
        ? activeSession
        : {
            userId: String(user.id),
            studentId: studentRecord?.id || null,
            examId: exam.id,
            startedAt: new Date().toISOString(),
            answers: {},
            questionOrder: exam.shuffleQuestions
              ? shuffleQuestionOrder(exam.questions)
              : exam.questions.map((question) => question.id),
          };

    setFlaggedQuestions({});
    setCurrentQuestionIndex(0);
    setAnswers(nextSession.answers);
    setActiveExamId(exam.id);
    persistActiveSession(nextSession);
  };

  const updateSessionAnswers = (nextAnswers: Record<string, string>) => {
    setAnswers(nextAnswers);

    if (!activeSession) {
      return;
    }

    persistActiveSession({
      ...activeSession,
      answers: nextAnswers,
    });
  };

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) {
      return;
    }

    updateSessionAnswers({
      ...answers,
      [currentQuestion.id]: value,
    });
  };

  const clearAnswer = () => {
    if (!currentQuestion) {
      return;
    }

    const nextAnswers = { ...answers };
    delete nextAnswers[currentQuestion.id];
    updateSessionAnswers(nextAnswers);
  };

  const toggleFlag = () => {
    if (!currentQuestion) {
      return;
    }

    setFlaggedQuestions((current) => ({
      ...current,
      [currentQuestion.id]: !current[currentQuestion.id],
    }));
  };

  const submitExam = (autoSubmitted = false) => {
    if (!activeExam || !activeSession) {
      return;
    }

    router.post(
      `/online-exams/${activeExam.id}/submit`,
      {
        answers,
        questionOrder: currentQuestionOrder,
        startedAt: activeSession.startedAt,
        autoSubmitted,
      },
      {
        preserveScroll: false,
        onSuccess: () => {
          setShowSubmitDialog(false);
          setCurrentQuestionIndex(0);
          setAnswers({});
          setFlaggedQuestions({});
          setActiveExamId(null);
          persistActiveSession(null);
        },
      }
    );
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const getQuestionStatus = (questionId: string) => {
    if (flaggedQuestions[questionId]) {
      return 'flagged';
    }

    if ((answers[questionId] || '').trim()) {
      return 'answered';
    }

    return 'unanswered';
  };

  const liveExamsCount = useMemo(
    () => availableExams.filter((exam) => getOnlineExamAvailability(exam).label === 'Live').length,
    [availableExams]
  );

  const resumableExam = useMemo(
    () =>
      activeSession && activeSession.userId === String(user.id)
        ? availableExams.find((exam) => exam.id === activeSession.examId) || null
        : null,
    [activeSession, availableExams, user.id]
  );

  const attemptedExamIds = useMemo(
    () => new Set(Object.keys(attemptsByExamId)),
    [attemptsByExamId]
  );

  if (!studentRecord) {
    return (
      <DashboardLayout user={user} activeTab="online-exams">
        <div className="space-y-6 p-6">
          {flash.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{flash.error}</div>
          ) : null}
          <Card>
            <CardContent className="py-12 text-center text-slate-600">
              Your student profile is not linked yet, so online exams are not available for this account.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (activeExam && currentQuestion && !currentAttempt) {
    return (
      <DashboardLayout user={user} activeTab="online-exams">
        <div className="min-h-screen bg-gray-50 flex">
          <div className="flex-1 p-6">
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-gray-900">{activeExam.title}</h2>
                  <p className="text-sm text-gray-600">{activeExam.subject || 'General'}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Time Remaining</p>
                    <div className={`flex items-center gap-2 text-lg ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'}`}>
                      <Clock className="h-5 w-5" />
                      <span>{formatTime(timeRemaining)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Progress</p>
                    <p className="text-lg text-gray-900">
                      {answeredCount}/{currentQuestions.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Question {currentQuestionIndex + 1} of {currentQuestions.length}
                    </span>
                    {flaggedQuestions[currentQuestion.id] ? <Flag className="h-4 w-4 fill-orange-500 text-orange-500" /> : null}
                  </div>
                  <h3 className="mb-2 text-gray-900">{currentQuestion.question}</h3>
                  <p className="text-sm text-gray-600">Marks: {currentQuestion.marks}</p>
                </div>
                <button
                  type="button"
                  onClick={toggleFlag}
                  className={`rounded-lg p-2 transition-colors ${
                    flaggedQuestions[currentQuestion.id]
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Flag className={`h-5 w-5 ${flaggedQuestions[currentQuestion.id] ? 'fill-current' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <label
                    key={`${currentQuestion.id}_${option}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                      answers[currentQuestion.id] === option
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`answer-${currentQuestion.id}`}
                      checked={answers[currentQuestion.id] === option}
                      onChange={() => handleAnswerChange(option)}
                      className="h-5 w-5 text-indigo-600"
                    />
                    <span className="flex-1 text-gray-900">{option}</span>
                  </label>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <Button type="button" variant="outline" onClick={clearAnswer} disabled={!answers[currentQuestion.id]}>
                  Clear Response
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
                Previous
              </button>

              <button
                type="button"
                onClick={() => setShowSubmitDialog(true)}
                className="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700"
              >
                Submit Quiz
              </button>

              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(Math.min(currentQuestions.length - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === currentQuestions.length - 1}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="w-80 overflow-y-auto border-l border-gray-200 bg-white p-6">
            <h3 className="mb-4">Question Navigation</h3>

            <div className="mb-4 space-y-2 rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">Answered</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Circle className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Not Answered</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Flag className="h-4 w-4 text-orange-500" />
                <span className="text-gray-600">Flagged</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {currentQuestions.map((question, index) => {
                const status = getQuestionStatus(question.id);
                const isCurrent = currentQuestionIndex === index;

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`relative aspect-square rounded-lg text-sm transition-all ${
                      isCurrent
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                        : status === 'answered'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {index + 1}
                    {status === 'flagged' ? (
                      <Flag className="absolute -right-1 -top-1 h-3 w-3 fill-orange-500 text-orange-500" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 space-y-2 rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Questions:</span>
                <span className="text-gray-900">{currentQuestions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Answered:</span>
                <span className="text-green-600">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Not Answered:</span>
                <span className="text-gray-600">{currentQuestions.length - answeredCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Flagged:</span>
                <span className="text-orange-600">{flaggedCount}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-6 w-full"
              onClick={() => {
                setActiveExamId(null);
                setShowSubmitDialog(false);
              }}
            >
              Back to Exams
            </Button>
          </div>

          {showSubmitDialog ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start gap-4">
                  <AlertCircle className="mt-1 h-6 w-6 flex-shrink-0 text-orange-500" />
                  <div>
                    <h3 className="mb-2 text-gray-900">Submit Quiz?</h3>
                    <p className="text-sm text-gray-600">
                      Are you sure you want to submit this quiz? You have answered {answeredCount} out of {currentQuestions.length} questions.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSubmitDialog(false)}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => submitExam(false)}
                    className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                  >
                    Yes, Submit
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} activeTab="online-exams">
      <div className="space-y-6 p-6">
        {flash.success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{flash.success}</div>
        ) : null}
        {flash.error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{flash.error}</div>
        ) : null}

        <div>
          <h1 className="text-3xl font-bold text-slate-900">Online Exams</h1>
          <p className="mt-1 text-sm text-slate-600">
            Attend live online exams for {studentRecord.className} Section {studentRecord.section}, resume active attempts, and review your results.
          </p>
        </div>

        {resumableExam ? (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="flex flex-col gap-3 px-5 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Active Attempt Found</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{resumableExam.title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Resume where you left off. Your answers are saved in this browser until submission.
                </p>
              </div>
              <Button type="button" onClick={() => startExam(resumableExam)}>
                Resume Exam
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {recentAttempt ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="flex flex-col gap-3 px-5 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Latest Result</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{recentAttempt.examTitle}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Score {recentAttempt.obtainedMarks}/{recentAttempt.totalMarks} with {recentAttempt.percentage}%.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.visit(`/online-exams/results/${recentAttempt.id}`)}
              >
                View Detailed Result
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Available</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{availableExams.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Live Now</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{liveExamsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
              <p className="mt-2 text-2xl font-bold text-indigo-600">{studentAttempts.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attend Online Exams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableExams.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center text-slate-500">
                No online exams are available for your class right now.
              </div>
            ) : (
              availableExams.map((exam) => {
                const availability = getOnlineExamAvailability(exam);
                const previousAttempt = attemptsByExamId[String(exam.id)] || null;
                const resumableSession =
                  activeSession && activeSession.examId === exam.id && activeSession.userId === String(user.id);
                const hasAttempted = attemptedExamIds.has(exam.id);
                const statusLabel = hasAttempted ? 'Completed' : availability.label;
                const statusVariant = hasAttempted ? 'outline' : availability.badgeVariant;

                return (
                  <div key={exam.id} className="rounded-xl border border-slate-200 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-slate-900">{exam.title}</h3>
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                          {previousAttempt ? <Badge variant="outline">Attempted</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{exam.subject || 'General'}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                          <span>Duration: {exam.duration} mins</span>
                          <span>Questions: {exam.questions.length}</span>
                          <span>Total Marks: {exam.questions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0)}</span>
                          <span>
                            Negative Marking: {exam.negativeMarkingEnabled ? exam.negativeMarks : 'No'}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          <div>Starts: {formatDateTime(exam.startTime)}</div>
                          <div>Ends: {formatDateTime(exam.endTime)}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {resumableSession && !previousAttempt ? (
                          <Button type="button" onClick={() => startExam(exam)}>
                            Resume Exam
                          </Button>
                        ) : availability.canAttend && !previousAttempt ? (
                          <Button type="button" onClick={() => startExam(exam)}>
                            Attend Now
                          </Button>
                        ) : previousAttempt ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit(`/online-exams/results/${previousAttempt.id}`)}
                          >
                            View Result
                          </Button>
                        ) : (
                          <Button type="button" variant="outline" disabled>
                            {availability.label}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Results</CardTitle>
          </CardHeader>
          <CardContent>
            {studentAttempts.length === 0 ? (
              <div className="py-10 text-center text-slate-500">You have not submitted any online exams yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Exam</th>
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">Score</th>
                      <th className="px-4 py-3 font-medium">Percentage</th>
                      <th className="px-4 py-3 font-medium">Submitted</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentAttempts.map((attempt) => (
                      <tr key={attempt.id} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">{attempt.examTitle}</td>
                        <td className="px-4 py-3 text-slate-600">{attempt.subject}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {attempt.obtainedMarks}/{attempt.totalMarks}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{attempt.percentage}%</td>
                        <td className="px-4 py-3 text-slate-600">{formatDateTime(attempt.submittedAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => router.visit(`/online-exams/results/${attempt.id}`)}
                          >
                            View Result
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
