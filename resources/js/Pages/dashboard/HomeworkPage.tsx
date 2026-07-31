import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Minus,
  Plus,
  RotateCcw,
  School,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { formatDate } from '../ui/utils';

type ClassRecord = {
  id: string;
  name: string;
  section: string;
};

type SubjectRecord = {
  id: string;
  name: string;
};

type StudentRecord = {
  id: string;
  classId: string;
  className: string;
  section: string;
  email: string;
} | null;

type HomeworkRecord = {
  id: string;
  classId: string;
  className: string;
  section: string;
  subjectName: string;
  teacherName: string;
  homeworkDate: string;
  submissionDate: string;
  maxMarks: string;
  description: string;
  attachmentName: string;
  attachmentUrl: string;
  attachmentPreviewUrl: string;
  attachmentMimeType: string;
  submissionStatus: string;
  marksObtained: string;
  teacherRemarks: string;
  submissionText: string;
  submissionAttachmentName: string;
  submissionAttachmentUrl: string;
  submissionAttachmentPreviewUrl: string;
  submissionAttachmentMimeType: string;
  submittedAt: string;
  submissionId: string;
};

type SubmissionRecord = {
  id: string;
  homeworkId: string;
  studentName: string;
  className: string;
  section: string;
  subjectName: string;
  homeworkDate: string;
  submissionDate: string;
  submittedAt: string;
  status: string;
  marksObtained: string;
  maxMarks: string;
  submissionText: string;
  teacherRemarks: string;
  attachmentName: string;
  attachmentUrl: string;
  attachmentPreviewUrl: string;
  attachmentMimeType: string;
};

type UploadLimits = {
  attachmentMaxSizeMb?: number;
  submissionAttachmentMaxSizeMb?: number;
};

interface HomeworkPageProps {
  user: any;
  classRecords?: ClassRecord[];
  subjectRecords?: SubjectRecord[];
  studentRecord?: StudentRecord;
  homeworkRecords?: HomeworkRecord[];
  submissionRecords?: SubmissionRecord[];
  uploadLimits?: UploadLimits;
}

type TeacherFormState = {
  className: string;
  section: string;
  subjectId: string;
  homeworkDate: string;
  submissionDate: string;
  maxMarks: string;
  description: string;
};

type EvaluationState = Record<string, { marksObtained: string; teacherRemarks: string }>;

const today = new Date().toISOString().slice(0, 10);
const homeworkRowsPerPage = 10;

const formatDateLabel = (value: string) => formatDate(value, 'Not set');

const formatStatusLabel = (status: string) =>
  status
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const statusBadgeClassName = (status: string) => {
  switch (status) {
    case 'evaluated':
      return 'bg-green-100 text-green-700 hover:bg-green-100';
    case 'submitted':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
    case 'late':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
    default:
      return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
  }
};

const isImageMimeType = (mimeType: string) => mimeType.startsWith('image/');

export default function HomeworkPage({
  user,
  classRecords = [],
  subjectRecords = [],
  studentRecord = null,
  homeworkRecords = [],
  submissionRecords = [],
  uploadLimits = {},
}: HomeworkPageProps) {
  const page = usePage<{ errors?: Record<string, string>; flash?: { success?: string; error?: string } }>();
  const flash = page.props.flash ?? {};
  const errors = page.props.errors ?? {};
  const isStudentView = user?.role === 'student';
  const canDeleteHomework = user?.role === 'admin' || user?.role === 'super_admin';

  const classNameOptions = useMemo(
    () => Array.from(new Set(classRecords.map((record) => record.name))).sort((left, right) => left.localeCompare(right)),
    [classRecords]
  );

  const initialClassName = studentRecord?.className || classNameOptions[0] || '';
  const initialSections = classRecords.filter((record) => record.name === initialClassName);
  const initialSection = studentRecord?.section || initialSections[0]?.section || '';

  const [teacherForm, setTeacherForm] = useState<TeacherFormState>({
    className: initialClassName,
    section: initialSection,
    subjectId: subjectRecords[0]?.id || '',
    homeworkDate: today,
    submissionDate: today,
    maxMarks: '',
    description: '',
  });
  const [teacherAttachment, setTeacherAttachment] = useState<File | null>(null);
  const [submittingHomework, setSubmittingHomework] = useState(false);

  const [selectedHomeworkId, setSelectedHomeworkId] = useState(homeworkRecords[0]?.id || '');
  const [studentAttachment, setStudentAttachment] = useState<File | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submittingStudentWork, setSubmittingStudentWork] = useState(false);
  const [homeworkSubjectFilter, setHomeworkSubjectFilter] = useState('all');
  const [homeworkClassFilter, setHomeworkClassFilter] = useState('all');
  const [homeworkSectionFilter, setHomeworkSectionFilter] = useState('all');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState('all');
  const [submissionHomeworkDateFilter, setSubmissionHomeworkDateFilter] = useState('all');
  const [submissionSubjectFilter, setSubmissionSubjectFilter] = useState('all');
  const [submissionClassFilter, setSubmissionClassFilter] = useState('all');
  const [submissionSectionFilter, setSubmissionSectionFilter] = useState('all');
  const [homeworkPage, setHomeworkPage] = useState(1);
  const [evaluationState, setEvaluationState] = useState<EvaluationState>({});
  const [savingEvaluationId, setSavingEvaluationId] = useState<string | null>(null);
  const [createHomeworkOpen, setCreateHomeworkOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    name: string;
    mimeType: string;
  } | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);

  useEffect(() => {
    if (flash.success) {
      toast.success(flash.success);
    }

    if (flash.error) {
      toast.error(flash.error);
    }
  }, [flash.error, flash.success]);

  useEffect(() => {
    if (!teacherForm.className && classNameOptions[0]) {
      setTeacherForm((current) => ({
        ...current,
        className: classNameOptions[0],
      }));
    }
  }, [classNameOptions, teacherForm.className]);

  const availableSections = useMemo(
    () => classRecords.filter((record) => record.name === teacherForm.className),
    [classRecords, teacherForm.className]
  );

  useEffect(() => {
    if (!availableSections.some((record) => record.section === teacherForm.section)) {
      setTeacherForm((current) => ({
        ...current,
        section: availableSections[0]?.section || '',
      }));
    }
  }, [availableSections, teacherForm.section]);

  useEffect(() => {
    if (!selectedHomeworkId && homeworkRecords[0]?.id) {
      setSelectedHomeworkId(homeworkRecords[0].id);
    }
  }, [homeworkRecords, selectedHomeworkId]);

  const selectedClassRecord = useMemo(
    () =>
      classRecords.find(
        (record) => record.name === teacherForm.className && record.section === teacherForm.section
      ) || null,
    [classRecords, teacherForm.className, teacherForm.section]
  );

  const selectedHomework = useMemo(
    () => homeworkRecords.find((record) => record.id === selectedHomeworkId) || homeworkRecords[0] || null,
    [homeworkRecords, selectedHomeworkId]
  );

  const studentHomework = useMemo(() => {
    if (!isStudentView) {
      return [];
    }

    return homeworkRecords.filter((record) => {
      if (!studentRecord) {
        return true;
      }

      return record.classId === studentRecord.classId;
    });
  }, [homeworkRecords, isStudentView, studentRecord]);

  const teacherHomeworkSummary = useMemo(() => {
    const totalAssignments = homeworkRecords.length;
    const pendingReview = submissionRecords.filter((record) => record.status !== 'evaluated').length;
    const evaluated = submissionRecords.filter((record) => record.status === 'evaluated').length;

    return { totalAssignments, pendingReview, evaluated };
  }, [homeworkRecords.length, submissionRecords]);

  const homeworkSubjectOptions = useMemo(
    () => Array.from(new Set(homeworkRecords.map((record) => record.subjectName).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [homeworkRecords]
  );

  const homeworkClassOptions = useMemo(
    () => Array.from(new Set(homeworkRecords.map((record) => record.className).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [homeworkRecords]
  );

  const homeworkSectionOptions = useMemo(
    () => Array.from(new Set(homeworkRecords.filter((record) => homeworkClassFilter === 'all' || record.className === homeworkClassFilter).map((record) => record.section).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [homeworkRecords, homeworkClassFilter]
  );

  const filteredHomeworkRecords = useMemo(
    () =>
      homeworkRecords.filter((record) => {
        const subjectMatches = homeworkSubjectFilter === 'all' || record.subjectName === homeworkSubjectFilter;
        const classMatches = homeworkClassFilter === 'all' || record.className === homeworkClassFilter;
        const sectionMatches = homeworkSectionFilter === 'all' || record.section === homeworkSectionFilter;

        return subjectMatches && classMatches && sectionMatches;
      }),
    [homeworkClassFilter, homeworkSectionFilter, homeworkRecords, homeworkSubjectFilter]
  );

  const homeworkTotalPages = Math.max(1, Math.ceil(filteredHomeworkRecords.length / homeworkRowsPerPage));

  const paginatedHomeworkRecords = useMemo(() => {
    const startIndex = (homeworkPage - 1) * homeworkRowsPerPage;

    return filteredHomeworkRecords.slice(startIndex, startIndex + homeworkRowsPerPage);
  }, [filteredHomeworkRecords, homeworkPage]);

  const studentHomeworkSummary = useMemo(() => {
    const pending = studentHomework.filter((record) => record.submissionStatus === 'pending').length;
    const submitted = studentHomework.filter((record) => record.submissionStatus === 'submitted').length;
    const evaluated = studentHomework.filter((record) => record.submissionStatus === 'evaluated').length;

    return { pending, submitted, evaluated };
  }, [studentHomework]);

  const submissionStatusOptions = useMemo(
    () => Array.from(new Set(submissionRecords.map((record) => record.status).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [submissionRecords]
  );

  const submissionHomeworkDateOptions = useMemo(
    () => Array.from(new Set(submissionRecords.map((record) => record.homeworkDate).filter(Boolean))).sort((left, right) => right.localeCompare(left)),
    [submissionRecords]
  );

  const submissionSubjectOptions = useMemo(
    () => Array.from(new Set(submissionRecords.map((record) => record.subjectName).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [submissionRecords]
  );

  const submissionClassOptions = useMemo(
    () => Array.from(new Set(submissionRecords.map((record) => record.className).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [submissionRecords]
  );

  const submissionSectionOptions = useMemo(
    () => Array.from(new Set(submissionRecords.filter((record) => submissionClassFilter === 'all' || record.className === submissionClassFilter).map((record) => record.section).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [submissionRecords, submissionClassFilter]
  );

  const filteredSubmissionRecords = useMemo(
    () =>
      submissionRecords.filter((record) => {
        const statusMatches = submissionStatusFilter === 'all' || record.status === submissionStatusFilter;
        const homeworkDateMatches =
          submissionHomeworkDateFilter === 'all' || record.homeworkDate === submissionHomeworkDateFilter;
        const subjectMatches = submissionSubjectFilter === 'all' || record.subjectName === submissionSubjectFilter;
        const classMatches = submissionClassFilter === 'all' || record.className === submissionClassFilter;
        const sectionMatches = submissionSectionFilter === 'all' || record.section === submissionSectionFilter;

        return statusMatches && homeworkDateMatches && subjectMatches && classMatches && sectionMatches;
      }),
    [
      submissionClassFilter,
      submissionSectionFilter,
      submissionHomeworkDateFilter,
      submissionRecords,
      submissionStatusFilter,
      submissionSubjectFilter,
    ]
  );

  useEffect(() => {
    const nextEvaluationState: EvaluationState = {};

    submissionRecords.forEach((record) => {
      nextEvaluationState[record.id] = {
        marksObtained: record.marksObtained || '',
        teacherRemarks: record.teacherRemarks || '',
      };
    });

    setEvaluationState(nextEvaluationState);
  }, [submissionRecords]);

  useEffect(() => {
    setHomeworkPage(1);
  }, [homeworkSubjectFilter, homeworkClassFilter, homeworkSectionFilter]);

  useEffect(() => {
    if (homeworkPage > homeworkTotalPages) {
      setHomeworkPage(homeworkTotalPages);
    }
  }, [homeworkPage, homeworkTotalPages]);

  const handleTeacherSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedClassRecord) {
      toast.error('Please select a valid class and section');
      return;
    }

    if (!teacherForm.subjectId) {
      toast.error('Please select a subject');
      return;
    }

    setSubmittingHomework(true);

    router.post(
      '/homework',
      {
        classId: selectedClassRecord.id,
        subjectId: teacherForm.subjectId,
        homeworkDate: teacherForm.homeworkDate,
        submissionDate: teacherForm.submissionDate,
        maxMarks: teacherForm.maxMarks || null,
        description: teacherForm.description,
        attachment: teacherAttachment,
      },
      {
        forceFormData: true,
        preserveScroll: true,
        onSuccess: () => {
          setTeacherAttachment(null);
          setCreateHomeworkOpen(false);
          setTeacherForm((current) => ({
            ...current,
            description: '',
            maxMarks: '',
          }));
        },
        onFinish: () => setSubmittingHomework(false),
      }
    );
  };

  const handleStudentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedHomework) {
      toast.error('Select a homework first');
      return;
    }

    if (!submissionText.trim() && !studentAttachment) {
      toast.error('Add submission notes or upload a file');
      return;
    }

    setSubmittingStudentWork(true);

    router.post(
      `/homework/${selectedHomework.id}/submit`,
      {
        submissionText,
        attachment: studentAttachment,
      },
      {
        forceFormData: true,
        preserveScroll: true,
        onSuccess: () => {
          setSubmissionText('');
          setStudentAttachment(null);
        },
        onFinish: () => setSubmittingStudentWork(false),
      }
    );
  };

  const handleEvaluationSave = (submissionId: string) => {
    const evaluation = evaluationState[submissionId];

    setSavingEvaluationId(submissionId);

    router.patch(
      `/homework-submissions/${submissionId}/evaluate`,
      {
        marksObtained: evaluation?.marksObtained || null,
        teacherRemarks: evaluation?.teacherRemarks || null,
      },
      {
        preserveScroll: true,
        onFinish: () => setSavingEvaluationId(null),
      }
    );
  };

  const openAttachmentPreview = (url: string, name: string, mimeType: string) => {
    setPreviewAttachment({ url, name, mimeType });
    setPreviewZoom(1);
  };

  const handleDeleteHomework = (homeworkId: string) => {
    const confirmed = window.confirm('Delete this homework and all related student submissions?');

    if (!confirmed) {
      return;
    }

    router.delete(`/homework/${homeworkId}`, {
      preserveScroll: true,
      onError: () => {
        toast.error('Failed to delete homework');
      },
    });
  };

  return (
    <DashboardLayout user={user} activeTab="homework">
      <div className="space-y-8 p-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Homework Management</h1>
              <p className="mt-1 text-gray-600">
                {isStudentView
                  ? 'Review assigned homework, submit your work, and track marks.'
                  : 'Create homework, review daily submissions, and evaluate students from one place.'}
              </p>
            </div>

            {!isStudentView ? (
              <div className="flex justify-end md:flex-shrink-0">
                <Button type="button" onClick={() => setCreateHomeworkOpen(true)}>
                  <School className="mr-2 h-4 w-4" />
                  Create Homework
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 md:flex-row xl:flex-nowrap xl:justify-end">
            {isStudentView ? (
              <>
                <Card className="min-w-[180px]">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <ClipboardCheck className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-500">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">{studentHomeworkSummary.pending}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="min-w-[180px]">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">Submitted</p>
                      <p className="text-2xl font-bold text-gray-900">{studentHomeworkSummary.submitted}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="min-w-[180px]">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-500">Evaluated</p>
                      <p className="text-2xl font-bold text-gray-900">{studentHomeworkSummary.evaluated}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="min-w-[180px]">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <BookOpenCheck className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">Homework</p>
                      <p className="text-2xl font-bold text-gray-900">{teacherHomeworkSummary.totalAssignments}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="min-w-[180px]">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <GraduationCap className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-500">Pending Review</p>
                      <p className="text-2xl font-bold text-gray-900">{teacherHomeworkSummary.pendingReview}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="min-w-[180px]">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-500">Evaluated</p>
                      <p className="text-2xl font-bold text-gray-900">{teacherHomeworkSummary.evaluated}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {errors.submission ? (
          <Alert variant="destructive">
            <AlertDescription>{errors.submission}</AlertDescription>
          </Alert>
        ) : null}

        {isStudentView ? (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Homework</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {studentHomework.length === 0 ? (
                  <p className="text-sm text-gray-500">No homework is assigned yet for your class.</p>
                ) : (
                  studentHomework.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => setSelectedHomeworkId(record.id)}
                      className={`w-full rounded-lg border p-4 text-left transition ${
                        selectedHomework?.id === record.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-gray-900">{record.subjectName}</p>
                          <p className="text-sm text-gray-500">
                            {record.className} - Section {record.section}
                          </p>
                        </div>
                        <Badge className={statusBadgeClassName(record.submissionStatus)}>
                          {formatStatusLabel(record.submissionStatus)}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-2">
                        <span>Homework date: {formatDateLabel(record.homeworkDate)}</span>
                        <span>Submission date: {formatDateLabel(record.submissionDate)}</span>
                        <span>Teacher: {record.teacherName || 'Not assigned'}</span>
                        <span>Max marks: {record.maxMarks || 'Not set'}</span>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Homework Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {selectedHomework ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg bg-slate-50 p-4">
                          <p className="text-sm text-gray-500">Class</p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {selectedHomework.className} - Section {selectedHomework.section}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-4">
                          <p className="text-sm text-gray-500">Subject</p>
                          <p className="mt-1 font-semibold text-gray-900">{selectedHomework.subjectName}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-4">
                          <p className="text-sm text-gray-500">Homework Date</p>
                          <p className="mt-1 font-semibold text-gray-900">{formatDateLabel(selectedHomework.homeworkDate)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-4">
                          <p className="text-sm text-gray-500">Submission Date</p>
                          <p className="mt-1 font-semibold text-gray-900">{formatDateLabel(selectedHomework.submissionDate)}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700">Description</p>
                        <p className="mt-2 whitespace-pre-line rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                          {selectedHomework.description}
                        </p>
                      </div>

                      {selectedHomework.attachmentUrl ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 p-4">
                          <div>
                            <p className="font-medium text-gray-900">{selectedHomework.attachmentName}</p>
                            <p className="text-sm text-gray-500">Teacher attachment</p>
                          </div>
                          {isImageMimeType(selectedHomework.attachmentMimeType) ? (
                            <Button
                              variant="outline"
                              onClick={() =>
                                openAttachmentPreview(
                                  selectedHomework.attachmentPreviewUrl,
                                  selectedHomework.attachmentName || 'Teacher attachment',
                                  selectedHomework.attachmentMimeType
                                )
                              }
                            >
                              {selectedHomework.attachmentName || 'View Image'}
                            </Button>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  openAttachmentPreview(
                                    selectedHomework.attachmentPreviewUrl,
                                    selectedHomework.attachmentName || 'Teacher attachment',
                                    selectedHomework.attachmentMimeType
                                  )
                                }
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                View Document
                              </Button>
                              <Button variant="outline" onClick={() => window.open(selectedHomework.attachmentUrl, '_blank')}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Select a homework record to see the details.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Submit Homework</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {selectedHomework ? (
                    <form onSubmit={handleStudentSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="submissionText">Submission Notes</Label>
                        <Textarea
                          id="submissionText"
                          value={submissionText}
                          onChange={(event) => setSubmissionText(event.target.value)}
                          placeholder="Write your answer summary or notes for the teacher"
                          rows={5}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="studentAttachment">Attachment</Label>
                        <Input
                          id="studentAttachment"
                          type="file"
                          onChange={(event) => setStudentAttachment(event.target.files?.[0] || null)}
                        />
                        <p className="text-xs text-gray-500">
                          Max upload size: {uploadLimits.submissionAttachmentMaxSizeMb || 20} MB
                        </p>
                      </div>

                      <Button type="submit" disabled={submittingStudentWork}>
                        <Upload className="mr-2 h-4 w-4" />
                        {submittingStudentWork ? 'Submitting...' : 'Submit Homework'}
                      </Button>
                    </form>
                  ) : (
                    <p className="text-sm text-gray-500">Select a homework record to submit your work.</p>
                  )}
                </CardContent>
              </Card>

              {selectedHomework ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Marks and Feedback</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-sm text-gray-500">Submission Status</p>
                        <Badge className={`mt-2 ${statusBadgeClassName(selectedHomework.submissionStatus)}`}>
                          {formatStatusLabel(selectedHomework.submissionStatus)}
                        </Badge>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-sm text-gray-500">Marks Obtained</p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">
                          {selectedHomework.marksObtained || '-'}
                          {selectedHomework.maxMarks ? ` / ${selectedHomework.maxMarks}` : ''}
                        </p>
                      </div>
                    </div>

                    {selectedHomework.submissionAttachmentUrl ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 p-4">
                        <div>
                          <p className="font-medium text-gray-900">{selectedHomework.submissionAttachmentName}</p>
                          <p className="text-sm text-gray-500">Your uploaded file</p>
                        </div>
                        {isImageMimeType(selectedHomework.submissionAttachmentMimeType) ? (
                          <Button
                            variant="outline"
                            onClick={() =>
                                openAttachmentPreview(
                                  selectedHomework.submissionAttachmentPreviewUrl,
                                  selectedHomework.submissionAttachmentName || 'Submission attachment',
                                  selectedHomework.submissionAttachmentMimeType
                                )
                              }
                            >
                              {selectedHomework.submissionAttachmentName || 'View Image'}
                            </Button>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              onClick={() =>
                                openAttachmentPreview(
                                  selectedHomework.submissionAttachmentPreviewUrl,
                                  selectedHomework.submissionAttachmentName || 'Submission attachment',
                                  selectedHomework.submissionAttachmentMimeType
                                )
                              }
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              View Document
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => window.open(selectedHomework.submissionAttachmentUrl, '_blank')}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm font-medium text-gray-700">Teacher Remarks</p>
                      <p className="mt-2 whitespace-pre-line text-sm text-gray-700">
                        {selectedHomework.teacherRemarks || 'Marks and feedback will appear here after evaluation.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Homework</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Filter by Subject</Label>
                      <Select value={homeworkSubjectFilter} onValueChange={setHomeworkSubjectFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All subjects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All subjects</SelectItem>
                          {homeworkSubjectOptions.map((subject) => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Filter by Class</Label>
                      <Select value={homeworkClassFilter} onValueChange={(value) => {
                        setHomeworkClassFilter(value);
                        setHomeworkSectionFilter('all');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="All classes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All classes</SelectItem>
                          {homeworkClassOptions.map((cls) => (
                            <SelectItem key={cls} value={cls}>
                              {cls}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Filter by Section</Label>
                      <Select value={homeworkSectionFilter} onValueChange={setHomeworkSectionFilter} disabled={homeworkClassFilter === 'all'}>
                        <SelectTrigger>
                          <SelectValue placeholder="All sections" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All sections</SelectItem>
                          {homeworkSectionOptions.map((section) => (
                            <SelectItem key={section} value={section}>
                              {section}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {homeworkRecords.length === 0 ? (
                    <p className="text-sm text-gray-500">No homework created yet.</p>
                  ) : filteredHomeworkRecords.length === 0 ? (
                    <p className="text-sm text-gray-500">No homework matches the selected filters.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Subject</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Class Section</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Homework Date</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Submission Date</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Max Marks</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Attachment</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {paginatedHomeworkRecords.map((record) => (
                              <tr key={record.id} className="align-top">
                                <td className="px-4 py-3 font-medium text-gray-900">{record.subjectName}</td>
                                <td className="px-4 py-3 text-gray-600">
                                  {record.className} - Section {record.section}
                                </td>
                                <td className="px-4 py-3 text-gray-600">{formatDateLabel(record.homeworkDate)}</td>
                                <td className="px-4 py-3 text-gray-600">{formatDateLabel(record.submissionDate)}</td>
                                <td className="px-4 py-3 text-gray-600">{record.maxMarks || 'Not set'}</td>
                                <td className="max-w-sm px-4 py-3 text-gray-600">
                                  <div className="max-h-20 overflow-y-auto whitespace-pre-line pr-1">
                                    {record.description}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {record.attachmentUrl ? (
                                    isImageMimeType(record.attachmentMimeType) ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          openAttachmentPreview(
                                            record.attachmentPreviewUrl,
                                            record.attachmentName || 'Homework attachment',
                                            record.attachmentMimeType
                                          )
                                        }
                                      >
                                        {record.attachmentName || 'View Image'}
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          openAttachmentPreview(
                                            record.attachmentPreviewUrl,
                                            record.attachmentName || 'Homework attachment',
                                            record.attachmentMimeType
                                          )
                                        }
                                      >
                                        <FileText className="mr-2 h-4 w-4" />
                                        View Document
                                      </Button>
                                    )
                                  ) : (
                                    <span className="text-gray-400">No attachment</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-2">
                                    {record.attachmentUrl ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(record.attachmentUrl, '_blank')}
                                      >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download
                                      </Button>
                                    ) : null}
                                    {canDeleteHomework ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600"
                                        onClick={() => handleDeleteHomework(record.id)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </Button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-gray-500">
                          Showing{' '}
                          {filteredHomeworkRecords.length === 0
                            ? 0
                            : (homeworkPage - 1) * homeworkRowsPerPage + 1}
                          {' '}to{' '}
                          {Math.min(homeworkPage * homeworkRowsPerPage, filteredHomeworkRecords.length)} of{' '}
                          {filteredHomeworkRecords.length} homework records
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={homeworkPage === 1}
                            onClick={() => setHomeworkPage((current) => Math.max(1, current - 1))}
                          >
                            Previous
                          </Button>
                          <span className="text-sm font-medium text-gray-600">
                            Page {homeworkPage} of {homeworkTotalPages}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={homeworkPage === homeworkTotalPages}
                            onClick={() => setHomeworkPage((current) => Math.min(homeworkTotalPages, current + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Daily Assignments Submitted by Students</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {submissionRecords.length === 0 ? (
                  <p className="text-sm text-gray-500">No student submissions found for today.</p>
                ) : (
                  <>
                    <div className="grid gap-3 xl:grid-cols-4">
                      <div className="space-y-1.5">
                        <Label>Filter by Status</Label>
                        <Select value={submissionStatusFilter} onValueChange={setSubmissionStatusFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            {submissionStatusOptions.map((status) => (
                              <SelectItem key={status} value={status}>
                                {formatStatusLabel(status)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Filter by Homework Date</Label>
                        <Select value={submissionHomeworkDateFilter} onValueChange={setSubmissionHomeworkDateFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All homework dates" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All homework dates</SelectItem>
                            {submissionHomeworkDateOptions.map((date) => (
                              <SelectItem key={date} value={date}>
                                {formatDateLabel(date)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Filter by Subject</Label>
                        <Select value={submissionSubjectFilter} onValueChange={setSubmissionSubjectFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All subjects" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All subjects</SelectItem>
                            {submissionSubjectOptions.map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Filter by Class</Label>
                        <Select value={submissionClassFilter} onValueChange={(value) => {
                          setSubmissionClassFilter(value);
                          setSubmissionSectionFilter('all');
                        }}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All classes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All classes</SelectItem>
                            {submissionClassOptions.map((cls) => (
                              <SelectItem key={cls} value={cls}>
                                {cls}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Filter by Section</Label>
                        <Select value={submissionSectionFilter} onValueChange={setSubmissionSectionFilter} disabled={submissionClassFilter === 'all'}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All sections" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All sections</SelectItem>
                            {submissionSectionOptions.map((section) => (
                              <SelectItem key={section} value={section}>
                                {section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {filteredSubmissionRecords.length === 0 ? (
                      <p className="text-sm text-gray-500">No student submissions match the selected filters.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Student</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Subject / Class</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Homework Date</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Submission Date</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Submitted At</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Attachment</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Submission</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Marks</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Teacher Remarks</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredSubmissionRecords.map((record) => (
                              <tr key={record.id} className="align-top">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{record.studentName || 'Student'}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  <div>{record.subjectName}</div>
                                  <div className="text-xs text-gray-500">
                                    {record.className} - Section {record.section}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{formatDateLabel(record.homeworkDate)}</td>
                                <td className="px-4 py-3 text-gray-600">{formatDateLabel(record.submissionDate)}</td>
                                <td className="px-4 py-3 text-gray-600">{record.submittedAt || 'Not submitted yet'}</td>
                                <td className="px-4 py-3">
                                  <Badge className={statusBadgeClassName(record.status)}>
                                    {formatStatusLabel(record.status)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  {record.attachmentUrl ? (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label={
                                          isImageMimeType(record.attachmentMimeType)
                                            ? 'Preview image attachment'
                                            : 'Preview document attachment'
                                        }
                                        title={
                                          isImageMimeType(record.attachmentMimeType)
                                            ? 'Preview image attachment'
                                            : 'Preview document attachment'
                                        }
                                        onClick={() =>
                                          openAttachmentPreview(
                                            record.attachmentPreviewUrl,
                                            record.attachmentName || 'Student submission',
                                            record.attachmentMimeType
                                          )
                                        }
                                      >
                                        {isImageMimeType(record.attachmentMimeType) ? (
                                          <Eye className="h-4 w-4" />
                                        ) : (
                                          <FileText className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label="Download attachment"
                                        title={record.attachmentName || 'Download attachment'}
                                        onClick={() => window.open(record.attachmentUrl, '_blank')}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">No attachment</span>
                                  )}
                                </td>
                                <td className="max-w-xs px-4 py-3 text-gray-600">
                                  <div className="max-h-24 overflow-y-auto whitespace-pre-line pr-1">
                                    {record.submissionText || 'No text submitted.'}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={record.maxMarks || undefined}
                                    step="0.01"
                                    value={evaluationState[record.id]?.marksObtained || ''}
                                    onChange={(event) =>
                                      setEvaluationState((current) => ({
                                        ...current,
                                        [record.id]: {
                                          marksObtained: event.target.value,
                                          teacherRemarks: current[record.id]?.teacherRemarks || '',
                                        },
                                      }))
                                    }
                                    placeholder={record.maxMarks ? `Out of ${record.maxMarks}` : 'Marks'}
                                    className="min-w-28"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <Textarea
                                    rows={3}
                                    value={evaluationState[record.id]?.teacherRemarks || ''}
                                    onChange={(event) =>
                                      setEvaluationState((current) => ({
                                        ...current,
                                        [record.id]: {
                                          marksObtained: current[record.id]?.marksObtained || '',
                                          teacherRemarks: event.target.value,
                                        },
                                      }))
                                    }
                                    placeholder="Add evaluation feedback for the student"
                                    className="min-w-56"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <Button
                                    type="button"
                                    onClick={() => handleEvaluationSave(record.id)}
                                    disabled={savingEvaluationId === record.id}
                                    size="icon"
                                    aria-label={savingEvaluationId === record.id ? 'Saving evaluation' : 'Save evaluation'}
                                    title={savingEvaluationId === record.id ? 'Saving evaluation' : 'Save evaluation'}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Dialog
        open={Boolean(previewAttachment)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachment(null);
            setPreviewZoom(1);
          }
        }}
      >
        <DialogContent
          className={`flex h-[96vh] flex-col overflow-hidden p-0 ${
            previewAttachment && !isImageMimeType(previewAttachment.mimeType)
              ? 'w-[99vw] max-w-[99vw] sm:h-[98vh] sm:w-[98vw] sm:max-w-[98vw] sm:rounded-lg'
              : 'w-screen max-w-screen sm:rounded-none'
          }`}
        >
          <DialogHeader className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <DialogTitle>{previewAttachment?.name || 'Attachment Preview'}</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewZoom((current) => Math.max(0.5, Number((current - 0.1).toFixed(2))))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="min-w-16 text-center text-sm font-medium text-slate-600">
                  {Math.round(previewZoom * 100)}%
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewZoom((current) => Math.min(3, Number((current + 0.1).toFixed(2))))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPreviewZoom(1)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </DialogHeader>
          {previewAttachment ? (
            <div
              className={`flex-1 overflow-auto bg-slate-50 ${
                isImageMimeType(previewAttachment.mimeType) ? 'p-4' : 'p-1 sm:p-2'
              }`}
            >
              {isImageMimeType(previewAttachment.mimeType) ? (
                <div className="flex min-h-full items-center justify-center">
                  <img
                    src={previewAttachment.url}
                    alt={previewAttachment.name}
                    className="mx-auto max-w-none rounded-md object-contain transition-transform"
                    style={{
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'center center',
                      maxHeight: 'calc(100vh - 12rem)',
                    }}
                  />
                </div>
              ) : (
                <div className="flex h-full min-h-0 w-full justify-center overflow-auto rounded-md bg-white">
                  <iframe
                    src={previewAttachment.url}
                    title={previewAttachment.name}
                    className="border-0 bg-white"
                    style={{
                      width: `${100 / previewZoom}%`,
                      height: `${100 / previewZoom}%`,
                      minWidth: '100%',
                      minHeight: '100%',
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'top center',
                    }}
                  />
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={createHomeworkOpen} onOpenChange={setCreateHomeworkOpen}>
        <DialogContent className="max-h-[90vh] w-[96vw] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Homework</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTeacherSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select
                  value={teacherForm.className}
                  onValueChange={(value) => setTeacherForm((current) => ({ ...current, className: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classNameOptions.map((className) => (
                      <SelectItem key={className} value={className}>
                        {className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Section</Label>
                <Select
                  value={teacherForm.section}
                  onValueChange={(value) => setTeacherForm((current) => ({ ...current, section: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSections.map((record) => (
                      <SelectItem key={`${record.name}-${record.section}`} value={record.section}>
                        Section {record.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={teacherForm.subjectId}
                  onValueChange={(value) => setTeacherForm((current) => ({ ...current, subjectId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectRecords.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Max Marks</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={teacherForm.maxMarks}
                  onChange={(event) => setTeacherForm((current) => ({ ...current, maxMarks: event.target.value }))}
                  placeholder="e.g. 20"
                />
              </div>

              <div className="space-y-2">
                <Label>Homework Date</Label>
                <Input
                  type="date"
                  value={teacherForm.homeworkDate}
                  onChange={(event) =>
                    setTeacherForm((current) => ({ ...current, homeworkDate: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Submission Date</Label>
                <Input
                  type="date"
                  value={teacherForm.submissionDate}
                  onChange={(event) =>
                    setTeacherForm((current) => ({ ...current, submissionDate: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={teacherForm.description}
                onChange={(event) => setTeacherForm((current) => ({ ...current, description: event.target.value }))}
                rows={6}
                placeholder="Add instructions, questions, rubric, and any classroom notes"
              />
            </div>

            <div className="space-y-2">
              <Label>Attachment</Label>
              <Input type="file" onChange={(event) => setTeacherAttachment(event.target.files?.[0] || null)} />
              <p className="text-xs text-gray-500">Max upload size: {uploadLimits.attachmentMaxSizeMb || 20} MB</p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submittingHomework}>
                <School className="mr-2 h-4 w-4" />
                {submittingHomework ? 'Creating...' : 'Create Homework'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
