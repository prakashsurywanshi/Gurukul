import { useLanguage } from '../../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, Eye, Search, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../DashboardLayout';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

interface BulkDeleteStudentsProps {
    user: any;
    classRecords: {
        id: number;
        name: string;
        section: string;
    }[];
    studentRecords: any[];
    deletedStudentRecords: any[];
}

export default function BulkDeleteStudents({
    user,
    classRecords,
    studentRecords,
    deletedStudentRecords,
}: BulkDeleteStudentsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [students, setStudents] = useState<any[]>(studentRecords ?? []);
    const [deletedStudents, setDeletedStudents] = useState<any[]>(deletedStudentRecords ?? []);
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('all');
    const [sectionFilter, setSectionFilter] = useState('all');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

    useEffect(() => {
        setStudents(studentRecords ?? []);
    }, [studentRecords]);

    useEffect(() => {
        setDeletedStudents(deletedStudentRecords ?? []);
    }, [deletedStudentRecords]);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const classOptions = useMemo(
        () =>
            Array.from(new Set(classRecords.map((classRecord) => String(classRecord.name)))).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true }),
            ),
        [classRecords],
    );

    const sectionOptions = useMemo(() => {
        const sourceRecords =
            classFilter === 'all'
                ? classRecords
                : classRecords.filter((classRecord) => String(classRecord.name) === classFilter);

        return Array.from(new Set(sourceRecords.map((classRecord) => String(classRecord.section)))).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true }),
        );
    }, [classFilter, classRecords]);

    const filteredStudents = useMemo(() => {
        const sectionFilteredStudents = students.filter(
            (student) =>
                (classFilter === 'all' || String(student.class) === classFilter) &&
                (sectionFilter === 'all' || String(student.section) === sectionFilter),
        );

        if (!searchQuery.trim()) {
            return sectionFilteredStudents;
        }

        const searchLower = searchQuery.toLowerCase();

        return sectionFilteredStudents.filter(
            (student) =>
                String(student.first_name).toLowerCase().includes(searchLower) ||
                String(student.last_name).toLowerCase().includes(searchLower) ||
                String(student.email).toLowerCase().includes(searchLower) ||
                String(student.roll_number).toLowerCase().includes(searchLower) ||
                String(student.admission_no).toLowerCase().includes(searchLower),
        );
    }, [classFilter, searchQuery, sectionFilter, students]);

    useEffect(() => {
        if (sectionFilter !== 'all' && !sectionOptions.includes(sectionFilter)) {
            setSectionFilter('all');
        }
    }, [sectionFilter, sectionOptions]);

    const allVisibleSelected = useMemo(
        () => filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudents.includes(student.id)),
        [filteredStudents, selectedStudents],
    );

    const toggleStudent = (studentId: string) => {
        setSelectedStudents((current) =>
            current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId],
        );
    };

    const toggleAllVisible = () => {
        if (allVisibleSelected) {
            setSelectedStudents((current) =>
                current.filter((id) => !filteredStudents.some((student) => student.id === id)),
            );
            return;
        }

        setSelectedStudents((current) =>
            Array.from(new Set([...current, ...filteredStudents.map((student) => student.id)])),
        );
    };

    const handleBulkDelete = () => {
        if (selectedStudents.length === 0) {
            toast.error('Select at least one student to delete');
            return;
        }

        if (
            !window.confirm(
                `Delete ${selectedStudents.length} selected student(s) permanently? This action cannot be undone.`,
            )
        ) {
            return;
        }

        router.post(
            '/students/bulk-delete',
            { studentIds: selectedStudents },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedStudents([]);
                },
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="bulk-delete-students">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Bulk Delete Students')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Permanently delete selected students and remove their linked student accounts.')}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="destructive"
                            className="gap-2"
                            onClick={handleBulkDelete}
                            disabled={selectedStudents.length === 0}
                        >
                            <Trash2 className="h-4 w-4" />
                            {t('Delete Selected (')}
                            {selectedStudents.length})
                        </Button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Active Students')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{students.length}</p>
                                    </div>
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">{t('Deleted Students')}</p>
                                        <p className="text-3xl font-bold text-slate-900">{deletedStudents.length}</p>
                                    </div>
                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{t('Deleted')}</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
                                    <AlertTriangle className="h-5 w-5" />
                                    <p className="text-sm font-medium">
                                        {t('Students are soft deleted and shown separately below.')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Active Student Records')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        placeholder={t('Search students...')}
                                        className="pl-10"
                                    />
                                </div>

                                <Select
                                    value={classFilter}
                                    onValueChange={(value) => {
                                        setClassFilter(value);
                                        setSectionFilter('all');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select class')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Classes')}</SelectItem>
                                        {classOptions.map((className) => (
                                            <SelectItem key={className} value={className}>
                                                {className}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={sectionFilter}
                                    onValueChange={setSectionFilter}
                                    disabled={sectionOptions.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select section')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Sections')}</SelectItem>
                                        {sectionOptions.map((section) => (
                                            <SelectItem key={section} value={section}>
                                                {t('Section')}
                                                {section}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {filteredStudents.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                                    <p className="text-sm text-slate-500">
                                        {t('No active students found for the selected filters.')}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-14">
                                                    <Checkbox
                                                        checked={allVisibleSelected}
                                                        onCheckedChange={toggleAllVisible}
                                                    />
                                                </TableHead>
                                                <TableHead>{t('Name')}</TableHead>
                                                <TableHead>{t('Email')}</TableHead>
                                                <TableHead>{t('Class')}</TableHead>
                                                <TableHead>{t('Section')}</TableHead>
                                                <TableHead>{t('Roll Number')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredStudents.map((student) => (
                                                <TableRow key={student.id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedStudents.includes(student.id)}
                                                            onCheckedChange={() => toggleStudent(student.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {student.first_name} {student.last_name}
                                                    </TableCell>
                                                    <TableCell>{student.email}</TableCell>
                                                    <TableCell>{student.class}</TableCell>
                                                    <TableCell>{student.section}</TableCell>
                                                    <TableCell>{student.roll_number || '-'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{student.status || t('active')}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Deleted Students')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {deletedStudents.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                                    <p className="text-sm text-slate-500">{t('No deleted students yet.')}</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Name')}</TableHead>
                                                <TableHead>{t('Admission No.')}</TableHead>
                                                <TableHead>{t('Class')}</TableHead>
                                                <TableHead>{t('Section')}</TableHead>
                                                <TableHead>{t('Deleted On')}</TableHead>
                                                <TableHead>{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {deletedStudents.map((student) => (
                                                <TableRow key={student.id}>
                                                    <TableCell className="font-medium">
                                                        {student.first_name} {student.last_name}
                                                    </TableCell>
                                                    <TableCell>{student.admission_no}</TableCell>
                                                    <TableCell>{student.class}</TableCell>
                                                    <TableCell>{student.section}</TableCell>
                                                    <TableCell>{student.deleted_at || '-'}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => router.visit(`/students/${student.id}`)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
