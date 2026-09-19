import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { Contact, ExternalLink, Mail, Phone, Search, Users } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface StaffRow {
    id: number;
    name: string;
    email: string;
    phone: string;
    employeeId: string;
    role: string;
    roleLabel: string;
    department: string;
    designation: string;
    joiningDate: string;
    status: string;
}

interface DepartmentOption {
    id: number;
    name: string;
}

interface DesignationOption {
    id: number;
    name: string;
}

interface RoleOption {
    value: string;
    label: string;
}

export default function StaffDirectory({
    user,
    staff,
    filters,
    departmentOptions,
    designationOptions,
    roleOptions,
    summary,
}: {
    user: any;
    staff: StaffRow[];
    filters: {
        search: string;
        department_id: number | null;
        designation_id: number | null;
        role: string;
        status: string;
    };
    departmentOptions: DepartmentOption[];
    designationOptions: DesignationOption[];
    roleOptions: RoleOption[];
    summary: { total: number; active: number; teachers: number };
}) {
    const { t } = useLanguage();
    const [search, setSearch] = useState(filters.search);

    const applyFilter = (overrides: Record<string, string | number | null>) => {
        router.get(
            '/staff-directory',
            {
                search,
                department_id: filters.department_id ?? '',
                designation_id: filters.designation_id ?? '',
                role: filters.role ?? '',
                status: filters.status,
                ...overrides,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const statCard = (label: string, value: number, icon: React.ElementType) => {
        const Icon = icon;
        return (
            <Card>
                <CardContent className="flex items-center gap-3 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{value}</p>
                        <p className="text-sm text-slate-500">{t(label)}</p>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <DashboardLayout user={user} activeTab="staff-directory">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('Staff Directory')}</h1>
                        <p className="mt-1 text-sm text-slate-600">{t('Find any staff member across the school.')}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {statCard('Total (Active)', summary.active, Users)}
                        {statCard('Teachers', summary.teachers, Contact)}
                        {statCard('Everyone', summary.total, Users)}
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('Directory')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                                <div className="relative md:col-span-2">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                applyFilter({});
                                            }
                                        }}
                                        placeholder={t('Search name, ID or email...')}
                                        className="pl-9"
                                    />
                                </div>
                                <Select
                                    value={filters.department_id === null ? 'all' : String(filters.department_id)}
                                    onValueChange={(value) =>
                                        applyFilter({ department_id: value === 'all' ? '' : value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All Departments')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Departments')}</SelectItem>
                                        {departmentOptions.map((department) => (
                                            <SelectItem key={department.id} value={String(department.id)}>
                                                {department.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={filters.designation_id === null ? 'all' : String(filters.designation_id)}
                                    onValueChange={(value) =>
                                        applyFilter({ designation_id: value === 'all' ? '' : value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All Designations')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Designations')}</SelectItem>
                                        {designationOptions.map((designation) => (
                                            <SelectItem key={designation.id} value={String(designation.id)}>
                                                {designation.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={filters.role === '' ? 'all' : filters.role}
                                    onValueChange={(value) => applyFilter({ role: value === 'all' ? '' : value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All Roles')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Roles')}</SelectItem>
                                        {roleOptions.map((role) => (
                                            <SelectItem key={role.value} value={role.value}>
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Employee ID')}</TableHead>
                                            <TableHead>{t('Role')}</TableHead>
                                            <TableHead>{t('Department')}</TableHead>
                                            <TableHead>{t('Designation')}</TableHead>
                                            <TableHead>{t('Contact')}</TableHead>
                                            <TableHead>{t('Joined')}</TableHead>
                                            <TableHead className="text-right">{t('Action')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {staff.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                                    {t('No staff members match your filters.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            staff.map((member) => (
                                                <TableRow key={member.id}>
                                                    <TableCell className="font-medium text-slate-800">
                                                        {member.name}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {member.employeeId ?? <span className="text-slate-400">-</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                member.role === 'teacher'
                                                                    ? 'bg-blue-50 text-blue-700'
                                                                    : 'bg-slate-100 text-slate-700'
                                                            }
                                                        >
                                                            {member.roleLabel}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {member.department ?? <span className="text-slate-400">-</span>}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {member.designation ?? (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-0.5 text-sm text-slate-600">
                                                            {member.email ? (
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                                    {member.email}
                                                                </span>
                                                            ) : null}
                                                            {member.phone ? (
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                                    {member.phone}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {member.joiningDate ?? (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            asChild
                                                            variant="ghost"
                                                            size="sm"
                                                            title={t('Open Staff Hub')}
                                                        >
                                                            <Link href={`/staff/${member.id}`}>
                                                                <ExternalLink className="h-4 w-4 text-blue-600" />
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
