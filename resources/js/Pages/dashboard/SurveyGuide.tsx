import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { BookOpen, ClipboardList, ListChecks, Megaphone, Send, Users } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';

interface GuideStep {
    number: number;
    title: string;
    description: string;
    icon: any;
}

interface SurveyGuideProps {
    user: any;
}

export default function SurveyGuide({ user }: SurveyGuideProps) {
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
            title: t('Choose a topic'),
            description: t(
                'Decide what you want to learn from parents, teachers or students before writing the survey.',
            ),
            icon: Users,
        },
        {
            number: 2,
            title: t('Write clear questions'),
            description: t(
                'Keep questions short and focused. Use ratings, choices or open text to match the kind of answer you need.',
            ),
            icon: ClipboardList,
        },
        {
            number: 3,
            title: t('Set the audience and dates'),
            description: t('Pick who should respond and when the survey opens and closes so responses arrive in time.'),
            icon: Megaphone,
        },
        {
            number: 4,
            title: t('Share the survey'),
            description: t(
                'Make the survey active and share it through SMS, email or the parent app so respondents can answer.',
            ),
            icon: Send,
        },
        {
            number: 5,
            title: t('Review the results'),
            description: t(
                'Check response counts and average ratings, then act on the feedback to improve the school.',
            ),
            icon: ListChecks,
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
                                <CardTitle>{t('Survey Guide')}</CardTitle>
                                <CardDescription>
                                    {t('How to create, share and act on surveys for the school community.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Run better surveys')}</CardTitle>
                        <CardDescription>
                            {t('A short walkthrough of the steps from planning to acting on the results.')}
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
                            <li>{t('Short surveys get more responses - keep them under ten questions.')}</li>
                            <li>{t('Announce the survey before sharing it so respondents expect it.')}</li>
                            <li>{t('Close the survey on time and publish a short summary of the results.')}</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
