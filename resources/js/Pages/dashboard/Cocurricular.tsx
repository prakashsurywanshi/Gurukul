import { router, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Award, Edit, Loader2, Plus, Save, Star, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';

interface CocurricularArea {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
}

interface CocurricularGrade {
    id: number;
    name: string;
    description: string | null;
    min_percentage: number | null;
    max_percentage: number | null;
    sort_order: number;
}

interface CocurricularProps {
    user: any;
    areas: CocurricularArea[];
    grades: CocurricularGrade[];
}

type ActiveTab = 'areas' | 'grades';

const defaultAreaForm = { name: '', description: '', is_active: true, sort_order: 0 };
const defaultGradeForm = { name: '', description: '', min_percentage: '', max_percentage: '', sort_order: 0 };

export default function Cocurricular({ user, areas, grades }: CocurricularProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash ?? {};

    const [activeTab, setActiveTab] = useState<ActiveTab>('areas');
    const [showAreaForm, setShowAreaForm] = useState(false);
    const [showGradeForm, setShowGradeForm] = useState(false);
    const [editingArea, setEditingArea] = useState<CocurricularArea | null>(null);
    const [editingGrade, setEditingGrade] = useState<CocurricularGrade | null>(null);
    const [areaForm, setAreaForm] = useState(defaultAreaForm);
    const [gradeForm, setGradeForm] = useState(defaultGradeForm);
    const [isSaving, setIsSaving] = useState(false);

    const resetAreaForm = () => {
        setAreaForm(defaultAreaForm);
        setEditingArea(null);
        setShowAreaForm(false);
    };

    const resetGradeForm = () => {
        setGradeForm(defaultGradeForm);
        setEditingGrade(null);
        setShowGradeForm(false);
    };

    const handleAreaSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);

        if (editingArea) {
            router.put(
                `/cocurricular/areas/${editingArea.id}`,
                { ...areaForm },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        resetAreaForm();
                        setIsSaving(false);
                    },
                    onError: () => setIsSaving(false),
                },
            );
        } else {
            router.post(
                '/cocurricular/areas',
                { ...areaForm },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        resetAreaForm();
                        setIsSaving(false);
                    },
                    onError: () => setIsSaving(false),
                },
            );
        }
    };

    const handleGradeSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);

        if (editingGrade) {
            router.put(
                `/cocurricular/grades/${editingGrade.id}`,
                {
                    ...gradeForm,
                    min_percentage: gradeForm.min_percentage === '' ? null : Number(gradeForm.min_percentage),
                    max_percentage: gradeForm.max_percentage === '' ? null : Number(gradeForm.max_percentage),
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        resetGradeForm();
                        setIsSaving(false);
                    },
                    onError: () => setIsSaving(false),
                },
            );
        } else {
            router.post(
                '/cocurricular/grades',
                {
                    ...gradeForm,
                    min_percentage: gradeForm.min_percentage === '' ? null : Number(gradeForm.min_percentage),
                    max_percentage: gradeForm.max_percentage === '' ? null : Number(gradeForm.max_percentage),
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        resetGradeForm();
                        setIsSaving(false);
                    },
                    onError: () => setIsSaving(false),
                },
            );
        }
    };

    return (
        <DashboardLayout user={user} activeTab="cocurricular">
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            {t('co_curricular')} <span className="sr-only">Co-Curricular</span>
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Manage co-curricular activity areas and grading scales.
                        </p>
                    </div>
                </div>

                {flash.success && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                )}
                {flash.error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        {flash.error}
                    </div>
                )}

                <div className="flex gap-2 border-b border-slate-200 pb-0">
                    {(
                        [
                            { key: 'areas', label: 'Areas', icon: Award },
                            { key: 'grades', label: 'Grading Scales', icon: Star },
                        ] as const
                    ).map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                                activeTab === key
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>

                {activeTab === 'areas' && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Co-Curricular Areas</CardTitle>
                                <CardDescription>
                                    Activity areas such as Sports, Music, Art, Dance, Debate, etc.
                                </CardDescription>
                            </div>
                            <Button
                                onClick={() => {
                                    resetAreaForm();
                                    setShowAreaForm(true);
                                }}
                            >
                                <Plus className="h-4 w-4" /> Add Area
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {showAreaForm && (
                                <form
                                    onSubmit={handleAreaSubmit}
                                    className="mb-6 space-y-4 rounded-lg border bg-slate-50 p-4"
                                >
                                    <div>
                                        <Label htmlFor="area-name">Area Name</Label>
                                        <Input
                                            id="area-name"
                                            value={areaForm.name}
                                            onChange={(e) => setAreaForm((prev) => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Sports, Music, Dance"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="area-desc">Description</Label>
                                        <Input
                                            id="area-desc"
                                            value={areaForm.description}
                                            onChange={(e) =>
                                                setAreaForm((prev) => ({ ...prev, description: e.target.value }))
                                            }
                                            placeholder="Optional description"
                                        />
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <Label>Active</Label>
                                            <Switch
                                                checked={areaForm.is_active}
                                                onCheckedChange={(checked) =>
                                                    setAreaForm((prev) => ({ ...prev, is_active: checked }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="area-sort">Sort Order</Label>
                                            <Input
                                                id="area-sort"
                                                type="number"
                                                min={0}
                                                className="w-24"
                                                value={areaForm.sort_order}
                                                onChange={(e) =>
                                                    setAreaForm((prev) => ({
                                                        ...prev,
                                                        sort_order: Number(e.target.value),
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="submit" disabled={isSaving}>
                                            {isSaving ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                            {editingArea ? 'Update' : 'Create'}
                                        </Button>
                                        <Button type="button" variant="outline" onClick={resetAreaForm}>
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {areas.length > 0 ? (
                                <div className="divide-y divide-slate-200 rounded-lg border">
                                    {areas.map((area) => (
                                        <div key={area.id} className="flex items-center justify-between px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Award className="h-4 w-4 text-slate-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{area.name}</p>
                                                    {area.description && (
                                                        <p className="text-xs text-slate-500">{area.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={area.is_active ? 'default' : 'secondary'}>
                                                    {area.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingArea(area);
                                                        setAreaForm({
                                                            name: area.name,
                                                            description: area.description ?? '',
                                                            is_active: area.is_active,
                                                            sort_order: area.sort_order,
                                                        });
                                                        setShowAreaForm(true);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-rose-600 hover:text-rose-700"
                                                    onClick={() => router.delete(`/cocurricular/areas/${area.id}`)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="py-8 text-center text-sm text-slate-500">
                                    No co-curricular areas defined yet.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'grades' && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Co-Curricular Grades</CardTitle>
                                <CardDescription>
                                    Grading scales used to evaluate co-curricular performance.
                                </CardDescription>
                            </div>
                            <Button
                                onClick={() => {
                                    resetGradeForm();
                                    setShowGradeForm(true);
                                }}
                            >
                                <Plus className="h-4 w-4" /> Add Grade
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {showGradeForm && (
                                <form
                                    onSubmit={handleGradeSubmit}
                                    className="mb-6 space-y-4 rounded-lg border bg-slate-50 p-4"
                                >
                                    <div>
                                        <Label htmlFor="grade-name">Grade Name</Label>
                                        <Input
                                            id="grade-name"
                                            value={gradeForm.name}
                                            onChange={(e) =>
                                                setGradeForm((prev) => ({ ...prev, name: e.target.value }))
                                            }
                                            placeholder="e.g. A+, A, B+, B, C"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="grade-desc">Description</Label>
                                        <Input
                                            id="grade-desc"
                                            value={gradeForm.description}
                                            onChange={(e) =>
                                                setGradeForm((prev) => ({ ...prev, description: e.target.value }))
                                            }
                                            placeholder="Optional description"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <Label htmlFor="grade-min">Min %</Label>
                                            <Input
                                                id="grade-min"
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.01}
                                                value={gradeForm.min_percentage}
                                                onChange={(e) =>
                                                    setGradeForm((prev) => ({
                                                        ...prev,
                                                        min_percentage: e.target.value,
                                                    }))
                                                }
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Label htmlFor="grade-max">Max %</Label>
                                            <Input
                                                id="grade-max"
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.01}
                                                value={gradeForm.max_percentage}
                                                onChange={(e) =>
                                                    setGradeForm((prev) => ({
                                                        ...prev,
                                                        max_percentage: e.target.value,
                                                    }))
                                                }
                                                placeholder="100"
                                            />
                                        </div>
                                        <div className="w-28">
                                            <Label htmlFor="grade-sort">Sort</Label>
                                            <Input
                                                id="grade-sort"
                                                type="number"
                                                min={0}
                                                value={gradeForm.sort_order}
                                                onChange={(e) =>
                                                    setGradeForm((prev) => ({
                                                        ...prev,
                                                        sort_order: Number(e.target.value),
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="submit" disabled={isSaving}>
                                            {isSaving ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                            {editingGrade ? 'Update' : 'Create'}
                                        </Button>
                                        <Button type="button" variant="outline" onClick={resetGradeForm}>
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {grades.length > 0 ? (
                                <div className="divide-y divide-slate-200 rounded-lg border">
                                    {grades.map((grade) => (
                                        <div key={grade.id} className="flex items-center justify-between px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Star className="h-4 w-4 text-amber-500" />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{grade.name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {grade.min_percentage != null && grade.max_percentage != null
                                                            ? `${grade.min_percentage}% – ${grade.max_percentage}%`
                                                            : (grade.description ?? 'No range set')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingGrade(grade);
                                                        setGradeForm({
                                                            name: grade.name,
                                                            description: grade.description ?? '',
                                                            min_percentage:
                                                                grade.min_percentage != null
                                                                    ? String(grade.min_percentage)
                                                                    : '',
                                                            max_percentage:
                                                                grade.max_percentage != null
                                                                    ? String(grade.max_percentage)
                                                                    : '',
                                                            sort_order: grade.sort_order,
                                                        });
                                                        setShowGradeForm(true);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-rose-600 hover:text-rose-700"
                                                    onClick={() => router.delete(`/cocurricular/grades/${grade.id}`)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="py-8 text-center text-sm text-slate-500">
                                    No co-curricular grades defined yet.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
