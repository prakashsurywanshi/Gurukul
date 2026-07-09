import React, { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ClipboardPenLine, MessageSquare } from 'lucide-react';
import { formatDate, formatDateTime } from '../ui/utils';
import { toast } from 'sonner';

interface StudentFeedbackProps {
  user: any;
  schoolName: string;
  studentRecord?: StudentRecord | null;
  teachers: TeacherRecord[];
  campaigns: StudentCampaignRecord[];
}

interface StudentRecord {
  id: string;
  admission_no?: string | null;
  first_name: string;
  last_name: string;
  class?: string | null;
  section?: string | null;
}

interface TeacherRecord {
  id: string;
  name: string;
  email?: string | null;
}

interface StudentCampaignRecord {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status: 'active' | 'closed';
  isSubmitted: boolean;
  submittedAt?: string | null;
  responses: {
    teacherId: string;
    teacherName: string;
    rating: number;
    comment: string;
  }[];
}

type TeacherFeedbackState = Record<string, { rating: string; comment: string }>;

const buildDefaultTeacherFeedback = (teachers: TeacherRecord[]): TeacherFeedbackState =>
  teachers.reduce<TeacherFeedbackState>((accumulator, teacher) => {
    accumulator[teacher.id] = { rating: '', comment: '' };
    return accumulator;
  }, {});

export default function StudentFeedback({ user, studentRecord, teachers, campaigns }: StudentFeedbackProps) {
  const flash = usePage<{ flash?: { success?: string; error?: string } }>().props.flash ?? {};
  const [campaignFeedbacks, setCampaignFeedbacks] = useState<Record<string, TeacherFeedbackState>>({});

  useEffect(() => {
    if (flash.success) {
      toast.success(flash.success);
    }

    if (flash.error) {
      toast.error(flash.error);
    }
  }, [flash.error, flash.success]);

  useEffect(() => {
    setCampaignFeedbacks((current) => {
      const next = { ...current };

      campaigns.forEach((campaign) => {
        if (!next[campaign.id]) {
          next[campaign.id] = buildDefaultTeacherFeedback(teachers);
        }
      });

      return next;
    });
  }, [campaigns, teachers]);

  const studentName = useMemo(() => {
    if (!studentRecord) {
      return user?.name || 'Student';
    }

    return [studentRecord.first_name, studentRecord.last_name].filter(Boolean).join(' ');
  }, [studentRecord, user?.name]);

  const updateTeacherFeedback = (campaignId: string, teacherId: string, key: 'rating' | 'comment', value: string) => {
    setCampaignFeedbacks((current) => ({
      ...current,
      [campaignId]: {
        ...(current[campaignId] || buildDefaultTeacherFeedback(teachers)),
        [teacherId]: {
          ...((current[campaignId] || buildDefaultTeacherFeedback(teachers))[teacherId] || { rating: '', comment: '' }),
          [key]: value,
        },
      },
    }));
  };

  const handleSubmit = (campaignId: string) => {
    const feedback = campaignFeedbacks[campaignId] || buildDefaultTeacherFeedback(teachers);

    for (const teacher of teachers) {
      if (!feedback[teacher.id]?.rating) {
        toast.error(`Please rate ${teacher.name}`);
        return;
      }

      if (!feedback[teacher.id]?.comment.trim()) {
        toast.error(`Please write feedback for ${teacher.name}`);
        return;
      }
    }

    router.post(
      `/feedback/${campaignId}/submit`,
      {
        feedbacks: teachers.map((teacher) => ({
          teacher_id: Number(teacher.id),
          rating: Number(feedback[teacher.id].rating),
          comment: feedback[teacher.id].comment.trim(),
        })),
      },
      {
        preserveScroll: true,
      }
    );
  };

  return (
    <DashboardLayout user={user} activeTab="feedback">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Feedback</h1>
          <p className="mt-1 text-sm text-slate-600">
            Submit your feedback for all teachers when an admin opens a feedback campaign.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{studentName}</p>
              <p className="text-sm text-slate-500">{studentRecord?.admission_no || 'No admission no.'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Class</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {studentRecord?.class ? `Class ${studentRecord.class}` : 'N/A'}
                {studentRecord?.section ? ` - ${studentRecord.section}` : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Campaigns</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{campaigns.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Feedback Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="py-12 text-center">
                <ClipboardPenLine className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                <p className="text-slate-500">No feedback campaigns are available right now.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {campaigns.map((campaign) => {
                  const feedback = campaignFeedbacks[campaign.id] || buildDefaultTeacherFeedback(teachers);

                  return (
                    <div key={campaign.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-900">{campaign.title}</h3>
                            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                            {campaign.isSubmitted ? <Badge variant="outline">Submitted</Badge> : null}
                          </div>
                          {campaign.description ? (
                            <p className="text-sm text-slate-600">{campaign.description}</p>
                          ) : null}
                          <p className="text-sm text-slate-500">
                            {campaign.dueDate ? `Due ${formatDate(campaign.dueDate)}` : 'No due date'}
                            {campaign.submittedAt ? ` | Submitted ${formatDateTime(campaign.submittedAt)}` : ''}
                          </p>
                        </div>
                      </div>

                      {campaign.isSubmitted ? (
                        <div className="mt-4 space-y-3">
                          {campaign.responses.map((response) => (
                            <div key={`${campaign.id}-${response.teacherId}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium text-slate-900">{response.teacherName}</p>
                                <Badge variant="secondary">{response.rating}/5</Badge>
                              </div>
                              <p className="mt-2 text-sm text-slate-600">{response.comment}</p>
                            </div>
                          ))}
                        </div>
                      ) : campaign.status !== 'active' ? (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                          This feedback campaign is closed.
                        </div>
                      ) : teachers.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                          No teachers are available for feedback.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-4">
                          {teachers.map((teacher) => (
                            <div key={`${campaign.id}-${teacher.id}`} className="rounded-xl border border-slate-200 p-4">
                              <div className="space-y-3">
                                <div>
                                  <p className="font-medium text-slate-900">{teacher.name}</p>
                                  {teacher.email ? <p className="text-xs text-slate-500">{teacher.email}</p> : null}
                                </div>
                                <div className="space-y-2">
                                  <Label>Rating</Label>
                                  <select
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                    value={feedback[teacher.id]?.rating || ''}
                                    onChange={(event) => updateTeacherFeedback(campaign.id, teacher.id, 'rating', event.target.value)}
                                  >
                                    <option value="">Select rating</option>
                                    <option value="5">5 - Excellent</option>
                                    <option value="4">4 - Good</option>
                                    <option value="3">3 - Average</option>
                                    <option value="2">2 - Needs Improvement</option>
                                    <option value="1">1 - Poor</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Feedback</Label>
                                  <Textarea
                                    value={feedback[teacher.id]?.comment || ''}
                                    onChange={(event) => updateTeacherFeedback(campaign.id, teacher.id, 'comment', event.target.value)}
                                    placeholder={`Write feedback for ${teacher.name}`}
                                    rows={4}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          <div className="flex justify-end">
                            <Button className="gap-2" onClick={() => handleSubmit(campaign.id)}>
                              <MessageSquare className="h-4 w-4" />
                              Submit Feedback
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
