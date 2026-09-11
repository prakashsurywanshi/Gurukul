import { FormEvent, useState } from 'react';
import { Activity, Filter, Plus, Search } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface StudentOption {
    id: number;
    first_name: string;
    last_name: string;
}

interface HpcActivityRecord {
    id: number;
    category: string;
    title: string;
    description?: string | null;
    rating?: string | null;
    teacher_remark?: string | null;
    occurred_at?: string | null;
    student?: { id: number; first_name: string; last_name: string } | null;
}

interface HpcActivitiesProps {
    user: any;
    activities: HpcActivityRecord[];
    students: StudentOption[];
    filters: { category: string };
}

const CATEGORY_BADGE: Record<string, string> = {
    academic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    co_curricular: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    conduct: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    sports: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
};

export default function HpcActivities(pageProps: HpcActivitiesProps) {
    const { user, activities, students, filters } = pageProps;
    const { t } = useLanguage();

    const [showForm, setShowForm] = useState(false);
    const [studentId, setStudentId] = useState('');
    const [category, setCategory] = useState('academic');
    const [title, setTitle] = useState('');
    const [rating, setRating] = useState('');
    const [remark, setRemark] = useState('');
    const [search, setSearch] = useState('');

    const submit = (e: FormEvent) => {
        e.preventDefault();
        router.post('/hpc/activities', {
            student_id: Number(studentId),
            category,
            title,
            rating: rating ? Number(rating) : null,
            teacher_remark: remark || null,
        });
        setShowForm(false);
        setStudentId('');
        setTitle('');
        setRating('');
        setRemark('');
    };

    const setCategoryFilter = (value: string) => {
        router.get('/hpc/activities', value ? { category: value } : {}, { preserveState: true });
    };

    const filtered = activities.filter((a) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            a.title.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q) ||
            `${a.student?.first_name ?? ''} ${a.student?.last_name ?? ''}`.toLowerCase().includes(q)
        );
    });

    return (
        <DashboardLayout user={user}>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">{t('hpc.activitiesTitle')}</h1>
                    <Button onClick={() => setShowForm((v) => !v)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('hpc.recordActivity')}
                    </Button>
                </div>

                {showForm && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('hpc.recordActivityTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>{t('hpc.student')}</Label>
                                    <select
                                        value={studentId}
                                        onChange={(e) => setStudentId(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                        required
                                    >
                                        <option value="">{t('hpc.selectStudent')}</option>
                                        {students.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.first_name} {s.last_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label>{t('hpc.category')}</Label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                    >
                                        <option value="academic">Academic</option>
                                        <option value="co_curricular">Co-curricular</option>
                                        <option value="conduct">Conduct</option>
                                        <option value="sports">Sports</option>
                                    </select>
                                </div>
                                <div>
                                    <Label>{t('hpc.activityTitle')}</Label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="mt-1"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>{t('hpc.rating')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                        value={rating}
                                        onChange={(e) => setRating(e.target.value)}
                                        className="mt-1"
                                        placeholder="0–5"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label>{t('hpc.teacherRemark')}</Label>
                                    <Input
                                        value={remark}
                                        onChange={(e) => setRemark(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Button type="submit">
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t('hpc.saveActivity')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                {t('hpc.activitiesList')}
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 rounded-lg border px-2 py-1 text-sm">
                                    <Filter className="h-4 w-4 text-gray-400" />
                                    <select
                                        value={filters.category}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="bg-transparent text-sm dark:text-white focus:outline-none"
                                    >
                                        <option value="">{t('hpc.allCategories')}</option>
                                        <option value="academic">Academic</option>
                                        <option value="co_curricular">Co-curricular</option>
                                        <option value="conduct">Conduct</option>
                                        <option value="sports">Sports</option>
                                    </select>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        placeholder={t('hpc.searchActivities')}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9 w-64"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Activity className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                <p className="mt-4 text-sm font-medium dark:text-white">{t('hpc.noActivities')}</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('hpc.student')}</TableHead>
                                        <TableHead>{t('hpc.category')}</TableHead>
                                        <TableHead>{t('hpc.title')}</TableHead>
                                        <TableHead>{t('hpc.rating')}</TableHead>
                                        <TableHead>{t('hpc.teacherRemark')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((activity) => (
                                        <TableRow key={activity.id}>
                                            <TableCell className="font-medium dark:text-white">
                                                {activity.student
                                                    ? `${activity.student.first_name} ${activity.student.last_name}`
                                                    : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        CATEGORY_BADGE[activity.category] ??
                                                        'bg-gray-100 dark:bg-gray-800'
                                                    }
                                                >
                                                    {t('hpc.cat.' + activity.category)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{activity.title}</TableCell>
                                            <TableCell>{activity.rating ?? '—'}</TableCell>
                                            <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                                                {activity.teacher_remark ?? '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
