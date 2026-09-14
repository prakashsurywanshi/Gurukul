import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { FilePlus2, FileSpreadsheet, FileText, Play, Power, Sheet, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

interface ModuleOption {
    value: string;
    label: string;
}

interface LabeledOption {
    value: string;
    label: string;
    isCurrent?: boolean;
}

interface SavedReport {
    id: string;
    name: string;
    module: string;
    filters: Record<string, string>;
    is_active: boolean;
    createdAt: string;
}

interface ReportBuilderProps {
    user: any;
    modules: ModuleOption[];
    classOptions: LabeledOption[];
    sessionOptions: LabeledOption[];
    semesterOptions: LabeledOption[];
    monthOptions: LabeledOption[];
    selectedSession: string;
    savedReports: SavedReport[];
}

const MODULE_LABELS: Record<string, string> = {
    students: 'Students',
    attendance: 'Attendance',
    fees: 'Fees',
    exams: 'Exams',
    library: 'Library',
    transport: 'Transport',
    hostel: 'Hostel',
    inventory: 'Inventory',
    'front-office': 'Front Office',
    communication: 'Communication',
    'lesson-plan': 'Lesson Plan',
    'human-resource': 'Human Resource',
    homework: 'Homework',
    alumni: 'Alumni',
    'activity-log': 'Activity Log',
    'audit-trail': 'Audit Trail',
};

export default function ReportBuilder({
    user,
    modules,
    classOptions,
    sessionOptions,
    semesterOptions,
    monthOptions,
    selectedSession,
    savedReports,
}: ReportBuilderProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};

    const [name, setName] = useState('');
    const [module, setModule] = useState<string>(modules[0]?.value ?? 'students');
    const [className, setClassName] = useState<string>('all');
    const [session, setSession] = useState<string>(selectedSession);
    const [semester, setSemester] = useState<string>('all');
    const [month, setMonth] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash.error, flash.success]);

    const buildQuery = (report: SavedReport): string => {
        const params = new URLSearchParams();
        params.set('saved_report_id', report.id);
        params.set('module', report.module);
        Object.entries(report.filters ?? {}).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
                params.set(key, String(value));
            }
        });
        return params.toString();
    };

    const save = () => {
        if (!name.trim()) {
            toast.error(t('Enter a name for the report.'));
            return;
        }
        setProcessing(true);
        const filters: Record<string, string> = {};
        if (className && className !== 'all') filters.class = className;
        if (session) filters.session = session;
        if (semester && semester !== 'all') filters.semester = semester;
        if (month && month !== 'all') filters.month = month;
        if (search.trim()) filters.search = search.trim();
        if (dateFrom) filters.date_from = dateFrom;
        if (dateTo) filters.date_to = dateTo;

        router.post(
            '/reports/builder',
            { name, module, filters },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(t('Saved report created.'));
                    setName('');
                    setSearch('');
                    setDateFrom('');
                    setDateTo('');
                },
                onError: () => toast.error(t('Failed to save report.')),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const run = (report: SavedReport) => {
        router.get(`/reports?${buildQuery(report)}`);
    };

    const exportPdf = (report: SavedReport) => {
        window.open(`/reports/export-pdf?${buildQuery(report)}`, '_blank');
    };

    const exportCsv = (report: SavedReport) => {
        window.open(`/reports/export-csv?${buildQuery(report)}`, '_blank');
    };

    const exportExcel = (report: SavedReport) => {
        window.open(`/reports/export-xlsx?${buildQuery(report)}`, '_blank');
    };

    const toggle = (report: SavedReport) => {
        router.patch(
            `/reports/builder/${report.id}/toggle`,
            { is_active: !report.is_active },
            { preserveScroll: true, preserveState: true },
        );
    };

    const remove = (report: SavedReport) => {
        if (!window.confirm(t('Delete this saved report?'))) return;
        router.delete(`/reports/builder/${report.id}`, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const filterSummary = (report: SavedReport): string => {
        const filters = report.filters ?? {};
        const parts: string[] = [];
        if (filters.class) {
            const option = classOptions.find((o) => o.value === filters.class);
            parts.push(option ? option.label : filters.class);
        }
        if (filters.session) {
            const option = sessionOptions.find((o) => o.value === filters.session);
            parts.push(option ? option.label : filters.session);
        }
        if (filters.semester) {
            const option = semesterOptions.find((o) => o.value === filters.semester);
            parts.push(option ? option.label : filters.semester);
        }
        if (filters.month) {
            const option = monthOptions.find((o) => o.value === filters.month);
            parts.push(option ? option.label : filters.month);
        }
        if (filters.search) parts.push(`"${filters.search}"`);
        return parts.length > 0 ? parts.join(', ') : t('All records');
    };

    return (
        <DashboardLayout user={user} activeTab="report-builder">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('Report Builder')}</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            {t('Save reusable report definitions with filters, then run or export them anytime.')}
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle>{t('Create report')}</CardTitle>
                                <CardDescription>{t('Define a report and its default filters.')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">{t('Report name')}</label>
                                    <Input
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder={t('Monthly fee collection summary')}
                                        className="bg-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">{t('Module')}</label>
                                    <Select value={module} onValueChange={setModule}>
                                        <SelectTrigger className="w-full bg-white">
                                            <SelectValue placeholder={t('Select module')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {modules.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">{t('Class')}</label>
                                        <Select value={className} onValueChange={setClassName}>
                                            <SelectTrigger className="w-full bg-white">
                                                <SelectValue placeholder={t('Select class')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Classes')}</SelectItem>
                                                {classOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">{t('Session')}</label>
                                        <Select value={session} onValueChange={setSession}>
                                            <SelectTrigger className="w-full bg-white">
                                                <SelectValue placeholder={t('Select session')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sessionOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                        {option.isCurrent ? ` ${t('(Current)')}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {semesterOptions.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">{t('Semester')}</label>
                                            <Select value={semester} onValueChange={setSemester}>
                                                <SelectTrigger className="w-full bg-white">
                                                    <SelectValue placeholder={t('Select semester')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">{t('All Semesters')}</SelectItem>
                                                    {semesterOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">{t('Month')}</label>
                                        <Select value={month} onValueChange={setMonth}>
                                            <SelectTrigger className="w-full bg-white">
                                                <SelectValue placeholder={t('Select month')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Months')}</SelectItem>
                                                {monthOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">{t('Search')}</label>
                                        <Input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder={t('Name, roll no...')}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">{t('Date from')}</label>
                                        <Input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(event) => setDateFrom(event.target.value)}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">{t('Date to')}</label>
                                        <Input
                                            type="date"
                                            value={dateTo}
                                            onChange={(event) => setDateTo(event.target.value)}
                                            className="bg-white"
                                        />
                                    </div>
                                </div>

                                <Button onClick={save} disabled={processing} className="w-full">
                                    <FilePlus2 className="mr-2 h-4 w-4" />
                                    {t('Save report')}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle>{t('Saved reports')}</CardTitle>
                                <CardDescription>
                                    {t('Run a report in the Reports Center, or export it as PDF or CSV.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {savedReports.length === 0 ? (
                                    <p className="py-10 text-center text-sm text-slate-500">
                                        {t('No saved reports yet. Create your first report on the left.')}
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {savedReports.map((report) => (
                                            <div key={report.id} className="flex flex-wrap items-center gap-3 py-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-sm font-semibold ${
                                                                report.is_active === false
                                                                    ? 'text-slate-400 line-through'
                                                                    : 'text-slate-800'
                                                            }`}
                                                        >
                                                            {report.name}
                                                        </span>
                                                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                                            {MODULE_LABELS[report.module] ?? report.module}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                                        {filterSummary(report)}
                                                        {' · '}
                                                        {report.createdAt}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="bg-white"
                                                        onClick={() => run(report)}
                                                        disabled={report.is_active === false}
                                                        title={t('Run')}
                                                    >
                                                        <Play className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="bg-white"
                                                        onClick={() => exportPdf(report)}
                                                        disabled={report.is_active === false}
                                                        title={t('Export PDF')}
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="bg-white"
                                                        onClick={() => exportCsv(report)}
                                                        disabled={report.is_active === false}
                                                        title={t('Export CSV')}
                                                    >
                                                        <FileSpreadsheet className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="bg-white"
                                                        onClick={() => exportExcel(report)}
                                                        disabled={report.is_active === false}
                                                        title={t('Export Excel')}
                                                    >
                                                        <Sheet className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="bg-white"
                                                        onClick={() => toggle(report)}
                                                        title={
                                                            report.is_active === false
                                                                ? t('Enable')
                                                                : t('Disable')
                                                        }
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        onClick={() => remove(report)}
                                                        title={t('Delete')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}