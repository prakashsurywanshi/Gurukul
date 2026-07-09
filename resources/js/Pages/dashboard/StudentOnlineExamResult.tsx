import React, { useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { getAttemptQuestions, OnlineExamAttempt, OnlineExamRecord, formatDateTime } from './studentOnlineExamData';

interface StudentOnlineExamResultProps {
  user: any;
  attempt: OnlineExamAttempt | null;
  exam: OnlineExamRecord | null;
}

export default function StudentOnlineExamResult({ user, attempt, exam }: StudentOnlineExamResultProps) {
  const flash = (usePage().props as any).flash ?? {};
  const attemptQuestions = useMemo(
    () => (attempt ? getAttemptQuestions(exam, attempt) : []),
    [attempt, exam]
  );

  if (!attempt) {
    return (
      <DashboardLayout user={user} activeTab="online-exams">
        <div className="space-y-6 p-6">
          <Button type="button" variant="outline" onClick={() => router.visit('/online-exams')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Online Exams
          </Button>

          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              Result not found.
            </CardContent>
          </Card>
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

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Button type="button" variant="outline" onClick={() => router.visit('/online-exams')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Online Exams
            </Button>
            <h1 className="mt-4 text-3xl font-bold text-slate-900">{attempt.examTitle}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {attempt.subject} | Submitted {formatDateTime(attempt.submittedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              Score: {attempt.obtainedMarks}/{attempt.totalMarks}
            </Badge>
            <Badge variant="outline">{attempt.percentage}%</Badge>
            <Badge variant="outline">
              Attempted: {attempt.attemptedQuestions}/{attempt.totalQuestions}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Correct</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{attempt.correctAnswers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Incorrect</p>
              <p className="mt-2 text-2xl font-bold text-rose-600">{attempt.wrongAnswers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Unanswered</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{attempt.unansweredQuestions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Negative Marks</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">{attempt.negativeMarksApplied}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attemptQuestions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Your score summary is available above, but question-wise review is not available for this attempt.
              </div>
            ) : null}

            {attemptQuestions.map((question, index) => {
              const studentAnswer = (attempt.answers[question.id] || '').trim();
              const isCorrect = studentAnswer !== '' && studentAnswer === question.correctAnswer;

              return (
                <div key={question.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">Question {index + 1}</p>
                      <h3 className="font-medium text-slate-900">{question.question}</h3>
                    </div>
                    <Badge variant={isCorrect ? 'default' : 'secondary'}>
                      {isCorrect ? 'Correct' : studentAnswer ? 'Incorrect' : 'Not Answered'}
                    </Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Your Answer
                      </p>
                      <p className={studentAnswer ? 'text-slate-900' : 'text-slate-400'}>
                        {studentAnswer || 'No answer submitted'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-700">
                        Correct Answer
                      </p>
                      <p className="text-emerald-900">{question.correctAnswer}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Options Review</p>
                    {question.options.map((option) => {
                      const isMarkedAnswer = studentAnswer === option;
                      const isCorrectAnswer = question.correctAnswer === option;

                      return (
                        <div
                          key={`${question.id}_${option}`}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                            isCorrectAnswer
                              ? 'border-emerald-200 bg-emerald-50'
                              : isMarkedAnswer
                              ? 'border-rose-200 bg-rose-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-sm text-slate-900">
                            {isCorrectAnswer ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-slate-300" />
                            )}
                            <span>{option}</span>
                          </div>
                          <div className="flex gap-2">
                            {isMarkedAnswer ? <Badge variant="secondary">Marked Answer</Badge> : null}
                            {isCorrectAnswer ? <Badge>Correct Answer</Badge> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
