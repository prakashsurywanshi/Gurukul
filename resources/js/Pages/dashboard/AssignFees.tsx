import { FormEvent, useMemo, useState } from 'react';
import { CheckCircle2, IndianRupee, ListFilter, Search, UserCheck, Users, X } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface Student {
    id: string | number;
    first_name: string;
    last_name: string;
    admission_no?: string;
    class?: string;
    section?: string;
}

interface FeeStructure {
    id: string;
    class?: string;
    section?: string;
    feeType: string;
    amount: number;
    frequency: string;
    description?: string;
}

interface ClassRecord {
    id: number;
    name: string;
    section?: string | null;
}

interface AssignFeesProps {
    user: any;
    students: Student[];
    classRecords: ClassRecord[];
    feeStructures: FeeStructure[];
    studentFeeRecords: any[];
}

export default function AssignFees(pageProps: AssignFeesProps) {
    const { user, students, classRecords, feeStructures } = pageProps;
    const { t } = useLanguage();

    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedFeeId, setSelectedFeeId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const selectedFee = feeStructures.find((f) => f.id === selectedFeeId);
    const selectedClass = classRecords.find((c) => String(c.id) === selectedClassId);

    const filteredStudents = useMemo(() => {
        const classStudents = students.filter((s) => {
            if (!selectedClass) return true;
            const matchName = s.class === selectedClass.name;
            const matchSection = !selectedClass.section || s.section === selectedClass.section;
            return matchName && matchSection;
        });
        if (!search) return classStudents;
        const q = search.toLowerCase();
        return classStudents.filter(
            (s) =>
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.admission_no?.toLowerCase().includes(q),
        );
    }, [students, selectedClass, search]);

    const classFeeStructures = useMemo(() => {
        if (!selectedClass) return feeStructures;
        return feeStructures.filter(
            (f) => f.class === selectedClass.name && (!selectedClass.section || f.section === selectedClass.section),
        );
    }, [feeStructures, selectedClass]);

    const toggleStudent = (id: string | number) => {
        const sid = String(id);
        setSelectedStudentIds((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));
    };

    const toggleAll = () => {
        const allIds = filteredStudents.map((s) => String(s.id));
        const allSelected = allIds.length > 0 && allIds.every((id) => selectedStudentIds.includes(id));
        setSelectedStudentIds(allSelected ? [] : allIds);
    };

    const resetForm = () => {
        setSelectedClassId('');
        setSelectedFeeId('');
        setDueDate('');
        setSelectedStudentIds([]);
        setSearch('');
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!selectedFee || !dueDate || selectedStudentIds.length === 0) return;
        setSubmitting(true);
        router.post(
            '/fees/assign',
            {
                feeType: Number(selectedFee.id),
                dueDate,
                studentIds: selectedStudentIds.map(Number),
            },
            {
                onFinish: () => setSubmitting(false),
                onSuccess: () => resetForm(),
            },
        );
    };

    return (
        <DashboardLayout user={user}>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">{t('assignFees.title')}</h1>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ListFilter className="h-5 w-5" />
                                {t('assignFees.filters')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label>{t('assignFees.classSection')}</Label>
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => {
                                            setSelectedClassId(e.target.value);
                                            setSelectedFeeId('');
                                            setSelectedStudentIds([]);
                                        }}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                    >
                                        <option value="">{t('assignFees.allClasses')}</option>
                                        {classRecords.map((c) => (
                                            <option key={c.id} value={String(c.id)}>
                                                {c.name} {c.section ? `- ${c.section}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <Label>{t('assignFees.feeStructure')}</Label>
                                    <select
                                        value={selectedFeeId}
                                        onChange={(e) => setSelectedFeeId(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                        required
                                    >
                                        <option value="">{t('assignFees.selectFee')}</option>
                                        {classFeeStructures.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.feeType} — ₹{f.amount} ({f.frequency})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <Label>{t('assignFees.dueDate')}</Label>
                                    <Input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="mt-1"
                                        required
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                        <span>
                                            {t('assignFees.studentsSelected', { count: selectedStudentIds.length })}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={toggleAll}
                                            className="text-primary hover:underline"
                                        >
                                            {t('assignFees.selectAll')}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        type="submit"
                                        disabled={
                                            !selectedFee || !dueDate || selectedStudentIds.length === 0 || submitting
                                        }
                                    >
                                        <UserCheck className="h-4 w-4 mr-2" />
                                        {submitting ? t('assignFees.assigning') : t('assignFees.assignNow')}
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={resetForm}>
                                        <X className="h-4 w-4 mr-2" />
                                        {t('assignFees.clear')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    {t('assignFees.availableStudents', { count: filteredStudents.length })}
                                </CardTitle>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        placeholder={t('assignFees.searchStudents')}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9 w-64"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredStudents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Users className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                    <p className="mt-4 text-sm font-medium dark:text-white">
                                        {t('assignFees.noStudents')}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {t('assignFees.selectClassHint')}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            filteredStudents.length > 0 &&
                                                            filteredStudents.every((s) =>
                                                                selectedStudentIds.includes(String(s.id)),
                                                            )
                                                        }
                                                        onChange={toggleAll}
                                                        className="h-4 w-4"
                                                    />
                                                </TableHead>
                                                <TableHead>{t('assignFees.name')}</TableHead>
                                                <TableHead>{t('assignFees.admNo')}</TableHead>
                                                <TableHead>{t('assignFees.classCol')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredStudents.map((student) => (
                                                <TableRow
                                                    key={student.id}
                                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                                    onClick={() => toggleStudent(student.id)}
                                                >
                                                    <TableCell>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedStudentIds.includes(String(student.id))}
                                                            onChange={() => toggleStudent(student.id)}
                                                            className="h-4 w-4"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium dark:text-white">
                                                        {student.first_name} {student.last_name}
                                                    </TableCell>
                                                    <TableCell>{student.admission_no ?? '—'}</TableCell>
                                                    <TableCell>
                                                        {student.class}
                                                        {student.section ? ` - ${student.section}` : ''}
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

                {selectedFee && selectedStudentIds.length > 0 && (
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-6 flex items-center gap-4">
                            <CheckCircle2 className="h-8 w-8 text-primary" />
                            <div>
                                <p className="font-semibold dark:text-white">
                                    {t('assignFees.summary', {
                                        count: selectedStudentIds.length,
                                        type: selectedFee.feeType,
                                        amount: selectedFee.amount,
                                    })}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('assignFees.summaryHint')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
