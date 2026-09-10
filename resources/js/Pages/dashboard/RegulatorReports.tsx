import { useLanguage } from '../../i18n/LanguageProvider';
import { Building2, CalendarCheck, Download, GraduationCap, Landmark, Users } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export type RegulatorReportsProps = {
    school: {
        name: string;
        email: string | null;
        phone: string | null;
        address: string;
        website: string | null;
        type: string | null;
    };
    disclosure: {
        studentCount: number;
        staffCount: number;
        classCount: number;
        studentGender: { label: string; count: number }[];
        classDistribution: { name: string; count: number }[];
    };
    government: {
        totalStudents: number;
        totalStaff: number;
        markedToday: number;
        presentToday: number;
        attendanceRate: number;
        staffByRole: { role: string; count: number }[];
    };
};

export default function RegulatorReports({ school, disclosure, government }: RegulatorReportsProps) {
    const { t } = useLanguage();

    return (
        <DashboardLayout pageTitle={t('Regulator Reports')}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">{school.name}</CardTitle>
                            {school.type && <Badge variant="secondary">{school.type}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{school.address}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {school.email && <span>{school.email}</span>}
                            {school.phone && <span>{school.phone}</span>}
                            {school.website && <span>{school.website}</span>}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <p className="text-sm text-muted-foreground">
                                {t('Export the disclosure and government summary for regulators.')}
                            </p>
                            <a href="/regulator-reports/export">
                                <Button type="button" size="sm">
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Export CSV')}
                                </Button>
                            </a>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Students')}</p>
                                <p className="text-2xl font-bold">{disclosure.studentCount}</p>
                            </div>
                            <GraduationCap className="h-5 w-5 text-primary" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Staff')}</p>
                                <p className="text-2xl font-bold">{disclosure.staffCount}</p>
                            </div>
                            <Users className="h-5 w-5 text-sky-600" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Classes')}</p>
                                <p className="text-2xl font-bold">{disclosure.classCount}</p>
                            </div>
                            <Landmark className="h-5 w-5 text-amber-600" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Attendance Rate')}</p>
                                <p className="text-2xl font-bold text-emerald-600">{government.attendanceRate}%</p>
                            </div>
                            <CalendarCheck className="h-5 w-5 text-emerald-600" />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('CBSE Disclosure')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
                            <div>
                                <p className="text-sm font-medium">{t('Student Gender Split')}</p>
                                <div className="mt-2 space-y-2">
                                    {disclosure.studentGender.map((split) => (
                                        <div
                                            key={split.label}
                                            className="flex items-center justify-between rounded-lg border p-3"
                                        >
                                            <span className="text-sm">{t(split.label)}</span>
                                            <span className="font-semibold">{split.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium">{t('Class Distribution')}</p>
                                <div className="mt-2 space-y-2">
                                    {disclosure.classDistribution.map((schoolClass) => (
                                        <div
                                            key={schoolClass.name}
                                            className="flex items-center justify-between rounded-lg border p-3"
                                        >
                                            <span className="text-sm">{schoolClass.name}</span>
                                            <span className="font-semibold">{schoolClass.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Government / RTE Reports')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-lg border p-3 text-center">
                                    <p className="text-sm text-muted-foreground">{t('Marked Today')}</p>
                                    <p className="text-2xl font-bold">{government.markedToday}</p>
                                </div>
                                <div className="rounded-lg border p-3 text-center">
                                    <p className="text-sm text-muted-foreground">{t('Present Today')}</p>
                                    <p className="text-2xl font-bold text-emerald-600">{government.presentToday}</p>
                                </div>
                                <div className="rounded-lg border p-3 text-center">
                                    <p className="text-sm text-muted-foreground">{t('Total Roll')}</p>
                                    <p className="text-2xl font-bold">{government.totalStudents}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium">{t('Staff by Role')}</p>
                                <div className="mt-2 space-y-2">
                                    {government.staffByRole.map((group) => (
                                        <div
                                            key={group.role}
                                            className="flex items-center justify-between rounded-lg border p-3"
                                        >
                                            <span className="text-sm">
                                                {t(group.role.charAt(0).toUpperCase() + group.role.slice(1))}
                                            </span>
                                            <span className="font-semibold">{group.count}</span>
                                        </div>
                                    ))}
                                    {government.staffByRole.length === 0 && (
                                        <p className="py-4 text-center text-sm text-muted-foreground">
                                            {t('No staff records.')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
