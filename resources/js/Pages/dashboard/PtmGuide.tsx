import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { BookOpen, CalendarDays, CheckSquare, ClipboardList, MessageSquare, UserCheck } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';

interface GuideStep {
    number: number;
    title: string;
    description: string;
    icon: any;
}

interface PtmGuideProps {
    user: any;
}

export default function PtmGuide({ user }: PtmGuideProps) {
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
            title: t('Plan the meeting'),
            description: t(
                'Schedule a parent-teacher meeting with a clear date, time and location so parents can plan ahead.',
            ),
            icon: CalendarDays,
        },
        {
            number: 2,
            title: t('Invite parents and book slots'),
            description: t(
                'Let parents choose a convenient slot for each student. Confirm the meeting details and keep the schedule visible.',
            ),
            icon: MessageSquare,
        },
        {
            number: 3,
            title: t('Record attendance'),
            description: t(
                'Mark each appointment as Checked-in, Completed or Absent as parents arrive, so the meeting record is accurate.',
            ),
            icon: UserCheck,
        },
        {
            number: 4,
            title: t('Add remarks'),
            description: t(
                'Note key discussion points, strengths and areas of improvement after each conversation for future reference.',
            ),
            icon: ClipboardList,
        },
        {
            number: 5,
            title: t('Follow up'),
            description: t(
                'Mark appointments that need follow-up and set a due date. Complete follow-ups once the action is done.',
            ),
            icon: CheckSquare,
        },
    ];

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>{t('PTM Guide')}</CardTitle>
                                <CardDescription>
                                    {t('How to plan, run and follow up on parent-teacher meetings.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Run a great parent-teacher meeting')}</CardTitle>
                        <CardDescription>
                            {t('A short walkthrough of the steps from scheduling to follow-up.')}
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
                            <li>{t('Share the meeting schedule early so parents can pick their preferred slots.')}</li>
                            <li>{t('Keep remarks constructive - note both strengths and areas to improve.')}</li>
                            <li>{t('Use the follow-up list to track actions promised during the meeting.')}</li>
                            <li>{t('Review PTM reports after the meeting to measure attendance and engagement.')}</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
