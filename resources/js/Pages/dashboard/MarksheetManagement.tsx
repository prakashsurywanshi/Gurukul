import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { FileText, Eye, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { examService, studentService } from '../../utils/mockDataService';
import { toast } from 'sonner';

interface MarksheetManagementProps {
  user: any;
  accessToken?: string;
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
  studentIds: string[];
  exams: any[];
  createdAt: string;
}

interface GeneratedMarksheet {
  studentId: string;
  studentName: string;
  examName: string;
  class: string;
  section: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  status: 'Pass' | 'Fail';
}

const EXAM_DEFINITIONS_STORAGE_KEY = 'laravel_gurukul_exam_definitions';
const EXAM_GROUP_STORAGE_KEY = 'laravel_gurukul_exam_groups';

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

export default function MarksheetManagement({ user, accessToken }: MarksheetManagementProps) {
  const effectiveAccessToken = accessToken || `mock_token_${user?.id || 'marksheet'}`;
  const [students, setStudents] = useState<any[]>([]);
  const [groupedExams, setGroupedExams] = useState<GroupedExam[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [generatedMarksheet, setGeneratedMarksheet] = useState<GeneratedMarksheet | null>(null);
  const [bulkGeneratedMarksheets, setBulkGeneratedMarksheets] = useState<GeneratedMarksheet[]>([]);

  useEffect(() => {
    try {
      const studentData = studentService.getAll(effectiveAccessToken);
      setStudents(studentData.students || []);
    } catch (error) {
      console.error('Error loading students:', error);
    }

    try {
      const definitions = loadStoredJson<ExamDefinition[]>(EXAM_DEFINITIONS_STORAGE_KEY, []);
      const groupMap = loadStoredJson<Record<string, string>>(EXAM_GROUP_STORAGE_KEY, {});
      const examData = examService.getAll();
      const serviceGroups = new Map<string, any[]>();

      (examData.exams || []).forEach((exam) => {
        const groupId = groupMap[exam.id] || `legacy_${exam.id}`;
        if (!serviceGroups.has(groupId)) {
          serviceGroups.set(groupId, []);
        }
        serviceGroups.get(groupId)?.push(exam);
      });

      const merged = definitions.map((definition) => ({
        groupId: definition.groupId,
        name: definition.name,
        publishStatus: definition.publishStatus,
        studentIds: definition.studentIds || [],
        exams: serviceGroups.get(definition.groupId) || [],
        createdAt: definition.createdAt,
      }));

      setGroupedExams(
        merged.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      );
    } catch (error) {
      console.error('Error loading exams:', error);
    }
  }, [effectiveAccessToken]);

  const selectedExamGroup = useMemo(
    () => groupedExams.find((group) => group.groupId === selectedGroupId) || null,
    [groupedExams, selectedGroupId]
  );

  const availableClassOptions = useMemo(() => {
    if (!selectedExamGroup) return [];

    return Array.from(
      new Set(
        students
          .filter((student) => selectedExamGroup.studentIds.includes(student.id))
          .map((student) => String(student.class))
      )
    ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  }, [selectedExamGroup, students]);

  const availableSectionOptions = useMemo(() => {
    if (!selectedExamGroup || !selectedClass) return [];

    return Array.from(
      new Set(
        students
          .filter(
            (student) =>
              selectedExamGroup.studentIds.includes(student.id) && String(student.class) === selectedClass
          )
          .map((student) => String(student.section))
      )
    ).sort();
  }, [selectedClass, selectedExamGroup, students]);

  const filteredStudents = useMemo(() => {
    if (!selectedExamGroup || !selectedClass || !selectedSection) return [];

    return students.filter(
      (student) =>
        selectedExamGroup.studentIds.includes(student.id) &&
        String(student.class) === selectedClass &&
        String(student.section) === selectedSection
    );
  }, [selectedClass, selectedExamGroup, selectedSection, students]);

  const generatedHistory = useMemo(() => {
    if (!selectedExamGroup) return [];

    return filteredStudents.map((student) => {
      const subjectResults = selectedExamGroup.exams.map((exam) => {
        const examData = examService.getById(exam.id);
        const result = examData?.results?.find((entry) => entry.student_id === student.id);

        return {
          subject: exam.subject,
          obtained: result?.marks_obtained ?? 0,
          total: exam.total_marks,
          passing: exam.passing_marks,
        };
      });

      const totalMarks = subjectResults.reduce((sum, item) => sum + item.total, 0);
      const obtainedMarks = subjectResults.reduce((sum, item) => sum + item.obtained, 0);
      const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
      const status = subjectResults.every((item) => item.obtained >= item.passing) ? 'Pass' : 'Fail';

      return {
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        examName: selectedExamGroup.name,
        class: String(student.class),
        section: String(student.section),
        totalMarks,
        obtainedMarks,
        percentage,
        status,
      } as GeneratedMarksheet;
    });
  }, [filteredStudents, selectedExamGroup]);

  const handleExamChange = (value: string) => {
    setSelectedGroupId(value);
    setSelectedClass('');
    setSelectedSection('');
    setGeneratedMarksheet(null);
    setBulkGeneratedMarksheets([]);
  };

  const handleGenerateMarksheet = (studentId: string) => {
    const nextMarksheet = generatedHistory.find((row) => row.studentId === studentId) || null;
    setGeneratedMarksheet(nextMarksheet);
    if (nextMarksheet) {
      toast.success(`Marksheet generated for ${nextMarksheet.studentName}`);
    }
  };

  const handleGenerateBulkMarksheets = () => {
    if (generatedHistory.length === 0) {
      return;
    }

    setBulkGeneratedMarksheets(generatedHistory);
    setGeneratedMarksheet(null);
    toast.success(`Generated ${generatedHistory.length} marksheet${generatedHistory.length === 1 ? '' : 's'} for ${selectedClass} Section ${selectedSection}`);
  };

  return (
    <DashboardLayout user={user} activeTab="marksheet">
      <div className="space-y-6 p-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900">Marksheet</h1>
          <p className="text-gray-600">Select an exam, then class and section, and generate marksheets student-wise.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Marksheet Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Exam</Label>
              <Select value={selectedGroupId} onValueChange={handleExamChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {groupedExams.map((group) => (
                    <SelectItem key={group.groupId} value={group.groupId}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={selectedClass}
                onValueChange={(value) => {
                  setSelectedClass(value);
                  setSelectedSection('');
                  setGeneratedMarksheet(null);
                  setBulkGeneratedMarksheets([]);
                }}
                disabled={!selectedExamGroup}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClassOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Section</Label>
              <Select
                value={selectedSection}
                onValueChange={(value) => {
                  setSelectedSection(value);
                  setGeneratedMarksheet(null);
                  setBulkGeneratedMarksheets([]);
                }}
                disabled={!selectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {availableSectionOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      Section {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Students</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Generate marksheets student-wise or in bulk for the selected class and section.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handleGenerateBulkMarksheets}
              disabled={!selectedExamGroup || !selectedClass || !selectedSection || generatedHistory.length === 0}
            >
              <FileText className="h-4 w-4" />
              Generate Bulk Marksheet
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!selectedExamGroup || !selectedClass || !selectedSection ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                        Select exam, class, and section to load students.
                      </TableCell>
                    </TableRow>
                  ) : filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                        No assigned students found for the selected class and section.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell>{student.roll_number || student.admission_no || student.id}</TableCell>
                        <TableCell>{selectedExamGroup.name}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell>{student.section}</TableCell>
                        <TableCell>{selectedExamGroup.exams.length}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => handleGenerateMarksheet(student.id)}>
                            <Eye className="h-4 w-4" />
                            Generate Marksheet
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!selectedExamGroup && (
              <div className="py-10 text-center text-gray-500">
                <FileText className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                Select an exam first to begin marksheet generation.
              </div>
            )}
          </CardContent>
        </Card>

        {generatedMarksheet && selectedExamGroup && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Generated Marksheet</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {generatedMarksheet.studentName} | {generatedMarksheet.examName}
                </p>
              </div>
              <Button type="button" className="gap-2" onClick={() => toast.success('Marksheet download prepared')}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Class</p><p className="font-semibold">{generatedMarksheet.class}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Section</p><p className="font-semibold">{generatedMarksheet.section}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Total</p><p className="font-semibold">{generatedMarksheet.obtainedMarks} / {generatedMarksheet.totalMarks}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Result</p><Badge variant={generatedMarksheet.status === 'Pass' ? 'default' : 'destructive'}>{generatedMarksheet.status}</Badge></CardContent></Card>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Total Marks</TableHead>
                      <TableHead>Min Marks</TableHead>
                      <TableHead>Obtained Marks</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedExamGroup.exams.map((exam) => {
                      const examData = examService.getById(exam.id);
                      const result = examData?.results?.find((entry) => entry.student_id === generatedMarksheet.studentId);
                      const obtained = result?.marks_obtained ?? 0;
                      const passed = obtained >= exam.passing_marks;

                      return (
                        <TableRow key={exam.id}>
                          <TableCell className="font-medium">{exam.subject}</TableCell>
                          <TableCell>{exam.total_marks}</TableCell>
                          <TableCell>{exam.passing_marks}</TableCell>
                          <TableCell>{obtained}</TableCell>
                          <TableCell>
                            <Badge variant={passed ? 'default' : 'destructive'}>{passed ? 'Pass' : 'Fail'}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="text-right text-sm text-slate-600">
                Percentage: <span className="font-semibold">{generatedMarksheet.percentage.toFixed(2)}%</span>
              </div>

              <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                <div className="mx-auto max-w-5xl rounded-2xl border-[10px] border-double border-slate-800 bg-white p-8 shadow-sm">
                  <div className="border-b border-slate-200 pb-6 text-center">
                    <h2 className="text-3xl font-bold tracking-wide text-slate-900">{user?.organization_name || 'Gurukul School'}</h2>
                    <p className="mt-2 text-sm uppercase tracking-[0.35em] text-slate-500">Student Marksheet Preview</p>
                    <p className="mt-3 text-lg font-semibold text-slate-700">{generatedMarksheet.examName}</p>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Student Name</p>
                      <p className="text-lg font-semibold text-slate-900">{generatedMarksheet.studentName}</p>
                    </div>
                    <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Roll No</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {filteredStudents.find((student) => student.id === generatedMarksheet.studentId)?.roll_number ||
                          filteredStudents.find((student) => student.id === generatedMarksheet.studentId)?.admission_no ||
                          generatedMarksheet.studentId}
                      </p>
                    </div>
                    <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Class / Section</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {generatedMarksheet.class} - Section {generatedMarksheet.section}
                      </p>
                    </div>
                    <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Overall Result</p>
                      <p className="text-lg font-semibold text-slate-900">{generatedMarksheet.status}</p>
                    </div>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Subject</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Min</TableHead>
                          <TableHead>Obtained</TableHead>
                          <TableHead>Result</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedExamGroup.exams.map((exam) => {
                          const examData = examService.getById(exam.id);
                          const result = examData?.results?.find((entry) => entry.student_id === generatedMarksheet.studentId);
                          const obtained = result?.marks_obtained ?? 0;
                          const passed = obtained >= exam.passing_marks;

                          return (
                            <TableRow key={`preview_${exam.id}`}>
                              <TableCell className="font-medium">{exam.subject}</TableCell>
                              <TableCell>{exam.total_marks}</TableCell>
                              <TableCell>{exam.passing_marks}</TableCell>
                              <TableCell>{obtained}</TableCell>
                              <TableCell>{passed ? 'Pass' : 'Fail'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4 text-center">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Total Marks</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{generatedMarksheet.totalMarks}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 text-center">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Obtained Marks</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{generatedMarksheet.obtainedMarks}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 text-center">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Percentage</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{generatedMarksheet.percentage.toFixed(2)}%</p>
                    </div>
                  </div>

                  <div className="mt-10 flex items-end justify-between text-sm text-slate-600">
                    <div className="w-40 border-t border-slate-400 pt-2 text-center">Class Teacher</div>
                    <div className="w-40 border-t border-slate-400 pt-2 text-center">Principal</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {bulkGeneratedMarksheets.length > 0 && selectedExamGroup && (
          <Card>
            <CardHeader>
              <CardTitle>Bulk Generated Marksheets</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {selectedExamGroup.name} | {selectedClass} | Section {selectedSection}
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Total Marks</TableHead>
                      <TableHead>Obtained Marks</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkGeneratedMarksheets.map((marksheet) => (
                      <TableRow key={`${marksheet.studentId}-${marksheet.examName}`}>
                        <TableCell className="font-medium">{marksheet.studentName}</TableCell>
                        <TableCell>{marksheet.totalMarks}</TableCell>
                        <TableCell>{marksheet.obtainedMarks}</TableCell>
                        <TableCell>{marksheet.percentage.toFixed(2)}%</TableCell>
                        <TableCell>
                          <Badge variant={marksheet.status === 'Pass' ? 'default' : 'destructive'}>
                            {marksheet.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
