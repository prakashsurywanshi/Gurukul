import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { Activity, HeartPulse, Loader2, Pencil, Plus, Ruler, Stethoscope, Trash2, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface HealthRecord {
    id: string;
    record_date: string;
    blood_group?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    blood_pressure?: string | null;
    pulse?: string | null;
    allergies?: string | null;
    medical_conditions?: string | null;
    medications?: string | null;
    remarks?: string | null;
    student?: {
        id: string;
        name: string;
        class?: string | null;
        section?: string | null;
    } | null;
    recorded_by?: string | null;
}

interface ClassGroup {
    label: string;
    students: Array<{ id: string; name: string }>;
}

interface StudentHealthProps {
    user: any;
    organization?: any;
    records: HealthRecord[];
    classGroups: ClassGroup[];
    selectedStudentId?: string | null;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function StudentHealth(pageProps: StudentHealthProps) {
    const { t } = useLanguage();
    const { props } = usePage();
    const { errors } = props as any;

    const user = pageProps.user;
    const records = pageProps.records ?? [];
    const classGroups = pageProps.classGroups ?? [];

    const canManage = ['admin', 'super_admin', 'teacher'].includes(user?.role);

    const [studentId, setStudentId] = useState<string>(pageProps.selectedStudentId ?? 'all');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<HealthRecord | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        student_id: '',
        record_date: new Date().toISOString().slice(0, 10),
        blood_group: '',
        height_cm: '',
        weight_kg: '',
        blood_pressure: '',
        pulse: '',
        allergies: '',
        medical_conditions: '',
        medications: '',
        remarks: '',
    });

    const filter = (value: string) => {
        setStudentId(value);
        router.visit('/student-health', {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            only: ['records', 'selectedStudentId'],
            data: { student_id: value !== 'all' ? value : undefined },
        });
    };

    const openCreate = () => {
        setEditing(null);
        setForm({
            student_id: studentId !== 'all' ? studentId : '',
            record_date: new Date().toISOString().slice(0, 10),
            blood_group: '',
            height_cm: '',
            weight_kg: '',
            blood_pressure: '',
            pulse: '',
            allergies: '',
            medical_conditions: '',
            medications: '',
            remarks: '',
        });
        setShowModal(true);
    };

    const openEdit = (record: HealthRecord) => {
        setEditing(record);
        setForm({
            student_id: record.student?.id ?? '',
            record_date: record.record_date,
            blood_group: record.blood_group ?? '',
            height_cm: record.height_cm != null ? String(record.height_cm) : '',
            weight_kg: record.weight_kg != null ? String(record.weight_kg) : '',
            blood_pressure: record.blood_pressure ?? '',
            pulse: record.pulse ?? '',
            allergies: record.allergies ?? '',
            medical_conditions: record.medical_conditions ?? '',
            medications: record.medications ?? '',
            remarks: record.remarks ?? '',
        });
        setShowModal(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            ...form,
            height_cm: form.height_cm !== '' ? form.height_cm : null,
            weight_kg: form.weight_kg !== '' ? form.weight_kg : null,
        };
        if (editing) {
            router.patch(`/student-health/${editing.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => setShowModal(false),
                onFinish: () => setSaving(false),
            });
        } else {
            router.post('/student-health', payload, {
                preserveScroll: true,
                onSuccess: () => setShowModal(false),
                onFinish: () => setSaving(false),
            });
        }
    };

    const remove = (record: HealthRecord) => {
        if (!window.confirm(t('Delete this health record?'))) return;
        setDeletingId(record.id);
        router.delete(`/student-health/${record.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {t('Student Health')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Maintain health checkup records, allergies and medical conditions for each student.')}
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Add Health Record')}
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                        <CardTitle className="flex items-center gap-2">
                            <HeartPulse className="h-5 w-5 text-blue-500" />
                            {t('Health Records')}
                        </CardTitle>
                        <Select value={studentId} onValueChange={filter}>
                            <SelectTrigger className="w-60">
                                <SelectValue placeholder={t('All Students')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All Students')}</SelectItem>
                                {classGroups.map((group) => (
                                    <div key={group.label}>
                                        <p className="px-2 py-1 text-xs font-semibold text-gray-400">{group.label}</p>
                                        {group.students.map((student) => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.name}
                                            </SelectItem>
                                        ))}
                                    </div>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {records.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                <Stethoscope className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                                {t('No health records found.')}
                            </div>
                        ) : (
                            records.map((record) => (
                                <div
                                    key={record.id}
                                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                                                <Activity className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {record.student?.name ?? '—'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {record.record_date}
                                                    {record.student?.class
                                                        ? ` · ${record.student.class}${record.student.section ? ` ${record.student.section}` : ''}`
                                                        : ''}
                                                </p>
                                            </div>
                                        </div>
                                        {canManage && (
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant="outline" onClick={() => openEdit(record)}>
                                                    <Pencil className="mr-1 h-3.5 w-3.5" />
                                                    {t('Edit')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => remove(record)}
                                                    disabled={deletingId === record.id}
                                                >
                                                    {deletingId === record.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800">
                                            <p className="text-[11px] text-gray-500">{t('Blood Group')}</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {record.blood_group || '—'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800">
                                            <p className="text-[11px] text-gray-500">{t('Height (cm)')}</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {record.height_cm ?? '—'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800">
                                            <p className="text-[11px] text-gray-500">{t('Weight (kg)')}</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {record.weight_kg ?? '—'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800">
                                            <p className="text-[11px] text-gray-500">{t('Blood Pressure')}</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {record.blood_pressure || '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {renderNote(t, 'Allergies', record.allergies)}
                                    {renderNote(t, 'Medical Conditions', record.medical_conditions)}
                                    {renderNote(t, 'Medications', record.medications)}
                                    {renderNote(t, 'Remarks', record.remarks)}

                                    {record.recorded_by && (
                                        <p className="mt-2 text-xs text-gray-400">
                                            {t('Recorded By')}: {record.recorded_by}
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editing ? t('Edit Health Record') : t('Add Health Record')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submit} className="space-y-4">
                            {editing ? (
                                <div>
                                    <Label>{t('Student')}</Label>
                                    <Input value={form.student_id} disabled className="bg-gray-50" />
                                </div>
                            ) : (
                                <div>
                                    <Label>{t('Student')} *</Label>
                                    <Select
                                        value={form.student_id}
                                        onValueChange={(v) => setForm({ ...form, student_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select student')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classGroups.map((group) => (
                                                <div key={group.label}>
                                                    <p className="px-2 py-1 text-xs font-semibold text-gray-400">
                                                        {group.label}
                                                    </p>
                                                    {group.students.map((student) => (
                                                        <SelectItem key={student.id} value={student.id}>
                                                            {student.name}
                                                        </SelectItem>
                                                    ))}
                                                </div>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.student_id && (
                                        <p className="mt-1 text-xs text-red-500">{errors.student_id}</p>
                                    )}
                                </div>
                            )}
                            <div>
                                <Label>{t('Record Date')}</Label>
                                <Input
                                    type="date"
                                    value={form.record_date}
                                    onChange={(e) => setForm({ ...form, record_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>{t('Blood Group')}</Label>
                                    <Select
                                        value={form.blood_group}
                                        onValueChange={(v) => setForm({ ...form, blood_group: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BLOOD_GROUPS.map((bg) => (
                                                <SelectItem key={bg} value={bg}>
                                                    {bg}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>{t('Blood Pressure')}</Label>
                                    <Input
                                        value={form.blood_pressure}
                                        onChange={(e) => setForm({ ...form, blood_pressure: e.target.value })}
                                        placeholder={t('e.g. 120/80')}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>{t('Height (cm)')}</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={form.height_cm}
                                        onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                                        placeholder={t('e.g. 145')}
                                    />
                                </div>
                                <div>
                                    <Label>{t('Weight (kg)')}</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={form.weight_kg}
                                        onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                                        placeholder={t('e.g. 35')}
                                    />
                                </div>
                                <div>
                                    <Label>{t('Pulse')}</Label>
                                    <Input
                                        value={form.pulse}
                                        onChange={(e) => setForm({ ...form, pulse: e.target.value })}
                                        placeholder={t('e.g. 72 bpm')}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('Allergies')}</Label>
                                <Textarea
                                    value={form.allergies}
                                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                                    rows={2}
                                    placeholder={t('e.g. Peanuts, dust, penicillin')}
                                />
                            </div>
                            <div>
                                <Label>{t('Medical Conditions')}</Label>
                                <Textarea
                                    value={form.medical_conditions}
                                    onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })}
                                    rows={2}
                                    placeholder={t('e.g. Asthma, requires inhaler during PE')}
                                />
                            </div>
                            <div>
                                <Label>{t('Medications')}</Label>
                                <Textarea
                                    value={form.medications}
                                    onChange={(e) => setForm({ ...form, medications: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div>
                                <Label>{t('Remarks')}</Label>
                                <Textarea
                                    value={form.remarks}
                                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editing ? t('Save Changes') : t('Save Record')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

function renderNote(t: (key: string) => string, label: string, value?: string | null) {
    if (!value) return null;
    return (
        <div className="mt-2 flex items-start gap-2 text-sm">
            <Ruler className="mt-0.5 hidden h-3.5 w-3.5 text-gray-400" />
            <span className="shrink-0 text-xs font-medium text-gray-500">{t(label)}:</span>
            <span className="text-xs text-gray-700 dark:text-gray-300">{value}</span>
        </div>
    );
}
