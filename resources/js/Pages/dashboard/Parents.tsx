import { useLanguage } from '../../i18n/LanguageProvider';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Mail, Phone, Search, UserRound, Users, Link2, GraduationCap } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface ParentChild {
    id: string;
    admission_no: string;
    name: string;
    class?: string;
    section?: string;
    gender?: string;
}

interface ParentRow {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    relation: string;
    childCount: number;
    children: ParentChild[];
}

export default function Parents({
    user,
    parents,
    summary,
    filters,
}: {
    user: any;
    parents: ParentRow[];
    summary: { parentCount: number; studentCount: number; linkedStudentCount: number };
    filters: { search: string };
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [search, setSearch] = useState(filters.search);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const searchTimer = useMemo(() => ({ current: null as ReturnType<typeof setTimeout> | null }), []);

    useEffect(() => {
        if (flash.success) {
            // no-op; kept for parity with other pages
        }
    }, [flash]);

    useEffect(() => {
        if (searchTimer.current) {
            clearTimeout(searchTimer.current);
        }

        searchTimer.current = setTimeout(() => {
            const term = search.trim();
            router.get('/parents', term !== '' ? { search: term } : {}, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 400);

        return () => {
            if (searchTimer.current) {
                clearTimeout(searchTimer.current);
            }
        };
    }, [search]);

    const toggleExpand = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const contactLabel = (row: ParentRow) => {
        const parts = [];
        if (row.phone) parts.push(row.phone);
        if (row.email) parts.push(row.email);
        return parts.join(' · ');
    };

    return (
        <DashboardLayout user={user} activeTab="parents">
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold">{t('Parents & Guardians')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('Directory of guardians linked to student records for communication and follow-up.')}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Users className="h-4 w-4" />
                                {t('Total Parents')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-bold">{summary.parentCount}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <GraduationCap className="h-4 w-4" />
                                {t('Students')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-bold">{summary.studentCount}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Link2 className="h-4 w-4" />
                                {t('Parent Links')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-bold">{summary.linkedStudentCount}</CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Guardian Directory')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('Search parent, phone, email or student…')}
                                className="pl-9"
                            />
                        </div>

                        {parents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                                <UserRound className="h-10 w-10 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    {t(
                                        'No parents found. Add guardian contact details to student records to build the directory.',
                                    )}
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8" />
                                        <TableHead>{t('Parent / Guardian')}</TableHead>
                                        <TableHead>{t('Relation')}</TableHead>
                                        <TableHead>{t('Contact')}</TableHead>
                                        <TableHead>{t('Children')}</TableHead>
                                        <TableHead className="text-right">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parents.map((row) => {
                                        const isOpen = Boolean(expanded[row.id]);
                                        return (
                                            <Fragment key={row.id}>
                                                <TableRow className="align-top">
                                                    <TableCell className="w-8">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => toggleExpand(row.id)}
                                                        >
                                                            {isOpen ? (
                                                                <ChevronDown className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="font-medium">{row.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{row.relation}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        <div className="flex flex-col gap-1">
                                                            {row.phone && (
                                                                <span className="flex items-center gap-1.5">
                                                                    <Phone className="h-3.5 w-3.5" />
                                                                    {row.phone}
                                                                </span>
                                                            )}
                                                            {row.email && (
                                                                <span className="flex items-center gap-1.5 truncate max-w-[220px]">
                                                                    <Mail className="h-3.5 w-3.5 shrink-0" />
                                                                    {row.email}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm">{row.childCount}</span>
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            {row.children.map((c) => c.name).join(', ')}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            {row.phone && (
                                                                <a href={`tel:${row.phone}`} title={t('Call')}>
                                                                    <Button variant="outline" size="sm">
                                                                        <Phone className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </a>
                                                            )}
                                                            {row.email && (
                                                                <a href={`mailto:${row.email}`} title={t('Email')}>
                                                                    <Button variant="outline" size="sm">
                                                                        <Mail className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </a>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {isOpen && (
                                                    <TableRow key={`${row.id}-details`} className="bg-muted/30">
                                                        <TableCell colSpan={6} className="border-t">
                                                            <div className="space-y-2 py-1">
                                                                {row.children.map((child) => (
                                                                    <div
                                                                        key={child.id}
                                                                        className="flex flex-wrap items-center gap-3 rounded-md bg-background px-3 py-2 text-sm"
                                                                    >
                                                                        <span className="font-medium">
                                                                            {child.name}
                                                                        </span>
                                                                        {child.admission_no && (
                                                                            <Badge variant="secondary">
                                                                                {child.admission_no}
                                                                            </Badge>
                                                                        )}
                                                                        <span className="text-muted-foreground">
                                                                            {[child.class, child.section]
                                                                                .filter(Boolean)
                                                                                .join(' · ')}
                                                                        </span>
                                                                        {child.gender && (
                                                                            <span className="text-muted-foreground">
                                                                                {child.gender}
                                                                            </span>
                                                                        )}
                                                                        <Button
                                                                            variant="link"
                                                                            size="sm"
                                                                            className="ml-auto h-auto p-0"
                                                                            onClick={() =>
                                                                                router.visit(`/students/${child.id}`)
                                                                            }
                                                                        >
                                                                            {t('View Student')}
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
