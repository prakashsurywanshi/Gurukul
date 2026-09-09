import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowRight, ArrowUpCircle, LogOut, Users } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';

interface StudentRecord {
    id: string;
    admission_no: string;
    first_name: string;
    last_name: string;
    class?: string | null;
    section?: string | null;
    roll_number?: string | null;
    status: string;
}

interface ClassRecord {
    id: number;
    name: string;
    section: string;
    session?: string | null;
    academic_year_id?: number | null;
}

interface PromoteStudentsProps {
    user: any;
    studentRecords: StudentRecord[];
    classRecords: ClassRecord[];
    sessions: string[];
}

const normalizeValue = (value?: string | null) =>
    String(value ?? '')
        .trim()
        .toLowerCase();

export default function PromoteStudents({ user, studentRecords, classRecords, sessions }: PromoteStudentsProps) {
    const { t } = useLanguage();
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const flash = page.props.flash ?? {};
    const [fromClass, setFromClass] = useState('');
    const [toClass, setToClass] = useState('');
    const [targetSession, setTargetSession] = useState(sessions[0] || '');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    useEffect(() => {
        if (!targetSession && sessions.length > 0) {
            setTargetSession(sessions[0]);
        }
    }, [sessions, targetSession]);

    const classOptions = useMemo(
        () =>
            Array.from(new Set(studentRecords.map((student) => String(student.class)).filter(Boolean))).sort(
                (left, right) => left.localeCompare(right, undefined, { numeric: true }),
            ),
        [studentRecords],
    );

    const sourceSections = useMemo(
        () =>
            Array.from(
                new Set(
                    studentRecords
                        .filter((student) => student.class === fromClass)
                        .map((student) => String(student.section ?? '').trim())
                        .filter(Boolean),
                ),
            ).sort(),
        [fromClass, studentRecords],
    );

    const sessionScopedClassRecords = useMemo(() => {
        if (!targetSession) {
            return classRecords;
        }

        return classRecords.filter(
            (schoolClass) => normalizeValue(schoolClass.session) === normalizeValue(targetSession),
        );
    }, [classRecords, targetSession]);

    const fallbackTemplateClassRecords = useMemo(() => {
        const preferredSource = classRecords.filter(
            (schoolClass) => !targetSession || normalizeValue(schoolClass.session) !== normalizeValue(targetSession),
        );

        const deduped = new Map<string, ClassRecord>();

        preferredSource.forEach((schoolClass) => {
            const key = `${schoolClass.name}::${schoolClass.section}`;
            if (!deduped.has(key)) {
                deduped.set(key, schoolClass);
            }
        });

        return Array.from(deduped.values()).sort((left, right) => {
            const nameComparison = left.name.localeCompare(right.name, undefined, { numeric: true });
            if (nameComparison !== 0) {
                return nameComparison;
            }

            return left.section.localeCompare(right.section);
        });
    }, [classRecords, targetSession]);

    const effectiveTargetClassRecords =
        sessionScopedClassRecords.length > 0 ? sessionScopedClassRecords : fallbackTemplateClassRecords;

    const targetClassOptions = useMemo(() => {
        const eligibleClassRecords =
            fromClass && sourceSections.length > 0
                ? effectiveTargetClassRecords.filter((schoolClass) =>
                      sourceSections.includes(String(schoolClass.section ?? '').trim()),
                  )
                : effectiveTargetClassRecords;

        return Array.from(new Set(eligibleClassRecords.map((schoolClass) => schoolClass.name))).sort((left, right) =>
            left.localeCompare(right, undefined, { numeric: true }),
        );
    }, [effectiveTargetClassRecords, fromClass, sourceSections]);

    const availableNextClassOptions = useMemo(() => {
        if (!fromClass) {
            return targetClassOptions;
        }

        const currentIndex = targetClassOptions.findIndex((className) => className === fromClass);

        if (currentIndex === -1) {
            return targetClassOptions;
        }

        return targetClassOptions.slice(currentIndex + 1);
    }, [fromClass, targetClassOptions]);

    const studentsToPromote = useMemo(
        () => studentRecords.filter((student) => student.class === fromClass),
        [fromClass, studentRecords],
    );

    const targetSectionsForSelectedClass = useMemo(
        () =>
            Array.from(
                new Set(
                    sessionScopedClassRecords
                        .filter((schoolClass) => schoolClass.name === toClass)
                        .map((schoolClass) => String(schoolClass.section ?? '').trim())
                        .filter(Boolean),
                ),
            ).sort(),
        [sessionScopedClassRecords, toClass],
    );

    const fallbackTargetSectionsForSelectedClass = useMemo(
        () =>
            Array.from(
                new Set(
                    fallbackTemplateClassRecords
                        .filter((schoolClass) => schoolClass.name === toClass)
                        .map((schoolClass) => String(schoolClass.section ?? '').trim())
                        .filter(Boolean),
                ),
            ).sort(),
        [fallbackTemplateClassRecords, toClass],
    );

    const displayedTargetSectionsForSelectedClass =
        targetSectionsForSelectedClass.length > 0
            ? targetSectionsForSelectedClass
            : fallbackTargetSectionsForSelectedClass;

    const allVisibleSelected = useMemo(
        () =>
            studentsToPromote.length > 0 &&
            studentsToPromote.every((student) => selectedStudentIds.includes(student.id)),
        [selectedStudentIds, studentsToPromote],
    );

    useEffect(() => {
        setSelectedStudentIds((current) =>
            current.filter((studentId) => studentsToPromote.some((student) => student.id === studentId)),
        );
    }, [studentsToPromote]);

    useEffect(() => {
        if (toClass && !availableNextClassOptions.includes(toClass)) {
            setToClass('');
        }
    }, [availableNextClassOptions, toClass]);

    const toggleStudent = (studentId: string) => {
        setSelectedStudentIds((current) =>
            current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId],
        );
    };

    const toggleAllVisible = () => {
        if (allVisibleSelected) {
            setSelectedStudentIds((current) =>
                current.filter((id) => !studentsToPromote.some((student) => student.id === id)),
            );
            return;
        }

        setSelectedStudentIds((current) =>
            Array.from(new Set([...current, ...studentsToPromote.map((student) => student.id)])),
        );
    };

    const handlePromote = () => {
        if (!fromClass || !toClass || !targetSession || selectedStudentIds.length === 0) {
            toast.error('Select classes, session, and at least one student first');
            return;
        }

        router.post(
            '/promote-students/promote',
            {
                from_class: fromClass,
                to_class: toClass,
                target_session: targetSession,
                student_ids: selectedStudentIds.map((id) => Number(id)),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedStudentIds([]);
                    setToClass('');
                },
            },
        );
    };

    const handleLeaveSchool = () => {
        if (selectedStudentIds.length === 0) {
            toast.error('Select at least one student to save to alumni');
            return;
        }

        if (!targetSession) {
            toast.error('Select the target alumni session first');
            return;
        }

        const selectedStudents = studentsToPromote.filter((student) => selectedStudentIds.includes(student.id));

        if (
            !window.confirm(
                `Save ${selectedStudents.length} selected student${selectedStudents.length === 1 ? '' : 's'} to alumni for session ${targetSession}?`,
            )
        ) {
            return;
        }

        router.post(
            '/promote-students/alumni',
            {
                from_class: fromClass,
                target_session: targetSession,
                student_ids: selectedStudentIds.map((id) => Number(id)),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedStudentIds([]);
                },
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="promote-students">
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div className="overflow-x-auto">
                        <h1 className="text-3xl font-bold text-slate-900">{t('Promote Students')}</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            {t('Move students from one class to the next academic class in a single action.')}
                        </p>
                    </div>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle>{t('Promotion Setup')}</CardTitle>
                            <CardDescription>
                                {t(
                                    'Select a class, choose students, then promote them or save them to alumni for the selected session.',
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-end gap-4 overflow-x-auto pb-1">
                                <div className="min-w-[220px] space-y-2">
                                    <Label>{t('From Class')}</Label>
                                    <Select value={fromClass} onValueChange={setFromClass}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select current class')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classOptions.map((className) => (
                                                <SelectItem key={className} value={className}>
                                                    {className}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex shrink-0 items-end justify-center pb-2 text-slate-400">
                                    <ArrowRight className="h-5 w-5" />
                                </div>

                                <div className="min-w-[220px] space-y-2">
                                    <Label>{t('To Class')}</Label>
                                    <Select value={toClass} onValueChange={setToClass} disabled={!fromClass}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select next class')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableNextClassOptions.map((className) => (
                                                <SelectItem key={className} value={className}>
                                                    {className}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fromClass && availableNextClassOptions.length === 0 ? (
                                        <p className="text-xs text-slate-500">
                                            {t(
                                                'No higher class is available in the selected target session. Create those classes first if needed.',
                                            )}
                                        </p>
                                    ) : null}
                                    {toClass && displayedTargetSectionsForSelectedClass.length > 0 ? (
                                        <p className="text-xs text-slate-500">
                                            {t('Available sections in')}
                                            {targetSession}: {displayedTargetSectionsForSelectedClass.join(', ')}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="min-w-[240px] space-y-2">
                                    <Label>{t('Enroll Into Session')}</Label>
                                    <Select value={targetSession} onValueChange={setTargetSession}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select target session')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sessions.map((session) => (
                                                <SelectItem key={session} value={session}>
                                                    {session}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {targetSession && (
                                        <p className="text-xs text-slate-500">
                                            {sessionScopedClassRecords.length > 0
                                                ? `${sessionScopedClassRecords.length} class / section record${sessionScopedClassRecords.length === 1 ? '' : 's'} found in this session`
                                                : fallbackTemplateClassRecords.length > 0
                                                  ? `No saved class / section records found in this session yet. Showing ${fallbackTemplateClassRecords.length} template record${fallbackTemplateClassRecords.length === 1 ? '' : 's'} from existing sessions.`
                                                  : t('No class / section records found in this session')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        {t('Selected From')}
                                    </p>
                                    <p className="mt-2 text-lg font-semibold text-slate-900">
                                        {fromClass ? `${fromClass}` : t('Not selected')}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        {t('Selected To')}
                                    </p>
                                    <p className="mt-2 text-lg font-semibold text-slate-900">
                                        {toClass ? `${toClass}` : t('Not selected')}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        {t('Selected Students')}
                                    </p>
                                    <p className="mt-2 text-lg font-semibold text-slate-900">
                                        {selectedStudentIds.length}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        {t('Target Session')}
                                    </p>
                                    <p className="mt-2 text-lg font-semibold text-slate-900">
                                        {targetSession || t('Not selected')}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white">
                                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">
                                            {t('Students In Selected Class')}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            {t(
                                                'Choose one or more students for promotion or session-wise alumni saving.',
                                            )}
                                        </p>
                                    </div>
                                    <Badge variant="outline">
                                        {studentsToPromote.length}
                                        {t('total')}
                                    </Badge>
                                </div>

                                {studentsToPromote.length === 0 ? (
                                    <div className="px-4 py-10 text-center text-sm text-slate-500">
                                        {t(
                                            'Select a class to view students available for promotion or alumni transfer.',
                                        )}
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
                                                    <TableHead>{t('Admission No.')}</TableHead>
                                                    <TableHead>{t('Name')}</TableHead>
                                                    <TableHead>{t('Section')}</TableHead>
                                                    <TableHead>{t('Roll Number')}</TableHead>
                                                    <TableHead>{t('Status')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {studentsToPromote.map((student) => (
                                                    <TableRow key={student.id}>
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={selectedStudentIds.includes(student.id)}
                                                                onCheckedChange={() => toggleStudent(student.id)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {student.admission_no}
                                                        </TableCell>
                                                        <TableCell>
                                                            {student.first_name} {student.last_name}
                                                        </TableCell>
                                                        <TableCell>{student.section || t('N/A')}</TableCell>
                                                        <TableCell>{student.roll_number || t('N/A')}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{t(student.status)}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                <div className="flex items-center gap-2 text-blue-700">
                                    <Users className="h-4 w-4" />
                                    <span className="text-sm font-semibold">{t('Promotion Summary')}</span>
                                </div>
                                <p className="mt-2 text-sm text-blue-900">
                                    {fromClass && toClass && targetSession
                                        ? `${selectedStudentIds.length || 0} selected student${selectedStudentIds.length === 1 ? '' : 's'} will be promoted from ${fromClass} to ${toClass} and enrolled in session ${targetSession}.`
                                        : t(
                                              'Choose classes, a session, and at least one student to review the promotion summary.',
                                          )}
                                </p>
                                <p className="mt-2 text-sm text-blue-900">
                                    {fromClass && targetSession
                                        ? `${selectedStudentIds.length || 0} selected student${selectedStudentIds.length === 1 ? '' : 's'} can also be saved to alumni for session ${targetSession} without removing them from current students.`
                                        : t(
                                              'Leaving school also uses the selected session so alumni records stay session-wise.',
                                          )}
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                                    disabled={!fromClass || !targetSession || selectedStudentIds.length === 0}
                                    onClick={handleLeaveSchool}
                                >
                                    <LogOut className="h-4 w-4" />
                                    {t('Save To Alumni')}
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-blue-600 text-white hover:bg-blue-700"
                                    disabled={
                                        !fromClass || !toClass || !targetSession || selectedStudentIds.length === 0
                                    }
                                    onClick={handlePromote}
                                >
                                    <ArrowUpCircle className="h-4 w-4" />
                                    {t('Promote Selected Students')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
