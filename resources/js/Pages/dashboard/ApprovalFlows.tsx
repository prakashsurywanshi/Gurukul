import { useState } from 'react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Loader2, Settings, Plus, Trash2, Check, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';

type Step = {
    stepNo: number;
    actorType: string;
    actorValue: string;
    note?: string;
};

type FlowModule = {
    module: string;
    label: string;
    name: string;
    description?: string;
    isActive: boolean;
    hasFlow: boolean;
    flowId: number | null;
    steps: Step[];
    actorOptions: { roles: string[]; users: { id: string; name: string; role: string }[] };
};

interface Props {
    user: any;
    flows: FlowModule[];
    staffUsers: { id: string; name: string; role: string }[];
    roleOptions: string[];
}

export default function ApprovalFlows({ user, flows, staffUsers, roleOptions }: Props) {
    const { t } = useLanguage();
    const [saving, setSaving] = useState(false);
    const [editingModule, setEditingModule] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ name: string; description: string; is_active: boolean }>({ name: '', description: '', is_active: true });
    const [editSteps, setEditSteps] = useState<Step[]>([]);

    const startEdit = (flow: FlowModule) => {
        setEditingModule(flow.module);
        setEditForm({ name: flow.name, description: flow.description || '', is_active: flow.isActive });
        setEditSteps(flow.steps.length ? flow.steps.map((s, i) => ({ ...s, stepNo: i + 1 })) : [{ stepNo: 1, actorType: 'role', actorValue: 'admin', note: '' }]);
    };

    const cancelEdit = () => {
        setEditingModule(null);
        setEditSteps([]);
    };

    const addStep = () => {
        setEditSteps(prev => [...prev, { stepNo: prev.length + 1, actorType: 'role', actorValue: 'admin', note: '' }]);
    };

    const removeStep = (idx: number) => {
        setEditSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNo: i + 1 })));
    };

    const updateStep = (idx: number, field: string, value: string) => {
        setEditSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    };

    const saveFlow = (flow: FlowModule) => {
        setSaving(true);
        router.post('/approvals/store', {
            module: flow.module,
            name: editForm.name,
            description: editForm.description || null,
            is_active: editForm.is_active,
        }, { preserveScroll: true, onFinish: () => setSaving(false) });
        if (flow.flowId) {
            router.post(`/approvals/${flow.flowId}/steps`, { steps: editSteps }, { preserveScroll: true });
        }
    };

    const toggleActive = (flow: FlowModule, active: boolean) => {
        if (!flow.flowId) {
            return;
        }
        setSaving(true);
        router.patch(`/approvals/${flow.flowId}/toggle`, { is_active: flow.isActive }, { preserveScroll: true, onFinish: () => setSaving(false) });
    };

    return (
        <DashboardLayout user={user} activeTab="approvals-config">
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Settings className="h-6 w-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">{t('Approval Flows')}</h1>
                        <p className="text-sm text-muted-foreground">{t('Configure approval chains for fee concessions, attendance corrections and lesson plans.')}</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    {flows.map(flow => (
                        <Card key={flow.module}>
                            <CardHeader className="flex flex-row items-start justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg">{flow.label}</CardTitle>
                                    <CardDescription>{flow.description || t('Default single admin step')}</CardDescription>
                                </div>
                                <Badge variant={flow.isActive ? 'default' : 'secondary'}>
                                    {flow.isActive ? t('Active') : t('Inactive')}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                {editingModule === flow.module ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label>{t('Display Name')}</Label>
                                                <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                                            </div>
                                            <div>
                                                <Label>{t('Description (optional)')}</Label>
                                                <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-sm font-medium">{t('Approval Chain Steps')}</Label>
                                                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                                                    <Plus className="h-3 w-3 mr-1" />{t('Add Step')}</Button>
                                            </div>
                                            {editSteps.map((step, idx) => (
                                                <div key={idx} className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
                                                    <span className="text-sm font-medium text-muted-foreground w-6">#{idx + 1}</span>
                                                    <Select value={step.actorType} onValueChange={v => updateStep(idx, 'actorType', v)}>
                                                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="role">{t('Role')}</SelectItem>
                                                            <SelectItem value="user">{t('User')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {step.actorType === 'role' ? (
                                                        <Select value={step.actorValue} onValueChange={v => updateStep(idx, 'actorValue', v)}>
                                                            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {roleOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Select value={step.actorValue} onValueChange={v => updateStep(idx, 'actorValue', v)}>
                                                            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {staffUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                    <Input className="flex-1" placeholder={t('Note (optional)')} value={step.note || ''} onChange={e => updateStep(idx, 'note', e.target.value)} />
                                                    {editSteps.length > 1 && (
                                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(idx)} className="text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <Button onClick={() => saveFlow(flow)} disabled={saving}>
                                                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                                {t('Save Changes')}</Button>
                                            <Button variant="outline" onClick={cancelEdit}>{t('Cancel')}</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium">{t('Active:')}<Badge variant={flow.isActive ? 'default' : 'secondary'}>{flow.isActive ? t('Yes') : 'No'}</Badge></p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {flow.steps.length} step{flow.steps.length !== 1 ? 's' : ''}:
                                                    {flow.steps.map(s => ` ${s.actorType === 'role' ? s.actorValue : 'user'}`).join(' → ')}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => startEdit(flow)}>{t('Configure')}</Button>
                                                <Button variant="outline" size="sm" onClick={() => toggleActive(flow, !flow.isActive)} disabled={!flow.flowId}>
                                                    {flow.isActive ? t('Disable') : t('Enable')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
