import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { ClipboardList, MessageSquareText, Plus, ShieldCheck, Trash2, Vote } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

type SurveyQuestion = { id: number; question: string; type: string; options: string[]; sortOrder: number };
type SurveyRow = {
    id: number;
    title: string;
    description: string | null;
    audience: string;
    status: string;
    startsOn: string | null;
    endsOn: string | null;
    questions: SurveyQuestion[];
    responsesCount: number;
    avgRating: number | null;
};

export type SurveysProps = {
    user: any;
    surveys: SurveyRow[];
    myResponses: number[];
    summary: { activeSurveys: number; totalResponses: number; mySurveys: number };
    canManage: boolean;
};

const QUESTION_TYPES = { rating: 'Rating (1-5)', choice: 'Choice', yesno: 'Yes / No', text: 'Text Answer' };

export default function Surveys({ user, surveys, myResponses, summary, canManage }: SurveysProps) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
    const [responseSurvey, setResponseSurvey] = useState<SurveyRow | null>(null);
    const [answers, setAnswers] = useState<
        Record<number, { rating?: number; answer_text?: string; choices?: string[] }>
    >({});

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [audience, setAudience] = useState('staff');
    const [status, setStatus] = useState('active');
    const [startsOn, setStartsOn] = useState('');
    const [endsOn, setEndsOn] = useState('');
    const [questions, setQuestions] = useState<{ question: string; type: string; options: string }[]>([
        { question: '', type: 'rating', options: '' },
    ]);
    const [saving, setSaving] = useState(false);

    const visible = activeTab === 'all' ? surveys : surveys.filter((survey) => myResponses.includes(survey.id));
    const handled = myResponses;

    const openRespond = (survey: SurveyRow) => {
        setResponseSurvey(survey);
        setAnswers({});
    };

    const submitResponse = () => {
        if (!responseSurvey) return;
        const payloadAnswers = responseSurvey.questions.map((question) => {
            const answer = answers[question.id] ?? {};
            return {
                question_id: question.id,
                rating: answer.rating ?? null,
                answer_text: answer.answer_text ?? null,
                choices: answer.choices ?? null,
            };
        });
        setSaving(true);
        router.post(
            '/surveys/respond',
            { survey_id: responseSurvey.id, answers: payloadAnswers },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setResponseSurvey(null);
                    toast.success(t('Survey submitted.'));
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const submitSurvey = () => {
        if (!title.trim()) {
            toast.error(t('Survey title is required.'));
            return;
        }
        const cleanQuestions = questions.filter((question) => question.question.trim());
        if (cleanQuestions.length === 0) {
            toast.error(t('Add at least one question.'));
            return;
        }
        setSaving(true);
        router.post(
            '/surveys',
            {
                title: title.trim(),
                description: description.trim() || null,
                audience,
                status,
                starts_on: startsOn || null,
                ends_on: endsOn || null,
                questions: cleanQuestions.map((question) => ({
                    question: question.question,
                    type: question.type,
                    options:
                        question.type === 'choice'
                            ? question.options
                                  .split(',')
                                  .map((option) => option.trim())
                                  .filter(Boolean)
                            : [],
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setTitle('');
                    setDescription('');
                    setAudience('staff');
                    setStatus('active');
                    setStartsOn('');
                    setEndsOn('');
                    setQuestions([{ question: '', type: 'rating', options: '' }]);
                    toast.success(t('Survey created.'));
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const removeSurvey = (survey: SurveyRow) => {
        if (!window.confirm(t('Delete this survey and all its responses?'))) return;
        router.delete(`/surveys/${survey.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Survey deleted.')),
        });
    };

    const toggleStatus = (survey: SurveyRow) => {
        router.put(
            `/surveys/${survey.id}`,
            { status: survey.status === 'active' ? 'closed' : 'active' },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(t('Survey updated.')),
            },
        );
    };

    return (
        <DashboardLayout user={user} pageTitle={t('Surveys')}>
            <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Active Surveys')}</p>
                                <p className="text-2xl font-bold">{summary.activeSurveys}</p>
                            </div>
                            <ClipboardList className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Total Responses')}</p>
                                <p className="text-2xl font-bold">{summary.totalResponses}</p>
                            </div>
                            <Vote className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Available to Me')}</p>
                                <p className="text-2xl font-bold">{summary.mySurveys}</p>
                            </div>
                            <MessageSquareText className="h-5 w-5" />
                        </CardContent>
                    </Card>
                </div>

                {canManage && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Create Survey')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-1">
                                    <Label>{t('Title')}</Label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={t('e.g. Staff Satisfaction Survey')}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Audience')}</Label>
                                    <Select value={audience} onValueChange={setAudience}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="staff">{t('Staff')}</SelectItem>
                                            <SelectItem value="parent">{t('Parent')}</SelectItem>
                                            <SelectItem value="student">{t('Student')}</SelectItem>
                                            <SelectItem value="all">{t('All')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Status')}</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="closed">{t('Closed')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Starts On')}</Label>
                                    <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Ends On')}</Label>
                                    <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Description')}</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Questions')}</Label>
                                {questions.map((question, index) => (
                                    <div key={index} className="flex flex-wrap items-center gap-2">
                                        <Input
                                            value={question.question}
                                            onChange={(e) =>
                                                setQuestions((prev) =>
                                                    prev.map((q, i) =>
                                                        i === index ? { ...q, question: e.target.value } : q,
                                                    ),
                                                )
                                            }
                                            placeholder={t('Question text')}
                                            className="min-w-52 flex-1"
                                        />
                                        <Select
                                            value={question.type}
                                            onValueChange={(value) =>
                                                setQuestions((prev) =>
                                                    prev.map((q, i) => (i === index ? { ...q, type: value } : q)),
                                                )
                                            }
                                        >
                                            <SelectTrigger className="w-44">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(QUESTION_TYPES).map(([key, label]) => (
                                                    <SelectItem key={key} value={key}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {question.type === 'choice' && (
                                            <Input
                                                value={question.options}
                                                onChange={(e) =>
                                                    setQuestions((prev) =>
                                                        prev.map((q, i) =>
                                                            i === index ? { ...q, options: e.target.value } : q,
                                                        ),
                                                    )
                                                }
                                                placeholder={t('Options comma-separated, e.g. A, B, C')}
                                                className="min-w-52 flex-1"
                                            />
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setQuestions((prev) => [...prev, { question: '', type: 'rating', options: '' }])
                                    }
                                >
                                    <Plus className="mr-1 h-4 w-4" /> {t('Add Question')}
                                </Button>
                            </div>
                            <Button onClick={submitSurvey} disabled={saving}>
                                {saving ? t('Saving...') : t('Create Survey')}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>{t('Surveys')}</CardTitle>
                            <Select value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'my')}>
                                <SelectTrigger className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Surveys')}</SelectItem>
                                    <SelectItem value="my">{t('My Surveys')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {visible.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">{t('No surveys found.')}</p>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                            {visible.map((survey) => {
                                const responded = handled.includes(survey.id);
                                return (
                                    <div key={survey.id} className="space-y-3 rounded-lg border p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-medium">{survey.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {t('Audience')}: {t(survey.audience)} · {survey.questions.length}{' '}
                                                    {t('questions')} · {survey.responsesCount} {t('responses')}
                                                </p>
                                            </div>
                                            <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
                                                {t(survey.status)}
                                            </Badge>
                                        </div>
                                        {survey.description && (
                                            <p className="text-sm text-muted-foreground">{survey.description}</p>
                                        )}
                                        {survey.avgRating !== null && (
                                            <p className="text-sm">
                                                {t('Avg Rating')}:{' '}
                                                <Badge variant="secondary">{survey.avgRating}/5</Badge>
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2">
                                            {survey.status === 'active' && !responded && (
                                                <Button size="sm" onClick={() => openRespond(survey)}>
                                                    <Vote className="mr-1 h-4 w-4" /> {t('Answer')}
                                                </Button>
                                            )}
                                            {responded && (
                                                <Badge variant="secondary">
                                                    <ShieldCheck className="mr-1 h-3 w-3" /> {t('Responded')}
                                                </Badge>
                                            )}
                                            {canManage && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => toggleStatus(survey)}
                                                    >
                                                        {t(survey.status === 'active' ? 'Close' : 'Reopen')}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => removeSurvey(survey)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={responseSurvey !== null} onOpenChange={(open) => !open && setResponseSurvey(null)}>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{responseSurvey?.title}</DialogTitle>
                        <DialogDescription>
                            {t('Answer the questions below and submit your response.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {responseSurvey?.questions.map((question) => {
                            const answer = answers[question.id];
                            const renderAnswer = () => {
                                if (!answer) return null;
                                if (answer.rating) return <Badge variant="secondary">{answer.rating}/5</Badge>;
                                if (answer.choices?.length)
                                    return <Badge variant="secondary">{answer.choices.join(', ')}</Badge>;
                                if (answer.answer_text !== undefined)
                                    return <Badge variant="secondary">{answer.answer_text || '…'}</Badge>;
                                return null;
                            };
                            return (
                                <div key={question.id} className="space-y-2 rounded-lg border p-3">
                                    <p className="text-sm font-medium">{question.question}</p>
                                    {question.type === 'rating' && (
                                        <div className="flex items-center gap-2">
                                            {[1, 2, 3, 4, 5].map((value) => (
                                                <Button
                                                    key={value}
                                                    size="sm"
                                                    variant={
                                                        (answers[question.id]?.rating ?? 0) === value
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    onClick={() =>
                                                        setAnswers((prev) => ({
                                                            ...prev,
                                                            [question.id]: { rating: value },
                                                        }))
                                                    }
                                                >
                                                    {value}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                    {question.type === 'yesno' && (
                                        <div className="flex items-center gap-2">
                                            {['Yes', 'No'].map((option) => (
                                                <Button
                                                    key={option}
                                                    size="sm"
                                                    variant={
                                                        answers[question.id]?.choices?.[0] === option
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    onClick={() =>
                                                        setAnswers((prev) => ({
                                                            ...prev,
                                                            [question.id]: { choices: [option] },
                                                        }))
                                                    }
                                                >
                                                    {option}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                    {question.type === 'choice' && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            {question.options.map((option) => (
                                                <Button
                                                    key={option}
                                                    size="sm"
                                                    variant={
                                                        answers[question.id]?.choices?.includes(option)
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    onClick={() =>
                                                        setAnswers((prev) => ({
                                                            ...prev,
                                                            [question.id]: { choices: [option] },
                                                        }))
                                                    }
                                                >
                                                    {option}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                    {question.type === 'text' && (
                                        <Textarea
                                            value={answers[question.id]?.answer_text ?? ''}
                                            onChange={(e) =>
                                                setAnswers((prev) => ({
                                                    ...prev,
                                                    [question.id]: { answer_text: e.target.value },
                                                }))
                                            }
                                            rows={2}
                                            placeholder={t('Your answer')}
                                        />
                                    )}
                                    {renderAnswer()}
                                </div>
                            );
                        })}
                        <Button className="w-full" onClick={submitResponse} disabled={saving}>
                            {saving ? t('Submitting...') : t('Submit Survey')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
