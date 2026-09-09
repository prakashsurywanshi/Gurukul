import { useLanguage } from '../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Calendar, Download, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../ui/alert';
import DashboardLayout from '../DashboardLayout';
import { formatDate } from '../ui/utils';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day';

interface AttendanceManagementProps {
    user: any;
    classRecords: {
        id: number;
        name: string;
        section: string;
    }[];
    studentRecords: {
        id: string;
        class_id: number;
        admission_no: string;
        first_name: string;
        last_name: string;
        class: string;
        section: string;
        roll_number: string | null;
    }[];
    attendanceRecords: {
        student_id: string;
        class_id: number;
        date: string;
        status: 'present' | 'absent' | 'late' | 'half_day';
    }[];
}

export default function AttendanceManagement({
    user,
    classRecords,
    studentRecords,
    attendanceRecords,
}: AttendanceManagementProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [selectedClassName, setSelectedClassName] = useState('');
    const [selectedSectionName, setSelectedSectionName] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [saved, setSaved] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const uniqueClassNames = useMemo(
        () => [...new Set(classRecords.map((c) => c.name))].sort((a, b) => Number(a) - Number(b)),
        [classRecords],
    );

    const sectionsForClass = useMemo(
        () =>
            selectedClassName
                ? [...new Set(classRecords.filter((c) => c.name === selectedClassName).map((c) => c.section))].sort()
                : [],
        [classRecords, selectedClassName],
    );

    const selectedClassRecord = useMemo(
        () => classRecords.find((c) => c.name === selectedClassName && c.section === selectedSectionName) ?? null,
        [classRecords, selectedClassName, selectedSectionName],
    );

    useEffect(() => {
        if (sectionsForClass.length > 0) {
            setSelectedSectionName(sectionsForClass[0]);
        } else {
            setSelectedSectionName('');
        }
    }, [sectionsForClass]);

    const students = useMemo(() => {
        if (!selectedClassRecord) {
            return [];
        }

        return studentRecords.filter((student) => student.class_id === selectedClassRecord.id);
    }, [selectedClassRecord, studentRecords]);

    useEffect(() => {
        if (!selectedClassRecord) {
            setAttendance({});
            setSaved(true);
            return;
        }

        const nextAttendance: Record<string, AttendanceStatus> = {};

        students.forEach((student) => {
            const existingAttendance = attendanceRecords.find(
                (record) =>
                    record.student_id === student.id &&
                    record.class_id === selectedClassRecord.id &&
                    record.date === selectedDate,
            );

            nextAttendance[student.id] = existingAttendance
                ? existingAttendance.status === 'half_day'
                    ? 'half-day'
                    : existingAttendance.status
                : 'present';
        });

        setAttendance(nextAttendance);
        setSaved(true);
    }, [attendanceRecords, selectedClassRecord, selectedDate, students]);

    const attendanceStats = useMemo(() => {
        return Object.values(attendance).reduce(
            (stats, status) => {
                if (status === 'present') stats.totalPresent += 1;
                if (status === 'absent') stats.totalAbsent += 1;
                if (status === 'late') stats.totalLate += 1;
                if (status === 'half-day') stats.totalHalfDay += 1;
                return stats;
            },
            {
                totalPresent: 0,
                totalAbsent: 0,
                totalLate: 0,
                totalHalfDay: 0,
            },
        );
    }, [attendance]);

    const markAttendance = (studentId: string, status: AttendanceStatus) => {
        setAttendance((current) => ({ ...current, [studentId]: status }));
        setSaved(false);
    };

    const markAllPresent = () => {
        const nextAttendance: Record<string, AttendanceStatus> = {};
        students.forEach((student) => {
            nextAttendance[student.id] = 'present';
        });
        setAttendance(nextAttendance);
        setSaved(false);
    };

    const saveAttendance = () => {
        if (!selectedClassRecord || students.length === 0) {
            toast.error('Select a class with students first');
            return;
        }

        setLoading(true);
        router.post(
            '/attendance',
            {
                class_id: selectedClassRecord.id,
                date: selectedDate,
                entries: students.map((student) => ({
                    student_id: student.id,
                    status: attendance[student.id] === 'half-day' ? 'half_day' : attendance[student.id] || 'present',
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSaved(true);
                },
                onError: () => {
                    toast.error('Failed to save attendance');
                },
                onFinish: () => {
                    setLoading(false);
                },
            },
        );
    };

    const exportAttendance = () => {
        if (!selectedClassRecord) {
            return;
        }

        const headers = 'Admission No,Name,Class,Section,Status\n';
        const rows = students
            .map(
                (student) =>
                    `${student.admission_no},${student.first_name} ${student.last_name},${student.class},${student.section},${attendance[student.id] || 'present'}`,
            )
            .join('\n');

        const csvContent = headers + rows;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `attendance_${selectedDate}_${selectedClassRecord.name}_${selectedClassRecord.section}.csv`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        toast.success('Attendance exported successfully');
    };

    return (
        <DashboardLayout user={user} activeTab="attendance">
            <div className="p-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('Attendance Management')}</h1>
                        <p className="mt-1 text-gray-600">{t('Mark and track student attendance')}</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Select Class & Date')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                                <div className="space-y-2">
                                    <Label>{t('Class')}</Label>
                                    <Select value={selectedClassName} onValueChange={setSelectedClassName}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select class')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {uniqueClassNames.map((name) => (
                                                <SelectItem key={name} value={name}>
                                                    {name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Section')}</Label>
                                    <Select
                                        value={selectedSectionName}
                                        onValueChange={setSelectedSectionName}
                                        disabled={!selectedClassName || sectionsForClass.length === 0}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select section')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sectionsForClass.map((section) => (
                                                <SelectItem key={section} value={section}>
                                                    {t('Section')}
                                                    {section}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Date')}</Label>
                                    <Input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(event) => setSelectedDate(event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="invisible">{t('Actions')}</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={markAllPresent}
                                            disabled={!students.length}
                                            className="flex-1"
                                        >
                                            {t('Mark All Present')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {students.length > 0 && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">{t('Total Students')}</p>
                                            <p className="text-2xl font-bold">{students.length}</p>
                                        </div>
                                        <Calendar className="h-8 w-8 text-gray-400" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">{t('Present')}</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                {attendanceStats.totalPresent}
                                            </p>
                                        </div>
                                        <CheckCircle className="h-8 w-8 text-green-500" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">{t('Absent')}</p>
                                            <p className="text-2xl font-bold text-red-600">
                                                {attendanceStats.totalAbsent}
                                            </p>
                                        </div>
                                        <XCircle className="h-8 w-8 text-red-500" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">{t('Late')}</p>
                                            <p className="text-2xl font-bold text-yellow-600">
                                                {attendanceStats.totalLate}
                                            </p>
                                        </div>
                                        <MinusCircle className="h-8 w-8 text-yellow-500" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">{t('Half Day')}</p>
                                            <p className="text-2xl font-bold text-blue-600">
                                                {attendanceStats.totalHalfDay}
                                            </p>
                                        </div>
                                        <MinusCircle className="h-8 w-8 text-blue-500" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>{t('Mark Attendance')}</CardTitle>
                                {students.length > 0 && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={exportAttendance}>
                                            <Download className="mr-2 h-4 w-4" />
                                            {t('Export')}
                                        </Button>
                                        <Button size="sm" onClick={saveAttendance} disabled={loading || saved}>
                                            {loading ? t('Saving...') : saved ? t('Saved') : t('Save Attendance')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!selectedClassRecord ? (
                                <div className="py-12 text-center">
                                    <Calendar className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                                    <p className="text-gray-600">{t('Select a class to mark attendance')}</p>
                                </div>
                            ) : students.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-gray-600">
                                        {t('No active students found in this class and section')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-5 gap-2 rounded-lg bg-gray-50 p-3 text-sm font-medium">
                                        <div className="col-span-2">{t('Student')}</div>
                                        <div>{t('Roll No.')}</div>
                                        <div className="col-span-2">{t('Attendance Status')}</div>
                                    </div>
                                    {students.map((student) => (
                                        <div
                                            key={student.id}
                                            className="grid grid-cols-5 items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
                                        >
                                            <div className="col-span-2">
                                                <p className="font-medium">
                                                    {student.first_name} {student.last_name}
                                                </p>
                                                <p className="text-sm text-gray-500">{student.admission_no}</p>
                                            </div>
                                            <div>
                                                <Badge variant="outline">{student.roll_number || '-'}</Badge>
                                            </div>
                                            <div className="col-span-2 flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant={
                                                        attendance[student.id] === 'present' ? 'default' : 'outline'
                                                    }
                                                    onClick={() => markAttendance(student.id, 'present')}
                                                    className={
                                                        attendance[student.id] === 'present'
                                                            ? 'bg-green-600 hover:bg-green-700'
                                                            : ''
                                                    }
                                                >
                                                    <CheckCircle className="mr-1 h-4 w-4" />
                                                    {t('Present')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={
                                                        attendance[student.id] === 'absent' ? 'default' : 'outline'
                                                    }
                                                    onClick={() => markAttendance(student.id, 'absent')}
                                                    className={
                                                        attendance[student.id] === 'absent'
                                                            ? 'bg-red-600 hover:bg-red-700'
                                                            : ''
                                                    }
                                                >
                                                    <XCircle className="mr-1 h-4 w-4" />
                                                    {t('Absent')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={attendance[student.id] === 'late' ? 'default' : 'outline'}
                                                    onClick={() => markAttendance(student.id, 'late')}
                                                    className={
                                                        attendance[student.id] === 'late'
                                                            ? 'bg-yellow-600 hover:bg-yellow-700'
                                                            : ''
                                                    }
                                                >
                                                    {t('Late')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={
                                                        attendance[student.id] === 'half-day' ? 'default' : 'outline'
                                                    }
                                                    onClick={() => markAttendance(student.id, 'half-day')}
                                                    className={
                                                        attendance[student.id] === 'half-day'
                                                            ? 'bg-blue-600 hover:bg-blue-700'
                                                            : ''
                                                    }
                                                >
                                                    {t('Half Day')}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {students.length > 0 && selectedClassRecord && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Attendance Summary')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-sm font-medium">{t('Attendance Rate')}</span>
                                            <span className="text-sm font-medium">
                                                {students.length > 0
                                                    ? Math.round((attendanceStats.totalPresent / students.length) * 100)
                                                    : 0}
                                                %
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-gray-200">
                                            <div
                                                className="h-2 rounded-full bg-green-600 transition-all"
                                                style={{
                                                    width: `${students.length > 0 ? (attendanceStats.totalPresent / students.length) * 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <Alert>
                                        <AlertDescription>
                                            {selectedClassRecord.name}
                                            {t('- Section')}
                                            {selectedClassRecord.section}
                                            {t('| Date:')} {formatDate(selectedDate)}
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
