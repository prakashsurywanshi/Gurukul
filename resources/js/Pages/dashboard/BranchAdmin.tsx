import { router } from '@inertiajs/react';
import { AlertTriangle, Building2, ExternalLink, Loader2, Users } from 'lucide-react';
import { useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface Branch {
    id: number;
    name: string;
    email: string;
    phone: string;
    students_count: number;
    users_count: number;
    current_session: string;
    subscription_status: string;
}

interface BranchAdminProps {
    user: any;
    branches: Branch[];
}

export default function BranchAdmin(pageProps: BranchAdminProps) {
    const { user, branches } = pageProps;
    const [impersonating, setImpersonating] = useState<number | null>(null);

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
                            Head-office dashboard for multi-branch management. Choose a branch to enter its context.
                        </p>
                    </div>
                    <Badge variant="outline">
                        {branches.length} branch{branches.length !== 1 ? 'es' : ''}
                    </Badge>
                </div>

                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Entering a branch uses the existing impersonation workflow. You can return to the head-office
                        view using the "Return to head office" banner.
                    </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {branches.map((branch) => {
                        const active = branch.subscription_status === 'active';

                        return (
                            <Card key={branch.id} className="transition hover:shadow-md">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-base">{branch.name}</CardTitle>
                                        <Badge variant={active ? 'default' : 'destructive'}>
                                            {active ? 'Active' : 'Expired'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                        <p>{branch.email}</p>
                                        {branch.phone && <p>{branch.phone}</p>}
                                        <p className="text-xs">Session: {branch.current_session}</p>
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
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
}
