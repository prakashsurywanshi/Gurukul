import { useState } from 'react';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    Award,
    BadgeCheck,
    BadgeIndianRupee,
    BadgePercent,
    BarChart3,
    Bed,
    BedDouble,
    BedSingle,
    Book,
    Bookmark,
    BookOpen,
    Box,
    Briefcase,
    Building2,
    Bus,
    Calendar,
    CalendarCheck,
    CalendarClock,
    CalendarRange,
    Car,
    CheckCheck,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Coins,
    DoorOpen,
    FileCheck,
    FileQuestion,
    FileText,
    Filter,
    Flame,
    Gauge,
    GitBranch,
    Globe,
    GraduationCap,
    Hammer,
    Handshake,
    HardHat,
    HelpCircle,
    Hourglass,
    Inbox,
    IndianRupee,
    Landmark,
    Layers,
    LayoutGrid,
    List,
    Loader,
    Mailbox,
    Map,
    Monitor,
    Package,
    PackagePlus,
    Percent,
    Play,
    Receipt,
    Repeat,
    Route as RouteIcon,
    School,
    Send,
    ShieldCheck,
    Star,
    Tag,
    Tags,
    Target,
    TrendingDown,
    TrendingUp,
    TriangleAlert,
    Trophy,
    User,
    UserCheck,
    UserPlus,
    UserX,
    Users,
    Wallet,
    Warehouse,
    Wrench,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';

interface Metric {
    label: string;
    value: number;
    suffix: string;
    icon: string;
    tone: string;
    detail?: string | null;
}

interface ChartDatum {
    label: string | number;
    value?: number;
    value2?: number;
    sub?: string;
    right?: string;
}

interface ChartWidget {
    title: string;
    kind: 'bar' | 'area' | 'pie' | 'list';
    data: ChartDatum[];
    legend: string[];
}

interface Section {
    title: string;
    columns: string[];
    rows: (string | number)[][];
}

interface DomainDashboardProps {
    user: any;
    schoolName: string;
    domain: string;
    title: string;
    description: string;
    actions: { label: string; href: string }[];
    metrics: Metric[];
    sections: Section[];
    charts: ChartWidget[];
}

const iconMap: Record<string, any> = {
    activity: Activity,
    'alert-circle': AlertCircle,
    'alert-triangle': AlertTriangle,
    award: Award,
    'badge-check': BadgeCheck,
    'badge-percent': BadgePercent,
    'badge-indian-rupee': BadgeIndianRupee,
    'bar-chart': BarChart3,
    bed: Bed,
    'bed-double': BedDouble,
    'bed-single': BedSingle,
    book: Book,
    bookmark: Bookmark,
    'book-open': BookOpen,
    box: Box,
    briefcase: Briefcase,
    'building-2': Building2,
    bus: Bus,
    calendar: Calendar,
    'calendar-check': CalendarCheck,
    'calendar-clock': CalendarClock,
    'calendar-range': CalendarRange,
    car: Car,
    chart: BarChart3,
    'check-check': CheckCheck,
    'clipboard-check': ClipboardCheck,
    'clipboard-list': ClipboardList,
    clock: Clock,
    coins: Coins,
    'door-open': DoorOpen,
    'file-check': FileCheck,
    'file-question': FileQuestion,
    'file-text': FileText,
    filter: Filter,
    flame: Flame,
    gauge: Gauge,
    'git-branch': GitBranch,
    globe: Globe,
    'graduation-cap': GraduationCap,
    hammer: Hammer,
    handshake: Handshake,
    'hard-hat': HardHat,
    'help-circle': HelpCircle,
    hourglass: Hourglass,
    inbox: Inbox,
    'indian-rupee': IndianRupee,
    landmark: Landmark,
    layers: Layers,
    'layout-grid': LayoutGrid,
    list: List,
    loader: Loader,
    mailbox: Mailbox,
    map: Map,
    monitor: Monitor,
    package: Package,
    'package-plus': PackagePlus,
    percent: Percent,
    play: Play,
    receipt: Receipt,
    repeat: Repeat,
    route: RouteIcon,
    school: School,
    send: Send,
    'shield-check': ShieldCheck,
    star: Star,
    tag: Tag,
    tags: Tags,
    target: Target,
    'trending-down': TrendingDown,
    'trending-up': TrendingUp,
    'triangle-alert': TriangleAlert,
    trophy: Trophy,
    user: User,
    'user-check': UserCheck,
    'user-plus': UserPlus,
    'user-x': UserX,
    users: Users,
    wallet: Wallet,
    warehouse: Warehouse,
    wrench: Wrench,
};

const toneClasses: Record<string, { icon: string; value: string }> = {
    blue: { icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', value: 'text-blue-600 dark:text-blue-400' },
    sky: { icon: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', value: 'text-sky-600 dark:text-sky-400' },
    indigo: {
        icon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        value: 'text-indigo-600 dark:text-indigo-400',
    },
    violet: {
        icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        value: 'text-violet-600 dark:text-violet-400',
    },
    emerald: {
        icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        value: 'text-emerald-600 dark:text-emerald-400',
    },
    green: { icon: 'bg-green-500/10 text-green-600 dark:text-green-400', value: 'text-green-600 dark:text-green-400' },
    teal: { icon: 'bg-teal-500/10 text-teal-600 dark:text-teal-400', value: 'text-teal-600 dark:text-teal-400' },
    amber: { icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-500', value: 'text-amber-600 dark:text-amber-500' },
    rose: { icon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', value: 'text-rose-600 dark:text-rose-400' },
};

const palette = [
    '#6366f1',
    '#14b8a6',
    '#f59e0b',
    '#f43f5e',
    '#8b5cf6',
    '#0ea5e9',
    '#10b981',
    '#d946ef',
    '#f97316',
    '#06b6d4',
];

function ChartCard({ chart }: { chart: ChartWidget }) {
    const { t } = useLanguage();
    const hasSecond = chart.data.some((d) => d.value2 !== undefined);

    return (
        <Card>
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{chart.title}</h2>
            </div>
            <CardContent className="p-4">
                {chart.kind === 'list' ? (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {chart.data.length === 0 && (
                            <li className="py-6 text-center text-sm text-gray-400">{t('No records yet.')}</li>
                        )}
                        {chart.data.map((item, index) => (
                            <li key={index} className="flex items-center justify-between gap-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {item.label}
                                    </p>
                                    {item.sub && <p className="truncate text-xs text-gray-500">{item.sub}</p>}
                                </div>
                                {item.right && <span className="shrink-0 text-xs text-gray-400">{item.right}</span>}
                            </li>
                        ))}
                    </ul>
                ) : chart.kind === 'pie' ? (
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Tooltip />
                            <Pie
                                data={chart.data}
                                dataKey="value"
                                nameKey="label"
                                innerRadius={55}
                                outerRadius={90}
                                paddingAngle={2}
                            >
                                {chart.data.map((_, index) => (
                                    <Cell key={index} fill={palette[index % palette.length]} />
                                ))}
                            </Pie>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : chart.kind === 'area' ? (
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chart.data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Area
                                type="monotone"
                                dataKey="value"
                                name={chart.legend[0] ?? 'Value'}
                                stroke={palette[0]}
                                fill={palette[0]}
                                fillOpacity={0.15}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chart.data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            {hasSecond && <Legend />}
                            <Bar
                                dataKey="value"
                                name={chart.legend[0] ?? 'Value'}
                                fill={palette[0]}
                                radius={[4, 4, 0, 0]}
                            />
                            {hasSecond && (
                                <Bar
                                    dataKey="value2"
                                    name={chart.legend[1] ?? 'Value 2'}
                                    fill={palette[1]}
                                    radius={[4, 4, 0, 0]}
                                />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

export default function DomainDashboard({
    user,
    title,
    description,
    actions,
    metrics,
    sections,
    charts,
}: DomainDashboardProps) {
    const { t } = useLanguage();
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const empty = metrics.length === 0;

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            <BarChart3 className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            {title}
                        </h1>
                        <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{description}</p>
                    </div>
                    {actions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {actions.map((action) => (
                                <Button
                                    key={action.label}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.visit(action.href)}
                                >
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                {empty ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <p className="text-sm text-gray-400">{t('No data available for this dashboard yet.')}</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {metrics.map((metric) => {
                            const MetricIcon = iconMap[metric.icon] ?? Activity;
                            const tone = toneClasses[metric.tone] ?? toneClasses.blue;

                            return (
                                <Card key={metric.label}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</p>
                                            <span
                                                className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone.icon}`}
                                            >
                                                <MetricIcon className="h-4 w-4" />
                                            </span>
                                        </div>
                                        <p className={`mt-1 text-2xl font-bold ${tone.value}`}>
                                            {typeof metric.value === 'number'
                                                ? metric.value.toLocaleString('en-IN')
                                                : metric.value}
                                            {metric.suffix && (
                                                <span className="ml-1 text-sm font-medium">{metric.suffix}</span>
                                            )}
                                        </p>
                                        {metric.detail && (
                                            <p className="mt-0.5 text-xs text-gray-400">{metric.detail}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {charts.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {charts.map((chart) => (
                            <ChartCard key={chart.title} chart={chart} />
                        ))}
                    </div>
                )}

                {sections.map((section, index) => (
                    <Card key={section.title}>
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{section.title}</h2>
                            {section.rows.length > 8 && (
                                <button
                                    type="button"
                                    className="text-xs text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-200"
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                >
                                    {openIndex === index ? t('Show fewer') : `Show all (${section.rows.length})`}
                                </button>
                            )}
                        </div>
                        {section.rows.length === 0 ? (
                            <div className="px-6 py-8 text-center text-sm text-gray-400">{t('No records yet.')}</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {section.columns.map((column) => (
                                            <TableHead key={column}>{column}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {section.rows
                                        .slice(0, openIndex === index ? section.rows.length : 8)
                                        .map((row, rowIndex) => (
                                            <TableRow key={rowIndex}>
                                                {row.map((cell, cellIndex) => (
                                                    <TableCell key={cellIndex}>{cell}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        )}
                    </Card>
                ))}
            </div>
        </DashboardLayout>
    );
}
