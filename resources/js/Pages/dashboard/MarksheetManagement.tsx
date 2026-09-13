import { useLanguage } from '../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { FileText, Eye, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface MarksheetManagementProps {
    user: any;
    organization?: {
        id: number;
        name: string | null;
        logo?: string | null;
    } | null;
    students?: any[];
    examGroups?: any[];
}

interface GeneratedMarksheet {
    studentId: string;
    studentName: string;
    studentNameMr?: string;
    examName: string;
    class: string;
    section: string;
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    status: 'Pass' | 'Fail';
}

export default function MarksheetManagement({
    user,
    organization,
    students = [],
    examGroups = [],
}: MarksheetManagementProps) {
    const { t } = useLanguage();
    const [printLanguage, setPrintLanguage] = useState<'en' | 'mr'>('en');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [generatedMarksheet, setGeneratedMarksheet] = useState<GeneratedMarksheet | null>(null);
    const [bulkGeneratedMarksheets, setBulkGeneratedMarksheets] = useState<GeneratedMarksheet[]>([]);

    const availableGroups = useMemo(() => examGroups.filter((group) => (group.exams || []).length > 0), [examGroups]);

    useEffect(() => {
        if (!selectedGroupId || !availableGroups.some((group) => group.groupId === selectedGroupId)) {
            setSelectedGroupId(availableGroups[0]?.groupId || '');
        }
    }, [availableGroups, selectedGroupId]);

    const selectedExamGroup = useMemo(
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
        const nextClass = selectedExamGroup?.className
            ? String(selectedExamGroup.className)
            : availableClassOptions[0] || '';
        setSelectedClass(nextClass);
        setSelectedSection(selectedExamGroup?.section ? String(selectedExamGroup.section) : '');
        setGeneratedMarksheet(null);
        setBulkGeneratedMarksheets([]);
    }, [availableClassOptions, selectedExamGroup?.className, selectedExamGroup?.section, selectedGroupId]);

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

    const filteredStudents = useMemo(() => {
        if (!selectedExamGroup || !selectedClass || !selectedSection) {
            return [];
        }

        return students.filter(
            (student) => String(student.class) === selectedClass && String(student.section) === selectedSection,
        );
    }, [selectedClass, selectedExamGroup, selectedSection, students]);

    const generatedHistory = useMemo(() => {
        if (!selectedExamGroup) return [];

        return filteredStudents.map((student) => {
            const subjectResults = selectedExamGroup.exams.map((exam) => {
                const result = (exam.results || []).find(
                    (entry: any) => String(entry.student_id) === String(student.id),
                );

                return {
                    subject: exam.subject,
                    obtained: Number(result?.marks_obtained ?? 0),
                    total: Number(exam.total_marks ?? 0),
                    passing: Number(exam.passing_marks ?? 0),
                };
            });

            const totalMarks = subjectResults.reduce((sum, item) => sum + item.total, 0);
            const obtainedMarks = subjectResults.reduce((sum, item) => sum + item.obtained, 0);
            const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
            const status = subjectResults.every((item) => item.obtained >= item.passing) ? 'Pass' : 'Fail';

            return {
                studentId: student.id,
                studentName: `${student.first_name} ${student.last_name}`,
                studentNameMr: `${student.first_name_mr || ''} ${student.last_name_mr || ''}`.trim() || undefined,
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

    const displayStudentName = (student: any) => {
        if (printLanguage === 'mr') {
            const mrName = `${student.first_name_mr || ''} ${student.last_name_mr || ''}`.trim();
            if (mrName) return mrName;
        }
        return `${student.first_name} ${student.last_name}`;
    };

    const handleExamChange = (value: string) => {
        setSelectedGroupId(value);
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
        toast.success(
            `Generated ${generatedHistory.length} marksheet${generatedHistory.length === 1 ? '' : 's'} for ${selectedClass} Section ${selectedSection}`,
        );
    };

    const studentRollNumber = (student: any) => student?.roll_number || String(student?.id || '');

    return (
        <DashboardLayout user={user} activeTab="marksheet">
            <div className="space-y-6 p-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-gray-900">{t('Marksheet')}</h1>
                    <p className="text-gray-600">
                        {t('Select an exam, then class and section, and generate marksheets student-wise.')}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Marksheet Filters')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>{t('Exam')}</Label>
                            <Select value={selectedGroupId} onValueChange={handleExamChange}>
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
                                    <SelectValue placeholder={t('Select class')} />
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
                            <Label>{t('Section')}</Label>
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
                                    <SelectValue placeholder={t('Select section')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableSectionOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {t('Section')}
                                            {option}
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
                            <CardTitle>{t('Students')}</CardTitle>
                            <p className="mt-1 text-sm text-slate-500">
                                {t('Generate marksheets student-wise or in bulk for the selected class and section.')}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
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
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={handleGenerateBulkMarksheets}
                                disabled={
                                    !selectedExamGroup ||
                                    !selectedClass ||
                                    !selectedSection ||
                                    generatedHistory.length === 0
                                }
                            >
                                <FileText className="h-4 w-4" />
                                {t('Generate Bulk Marksheet')}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Student')}</TableHead>
                                        <TableHead>{t('Roll No')}</TableHead>
                                        <TableHead>{t('Exam')}</TableHead>
                                        <TableHead>{t('Class')}</TableHead>
                                        <TableHead>{t('Section')}</TableHead>
                                        <TableHead>{t('Subjects')}</TableHead>
                                        <TableHead className="text-right">{t('Action')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!selectedExamGroup || !selectedClass || !selectedSection ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                                                {t('Select exam, class, and section to load students.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredStudents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                                                {t('No assigned students found for the selected class and section.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredStudents.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-medium">
                                                    {displayStudentName(student)}
                                                </TableCell>
                                                <TableCell>{studentRollNumber(student)}</TableCell>
                                                <TableCell>{selectedExamGroup.name}</TableCell>
                                                <TableCell>{student.class}</TableCell>
                                                <TableCell>{student.section}</TableCell>
                                                <TableCell>{selectedExamGroup.exams.length}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2"
                                                        onClick={() => handleGenerateMarksheet(student.id)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        {t('Generate Marksheet')}
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
                                {t('Select an exam first to begin marksheet generation.')}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {generatedMarksheet && selectedExamGroup && (
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                            <div>
                                <CardTitle>{t('Generated Marksheet')}</CardTitle>
                                <p className="mt-1 text-sm text-slate-500">
                                    {printLanguage === 'mr' && generatedMarksheet.studentNameMr
                                        ? generatedMarksheet.studentNameMr
                                        : generatedMarksheet.studentName}{' '}
                                    | {generatedMarksheet.examName}
                                </p>
                            </div>
                            <Button
                                type="button"
                                className="gap-2"
                                onClick={() => toast.success('Marksheet download prepared')}
                            >
                                <Download className="h-4 w-4" />
                                {t('Download')}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-slate-500">{t('Class')}</p>
                                        <p className="font-semibold">{generatedMarksheet.class}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-slate-500">{t('Section')}</p>
                                        <p className="font-semibold">{generatedMarksheet.section}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-slate-500">{t('Total')}</p>
                                        <p className="font-semibold">
                                            {generatedMarksheet.obtainedMarks} / {generatedMarksheet.totalMarks}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-slate-500">{t('Result')}</p>
                                        <Badge
                                            variant={generatedMarksheet.status === 'Pass' ? 'default' : 'destructive'}
                                        >
                                            {t(generatedMarksheet.status)}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Subject')}</TableHead>
                                            <TableHead>{t('Total Marks')}</TableHead>
                                            <TableHead>{t('Min Marks')}</TableHead>
                                            <TableHead>{t('Obtained Marks')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedExamGroup.exams.map((exam: any) => {
                                            const result = (exam.results || []).find(
                                                (entry: any) =>
                                                    String(entry.student_id) === generatedMarksheet.studentId,
                                            );
                                            const obtained = Number(result?.marks_obtained ?? 0);
                                            const passed = obtained >= Number(exam.passing_marks ?? 0);

                                            return (
                                                <TableRow key={exam.id}>
                                                    <TableCell className="font-medium">{exam.subject}</TableCell>
                                                    <TableCell>{exam.total_marks}</TableCell>
                                                    <TableCell>{exam.passing_marks}</TableCell>
                                                    <TableCell>{obtained}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={passed ? 'default' : 'destructive'}>
                                                            {passed ? t('Pass') : t('Fail')}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="text-right text-sm text-slate-600">
                                {t('Percentage:')}{' '}
                                <span className="font-semibold">{generatedMarksheet.percentage.toFixed(2)}%</span>
                            </div>

                            <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                                <div className="mx-auto max-w-5xl rounded-2xl border-[10px] border-double border-slate-800 bg-white p-8 shadow-sm">
                                    <div className="border-b border-slate-200 pb-6 text-center">
                                        <h2 className="text-3xl font-bold tracking-wide text-slate-900">
                                            {organization?.name || user?.organization_name || t('Gurukul School')}
                                        </h2>
                                        <p className="mt-2 text-sm uppercase tracking-[0.35em] text-slate-500">
                                            {t('Student Marksheet Preview')}
                                        </p>
                                        <p className="mt-3 text-lg font-semibold text-slate-700">
                                            {generatedMarksheet.examName}
                                        </p>
                                    </div>

                                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                {t('Student Name')}
                                            </p>
                                            <p className="text-lg font-semibold text-slate-900">
                                                {printLanguage === 'mr' && generatedMarksheet.studentNameMr
                                                    ? generatedMarksheet.studentNameMr
                                                    : generatedMarksheet.studentName}
                                            </p>
                                        </div>
                                        <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                {t('Roll No')}
                                            </p>
                                            <p className="text-lg font-semibold text-slate-900">
                                                {filteredStudents.find(
                                                    (student) => student.id === generatedMarksheet.studentId,
                                                )
                                                    ? studentRollNumber(
                                                          filteredStudents.find(
                                                              (student) => student.id === generatedMarksheet.studentId,
                                                          ),
                                                      )
                                                    : generatedMarksheet.studentId}
                                            </p>
                                        </div>
                                        <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                {t('Class / Section')}
                                            </p>
                                            <p className="text-lg font-semibold text-slate-900">
                                                {generatedMarksheet.class}
                                                {t('- Section')}
                                                {generatedMarksheet.section}
                                            </p>
                                        </div>
                                        <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                {t('Overall Result')}
                                            </p>
                                            <p className="text-lg font-semibold text-slate-900">
                                                {t(generatedMarksheet.status)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50">
                                                    <TableHead>{t('Subject')}</TableHead>
                                                    <TableHead>{t('Total')}</TableHead>
                                                    <TableHead>{t('Min')}</TableHead>
                                                    <TableHead>{t('Obtained')}</TableHead>
                                                    <TableHead>{t('Result')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedExamGroup.exams.map((exam: any) => {
                                                    const result = (exam.results || []).find(
                                                        (entry: any) =>
                                                            String(entry.student_id) === generatedMarksheet.studentId,
                                                    );
                                                    const obtained = Number(result?.marks_obtained ?? 0);
                                                    const passed = obtained >= Number(exam.passing_marks ?? 0);

                                                    return (
                                                        <TableRow key={`preview_${exam.id}`}>
                                                            <TableCell className="font-medium">
                                                                {exam.subject}
                                                            </TableCell>
                                                            <TableCell>{exam.total_marks}</TableCell>
                                                            <TableCell>{exam.passing_marks}</TableCell>
                                                            <TableCell>{obtained}</TableCell>
                                                            <TableCell>{passed ? t('Pass') : t('Fail')}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                                        <div className="rounded-xl bg-slate-50 p-4 text-center">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                {t('Total Marks')}
                                            </p>
                                            <p className="mt-2 text-2xl font-bold text-slate-900">
                                                {generatedMarksheet.totalMarks}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-4 text-center">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                {t('Obtained Marks')}
                                            </p>
                                            <p className="mt-2 text-2xl font-bold text-slate-900">
                                                {generatedMarksheet.obtainedMarks}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-4 text-center">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                {t('Percentage')}
                                            </p>
                                            <p className="mt-2 text-2xl font-bold text-slate-900">
                                                {generatedMarksheet.percentage.toFixed(2)}%
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-10 flex items-end justify-between text-sm text-slate-600">
                                        <div className="w-40 border-t border-slate-400 pt-2 text-center">
                                            {t('Class Teacher')}
                                        </div>
                                        <div className="w-40 border-t border-slate-400 pt-2 text-center">
                                            {t('Principal')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {bulkGeneratedMarksheets.length > 0 && selectedExamGroup && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Bulk Generated Marksheets')}</CardTitle>
                            <p className="mt-1 text-sm text-slate-500">
                                {selectedExamGroup.name} | {selectedClass}
                                {t('| Section')}
                                {selectedSection}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Student')}</TableHead>
                                            <TableHead>{t('Total Marks')}</TableHead>
                                            <TableHead>{t('Obtained Marks')}</TableHead>
                                            <TableHead>{t('Percentage')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
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
                                                    <Badge
                                                        variant={
                                                            marksheet.status === 'Pass' ? 'default' : 'destructive'
                                                        }
                                                    >
                                                        {t(marksheet.status)}
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
