import { useLanguage } from '../../../i18n/LanguageProvider';
import { useState } from 'react';
import { ArchiveRestore, RefreshCw, Search, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';

interface TrashedStudent {
    id: string;
    admission_no: string | null;
    first_name: string;
    middle_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    gender: string | null;
    class: string | null;
    section: string | null;
    deleted_at: string | null;
}

interface RecycleBinProps {
    user: any;
    students: TrashedStudent[];
    classRecords: { id: number; name: string; section: string }[];
}

export default function RecycleBin({ user, students }: RecycleBinProps) {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');

    const filtered = students.filter((student) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [student.first_name, student.middle_name, student.last_name, student.admission_no, student.class]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    const fullName = (student: TrashedStudent) =>
        [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ');

    return (
        <DashboardLayout user={user} activeTab="students-recycle-bin">
            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        {t('Students Recycle Bin')}<span className="sr-only">{t('Students Recycle Bin')}</span>
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">{t('Restore wrongly deleted students or permanently remove them.')}</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4 text-slate-400" />{t('Deleted Students (')}{filtered.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t('Search by name, admission no or class...')}
                                className="pl-9"
                            />
                        </div>

                        {filtered.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Student')}</TableHead>
                                            <TableHead>{t('Admission No')}</TableHead>
                                            <TableHead>{t('Class')}</TableHead>
                                            <TableHead>{t('Phone')}</TableHead>
                                            <TableHead>{t('Deleted At')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-slate-900">
                                                            {fullName(student)}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{student.email ?? '—'}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{student.admission_no ?? '—'}</Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-600">
                                                    {student.class
                                                        ? `${student.class}${student.section ? ` - ${student.section}` : ''}`
                                                        : '—'}
                                                </TableCell>
                                                <TableCell className="text-slate-600">{student.phone ?? '—'}</TableCell>
                                                <TableCell className="text-slate-500">
                                                    {student.deleted_at ?? '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-emerald-600 hover:text-emerald-700"
                                                            onClick={() =>
                                                                router.post(
                                                                    `/students-recycle-bin/${student.id}/restore`,
                                                                )
                                                            }
                                                        >
                                                            <ArchiveRestore className="h-4 w-4" />
                                                            {t('Restore')}</Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-rose-600 hover:text-rose-700"
                                                            onClick={() =>
                                                                router.delete(`/students-recycle-bin/${student.id}`, {
                                                                    onBefore: () =>
                                                                        confirm(
                                                                            `Permanently delete ${fullName(student)}? This cannot be undone.`,
                                                                        ),
                                                                })
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            {t('Delete')}</Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                                <RefreshCw className="h-8 w-8 text-slate-300" />
                                <p className="mt-3 text-sm font-medium text-slate-600">{t('Recycle bin is empty')}</p>
                                <p className="mt-1 text-sm text-slate-400">{t('Deleted students will appear here until then.')}{t('no_records_found')}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
