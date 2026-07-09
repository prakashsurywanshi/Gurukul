import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../ui/utils';

interface HallTicketManagementProps {
  user: any;
  organization?: {
    id: number;
    name: string | null;
    logo?: string | null;
  } | null;
  students: any[];
  examGroups: any[];
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatHallTicketTime = (value: string | null | undefined) => {
  if (!value) {
    return '-';
  }

  const [rawHour, rawMinute] = value.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const meridiem = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 || 12;

  return `${normalizedHour}:${String(minute).padStart(2, '0')} ${meridiem}`;
};

const formatHallTicketDate = (value: string | Date | null | undefined) => formatDate(value, '-');

export default function HallTicketManagement({ user, organization, students, examGroups }: HallTicketManagementProps) {
  const schoolName = organization?.name || 'Gurukul School';
  const availableGroups = useMemo(() => examGroups.filter((group) => (group.exams || []).length > 0), [examGroups]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    if (!selectedGroupId || !availableGroups.some((group) => group.groupId === selectedGroupId)) {
      setSelectedGroupId(availableGroups[0]?.groupId || '');
    }
  }, [availableGroups, selectedGroupId]);

  const selectedGroup = useMemo(
    () => availableGroups.find((group) => group.groupId === selectedGroupId) || null,
    [availableGroups, selectedGroupId]
  );

  const availableClassOptions = useMemo(
    () =>
      Array.from(new Set(students.map((student) => String(student.class)).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true })
      ),
    [students]
  );

  useEffect(() => {
    const nextClass = selectedGroup?.className ? String(selectedGroup.className) : availableClassOptions[0] || '';
    setSelectedClass(nextClass);
    setSelectedSection(selectedGroup?.section ? String(selectedGroup.section) : '');
    setSelectedStudentId('');
  }, [availableClassOptions, selectedGroupId, selectedGroup?.className, selectedGroup?.section]);

  const availableSectionOptions = useMemo(() => {
    if (!selectedClass) {
      return [];
    }

    return Array.from(
      new Set(
        students
          .filter((student) => String(student.class) === selectedClass)
          .map((student) => String(student.section))
          .filter(Boolean)
      )
    ).sort();
  }, [selectedClass, students]);

  useEffect(() => {
    if (!availableSectionOptions.includes(selectedSection)) {
      setSelectedSection(availableSectionOptions[0] || '');
    }
  }, [availableSectionOptions, selectedSection]);

  const eligibleStudents = useMemo(() => {
    if (!selectedGroup || !selectedClass || !selectedSection) {
      return [];
    }

    return students.filter(
      (student) =>
        String(student.class) === selectedClass &&
        String(student.section) === selectedSection
    );
  }, [selectedClass, selectedGroup, selectedSection, students]);

  useEffect(() => {
    if (!selectedStudentId || !eligibleStudents.some((student) => String(student.id) === selectedStudentId)) {
      setSelectedStudentId(eligibleStudents[0] ? String(eligibleStudents[0].id) : '');
    }
  }, [eligibleStudents, selectedStudentId]);

  const selectedStudent = useMemo(
    () => eligibleStudents.find((student) => String(student.id) === selectedStudentId) || null,
    [eligibleStudents, selectedStudentId]
  );

  const printableRows = selectedGroup?.exams || [];

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
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; background: #f8fafc; }
            .sheet { border: 1px solid #cbd5e1; border-radius: 18px; padding: 24px; background: #ffffff; page-break-inside: avoid; }
            .sheet + .sheet { margin-top: 24px; page-break-before: always; }
            .heading { display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px; }
            .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
            .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 14px; }
            th { background: #eff6ff; }
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

  const buildHallTicketMarkup = (student: any) => {
    const rows = printableRows
      .map(
        (exam: any, index: number) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(String(exam.subject || '-'))}</td>
            <td>${escapeHtml(formatHallTicketDate(exam.exam_date))}</td>
            <td>${escapeHtml(formatHallTicketTime(exam.start_time))}</td>
            <td>${escapeHtml(formatHallTicketTime(exam.end_time))}</td>
            <td>${escapeHtml(String(exam.room_number || '-'))}</td>
            <td></td>
          </tr>
        `
      )
      .join('');

    return `
      <div class="sheet">
        <div class="heading">
          <div>
            <div style="font-size: 26px; font-weight: 700;">${escapeHtml(schoolName)}</div>
            <div style="margin-top: 6px; font-size: 18px; font-weight: 600;">Hall Ticket</div>
            <p>${escapeHtml(String(selectedGroup?.name || '-'))}</p>
          </div>
          <div>${escapeHtml(formatHallTicketDate(new Date()))}</div>
        </div>
        <div class="meta">
          <div class="box"><strong>Student</strong><br />${escapeHtml(`${student.first_name} ${student.last_name}`)}</div>
          <div class="box"><strong>Roll Number</strong><br />${escapeHtml(String(student.roll_number || '-'))}</div>
          <div class="box"><strong>Class</strong><br />${escapeHtml(String(selectedGroup?.className || '-'))}</div>
          <div class="box"><strong>Section</strong><br />${escapeHtml(String(selectedGroup?.section || '-'))}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Subject</th>
              <th>Date</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Room</th>
              <th>Invigilator Sign</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 48px;">
          <div style="flex: 1; text-align: center;">
            <div style="border-top: 1px solid #64748b; padding-top: 10px; font-size: 14px; font-weight: 600;">
              Class Teacher Sign
            </div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="border-top: 1px solid #64748b; padding-top: 10px; font-size: 14px; font-weight: 600;">
              Principal Sign
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    if (!selectedGroup || !selectedStudent) {
      toast.error('Please select an examination and student first.');
      return;
    }

    openPrintWindow(
      `Hall Ticket - ${escapeHtml(selectedStudent.first_name)} ${escapeHtml(selectedStudent.last_name)}`,
      buildHallTicketMarkup(selectedStudent)
    );
  };

  const handleBulkPrint = () => {
    if (!selectedGroup || eligibleStudents.length === 0) {
      toast.error('No students are available for bulk hall ticket printing.');
      return;
    }

    openPrintWindow(
      `Bulk Hall Tickets - ${escapeHtml(String(selectedGroup.name || 'Examination'))}`,
      eligibleStudents.map((student) => buildHallTicketMarkup(student)).join('')
    );
    toast.success(`Prepared ${eligibleStudents.length} hall ticket${eligibleStudents.length === 1 ? '' : 's'} for printing.`);
  };

  return (
    <DashboardLayout user={user} activeTab="hall-ticket">
      <div className="space-y-6 p-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900">Hall Ticket</h1>
          <p className="text-gray-600">Select an examination and student to preview and print the hall ticket.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Hall Ticket Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Examination</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group) => (
                    <SelectItem key={group.groupId} value={group.groupId}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClassOptions.map((classOption) => (
                    <SelectItem key={classOption} value={classOption}>
                      Class {classOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {availableSectionOptions.map((sectionOption) => (
                    <SelectItem key={sectionOption} value={sectionOption}>
                      Section {sectionOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleStudents.map((student) => (
                    <SelectItem key={student.id} value={String(student.id)}>
                      {student.first_name} {student.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Hall Ticket Preview</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="gap-2" onClick={handleBulkPrint}>
                <Printer className="h-4 w-4" />
                Bulk Print
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={handleBulkPrint}>
                <Download className="h-4 w-4" />
                Bulk Download
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button type="button" className="gap-2" onClick={handlePrint}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedGroup || !selectedStudent ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
                Select an examination and student to generate a hall ticket.
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Student</p><p className="font-semibold">{selectedStudent.first_name} {selectedStudent.last_name}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Exam</p><p className="font-semibold">{selectedGroup.name}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Class</p><p className="font-semibold">{selectedGroup.className || '-'}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Section</p><p className="font-semibold">{selectedGroup.section || '-'}</p></CardContent></Card>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Invigilator Sign</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {printableRows.map((exam: any) => (
                        <TableRow key={exam.id}>
                          <TableCell className="font-medium">{exam.subject}</TableCell>
                          <TableCell>{formatHallTicketDate(exam.exam_date)}</TableCell>
                          <TableCell>{formatHallTicketTime(exam.start_time)}</TableCell>
                          <TableCell>{formatHallTicketTime(exam.end_time)}</TableCell>
                          <TableCell>{exam.room_number || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Scheduled</Badge>
                          </TableCell>
                          <TableCell className="min-w-32">&nbsp;</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
