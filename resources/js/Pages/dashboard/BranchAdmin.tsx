import { router } from '@inertiajs/react';
import { AlertTriangle, Building2, ExternalLink, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useLanguage } from '../../i18n/LanguageProvider';

interface Branch {
    id: number;
    name: string;
    email: string;
    phone: string;
    students_count: number;
    users_count: number;
    current_session: string;
    subscription_status: string;
    expiry_date?: string;
}

interface BranchAdminUser {
    id: number;
    name: string;
    email: string;
    status: string;
    created_at: string;
    organization_ids: number[];
}

interface BranchAdminProps {
    user: any;
    branches: Branch[];
    branchAdmins?: BranchAdminUser[];
    activeBranchId?: number | null;
    isSuperAdmin?: boolean;
}

export default function BranchAdmin(pageProps: BranchAdminProps) {
    const { t } = useLanguage();
    const { user, branches, branchAdmins = [], activeBranchId = null, isSuperAdmin = true } = pageProps;
    const [impersonating, setImpersonating] = useState<number | null>(null);
    const [switching, setSwitching] = useState<number | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);

    const enterBranch = (branchId: number) => {
        setImpersonating(branchId);
        router.post(
            `/superadmin/organizations/${branchId}/impersonate`,
            {},
            {
                onFinish: () => setImpersonating(null),
            },
        );
    };

    const switchBranch = (branchId: number) => {
        setSwitching(branchId);
        router.post(
            `/branch-admin/switch/${branchId}`,
            {},
            {
                onFinish: () => setSwitching(null),
            },
        );
    };

    const leaveBranch = () => {
        router.post('/branch-admin/leave');
    };

    const toggleOrg = (orgId: number) => {
        setSelectedIds((prev) =>
            prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId],
        );
    };

    const createBranchAdmin = (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        router.post(
            '/branch-admin/users',
            {
                name,
                email,
                password,
                organization_ids: selectedIds,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setName('');
                    setEmail('');
                    setPassword('');
                    setSelectedIds([]);
                    setShowCreate(false);
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const updateAssignments = (admin: BranchAdminUser) => {
        router.patch(
            `/branch-admin/users/${admin.id}/organizations`,
            {
                organization_ids: admin.organization_ids,
            },
            { preserveScroll: true },
        );
    };

    const deactivateAdmin = (admin: BranchAdminUser) => {
        if (!window.confirm(`Deactivate ${admin.name}?`)) {
            return;
        }
        router.delete(`/branch-admin/users/${admin.id}`, { preserveScroll: true });
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            <Building2 className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            Branch Admin
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {isSuperAdmin
                                ? 'Head-office dashboard for multi-branch management. Choose a branch to enter its context.'
                                : 'Manage the branches you are assigned to. Switch branches to change your active working context.'}
                        </p>
                    </div>
                    <Badge variant="outline">
                        {branches.length} branch{branches.length !== 1 ? 'es' : ''}
                    </Badge>
                </div>

                {isSuperAdmin && (
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Entering a branch uses the impersonation workflow. You can return to the head-office
                            view using the "Return to head office" banner.
                        </AlertDescription>
                    </Alert>
                )}

                {!isSuperAdmin && (
                    <div className="flex items-center justify-end">
                        <Button variant="outline" size="sm" onClick={leaveBranch}>
                            Return to head office
                        </Button>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {branches.map((branch) => {
                        const active = branch.subscription_status === 'active';
                        const isActiveBranch = activeBranchId !== null && activeBranchId === branch.id;

                        return (
                            <Card key={branch.id} className="transition hover:shadow-md">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-base">{branch.name}</CardTitle>
                                        <Badge variant={active ? 'default' : 'destructive'}>
                                            {active ? t('Active') : t('Expired')}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                        <p>{branch.email}</p>
                                        {branch.phone && <p>{branch.phone}</p>}
                                        <p className="text-xs">Session: {branch.current_session}</p>
                                        {branch.expiry_date && (
                                            <p className="text-xs">Renewal: {branch.expiry_date}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-4 text-sm">
                                        <div className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5 text-gray-400" />
                                            <span>{branch.students_count} students</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5 text-gray-400" />
                                            <span>{branch.users_count} staff</span>
                                        </div>
                                    </div>
                                    {isSuperAdmin ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={impersonating !== null}
                                            onClick={() => enterBranch(branch.id)}
                                        >
                                            {impersonating === branch.id ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Entering…
                                                </>
                                            ) : (
                                                <>
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Enter branch
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant={isActiveBranch ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={switching !== null || isActiveBranch}
                                            onClick={() => switchBranch(branch.id)}
                                        >
                                            {switching === branch.id ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Switching…
                                                </>
                                            ) : isActiveBranch ? (
                                                'Active branch'
                                            ) : (
                                                <>
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Switch branch
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {isSuperAdmin && (
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Branch Administrators
                                </h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Create branch admins and assign which organizations they can manage.
                                </p>
                            </div>
                            <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
                                <Plus className="mr-2 h-4 w-4" />
                                {showCreate ? t('Close') : t('New branch admin')}
                            </Button>
                        </div>

                        {showCreate && (
                            <form onSubmit={createBranchAdmin} className="space-y-4 border-b px-6 py-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="ba-name">{t('Name')}</Label>
                                        <Input
                                            id="ba-name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="ba-email">{t('Email')}</Label>
                                        <Input
                                            id="ba-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="ba-password">{t('Password')}</Label>
                                        <Input
                                            id="ba-password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Assign to branches')}</Label>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {branches.map((branch) => (
                                            <label
                                                key={branch.id}
                                                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(branch.id)}
                                                    onChange={() => toggleOrg(branch.id)}
                                                />
                                                {branch.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={saving || selectedIds.length === 0}>
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving…
                                            </>
                                        ) : (
                                            'Create'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        )}

                        {branchAdmins.length === 0 ? (
                            <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
                                No branch administrators yet.
                            </p>
                        ) : (
                            <ul className="divide-y">
                                {branchAdmins.map((admin) => (
                                    <li key={admin.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                {admin.name}
                                                {admin.status === 'inactive' && (
                                                    <Badge variant="destructive" className="ml-2">
                                                        {t('Inactive')}</Badge>
                                                )}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {admin.email} · created {admin.created_at}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <select
                                                multiple
                                                className="w-56 rounded-md border bg-white px-2 py-1 text-sm dark:bg-gray-800"
                                                value={admin.organization_ids.map(String)}
                                                onChange={(e) => {
                                                    const values = Array.from(e.target.selectedOptions, (opt) =>
                                                        Number(opt.value),
                                                    );
                                                    router.patch(`/branch-admin/users/${admin.id}/organizations`, {
                                                        organization_ids: values,
                                                    });
                                                }}
                                            >
                                                {branches.map((branch) => (
                                                    <option key={branch.id} value={branch.id}>
                                                        {branch.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title={t('Deactivate')}
                                                disabled={admin.status === 'inactive'}
                                                onClick={() => deactivateAdmin(admin)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}