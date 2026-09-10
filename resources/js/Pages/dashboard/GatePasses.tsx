import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { DoorOpen, LogIn, LogOut, Pencil, Plus, Search, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface PassRow {
    id: string;
    personType: string;
    personName: string;
    personContact: string | null;
    passType: string;
    reason: string;
    expectedReturnAt: string | null;
    usedAt: string | null;
    status: string;
    createdByName: string | null;
    createdAt: string | null;
}

interface PersonOption {
    id: number;
    name: string;
    roll?: string;
}

interface FormState {
    personType: string;
    personId: string;
    passType: string;
    reason: string;
    expectedReturnAt: string;
}

const EMPTY_FORM: FormState = {
    personType: 'student',
    personId: '',
    passType: 'exit',
    reason: '',
    expectedReturnAt: '',
};

export default function GatePasses({
    user,
    passes,
    openCount,
    studentOptions,
    staffOptions,
    filters,
}: {
    user: any;
    passes: PassRow[];
    openCount: number;
    studentOptions: PersonOption[];
    staffOptions: PersonOption[];
    filters: { status: string; passType: string; search: string };
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [statusFilter, setStatusFilter] = useState(filters.status ?? '');
    const [passTypeFilter, setPassTypeFilter] = useState(filters.passType ?? '');
    const [search, setSearch] = useState(filters.search ?? '');
    const [issueOpen, setIssueOpen] = useState(false);
    const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
    const [errors, setErrors] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelling, setCancelling] = useState<PassRow | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<PassRow | null>(null);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const applyFilters = () => {
        const params: Record<string, string> = {};

        if (statusFilter) {
            params.status = statusFilter;
        }

        if (passTypeFilter) {
            params.pass_type = passTypeFilter;
        }

        if (search.trim()) {
            params.search = search.trim();
        }

        router.get('/gate-passes', params, { preserveState: true, only: ['passes', 'filters', 'openCount'] });
    };

    const people = form.personType === 'student' ? studentOptions : staffOptions;

    const submitIssue = () => {
        if (!form.personId) {
            setErrors(['Select a student or staff member for the pass.']);
            return;
        }

        if (!form.reason.trim()) {
            setErrors(['Enter a reason for the pass.']);
            return;
        }

        setErrors([]);
        setSaving(true);

        router.post(
            '/gate-passes',
            {
                person_type: form.personType,
                [form.personType === 'student' ? 'student_id' : 'staff_user_id']: Number(form.personId),
                pass_type: form.passType,
                reason: form.reason,
                expected_return_at: form.expectedReturnAt || undefined,
            },
            {
                preserveScroll: true,
                onError: (validationErrors) => {
                    const messages = Object.values(validationErrors)
                        .flat()
                        .map((message) => String(message));
                    setErrors(messages.length > 0 ? messages : ['Failed to issue gate pass.']);
                },
                onSuccess: () => {
                    setForm({ ...EMPTY_FORM });
                    setIssueOpen(false);
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const markUsed = (pass: PassRow) => {
        router.post(
            `/gate-passes/${pass.id}/used`,
            {},
            {
                preserveScroll: true,
                onError: () => toast.error('Failed to update gate pass.'),
            },
        );
    };

    const confirmCancel = () => {
        if (!cancelling) {
            return;
        }

        router.post(
            `/gate-passes/${cancelling.id}/cancel`,
            {},
            {
                preserveScroll: true,
                onError: () => toast.error('Failed to cancel gate pass.'),
                onFinish: () => setCancelOpen(false),
            },
        );
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(`/gate-passes/${deleting.id}`, {
            preserveScroll: true,
            onError: () => toast.error('Failed to delete gate pass.'),
            onFinish: () => setDeleteOpen(false),
        });
    };

    const statusBadge = (pass: PassRow) =>
        pass.status === 'open'
            ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
            : pass.status === 'closed'
              ? 'bg-green-100 text-green-700 hover:bg-green-100'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-100';

    return (
        <DashboardLayout user={user} activeTab="gate-passes">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Gate Passes')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Issue entry and exit passes, and track them at the gate terminal.')}
                            </p>
                        </div>
                        <Button onClick={() => setIssueOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t('Issue Gate Pass')}
                        </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                    <DoorOpen className="h-5 w-5 text-slate-500" />
                                    {passes.length}
                                </CardTitle>
                                <CardDescription>{t('Total passes')}</CardDescription>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                    <ShieldCheck className="h-5 w-5 text-amber-500" />
                                    {openCount}
                                </CardTitle>
                                <CardDescription>{t('Open passes')}</CardDescription>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                    <Pencil className="h-5 w-5 text-green-600" />
                                    {passes.filter((pass) => pass.status === 'closed').length}
                                </CardTitle>
                                <CardDescription>{t('Completed')}</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('Gate Pass Log')}</CardTitle>
                            <CardDescription>{t('Filter passes by status, type, or person.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                applyFilters();
                                            }
                                        }}
                                        placeholder={t('Search by person name...')}
                                        className="pl-9"
                                    />
                                </div>
                                <Select
                                    value={passTypeFilter}
                                    onValueChange={(value) => {
                                        setPassTypeFilter(value);
                                        window.setTimeout(applyFilters, 0);
                                    }}
                                >
                                    <SelectTrigger className="w-full md:w-44">
                                        <SelectValue placeholder={t('All types')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">{t('All types')}</SelectItem>
                                        <SelectItem value="entry">{t('Entry')}</SelectItem>
                                        <SelectItem value="exit">{t('Exit')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={statusFilter}
                                    onValueChange={(value) => {
                                        setStatusFilter(value);
                                        window.setTimeout(applyFilters, 0);
                                    }}
                                >
                                    <SelectTrigger className="w-full md:w-44">
                                        <SelectValue placeholder={t('All statuses')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">{t('All statuses')}</SelectItem>
                                        <SelectItem value="open">{t('Open')}</SelectItem>
                                        <SelectItem value="closed">{t('Closed')}</SelectItem>
                                        <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Person')}</TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>{t('Direction')}</TableHead>
                                            <TableHead>{t('Reason')}</TableHead>
                                            <TableHead>{t('Expected Return')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead>{t('Issued By')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {passes.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                                    {t('No gate passes found.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            passes.map((pass) => (
                                                <TableRow key={pass.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-slate-800">
                                                                {pass.personName}
                                                            </p>
                                                            {pass.personContact ? (
                                                                <p className="text-xs text-slate-500">
                                                                    {pass.personContact}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="capitalize text-sm text-slate-500">
                                                        {pass.personType}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={
                                                                pass.passType === 'exit'
                                                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                                                                    : 'bg-violet-100 text-violet-700 hover:bg-violet-100'
                                                            }
                                                        >
                                                            {pass.passType === 'exit' ? (
                                                                <LogOut className="mr-1 inline h-3 w-3" />
                                                            ) : (
                                                                <LogIn className="mr-1 inline h-3 w-3" />
                                                            )}
                                                            {pass.passType === 'exit' ? t('Exit') : t('Entry')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-[260px] truncate text-sm text-slate-500">
                                                        {pass.reason}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {pass.expectedReturnAt
                                                            ? new Date(pass.expectedReturnAt).toLocaleString()
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={statusBadge(pass)}>{pass.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {pass.createdByName ?? '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-1">
                                                            {pass.status === 'open' && (
                                                                <>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="gap-1"
                                                                        onClick={() => markUsed(pass)}
                                                                    >
                                                                        <DoorOpen className="h-3.5 w-3.5" />
                                                                        {pass.passType === 'exit'
                                                                            ? t('Check In')
                                                                            : t('Check Out')}
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-slate-600"
                                                                        onClick={() => {
                                                                            setCancelling(pass);
                                                                            setCancelOpen(true);
                                                                        }}
                                                                    >
                                                                        <XCircle className="h-3.5 w-3.5" />
                                                                        {t('Cancel')}
                                                                    </Button>
                                                                </>
                                                            )}
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:bg-red-50"
                                                                onClick={() => {
                                                                    setDeleting(pass);
                                                                    setDeleteOpen(true);
                                                                }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                {t('Delete')}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DoorOpen className="h-5 w-5" />
                            {t('Issue Gate Pass')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Issue an entry or exit pass for a student or staff member.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {errors.length > 0 && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                <ul className="list-disc space-y-1 pl-5">
                                    {errors.map((error) => (
                                        <li key={error}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div>
                            <Label>{t('Person Type')}</Label>
                            <Select
                                value={form.personType}
                                onValueChange={(value) => setForm({ ...form, personType: value, personId: '' })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">{t('Student')}</SelectItem>
                                    <SelectItem value="staff">{t('Staff')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>{form.personType === 'student' ? t('Student') : t('Staff Member')}</Label>
                            <Select
                                value={form.personId}
                                onValueChange={(value) => setForm({ ...form, personId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select person')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {people.length === 0 ? (
                                        <p className="p-2 text-sm text-slate-500">
                                            {t('No active members available.')}
                                        </p>
                                    ) : (
                                        people.map((person) => (
                                            <SelectItem key={person.id} value={String(person.id)}>
                                                {person.name}
                                                {person.roll ? ` (${person.roll})` : ''}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>{t('Direction')}</Label>
                            <Select
                                value={form.passType}
                                onValueChange={(value) => setForm({ ...form, passType: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="exit">{t('Exit')}</SelectItem>
                                    <SelectItem value="entry">{t('Entry')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="pass-reason">{t('Reason')}</Label>
                            <Textarea
                                id="pass-reason"
                                value={form.reason}
                                onChange={(event) => setForm({ ...form, reason: event.target.value })}
                                rows={2}
                                placeholder={t('e.g. Doctor appointment')}
                            />
                        </div>
                        <div>
                            <Label htmlFor="pass-expected-return">{t('Expected Return')}</Label>
                            <Input
                                id="pass-expected-return"
                                type="datetime-local"
                                value={form.expectedReturnAt}
                                onChange={(event) => setForm({ ...form, expectedReturnAt: event.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIssueOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={submitIssue} disabled={saving} className="gap-2">
                            <DoorOpen className="h-4 w-4" />
                            {saving ? t('Issuing...') : t('Issue Pass')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('Cancel Gate Pass')}</DialogTitle>
                        <DialogDescription>
                            {t('Cancel the gate pass issued to')} "{cancelling?.personName}"?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
                            {t('No')}
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmCancel}>
                            {t('Yes, Cancel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('Delete Gate Pass')}</DialogTitle>
                        <DialogDescription>
                            {t('Delete the gate pass record for')} "{deleting?.personName}"?{' '}
                            {t('This cannot be undone.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmDelete}>
                            {t('Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
