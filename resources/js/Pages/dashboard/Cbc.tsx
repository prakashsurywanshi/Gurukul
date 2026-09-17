import { FormEvent, useState } from 'react';
import { Award, BarChart3, ChartColumn, Compass, Plus, Shapes, Trash2, TrendingUp, Users } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useLanguage } from '../../i18n/LanguageProvider';

interface Strand {
    id: number;
    name: string;
    code: string | null;
    description: string | null;
    outcome_count: number;
}

interface Outcome {
    id: number;
    name: string;
    code: string | null;
    description: string | null;
    strand_id: number;
    strand: string | null;
}

interface Pathway {
    id: number;
    name: string;
    code: string | null;
    description: string | null;
}

interface Competency {
    id: number;
    name: string;
    code: string | null;
    description: string | null;
    strand_id: number | null;
    strand: string | null;
}

interface Assessment {
    id: number;
    student_id: number;
    student: string;
    admission_no: string | null;
    strand_id: number | null;
    strand: string | null;
    outcome_id: number | null;
    outcome: string | null;
    competency_id: number | null;
    competency: string | null;
    level: string;
    notes: string | null;
    assessed_by: string | null;
    assessed_on: string | null;
}

interface CbcProps {
    user: any;
    tab: string;
    strands: Strand[];
    outcomes: Outcome[];
    pathways: Pathway[];
    competencies: Competency[];
    assessments: Assessment[];
    strandOptions: { id: number; name: string }[];
    outcomeOptions: { id: number; name: string; strand_id: number }[];
    competencyOptions: { id: number; name: string; strand_id: number }[];
    students: { id: number; name: string; admission_no: string }[];
    summary: { competencies: number; assessments: number; studentsAssessed: number; levels: Record<string, number> };
    reports: {
        byStrand: { id: number; name: string; assessments: number; levels: Record<string, number> }[];
        byOutcome: { id: number; name: string; assessments: number; levels: Record<string, number> }[];
        byCompetency: { id: number; name: string; assessments: number }[];
        proficiencyRate: number;
        levelTotals: Record<string, number>;
    };
}

type Tab = 'strands' | 'outcomes' | 'pathways' | 'competencies' | 'assessments' | 'dashboard' | 'reports';

const LEVEL_LABELS: Record<string, string> = {
    emerging: 'Emerging',
    developing: 'Developing',
    proficient: 'Proficient',
    advanced: 'Advanced',
};

const LEVEL_STYLES: Record<string, string> = {
    emerging: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
    developing: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    proficient: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    advanced: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
};

const LEVEL_BARS: Record<string, string> = {
    emerging: 'bg-slate-400',
    developing: 'bg-sky-500',
    proficient: 'bg-emerald-500',
    advanced: 'bg-indigo-500',
};

export default function Cbc(pageProps: CbcProps) {
    const { t } = useLanguage();
    const {
        user,
        tab,
        strands,
        outcomes,
        pathways,
        competencies,
        assessments,
        strandOptions,
        outcomeOptions,
        competencyOptions,
        students,
        summary,
        reports,
    } = pageProps;
    const [activeTab, setActiveTab] = useState<Tab>(tab as Tab);
    const [strandForm, setStrandForm] = useState({ name: '', code: '', description: '' });
    const [outcomeForm, setOutcomeForm] = useState({ name: '', code: '', description: '', cbc_strand_id: '' });
    const [pathwayForm, setPathwayForm] = useState({ name: '', code: '', description: '' });
    const [competencyForm, setCompetencyForm] = useState({ name: '', code: '', description: '', cbc_strand_id: '' });
    const [assessmentForm, setAssessmentForm] = useState({
        student_id: '',
        cbc_strand_id: '',
        cbc_learning_outcome_id: '',
        cbc_competency_id: '',
        level: 'developing',
        assessed_on: new Date().toISOString().slice(0, 10),
        notes: '',
    });

    const switchTab = (next: Tab) => {
        setActiveTab(next);
        router.get('/cbc', { tab: next }, { preserveState: true, preserveScroll: true });
    };

    const submitStrand = (event: FormEvent) => {
        event.preventDefault();
        router.post('/cbc/strand', strandForm, {
            preserveScroll: true,
            onSuccess: () => setStrandForm({ name: '', code: '', description: '' }),
        });
    };

    const submitOutcome = (event: FormEvent) => {
        event.preventDefault();
        if (!outcomeForm.cbc_strand_id) {
            return;
        }
        router.post(
            '/cbc/outcome',
            { ...outcomeForm, cbc_strand_id: Number(outcomeForm.cbc_strand_id) },
            {
                preserveScroll: true,
                onSuccess: () => setOutcomeForm({ name: '', code: '', description: '', cbc_strand_id: '' }),
            },
        );
    };

    const submitPathway = (event: FormEvent) => {
        event.preventDefault();
        router.post('/cbc/pathway', pathwayForm, {
            preserveScroll: true,
            onSuccess: () => setPathwayForm({ name: '', code: '', description: '' }),
        });
    };

    const submitCompetency = (event: FormEvent) => {
        event.preventDefault();
        router.post(
            '/cbc/competency',
            {
                ...competencyForm,
                cbc_strand_id: competencyForm.cbc_strand_id ? Number(competencyForm.cbc_strand_id) : null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setCompetencyForm({ name: '', code: '', description: '', cbc_strand_id: '' }),
            },
        );
    };

    const submitAssessment = (event: FormEvent) => {
        event.preventDefault();
        if (!assessmentForm.student_id) {
            return;
        }
        router.post(
            '/cbc/assessment',
            {
                student_id: Number(assessmentForm.student_id),
                cbc_strand_id: assessmentForm.cbc_strand_id ? Number(assessmentForm.cbc_strand_id) : null,
                cbc_learning_outcome_id: assessmentForm.cbc_learning_outcome_id
                    ? Number(assessmentForm.cbc_learning_outcome_id)
                    : null,
                cbc_competency_id: assessmentForm.cbc_competency_id ? Number(assessmentForm.cbc_competency_id) : null,
                level: assessmentForm.level,
                assessed_on: assessmentForm.assessed_on,
                notes: assessmentForm.notes,
            },
            {
                preserveScroll: true,
                onSuccess: () =>
                    setAssessmentForm({
                        student_id: '',
                        cbc_strand_id: '',
                        cbc_learning_outcome_id: '',
                        cbc_competency_id: '',
                        level: 'developing',
                        assessed_on: new Date().toISOString().slice(0, 10),
                        notes: '',
                    }),
            },
        );
    };

    const remove = (type: 'strand' | 'outcome' | 'pathway' | 'competency', id: number, name: string) => {
        if (!window.confirm(`Delete ${type} "${name}"?`)) {
            return;
        }
        router.delete('/cbc/item', { data: { type, id }, preserveScroll: true });
    };

    const removeAssessment = (assessment: Assessment) => {
        if (!window.confirm(`Delete assessment for "${assessment.student}"?`)) {
            return;
        }
        router.delete(`/cbc/assessment/${assessment.id}`, { preserveScroll: true });
    };

    const levelTotal = Object.values(summary.levels ?? {}).reduce((sum, value) => sum + value, 0);
    const maxLevel = Math.max(1, ...Object.values(summary.levels ?? {}));

    const tabs: { key: Tab; label: string; icon: typeof Shapes }[] = [
        { key: 'strands', label: 'Strands', icon: Shapes },
        { key: 'outcomes', label: 'Learning Outcomes', icon: TrendingUp },
        { key: 'pathways', label: 'Pathways', icon: Compass },
        { key: 'competencies', label: 'Core Competencies', icon: Award },
        { key: 'assessments', label: 'Assessments', icon: Users },
        { key: 'dashboard', label: 'Dashboard', icon: ChartColumn },
        { key: 'reports', label: 'Reports', icon: BarChart3 },
    ];

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        <Shapes className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        CBC (Competency Based Curriculum)
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Manage strands, learning outcomes, core competencies, pathways and assessments.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {tabs.map((tabItem) => {
                        const Icon = tabItem.icon;
                        return (
                            <Button
                                key={tabItem.key}
                                variant={activeTab === tabItem.key ? 'default' : 'outline'}
                                onClick={() => switchTab(tabItem.key)}
                            >
                                <Icon className="mr-2 h-4 w-4" />
                                {tabItem.label}
                            </Button>
                        );
                    })}
                </div>

                {activeTab === 'dashboard' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('CBC Overview')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Strands')}</p>
                                        <p className="text-2xl font-bold">{strands.length}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Learning Outcomes')}</p>
                                        <p className="text-2xl font-bold">{outcomes.length}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Core Competencies')}</p>
                                        <p className="text-2xl font-bold">{summary.competencies}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Pathways')}</p>
                                        <p className="text-2xl font-bold">{pathways.length}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">{t('Competency Levels Distribution')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {Object.entries(LEVEL_LABELS).map(([level, label]) => {
                                            const count = summary.levels?.[level] ?? 0;
                                            return (
                                                <div key={level}>
                                                    <div className="mb-1 flex items-center justify-between text-sm">
                                                        <span className="text-gray-600 dark:text-gray-300">
                                                            {label}
                                                        </span>
                                                        <span className="text-gray-400">{count}</span>
                                                    </div>
                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                        <div
                                                            className="h-full rounded-full bg-indigo-500"
                                                            style={{ width: `${(count / maxLevel) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <p className="pt-2 text-xs text-gray-400">
                                            {summary.assessments} assessments recorded for {summary.studentsAssessed}{' '}
                                            students (
                                            {levelTotal && levelTotal > 0
                                                ? Math.round((summary.assessments / Math.max(1, levelTotal)) * 100)
                                                : 0}
                                            % coverage).
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">{t('Strand Coverage')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {strands.length === 0 && (
                                            <p className="py-6 text-center text-sm text-gray-400">{t('No strands yet.')}</p>
                                        )}
                                        {strands.map((strand) => {
                                            const assessed = assessments.filter(
                                                (assessment) => assessment.strand_id === strand.id,
                                            ).length;
                                            const pct = outcomes.length
                                                ? Math.min(
                                                      100,
                                                      Math.round(
                                                          (strand.outcome_count /
                                                              Math.max(
                                                                  1,
                                                                  outcomes.filter((o) => o.strand_id === strand.id)
                                                                      .length,
                                                              )) *
                                                              100,
                                                      ),
                                                  )
                                                : 0;
                                            return (
                                                <div key={strand.id}>
                                                    <div className="mb-1 flex items-center justify-between text-sm">
                                                        <span className="text-gray-600 dark:text-gray-300">
                                                            {strand.name}
                                                        </span>
                                                        <span className="text-gray-400">
                                                            {strand.outcome_count} outcomes · {assessed} assessed
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                        <div
                                                            className="h-full rounded-full bg-emerald-500"
                                                            style={{
                                                                width: `${assessed > 0 ? Math.min(100, (assessed / Math.max(1, strand.outcome_count)) * 100) : 2}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {(activeTab === 'strands' ||
                    activeTab === 'outcomes' ||
                    activeTab === 'pathways' ||
                    activeTab === 'competencies') && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {activeTab === 'strands' && t('Add Strand')}
                                {activeTab === 'outcomes' && t('Add Learning Outcome')}
                                {activeTab === 'pathways' && t('Add Pathway')}
                                {activeTab === 'competencies' && t('Add Core Competency')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {activeTab === 'strands' && (
                                <form
                                    onSubmit={submitStrand}
                                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
                                >
                                    <Input
                                        placeholder="Strand name *"
                                        required
                                        value={strandForm.name}
                                        onChange={(e) => setStrandForm({ ...strandForm, name: e.target.value })}
                                    />
                                    <Input
                                        placeholder={t('Code')}
                                        value={strandForm.code}
                                        onChange={(e) => setStrandForm({ ...strandForm, code: e.target.value })}
                                    />
                                    <div className="lg:col-span-2">
                                        <Input
                                            placeholder={t('Description')}
                                            value={strandForm.description}
                                            onChange={(e) =>
                                                setStrandForm({ ...strandForm, description: e.target.value })
                                            }
                                        />
                                    </div>
                                    <Button type="submit">
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Add')}</Button>
                                </form>
                            )}

                            {activeTab === 'outcomes' && (
                                <form
                                    onSubmit={submitOutcome}
                                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
                                >
                                    <Select
                                        value={outcomeForm.cbc_strand_id}
                                        onValueChange={(value) =>
                                            setOutcomeForm({ ...outcomeForm, cbc_strand_id: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Strand *" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {strandOptions.map((strand) => (
                                                <SelectItem key={strand.id} value={String(strand.id)}>
                                                    {strand.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder="Outcome name *"
                                        required
                                        value={outcomeForm.name}
                                        onChange={(e) => setOutcomeForm({ ...outcomeForm, name: e.target.value })}
                                    />
                                    <Input
                                        placeholder={t('Code')}
                                        value={outcomeForm.code}
                                        onChange={(e) => setOutcomeForm({ ...outcomeForm, code: e.target.value })}
                                    />
                                    <Input
                                        placeholder={t('Description')}
                                        value={outcomeForm.description}
                                        onChange={(e) =>
                                            setOutcomeForm({ ...outcomeForm, description: e.target.value })
                                        }
                                    />
                                    <Button type="submit">
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Add')}</Button>
                                </form>
                            )}

                            {activeTab === 'pathways' && (
                                <form
                                    onSubmit={submitPathway}
                                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
                                >
                                    <Input
                                        placeholder="Pathway name *"
                                        required
                                        value={pathwayForm.name}
                                        onChange={(e) => setPathwayForm({ ...pathwayForm, name: e.target.value })}
                                    />
                                    <Input
                                        placeholder={t('Code')}
                                        value={pathwayForm.code}
                                        onChange={(e) => setPathwayForm({ ...pathwayForm, code: e.target.value })}
                                    />
                                    <div className="lg:col-span-2">
                                        <Input
                                            placeholder={t('Description')}
                                            value={pathwayForm.description}
                                            onChange={(e) =>
                                                setPathwayForm({ ...pathwayForm, description: e.target.value })
                                            }
                                        />
                                    </div>
                                    <Button type="submit">
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Add')}</Button>
                                </form>
                            )}

                            {activeTab === 'competencies' && (
                                <form
                                    onSubmit={submitCompetency}
                                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
                                >
                                    <Input
                                        placeholder="Competency name *"
                                        required
                                        value={competencyForm.name}
                                        onChange={(e) => setCompetencyForm({ ...competencyForm, name: e.target.value })}
                                    />
                                    <Input
                                        placeholder={t('Code')}
                                        value={competencyForm.code}
                                        onChange={(e) => setCompetencyForm({ ...competencyForm, code: e.target.value })}
                                    />
                                    <Select
                                        value={competencyForm.cbc_strand_id}
                                        onValueChange={(value) =>
                                            setCompetencyForm({ ...competencyForm, cbc_strand_id: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Strand (optional)')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {strandOptions.map((strand) => (
                                                <SelectItem key={strand.id} value={String(strand.id)}>
                                                    {strand.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="lg:col-span-2">
                                        <Input
                                            placeholder={t('Description')}
                                            value={competencyForm.description}
                                            onChange={(e) =>
                                                setCompetencyForm({ ...competencyForm, description: e.target.value })
                                            }
                                        />
                                    </div>
                                    <Button type="submit">
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Add')}</Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'assessments' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Record Assessment')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={submitAssessment}
                                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                            >
                                <div className="space-y-1">
                                    <Label>Student *</Label>
                                    <Select
                                        value={assessmentForm.student_id}
                                        onValueChange={(value) =>
                                            setAssessmentForm({ ...assessmentForm, student_id: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select student')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {students.map((student) => (
                                                <SelectItem key={student.id} value={String(student.id)}>
                                                    {student.name}{' '}
                                                    {student.admission_no ? `(${student.admission_no})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Level')}</Label>
                                    <Select
                                        value={assessmentForm.level}
                                        onValueChange={(value) =>
                                            setAssessmentForm({ ...assessmentForm, level: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Assessed On')}</Label>
                                    <Input
                                        type="date"
                                        value={assessmentForm.assessed_on}
                                        onChange={(e) =>
                                            setAssessmentForm({ ...assessmentForm, assessed_on: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Strand')}</Label>
                                    <Select
                                        value={assessmentForm.cbc_strand_id}
                                        onValueChange={(value) =>
                                            setAssessmentForm({
                                                ...assessmentForm,
                                                cbc_strand_id: value,
                                                cbc_learning_outcome_id: '',
                                                cbc_competency_id: '',
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Optional')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {strandOptions.map((strand) => (
                                                <SelectItem key={strand.id} value={String(strand.id)}>
                                                    {strand.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Learning Outcome')}</Label>
                                    <Select
                                        value={assessmentForm.cbc_learning_outcome_id}
                                        onValueChange={(value) =>
                                            setAssessmentForm({ ...assessmentForm, cbc_learning_outcome_id: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Optional')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(assessmentForm.cbc_strand_id
                                                ? outcomeOptions.filter(
                                                      (o) => o.strand_id === Number(assessmentForm.cbc_strand_id),
                                                  )
                                                : outcomeOptions
                                            ).map((outcome) => (
                                                <SelectItem key={outcome.id} value={String(outcome.id)}>
                                                    {outcome.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Core Competency')}</Label>
                                    <Select
                                        value={assessmentForm.cbc_competency_id}
                                        onValueChange={(value) =>
                                            setAssessmentForm({ ...assessmentForm, cbc_competency_id: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Optional')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(assessmentForm.cbc_strand_id
                                                ? competencyOptions.filter(
                                                      (c) => c.strand_id === Number(assessmentForm.cbc_strand_id),
                                                  )
                                                : competencyOptions
                                            ).map((competency) => (
                                                <SelectItem key={competency.id} value={String(competency.id)}>
                                                    {competency.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Notes')}</Label>
                                    <Input
                                        placeholder={t('Notes (optional)')}
                                        value={assessmentForm.notes}
                                        onChange={(e) =>
                                            setAssessmentForm({ ...assessmentForm, notes: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button type="submit">
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Record')}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardContent className="p-0">
                        {activeTab === 'strands' && (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {strands.length === 0 && (
                                    <li className="py-10 text-center text-gray-400">{t('No strands yet.')}</li>
                                )}
                                {strands.map((strand) => (
                                    <li key={strand.id} className="flex items-start justify-between gap-4 p-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {strand.name}
                                                </span>
                                                {strand.code && <Badge variant="outline">{strand.code}</Badge>}
                                                <Badge variant="secondary">{strand.outcome_count} outcomes</Badge>
                                            </div>
                                            {strand.description && (
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {strand.description}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-rose-500 hover:text-rose-600"
                                            onClick={() => remove('strand', strand.id, strand.name)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">{t('Delete')}</span>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {activeTab === 'outcomes' && (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {outcomes.length === 0 && (
                                    <li className="py-10 text-center text-gray-400">{t('No learning outcomes yet.')}</li>
                                )}
                                {outcomes.map((outcome) => (
                                    <li key={outcome.id} className="flex items-start justify-between gap-4 p-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {outcome.name}
                                                </span>
                                                {outcome.code && <Badge variant="outline">{outcome.code}</Badge>}
                                                {outcome.strand && <Badge variant="secondary">{outcome.strand}</Badge>}
                                            </div>
                                            {outcome.description && (
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {outcome.description}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-rose-500 hover:text-rose-600"
                                            onClick={() => remove('outcome', outcome.id, outcome.name)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">{t('Delete')}</span>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {activeTab === 'pathways' && (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {pathways.length === 0 && (
                                    <li className="py-10 text-center text-gray-400">{t('No pathways yet.')}</li>
                                )}
                                {pathways.map((pathway) => (
                                    <li key={pathway.id} className="flex items-start justify-between gap-4 p-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {pathway.name}
                                                </span>
                                                {pathway.code && <Badge variant="outline">{pathway.code}</Badge>}
                                            </div>
                                            {pathway.description && (
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {pathway.description}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-rose-500 hover:text-rose-600"
                                            onClick={() => remove('pathway', pathway.id, pathway.name)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">{t('Delete')}</span>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {activeTab === 'competencies' && (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {competencies.length === 0 && (
                                    <li className="py-10 text-center text-gray-400">{t('No core competencies yet.')}</li>
                                )}
                                {competencies.map((competency) => (
                                    <li key={competency.id} className="flex items-start justify-between gap-4 p-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {competency.name}
                                                </span>
                                                {competency.code && <Badge variant="outline">{competency.code}</Badge>}
                                                {competency.strand && (
                                                    <Badge variant="secondary">{competency.strand}</Badge>
                                                )}
                                            </div>
                                            {competency.description && (
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {competency.description}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-rose-500 hover:text-rose-600"
                                            onClick={() => remove('competency', competency.id, competency.name)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">{t('Delete')}</span>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {activeTab === 'assessments' && (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {assessments.length === 0 && (
                                    <li className="py-10 text-center text-gray-400">{t('No assessments recorded yet.')}</li>
                                )}
                                {assessments.map((assessment) => (
                                    <li key={assessment.id} className="flex items-start justify-between gap-4 p-4">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {assessment.student}
                                                </span>
                                                {assessment.admission_no && (
                                                    <Badge variant="outline">{assessment.admission_no}</Badge>
                                                )}
                                                <Badge className={LEVEL_STYLES[assessment.level] ?? ''}>
                                                    {LEVEL_LABELS[assessment.level] ?? assessment.level}
                                                </Badge>
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                {assessment.strand && (
                                                    <Badge variant="secondary">{assessment.strand}</Badge>
                                                )}
                                                {assessment.outcome && (
                                                    <Badge variant="secondary">{assessment.outcome}</Badge>
                                                )}
                                                {assessment.competency && (
                                                    <Badge variant="secondary">{assessment.competency}</Badge>
                                                )}
                                            </div>
                                            {assessment.notes && (
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {assessment.notes}
                                                </p>
                                            )}
                                            <p className="mt-1 text-xs text-gray-400">
                                                {assessment.assessed_on ?? '—'}{' '}
                                                {assessment.assessed_by ? `by ${assessment.assessed_by}` : ''}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-rose-500 hover:text-rose-600"
                                            onClick={() => removeAssessment(assessment)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">{t('Delete')}</span>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {activeTab === 'reports' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Proficiency Rate')}</p>
                                    <p className="text-2xl font-bold">{reports.proficiencyRate}%</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Assessments')}</p>
                                    <p className="text-2xl font-bold">{summary.assessments}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Students Assessed')}</p>
                                    <p className="text-2xl font-bold">{summary.studentsAssessed}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Strands Reported')}</p>
                                    <p className="text-2xl font-bold">
                                        {reports.byStrand.filter((report) => report.assessments > 0).length}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Assessment Level Distribution')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {Object.entries(reports.levelTotals).map(([level, count]) => {
                                    const max = Math.max(1, ...Object.values(reports.levelTotals));
                                    return (
                                        <div key={level}>
                                            <div className="mb-1 flex items-center justify-between text-sm">
                                                <Badge className={LEVEL_STYLES[level] ?? ''}>
                                                    {LEVEL_LABELS[level] ?? level}
                                                </Badge>
                                                <span className="font-medium">{count}</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                                                <div
                                                    className={`h-2 rounded-full ${LEVEL_BARS[level] ?? 'bg-indigo-500'}`}
                                                    style={{ width: `${(count / max) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Strand-wise Report')}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {reports.byStrand.filter((report) => report.assessments > 0).length === 0 ? (
                                    <p className="py-10 text-center text-gray-400">{t('No assessment data recorded yet.')}</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                <th className="py-2 pr-4">{t('Strand')}</th>
                                                <th className="py-2 pr-4">{t('Assessments')}</th>
                                                {Object.keys(LEVEL_LABELS).map((level) => (
                                                    <th key={level} className="py-2 pr-4">
                                                        {LEVEL_LABELS[level]}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reports.byStrand
                                                .filter((report) => report.assessments > 0)
                                                .map((report) => (
                                                    <tr key={report.id} className="border-b last:border-0">
                                                        <td className="py-2 pr-4 font-medium">{report.name}</td>
                                                        <td className="py-2 pr-4">{report.assessments}</td>
                                                        {Object.keys(LEVEL_LABELS).map((level) => (
                                                            <td key={level} className="py-2 pr-4">
                                                                {report.levels[level] ?? 0}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Top Learning Outcomes')}</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {reports.byOutcome.length === 0 ? (
                                        <p className="py-10 text-center text-gray-400">{t('No outcome data recorded yet.')}</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {reports.byOutcome.map((report) => (
                                                <li
                                                    key={report.id}
                                                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium">{report.name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {report.assessments} assessments
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 flex-wrap gap-1">
                                                        {Object.keys(LEVEL_LABELS).map((level) =>
                                                            (report.levels[level] ?? 0) > 0 ? (
                                                                <Badge
                                                                    key={level}
                                                                    className={LEVEL_STYLES[level] ?? ''}
                                                                >
                                                                    {report.levels[level]}
                                                                </Badge>
                                                            ) : null,
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Top Core Competencies')}</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {reports.byCompetency.length === 0 ? (
                                        <p className="py-10 text-center text-gray-400">
                                            No competency data recorded yet.
                                        </p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {reports.byCompetency.map((report) => (
                                                <li
                                                    key={report.id}
                                                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                                                >
                                                    <span className="truncate text-sm font-medium">{report.name}</span>
                                                    <Badge variant="outline">{report.assessments} assessments</Badge>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
