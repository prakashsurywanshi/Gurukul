import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Save, Users } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface TeacherOption {
    id: number;
    name: string;
}

interface ClassRow {
    id: number;
    name: string;
    section: string;
    roomNumber: string;
    studentsCount: number;
    teacherId: number | null;
    teacherName: string | null;
}

export default function AssignClassTeacher({
    user,
    classes,
    teachers,
    academicYearLabel,
}: {
    user: any;
    classes: ClassRow[];
    teachers: TeacherOption[];
    academicYearLabel: string | null;
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [assignments, setAssignments] = useState<Record<number, string>>(() =>
        Object.fromEntries(
            classes.map((schoolClass) => [
                schoolClass.id,
                schoolClass.teacherId ? String(schoolClass.teacherId) : 'none',
            ]),
        ),
    );
    const [processing, setProcessing] = useState<number | null>(null);

    useEffect(() => {
        setAssignments(
            Object.fromEntries(
                classes.map((schoolClass) => [
                    schoolClass.id,
                    schoolClass.teacherId ? String(schoolClass.teacherId) : 'none',
                ]),
            ),
        );
    }, [classes]);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const saveRow = (schoolClass: ClassRow) => {
        setProcessing(schoolClass.id);
        router.post(
            '/assign-class-teacher',
            {
                class_id: schoolClass.id,
                teacher_id:
                    !assignments[schoolClass.id] || assignments[schoolClass.id] === 'none'
                        ? null
                        : Number(assignments[schoolClass.id]),
            },
            {
                preserveScroll: true,
                onError: () => toast.error(`Failed to save ${schoolClass.name}-${schoolClass.section}.`),
                onFinish: () => setProcessing(null),
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="assign-class-teacher">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('Assign Class Teacher')}</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            {t('Assign a class teacher for each class of the current session.')}
                            {academicYearLabel ? ` ${t('Session')}: ${academicYearLabel}` : ''}
                        </p>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('Classes')}</CardTitle>
                            <CardDescription>{t('Pick a teacher for each active class and save.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {classes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                                    <Users className="h-8 w-8 text-slate-400" />
                                    <p className="text-sm text-slate-500">
                                        {t('No active classes in the current session.')}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>{t('Class')}</TableHead>
                                                <TableHead>{t('Room')}</TableHead>
                                                <TableHead>{t('Students')}</TableHead>
                                                <TableHead className="min-w-[220px]">{t('Class Teacher')}</TableHead>
                                                <TableHead className="text-right">{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {classes.map((schoolClass, index) => (
                                                <TableRow key={schoolClass.id}>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-slate-800">
                                                                {schoolClass.name}-{schoolClass.section}
                                                            </span>
                                                            {schoolClass.teacherName ? (
                                                                <Badge
                                                                    className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                                                    title={schoolClass.teacherName}
                                                                >
                                                                    {t('Assigned')}
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {schoolClass.roomNumber || (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {schoolClass.studentsCount}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={assignments[schoolClass.id] ?? 'none'}
                                                            onValueChange={(value) =>
                                                                setAssignments((current) => ({
                                                                    ...current,
                                                                    [schoolClass.id]: value,
                                                                }))
                                                            }
                                                        >
                                                            <SelectTrigger id={`teacher-${schoolClass.id}`}>
                                                                <SelectValue placeholder={t('Select teacher')} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem key="none" value="none">
                                                                    {t('No teacher')}
                                                                </SelectItem>
                                                                {teachers.map((teacher) => (
                                                                    <SelectItem
                                                                        key={teacher.id}
                                                                        value={String(teacher.id)}
                                                                    >
                                                                        {teacher.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end">
                                                            <Button
                                                                size="sm"
                                                                className="gap-1.5"
                                                                disabled={processing === schoolClass.id}
                                                                onClick={() => saveRow(schoolClass)}
                                                            >
                                                                <Save className="h-3.5 w-3.5" />
                                                                {processing === schoolClass.id
                                                                    ? t('Saving...')
                                                                    : t('Save')}
                                                            </Button>
                                                        </div>
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
