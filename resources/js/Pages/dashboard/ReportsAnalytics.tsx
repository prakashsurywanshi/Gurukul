import { useLanguage } from '../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    BarChart3,
    BookOpen,
    CalendarCheck,
    CalendarDays,
    DollarSign,
    Download,
    FileSpreadsheet,
    FileText,
    Library,
    Search,
    TrendingUp,
    Users,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, XAxis, YAxis } from 'recharts';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

type ModuleStat = {
    label: string;
    value: string;
};

type ModuleReport = {
    id: string;
    label: string;
    description: string;
    columns: string[];
    stats: ModuleStat[];
    rows: string[][];
    pagination?: {
        currentPage: number;
        lastPage: number;
        total: number;
        perPage: number;
    };
};

type Metrics = {
    totalStudents: number;
    attendanceRate: number;
    feeCollected: number;
    feeCollectionRate: number;
    libraryBooks: number;
    libraryIssued: number;
};

type AttendanceDatum = {
    month: string;
    present: number;
    absent: number;
};

type FeeCollectionDatum = {
    month: string;
    collected: number;
    pending: number;
};

type StudentDistributionDatum = {
    class: string;
    students: number;
    color: string;
};

type ExamPerformanceDatum = {
    subject: string;
    average: number;
};

interface ReportsAnalyticsProps {
    user: any;
    accessToken?: string;
    classOptions: { id: number; name: string; section: string }[];
    sessionOptions: { value: string; label: string; isCurrent: boolean }[];
    monthOptions: { value: string; label: string }[];
    selectedFilters: {
        class: string;
        month: string;
        session: string;
        module: string;
        search: string;
    };
    moduleReports: ModuleReport[];
    metrics: Metrics;
    attendanceData: AttendanceDatum[];
    feeCollectionData: FeeCollectionDatum[];
    studentDistribution: StudentDistributionDatum[];
    examPerformance: ExamPerformanceDatum[];
}

const escapeCsvCell = (value: string | number) => {
    const text = String(value ?? '').replace(/"/g, '""');
    return /[",\n]/.test(text) ? `"${text}"` : text;
};

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
    const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const exportPdf = (title: string, headers: string[], rows: string[][]) => {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');

    if (!printWindow) {
        toast.error('Unable to open print window for PDF export');
        return;
    }

    const headerHtml = headers.map((header) => `<th>${header}</th>`).join('');
    const rowHtml = rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('');

    printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          p { margin: 0 0 20px; color: #475569; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #eff6ff; }
          tr:nth-child(even) td { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated from the Reports module</p>
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowHtml}</tbody>
        </table>
      </body>
    </html>
  `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};

const attendanceChartConfig = {
    present: { label: 'Present', color: '#3b82f6' },
    absent: { label: 'Absent', color: '#ef4444' },
} satisfies ChartConfig;

const feeChartConfig = {
    collected: { label: 'Collected', color: '#22c55e' },
    pending: { label: 'Pending', color: '#f59e0b' },
} satisfies ChartConfig;

const examChartConfig = {
    average: { label: 'Average', color: '#6366f1' },
} satisfies ChartConfig;

const kpiIcons = {
    totalStudents: Users,
    attendanceRate: TrendingUp,
    feeCollected: DollarSign,
    feeCollectionRate: BarChart3,
    libraryBooks: BookOpen,
    libraryIssued: Library,
};

const kpiColors = {
    totalStudents: 'bg-blue-50 text-blue-600',
    attendanceRate: 'bg-emerald-50 text-emerald-600',
    feeCollected: 'bg-amber-50 text-amber-600',
    feeCollectionRate: 'bg-indigo-50 text-indigo-600',
    libraryBooks: 'bg-purple-50 text-purple-600',
    libraryIssued: 'bg-rose-50 text-rose-600',
};

export default function ReportsAnalytics({
    user,
    accessToken,
    classOptions,
    sessionOptions,
    monthOptions,
    selectedFilters,
    moduleReports,
    metrics,
    attendanceData,
    feeCollectionData,
    studentDistribution,
    examPerformance,
}: ReportsAnalyticsProps) {
    const { t } = useLanguage();
    const initialClassName = useMemo(
        () => classOptions.find((c) => String(c.id) === selectedFilters.class)?.name ?? '',
        [classOptions, selectedFilters.class],
    );
    const initialSection = useMemo(
        () => classOptions.find((c) => String(c.id) === selectedFilters.class)?.section ?? '',
        [classOptions, selectedFilters.class],
    );

    const [selectedClassName, setSelectedClassName] = useState(initialClassName);
    const [selectedSection, setSelectedSection] = useState(initialSection);
    const [selectedMonth, setSelectedMonth] = useState(selectedFilters.month);
    const [selectedSession, setSelectedSession] = useState(selectedFilters.session);
    const [activeModule, setActiveModule] = useState(selectedFilters.module || 'overview');
    const [searchQuery, setSearchQuery] = useState(selectedFilters.search || '');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateRangeOpen, setDateRangeOpen] = useState(false);

    const selectedMonthLabel = monthOptions.find((option) => option.value === selectedMonth)?.label || selectedMonth;
    const selectedSessionOption = sessionOptions.find((option) => option.value === selectedSession);

    const uniqueClassNames = useMemo(
        () => [...new Set(classOptions.map((c) => c.name))].sort((a, b) => Number(a) - Number(b)),
        [classOptions],
    );

    const sectionsForClass = useMemo(
        () =>
            selectedClassName
                ? [...new Set(classOptions.filter((c) => c.name === selectedClassName).map((c) => c.section))].sort()
                : [],
        [classOptions, selectedClassName],
    );

    const selectedClassId = useMemo(() => {
        const match = classOptions.find((c) => c.name === selectedClassName && c.section === selectedSection);
        return match ? String(match.id) : 'all';
    }, [classOptions, selectedClassName, selectedSection]);

    useEffect(() => {
        if (sectionsForClass.length > 0 && !sectionsForClass.includes(selectedSection)) {
            setSelectedSection(sectionsForClass[0]);
        }
    }, [sectionsForClass, selectedSection]);

    const classFilterInitialized = useRef(false);

    useEffect(() => {
        if (!classFilterInitialized.current) {
            classFilterInitialized.current = true;
            return;
        }

        if (selectedClassId !== selectedFilters.class) {
            router.get(
                '/reports',
                {
                    class: selectedClassId,
                    month: selectedMonth,
                    session: selectedSession,
                    module: activeModule,
                    search: searchQuery || undefined,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                },
            );
        }
    }, [selectedClassId]);

    const activeReport = useMemo(
        () => moduleReports.find((module) => module.id === activeModule) ?? moduleReports[0],
        [activeModule, moduleReports],
    );

    const applyFilters = (nextMonth: string, nextSession: string, nextModule = activeModule) => {
        setSelectedMonth(nextMonth);
        setSelectedSession(nextSession);
        setActiveModule(nextModule);

        router.get(
            '/reports',
            {
                class: selectedClassId,
                month: nextMonth,
                session: nextSession,
                module: nextModule,
                search: searchQuery || undefined,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const handleModuleChange = (nextModule: string) => {
        setActiveModule(nextModule);
        router.get(
            '/reports',
            {
                class: selectedClassId,
                month: selectedMonth,
                session: selectedSession,
                module: nextModule,
                search: searchQuery || undefined,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const handlePageChange = (page: number) => {
        router.get(
            '/reports',
            {
                class: selectedClassId,
                month: selectedMonth,
                session: selectedSession,
                module: activeModule,
                search: searchQuery || undefined,
                page,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const handleSearch = () => {
        router.get(
            '/reports',
            {
                class: selectedClassId,
                month: selectedMonth,
                session: selectedSession,
                module: activeModule,
                search: searchQuery || undefined,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const exportModuleCsv = (module: ModuleReport) => {
        downloadCsv(`${module.id}-report-${selectedSessionOption?.label || selectedSession}-${selectedMonth}.csv`, [
            module.columns,
            ...module.rows,
        ]);
        toast.success(`${module.label} CSV exported successfully`);
    };

    const exportModulePdf = (module: ModuleReport) => {
        const params = new URLSearchParams({
            module: module.id,
            class: selectedClassId,
            month: selectedMonth,
            session: selectedSession,
        });
        if (searchQuery) params.set('search', searchQuery);

        window.location.href = `/reports/export-pdf?${params.toString()}`;
        toast.success(`${module.label} PDF export started`);
    };

    const exportModuleExcel = (module: ModuleReport) => {
        const params = new URLSearchParams({
            module: module.id,
            class: selectedClassId,
            month: selectedMonth,
            session: selectedSession,
        });
        if (searchQuery) params.set('search', searchQuery);

        window.location.href = `/reports/export-xlsx?${params.toString()}`;
        toast.success(`${module.label} Excel export started`);
    };

    const handleSetCurrentSession = () => {
        if (!selectedSessionOption || selectedSessionOption.isCurrent) {
            return;
        }

        router.patch(
            `/reports/sessions/${selectedSession}/activate`,
            {},
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    return (
        <DashboardLayout user={user} activeTab="reports" onLogout={() => {}} accessToken={accessToken}>
            <div className="space-y-6 p-8">
                <div className="flex flex-col items-start gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-2 text-left">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Reports Center')}</h1>
                            <p className="mt-1 text-slate-600">
                                {t('Select a report type to review records and export report tables.')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('Search records...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSearch();
                                }}
                                className="h-10 w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <Select
                            value={selectedClassName || '__all__'}
                            onValueChange={(value) => {
                                setSelectedClassName(value === '__all__' ? '' : value);
                            }}
                        >
                            <SelectTrigger className="w-40 bg-white">
                                <SelectValue placeholder={t('Select class')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">{t('All Classes')}</SelectItem>
                                {uniqueClassNames.map((name) => (
                                    <SelectItem key={name} value={name}>
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedSection}
                            onValueChange={(value) => {
                                setSelectedSection(value);
                            }}
                            disabled={!selectedClassName || sectionsForClass.length === 0}
                        >
                            <SelectTrigger className="w-36 bg-white">
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

                        <Select value={selectedSession} onValueChange={(value) => applyFilters(selectedMonth, value)}>
                            <SelectTrigger className="w-48 bg-white">
                                <SelectValue placeholder={t('Select session')} />
                            </SelectTrigger>
                            <SelectContent>
                                {sessionOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {t(option.label)}
                                        {option.isCurrent ? '(Current)' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedMonth} onValueChange={(value) => applyFilters(value, selectedSession)}>
                            <SelectTrigger className="w-36 bg-white">
                                <SelectValue placeholder={t('Select month')} />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {t(option.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2 bg-white"
                            disabled={!selectedSessionOption || selectedSessionOption.isCurrent}
                            onClick={handleSetCurrentSession}
                        >
                            <CalendarCheck className="h-4 w-4" />
                            {selectedSessionOption?.isCurrent ? t('Current Session') : t('Set Current Session')}
                        </Button>

                        <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={`gap-2 bg-white ${dateFrom || dateTo ? 'border-blue-500 text-blue-600' : ''}`}
                                >
                                    <CalendarDays className="h-4 w-4" />
                                    {t('Date Range')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4" align="end">
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-slate-900">{t('Custom Date Range')}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-slate-500">{t('From')}</label>
                                            <input
                                                type="date"
                                                value={dateFrom}
                                                onChange={(e) => setDateFrom(e.target.value)}
                                                className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500">{t('To')}</label>
                                            <input
                                                type="date"
                                                value={dateTo}
                                                onChange={(e) => setDateTo(e.target.value)}
                                                className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                                setDateRangeOpen(false);
                                                router.get(
                                                    '/reports',
                                                    {
                                                        class: selectedClassId,
                                                        month: selectedMonth,
                                                        session: selectedSession,
                                                        module: activeModule,
                                                        search: searchQuery || undefined,
                                                        date_from: dateFrom || undefined,
                                                        date_to: dateTo || undefined,
                                                    },
                                                    {
                                                        preserveScroll: true,
                                                        preserveState: true,
                                                    },
                                                );
                                            }}
                                        >
                                            {t('Apply')}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setDateFrom('');
                                                setDateTo('');
                                                setDateRangeOpen(false);
                                                router.get(
                                                    '/reports',
                                                    {
                                                        class: selectedClassId,
                                                        month: selectedMonth,
                                                        session: selectedSession,
                                                        module: activeModule,
                                                        search: searchQuery || undefined,
                                                    },
                                                    {
                                                        preserveScroll: true,
                                                        preserveState: true,
                                                    },
                                                );
                                            }}
                                        >
                                            {t('Clear')}
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <Card className="border-slate-200">
                    <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <CardTitle>
                                {activeModule === 'overview'
                                    ? t('Overview Dashboard')
                                    : `${activeReport?.label ?? 'Module'} Reports`}
                            </CardTitle>
                            <CardDescription>
                                {selectedMonthLabel} · {selectedSessionOption?.label || '-'} ·{' '}
                                {activeModule === 'overview'
                                    ? t('Key metrics and trends across all modules.')
                                    : t('Export-ready report tables.')}
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <Tabs value={activeModule} onValueChange={handleModuleChange} className="space-y-6">
                            <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
                                <TabsTrigger
                                    value="overview"
                                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-600 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Overview')}
                                </TabsTrigger>
                                {moduleReports.map((module) => (
                                    <TabsTrigger
                                        key={module.id}
                                        value={module.id}
                                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-600 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                    >
                                        {t(module.label)}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            <TabsContent value="overview" className="space-y-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    {[
                                        {
                                            key: 'totalStudents' as const,
                                            label: 'Total Students',
                                            value: metrics.totalStudents.toLocaleString(),
                                        },
                                        {
                                            key: 'attendanceRate' as const,
                                            label: 'Attendance Rate',
                                            value: `${metrics.attendanceRate}%`,
                                        },
                                        {
                                            key: 'feeCollected' as const,
                                            label: 'Fee Collected',
                                            value: `Rs ${metrics.feeCollected.toLocaleString()}`,
                                        },
                                        {
                                            key: 'feeCollectionRate' as const,
                                            label: 'Fee Collection Rate',
                                            value: `${metrics.feeCollectionRate}%`,
                                        },
                                        {
                                            key: 'libraryBooks' as const,
                                            label: 'Library Books',
                                            value: metrics.libraryBooks.toLocaleString(),
                                        },
                                        {
                                            key: 'libraryIssued' as const,
                                            label: 'Books Issued',
                                            value: metrics.libraryIssued.toLocaleString(),
                                        },
                                    ].map((kpi) => {
                                        const Icon = kpiIcons[kpi.key];
                                        return (
                                            <Card key={kpi.key} className="border-slate-200">
                                                <CardContent className="flex items-center gap-4 pt-6">
                                                    <div
                                                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${kpiColors[kpi.key]}`}
                                                    >
                                                        <Icon className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t(kpi.label)}</p>
                                                        <p className="text-2xl font-semibold text-slate-900">
                                                            {kpi.value}
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    <Card className="border-slate-200">
                                        <CardHeader>
                                            <CardTitle className="text-base">{t('Attendance Trends')}</CardTitle>
                                            <CardDescription>
                                                {t('Monthly present vs absent percentages')}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {attendanceData.length > 0 ? (
                                                <ChartContainer
                                                    config={attendanceChartConfig}
                                                    className="h-[300px] w-full"
                                                >
                                                    <AreaChart data={attendanceData}>
                                                        <CartesianGrid vertical={false} />
                                                        <XAxis
                                                            dataKey="month"
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tick={{
                                                                fontSize: 12,
                                                            }}
                                                        />

                                                        <YAxis
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tick={{
                                                                fontSize: 12,
                                                            }}
                                                            domain={[0, 100]}
                                                        />

                                                        <ChartTooltip content={<ChartTooltipContent />} />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="present"
                                                            stackId="1"
                                                            stroke="#3b82f6"
                                                            fill="#3b82f6"
                                                            fillOpacity={0.2}
                                                        />

                                                        <Area
                                                            type="monotone"
                                                            dataKey="absent"
                                                            stackId="1"
                                                            stroke="#ef4444"
                                                            fill="#ef4444"
                                                            fillOpacity={0.2}
                                                        />

                                                        <Legend />
                                                    </AreaChart>
                                                </ChartContainer>
                                            ) : (
                                                <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
                                                    {t('No attendance data available')}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card className="border-slate-200">
                                        <CardHeader>
                                            <CardTitle className="text-base">{t('Fee Collection')}</CardTitle>
                                            <CardDescription>
                                                {t('Monthly collected vs pending amounts')}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {feeCollectionData.length > 0 ? (
                                                <ChartContainer config={feeChartConfig} className="h-[300px] w-full">
                                                    <BarChart data={feeCollectionData}>
                                                        <CartesianGrid vertical={false} />
                                                        <XAxis
                                                            dataKey="month"
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tick={{
                                                                fontSize: 12,
                                                            }}
                                                        />

                                                        <YAxis
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tick={{
                                                                fontSize: 12,
                                                            }}
                                                        />

                                                        <ChartTooltip content={<ChartTooltipContent />} />
                                                        <Bar dataKey="collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                                        <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                                        <Legend />
                                                    </BarChart>
                                                </ChartContainer>
                                            ) : (
                                                <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
                                                    {t('No fee data available')}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card className="border-slate-200">
                                        <CardHeader>
                                            <CardTitle className="text-base">{t('Student Distribution')}</CardTitle>
                                            <CardDescription>{t('Students across class ranges')}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {studentDistribution.length > 0 ? (
                                                <ChartContainer config={{}} className="h-[300px] w-full">
                                                    <PieChart>
                                                        <Pie
                                                            data={studentDistribution}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={100}
                                                            dataKey="students"
                                                            nameKey="class"
                                                            paddingAngle={2}
                                                        >
                                                            {studentDistribution.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))}
                                                        </Pie>
                                                        <ChartTooltip content={<ChartTooltipContent />} />
                                                        <Legend />
                                                    </PieChart>
                                                </ChartContainer>
                                            ) : (
                                                <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
                                                    {t('No distribution data available')}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card className="border-slate-200">
                                        <CardHeader>
                                            <CardTitle className="text-base">{t('Exam Performance')}</CardTitle>
                                            <CardDescription>{t('Average marks by subject')}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {examPerformance.length > 0 ? (
                                                <ChartContainer config={examChartConfig} className="h-[300px] w-full">
                                                    <BarChart data={examPerformance} layout="vertical">
                                                        <CartesianGrid horizontal={false} />
                                                        <XAxis
                                                            type="number"
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tick={{
                                                                fontSize: 12,
                                                            }}
                                                        />

                                                        <YAxis
                                                            type="category"
                                                            dataKey="subject"
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tick={{
                                                                fontSize: 12,
                                                            }}
                                                            width={100}
                                                        />

                                                        <ChartTooltip content={<ChartTooltipContent />} />
                                                        <Bar dataKey="average" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ChartContainer>
                                            ) : (
                                                <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
                                                    {t('No exam data available')}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {moduleReports.map((module) => (
                                <TabsContent key={module.id} value={module.id} className="space-y-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-semibold text-slate-900">
                                                {t(module.label)}
                                                {t('Report')}
                                            </h3>
                                            <p className="text-sm text-slate-600">{t(module.description)}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="gap-2"
                                                onClick={() => exportModuleCsv(module)}
                                            >
                                                <Download className="h-4 w-4" />
                                                {t('Export CSV')}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="gap-2"
                                                onClick={() => exportModulePdf(module)}
                                            >
                                                <FileText className="h-4 w-4" />
                                                {t('Export PDF')}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="gap-2"
                                                onClick={() => exportModuleExcel(module)}
                                            >
                                                <FileSpreadsheet className="h-4 w-4" />
                                                {t('Export Excel')}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        {module.stats.map((stat) => (
                                            <Card key={stat.label} className="border-slate-200 bg-slate-50/70">
                                                <CardContent className="pt-6">
                                                    <p className="text-sm text-slate-500">{t(stat.label)}</p>
                                                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                                                        {stat.value}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow>
                                                    {module.columns.map((column) => (
                                                        <TableHead key={column}>{column}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {module.rows.length > 0 ? (
                                                    module.rows.map((row, rowIndex) => (
                                                        <TableRow key={`${module.id}-${rowIndex}`}>
                                                            {row.map((cell, cellIndex) => (
                                                                <TableCell
                                                                    key={`${module.id}-${rowIndex}-${cellIndex}`}
                                                                >
                                                                    {cell}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={module.columns.length}
                                                            className="py-8 text-center text-slate-500"
                                                        >
                                                            {t(
                                                                'No records found for this module and filter selection.',
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {module.pagination && module.pagination.lastPage > 1 && (
                                        <div className="flex items-center justify-between px-2">
                                            <p className="text-sm text-slate-500">
                                                {t('Showing {start} to {end} of {total} records', {
                                                    start:
                                                        (module.pagination.currentPage - 1) *
                                                            module.pagination.perPage +
                                                        1,
                                                    end: Math.min(
                                                        module.pagination.currentPage * module.pagination.perPage,
                                                        module.pagination.total,
                                                    ),
                                                    total: module.pagination.total,
                                                })}
                                            </p>
                                            <div className="flex gap-1">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={module.pagination.currentPage <= 1}
                                                    onClick={() => handlePageChange(module.pagination!.currentPage - 1)}
                                                >
                                                    {t('Previous')}
                                                </Button>
                                                {Array.from(
                                                    {
                                                        length: Math.min(module.pagination.lastPage, 5),
                                                    },
                                                    (_, i) => {
                                                        let pageNum: number;
                                                        if (module.pagination!.lastPage <= 5) {
                                                            pageNum = i + 1;
                                                        } else if (module.pagination!.currentPage <= 3) {
                                                            pageNum = i + 1;
                                                        } else if (
                                                            module.pagination!.currentPage >=
                                                            module.pagination!.lastPage - 2
                                                        ) {
                                                            pageNum = module.pagination!.lastPage - 4 + i;
                                                        } else {
                                                            pageNum = module.pagination!.currentPage - 2 + i;
                                                        }
                                                        return (
                                                            <Button
                                                                key={pageNum}
                                                                type="button"
                                                                variant={
                                                                    pageNum === module.pagination!.currentPage
                                                                        ? 'default'
                                                                        : 'outline'
                                                                }
                                                                size="sm"
                                                                className={
                                                                    pageNum === module.pagination!.currentPage
                                                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                                        : ''
                                                                }
                                                                onClick={() => handlePageChange(pageNum)}
                                                            >
                                                                {pageNum}
                                                            </Button>
                                                        );
                                                    },
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={
                                                        module.pagination.currentPage >= module.pagination.lastPage
                                                    }
                                                    onClick={() => handlePageChange(module.pagination!.currentPage + 1)}
                                                >
                                                    {t('Next')}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
