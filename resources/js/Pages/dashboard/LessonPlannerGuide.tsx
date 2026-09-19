import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { BookOpen, BookOpenCheck, CalendarDays, CheckCheck, ClipboardList, PenLine } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';

interface GuideStep {
    number: number;
    title: string;
    description: string;
    icon: any;
}

interface LessonPlannerGuideProps {
    user: any;
}

export default function LessonPlannerGuide({ user }: LessonPlannerGuideProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const steps: GuideStep[] = [
        {
            number: 1,
            title: t('Pick the period'),
            description: t('Choose the class and subject, then select the timetable period your lesson belongs to.'),
            icon: CalendarDays,
        },
        {
            number: 2,
            title: t('Write the plan'),
            description: t('Add a clear lesson title and topic so the plan is easy to scan before the class.'),
            icon: PenLine,
        },
        {
            number: 3,
            title: t('Set the status'),
            description: t('Mark the lesson as planned, taught or carried forward so the coverage is accurate.'),
            icon: ClipboardList,
        },
        {
            number: 4,
            title: t('Track coverage'),
            description: t(
                'Use the syllabus coverage view to see how much of the curriculum each subject has completed.',
            ),
            icon: BookOpenCheck,
        },
        {
            number: 5,
            title: t('Review for approval'),
            description: t(
                'Admins can review and approve lesson plans on time so the teaching record stays up to date.',
            ),
            icon: CheckCheck,
        },
    ];

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('Lesson Planner Guide')}</CardTitle>
                                <CardDescription>
                                    {t('How to write, track and approve lesson plans for every period.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Plan engaging lessons')}</CardTitle>
                        <CardDescription>
                            {t('A short walkthrough of the steps from writing a plan to getting it approved.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ol className="space-y-6">
                            {steps.map((step) => (
                                <li key={step.number} className="flex gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                        <step.icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                                                {t('Step')} {step.number}
                                            </span>
                                        </div>
                                        <div className="font-medium text-slate-800 dark:text-gray-100">
                                            {step.title}
                                        </div>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                                            {step.description}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Tips')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-gray-300">
                            <li>{t('Keep lesson titles short so the plan list stays readable.')}</li>
                            <li>{t('Update the status as soon as the lesson is taught.')}</li>
                            <li>{t('Use carried forward for lessons that spilled into the next period.')}</li>
                            <li>{t('Check syllabus coverage each month to stay on track for the year.')}</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
