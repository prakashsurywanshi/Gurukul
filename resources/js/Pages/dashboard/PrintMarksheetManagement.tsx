import { useLanguage } from '../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Download, Printer } from 'lucide-react';
import { formatDate } from '../ui/utils';
import { toast } from 'sonner';

interface PrintMarksheetManagementProps {
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

export default function PrintMarksheetManagement({
    user,
    organization,
    students,
    examGroups,
}: PrintMarksheetManagementProps) {
    const { t } = useLanguage();
    const schoolName = organization?.name || 'Gurukul School';
    const availableGroups = useMemo(() => examGroups.filter((group) => (group.exams || []).length > 0), [examGroups]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [printLanguage, setPrintLanguage] = useState<'en' | 'mr'>('en');

    useEffect(() => {
        if (!selectedGroupId || !availableGroups.some((group) => group.groupId === selectedGroupId)) {
            setSelectedGroupId(availableGroups[0]?.groupId || '');
        }
    }, [availableGroups, selectedGroupId]);

    const selectedGroup = useMemo(
        () => availableGroups.find((group) => group.groupId === selectedGroupId) || null,
        [availableGroups, selectedGroupId],
    );

    const availableClassOptions = useMemo(
        () =>
            Array.from(new Set(students.map((student) => String(student.class)).filter(Boolean))).sort((left, right) =>
                left.localeCompare(right, undefined, { numeric: true }),
            ),
        [students],
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
                    .filter(Boolean),
            ),
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
            (student) => String(student.class) === selectedClass && String(student.section) === selectedSection,
        );
    }, [selectedClass, selectedGroup, selectedSection, students]);

    useEffect(() => {
        if (!selectedStudentId || !eligibleStudents.some((student) => String(student.id) === selectedStudentId)) {
            setSelectedStudentId(eligibleStudents[0] ? String(eligibleStudents[0].id) : '');
        }
    }, [eligibleStudents, selectedStudentId]);

    const selectedStudent = useMemo(
        () => eligibleStudents.find((student) => String(student.id) === selectedStudentId) || null,
        [eligibleStudents, selectedStudentId],
    );

    const studentDisplayName = (student: any) => {
        if (printLanguage === 'mr') {
            const mrName = `${student.first_name_mr || ''} ${student.last_name_mr || ''}`.trim();
            if (mrName) return mrName;
        }
        return `${student.first_name} ${student.last_name}`;
    };

    const marksheetRows = useMemo(() => {
        if (!selectedGroup || !selectedStudent) {
            return [];
        }

        return (selectedGroup.exams || []).map((exam: any) => {
            const result = (exam.results || []).find(
                (entry: any) => String(entry.student_id) === String(selectedStudent.id),
            );
            const marksObtained = Number(result?.marks_obtained || 0);
            const totalMarks = Number(exam.total_marks || 0);
            const passingMarks = Number(exam.passing_marks || 0);

            return {
                id: exam.id,
                subject: exam.subject,
                examDate: exam.exam_date,
                totalMarks,
                passingMarks,
                marksObtained,
                grade: result?.grade || '-',
                status: marksObtained >= passingMarks ? 'Pass' : 'Fail',
            };
        });
    }, [selectedGroup, selectedStudent]);

    const summary = useMemo(() => {
        const totalMarks = marksheetRows.reduce((sum, row) => sum + row.totalMarks, 0);
        const obtainedMarks = marksheetRows.reduce((sum, row) => sum + row.marksObtained, 0);
        const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
        const status =
            marksheetRows.length > 0 && marksheetRows.every((row) => row.status === 'Pass') ? 'Pass' : 'Fail';

        return { totalMarks, obtainedMarks, percentage, status };
    }, [marksheetRows]);

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
            .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
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

    const buildMarksheetData = (student: any) => {
        const rows = (selectedGroup?.exams || []).map((exam: any) => {
            const result = (exam.results || []).find((entry: any) => String(entry.student_id) === String(student.id));
            const marksObtained = Number(result?.marks_obtained || 0);
            const totalMarks = Number(exam.total_marks || 0);
            const passingMarks = Number(exam.passing_marks || 0);

            return {
                id: exam.id,
                subject: exam.subject,
                examDate: exam.exam_date,
                totalMarks,
                passingMarks,
                marksObtained,
                grade: result?.grade || '-',
                status: marksObtained >= passingMarks ? 'Pass' : 'Fail',
            };
        });

        const totalMarks = rows.reduce((sum, row) => sum + row.totalMarks, 0);
        const obtainedMarks = rows.reduce((sum, row) => sum + row.marksObtained, 0);
        const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
        const status = rows.length > 0 && rows.every((row) => row.status === 'Pass') ? 'Pass' : 'Fail';

        return {
            rows,
            summary: { totalMarks, obtainedMarks, percentage, status },
        };
    };

    const buildMarksheetMarkup = (student: any) => {
        const { rows, summary: studentSummary } = buildMarksheetData(student);

        const rowMarkup = rows
            .map(
                (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(String(row.subject || '-'))}</td>
            <td>${escapeHtml(String(row.examDate || '-'))}</td>
            <td>${row.totalMarks}</td>
            <td>${row.passingMarks}</td>
            <td>${row.marksObtained}</td>
            <td>${escapeHtml(String(row.grade || '-'))}</td>
            <td>${escapeHtml(row.status)}</td>
          </tr>
        `,
            )
            .join('');

        return `
      <div class="sheet">
        <div class="heading">
          <div>
            <div style="font-size: 26px; font-weight: 700;">${escapeHtml(schoolName)}</div>
            <div style="margin-top: 6px; font-size: 16px;">${escapeHtml(String(selectedGroup?.name || '-'))}</div>
          </div>
          <div>${escapeHtml(formatDate(new Date()))}</div>
        </div>
        <div class="meta">
          <div class="box"><strong>Student</strong><br />${escapeHtml(studentDisplayName(student))}</div>
          <div class="box"><strong>Class</strong><br />${escapeHtml(String(selectedGroup?.className || '-'))}</div>
          <div class="box"><strong>Section</strong><br />${escapeHtml(String(selectedGroup?.section || '-'))}</div>
          <div class="box"><strong>Result</strong><br />${escapeHtml(studentSummary.status)}</div>
          <div class="box"><strong>Total Marks</strong><br />${studentSummary.obtainedMarks} / ${studentSummary.totalMarks}</div>
          <div class="box"><strong>Percentage</strong><br />${studentSummary.percentage.toFixed(2)}%</div>
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
          <tbody>${rowMarkup}</tbody>
        </table>
      </div>
    `;
    };

    const bulkEligibleStudents = useMemo(
        () =>
            eligibleStudents.filter((student) =>
                (selectedGroup?.exams || []).some((exam: any) =>
                    (exam.results || []).some((entry: any) => String(entry.student_id) === String(student.id)),
                ),
            ),
        [eligibleStudents, selectedGroup],
    );

    const handlePrint = () => {
        if (!selectedGroup || !selectedStudent || marksheetRows.length === 0) {
            toast.error('Select an examination and student with result data first.');
            return;
        }

        openPrintWindow(
            `Marksheet - ${escapeHtml(studentDisplayName(selectedStudent))}`,
            buildMarksheetMarkup(selectedStudent),
        );
    };

    const handleBulkPrint = () => {
        if (!selectedGroup || bulkEligibleStudents.length === 0) {
            toast.error('No marksheets are available for bulk printing in this examination.');
            return;
        }

        openPrintWindow(
            `Bulk Marksheet - ${escapeHtml(String(selectedGroup.name || 'Examination'))}`,
            bulkEligibleStudents.map((student) => buildMarksheetMarkup(student)).join(''),
        );
        toast.success(
            `Prepared ${bulkEligibleStudents.length} marksheet${bulkEligibleStudents.length === 1 ? '' : 's'} for printing.`,
        );
    };

    return (
        <DashboardLayout user={user} activeTab="print-marksheet">
            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-gray-900">{t('Print Marksheet')}</h1>
                        <p className="text-gray-600">
                            {t('Choose an examination and student to preview and print the marksheet.')}
                        </p>
                    </div>
                    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
                        <button
                            onClick={() => setPrintLanguage('en')}
                            className={`px-3 py-2 text-sm font-medium transition ${printLanguage === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                        >
                            {t('English')}
                        </button>
                        <button
                            onClick={() => setPrintLanguage('mr')}
                            className={`px-3 py-2 text-sm font-medium transition ${printLanguage === 'mr' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                        >
                            मराठी
                        </button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Marksheet Filters')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                            <Label>{t('Examination')}</Label>
                            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select exam')} />
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
                            <Label>{t('Class')}</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select class')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableClassOptions.map((classOption) => (
                                        <SelectItem key={classOption} value={classOption}>
                                            {classOption}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('Section')}</Label>
                            <Select
                                value={selectedSection}
                                onValueChange={setSelectedSection}
                                disabled={!selectedClass}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select section')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableSectionOptions.map((sectionOption) => (
                                        <SelectItem key={sectionOption} value={sectionOption}>
                                            {t('Section')}
                                            {sectionOption}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('Student')}</Label>
                            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select student')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {eligibleStudents.map((student) => (
                                        <SelectItem key={student.id} value={String(student.id)}>
                                            {studentDisplayName(student)}
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
                            <CardTitle>{t('Marksheet Preview')}</CardTitle>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" className="gap-2" onClick={handleBulkPrint}>
                                <Printer className="h-4 w-4" />
                                {t('Bulk Print')}
                            </Button>
                            <Button type="button" variant="outline" className="gap-2" onClick={handleBulkPrint}>
                                <Download className="h-4 w-4" />
                                {t('Bulk Download')}
                            </Button>
                            <Button type="button" variant="outline" className="gap-2" onClick={handlePrint}>
                                <Printer className="h-4 w-4" />
                                {t('Print')}
                            </Button>
                            <Button type="button" className="gap-2" onClick={handlePrint}>
                                <Download className="h-4 w-4" />
                                {t('Download')}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {!selectedGroup || !selectedStudent ? (
                            <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
                                {t('Select an examination and student to generate a marksheet.')}
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <Card>
                                        <CardContent className="pt-6">
                                            <p className="text-sm text-slate-500">{t('Student')}</p>
                                            <p className="font-semibold">
                                                {selectedStudent ? studentDisplayName(selectedStudent) : '-'}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <p className="text-sm text-slate-500">{t('Exam')}</p>
                                            <p className="font-semibold">{selectedGroup.name}</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <p className="text-sm text-slate-500">{t('Total')}</p>
                                            <p className="font-semibold">
                                                {summary.obtainedMarks} / {summary.totalMarks}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <p className="text-sm text-slate-500">{t('Result')}</p>
                                            <Badge variant={summary.status === 'Pass' ? 'default' : 'destructive'}>
                                                {t(summary.status)}
                                            </Badge>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                    {t('Percentage:')}
                                    <span className="font-semibold">{summary.percentage.toFixed(2)}%</span>
                                </div>

                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Subject')}</TableHead>
                                                <TableHead>{t('Date')}</TableHead>
                                                <TableHead>{t('Total')}</TableHead>
                                                <TableHead>{t('Passing')}</TableHead>
                                                <TableHead>{t('Obtained')}</TableHead>
                                                <TableHead>{t('Grade')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {marksheetRows.map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-medium">{row.subject}</TableCell>
                                                    <TableCell>{row.examDate || '-'}</TableCell>
                                                    <TableCell>{row.totalMarks}</TableCell>
                                                    <TableCell>{row.passingMarks}</TableCell>
                                                    <TableCell>{row.marksObtained}</TableCell>
                                                    <TableCell>{t(row.grade)}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={row.status === 'Pass' ? 'default' : 'destructive'}
                                                        >
                                                            {t(row.status)}
                                                        </Badge>
                                                    </TableCell>
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
