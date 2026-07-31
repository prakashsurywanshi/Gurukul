import React, { useMemo } from 'react';
import { CalendarDays, CircleCheckBig, Clock3, FileText, MapPin, Printer, School, XCircle } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
import { formatDate } from '../ui/utils';

interface StudentOfflineExamsProps {
  user: any;
  organization?: {
    id: number;
    name: string;
    logo?: string | null;
  } | null;
  studentRecord?: {
    id: string;
    admission_no?: string | null;
    roll_number?: string | null;
    first_name: string;
    last_name: string;
    class?: string | null;
    section?: string | null;
  } | null;
  examGroups: ExamGroup[];
}

interface ExamGroup {
  groupId: string;
  name: string;
  publishStatus: 'draft' | 'published';
  className?: string | null;
  section?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  subjectsCount: number;
  publishedResultsCount: number;
  resultPercentage?: number | null;
  schedules: ExamSchedule[];
}

interface ExamSchedule {
  id: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room_number?: string | null;
  total_marks: number;
  passing_marks: number;
  has_result: boolean;
  marks_obtained?: number | null;
  grade?: string | null;
  status: 'pending' | 'passed' | 'failed';
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default function StudentOfflineExams({
  user,
  organization,
  studentRecord,
  examGroups,
}: StudentOfflineExamsProps) {
  const studentName = useMemo(() => {
    if (!studentRecord) {
      return user?.name || 'Student';
    }

    return [studentRecord.first_name, studentRecord.last_name].filter(Boolean).join(' ');
  }, [studentRecord, user?.name]);

  const stats = useMemo(() => {
    const schedules = examGroups.flatMap((group) => group.schedules);

    return {
      exams: examGroups.length,
      scheduledSubjects: schedules.length,
      evaluatedSubjects: schedules.filter((schedule) => schedule.has_result).length,
      passedSubjects: schedules.filter((schedule) => schedule.status === 'passed').length,
    };
  }, [examGroups]);

  const renderResultBadge = (schedule: ExamSchedule) => {
    if (!schedule.has_result) {
      return <Badge variant="outline">Awaiting Evaluation</Badge>;
    }

    if (schedule.status === 'passed') {
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Passed</Badge>;
    }

    return <Badge className="bg-rose-600 text-white hover:bg-rose-600">Needs Improvement</Badge>;
  };

  const openPrintWindow = (title: string, content: string) => {
    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) {
      toast.error('Unable to open print preview.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; background: #f8fafc; }
            .sheet { border: 1px solid #cbd5e1; border-radius: 18px; padding: 24px; background: #ffffff; }
            .heading { display: flex; justify-content: space-between; align-items: start; gap: 16px; margin-bottom: 24px; }
            .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
            .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 14px; vertical-align: top; }
            th { background: #eff6ff; }
            .muted { color: #64748b; font-size: 13px; }
          </style>
        </head>
        <body>
          ${content}
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const buildResultMarkup = (group: ExamGroup) => {
    const resultSchedules = group.schedules.filter((schedule) => schedule.has_result);
    const totalObtained = resultSchedules.reduce((sum, schedule) => sum + Number(schedule.marks_obtained || 0), 0);
    const totalMarks = resultSchedules.reduce((sum, schedule) => sum + Number(schedule.total_marks || 0), 0);
    const percentage = totalMarks > 0 ? (totalObtained / totalMarks) * 100 : 0;
    const overallStatus =
      resultSchedules.length > 0 && resultSchedules.every((schedule) => schedule.status === 'passed') ? 'Pass' : 'Needs Improvement';

    const rows = resultSchedules
      .map(
        (schedule, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(schedule.subject)}</td>
            <td>${escapeHtml(formatDate(schedule.exam_date, 'TBA'))}</td>
            <td>${schedule.total_marks}</td>
            <td>${schedule.passing_marks}</td>
            <td>${schedule.marks_obtained ?? '-'}</td>
            <td>${escapeHtml(schedule.grade || 'N/A')}</td>
            <td>${escapeHtml(schedule.status === 'passed' ? 'Pass' : 'Needs Improvement')}</td>
          </tr>
        `
      )
      .join('');

    return `
      <div class="sheet">
        <div class="heading">
          <div>
            <div style="font-size: 26px; font-weight: 700;">${escapeHtml(organization?.name || 'School')}</div>
            <div style="margin-top: 6px; font-size: 16px;">${escapeHtml(group.name)} - Exam Result</div>
            <div class="muted" style="margin-top: 6px;">
              Student: ${escapeHtml(studentName)} | ${escapeHtml(group.className || '-')} - ${escapeHtml(group.section || '-')}
            </div>
          </div>
          <div class="muted">${escapeHtml(formatDate(new Date(), 'TBA'))}</div>
        </div>
        <div class="meta">
          <div class="box"><strong>Admission No</strong><br />${escapeHtml(studentRecord?.admission_no || 'N/A')}</div>
          <div class="box"><strong>Roll Number</strong><br />${escapeHtml(studentRecord?.roll_number || 'N/A')}</div>
          <div class="box"><strong>Result</strong><br />${escapeHtml(overallStatus)}</div>
          <div class="box"><strong>Percentage</strong><br />${resultSchedules.length > 0 ? `${percentage.toFixed(2)}%` : 'N/A'}</div>
          <div class="box"><strong>Obtained Marks</strong><br />${totalObtained} / ${totalMarks}</div>
          <div class="box"><strong>Evaluated Subjects</strong><br />${resultSchedules.length}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Subject</th>
              <th>Date</th>
              <th>Total</th>
              <th>Pass</th>
              <th>Obtained</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  };

  const handlePrintResult = (group: ExamGroup) => {
    if (!group.schedules.some((schedule) => schedule.has_result)) {
      toast.error('No evaluated results are available to print for this exam yet.');
      return;
    }

    openPrintWindow(`${group.name} Result`, buildResultMarkup(group));
  };

  return (
    <DashboardLayout user={user} activeTab="offline-exams">
      <div className="space-y-6 bg-slate-50/70 p-6">
        <div>
          <p className="text-sm font-medium text-slate-500">{organization?.name || 'School'}</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Offline Exams</h1>
          <p className="mt-2 text-sm text-slate-600">
            Check your written exam schedule and see marks here after teachers finish evaluation.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{studentName}</p>
              <p className="text-sm text-slate-500">{studentRecord?.admission_no || 'No admission no.'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Class</p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {studentRecord?.class ? `${studentRecord.class}` : 'N/A'}
                {studentRecord?.section ? ` - ${studentRecord.section}` : ''}
              </p>
              <p className="text-sm text-slate-500">Roll No. {studentRecord?.roll_number || 'N/A'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Exam Groups</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.exams}</p>
              <p className="text-sm text-slate-500">{stats.scheduledSubjects} scheduled subjects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Evaluated</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.evaluatedSubjects}</p>
              <p className="text-sm text-slate-500">{stats.passedSubjects} subjects passed</p>
            </CardContent>
          </Card>
        </div>

        {examGroups.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center text-slate-500">
              No offline exams are assigned to your class yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {examGroups.map((group) => (
              <Card key={group.groupId} className="border-slate-200 shadow-sm">
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="text-xl">{group.name}</CardTitle>
                      <CardDescription className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5">
                          <School className="h-4 w-4" />
                          {group.className} - {group.section}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(group.startDate, 'TBA')} to {formatDate(group.endDate, 'TBA')}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() => handlePrintResult(group)}
                        disabled={!group.schedules.some((schedule) => schedule.has_result)}
                      >
                        <Printer className="h-4 w-4" />
                        Print Result
                      </Button>
                      <Badge variant={group.publishStatus === 'published' ? 'default' : 'secondary'}>
                        {group.publishStatus === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                      <Badge variant="outline">
                        {group.publishedResultsCount}/{group.subjectsCount} evaluated
                      </Badge>
                      {group.resultPercentage !== null ? (
                        <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                          {group.resultPercentage.toFixed(2)}%
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px]">
                      <thead className="border-b border-slate-200 text-left text-sm text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Subject</th>
                          <th className="px-4 py-3 font-medium">Schedule</th>
                          <th className="px-4 py-3 font-medium">Room</th>
                          <th className="px-4 py-3 font-medium">Marks</th>
                          <th className="px-4 py-3 font-medium">Grade</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.schedules.map((schedule) => (
                          <tr key={schedule.id} className="border-b border-slate-100 align-top">
                            <td className="px-4 py-4">
                              <div className="font-medium text-slate-900">{schedule.subject}</div>
                              <div className="mt-1 text-sm text-slate-500">
                                Passing Marks: {schedule.passing_marks}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                {formatDate(schedule.exam_date, 'TBA')}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <Clock3 className="h-4 w-4 text-slate-400" />
                                {schedule.start_time || 'TBA'} - {schedule.end_time || 'TBA'}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                {schedule.room_number || 'Room not assigned'}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {schedule.has_result ? (
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {schedule.marks_obtained} / {schedule.total_marks}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">Evaluated result</p>
                                </div>
                              ) : (
                                <div className="text-sm text-slate-500">
                                  Result will appear after evaluation.
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {schedule.has_result ? (
                                <Badge variant="outline">{schedule.grade || 'N/A'}</Badge>
                              ) : (
                                <span className="text-sm text-slate-400">Pending</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                {schedule.has_result ? (
                                  schedule.status === 'passed' ? (
                                    <CircleCheckBig className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-rose-600" />
                                  )
                                ) : (
                                  <FileText className="h-4 w-4 text-slate-400" />
                                )}
                                {renderResultBadge(schedule)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
