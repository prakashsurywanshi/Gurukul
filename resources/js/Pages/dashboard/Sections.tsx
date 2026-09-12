import { LayoutList, Users, School } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useLanguage } from '../../i18n/LanguageProvider';
import { router } from '@inertiajs/react';

type SectionRecord = {
    name: string;
    classCount: number;
    studentCount: number;
    totalCapacity: number;
};

type SectionsProps = {
    user: any;
    sectionRecords: SectionRecord[];
};

export default function Sections({ user, sectionRecords }: SectionsProps) {
    const { t } = useLanguage();

    return (
        <DashboardLayout user={user} pageTitle={t('Sections')}>
            <div className="space-y-6">
                <Card>
                    <CardContent className="flex items-start justify-between gap-4 pt-6">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <LayoutList className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight">{t('Sections')}</h1>
                                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                    {t(
                                        'Section registry with per-section class and student coverage across the current academic session.',
                                    )}
                                </p>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => router.visit('/classes')}>
                            {t('Manage Classes')}
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center gap-3 pt-6">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                <LayoutList className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{sectionRecords.length}</p>
                                <p className="text-xs text-muted-foreground">{t('Sections')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 pt-6">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                <School className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {sectionRecords.reduce((sum, s) => sum + s.classCount, 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">{t('Classes')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 pt-6">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                <Users className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {sectionRecords.reduce((sum, s) => sum + s.studentCount, 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">{t('Students')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Section Coverage')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {sectionRecords.length === 0 ? (
                            <p className="py-10 text-center text-muted-foreground">{t('No records found.')}</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Section')}</TableHead>
                                        <TableHead>{t('Classes')}</TableHead>
                                        <TableHead>{t('Students')}</TableHead>
                                        <TableHead>{t('Total Capacity')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sectionRecords.map((section) => (
                                        <TableRow key={section.name}>
                                            <TableCell>
                                                <span className="inline-flex items-center gap-2">
                                                    <LayoutList className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">{section.name}</span>
                                                </span>
                                            </TableCell>
                                            <TableCell>{section.classCount}</TableCell>
                                            <TableCell>{section.studentCount}</TableCell>
                                            <TableCell>{section.totalCapacity}</TableCell>
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
