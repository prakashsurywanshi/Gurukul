import { useLanguage } from '../../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BedDouble,
    BusFront,
    ChevronLeft,
    ChevronRight,
    Phone,
    Mail,
    User,
    MapPin,
    CalendarDays,
    GraduationCap,
    Users,
    Pencil,
} from 'lucide-react';
import DashboardLayout from '../../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

interface StudentDetailsProps {
    user: any;
    studentId: string;
    student?: any | null;
    siblings?: Sibling[];
    studentRecords?: any[];
    academicHistory?: {
        id: string;
        session?: string | null;
        class?: string | null;
        section?: string | null;
        roll_number?: string | null;
        status?: string | null;
        entry_type?: string | null;
        effective_date?: string | null;
        is_current: boolean;
        notes?: string | null;
    }[];
}

interface Sibling {
    id: string;
    admission_no?: string | null;
    name: string;
    class?: string | null;
    section?: string | null;
    roll_number?: string | number | null;
    gender?: string | null;
}

export default function StudentDetails({
    user,
    studentId,
    student: initialStudent,
    siblings = [],
    studentRecords = [],
    academicHistory = [],
}: StudentDetailsProps) {
    const { t } = useLanguage();
    const { languageSettings } = usePage().props as any;
    const dualLanguageEnabled = Boolean(languageSettings?.dual_language_enabled);
    const [student, setStudent] = useState<any>(initialStudent ?? null);
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedSection, setSelectedSection] = useState('all');

    useEffect(() => {
        setStudent(initialStudent ?? null);
    }, [initialStudent]);

    const allStudents = useMemo(() => studentRecords || [], [studentRecords]);

    useEffect(() => {
        if (!student) {
            return;
        }

        setSelectedClass(String(student.class || 'all'));
        setSelectedSection(String(student.section || 'all'));
    }, [student]);

    const classOptions = useMemo(
        () =>
            Array.from(new Set(allStudents.map((item) => String(item.class)))).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true }),
            ),
        [allStudents],
    );

    const sectionOptions = useMemo(() => {
        return Array.from(
            new Set(
                allStudents
                    .filter((item) => selectedClass === 'all' || String(item.class) === selectedClass)
                    .map((item) => String(item.section)),
            ),
        ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [allStudents, selectedClass]);

    useEffect(() => {
        if (selectedSection !== 'all' && !sectionOptions.includes(selectedSection)) {
            setSelectedSection('all');
        }
    }, [sectionOptions, selectedSection]);

    const relatedStudents = useMemo(() => {
        return allStudents.filter((item) => {
            const matchesClass = selectedClass === 'all' || String(item.class) === selectedClass;
            const matchesSection = selectedSection === 'all' || String(item.section) === selectedSection;
            return matchesClass && matchesSection;
        });
    }, [allStudents, selectedClass, selectedSection]);

    const currentStudentIndex = relatedStudents.findIndex((item) => String(item.id) === String(studentId));
    const previousStudent = currentStudentIndex > 0 ? relatedStudents[currentStudentIndex - 1] : null;
    const nextStudent =
        currentStudentIndex >= 0 && currentStudentIndex < relatedStudents.length - 1
            ? relatedStudents[currentStudentIndex + 1]
            : null;

    if (!student) {
        return (
            <DashboardLayout user={user} activeTab="search_students">
                <div className="min-h-full bg-slate-50 p-8">
                    <div className="mx-auto max-w-5xl space-y-6">
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/search_students">
                                <ArrowLeft className="h-4 w-4" />
                                {t('Back to Students')}
                            </Link>
                        </Button>

                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-lg font-semibold text-slate-900">{t('Student not found')}</p>
                                <p className="mt-2 text-sm text-slate-500">
                                    {t('The requested student record could not be loaded.')}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={user} activeTab="search_students">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-5xl space-y-6">
                    {student.deleted_at && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            {t('This student is in deleted students. Deleted on')}
                            {student.deleted_at}.
                        </div>
                    )}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <Button asChild variant="outline" className="mb-4 gap-2">
                                <Link href="/search_students">
                                    <ArrowLeft className="h-4 w-4" />
                                    {t('Back to Students')}
                                </Link>
                            </Button>
                            <h1 className="text-3xl font-bold text-slate-900">
                                {student.first_name} {student.middle_name} {student.last_name}
                            </h1>
                            {(student.first_name_mr || student.middle_name_mr || student.last_name_mr) && (
                                <p className="mt-1 text-lg font-medium text-slate-700">
                                    {student.first_name_mr} {student.middle_name_mr} {student.last_name_mr}
                                </p>
                            )}
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Admission No.')}
                                {student.admission_no}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {!student.deleted_at && (
                                <Button asChild variant="outline" className="gap-2">
                                    <Link href={`/students/${studentId}/edit`}>
                                        <Pencil className="h-4 w-4" />
                                        {t('Edit Student')}
                                    </Link>
                                </Button>
                            )}
                            <Badge variant="outline" className="px-3 py-1 text-sm">
                                {student.class}-{student.section}
                            </Badge>
                            {student.deleted_at && (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{t('deleted')}</Badge>
                            )}
                            <Badge
                                className={
                                    student.status === 'inactive'
                                        ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                }
                            >
                                {student.status || t('active')}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                        <div className="space-y-6">
                            <Card className="xl:sticky xl:top-8">
                                <CardHeader>
                                    <CardTitle>{t('Quick Student Switch')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Select
                                        value={selectedClass}
                                        onValueChange={(value) => {
                                            setSelectedClass(value);
                                            setSelectedSection('all');
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

                                    <Select value={selectedSection} onValueChange={setSelectedSection}>
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

                                    <div className="grid grid-cols-2 gap-2">
                                        {previousStudent ? (
                                            <Button asChild variant="outline" className="gap-2">
                                                <Link href={`/students/${previousStudent.id}`}>
                                                    <ChevronLeft className="h-4 w-4" />
                                                    {t('Previous')}
                                                </Link>
                                            </Button>
                                        ) : (
                                            <Button variant="outline" disabled className="gap-2">
                                                <ChevronLeft className="h-4 w-4" />
                                                {t('Previous')}
                                            </Button>
                                        )}
                                        {nextStudent ? (
                                            <Button asChild variant="outline" className="gap-2">
                                                <Link href={`/students/${nextStudent.id}`}>
                                                    {t('Next')}

                                                    <ChevronRight className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        ) : (
                                            <Button variant="outline" disabled className="gap-2">
                                                {t('Next')}

                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <p className="text-sm text-slate-500">
                                        {relatedStudents.length}
                                        {t('student')}
                                        {relatedStudents.length === 1 ? '' : 's'}
                                        {t('in this view')}
                                    </p>

                                    <div className="space-y-3">
                                        {relatedStudents.map((item) => {
                                            const isCurrentStudent = item.id === studentId;

                                            return (
                                                <Link
                                                    key={item.id}
                                                    href={`/students/${item.id}`}
                                                    className={`block rounded-xl border p-4 transition ${
                                                        isCurrentStudent
                                                            ? 'border-blue-300 bg-blue-50'
                                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="font-medium text-slate-900">
                                                                {item.first_name} {item.last_name}
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {item.admission_no}
                                                            </p>
                                                        </div>
                                                        {isCurrentStudent ? (
                                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                                {t('Current')}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline">
                                                                {item.class}-{item.section}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                                                        <span>
                                                            {t('Roll No.')}
                                                            {item.roll_number || '-'}
                                                        </span>
                                                        <span>
                                                            {item.class}-{item.section}
                                                        </span>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Academic Details')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <GraduationCap className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Class & Section')}</p>
                                            <p className="font-medium text-slate-900">
                                                {student.class}
                                                {t('- Section')}
                                                {student.section}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <User className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Roll Number')}</p>
                                            <p className="font-medium text-slate-900">{student.roll_number || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <CalendarDays className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Admission Date')}</p>
                                            <p className="font-medium text-slate-900">
                                                {student.admission_date || '-'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>{t('Academic History')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {academicHistory.length === 0 ? (
                                        <p className="text-sm text-slate-500">
                                            {t('No academic history has been recorded for this student yet.')}
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {academicHistory.map((history) => (
                                                <div
                                                    key={history.id}
                                                    className="rounded-xl border border-slate-200 p-4"
                                                >
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="font-semibold text-slate-900">
                                                                    {history.session || t('Session not set')} |{' '}
                                                                    {history.class || '-'} - {history.section || '-'}
                                                                </p>
                                                                {history.is_current ? (
                                                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                                        {t('Current')}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline">{t('History')}</Badge>
                                                                )}
                                                            </div>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {t('Effective Date:')}
                                                                {history.effective_date || '-'}
                                                                {t('| Roll No.')}
                                                                {history.roll_number || '-'}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Badge variant="outline" className="capitalize">
                                                                {history.entry_type?.replace('_', ' ') || t('record')}
                                                            </Badge>
                                                            <Badge
                                                                className={
                                                                    history.status === 'inactive'
                                                                        ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                                                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                                                }
                                                            >
                                                                {history.status || t('active')}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    {history.notes ? (
                                                        <p className="mt-3 text-sm text-slate-600">{history.notes}</p>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Student Information')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <CalendarDays className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Date of Birth')}</p>
                                            <p className="font-medium text-slate-900">{student.date_of_birth || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <User className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Gender')}</p>
                                            <p className="font-medium capitalize text-slate-900">
                                                {student.gender || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <User className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Blood Group')}</p>
                                            <p className="font-medium text-slate-900">{student.blood_group || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Mail className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Email')}</p>
                                            <p className="font-medium text-slate-900">{student.email || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Phone className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Phone')}</p>
                                            <p className="font-medium text-slate-900">{student.phone || '-'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Parent Details')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Users className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t("Father's Name")}</p>
                                            <p className="font-medium text-slate-900">{student.father_name || '-'}</p>
                                            {dualLanguageEnabled && student.father_name_mr && (
                                                <p className="text-sm text-slate-600">{student.father_name_mr}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Phone className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t("Father's Phone")}</p>
                                            <p className="font-medium text-slate-900">{student.father_phone || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Users className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t("Mother's Name")}</p>
                                            <p className="font-medium text-slate-900">{student.mother_name || '-'}</p>
                                            {dualLanguageEnabled && student.mother_name_mr && (
                                                <p className="text-sm text-slate-600">{student.mother_name_mr}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Phone className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t("Mother's Phone")}</p>
                                            <p className="font-medium text-slate-900">{student.mother_phone || '-'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-blue-600" />
                                        {t('Siblings')}
                                        <Badge variant="outline">{siblings.length}</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {siblings.length === 0 ? (
                                        <p className="text-sm text-slate-500">
                                            {t('No siblings recorded for this student.')}
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {siblings.map((sibling) => (
                                                <Link
                                                    key={sibling.id}
                                                    href={`/students/${sibling.id}`}
                                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-slate-900">
                                                            {sibling.name}
                                                        </p>
                                                        <p className="mt-0.5 text-sm text-slate-500">
                                                            {sibling.admission_no || '-'}
                                                            {sibling.roll_number != null
                                                                ? ` · ${t('Roll No.')}${sibling.roll_number}`
                                                                : ''}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline">
                                                        {sibling.class || '-'}
                                                        {sibling.section ? `-${sibling.section}` : ''}
                                                    </Badge>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Address')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Residential Address')}</p>
                                            <p className="font-medium text-slate-900">
                                                {[student.address, student.city, student.state, student.pincode]
                                                    .filter(Boolean)
                                                    .join(', ') || '-'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Hostel Details')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <BedDouble className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Hostel Status')}</p>
                                            <p className="font-medium text-slate-900">
                                                {student.hostel_required
                                                    ? t('Hostel Required')
                                                    : t('No Hostel Assigned')}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Transport Details')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <BusFront className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Transport Status')}</p>
                                            <p className="font-medium text-slate-900">
                                                {student.transport_required
                                                    ? t('Transport Required')
                                                    : t('Transport Not Required')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Pickup Point')}</p>
                                            <p className="font-medium text-slate-900">
                                                {student.transport_required
                                                    ? student.transport_pickup_point || '-'
                                                    : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <BusFront className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Vehicle Details')}</p>
                                            <p className="font-medium text-slate-900">
                                                {student.transport_required ? student.transport_vehicle || '-' : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <BusFront className="mt-0.5 h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Route Details')}</p>
                                            <p className="font-medium text-slate-900">
                                                {student.transport_required
                                                    ? student.transport_route_details || '-'
                                                    : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
